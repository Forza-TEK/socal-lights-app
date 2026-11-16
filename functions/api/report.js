// POST /api/report { ref, name, message, contact } — "Something wrong? Tell us" from an event or home. Kept for the site owner,
// counted in the three-a-day email. Five a hour per connection, and the same connection cannot report the same item twice in a day.
// Also the "Report" button inside the app (Apple 1.2, user-generated content): the optional `reason` says what kind of report it is. An "objectionable" report is
// filed with that word first so Admin > Reports shows it at the top of the message, and the owner acts on it within 24 hours (docs/audit/2026-11-16/app-policy-decisions.md).
import { json, err, clean, newId } from "../_lib/util.js";
import { ipPruneStatements } from "../_lib/retention.js";
import { normEmailText, normText } from "../_lib/fields.js";
import { looksEmail } from "../../public/norm.js";

export const REASONS = { objectionable: "Objectionable content", fake: "Not a real event or home", wrong: "Wrong information", other: "Other" };

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "That couldn't be read.");
  const reason = Object.prototype.hasOwnProperty.call(REASONS, b.reason) ? b.reason : "";
  const typed = normText(clean(b.message, 600)), message = reason ? (`[${REASONS[reason]}] ` + (typed || "(no details)")).slice(0, 640) : typed, ref = clean(b.ref, 60), name = clean(b.name, 120), c0 = normEmailText(clean(b.contact, 120)), contact = looksEmail(c0) ? c0 : "";
  if (!reason && message.length < 5) return err(400, "Tell us what is wrong (a few words is enough).");
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM submit_log WHERE ip = ? AND created_at > datetime('now','-1 hour')").bind(ip).first();
  if (n >= 5) return err(429, "Thanks, we have your reports. Try again in an hour.");
  if (ref && (await env.DB.prepare("SELECT 1 AS x FROM reports WHERE ref = ? AND message = ? AND created_at > datetime('now','-1 day') LIMIT 1").bind(ref, message).first())) return json({ ok: true }); // the same words about the same item: already have it
  await env.DB.batch([
    env.DB.prepare("INSERT INTO reports (id, ref, name, message, contact) VALUES (?,?,?,?,?)").bind(newId(), ref, name, message, contact),
    env.DB.prepare("INSERT INTO submit_log (ip) VALUES (?)").bind(ip),
    ...ipPruneStatements(env),
  ]);
  return json({ ok: true });
}
