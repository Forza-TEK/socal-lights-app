// POST /api/auth/email/verify { email, code } — checks the code and signs the person in.
import { json, err } from "../../../_lib/util.js";
import { normEmail, okEmail, sha256, upsertUser, startSession, sameOrigin, SUSPENDED_MSG } from "../../../_lib/auth.js";

// Verify attempts allowed per network address per hour. The address is stored only as a one-way hash (in submit_log, which is pruned after 48 hours like the other IP rows).
export const VERIFY_PER_IP_HOUR = 30;

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const b = await request.json().catch(() => null);
  if (!b || !okEmail(b.email) || !/^\d{6}$/.test(String(b.code || "").trim())) return err(400, "Enter the 6-digit code from the email.");
  const email = normEmail(b.email), code = String(b.code).trim();
  // Per-IP cap: record this attempt first, then count, so parallel requests all see each other
  const ipKey = "vf:" + (await sha256("verify-ip:" + (request.headers.get("CF-Connecting-IP") || "unknown"))).slice(0, 24);
  await env.DB.prepare("INSERT INTO submit_log (ip) VALUES (?)").bind(ipKey).run();
  const { n: tried } = await env.DB.prepare("SELECT COUNT(*) AS n FROM submit_log WHERE ip = ? AND created_at > datetime('now','-1 hour')").bind(ipKey).first();
  if (tried > VERIFY_PER_IP_HOUR) return err(429, "Too many attempts. Try again in an hour.");
  const row = await env.DB.prepare("SELECT id, code_hash, tries FROM login_codes WHERE email = ? AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1").bind(email).first();
  if (!row || row.tries >= 5) return err(400, "That code has expired. Ask for a new one.");
  // Spend one of the 5 attempts in a single statement before comparing (a read-then-write let parallel guesses all pass the check); if no attempt was left, nothing is compared
  const spent = await env.DB.prepare("UPDATE login_codes SET tries = tries + 1 WHERE id = ? AND tries < 5").bind(row.id).run();
  if (!spent.meta || spent.meta.changes !== 1) return err(400, "That code has expired. Ask for a new one.");
  if (row.code_hash !== (await sha256(`${email}:${code}`))) return err(400, "That code doesn't match. Check the email and try again.");
  await env.DB.prepare("DELETE FROM login_codes WHERE email = ?").bind(email).run();
  const user = await upsertUser(env, email);
  if (user.status === "suspended") return err(403, SUSPENDED_MSG);
  return json({ ok: true, user: { id: user.id, email: user.email, name: user.name } }, { headers: { "set-cookie": await startSession(env, request, user.id) } });
}
