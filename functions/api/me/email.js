// POST /api/me/email — a signed-in person changes the email of their account (F-10a), after proving they can read the new address.
//   { action: "start", email }         emails a 6-digit code to the NEW address (valid 10 minutes; 4 an hour per account, 12 an hour per connection)
//   { action: "confirm", email, code } checks the code (5 tries), then moves the account and every record keyed by the old address in ONE batch (functions/_lib/emailchange.js)
// The code is kept in login_codes under the key "chg:<account id>:<new address>" with a hash that covers the account id, so it can never be used to sign in and a sign-in code can never confirm a change.
// Refused: the same address, a throwaway domain, an address that already has an account (accounts are not merged here), a suspended account.
import { json, err } from "../../_lib/util.js";
import { sendTemplate } from "../../_lib/mailtpl.js";
import { ipPruneStatements } from "../../_lib/retention.js";
import { requireUser, sameOrigin, okEmail, normEmail, isDisposable, sha256, isSuspended } from "../../_lib/auth.js";
import { emailChangeStatements } from "../../_lib/emailchange.js";

export const CHANGE_PER_ACCOUNT_HOUR = 4, CHANGE_PER_IP_HOUR = 12;
const key = (uid, e) => `chg:${uid}:${e}`;
const hash = (uid, e, code) => sha256(`chg:${uid}:${e}:${code}`);

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  if (user.adminActing || !user.id) return err(403, "The email of an account can only be changed by its owner, signed in.");
  const b = await request.json().catch(() => null);
  if (!b || !okEmail(b.email)) return err(400, "Enter a valid email address.");
  const typed = String(b.email).trim(), next = normEmail(typed), ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (next === normEmail(user.email)) return err(400, "That is already your account email.");
  if (isDisposable(typed)) return err(400, "Throwaway email addresses can't be used here. Use your own email.");

  if (b.action === "start") {
    if (!env.RESEND_API_KEY && env.DEV_AUTH !== "1") return err(503, "Email isn't switched on yet.");
    if (await env.DB.prepare("SELECT 1 AS x FROM users WHERE email = ?").bind(next).first() || await isSuspended(env, next)) return err(409, "That email already has a SoCal Lights account. Use a different address, or sign in with it instead.");
    const { n: perAcct } = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_codes WHERE email LIKE ? AND created_at > datetime('now','-1 hour')").bind(`chg:${user.id}:%`).first();
    const { n: perIp } = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_codes WHERE ip = ? AND created_at > datetime('now','-1 hour')").bind(ip).first();
    if (perAcct >= CHANGE_PER_ACCOUNT_HOUR || perIp >= CHANGE_PER_IP_HOUR) return err(429, "Too many codes requested. Try again in an hour.");
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    const exp = new Date(Date.now() + 10 * 60_000).toISOString().slice(0, 19).replace("T", " ");
    await env.DB.batch([
      env.DB.prepare("INSERT INTO login_codes (email,code_hash,ip,expires_at) VALUES (?,?,?,?)").bind(key(user.id, next), await hash(user.id, next, code), ip, exp),
      ...ipPruneStatements(env),
    ]);
    if (env.DEV_AUTH === "1" && new URL(request.url).hostname === "localhost" && !env.RESEND_API_KEY) return json({ ok: true, devCode: code });
    if (!(await sendTemplate(env, "email_change_code", typed, { code, old: user.email }))) return err(502, "We couldn't send the email. Please try again in a moment.");
    return json({ ok: true });
  }

  if (b.action === "confirm") {
    const code = String(b.code || "").trim();
    if (!/^\d{6}$/.test(code)) return err(400, "Enter the 6-digit code from the email.");
    const row = await env.DB.prepare("SELECT id, code_hash, tries FROM login_codes WHERE email = ? AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1").bind(key(user.id, next)).first();
    if (!row || row.tries >= 5) return err(400, "That code has expired. Ask for a new one.");
    const spent = await env.DB.prepare("UPDATE login_codes SET tries = tries + 1 WHERE id = ? AND tries < 5").bind(row.id).run(); // spend a try before comparing (parallel guesses cannot all pass)
    if (!spent.meta || spent.meta.changes !== 1) return err(400, "That code has expired. Ask for a new one.");
    if (row.code_hash !== (await hash(user.id, next, code))) return err(400, "That code doesn't match. Check the email and try again.");
    if (await env.DB.prepare("SELECT 1 AS x FROM users WHERE email = ?").bind(next).first()) return err(409, "That email already has a SoCal Lights account.");
    const { statements, counts } = await emailChangeStatements(env, user, next, typed);
    try { await env.DB.batch([...statements, env.DB.prepare("DELETE FROM login_codes WHERE email LIKE ?").bind(`chg:${user.id}:%`)]); }
    catch (e) { console.error("email change", e && e.message); return err(409, "That email can't be used (it may have just been taken). Nothing was changed."); }
    return json({ ok: true, email: next, moved: counts });
  }
  return err(400, "Unknown action.");
}
