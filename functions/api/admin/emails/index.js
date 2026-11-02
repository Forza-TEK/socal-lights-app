// GET /api/admin/emails — every automatic email: the default wording, any edited wording, and a rendered sample.
import { json } from "../../../_lib/util.js";
import { TEMPLATES, GROUPS, sampleVars, renderTemplate } from "../../../_lib/mailtpl.js";

export async function onRequestGet({ env }) {
  let saved = [];
  try { saved = (await env.DB.prepare("SELECT id, subject, body, updated_by, updated_at FROM email_templates").all()).results; } catch {}
  const by = new Map(saved.map((r) => [r.id, r]));
  const items = [];
  for (const t of TEMPLATES) {
    const s = by.get(t.id), sample = sampleVars(t);
    const now = await renderTemplate(env, t.id, sample, s ? { subject: s.subject, body: s.body } : null);
    items.push({
      id: t.id, group: t.group, name: t.name, to: t.to, when: t.when,
      vars: Object.entries(t.vars).map(([k, v]) => ({ key: k, label: v[0], sample: v[1], required: !!v[2] })),
      default: { subject: t.subject, body: t.text },
      subject: s ? s.subject : t.subject, body: s ? s.body : t.text,
      edited: !!s, updated_by: s ? s.updated_by : "", updated_at: s ? s.updated_at : "",
      preview: { subject: now.subject, text: now.text, html: now.html },
    });
  }
  return json({ groups: GROUPS.map(([k, label]) => ({ key: k, label })), items });
}
