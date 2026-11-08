// POST /api/mail/drain — sends what is waiting in the mail outbox (contest results, voting reminders). Called hourly by .github/workflows/mail-outbox.yml with the shared key
// (the same ALERT_CRON_KEY as the weekly email). One call sends up to 40 messages (about 6 outgoing calls: claim, settings, prefs, one Resend batch, result write; and about 4 ms of CPU,
// the free plan allows 10 ms per request); the workflow calls again while `remaining` > 0 and `progress` is true.
import { json, err } from "../../_lib/util.js";
import { drainMail, pruneOutbox, outboxRemaining, DRAIN_CHUNK } from "../../_lib/mailbatch.js";

const CHUNKS = 1;

export async function onRequestPost({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || key !== env.ALERT_CRON_KEY) return err(401, "Not allowed.");
  const total = { claimed: 0, sent: 0, skipped: 0, retrying: 0, failed: 0, paused: false };
  for (let i = 0; i < CHUNKS; i++) {
    const r = await drainMail(env);
    for (const k of ["claimed", "sent", "skipped", "retrying", "failed"]) total[k] += r[k];
    total.paused = total.paused || r.paused;
    if (r.claimed < DRAIN_CHUNK || r.paused) break;
  }
  await pruneOutbox(env);
  return json({ ...total, remaining: await outboxRemaining(env), progress: total.sent + total.skipped + total.failed > 0 });
}
