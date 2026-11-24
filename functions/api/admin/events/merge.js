// Merge two events that are the same event listed twice (audit F-30; before this it took a hand-written migration: 0285, 0286, 0287).
//   GET  /api/admin/events/merge?keep=<id>&duplicate=<id>   a PREVIEW: nothing is changed. Says which fields differ, which the merge would take from the duplicate by default,
//                                                           what would move, and whether the merge is allowed (blockers) or needs a look (warnings).
//   POST /api/admin/events/merge { id|keep, duplicate, fields?: [group keys], action: "merge" }
//                                                           the survivor ("keep") takes the chosen field groups from the duplicate, the duplicate's submissions (and edit history, grok updates,
//                                                           home claim links) are pointed at the survivor, and the duplicate is deleted: its whole row goes to deleted_events (a tombstone, so Events > Undo works and the
//                                                           migration gate refuses to bring it back by accident), together with a note of what changed on the survivor, so Undo puts the survivor back too.
// REFUSED (409, with the reason) when the duplicate has any order (paid, refunded or held: it is a payment for that exact listing), any claim, a contest listed through it, or an Event Partner record:
// those are money and ownership, and they are never moved by this tool. Refund, decline or move them first.
// "fields" omitted = the defaults: when the duplicate is the organizer-managed record (an event_submissions row points at it, and not at the survivor) its details win, exactly as in migration 0287
// (name, city, price, hours, description, web page, venue, address, pin, owner photos, video clip and its approval); a group the duplicate has nothing for is never taken (an empty value would erase the survivor's).
// Otherwise only the survivor's blank fields are filled. The paid placement (featured, banner) of the survivor is never touched. The Admin log (written by the admin middleware) records it as "merge" with the fields that changed.
import { json, err } from "../../../_lib/util.js";
import { ownerKeys, MAX_EVENT_PHOTOS } from "../../../_lib/eventphotos.js";

// key: [label, [columns]]. "photos" is combined (the duplicate's first, then the survivor's, at most 4); "video" moves the three video columns together so a clip and its approval stay together.
export const GROUPS = {
  name: ["Name", ["name"]], city: ["City", ["city", "county"]], price: ["Price", ["free", "price"]], hours: ["Hours", ["hours"]], description: ["Description", ["blurb"]],
  web: ["Web page", ["url"]], venue: ["Venue", ["venue"]], address: ["Street address", ["address"]], pin: ["Map pin", ["lat", "lng"]], photos: ["Owner photos", ["owner_photos"]],
  video: ["Video clip or link", ["video", "video_file", "video_ok"]], picture: ["Picture found on the web page", ["image", "images"]], dates: ["Dates", ["start_date", "end_date"]], type: ["Season and type", ["season", "type"]],
};
export const ORGANIZER_DEFAULT = ["name", "city", "price", "hours", "description", "web", "venue", "address", "pin", "photos", "video"]; // migration 0287
// Where an event id is written in other tables: re-pointed to the survivor when the duplicate goes. [table, column]
const MOVES = [["event_submissions", "event_id"], ["event_edit_history", "event_id"], ["intake_updates", "event_id"], ["posts", "claim_event_id"]];
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

const km = (a, b) => { const r = (x) => (x * Math.PI) / 180, d = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(d)); };
const blank = (v) => v == null || v === "" || v === "[]" || v === 0;
const show = (k, r) => {
  if (k === "photos") { const n = ownerKeys(r.owner_photos).length; return n ? `${n} photo${n === 1 ? "" : "s"}` : ""; }
  if (k === "video") return r.video_file ? "uploaded clip" + (r.video_ok ? " (approved)" : " (waiting for approval)") : r.video ? "link " + r.video : "";
  if (k === "picture") return r.image ? "linked picture" : "";
  if (k === "pin") return `${Number(r.lat).toFixed(4)}, ${Number(r.lng).toFixed(4)}`;
  if (k === "price") return r.free ? "Free" + (r.price && r.price !== "Free" ? " · " + r.price : "") : r.price || "";
  if (k === "city") return [r.city, r.county && r.county + " County"].filter(Boolean).join(", ");
  if (k === "dates") return r.start_date === r.end_date ? r.start_date : `${r.start_date} to ${r.end_date}`;
  if (k === "type") return `${r.season} · ${r.type}`;
  return String(r[GROUPS[k][1][0]] ?? "");
};
const same = (k, a, b) => GROUPS[k][1].every((c) => String(a[c] ?? "") === String(b[c] ?? "")) && (k !== "photos" || JSON.stringify(ownerKeys(a.owner_photos)) === JSON.stringify(ownerKeys(b.owner_photos)));
const hasValue = (k, r) => (k === "pin" ? true : k === "video" ? !!(r.video || r.video_file) : k === "photos" ? ownerKeys(r.owner_photos).length > 0 : k === "picture" ? !!(r.image || (r.images && r.images !== "[]")) : k === "price" ? !!(r.price || r.free) : GROUPS[k][1].some((c) => !blank(r[c])));

async function tablesWith(env) { // the other tables and columns that exist here (a table a migration has not created yet is skipped)
  const out = [];
  for (const [t, c] of MOVES) { try { const cols = (await env.DB.prepare(`PRAGMA table_info(${t})`).all()).results; if (cols.some((x) => x.name === c)) out.push([t, c]); } catch { /* not there */ } }
  return out;
}
async function scan(env, keepId, dupId) {
  const get = (id) => env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(id).first();
  const [keep, dup] = [await get(keepId), await get(dupId)];
  if (!keep || !dup) return { missing: !keep ? keepId : dupId };
  const count = async (sql, ...b) => { try { return (await env.DB.prepare(sql).bind(...b).first()).n; } catch { return 0; } };
  const q = (id) => Promise.all([
    count("SELECT COUNT(*) AS n FROM event_submissions WHERE event_id = ?", id), count("SELECT COUNT(*) AS n FROM feature_orders WHERE event_id = ?", id),
    count("SELECT COUNT(*) AS n FROM feature_orders WHERE event_id = ? AND status IN ('paid','held','refund_due','disputed')", id), count("SELECT COUNT(*) AS n FROM event_claims WHERE event_id = ?", id),
    count("SELECT COUNT(*) AS n FROM contests WHERE event_id = ?", id), count("SELECT COUNT(*) AS n FROM event_partner_events WHERE event_id = ?", id),
  ]).then(([subs, orders, paid, claims, contests, partner]) => ({ subs, orders, paid, claims, contests, partner }));
  const [k, d] = [await q(keepId), await q(dupId)];
  const managed = d.subs && k.subs ? "both" : d.subs ? "duplicate" : k.subs ? "keep" : "neither";
  const blockers = [];
  if (d.orders) blockers.push(`The duplicate has ${d.orders} order${d.orders === 1 ? "" : "s"} recorded${d.paid ? ` (${d.paid} paid or waiting for a refund)` : ""}. An order is a payment for that exact listing, so it is never moved by a merge. Handle it in Orders first, or keep the duplicate and merge the other way round.`);
  if (d.claims) blockers.push(`The duplicate has ${d.claims} claim${d.claims === 1 ? "" : "s"} ("This is my event" requests). Decide or remove ${d.claims === 1 ? "it" : "them"} under Event claims first.`);
  if (d.contests) blockers.push(`${d.contests} contest${d.contests === 1 ? " is" : "s are"} listed on the map through the duplicate. Merging would break ${d.contests === 1 ? "its" : "their"} listing.`);
  if (d.partner) blockers.push("The duplicate has an Event Partner record. Handle it under Event Partners first.");
  const warnings = [];
  const dist = km(keep, dup);
  if (dist > 1) warnings.push(`The two pins are ${dist.toFixed(1)} km apart. Check that these are the same event.`);
  if (keep.end_date < dup.start_date || dup.end_date < keep.start_date) warnings.push("The two events do not overlap in dates. Check that these are the same event.");
  if (managed === "both") warnings.push("Both listings have an organizer. After the merge each of them can edit the surviving event.");
  if (dup.featured > 0 || dup.banner_until) warnings.push("The duplicate has a Featured or banner setting (set by hand, not from an order). It is not carried over to the surviving event; it stays in the saved copy.");
  if (dup.video_file && keep.video_file && dup.video_file !== keep.video_file) warnings.push("Taking the duplicate's video replaces the survivor's own clip. The old clip's file stays in storage but nothing shows it.");
  return { keep, dup, k, d, managed, blockers, warnings, dist };
}
function defaultsFor(s) {
  if (s.managed === "duplicate") return ORGANIZER_DEFAULT.filter((g) => hasValue(g, s.dup) && !same(g, s.keep, s.dup));
  // otherwise only blanks of the survivor are filled (never the pin: it is never blank)
  return Object.keys(GROUPS).filter((g) => g !== "pin" && g !== "name" && g !== "city" && g !== "dates" && g !== "type" && hasValue(g, s.dup) && !hasValue(g, s.keep));
}
function view(s) {
  const info = (r, c) => ({ id: r.id, name: r.name, city: r.city, start: r.start_date, end: r.end_date, status: r.status, submissions: c.subs, orders: c.orders });
  const defaults = defaultsFor(s);
  return {
    keep: info(s.keep, s.k), duplicate: info(s.dup, s.d), managed: s.managed, defaults, blockers: s.blockers, warnings: s.warnings, can_merge: !s.blockers.length,
    groups: Object.entries(GROUPS).map(([key, [label]]) => ({ key, label, keep: show(key, s.keep), duplicate: show(key, s.dup), differs: !same(key, s.keep, s.dup), has_duplicate_value: hasValue(key, s.dup), default: defaults.includes(key) })),
    moves: { submissions: s.d.subs },
  };
}
const no = { headers: { "cache-control": "no-store" } };

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), keepId = u.searchParams.get("keep") || "", dupId = u.searchParams.get("duplicate") || "";
  if (!ID_RE.test(keepId) || !ID_RE.test(dupId)) return err(400, "Choose the event to keep and the duplicate.");
  if (keepId === dupId) return err(400, "Choose two different events.");
  const s = await scan(env, keepId, dupId);
  if (s.missing) return err(404, `The event "${s.missing}" is not on the map.`);
  return json(view(s), no);
}

export async function onRequestPost({ request, env, data = {} }) {
  const b = await request.json().catch(() => null);
  if (!b || typeof b !== "object") return err(400, "Send the merge as JSON.");
  const keepId = String(b.keep || b.id || ""), dupId = String(b.duplicate || "");
  if (!ID_RE.test(keepId) || !ID_RE.test(dupId)) return err(400, "Choose the event to keep and the duplicate.");
  if (keepId === dupId) return err(400, "Choose two different events.");
  const s = await scan(env, keepId, dupId);
  if (s.missing) return err(404, `The event "${s.missing}" is not on the map.`);
  if (s.blockers.length) return json({ error: "Not merged: " + s.blockers.join(" "), code: "merge_blocked", blockers: s.blockers }, { status: 409 });
  let fields = b.fields === undefined ? defaultsFor(s) : Array.isArray(b.fields) ? [...new Set(b.fields.map(String))] : null;
  if (!fields || fields.some((f) => !GROUPS[f])) return err(400, "Unknown field group. Use: " + Object.keys(GROUPS).join(", ") + ".");
  fields = fields.filter((f) => hasValue(f, s.dup)); // never erase the survivor with an empty value

  const evCols = new Set((await env.DB.prepare("PRAGMA table_info(events)").all()).results.map((c) => c.name));
  const set = {}; // column -> new value on the survivor
  for (const f of fields) for (const c of GROUPS[f][1]) {
    if (!evCols.has(c)) continue;
    if (f === "photos") set[c] = (() => { const merged = [...new Set([...ownerKeys(s.dup.owner_photos), ...ownerKeys(s.keep.owner_photos)])].slice(0, MAX_EVENT_PHOTOS); return merged.length ? JSON.stringify(merged) : null; })();
    else set[c] = s.dup[c] ?? null;
  }
  // the video group moves all three video columns as the duplicate has them (a clip with its approval, or a link with no clip), so a clip is never left approved-without-a-file or the other way round
  const before = {}; for (const c of Object.keys(set)) before[c] = s.keep[c] ?? null;
  const cols = Object.keys(set).filter((c) => String(set[c] ?? "") !== String(before[c] ?? ""));
  const after = Object.fromEntries(cols.map((c) => [c, set[c]]));
  const moves = await tablesWith(env), moved = {};
  for (const [t, c] of moves) { const rows = (await env.DB.prepare(`SELECT rowid AS r FROM ${t} WHERE ${c} = ?`).bind(dupId).all()).results.map((x) => x.r); if (rows.length) moved[`${t}.${c}`] = rows; }

  // One batch (one transaction). Every statement is guarded by the same "no order, claim, contest or partner record points at the duplicate" test, so an order that arrives while this runs stops all of it.
  const G = `NOT EXISTS (SELECT 1 FROM feature_orders WHERE event_id = ?1) AND NOT EXISTS (SELECT 1 FROM event_claims WHERE event_id = ?1) AND NOT EXISTS (SELECT 1 FROM contests WHERE event_id = ?1) AND NOT EXISTS (SELECT 1 FROM event_partner_events WHERE event_id = ?1)`;
  const who = String((data.admin && data.admin.email) || "").slice(0, 120);
  const undo = JSON.stringify({ merged_into: keepId, before: Object.fromEntries(cols.map((c) => [c, before[c]])), after, moved });
  const hasUndoCol = (await env.DB.prepare("PRAGMA table_info(deleted_events)").all()).results.some((c) => c.name === "merge_undo");
  const stmts = [];
  stmts.push(hasUndoCol
    ? env.DB.prepare(`INSERT OR REPLACE INTO deleted_events (id, name, row, deleted_by, merge_undo) SELECT ?1, ?2, ?3, ?4, ?5 WHERE ${G}`).bind(dupId, String(s.dup.name || "").slice(0, 120), JSON.stringify(s.dup), who, undo)
    : env.DB.prepare(`INSERT OR REPLACE INTO deleted_events (id, name, row, deleted_by) SELECT ?1, ?2, ?3, ?4 WHERE ${G}`).bind(dupId, String(s.dup.name || "").slice(0, 120), JSON.stringify(s.dup), who));
  if (cols.length) stmts.push(env.DB.prepare(`UPDATE events SET ${cols.map((c, i) => `${c} = ?${i + 3}`).join(", ")}, updated_at = datetime('now') WHERE id = ?2 AND ${G}`).bind(dupId, keepId, ...cols.map((c) => set[c])));
  for (const [t, c] of moves) stmts.push(env.DB.prepare(`UPDATE ${t} SET ${c} = ?2 WHERE ${c} = ?1 AND ${G}`).bind(dupId, keepId));
  stmts.push(env.DB.prepare(`DELETE FROM events WHERE id = ?1 AND ${G}`).bind(dupId));
  await env.DB.batch(stmts);
  const gone = !(await env.DB.prepare("SELECT 1 AS x FROM events WHERE id = ?").bind(dupId).first());
  if (!gone) return json({ error: "Not merged: an order, claim or contest appeared on the duplicate while this ran. Nothing was changed.", code: "merge_blocked" }, { status: 409 });
  data.logExtra = { merged_from: `${dupId} (${String(s.dup.name || "").slice(0, 60)})`, moved: Object.entries(moved).map(([k, v]) => `${v.length} in ${k.split(".")[0]}`).join(", ") || "nothing" };
  return json({ ok: true, keep: keepId, duplicate: dupId, applied: fields, changed: cols, moved: Object.fromEntries(Object.entries(moved).map(([k, v]) => [k, v.length])), restorable: true }, no);
}
