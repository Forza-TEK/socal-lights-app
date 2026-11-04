// POST /api/help/contact { ref, message, contact } — "Still stuck? Ask us". Lands in Admin > Reports (and the daily digest email), five an hour per connection.
import { json, err, clean, newId } from "../../_lib/util.js";
import { normEmailText, normText } from "../../_lib/fields.js";
import { looksEmail } from "../../../public/norm.js";

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "That couldn't be read.");
  const message = normText(clean(b.message, 600)), ref = clean(b.ref, 60) || "help", c0 = normEmailText(clean(b.contact, 120)), contact = looksEmail(c0) ? c0 : "";
  if (message.length < 5) return err(400, "Tell us what you need help with (a few words is enough).");
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM submit_log WHERE ip = ? AND created_at > datetime('now','-1 hour')").bind(ip).first();
  if (n >= 5) return err(429, "Thanks, we have your messages. Please try again in an hour.");
  await env.DB.batch([
    env.DB.prepare("INSERT INTO reports (id, ref, name, message, contact) VALUES (?,?,?,?,?)").bind(newId(), ref, "Help Center question", message, contact),
    env.DB.prepare("INSERT INTO submit_log (ip) VALUES (?)").bind(ip),
  ]);
  return json({ ok: true });
}
