// Grok update call: Grok read an event's own page and reports what it says about an event that is already on the map.
// Allowed changes: dates, hours, price, a photo link, and "confirmed" (the page states date, time and place). Nothing else can be changed, and nothing can be removed.
// Events run by their organizer, with a paid placement, or whose change is big or a cancellation are held for the owner. Every applied change keeps the old values and can be undone in Admin.
import { sha256 } from "./auth.js";
import { isDate } from "./events.js";
import { clean } from "./util.js";
import { line } from "./fields.js";
import { ptToday } from "./time.js";
import { normalizeHours, freeFlagProblem } from "../../scripts/event-rules.mjs";
import { cleanPageUrl, checkImage, publishingOn, SHOWS } from "./intake.js";

export const MAX_UPDATES = 8, UPDATE_PER_DAY = 600, BIG_SHIFT_DAYS = 60;
export const UPDATE_FIELDS = ["id", "url", "shows", "evidence", "seen", "start", "end", "hours", "price", "free", "image_url", "cancelled"];
const PROTECTED_PREFIX = /^(u-|hcontest-|h-)/;
const monthsOut = (today, n) => { const d = new Date(today + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
const dayDiff = (a, b) => Math.abs(Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 86400_000;
const SNAP = (e) => ({ start: e.start_date, end: e.end_date, hours: e.hours || "", price: e.price || "", free: e.free ? 1 : 0, status: e.status, image: e.image || "" });

/** Checks that need no database. Returns { u } (cleaned) or { problems }. */
export function checkUpdate(r, today = ptToday()) {
  const p = [];
  if (!r || typeof r !== "object" || Array.isArray(r)) return { problems: ["each row must be an object"] };
  for (const k of Object.keys(r)) if (!UPDATE_FIELDS.includes(k)) p.push(`unknown field "${k}" (allowed: ${UPDATE_FIELDS.join(", ")})`);
  const u = { id: clean(r.id, 60), evidence: line(r.evidence, 240), seen: clean(r.seen, 10), page: "" };
  if (!u.id) p.push("id (the event's id from the map) is required");
  const has = (k) => r[k] !== undefined && r[k] !== null && r[k] !== "";
  if (has("start") || has("end")) {
    u.start = clean(r.start, 10); u.end = clean(r.end || r.start, 10);
    if (!isDate(u.start) || !isDate(u.end)) p.push("start and end must be real dates like 2026-12-05");
    else { if (u.end < u.start) p.push("end is before start"); if (u.end < today) p.push(`it ended ${u.end}`); if (u.start > monthsOut(today, 16)) p.push("it starts more than 16 months from now"); }
  }
  if (has("hours")) { u.hours = normalizeHours(line(r.hours, 120)); if (!u.hours || /check site/i.test(u.hours) || /^(tbd|tba|see site|varies)$/i.test(u.hours)) p.push("hours must be the real times from the page (not an estimate, TBD or \"check site\")"); }
  if (has("price") || r.free !== undefined) {
    if (typeof r.free !== "boolean" && r.free !== 0 && r.free !== 1) p.push("free must be true or false when you send a price");
    u.free = r.free === true || r.free === 1 ? 1 : 0; u.price = line(r.price, 80) || (u.free ? "Free" : "");
    if (!u.price) p.push("price text is required"); else { const fp = freeFlagProblem(u.free, u.price); if (fp) p.push(fp); }
  }
  if (has("image_url")) u.image = String(r.image_url).slice(0, 600);
  u.cancelled = r.cancelled === true;
  const changes = ["start", "hours", "price", "image"].some((k) => u[k] !== undefined) || u.cancelled;
  const content = ["start", "hours", "price"].some((k) => u[k] !== undefined) || u.cancelled;
  const confirmOnly = !changes; // nothing but the proof: confirm what is on the map
  if (r.url !== undefined || content || confirmOnly) {
    const cu = cleanPageUrl(clean(r.url, 300));
    if (!cu.url) p.push("url must be the https page you read"); else if (cu.problem) p.push(cu.problem); else u.page = cu.url;
  }
  if (content || confirmOnly) {
    const needShows = ["start", "hours", "price"].some((k) => u[k] !== undefined) || confirmOnly; // a cancellation only needs the page and what it says
    const shows = Array.isArray(r.shows) ? r.shows.map(String) : [];
    if (needShows) for (const s of SHOWS) if (!shows.includes(s)) p.push(`"shows" must list "${s}": only send what the event's own page states (date, time and place)`);
    if (u.evidence.length < 10) p.push("evidence must quote what the page says (10+ characters)");
    if (!isDate(u.seen) || u.seen > today || u.seen < monthsOut(today, -1)) p.push("seen must be the day you read the page (within the last month)");
  }
  if (u.image !== undefined && !u.image) p.push("image_url is empty");
  return p.length ? { problems: p } : { u, changes, content, confirmOnly };
}

/** Checks every update, applies the ones that are safe, holds the rest. Returns { results, applied, held, unchanged, rejected }. */
export async function processUpdates(env, rows, { dryRun = false, doFetch = fetch, today = ptToday() } = {}) {
  const live = publishingOn(env);
  const out = rows.map((r, i) => ({ index: i, id: r && typeof r.id === "string" ? r.id.slice(0, 60) : "" }));
  const checked = rows.map((r) => checkUpdate(r, today));
  const ids = [...new Set(checked.filter((c) => c.u).map((c) => c.u.id))];
  const ph = (n) => Array(n).fill("?").join(",");
  const events = {}, owned = new Set(), paid = new Set();
  if (ids.length) {
    for (const e of (await env.DB.prepare(`SELECT id, name, start_date, end_date, hours, price, free, status, image, owner_photos FROM events WHERE id IN (${ph(ids.length)})`).bind(...ids).all()).results) events[e.id] = e;
    for (const r of (await env.DB.prepare(`SELECT DISTINCT event_id FROM event_submissions WHERE event_id IN (${ph(ids.length)})`).bind(...ids).all()).results) owned.add(r.event_id);
    for (const r of (await env.DB.prepare(`SELECT DISTINCT event_id FROM feature_orders WHERE event_id IN (${ph(ids.length)}) AND status IN ('paid','held')`).bind(...ids).all()).results) paid.add(r.event_id);
  }
  const { c: todays } = await env.DB.prepare("SELECT COUNT(*) AS c FROM intake_updates WHERE status = 'applied' AND received_at > datetime('now','-1 day')").first();
  let budget = Math.max(0, UPDATE_PER_DAY - todays);
  const writes = [], seen = new Set();
  for (let i = 0; i < rows.length; i++) {
    const res = out[i], c = checked[i];
    if (c.problems) { res.verdict = "rejected"; res.reasons = c.problems; continue; }
    const { u } = c, ev = events[u.id];
    if (!ev) { res.verdict = "rejected"; res.reasons = ["no event with this id is on the map (use the id from /api/events)"]; continue; }
    if (seen.has(u.id)) { res.verdict = "rejected"; res.reasons = ["the same event appears twice in this call"]; continue; }
    seen.add(u.id); res.name = ev.name;
    const before = SNAP(ev), after = { ...before };
    let kind = c.content ? "change" : "confirm", note = "";
    if (u.start !== undefined) { after.start = u.start; after.end = u.end; }
    if (u.hours !== undefined) after.hours = u.hours;
    if (u.price !== undefined) { after.price = u.price; after.free = u.free; }
    if (u.cancelled) kind = "cancelled";
    if (u.image !== undefined) {
      if (/^\/img\//.test(before.image) || /^\/api\/photo\//.test(before.image) || (ev.owner_photos && ev.owner_photos !== "[]")) { if (!c.content) { res.verdict = "unchanged"; res.reasons = ["the event already has a photo we host or its organizer added: it is not replaced"]; continue; } res.image = "kept as is: the event already has a photo we host or its organizer added"; }
      else { const im = await checkImage(u.image, { ...ev, url: u.page, name: ev.name }, doFetch); if (im.image) after.image = im.image; if (im.note) res.image = im.note; else if (im.image) res.image = "linked"; if (!c.content && !im.image) { res.verdict = "rejected"; res.reasons = [im.note || "image could not be used"]; continue; } if (!c.content) kind = "photo"; }
    }
    if (kind === "confirm" && ev.status === "confirmed") { res.verdict = "unchanged"; res.reasons = ["already confirmed on the map"]; continue; }
    if (kind !== "cancelled" && JSON.stringify(after) === JSON.stringify(before) && !(ev.status === "expected" && (c.content || c.confirmOnly))) { res.verdict = "unchanged"; res.reasons = ["the map already shows exactly this"]; continue; }
    // a page that states date, time and place makes the event confirmed
    if (kind !== "photo" && kind !== "cancelled") after.status = "confirmed";
    // when the owner must decide
    let hold = "";
    if (PROTECTED_PREFIX.test(u.id) || owned.has(u.id)) hold = "this event is managed by its organizer (or is a contest home): the organizer or the owner decides";
    else if (paid.has(u.id)) hold = "this event has a paid placement: the owner decides";
    else if (kind === "cancelled") hold = "the page says the event is cancelled: the owner decides";
    else if (u.start !== undefined && ev.status === "confirmed" && dayDiff(u.start, before.start) > BIG_SHIFT_DAYS) hold = `the new start (${u.start}) is more than ${BIG_SHIFT_DAYS} days from the confirmed one (${before.start}): the owner decides`;
    else if (!live) hold = "publishing is switched off, so the owner applies it from Admin";
    else if (budget <= 0) hold = "the daily limit for updates was reached";
    const id = "gu-" + (await sha256(`${u.id}|${JSON.stringify(after)}|${today}`)).slice(0, 12);
    const verdict = hold ? "held" : "applied";
    res.verdict = verdict; res.kind = kind; res.changes = Object.fromEntries(Object.keys(after).filter((k) => after[k] !== before[k]).map((k) => [k, { from: before[k], to: after[k] }]));
    if (hold) res.reasons = [hold]; else budget--;
    if (!dryRun) {
      writes.push(env.DB.prepare("INSERT OR REPLACE INTO intake_updates (id,event_id,event_name,status,kind,reason,before,after,url,evidence,seen,received_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))").bind(id, u.id, ev.name, verdict, kind, hold || note, JSON.stringify(before), JSON.stringify(after), u.page, u.evidence, u.seen));
      if (!hold) writes.push(applyStatement(env, u.id, after));
    }
  }
  if (!dryRun && writes.length) await env.DB.batch(writes);
  if (!dryRun) await recordAttempts(env, out);
  const n = (v) => out.filter((r) => r.verdict === v).length;
  return { results: out, applied: n("applied"), held: n("held"), unchanged: n("unchanged"), rejected: n("rejected") };
}

const ATTEMPT_RESULT = { applied: "changed", held: "changed", unchanged: "unchanged", rejected: "skipped" };
/** Remember when Grok last tried each event on the map (any row that named an event that exists, even a rejected one: result skipped). Never fails the call: if the table is missing the rows are simply not remembered. */
async function recordAttempts(env, out) {
  const once = new Set(), rows = out.filter((r) => r.id && ATTEMPT_RESULT[r.verdict] && !once.has(r.id) && once.add(r.id)); // the first row for an event counts (a repeat in the same call is rejected)
  if (!rows.length) return;
  try {
    const known = new Set((await env.DB.prepare(`SELECT id FROM events WHERE id IN (${rows.map(() => "?").join(",")})`).bind(...rows.map((r) => r.id)).all()).results.map((e) => e.id));
    const now = new Date(Date.now()).toISOString().slice(0, 19) + "Z", mine = rows.filter((r) => known.has(r.id));
    if (mine.length) await env.DB.batch(mine.map((r) => env.DB.prepare("INSERT INTO intake_attempts (event_id, last_attempt, result) VALUES (?, ?, ?) ON CONFLICT(event_id) DO UPDATE SET last_attempt = excluded.last_attempt, result = excluded.result").bind(r.id, now, ATTEMPT_RESULT[r.verdict])));
  } catch {}
}

export const applyStatement = (env, eventId, v) => env.DB.prepare("UPDATE events SET start_date = ?, end_date = ?, hours = ?, price = ?, free = ?, status = ?, image = ?, updated_at = datetime('now') WHERE id = ?")
  .bind(v.start, v.end, v.hours || "", v.price || "", v.free ? 1 : 0, v.status, v.image || null, eventId);
export const snapOf = SNAP;
