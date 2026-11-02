// POST /api/posts/<id>/on — a visitor says "the lights are on tonight". One report per connection per home per night.
import { json, err } from "../../../_lib/util.js";
import { sha256 } from "../../../_lib/auth.js";

export async function onRequestPost({ params, request, env }) {
  const row = await env.DB.prepare("SELECT id FROM posts WHERE id = ? AND status = 'approved'").bind(params.id).first();
  if (!row) return err(404, "That home isn't on the map.");
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const voter = (await sha256(`${ip}:${row.id}:${day}`)).slice(0, 24);
  await env.DB.prepare("INSERT OR IGNORE INTO lights_on (post_id, day, voter) VALUES (?, ?, ?)").bind(row.id, day, voter).run();
  await env.DB.prepare("DELETE FROM lights_on WHERE day < date('now','-3 days')").run().catch(() => {});
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM lights_on WHERE post_id = ? AND day = ?").bind(row.id, day).first();
  return json({ ok: true, n });
}
