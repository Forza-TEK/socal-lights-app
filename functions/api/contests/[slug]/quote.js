// POST /api/contests/<slug>/quote { name, phone, note, consent } — a signed-in visitor asks the contest's presenting installer for a quote.
// The installer and the organizer get the details by email; nothing is shared without the visitor ticking the consent box.
import { json, err, clean, newId } from "../../../_lib/util.js";
import { getUser, sameOrigin, sendMail } from "../../../_lib/auth.js";
import { getContest } from "../../../_lib/contests.js";

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const user = await getUser(request, env);
  if (!user) return err(401, "Please sign in first.");
  const c = await getContest(env, params.slug);
  if (!c || c.status !== "live" || !c.installer_name || !c.installer_email) return err(404, "This contest isn't taking quote requests.");
  const b = await request.json().catch(() => ({}));
  if (b.consent !== true) return err(400, "Tick the box to share your details with the installer.");
  const name = clean(b.name, 80), phone = clean(b.phone, 30), note = clean(b.note, 400);
  if (name.length < 2) return err(400, "Enter your name.");
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM contest_leads WHERE contest_id = ? AND user_id = ? AND created_at > datetime('now','-1 day')").bind(c.id, user.id).first();
  if (n >= 2) return err(429, "You've already sent a request. The installer will be in touch.");
  await env.DB.prepare("INSERT INTO contest_leads (id, contest_id, user_id, name, email, phone, note) VALUES (?,?,?,?,?,?,?)").bind(newId(), c.id, user.id, name, user.email, phone, note).run();
  const text = `${name} asked for a quote through ${c.name}.\n\nEmail: ${user.email}${phone ? `\nPhone: ${phone}` : ""}${note ? `\nNote: ${note}` : ""}\n\nThey agreed to share these details with ${c.installer_name} for this request.`;
  await sendMail(env, { to: c.installer_email, subject: `Quote request from ${c.name}`, text });
  await sendMail(env, { to: c.contact_email, subject: `Quote request sent: ${c.name}`, text: `${name} asked ${c.installer_name} for a quote. You can see requests on your dashboard: https://socallights.app/c/${c.slug}/manage` });
  return json({ ok: true });
}
