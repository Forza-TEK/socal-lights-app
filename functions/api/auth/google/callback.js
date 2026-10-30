// GET /api/auth/google/callback — Google sends the person back here; we sign them in and return them to the page they came from.
import { readCookie, setCookie, safeNext, upsertUser, startSession } from "../../../_lib/auth.js";

const back = (request, path, cookies, msg) => {
  const h = new Headers({ location: path + (msg ? (path.includes("?") ? "&" : "?") + "signin=" + msg : "") });
  for (const c of cookies) h.append("set-cookie", c);
  return new Response(null, { status: 302, headers: h });
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const [state, nextRaw] = readCookie(request, "scl_oauth").split("|");
  const next = safeNext(nextRaw), clear = setCookie(request, "scl_oauth", "", 0);
  if (url.searchParams.get("error") || !state || state !== url.searchParams.get("state") || !url.searchParams.get("code")) return back(request, next, [clear], "cancelled");
  try {
    const t = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: url.searchParams.get("code"), client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: `${url.origin}/api/auth/google/callback`, grant_type: "authorization_code" }),
    }).then((r) => r.json());
    if (!t.access_token) return back(request, next, [clear], "failed");
    const p = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${t.access_token}` } }).then((r) => r.json());
    if (!p.sub || !p.email || p.email_verified !== true) return back(request, next, [clear], "failed");
    const user = await upsertUser(env, p.email, p.name || "", p.sub);
    return back(request, next, [clear, await startSession(env, request, user.id)]);
  } catch {
    return back(request, next, [clear], "failed");
  }
}
