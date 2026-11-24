// POST /api/archive-ended — the weekly job (Cloudflare cron Worker, workers/mail-cron; no GitHub workflow) that marks events which ended more than 60 days ago as archived (audit F-25).
// Key-protected (x-alert-key = ALERT_CRON_KEY). ?dry=1 only counts what is due. Safe to run twice. Never deletes a row (functions/_lib/endedcleanup.js).
import { json, err, sameKey } from "../_lib/util.js";
import { archiveEnded } from "../_lib/endedcleanup.js";
import { logOp } from "../_lib/oplog.js";

export async function onRequestPost({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || !sameKey(key, env.ALERT_CRON_KEY)) return err(401, "Not allowed.");
  const dryRun = new URL(request.url).searchParams.get("dry") === "1";
  try {
    const r = await archiveEnded(env, { dryRun });
    return json({ ok: true, ...r }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    await logOp(env, "archive-ended", String(e && e.message));
    return err(500, "Could not archive ended events.");
  }
}
