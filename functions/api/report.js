// POST /api/report { ref, name, message, contact } — "Something wrong? Tell us" from an event or home. Kept for the site owner,
// counted in the three-a-day email. Five a hour per connection.
import { json, err, clean, newId } from "../_lib/util.js";
import { normEmailText, normText } from "../_lib/fields.js";
import { looksEmail } from "../../public/norm.js";

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "That couldn't be read.");
  const message = normText(clean(b.message, 600)), ref = clean(b.ref, 60), name = clean(b.name, 120), c0 = normEmailText(clean(b.contact, 120)), contact = looksEmail(c0) ? c0 : "";
  if (message.length < 5) return err(400, "Tell us what is wrong (a few words is enough).");
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM submit_log WHERE ip = ? AND created_at > datetime('now','-1 hour')").bind(ip).first();
  if (n >= 5) return err(429, "Thanks, we have your reports. Try again in an hour.");
  await env.DB.batch([
    env.DB.prepare("INSERT INTO reports (id, ref, name, message, contact) VALUES (?,?,?,?,?)").bind(newId(), ref, name, message, contact),
    env.DB.prepare("INSERT INTO submit_log (ip) VALUES (?)").bind(ip),
  ]);
  return json({ ok: true });
}
