// GET /api/auth/me — who is signed in, and which sign-in methods this site has switched on.
import { json } from "../../_lib/util.js";
import { getUser } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  // The picture columns arrive with migration 0113; until it has run the lookup fails quietly and there is simply no picture.
  let avatar = "";
  if (user) try { const r = await env.DB.prepare("SELECT avatar, picture FROM users WHERE id = ?").bind(user.id).first(); avatar = r && r.avatar ? `/api/me/avatar?v=${r.avatar.split("-").pop()}` : r && r.picture ? r.picture : ""; } catch {}
  // Name and address (optional, migration 0115) the same quiet way
  let profile = { street: "", city: "", zip: "" };
  if (user) try { const r = await env.DB.prepare("SELECT street, city, zip FROM users WHERE id = ?").bind(user.id).first(); if (r) profile = { street: r.street || "", city: r.city || "", zip: r.zip || "" }; } catch {}
  return json({
    user: user ? { id: user.id, email: user.email, name: user.name, avatar, ...profile } : null,
    methods: { google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), email: !!(env.RESEND_API_KEY || env.DEV_AUTH === "1") },
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || "",
  }, { headers: { "cache-control": "no-store" } });
}
