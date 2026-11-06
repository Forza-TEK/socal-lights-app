// POST /api/usage-check — called every 30 minutes by .github/workflows/usage-check.yml (and by the admin digest) with the shared key
// (the same ALERT_CRON_KEY as the digest). Answers { level, top, lines, ... } where level is the worst of ok / watch (70%) / warning (90%) / limit (100%).
// The workflow opens or updates the GitHub issue "Cloudflare free-plan limit reached or near" at warning or limit, and closes it on recovery.
// No key or a wrong key: 401. Read-only against Cloudflare; the result is the same cached copy Admin > Usage shows.
import { json, err } from "../_lib/util.js";
import { getUsage, usageLines } from "../_lib/cfusage.js";

export async function onRequest({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || key !== env.ALERT_CRON_KEY) return err(401, "Not allowed.");
  if (request.method !== "POST" && request.method !== "GET") return err(405, "Use POST.");
  const u = await getUsage(env);
  return json({
    level: u.level, connected: u.connected, error: u.error, top: u.top, lines: usageLines(u),
    over: u.metrics.filter((m) => m.level === "warning" || m.level === "limit").map((m) => ({ key: m.key, label: m.label, used: m.used, limit: m.limit, pct: m.pct, level: m.level })),
    limitHits: u.limitHits.length, lastLimitAt: u.limitHits[0] ? u.limitHits[0].at : null,
  }, { headers: { "cache-control": "no-store" } });
}
