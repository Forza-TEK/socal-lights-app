// POST /api/stripe-reconcile — daily Stripe-vs-database check (functions/_lib/reconcile.js), called by .github/workflows/stripe-reconcile.yml with the shared key
// (ALERT_CRON_KEY, 401 otherwise). Read-only against Stripe. One call reads one page of each list; the workflow calls again until { done: true }.
// Findings go to ops_log (kind 'reconcile') and into the admin digest. Answers counts and finding kinds, never card or customer data.
import { json, err } from "../_lib/util.js";
import { reconcileStep } from "../_lib/reconcile.js";

export async function onRequestPost({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || key !== env.ALERT_CRON_KEY) return err(401, "Not allowed.");
  const r = await reconcileStep(env);
  return json({ done: !!r.done, status: r.status || (r.error ? "error" : "working"), error: r.error, checked: r.checked || 0, found: r.findings ? r.findings.length : r.found || 0, kinds: (r.findings || []).map((f) => f.kind) }, { headers: { "cache-control": "no-store" } });
}
