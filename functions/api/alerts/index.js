// POST /api/alerts — ask for the weekly "lights near you" email. Sends a confirmation link; nothing is sent until it is clicked.
import { json, err, clean, newId, verifyTurnstile } from "../../_lib/util.js";
import { sendTemplate } from "../../_lib/mailtpl.js";
import { bump } from "../../_lib/funnel.js";
import { CITY } from "../../../public/cities.js";
import { alertConfirmThrottle } from "../../_lib/throttle.js";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "That could not be read. Please try again.");
  if (!(await verifyTurnstile(env, b["cf-turnstile-response"], ip))) return err(400, "Please complete the 'I am human' check and try again.");
  if (b.website) return json({ ok: true }); // honeypot
  const email = clean(b.email, 200).toLowerCase(), city = clean(b.city, 60), radius = [5, 10, 25].includes(+b.radius) ? +b.radius : 10;
  if (!EMAIL.test(email)) return err(400, "Enter a valid email address.");
  if (!b.consent) return err(400, "Please tick the box to say you want these emails.");
  let at = CITY[city] ? { lat: CITY[city][0], lng: CITY[city][1] } : null;
  if (!at) at = await env.DB.prepare("SELECT AVG(lat) AS lat, AVG(lng) AS lng FROM events WHERE city = ?").bind(city).first();
  if (!at || at.lat == null) return err(400, "Choose a city from the list.");
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM alert_subs WHERE created_at > datetime('now','-1 hour')").first();
  if (n >= 60) return err(429, "Lots of sign-ups right now. Please try again in a little while.");
  const old = await env.DB.prepare("SELECT id, token, confirmed FROM alert_subs WHERE email = ?").bind(email).first();
  // S-10: every confirmation email counts (a first sign-up and each re-send): 3 a day per address, 20 a day per connection
  if (!old || !old.confirmed) { const slow = await alertConfirmThrottle(env, request, email); if (slow) return err(429, slow); }
  const token = old ? old.token : newId() + newId();
  if (old) await env.DB.prepare("UPDATE alert_subs SET city = ?, lat = ?, lng = ?, radius = ? WHERE id = ?").bind(city, at.lat, at.lng, radius, old.id).run();
  else await env.DB.prepare("INSERT INTO alert_subs (id, email, city, lat, lng, radius, token) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(newId(), email, city, at.lat, at.lng, radius, token).run();
  const origin = new URL(request.url).origin;
  if (!old || !old.confirmed) {
    const ok = await sendTemplate(env, "alerts_confirm", email, { radius, city, link: `${origin}/api/alerts/confirm?t=${token}` });
    if (!ok) return err(503, "The confirmation email could not be sent. Please try again later.");
  }
  if (!old) { await bump(env, "fn:subscribe"); if (b.src === "city" || b.src === "event") await bump(env, "fn:subscribe-landing"); } // a new sign-up (an update to an existing one is not counted again); "landing" = from a city or event page
  return json({ ok: true, already: !!(old && old.confirmed) });
}
