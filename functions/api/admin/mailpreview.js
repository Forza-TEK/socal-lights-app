// POST /api/admin/mailpreview { id, subject, body, test? } — render a draft with sample values; with test:true also send it to the admin.
import { json, err } from "../../_lib/util.js";
import { byId, sampleVars, renderTemplate, checkTemplate as check } from "../../_lib/mailtpl.js";
import { sendMail } from "../../_lib/auth.js";

export async function onRequestPost({ request, env, data }) {
  const b = await request.json().catch(() => ({}));
  const t = byId(String(b.id || ""));
  if (!t) return err(404, "That email doesn't exist.");
  const subject = String(b.subject || "").trim(), body = String(b.body || "").replace(/\r\n/g, "\n").trim();
  const bad = check(t, subject, body);
  if (bad) return err(400, bad);
  const m = await renderTemplate(env, t.id, sampleVars(t), { subject, body });
  if (b.test === true) {
    const sent = await sendMail(env, { to: data.admin.email, subject: "[Test] " + m.subject, text: m.text, html: m.html });
    if (!sent) return err(502, env.RESEND_API_KEY ? "The test email could not be sent." : "Email isn't set up on this server (no RESEND_API_KEY), so nothing was sent.");
    return json({ ok: true, to: data.admin.email });
  }
  return json({ subject: m.subject, text: m.text, html: m.html });
}
