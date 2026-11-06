// The ONE place for the free-plan limits the Admin > Usage panel, the admin digest and the limit check compare against.
// Verified 2026-11-06 against the pages named in `source` (fetched as markdown from developers.cloudflare.com and resend.com).
// If Cloudflare changes a number, change it here only. `verified: false` shows "unverified" in the panel.
// Cloudflare's daily limits reset at 00:00 UTC (https://developers.cloudflare.com/d1/platform/pricing/ note 8), so "today" is the UTC day.

export const THRESHOLDS = { watch: 70, warning: 90, limit: 100 }; // percent of the limit

// What plan we assume. The audit could not confirm the account's plan (CPU times above the free 10 ms suggest Workers Paid): check Billing.
export const CLOUDFLARE_PLAN = "free";
export const RESEND_PLAN = "free"; // Resend Free: 100 emails a day, 3,000 a month (sent AND received count). Pro is $20 a month with no daily limit.

const CF_D1 = "https://developers.cloudflare.com/d1/platform/pricing/";
const CF_D1_LIMITS = "https://developers.cloudflare.com/d1/platform/limits/";
const CF_WORKERS = "https://developers.cloudflare.com/workers/platform/limits/#daily-requests";
const CF_R2 = "https://developers.cloudflare.com/r2/pricing/#free-tier";
const RESEND_QUOTA = "https://resend.com/docs/knowledge-base/account-quotas-and-limits";

export const GB = 1e9; // Cloudflare bills storage in decimal GB

// key -> { label, period: "day" | "month" | "now", limit, unit, verified, source, breaks, paid }
export const METRICS = {
  d1_rows_read:    { label: "D1 rows read", period: "day", limit: 5_000_000, unit: "rows", verified: true, source: CF_D1, breaks: "Every database query fails until midnight UTC: the map and every page that reads the database go blank or show errors.", paid: "Workers Paid ($5/month) includes 25 billion rows a month" },
  d1_rows_written: { label: "D1 rows written", period: "day", limit: 100_000, unit: "rows", verified: true, source: CF_D1, breaks: "Every save fails (submissions, sign-ins, votes, orders) until midnight UTC; reads still work.", paid: "Workers Paid includes 50 million rows a month" },
  d1_storage:      { label: "D1 storage (all databases)", period: "now", limit: 5 * GB, unit: "bytes", verified: true, source: CF_D1_LIMITS, breaks: "New data cannot be saved until you delete data; one database is also capped at 500 MB.", paid: "Workers Paid includes 5 GB, then $0.75 per GB-month" },
  requests:        { label: "Functions and Workers requests", period: "day", limit: 100_000, unit: "requests", verified: true, source: CF_WORKERS, breaks: "Cloudflare answers with Error 1027 instead of the site's Functions until midnight UTC (static files stay free).", paid: "Workers Paid includes 10 million requests a month" },
  r2_class_a:      { label: "R2 Class A operations (writes, lists)", period: "month", limit: 1_000_000, unit: "operations", verified: true, source: CF_R2, breaks: "Billing starts ($4.50 per million) once the free allowance is used; uploads keep working but cost money.", paid: "$4.50 per million beyond the free 1 million" },
  r2_class_b:      { label: "R2 Class B operations (reads)", period: "month", limit: 10_000_000, unit: "operations", verified: true, source: CF_R2, breaks: "Billing starts ($0.36 per million) once the free allowance is used; photos keep loading but cost money.", paid: "$0.36 per million beyond the free 10 million" },
  r2_storage:      { label: "R2 storage", period: "now", limit: 10 * GB, unit: "bytes", verified: true, source: CF_R2, breaks: "Billing starts ($0.015 per GB-month) beyond the free 10 GB.", paid: "$0.015 per GB-month beyond 10 GB" },
  email_day:       { label: "Resend emails today", period: "day", limit: 100, unit: "emails", verified: true, source: RESEND_QUOTA, breaks: "Sign-in codes, order emails, digests and alerts all stop until the next day: people cannot sign in.", paid: "Resend Pro is $20 a month with no daily limit" },
  email_month:     { label: "Resend emails this month", period: "month", limit: 3_000, unit: "emails", verified: true, source: RESEND_QUOTA, breaks: "All email stops until next month.", paid: "Resend Pro is $20 a month for 50,000 emails" },
};
// Free CPU limit per request, shown for information next to the CPU-error count
export const CPU_FREE_MS = { limit: 10, source: "https://developers.cloudflare.com/workers/platform/limits/#cpu-time", verified: true };

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
  /error\s*1027/i,
  /(worker|script)\s+exceeded\s+(its\s+)?(resource|cpu|memory)/i,
  /\b(daily|monthly)_quota_exceeded\b/i,
  /(daily|monthly)\s+(email\s+)?(sending\s+)?quota/i,
  /D1_ERROR[^.]{0,80}(limit|exceeded|quota)/i,
];
export const isQuotaError = (msg) => { const s = String(msg || ""); return QUOTA_PATTERNS.some((re) => re.test(s)); };
