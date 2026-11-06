// GET /api/me/sponsor — the signed-in person's installer profiles, what each is missing before it can be sponsored, what is running now,
// and a quote for each plan today (exact dates and price). Only ever their own profiles; the checkout checks everything again.
import { json, err } from "../../_lib/util.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";
import { INSTALLER_PLANS, ptToday } from "../../_lib/featured.js";
import { sponsorWindow, sponsorProblem, profileGaps } from "../../_lib/sponsor.js";

export async function onRequestGet({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Bad origin.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const today = ptToday();
  const rows = (await env.DB.prepare("SELECT id, slug, name, web, phone, area, email, status, banner_until, top_until FROM installers WHERE owner_email = ? ORDER BY lower(name) LIMIT 20").bind(user.email).all()).results;
  const installers = [];
  for (const i of rows) {
    const gaps = profileGaps(i), quotes = {};
    for (const [k, p] of Object.entries(INSTALLER_PLANS)) {
      const problem = sponsorProblem(i, k, today), w = sponsorWindow(k, i, today);
      quotes[k] = { cents: w.cents, upgrade: w.upgrade, days: w.days, from: w.from, to: w.to, season: w.season, renewal: w.running, problem };
    }
    const banner = !!i.banner_until && i.banner_until >= today, top = !!i.top_until && i.top_until >= today;
    const stats = banner || top ? await env.DB.prepare("SELECT COALESCE(SUM(imp),0) AS imp, COALESCE(SUM(click + call),0) AS taps, COALESCE(SUM(lst_imp),0) AS lst_imp, COALESCE(SUM(lst_click + lst_call),0) AS lst_taps FROM banner_stats WHERE installer_id = ? AND day >= date('now','-29 days')").bind(i.id).first().catch(() => null) : null;
    installers.push({ slug: i.slug, name: i.name, web: i.web, phone: i.phone, area: i.area, status: i.status, blocking: gaps.blocking, advice: gaps.advice, placement: { banner_until: banner ? i.banner_until : "", top_until: top ? i.top_until : "" }, quotes, stats });
  }
  return json({ today, installers }, { headers: { "cache-control": "no-store" } });
}
