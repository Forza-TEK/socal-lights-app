// GET /api/config — public settings the browser needs (no secrets here).
import { json } from "../_lib/util.js";
import { PUBLIC_PLANS, PUBLIC_INSTALLER_PLANS, OPEN_DAYS, ptToday } from "../_lib/featured.js";
import { sponsorWindow } from "../_lib/sponsor.js";

export async function onRequestGet({ env }) {
  return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || "", featureCheckout: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET), featurePlans: PUBLIC_PLANS, featureOpenDays: OPEN_DAYS, installerPlans: PUBLIC_INSTALLER_PLANS, installerSeason: (() => { const b = sponsorWindow("banner", {}, ptToday()); return { from: b.from, to: b.to, season: b.season, days: b.days }; })() }, { headers: { "cache-control": "public, max-age=300" } });
}
