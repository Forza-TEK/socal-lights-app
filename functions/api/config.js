// GET /api/config — public settings the browser needs (no secrets here).
import { json } from "../_lib/util.js";
import { PUBLIC_PLANS, PUBLIC_EVENT_PLANS, PUBLIC_COMPONENT_CENTS, PUBLIC_INSTALLER_PLANS, OPEN_DAYS, ptToday } from "../_lib/featured.js";
import { sponsorWindow } from "../_lib/sponsor.js";
import { PUBLIC_CONTEST_PASSES } from "../_lib/passes.js";
import { CONSENT_TEXTS, CONSENT_VERSION } from "../_lib/renewal.js";
import { readSettings, isLive } from "../_lib/chatsettings.js";

// "Most popular" event plan: only when real paid orders back it (at least 5 in the last 120 days and a clear leader). Otherwise empty and no marker is shown.
async function popularEventPlan(env) {
  try {
    const { results } = await env.DB.prepare("SELECT plan, COUNT(*) AS n FROM feature_orders WHERE plan IN ('ev_pin','ev_banner','ev_top','ev_all') AND status = 'paid' AND created_at >= datetime('now','-120 days') GROUP BY plan ORDER BY n DESC").all();
    const total = results.reduce((a, r) => a + r.n, 0);
    return total >= 5 && results[0].n > (results[1] ? results[1].n : 0) ? results[0].plan : "";
  } catch { return ""; }
}

export async function onRequestGet({ env }) {
  const popularEvent = await popularEventPlan(env);
  const chatEnabled = isLive(await readSettings(env), env); // the AI assistant widget loads only when this is true (off by default; Admin > AI assistant)
  return json({ popularEvent, chatEnabled, turnstileSiteKey: env.TURNSTILE_SITE_KEY || "", featureCheckout: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET), featurePlans: PUBLIC_PLANS /* homes only: pin and top, 30 days */, eventPlans: PUBLIC_EVENT_PLANS, eventComponentCents: PUBLIC_COMPONENT_CENTS, featureOpenDays: OPEN_DAYS, installerPlans: PUBLIC_INSTALLER_PLANS, contestPasses: PUBLIC_CONTEST_PASSES, installerRenewal: { version: CONSENT_VERSION, text: CONSENT_TEXTS[CONSENT_VERSION] }, // {price} is filled in by the page from installerPlans
     installerSeason: (() => { const b = sponsorWindow("banner", {}, ptToday()); return { from: b.from, to: b.to, season: b.season, days: b.days }; })() }, { headers: { "cache-control": "public, max-age=300" } });
}
