// POST /api/placement-notices — the daily job (Cloudflare cron Worker, workers/mail-cron; no GitHub workflow) that emails buyers of a paid
// Featured event or home 3 days before the placement ends and when it has ended. Key-protected (x-alert-key = ALERT_CRON_KEY). Safe to run twice: each notice is sent once per order.
import { json, err, sameKey } from "../_lib/util.js";
import { sweepPlacementNotices } from "../_lib/placementmail.js";

export async function onRequestPost({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || !sameKey(key, env.ALERT_CRON_KEY)) return err(401, "Not allowed.");
  const r = await sweepPlacementNotices(env);
  return json({ ok: true, ...r }, { headers: { "cache-control": "no-store" } });
}
