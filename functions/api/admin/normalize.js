// GET  /api/admin/normalize        — audit: what would change if every stored phone, website, email, ZIP, street and name were tidied
// POST /api/admin/normalize {apply:true} — do it. Anything that can't be fixed automatically (a phone with 7 digits, a broken website)
// is left as it is and listed under "needs a person". Safe to run again: a tidy value never changes.
import { json } from "../../_lib/util.js";
import { webUrl } from "../../_lib/util.js";
import { normPhone, normZip, normStreet, normName, normEmailText, looksEmail, tidy, normText, normRadio } from "../../../public/norm.js";

// Each rule: table, label column (to say which record), and the fields with how to tidy them. A fixer returns a string, or null for "can't fix".
const FIX = {
  phone: (v) => { const p = normPhone(v); return p ? p.value : null; },
  url: (v) => webUrl(v) || null,
  email: (v) => { const e = normEmailText(v); return looksEmail(e) ? e : null; },
  zip: (v) => normZip(v) || null,
  street: (v) => normStreet(v),
  name: (v) => normName(v),
  line: (v) => tidy(v),
  text: (v) => normText(v),
  radio: (v) => normRadio(v),
};
const RULES = [
  { table: "posts", label: "title", fields: { phone: "phone", web: "url", contact_email: "email", zip: "zip", street: "street", biz: "name", title: "name", where_txt: "line", lights_on: "line", radio: "radio", descr: "text", service_area: "line" } },
  { table: "installers", label: "name", fields: { phone: "phone", web: "url", email: "email", owner_email: "email", area: "line", blurb: "text" } },
  { table: "contests", label: "name", fields: { site: "url", contact_email: "email", name: "name", org: "name", installer_email: "email", installer_url: "url", descr: "text" } },
  { table: "event_submissions", label: "name", fields: { contact_email: "email", url: "url", name: "name", venue: "name", hours: "line", price: "line" } },
  { table: "users", label: "email", fields: { name: "name", street: "street", zip: "zip" } },
  { table: "alert_subs", label: "email", fields: { email: "email" } },
  { table: "installer_leads", label: "name", fields: { phone: "phone", email: "email", name: "name" } },
  { table: "contest_leads", label: "name", fields: { phone: "phone", email: "email", name: "name" } },
];

async function scan(env, apply) {
  const report = [], attention = [];
  for (const r of RULES) {
    let rows;
    try { rows = (await env.DB.prepare(`SELECT rowid AS _r, * FROM ${r.table}`).all()).results; } catch { continue; }
    const stmts = [];
    for (const [col, kind] of Object.entries(r.fields)) {
      const stat = { table: r.table, field: col, changed: 0, attention: 0, examples: [] };
      for (const row of rows) {
        const old = row[col]; if (old === null || old === undefined || String(old) === "") continue;
        const fixed = FIX[kind](String(old));
        if (fixed === null) { stat.attention++; if (attention.length < 60) attention.push({ table: r.table, field: col, record: String(row[r.label] ?? row._r).slice(0, 60), value: String(old).slice(0, 80) }); continue; }
        if (fixed !== String(old)) {
          stat.changed++; if (stat.examples.length < 4) stat.examples.push({ record: String(row[r.label] ?? row._r).slice(0, 50), old: String(old).slice(0, 80), new: String(fixed).slice(0, 80) });
          if (apply) stmts.push(env.DB.prepare(`UPDATE ${r.table} SET ${col} = ? WHERE rowid = ?`).bind(fixed, row._r));
        }
      }
      if (stat.changed || stat.attention) report.push(stat);
    }
    for (let i = 0; i < stmts.length; i += 40) await env.DB.batch(stmts.slice(i, i + 40));
  }
  return { fields: report, attention, changed: report.reduce((n, f) => n + f.changed, 0), needsPerson: report.reduce((n, f) => n + f.attention, 0) };
}
export async function onRequestGet({ env }) { return json({ dry: true, ...(await scan(env, false)) }, { headers: { "cache-control": "no-store" } }); }
export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  return json({ dry: !b.apply, ...(await scan(env, !!b.apply)) }, { headers: { "cache-control": "no-store" } });
}
