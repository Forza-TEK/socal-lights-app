// GET /api/config — public settings the browser needs (no secrets here).
import { json } from "../_lib/util.js";
import { PUBLIC_PLANS, PUBLIC_INSTALLER_PLANS, FULL_PRICE_DAYS, installerUpgradeMin, OPEN_DAYS, ptToday } from "../_lib/featured.js";
import { sponsorWindow } from "../_lib/sponsor.js";

export async function onRequestGet({ env }) {
  return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || "", featureCheckout: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET), featurePlans: PUBLIC_PLANS, featureOpenDays: OPEN_DAYS, installerPlans: PUBLIC_INSTALLER_PLANS, installerFullPriceDays: FULL_PRICE_DAYS, installerUpgradeMinCents: installerUpgradeMin(), installerSeason: (() => { const t = ptToday(), b = sponsorWindow("banner", {}, t), bt = sponsorWindow("banner_top", {}, t); return { from: b.from, to: b.to, season: b.season, daysLeft: b.days_left, dayOfSeason: b.day_of_season, seasonDays: b.season_days, percentOver: b.percent_over, prorated: b.prorated, label: b.label, cents: { banner: b.cents, banner_top: bt.cents } }; })() }, { headers: { "cache-control": "public, max-age=300" } });
}
