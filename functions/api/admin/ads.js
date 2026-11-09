// Admin > Ads (behind requireAdmin through functions/api/admin/_middleware.js). READ-ONLY: ad copy and status change only by migration; Grok's numbers arrive through /api/ads/report.
// GET /api/admin/ads -> { configured, totals, campaigns, ads: [{ ...item, report, landings }], warnings, last_report_at, log: [recent reports] }
import { json } from "../../_lib/util.js";
import { loadAds, loadManifest, fileOut, RULES, computeWarnings, summarize, refOf } from "../../_lib/ads.js";

export async function onRequestGet({ env, request }) {
  const all = await loadAds(env), s = summarize(all), rep = new Map(all.reports.map((r) => [r.ad_id, r]));
  const refs = all.items.filter((i) => i.status === "approved").map((i) => refOf(i.landing_url)).filter((r) => /^[a-z0-9-]{1,20}$/.test(r));
  const since = all.campaigns.reduce((m, c) => (c.starts < m ? c.starts : m), "2026-11-12"), land = {};
  if (refs.length) {
    try {
      const rows = (await env.DB.prepare(`SELECT page, SUM(n) AS n FROM site_hits WHERE day >= ? AND page IN (${refs.map(() => "?").join(",")}) GROUP BY page`).bind(since, ...refs.map((r) => "ref:" + r)).all()).results;
      for (const r of rows) land[r.page.slice(4)] = r.n;
    } catch {}
  }
  const log = (await env.DB.prepare("SELECT ad_id, status, spend_cents, impressions, clicks, as_of, received_at FROM ads_report_log ORDER BY id DESC LIMIT 30").all()).results;
  const last = all.reports.reduce((m, r) => (r.received_at > m ? r.received_at : m), "");
  const files = await loadManifest(env, request), origin = new URL(request.url).origin, approved = all.items.filter((i) => i.status === "approved");
  const creative = {
    files: files.map((f) => ({ ...fileOut(f, origin), ad_ids: all.items.filter((i) => i.asset_id === f.asset_id).map((i) => i.id) })),
    missing: approved.filter((i) => i.asset_id && !files.some((f) => f.asset_id === i.asset_id)).map((i) => ({ ad_id: i.id, asset_id: i.asset_id })),
    no_asset: approved.filter((i) => !i.asset_id).map((i) => i.id),
  };
  return json({
    creative,
    rules: RULES,
    configured: !!(env.ADS_API_KEY && String(env.ADS_API_KEY).length >= 16),
    last_report_at: last || null,
    totals: s.totals,
    campaigns: s.campaigns,
    ads: all.items.map((i) => ({ id: i.id, audience: i.audience, concept: i.concept, headline: i.headline, primary_text: i.primary_text, description: i.description, cta: i.cta, landing_url: i.landing_url, asset_id: i.asset_id, budget_cents: (all.campaigns.find((c) => c.audience === i.audience) || {}).budget_cents || 0, status: i.status, wave: i.wave, starts: i.starts, ends: i.ends, ref: refOf(i.landing_url), landings: land[refOf(i.landing_url)] || 0, report: rep.get(i.id) || null })),
    warnings: computeWarnings(all),
    log,
  }, { headers: { "cache-control": "no-store" } });
}
