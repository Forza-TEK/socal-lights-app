// POST /api/remove-home { ref?, address?, email, note?, "cf-turnstile-response" } — "Not your listing? Remove my home". No account needed.
// Creates a removal request for Admin, emails the team, and emails the requester an acknowledgment. Nothing is removed until Admin approves.
// Limits: Turnstile, 5 requests an hour per connection (submit_log, pruned after 48 hours) and 3 a day per address (hashed).
import { json, err, clean, newId, verifyTurnstile } from "../_lib/util.js";
import { sendTemplate } from "../_lib/mailtpl.js";
import { ipPruneStatements } from "../_lib/retention.js";
import { normEmailText, normText } from "../_lib/fields.js";
import { looksEmail } from "../../public/norm.js";
import { sameOrigin } from "../_lib/auth.js";
import { checkThrottle, hashKey } from "../_lib/throttle.js";
import { cleanRef, resolveRef } from "../_lib/removal.js";

export async function onRequestPost({ request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "That couldn't be read. Please try again.");
  if (b.website) return json({ ok: true }); // honeypot
  const email = normEmailText(clean(b.email, 120)).toLowerCase(), address = clean(b.address, 200), note = normText(clean(b.note, 600)), ref = cleanRef(b.ref);
  if (!looksEmail(email)) return err(400, "Enter an email address where we can reach you.");
  if (!ref && address.length < 5) return err(400, "Tell us the street address of the home (or open this form from the home's page).");
  if (!(await verifyTurnstile(env, b["cf-turnstile-response"], ip))) return err(400, "Please complete the 'I am human' check and try again.");

  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM submit_log WHERE ip = ? AND created_at > datetime('now','-1 hour')").bind(ip).first();
  if (n >= 5) return err(429, "Thanks, we have your requests. Please try again in an hour.");
  const slow = await checkThrottle(env, [{ kind: "removal-email", key: await hashKey(env, "e", email), max: 3, windowHours: 24, msg: "We already have requests from this email address today. We will answer them soon; you can also write to info@socallights.app." }]);
  if (slow) return err(429, slow);

  const id = newId();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO removal_requests (id, ref, address, email, note) VALUES (?,?,?,?,?)").bind(id, ref, address, email, note),
    env.DB.prepare("INSERT INTO submit_log (ip) VALUES (?)").bind(ip),
    ...ipPruneStatements(env),
  ]);
  // Say what the listing is called in the acknowledgment when we can find it (so the person sees we understood), otherwise echo what they typed.
  let shown = address || ref;
  try { const t = ref ? await resolveRef(env, ref) : null; if (t) shown = `${t.row.name || t.row.title || ref}${t.row.address ? ", " + t.row.address : ""}`; } catch {}
  const team = env.ADMIN_NOTIFY_EMAIL || "rey@forza-tek.com";
  const jobs = Promise.all([
    sendTemplate(env, "home_removal_admin", team, { listing: ref || "(none, address only)", address: address || shown, email, note, link: "https://socallights.app/admin/" }).catch(() => {}),
    sendTemplate(env, "home_removal_ack", email, { listing: shown }).catch(() => {}),
  ]);
  if (waitUntil) waitUntil(jobs); else await jobs;
  return json({ ok: true });
}
