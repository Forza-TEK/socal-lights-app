// GET /api/auth/me — who is signed in, and which sign-in methods this site has switched on.
import { json } from "../../_lib/util.js";
import { getUser } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  return json({
    user: user ? { id: user.id, email: user.email, name: user.name } : null,
    methods: { google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), email: !!(env.RESEND_API_KEY || env.DEV_AUTH === "1") },
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || "",
  }, { headers: { "cache-control": "no-store" } });
}
