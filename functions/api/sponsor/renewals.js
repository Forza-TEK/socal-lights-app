// POST /api/sponsor/renewals — the daily job for optional automatic renewal of installer Sponsor placements: reminders 7 days before, charges on the last day of the
// running placement, the one retry after 3 days, lapsing after that. Called by .github/workflows/sponsor-renewals.yml with the shared key (the same ALERT_CRON_KEY secret as the
// weekly email). Safe to run more than once a day: a reminder is sent once per renewal, and a charge uses an idempotency key per installer + season.
import { json, err } from "../../_lib/util.js";
import { processRenewals } from "../../_lib/renewal.js";
import { applyPaid } from "../stripe-webhook.js";

export async function onRequestPost({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || key !== env.ALERT_CRON_KEY) return err(401, "Not allowed.");
  if (!env.STRIPE_SECRET_KEY) return json({ ok: false, note: "STRIPE_SECRET_KEY is not set: nothing was charged." });
  const r = await processRenewals(env, { apply: applyPaid });
  return json({ ok: true, ...r }, { headers: { "cache-control": "no-store" } });
}
