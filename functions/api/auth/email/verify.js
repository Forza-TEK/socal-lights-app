// POST /api/auth/email/verify { email, code } — checks the code and signs the person in.
import { json, err } from "../../../_lib/util.js";
import { normEmail, okEmail, sha256, upsertUser, startSession, sameOrigin } from "../../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const b = await request.json().catch(() => null);
  if (!b || !okEmail(b.email) || !/^\d{6}$/.test(String(b.code || "").trim())) return err(400, "Enter the 6-digit code from the email.");
  const email = normEmail(b.email), code = String(b.code).trim();
  const row = await env.DB.prepare("SELECT id, code_hash, tries FROM login_codes WHERE email = ? AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1").bind(email).first();
  if (!row || row.tries >= 5) return err(400, "That code has expired. Ask for a new one.");
  if (row.code_hash !== (await sha256(`${email}:${code}`))) {
    await env.DB.prepare("UPDATE login_codes SET tries = tries + 1 WHERE id = ?").bind(row.id).run();
    return err(400, "That code doesn't match. Check the email and try again.");
  }
  await env.DB.prepare("DELETE FROM login_codes WHERE email = ?").bind(email).run();
  const user = await upsertUser(env, email);
  return json({ ok: true, user: { id: user.id, email: user.email, name: user.name } }, { headers: { "set-cookie": await startSession(env, request, user.id) } });
}
