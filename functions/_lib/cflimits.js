// The ONE place for the plan limits the Admin > Usage panel, the admin digest and the limit check compare against.
// Two Cloudflare plans are modelled (CLOUDFLARE_PLAN env, default "paid" since the owner upgraded to Workers Paid on ~2026-11-08; set "free" to go back):
//   free: daily D1 and request limits are HARD STOPS (the site breaks until 00:00 UTC). Verified 2026-11-06.
//   paid: Workers Paid, $5/month. Allowances are MONTHLY and are NOT stops: usage beyond them is billed per unit. Verified 2026-11-08.
// Sources (fetched 2026-11-08 as markdown from developers.cloudflare.com; every number below was read on those pages unless marked `verified: false`):
//   D1 pricing    https://developers.cloudflare.com/d1/platform/pricing/            Paid: 25 billion rows read/month then $0.001 per million; 50 million rows written/month then $1.00 per million;
//                                                                                  5 GB storage then $0.75 per GB-month. Free: 5 million reads/day, 100,000 writes/day, 5 GB total.
//   Workers/Pages https://developers.cloudflare.com/workers/platform/pricing/        Paid: $5/month minimum; 10 million requests/month then $0.30 per million; 30 million CPU ms/month then $0.02 per million ms.
//                 https://developers.cloudflare.com/workers/platform/limits/         Free: 100,000 requests/day (shared by Workers and Pages Functions), 10 ms CPU per request. Paid: 30 s default CPU per request, up to 5 min.
//   R2 pricing    https://developers.cloudflare.com/r2/pricing/                      Same on every plan: free 10 GB-month, 1 million Class A, 10 million Class B per month; then $0.015/GB-month, $4.50 and $0.36 per million.
//   Resend        https://resend.com/docs/knowledge-base/account-quotas-and-limits  Free: 100 emails a day, 3,000 a month (verified 2026-11-06). Resend stays on its free plan (RESEND_PLAN) until changed.
// NOT verified against the dashboard: the account's billing-cycle day (CLOUDFLARE_BILLING_DAY, default 1) and whether the Analytics API counts match the invoice
// exactly (Cloudflare bills from its own metering; this panel is an estimate). Free-plan daily limits reset at 00:00 UTC (D1 pricing note 8).
// Not modelled: the 30 million CPU-ms/month Workers allowance ($0.02 per extra million ms), Workers Logs, KV, Queues; they are not in the Analytics query.
// If Cloudflare changes a number, change it here only.

export const THRESHOLDS = { watch: 70, warning: 90, limit: 100 }; // percent of the included amount / limit

export const RESEND_PLAN = "free"; // Resend Free: 100 emails a day, 3,000 a month (sent AND received count). Pro is $20 a month with no daily limit.
export const PLAN_LABELS = { free: "Cloudflare Free", paid: "Workers Paid" };
export const PAID_BASE_USD = 5; // Workers Paid minimum charge per month (workers/platform/pricing)
export const PRICING_VERIFIED = "2026-11-08";

export const planOf = (env) => (String((env && env.CLOUDFLARE_PLAN) || "paid").trim().toLowerCase() === "free" ? "free" : "paid");
// Day of the month the Cloudflare billing cycle starts (1 to 28). Not verifiable from here: the owner sets CLOUDFLARE_BILLING_DAY after checking Billing.
export const billingDayOf = (env) => { const n = parseInt(env && env.CLOUDFLARE_BILLING_DAY, 10); return n >= 1 && n <= 28 ? n : 1; };
// First UTC day (YYYY-MM-DD) of the billing month that contains `day`
export function periodStartFor(day, billingDay = 1) {
  const y = +day.slice(0, 4), m = +day.slice(5, 7), d = +day.slice(8, 10);
  const pad = String(billingDay).padStart(2, "0");
  if (d >= billingDay) return `${day.slice(0, 7)}-${pad}`;
  return `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}-${pad}`;
}

const CF_D1 = "https://developers.cloudflare.com/d1/platform/pricing/";
const CF_D1_LIMITS = "https://developers.cloudflare.com/d1/platform/limits/";
const CF_WORKERS = "https://developers.cloudflare.com/workers/platform/limits/#daily-requests";
const CF_WORKERS_PRICING = "https://developers.cloudflare.com/workers/platform/pricing/";
const CF_R2 = "https://developers.cloudflare.com/r2/pricing/#free-tier";
const RESEND_QUOTA = "https://resend.com/docs/knowledge-base/account-quotas-and-limits";

export const GB = 1e9; // Cloudflare bills storage in decimal GB

// key -> { label, period: "day" | "month" | "now", limit, unit, verified, source, breaks, paid, hardStop, price }
//   hardStop: true = going over stops the site; false = going over is billed (price: { per: units per billed step, usd, text }).
const perMillion = (usd, text) => ({ per: 1e6, usd, text });
const COMMON = {
  r2_class_a:      { label: "R2 Class A operations (writes, lists)", period: "month", limit: 1_000_000, unit: "operations", verified: true, source: CF_R2, hardStop: false, price: perMillion(4.5, "$4.50 per million"), breaks: "Billing starts ($4.50 per million) once the free allowance is used; uploads keep working but cost money.", paid: "$4.50 per million beyond the free 1 million" },
  r2_class_b:      { label: "R2 Class B operations (reads)", period: "month", limit: 10_000_000, unit: "operations", verified: true, source: CF_R2, hardStop: false, price: perMillion(0.36, "$0.36 per million"), breaks: "Billing starts ($0.36 per million) once the free allowance is used; photos keep loading but cost money.", paid: "$0.36 per million beyond the free 10 million" },
  r2_storage:      { label: "R2 storage", period: "now", limit: 10 * GB, unit: "bytes", verified: true, source: CF_R2, hardStop: false, price: { per: GB, usd: 0.015, text: "$0.015 per GB-month" }, breaks: "Billing starts ($0.015 per GB-month) beyond the free 10 GB.", paid: "$0.015 per GB-month beyond 10 GB" },
  email_day:       { label: "Resend emails today", period: "day", limit: 100, unit: "emails", verified: true, source: RESEND_QUOTA, hardStop: true, breaks: "Sign-in codes, order emails, digests and alerts all stop until the next day: people cannot sign in.", paid: "Resend Pro is $20 a month with no daily limit" },
  email_month:     { label: "Resend emails this month", period: "month", limit: 3_000, unit: "emails", verified: true, source: RESEND_QUOTA, hardStop: true, breaks: "All email stops until next month.", paid: "Resend Pro is $20 a month for 50,000 emails" },
};
const FREE_ONLY = {
  d1_rows_read:    { label: "D1 rows read", period: "day", limit: 5_000_000, unit: "rows", verified: true, source: CF_D1, hardStop: true, breaks: "Every database query fails until midnight UTC: the map and every page that reads the database go blank or show errors.", paid: "Workers Paid ($5/month) includes 25 billion rows a month" },
  d1_rows_written: { label: "D1 rows written", period: "day", limit: 100_000, unit: "rows", verified: true, source: CF_D1, hardStop: true, breaks: "Every save fails (submissions, sign-ins, votes, orders) until midnight UTC; reads still work.", paid: "Workers Paid includes 50 million rows a month" },
  d1_storage:      { label: "D1 storage (all databases)", period: "now", limit: 5 * GB, unit: "bytes", verified: true, source: CF_D1_LIMITS, hardStop: true, breaks: "New data cannot be saved until you delete data; one database is also capped at 500 MB.", paid: "Workers Paid includes 5 GB, then $0.75 per GB-month" },
  requests:        { label: "Functions and Workers requests", period: "day", limit: 100_000, unit: "requests", verified: true, source: CF_WORKERS, hardStop: true, breaks: "Cloudflare answers with Error 1027 instead of the site's Functions until midnight UTC (static files stay free).", paid: "Workers Paid includes 10 million requests a month" },
};
const PAID_ONLY = {
  d1_rows_read:    { label: "D1 rows read", period: "month", limit: 25_000_000_000, unit: "rows", verified: true, source: CF_D1, hardStop: false, price: perMillion(0.001, "$0.001 per million"), breaks: "Extra charges start ($0.001 per million rows) once the included 25 billion rows are used. The site keeps working.", paid: "" },
  d1_rows_written: { label: "D1 rows written", period: "month", limit: 50_000_000, unit: "rows", verified: true, source: CF_D1, hardStop: false, price: perMillion(1, "$1.00 per million"), breaks: "Extra charges start ($1.00 per million rows) once the included 50 million rows are used. Saves keep working.", paid: "" },
  d1_storage:      { label: "D1 storage (all databases)", period: "now", limit: 5 * GB, unit: "bytes", verified: true, source: CF_D1, hardStop: false, price: { per: GB, usd: 0.75, text: "$0.75 per GB-month" }, breaks: "Extra charges start ($0.75 per GB-month) beyond the included 5 GB. Check the D1 limits page for the per-database size cap.", paid: "" },
  requests:        { label: "Functions and Workers requests", period: "month", limit: 10_000_000, unit: "requests", verified: true, source: CF_WORKERS_PRICING, hardStop: false, price: perMillion(0.3, "$0.30 per million"), breaks: "Extra charges start ($0.30 per million requests) once the included 10 million are used. The site keeps working; static files stay free.", paid: "" },
};
const ORDER = ["d1_rows_read", "d1_rows_written", "d1_storage", "requests", "r2_class_a", "r2_class_b", "r2_storage", "email_day", "email_month"];
export function metricsFor(plan = "paid") {
  const all = { ...COMMON, ...(plan === "free" ? FREE_ONLY : PAID_ONLY) };
  return Object.fromEntries(ORDER.map((k) => [k, all[k]]));
}
export const METRICS = metricsFor("free"); // the free-plan limits (kept for callers and tests that want them)
export const METRICS_PAID = metricsFor("paid");

// Estimated extra charge for `used` of a metric: { over: units past the included amount, usd }. Zero for a hard-stop metric or when under the allowance.
export function overageFor(m, used) {
  if (!m || !m.price || !(used > m.limit)) return { over: 0, usd: 0 };
  const over = used - m.limit;
  return { over, usd: Math.round((over / m.price.per) * m.price.usd * 10000) / 10000 };
}

// CPU limit per request, shown for information next to the CPU-error count (free: 10 ms; paid: 30 s default, 30 million ms/month included then $0.02 per million)
export const CPU_FREE_MS = { limit: 10, source: "https://developers.cloudflare.com/workers/platform/limits/#cpu-time", verified: true };
export const CPU_PAID_MS = { limit: 30000, source: "https://developers.cloudflare.com/workers/platform/pricing/", verified: true };

// R2 operation names (r2OperationsAdaptiveGroups.actionType) by billing class: https://developers.cloudflare.com/r2/pricing/#class-a-operations
export const R2_CLASS_A = new Set(["ListBuckets", "PutBucket", "ListObjects", "PutObject", "CopyObject", "CompleteMultipartUpload", "CreateMultipartUpload", "LifecycleStorageTierTransition", "ListMultipartUploads", "UploadPart", "UploadPartCopy", "ListParts", "PutBucketEncryption", "PutBucketCors", "PutBucketLifecycleConfiguration"]);
export const R2_CLASS_B = new Set(["HeadBucket", "HeadObject", "GetObject", "UsageSummary", "GetBucketEncryption", "GetBucketLocation", "GetBucketCors", "GetBucketLifecycleConfiguration"]);

export const CACHE_SECONDS = 300;

// "ok" | "watch" (>= 70%) | "warning" (>= 90%) | "limit" (>= 100%). Integer maths so 70 of 100 is exactly watch.
export function levelFor(used, limit) {
  if (!(limit > 0)) return "ok";
  const u = Number(used) || 0;
  if (u * 100 >= limit * THRESHOLDS.limit) return "limit";
  if (u * 100 >= limit * THRESHOLDS.warning) return "warning";
  if (u * 100 >= limit * THRESHOLDS.watch) return "watch";
  return "ok";
}
export const LEVEL_RANK = { ok: 0, watch: 1, warning: 2, limit: 3 };

// Messages Cloudflare (and Resend) give when a free-plan quota is used up. Kept loose on purpose: a miss only means "not tagged as a limit".
const QUOTA_PATTERNS = [
  /exceeded[^.]{0,60}(rows?\s+(read|written)|daily|quota|limit)/i,
  /(rows?\s+(read|written)|daily)[^.]{0,40}(limit|exceeded)/i,
  /too many subrequests/i,
  /error(\s+code)?:?\s*(1027|7500)\b/i,
  /free\s+tier\s+daily/i,
  /(worker|script)\s+exceeded\s+(its\s+)?(resource|cpu|memory)/i,
  /\b(daily|monthly)_quota_exceeded\b/i,
  /(daily|monthly)\s+(email\s+)?(sending\s+)?quota/i,
  /D1_ERROR[^.]{0,80}(limit|exceeded|quota)/i,
];
export const isQuotaError = (msg) => { const s = String(msg || ""); return QUOTA_PATTERNS.some((re) => re.test(s)); };
