// GET /api/admin/usage — Admin > Usage: Cloudflare and Resend usage against the plan (CLOUDFLARE_PLAN: Workers Paid by default, or free): this billing month against the included amounts plus an estimated overage on Workers Paid, today's (UTC) usage against the daily limits on free, a 7-day trend per metric,
// and the quota errors the site logged itself. Read-only; admin only (functions/api/admin/_middleware.js). Cached five minutes in D1;
// ?refresh=1 skips the cache (the panel's Refresh button). Needs the Pages secrets CF_ANALYTICS_TOKEN and CF_ACCOUNT_ID, else "not connected".
import { json } from "../../_lib/util.js";
import { getUsage } from "../../_lib/cfusage.js";

export async function onRequestGet({ request, env }) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  return json(await getUsage(env, { force }), { headers: { "cache-control": "no-store" } });
}
