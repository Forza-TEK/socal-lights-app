// The signed 30-minute chat cookie: proof that this browser passed the "I am human" check, with no identity in it. Shared by /api/chat and /api/chat/act.
import { readCookie } from "./auth.js";

export const COOKIE = "scl_chat", TTL = 1800;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sign(env, msg) {
  const secret = env.CHAT_SESSION_SECRET || env.THROTTLE_SALT || env.TURNSTILE_SECRET || "scl-chat";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("chat|" + msg))).slice(0, 40);
}
export const mint = async (env) => { const exp = Math.floor(Date.now() / 1000) + TTL; return `${exp}.${await sign(env, String(exp))}`; };
export async function validSession(env, request) {
  const v = readCookie(request, COOKIE), [exp, sig] = v.split(".");
  if (!exp || !sig || !/^\d{9,12}$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  return (await sign(env, exp)) === sig;
}
export const cookieHeader = (request, value) => `${COOKIE}=${value}; Path=/api/chat; HttpOnly; SameSite=Lax; Max-Age=${TTL}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
