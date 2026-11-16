// POST /api/progress-log — called every 30 minutes by the cron Worker (workers/mail-cron) with the shared key; writes one row of Admin > Progress's history.
// No key or a wrong key: 401. Answers { ok, at, upcoming }.
import { json, err } from "../_lib/util.js";
import { collectProgress, logProgress } from "../_lib/progress.js";

export async function onRequest({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || key !== env.ALERT_CRON_KEY) return err(401, "Not allowed.");
  if (request.method !== "POST") return err(405, "Use POST.");
  const p = await collectProgress(env), at = await logProgress(env, p);
  return json({ ok: true, at, upcoming: p.upcoming }, { headers: { "cache-control": "no-store" } });
}
