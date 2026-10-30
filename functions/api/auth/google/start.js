// GET /api/auth/google/start?next=/path — sends the person to Google to sign in.
import { err } from "../../../_lib/util.js";
import { safeNext, setCookie } from "../../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return err(503, "Google sign-in isn't switched on yet.");
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const next = safeNext(url.searchParams.get("next"));
  const q = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: `${url.origin}/api/auth/google/callback`, response_type: "code", scope: "openid email profile", state, prompt: "select_account" });
  return new Response(null, { status: 302, headers: { location: `https://accounts.google.com/o/oauth2/v2/auth?${q}`, "set-cookie": setCookie(request, "scl_oauth", `${state}|${next}`, 600) } });
}
