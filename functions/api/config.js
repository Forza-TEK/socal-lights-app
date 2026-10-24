// GET /api/config — public settings the browser needs (no secrets here).
import { json } from "../_lib/util.js";

export async function onRequestGet({ env }) {
  return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || "" }, { headers: { "cache-control": "public, max-age=300" } });
}
