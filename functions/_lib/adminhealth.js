// "Errors, last 7 days" and "last run of each job" for the Admin dashboard. Reads only what the site already stores; says plainly what it does not store.
//  errors: ops_log (failed emails, Stripe webhook problems, limits hit, renewal, ads and outreach problems...), emails that failed for good in mail_outbox,
//          and scheduled jobs whose last run FAILED. NOT available: 5xx responses and browser errors (nothing in this site stores them; Cloudflare dashboard > Workers & Pages > Metrics shows 5xx).
//  jobs:   the heartbeat of every scheduled GitHub workflow that reports in (job_heartbeats) plus the last time the live database applied a migration
//          (d1_migrations: the "[SCL]" Claude routines publish event changes as migrations, so this is the closest trace they leave; they have no heartbeat of their own).
import { sqlAgo } from "./revenue.js";
import { INFO_LOG_SQL } from "./oplog.js";

export const OP_LABEL = { mail: "Email send errors", email: "Email send errors", webhook: "Stripe webhook problems", "usage-alert": "Cloudflare usage alerts sent", "deploy-stalled": "Deploy stalled alerts sent", limit: "Cloudflare or email limits hit", renewal: "Automatic renewal problems", reconcile: "Stripe reconcile differences", ads: "Ad reporting problems", outreach: "Outreach problems", posts: "Home posting problems", contest: "Contest problems", account: "Account problems", badges: "Badge problems", removal: "Home removal problems", "sponsor-pay-link": "Sponsor payment link problems" };

const ACTIVITY_LABEL = { outreach: "Outreach calls that worked", ads: "Ad reports received", "sponsor-pay-link": "Sponsor payment links set (for abuse review)" };

export async function errorsLast7(env, jobs = [], now = Date.now()) {
  const since = sqlAgo(now - 7 * 86400000);
  let groups = [], activity = [], mailFailed = 0, opsError = "";
  try { groups = (await env.DB.prepare("SELECT kind, COUNT(*) AS n, MAX(created_at) AS last, MAX(detail) AS example FROM ops_log WHERE created_at > ? AND NOT " + INFO_LOG_SQL + " GROUP BY kind ORDER BY n DESC").bind(since).all()).results; } catch (e) { opsError = "The error log could not be read."; }
  // normal activity that is logged but is not a failure (outreach and ad reports that worked, sponsor payment-link notes): shown apart, never counted as errors
  try { activity = (await env.DB.prepare("SELECT kind, COUNT(*) AS n, MAX(created_at) AS last FROM ops_log WHERE created_at > ? AND " + INFO_LOG_SQL + " GROUP BY kind ORDER BY n DESC").bind(since).all()).results.map((g) => ({ kind: g.kind, label: ACTIVITY_LABEL[g.kind] || g.kind, n: g.n, last: g.last })); } catch {}
  try { mailFailed = ((await env.DB.prepare("SELECT COUNT(*) AS n FROM mail_outbox WHERE status = 'failed' AND created_at > ?").bind(since).first()) || {}).n || 0; } catch {}
  const failedJobs = jobs.filter((j) => j.failed).map((j) => ({ job: j.job, label: j.label, last: j.last }));
  const list = groups.map((g) => ({ kind: g.kind, label: OP_LABEL[g.kind] || g.kind, n: g.n, last: g.last, example: String(g.example || "").slice(0, 120) }));
  const total = list.reduce((t, g) => t + g.n, 0) + mailFailed + failedJobs.length;
  return { total, groups: list, activity, mailFailed, failedJobs, ...(opsError ? { error: opsError } : {}), notStored: ["Server errors (5xx) and browser errors are not stored by this site. Cloudflare dashboard > Workers & Pages > socal-lights > Metrics shows server errors."] };
}

// What the dashboard shows for "last run of each routine and workflow".
export async function lastRuns(env, jobs = []) {
  let migration = null;
  try { const r = await env.DB.prepare("SELECT name, applied_at FROM d1_migrations ORDER BY id DESC LIMIT 1").first(); if (r) migration = { name: r.name, at: r.applied_at }; } catch {}
  return {
    workflows: jobs.map((j) => ({ job: j.job, label: j.label, every: j.every, last: j.last, status: j.status, problem: j.problem, stale: j.stale, failed: j.failed })),
    migration,
    notRecorded: ["Claude routines ([SCL] sweeps, weekly and midweek upkeep, photo refresh, browser pass) have no heartbeat: the newest applied migration below is their trace. A routine that finds nothing leaves none.", "Workflows without a heartbeat (Apply database migrations, Tests) are not listed: see GitHub > Actions."],
  };
}
