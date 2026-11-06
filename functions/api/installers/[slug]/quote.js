// POST /api/installers/<slug>/quote { name, phone, note, consent } — a signed-in visitor asks this installer for a quote.
import { json, err, clean, newId } from "../../../_lib/util.js";
import { sendTemplate } from "../../../_lib/mailtpl.js";
import { phoneField, normName, line } from "../../../_lib/fields.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { quoteThrottle } from "../../../_lib/throttle.js";

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const user = await getUser(request, env);
  if (!user) return err(401, "Please sign in first.");
  const inst = await env.DB.prepare("SELECT * FROM installers WHERE slug = ? AND status = 'active'").bind(params.slug).first();
  const to = inst && (inst.owner_email || inst.email);
  if (!inst || !to) return err(404, "This company isn't taking quote requests here yet. Use the phone number or website on its page.");
  const b = await request.json().catch(() => ({}));
  if (b.consent !== true) return err(400, "Tick the box to share your details with the installer.");
  const name = normName(clean(b.name, 80)), ph = phoneField(b.phone), note = line(b.note, 400);
  if (ph.error) return err(400, ph.error);
  const phone = ph.value;
  if (name.length < 2) return err(400, "Enter your name.");
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM installer_leads WHERE installer_id = ? AND user_id = ? AND created_at > datetime('now','-1 day')").bind(inst.id, user.id).first();
  if (n >= 2) return err(429, "You've already sent a request. The installer will be in touch.");
  const slow = await quoteThrottle(env, request, user); // N-03: account-wide and per-connection caps, one a minute
  if (slow) return err(429, slow);
  await env.DB.prepare("INSERT INTO installer_leads (id, installer_id, user_id, name, email, phone, note) VALUES (?,?,?,?,?,?,?)").bind(newId(), inst.id, user.id, name, user.email, phone, note).run();
  await sendTemplate(env, "installer_quote", to, { name, installer: inst.name, email: user.email, phone, note, profile: `https://socallights.app/installer/${inst.slug}` }).catch(() => {});
  return json({ ok: true });
}
