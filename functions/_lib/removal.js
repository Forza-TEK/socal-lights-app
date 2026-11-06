// "Remove my home" (PL-01): finding the listing a resident means, and taking it off the site when Admin approves.
// A listing is either a row in `events` (the team's own listings, including "Private home (view from the street)") or a row in `posts` (a home someone showed off,
// or a home an organizer added to a contest). The page links use the event id, or "h-<post id>" for a post.
import { r2Delete, photoKeys } from "./dbchunk.js";
import { livePaidOrders, markHomeRefundDue } from "./orders.js";
import { logOp } from "./oplog.js";
import { ptToday } from "./time.js";

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const today = ptToday;

// Accepts a bare id, "h-<id>", "#h-<id>", or a pasted page address (https://socallights.app/e/<id>, https://socallights.app/#h-<id>). Returns "" when nothing usable is there.
export function cleanRef(raw) {
  const s = String(raw || "").trim().slice(0, 300);
  const m = s.match(/(?:#|\/e\/|[?&]e=)([A-Za-z0-9._-]{1,80})/);
  const r = m ? m[1] : s;
  return ID.test(r) ? r : "";
}

// -> { kind: "post"|"event", row } or null. Contest pages on the map ("c-...") are not homes and are never matched here.
export async function resolveRef(env, ref) {
  const r = cleanRef(ref);
  if (!r) return null;
  if (r.startsWith("h-")) {
    const row = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(r.slice(2)).first();
    return row ? { kind: "post", row } : null;
  }
  if (r.startsWith("c-")) return null;
  const ev = await env.DB.prepare("SELECT id, name, city, address, venue FROM events WHERE id = ?").bind(r).first();
  if (ev) return { kind: "event", row: ev };
  const row = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(r).first();
  return row ? { kind: "post", row } : null;
}

// Listings whose address looks like the one typed (house number plus the first word of the street), so Admin can pick when a resident gave no listing id.
export async function candidatesFor(env, address) {
  const m = String(address || "").trim().match(/^(\d{1,6})\s+(?:[NSEW]\.?\s+)?([A-Za-z0-9'.-]{2,})/i);
  if (!m) return [];
  const like = `%${m[1]} %${m[2].replace(/[%_]/g, "")}%`;
  const [ev, po] = await Promise.all([
    env.DB.prepare("SELECT id, name, city, address FROM events WHERE address LIKE ? AND id NOT LIKE 'c-%' LIMIT 6").bind(like).all().then((r) => r.results).catch(() => []),
    env.DB.prepare("SELECT id, title, city, address, status FROM posts WHERE (address LIKE ?1 OR street LIKE ?1) AND status != 'declined' LIMIT 6").bind(like).all().then((r) => r.results).catch(() => []),
  ]);
  return [...ev.map((e) => ({ target: `event:${e.id}`, name: e.name, city: e.city, address: e.address })), ...po.map((p) => ({ target: `post:${p.id}`, name: p.title, city: p.city, address: p.address, contest: false }))];
}

// Deletes the listing for good. A paid Featured placement that was still running is flagged "refund due" in Admin > Orders (nothing is refunded for you).
// A home in an announced contest is also scrubbed from the frozen results, like deleting an account does. Returns a short description, or "" when nothing was found.
export async function removeListing(env, target) {
  const [kind, ...rest] = String(target || "").split(":"), id = rest.join(":");
  if (!id) return "";
  if (kind === "event") {
    const ev = await env.DB.prepare("SELECT id, name FROM events WHERE id = ?").bind(id).first();
    if (!ev) return "";
    const live = await livePaidOrders(env.DB, id, today());
    await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
    if (live.length) await env.DB.prepare("UPDATE feature_orders SET status = 'refund_due', note = ? WHERE event_id = ? AND status = 'paid'").bind("[auto] The listing was removed at the resident's request while this placement was running. Refund it in the Stripe dashboard, then mark it refunded here.", id).run();
    return `event ${ev.id}`;
  }
  if (kind === "post") {
    const p = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first();
    if (!p) return "";
    await markHomeRefundDue(env.DB, p.id, "The home was removed at the resident's request while a paid Featured placement was running. Refund it in Stripe, then mark it refunded.");
    await r2Delete(env, photoKeys([p]), "removed home photos");
    const stmts = ["votes", "judge_picks", "judge_scores", "judge_conflicts", "lights_on", "listing_changes"].map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE post_id = ?`).bind(p.id));
    if (p.contest_id) {
      try {
        const c = await env.DB.prepare("SELECT id, results FROM contests WHERE id = ? AND announced = 1 AND results != ''").bind(p.contest_id).first();
        const snap = c && JSON.parse(c.results);
        if (snap && Array.isArray(snap.entries)) {
          for (const e of snap.entries) if (e.id === p.id) Object.assign(e, { name: "", biz: "", address: "", city: "", lat: null, lng: null, photos: [], removed: true });
          stmts.push(env.DB.prepare("UPDATE contests SET results = ? WHERE id = ?").bind(JSON.stringify(snap), c.id));
        }
      } catch (e) { await logOp(env, "removal", "scrubbing frozen results failed: " + (e && e.message)); }
    }
    stmts.push(env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(p.id));
    await env.DB.batch(stmts);
    return `post ${p.id}`;
  }
  return "";
}
