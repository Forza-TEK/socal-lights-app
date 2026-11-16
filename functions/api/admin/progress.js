// Admin > Progress (behind requireAdmin through functions/api/admin/_middleware.js). GET: live numbers counted now, the half-hour history, and the two hand-kept lists.
// Opening it also records this half hour's row, so the trend lines move even if the cron has not run yet.
import { json } from "../../_lib/util.js";
import { collectProgress, logProgress, loadHistory } from "../../_lib/progress.js";
import { REDESIGN, SHIPPED } from "../../_lib/progress-data.js";

export async function onRequestGet({ env }) {
  const p = await collectProgress(env);
  try { await logProgress(env, p); } catch {}
  return json({ at: new Date().toISOString(), ...p, history: await loadHistory(env), redesign: REDESIGN.map(([area, status, finished]) => ({ area, status, finished })), shipped: SHIPPED.map(([date, text]) => ({ date, text })) }, { headers: { "cache-control": "no-store" } });
}
