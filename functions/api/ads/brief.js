// GET /api/ads/brief: the approved ads (launch set only), the campaigns with budgets and dates, the rules, and the creative file URLs. Read-only; copy changes only by migration.
import { adsGuard, reply, loadAds, loadManifest, fileOut, refOf, summarize, RULES, COUNTIES, TOTAL_BUDGET_CENTS, LOADED_BUDGET_CENTS, RESERVE_CENTS, HARD_END } from "../../_lib/ads.js";

export async function onRequest({ request, env }) {
  const g = await adsGuard(request, env, "GET");
  if (g.res) return g.res;
  const all = await loadAds(env), files = await loadManifest(env, request), origin = new URL(request.url).origin;
  const approved = all.items.filter((i) => i.status === "approved");
  const { campaigns } = summarize({ ...all, reports: [] });
  return reply(200, {
    ok: true,
    generated_at: new Date().toISOString(),
    platform: "meta (Facebook and Instagram) only",
    budget: { total_cents: TOTAL_BUDGET_CENTS, loaded_cents: LOADED_BUDGET_CENTS, reserve_cents: RESERVE_CENTS, meta_account_limit_cents: LOADED_BUDGET_CENTS, all_ads_end: HARD_END, timezone: "America/Los_Angeles" },
    targeting: { type: "county only", counties: COUNTIES },
    placements: "Facebook feed, Instagram feed, Instagram Stories and Reels (Advantage+ placements is fine)",
    rules: RULES,
    campaigns: campaigns.map((c) => ({ audience: c.audience, name: c.name, budget_cents: c.budget_cents, starts: c.starts, ends: c.ends, wave: c.wave, daily_hint_cents: (all.campaigns.find((x) => x.audience === c.audience) || {}).daily_hint_cents, budget_type: "lifetime budget with end date; the daily figure is only for checking pace", ad_ids: c.ads })),
    ads: approved.map((i) => ({
      ad_id: i.id, campaign: i.audience, wave: i.wave, concept: i.concept, headline: i.headline, primary_text: i.primary_text, description: i.description, cta: i.cta, landing_url: i.landing_url, ref: refOf(i.landing_url),
      visual: i.visual, asset_id: i.asset_id, assets: files.filter((f) => f.asset_id === i.asset_id).map((f) => fileOut(f, origin)), starts: i.starts, ends: i.ends,
    })),
  });
}
