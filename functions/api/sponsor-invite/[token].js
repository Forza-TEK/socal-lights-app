// The public sponsor page's data (no account). The page is /s/<token> (public/sponsor-invite.html); the token is the unlisted, unguessable invite link an organizer shares.
//   GET  /api/sponsor-invite/<token>  the contest (name, organizer, dates), the organizer's levels and "how to pay" (their own link and/or plain text). 404 for an unknown, switched-off or expired link.
//   POST /api/sponsor-invite/<token>  multipart: contact_name, company, website, phone, email, level, message, logo?, permission, understand, cf-turnstile-response, company_site (honeypot)
// A submission is only a request: nothing is public until the organizer marks the payment received (or in kind) and approves it. The site never charges or holds money.
// Safety: Turnstile, honeypot, 5 submissions a day per connection and 20 a day per link (hashed, send_throttle), SVG refused, logo under 1 MB.
import { json, err, clean, webUrl, newId, verifyTurnstile } from "../../_lib/util.js";
import { checkThrottle, hashKey } from "../../_lib/throttle.js";
import { selfServiceOn, TOKEN_RE, levelsOf, sniffImage, plainText, payLink } from "../../_lib/sponsors.js";
import { tell } from "../../_lib/notify.js";
import { bump } from "../../_lib/funnel.js";

export const SELF_LOGO_MAX = 1024 * 1024;
const notFound = () => err(404, "This sponsor link isn't active. Ask the organizer for a new one.");
async function contestOf(env, token) {
  if (!TOKEN_RE.test(String(token || ""))) return null;
  const c = await env.DB.prepare("SELECT * FROM contests WHERE sponsor_token = ?").bind(token).first();
  return c && c.sponsor_link_on && selfServiceOn(c) ? c : null;
}

export async function onRequestGet({ params, env }) {
  const c = await contestOf(env, params.token);
  if (!c) return notFound();
  const link = c.sponsor_pay_hidden ? { url: "" } : payLink(c.sponsor_pay_url), text = c.sponsor_pay_hidden ? "" : c.sponsor_pay_text || "";
  return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || "", contest: { name: c.name, org: c.org, city: c.city, entries_close: c.entries_close, vote_start: c.vote_start, vote_end: c.vote_end }, levels: levelsOf(c), pay: { url: link.url || "", host: link.host || "", text } },
    { headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

export async function onRequestPost({ params, request, env, waitUntil }) {
  const c = await contestOf(env, params.token);
  if (!c) return notFound();
  const form = await request.formData().catch(() => null);
  if (!form) return err(400, "The form couldn't be read. Please try again.");
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (clean(form.get("company_site"), 40)) return json({ ok: true }); // honeypot: a bot filled the hidden field; answer as if it worked
  const g = (k, n) => plainText(form.get(k), n), contact = g("contact_name", 80), company = g("company", 80), email = clean(form.get("email"), 120).toLowerCase(), phone = g("phone", 40), message = g("message", 500), rawSite = clean(form.get("website"), 200);
  const site = rawSite ? webUrl(rawSite) : "", levels = levelsOf(c), level = g("level", 60), pick = levels.find((l) => l.label === level);
  if (contact.length < 2) return err(400, "Enter your name.");
  if (company.length < 2) return err(400, "Enter your company name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(400, "Enter a valid email address.");
  if (rawSite && !site) return err(400, "Enter a valid website address, like example.com.");
  if (level && level !== "Other" && !pick) return err(400, "Choose one of the levels, or Other.");
  if (form.get("permission") !== "1") return err(400, "Tick that you have permission to share your company's name and logo on the contest page.");
  if (form.get("understand") !== "1") return err(400, "Tick that you understand your payment goes to the organizer.");
  let lt = null, lbuf = null; const lf = form.get("logo");
  if (lf && typeof lf === "object" && lf.size) {
    if (/svg/i.test(lf.type || "") || /\.svg$/i.test(lf.name || "")) return err(400, "SVG logos aren't accepted. Use a PNG, JPG or WebP image.");
    if (lf.size > SELF_LOGO_MAX) return err(400, "That logo is too large. Use an image under 1 MB.");
    lbuf = await lf.arrayBuffer(); lt = sniffImage(lbuf); if (!lt) return err(400, "Logos must be a PNG, JPG or WebP image.");
  }
  if (!(await verifyTurnstile(env, form.get("cf-turnstile-response"), ip))) return err(400, "Please complete the 'I am human' check and try again.");
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM contest_sponsors WHERE contest_id = ?").bind(c.id).first();
  if (n >= 30) return err(400, "This contest has all the sponsor requests it can take for now. Please contact the organizer.");
  const limited = await checkThrottle(env, [
    { kind: "sponsor-ip", key: await hashKey(env, "sponsor-ip", ip), max: 5, windowHours: 24, msg: "You have sent several sponsor requests today. Please try again tomorrow." },
    { kind: "sponsor-link", key: await hashKey(env, "sponsor-link", c.id), max: 20, windowHours: 24, msg: "This sponsor link has received a lot of requests today. Please try again tomorrow or contact the organizer." },
  ]);
  if (limited) return err(429, limited);
  const id = newId(); let logo = "";
  if (lt) { logo = `sponsor/${c.id}/${id}.${lt.ext}`; await env.PHOTOS.put(logo, lbuf, { httpMetadata: { contentType: lt.type } }); }
  await env.DB.prepare("INSERT INTO contest_sponsors (id, contest_id, name, contact_name, tier, url, phone, email, basis, show_public, permission, logo, status, source, message, level_label, updated_at) VALUES (?,?,?,?,?,?,?,?,'',0,1,?, 'submitted','self',?,?,datetime('now'))")
    .bind(id, c.id, company, contact, "prize", site || "", phone, email, logo, message, pick ? `${pick.label}${pick.cents != null ? " ($" + (pick.cents % 100 ? (pick.cents / 100).toFixed(2) : pick.cents / 100) + ")" : ""}` : level === "Other" ? "Other" : "").run();
  const base = new URL(request.url).origin;
  tell(env, waitUntil, c.contact_email, "sponsor_submitted", { contest: c.name, company, contact, email, level: pick ? pick.label : level || "not chosen", message, link: `${base}/c/${c.slug}/manage#sponsors` });
  tell(env, waitUntil, email, "sponsor_thanks", { contest: c.name, organizer: c.org, company });
  await bump(env, "fn:sponsor-invite-submitted");
  return json({ ok: true, organizer: c.org });
}
