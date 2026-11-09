// GET /api/ads/status: what the site currently holds from Grok's reports, so Grok can see what it last reported. Counts and status words only.
import { adsGuard, reply, loadAds, computeWarnings, summarize } from "../../_lib/ads.js";

export async function onRequest({ request, env }) {
  const g = await adsGuard(request, env, "GET");
  if (g.res) return g.res;
  const all = await loadAds(env), s = summarize(all), rep = new Map(all.reports.map((r) => [r.ad_id, r]));
  const launch = all.items.filter((i) => i.status === "approved");
  const last = all.reports.reduce((m, r) => (r.received_at > m ? r.received_at : m), "");
  return reply(200, {
    ok: true,
    last_report_at: last || null,
    totals: s.totals,
    campaigns: s.campaigns,
    ads: launch.map((i) => ({ ad_id: i.id, campaign: i.audience, report: rep.get(i.id) || null })),
    other_reported: all.reports.filter((r) => !launch.some((i) => i.id === r.ad_id)),
    missing: launch.filter((i) => !rep.has(i.id)).map((i) => i.id),
    warnings: computeWarnings(all),
  });
}
