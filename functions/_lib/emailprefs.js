// Who has unsubscribed from notification emails. A row is made the first time someone is sent such an email; its token is what the
// unsubscribe link carries (no login needed). Service emails (sign-in codes, approvals) don't use this.
const clean = (e) => String(e || "").trim().toLowerCase();
const newToken = () => [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(16).padStart(2, "0")).join("");

// { token, optout } for an address, creating the row if needed. Returns null when the table isn't there, so mail still goes out.
export async function prefsFor(env, email) {
  const e = clean(email); if (!e) return null;
  try {
    let r = await env.DB.prepare("SELECT token, optout FROM email_prefs WHERE email = ?").bind(e).first();
    if (!r) { await env.DB.prepare("INSERT OR IGNORE INTO email_prefs (email, token) VALUES (?, ?)").bind(e, newToken()).run(); r = await env.DB.prepare("SELECT token, optout FROM email_prefs WHERE email = ?").bind(e).first(); }
    return r;
  } catch { return null; }
}
export async function prefsByToken(env, token) {
  if (!/^[a-f0-9]{36}$/.test(String(token || ""))) return null;
  try { return await env.DB.prepare("SELECT email, optout FROM email_prefs WHERE token = ?").bind(token).first(); } catch { return null; }
}
export async function setOptout(env, token, optout) {
  const r = await env.DB.prepare("UPDATE email_prefs SET optout = ?, updated_at = datetime('now') WHERE token = ?").bind(optout ? 1 : 0, token).run();
  return !!(r.meta && r.meta.changes);
}
export const maskEmail = (e) => { const [u, d] = String(e).split("@"); return (u.length > 2 ? u.slice(0, 2) : u.slice(0, 1)) + "***@" + (d || ""); };
