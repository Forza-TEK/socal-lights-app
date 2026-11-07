// POST /api/outreach/check  { emails: ["a@b.com", ...] }   (at most 40)   Authorization: Bearer <OUTREACH_TOKEN>
// For each address: has it already joined (an account, an installer profile, a contest, an event or a home submitted with that contact address),
// has it stopped notification emails, and is it uncertain (nobody has this exact address, but someone on the same business domain has: review by a person).
// Answers only about the addresses it is given. If anything goes wrong it answers 503, and the caller must HOLD the email.
import { json, err } from "../../_lib/util.js";
import { normEmail, okEmail } from "../../_lib/auth.js";
import { isFreeMail } from "../../_lib/contests.js";
import { outreachDenied } from "../../_lib/outreach.js";
import { bump } from "../../_lib/funnel.js";

const MAX = 40;
// An address as normEmail writes it (lowercase, no +tag, no dots at Gmail), worked out in SQL so that records saved in any spelling still match
const KEY = (c) => `(CASE WHEN substr(lower(${c}), instr(lower(${c}), '@') + 1) IN ('gmail.com', 'googlemail.com') THEN replace(CASE WHEN instr(substr(lower(${c}), 1, instr(lower(${c}), '@') - 1), '+') > 0 THEN substr(lower(${c}), 1, instr(lower(${c}), '+') - 1) ELSE substr(lower(${c}), 1, instr(lower(${c}), '@') - 1) END, '.', '') || '@gmail.com' ELSE (CASE WHEN instr(substr(lower(${c}), 1, instr(lower(${c}), '@') - 1), '+') > 0 THEN substr(lower(${c}), 1, instr(lower(${c}), '+') - 1) ELSE substr(lower(${c}), 1, instr(lower(${c}), '@') - 1) END) || '@' || substr(lower(${c}), instr(lower(${c}), '@') + 1) END)`;
// where an address can be on file, and what it says about the person
const SOURCES = [["users", "email", "account"], ["installers", "email", "installer"], ["contests", "contact_email", "contest_organizer"], ["event_submissions", "contact_email", "event_host"], ["posts", "contact_email", "home"]];

export async function onRequestPost({ request, env }) {
  const denied = await outreachDenied(request, env); if (denied) { await bump(env, "outreach:denied"); return denied; }
  const b = await request.json().catch(() => null);
  const list = b && Array.isArray(b.emails) ? b.emails : null;
  if (!list || !list.length) return err(400, "Send { emails: [...] }.");
  if (list.length > MAX) return err(400, `At most ${MAX} addresses per request.`);
  const items = list.map((raw) => { const e = String(raw || "").trim().toLowerCase(); return { raw: String(raw || ""), e, n: okEmail(e) ? normEmail(e) : "" }; });
  const exact = [...new Set(items.filter((i) => i.n).map((i) => i.n))];
  const domains = [...new Set(items.filter((i) => i.n && !isFreeMail(i.n.split("@")[1])).map((i) => i.n.split("@")[1]))];
  try {
    const ph = (n) => Array(n).fill("?").join(",");
    const stmts = [];
    if (exact.length) {
      for (const [t, c, role] of SOURCES) stmts.push(env.DB.prepare(`SELECT ${KEY(c)} AS e, ? AS role FROM ${t} WHERE ${c} LIKE '%@%' AND ${KEY(c)} IN (${ph(exact.length)})`).bind(role, ...exact));
      stmts.push(env.DB.prepare(`SELECT ${KEY("email")} AS e, optout FROM email_prefs WHERE email LIKE '%@%' AND ${KEY("email")} IN (${ph(exact.length)})`).bind(...exact));
    }
    const dom = new Map(); // domain -> true when any registered record shares it
    if (domains.length) for (const [t, c] of SOURCES) stmts.push(env.DB.prepare(`SELECT DISTINCT substr(lower(${c}), instr(lower(${c}), '@') + 1) AS d FROM ${t} WHERE ${domains.map(() => `lower(${c}) LIKE ?`).join(" OR ")}`).bind(...domains.map((d) => "%@" + d)));
    const res = stmts.length ? await env.DB.batch(stmts) : [];
    const rows = res.map((r) => r.results || []);
    const roles = new Map(); let optouts = new Map();
    if (exact.length) {
      SOURCES.forEach((_, i) => rows[i].forEach((r) => { const s = roles.get(r.e) || new Set(); s.add(r.role); roles.set(r.e, s); }));
      rows[SOURCES.length].forEach((r) => optouts.set(r.e, !!r.optout));
    }
    if (domains.length) rows.slice(exact.length ? SOURCES.length + 1 : 0).forEach((rs) => rs.forEach((r) => dom.set(r.d, true)));
    const out = items.map((i) => {
      if (!i.n) return { email: i.raw, status: "invalid", roles: [], optout: false, review: null };
      const r = new Set(roles.get(i.n) || []), optout = !!optouts.get(i.n);
      const joined = r.size > 0;
      return { email: i.raw, status: joined ? "registered" : "none", roles: [...r].sort(), optout, review: !joined && dom.get(i.n.split("@")[1]) ? "same_domain" : null };
    });
    await bump(env, "outreach:check");
    return json({ checked: out.length, results: out }, { headers: { "cache-control": "no-store" } });
  } catch { return err(503, "The check failed. Hold the email."); }
}
