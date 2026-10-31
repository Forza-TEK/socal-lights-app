// GET  /api/admin/overlaps — sweep records replaced by a house/installer post at the same address, and near misses (same street, different number)
// POST /api/admin/overlaps { action: "pick_post" | "pick_both" | "pick_sweep", event_id } — which record visitors see for that address:
//   pick_post  the person's own record (default; the sweep record is hidden)
//   pick_both  both records
//   pick_sweep the sweep record (the person's post is hidden from the map, still approved)
// (events.keep_listed: 0 = post, 1 = both, 2 = sweep. Older "keep" / "hide" still work.)
import { json, err } from "../../_lib/util.js";
import { pairs, approvedPosts } from "../../_lib/addrkey.js";

const CHOICE = { 0: "post", 1: "both", 2: "sweep" };
const VALUE = { pick_post: 0, pick_both: 1, pick_sweep: 2, hide: 0, keep: 1 };

export async function onRequestGet({ env }) {
  const events = (await env.DB.prepare("SELECT id, name, city, address, keep_listed, start_date, end_date FROM events WHERE address != ''").all()).results;
  const { exact, near } = pairs(await approvedPosts(env), events);
  const post = (p) => ({ id: p.id, title: p.title, biz: p.biz, kind: p.poster_type === "installer" ? "installer" : "homeowner", street: p.street, city: p.city });
  const ev = (e) => ({ id: e.id, name: e.name, city: e.city, address: e.address, choice: CHOICE[e.keep_listed] || "post", start: e.start_date, end: e.end_date });
  return json({ replaced: exact.map((x) => ({ post: post(x.post), event: ev(x.event) })), near: near.map((x) => ({ post: post(x.post), event: ev(x.event) })) });
}

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || !(b.action in VALUE) || typeof b.event_id !== "string") return err(400, "Bad request.");
  const r = await env.DB.prepare("UPDATE events SET keep_listed = ? WHERE id = ?").bind(VALUE[b.action], b.event_id).run();
  if (!r.meta.changes) return err(404, "No such event.");
  return json({ ok: true });
}
