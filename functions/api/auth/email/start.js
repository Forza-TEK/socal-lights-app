// POST /api/auth/email/start { email } — emails a 6-digit sign-in code (valid 10 minutes).
import { json, err, verifyTurnstile } from "../../../_lib/util.js";
import { normEmail, okEmail, isDisposable, sha256, sendMail, sameOrigin, isSuspended, SUSPENDED_MSG } from "../../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const b = await request.json().catch(() => null);
  if (!b || !okEmail(b.email)) return err(400, "Enter a valid email address.");
  if (isDisposable(b.email)) return err(400, "Throwaway email addresses can't be used here. Use your own email, or continue with Google.");
  if (!(await verifyTurnstile(env, b["cf-turnstile-response"], ip))) return err(400, "Please complete the 'I am human' check and try again.");
  if (!env.RESEND_API_KEY && env.DEV_AUTH !== "1") return err(503, "Email sign-in isn't switched on yet. Use Google for now.");

  const email = normEmail(b.email);
  if (await isSuspended(env, email)) return err(403, SUSPENDED_MSG);
  const { n: perEmail } = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_codes WHERE email = ? AND created_at > datetime('now','-1 hour')").bind(email).first();
  const { n: perIp } = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_codes WHERE ip = ? AND created_at > datetime('now','-1 hour')").bind(ip).first();
  if (perEmail >= 4 || perIp >= 12) return err(429, "Too many codes requested. Try again in an hour.");

  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
  const exp = new Date(Date.now() + 10 * 60_000).toISOString().slice(0, 19).replace("T", " ");
  await env.DB.batch([
    env.DB.prepare("INSERT INTO login_codes (email,code_hash,ip,expires_at) VALUES (?,?,?,?)").bind(email, await sha256(`${email}:${code}`), ip, exp),
    env.DB.prepare("DELETE FROM login_codes WHERE expires_at < datetime('now','-1 day')"),
  ]);
  // Local development only (DEV_AUTH=1 in .dev.vars, localhost): hand the code back instead of emailing it.
  if (env.DEV_AUTH === "1" && new URL(request.url).hostname === "localhost" && !env.RESEND_API_KEY) return json({ ok: true, devCode: code });
  const sent = await sendMail(env, { to: String(b.email).trim(), subject: `Your SoCal Lights code: ${code}`, text: `Your SoCal Lights sign-in code is ${code}.\n\nIt works for 10 minutes. If you didn't ask for it, you can ignore this email.` });
  if (!sent) return err(502, "We couldn't send the email. Please try again in a moment.");
  return json({ ok: true });
}
