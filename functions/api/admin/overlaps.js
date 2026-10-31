// GET  /api/admin/overlaps — sweep records replaced by a house/installer post at the same address, and near misses (same street, different number)
// POST /api/admin/overlaps { action: "keep" | "hide", event_id } — show a replaced sweep record anyway / let it be replaced again
import { json, err } from "../../_lib/util.js";
import { pairs, approvedPosts } from "../../_lib/addrkey.js";

export async function onRequestGet({ env }) {
  const events = (await env.DB.prepare("SELECT id, name, city, address, keep_listed, start_date, end_date FROM events WHERE address != ''").all()).results;
  const { exact, near } = pairs(await approvedPosts(env), events);
  const post = (p) => ({ id: p.id, title: p.title, biz: p.biz, kind: p.poster_type === "installer" ? "installer" : "homeowner", street: p.street, city: p.city });
  const ev = (e) => ({ id: e.id, name: e.name, city: e.city, address: e.address, keep: !!e.keep_listed, start: e.start_date, end: e.end_date });
  return json({ replaced: exact.map((x) => ({ post: post(x.post), event: ev(x.event) })), near: near.map((x) => ({ post: post(x.post), event: ev(x.event) })) });
}

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || !["keep", "hide"].includes(b.action) || typeof b.event_id !== "string") return err(400, "Bad request.");
  const r = await env.DB.prepare("UPDATE events SET keep_listed = ? WHERE id = ?").bind(b.action === "keep" ? 1 : 0, b.event_id).run();
  if (!r.meta.changes) return err(404, "No such event.");
  return json({ ok: true });
}
