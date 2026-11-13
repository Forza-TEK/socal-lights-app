// "Act as the owner": an Admin can do anything a signed-in person can do, on that person's behalf, through /api/admin/as/... (functions/api/admin/as/[[path]].js).
// The Admin route (behind the Cloudflare Access login) signs a short-lived header naming the person; getUser() in auth.js accepts the header ONLY when its signature is valid,
// so the public user routes (/api/me/..., /api/contests/..., /api/installers/...) run exactly as they do for that person: same checks, same limits, same emails and logs.
// A header sent by anyone else carries no valid signature and is ignored. Without a secret (ADMIN_AS_SECRET, or THROTTLE_SALT) the whole feature is off.
const HEADER = "x-admin-act-as", TTL_S = 300;
export { HEADER as ACT_AS_HEADER };
const enc = new TextEncoder();
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s) => { const t = String(s).replace(/-/g, "+").replace(/_/g, "/"); return atob(t + "=".repeat((4 - (t.length % 4)) % 4)); };
export const actAsSecret = (env) => String((env && (env.ADMIN_AS_SECRET || env.THROTTLE_SALT)) || "");
async function mac(env, text) {
  const key = await crypto.subtle.importKey("raw", enc.encode("act-as|" + actAsSecret(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}
// who: { id, email, admin } -> "<payload>.<signature>"; null when the feature is off.
export async function signActAs(env, { id = "", email = "", admin = "" }, now = Date.now()) {
  if (!actAsSecret(env)) return null;
  const payload = b64(enc.encode(JSON.stringify({ i: String(id), e: String(email).toLowerCase(), a: String(admin), x: Math.floor(now / 1000) + TTL_S })));
  return `${payload}.${await mac(env, payload)}`;
}
// The person a valid header names, or null. { id, email, name, adminActing: <admin's email> }
export async function readActAs(request, env, now = Date.now()) {
  const h = request.headers.get(HEADER);
  if (!h || !actAsSecret(env)) return null;
  const [payload, sig] = h.split(".");
  if (!payload || !sig || (await mac(env, payload)) !== sig) return null;
  let p; try { p = JSON.parse(unb64(payload)); } catch { return null; }
  if (!p || typeof p.x !== "number" || p.x < Math.floor(now / 1000)) return null;
  let u = null;
  if (p.i) u = await env.DB.prepare("SELECT id, email, name FROM users WHERE id = ?").bind(p.i).first();
  else if (p.e) u = await env.DB.prepare("SELECT id, email, name FROM users WHERE lower(email) = ?").bind(p.e).first();
  if (!u && p.e) u = { id: "", email: p.e, name: "" }; // listings added with an email that never signed in: the owner checks match on the email
  return u ? { ...u, adminActing: String(p.a || "admin") } : null;
}
