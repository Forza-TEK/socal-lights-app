// POST /api/posts/<id>/on — a visitor says "the lights are on tonight". One report per connection per home per night.
import { json, err } from "../../../_lib/util.js";
import { sha256 } from "../../../_lib/auth.js";

export async function onRequestPost({ params, request, env }) {
  const row = await env.DB.prepare("SELECT id, lat, lng FROM posts WHERE id = ? AND status = 'approved'").bind(params.id).first();
  if (!row) return err(404, "That home isn't on the map.");
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const voter = (await sha256(`${ip}:${row.id}:${day}`)).slice(0, 24);
  // If the visitor shares where they are and it is within about a quarter mile of the home, the report counts as seen on site
  const b = await request.json().catch(() => ({})), la = Number(b.lat), ln = Number(b.lng);
  let near = 0;
  if (Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180) {
    const r = Math.PI / 180, x = Math.sin(((la - row.lat) * r) / 2) ** 2 + Math.cos(row.lat * r) * Math.cos(la * r) * Math.sin(((ln - row.lng) * r) / 2) ** 2;
    near = 6371000 * 2 * Math.asin(Math.sqrt(x)) <= 400 ? 1 : 0;
  }
  await env.DB.prepare("INSERT INTO lights_on (post_id, day, voter, near) VALUES (?, ?, ?, ?) ON CONFLICT(post_id, day, voter) DO UPDATE SET near = MAX(near, excluded.near)").bind(row.id, day, voter, near).run();
  await env.DB.prepare("DELETE FROM lights_on WHERE day < date('now','-3 days')").run().catch(() => {});
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM lights_on WHERE post_id = ? AND day = ?").bind(row.id, day).first();
  const { k } = await env.DB.prepare("SELECT COUNT(*) AS k FROM lights_on WHERE post_id = ? AND day = ? AND near = 1").bind(row.id, day).first();
  return json({ ok: true, n, near: k, mine: near });
}
