// POST /api/contests/<slug>/quote { name, phone, note, consent } — a signed-in visitor asks the contest's presenting installer for a quote.
// The installer and the organizer get the details by email; nothing is shared without the visitor ticking the consent box.
import { json, err, clean, newId } from "../../../_lib/util.js";
import { sendTemplate } from "../../../_lib/mailtpl.js";
import { phoneField, normName, line } from "../../../_lib/fields.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { getContest } from "../../../_lib/contests.js";
import { quoteThrottle } from "../../../_lib/throttle.js";

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const user = await getUser(request, env);
  if (!user) return err(401, "Please sign in first.");
  const c = await getContest(env, params.slug);
  if (!c || c.status !== "live" || !c.installer_name || !c.installer_email) return err(404, "This contest isn't taking quote requests.");
  const b = await request.json().catch(() => ({}));
  if (b.consent !== true) return err(400, "Tick the box to send your request to the installer and the contest organizer.");
  const name = normName(clean(b.name, 80)), ph = phoneField(b.phone), note = line(b.note, 400);
  if (ph.error) return err(400, ph.error);
  const phone = ph.value;
  if (name.length < 2) return err(400, "Enter your name.");
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM contest_leads WHERE contest_id = ? AND user_id = ? AND created_at > datetime('now','-1 day')").bind(c.id, user.id).first();
  if (n >= 2) return err(429, "You've already sent a request. The installer will be in touch.");
  const slow = await quoteThrottle(env, request, user); // N-03: account-wide and per-connection caps, one a minute
  if (slow) return err(429, slow);
  await env.DB.prepare("INSERT INTO contest_leads (id, contest_id, user_id, name, email, phone, note) VALUES (?,?,?,?,?,?,?)").bind(newId(), c.id, user.id, name, user.email, phone, note).run();
  await sendTemplate(env, "contest_quote", c.installer_email, { name, contest: c.name, email: user.email, phone, note, installer: c.installer_name });
  await sendTemplate(env, "contest_quote_sent", c.contact_email, { name, contest: c.name, installer: c.installer_name, link: `https://socallights.app/c/${c.slug}/manage` });
  return json({ ok: true });
}
