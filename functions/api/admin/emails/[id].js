// PUT  /api/admin/emails/<id>  { subject, body }       — save new wording for one email
// POST /api/admin/emails/<id>  { action: "reset" }     — go back to the default wording
import { json, err } from "../../../_lib/util.js";
import { byId, checkTemplate as check } from "../../../_lib/mailtpl.js";

export async function onRequestPut({ params, request, env, data }) {
  const t = byId(params.id);
  if (!t) return err(404, "That email doesn't exist.");
  const b = await request.json().catch(() => ({}));
  const subject = String(b.subject || "").trim(), body = String(b.body || "").replace(/\r\n/g, "\n").trim();
  const bad = check(t, subject, body);
  if (bad) return err(400, bad);
  if (subject === t.subject && body === t.text) { await env.DB.prepare("DELETE FROM email_templates WHERE id = ?").bind(t.id).run(); return json({ ok: true, edited: false }); }
  await env.DB.prepare("INSERT INTO email_templates (id, subject, body, updated_by, updated_at) VALUES (?,?,?,?,datetime('now')) ON CONFLICT(id) DO UPDATE SET subject = excluded.subject, body = excluded.body, updated_by = excluded.updated_by, updated_at = excluded.updated_at").bind(t.id, subject, body, data.admin.email).run();
  return json({ ok: true, edited: true });
}

export async function onRequestPost({ params, request, env }) {
  const t = byId(params.id);
  if (!t) return err(404, "That email doesn't exist.");
  const b = await request.json().catch(() => ({}));
  if (b.action !== "reset") return err(400, "Unknown action.");
  await env.DB.prepare("DELETE FROM email_templates WHERE id = ?").bind(t.id).run();
  return json({ ok: true });
}
