// Accounts: one account per verified email. People sign in with Google or an emailed one-time code; both prove
// the same email, so both land on the same account. Sessions are a random cookie token (only its hash is stored).
import { json, err, newId } from "./util.js";

export const COOKIE = "scl_session";
const SESSION_DAYS = 30;

// Same person, however they spell the address: lowercase, no +tag, and no dots for Gmail.
export function normEmail(e) {
  let [u, d] = String(e || "").trim().toLowerCase().split("@");
  if (!u || !d) return "";
  u = u.split("+")[0];
  if (d === "gmail.com" || d === "googlemail.com") { u = u.replace(/\./g, ""); d = "gmail.com"; }
  return `${u}@${d}`;
}
// Throwaway-mail services. Voting accounts need a real, lasting inbox, so these can't sign in with an emailed code.
const DISPOSABLE = new Set(["mailinator.com", "guerrillamail.com", "guerrillamail.net", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com", "trashmail.com", "throwawaymail.com", "sharklasers.com", "getnada.com", "maildrop.cc", "dispostable.com", "fakeinbox.com", "mailnesia.com", "mintemail.com", "tempr.email", "emailondeck.com"]);
export const isDisposable = (e) => DISPOSABLE.has(String(e || "").trim().toLowerCase().split("@")[1] || "");
export const okEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim()) && String(e).length <= 120;

export async function sha256(s) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const token = () => { const b = crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };

export const readCookie = (request, name) => {
  const m = (request.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : "";
};
const secure = (request) => new URL(request.url).protocol === "https:";
export const setCookie = (request, name, value, maxAge) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure(request) ? "; Secure" : ""}`;

// Rejects cross-site form posts (the cookie is SameSite=Lax too, this is a second lock).
export function sameOrigin(request) {
  const o = request.headers.get("origin");
  return !o || o === new URL(request.url).origin;
}

export async function startSession(env, request, userId) {
  const t = token();
  const exp = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString().slice(0, 19).replace("T", " ");
  await env.DB.batch([
    env.DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(await sha256(t), userId, exp),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')"),
  ]);
  return setCookie(request, COOKIE, t, SESSION_DAYS * 86400);
}

// The signed-in person for this request, or null.
export async function getUser(request, env) {
  const t = readCookie(request, COOKIE);
  if (!t) return null;
  const u = await env.DB.prepare("SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > datetime('now') AND u.status != 'suspended'").bind(await sha256(t)).first();
  return u || null;
}
export async function requireUser(request, env) {
  const u = await getUser(request, env);
  return u ? { user: u } : { res: err(401, "Please sign in first.") };
}

// Finds or creates the account for a verified email.
export async function upsertUser(env, email, name = "", googleSub = null) {
  const e = normEmail(email);
  let u = await env.DB.prepare("SELECT id,email,name,status FROM users WHERE email = ?").bind(e).first();
  if (!u) {
    const id = newId();
    await env.DB.prepare("INSERT INTO users (id,email,name,google_sub,last_login) VALUES (?,?,?,?,datetime('now'))").bind(id, e, name.slice(0, 80), googleSub).run();
    return { id, email: e, name };
  }
  await env.DB.prepare("UPDATE users SET last_login = datetime('now'), name = CASE WHEN name = '' THEN ? ELSE name END, google_sub = COALESCE(google_sub, ?) WHERE id = ?").bind(name.slice(0, 80), googleSub, u.id).run();
  return u;
}

export const SUSPENDED_MSG = "This account has been suspended. Email info@socallights.app if you think that's a mistake.";
export async function isSuspended(env, email) {
  const r = await env.DB.prepare("SELECT status FROM users WHERE email = ?").bind(normEmail(email)).first();
  return !!r && r.status === "suspended";
}

// Sends one email through Resend. Without RESEND_API_KEY it fails, unless local dev mode (DEV_AUTH=1) is on.
export async function sendMail(env, { to, subject, text }) {
  if (!env.RESEND_API_KEY) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.MAIL_FROM || "SoCal Lights <login@socallights.app>", to: [to], subject, text }),
  });
  return r.ok;
}

export const safeNext = (n) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") ? n : "/");
export { json, err };
