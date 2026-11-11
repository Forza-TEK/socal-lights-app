// Cloudflare usage on the Workers Paid plan (the default): monthly included amounts, estimated overage, "extra charges start" wording,
// billing-month sums, plan switch back to free, digest and check text. GraphQL is stubbed; nothing here talks to Cloudflare, Resend or Stripe.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { metricsFor, planOf, billingDayOf, periodStartFor, overageFor, METRICS_PAID, METRICS } from "../functions/_lib/cflimits.js";
import { getUsage, usageLines, buildQuery, parseAnalytics } from "../functions/_lib/cfusage.js";
import { onRequest as check } from "../functions/api/usage-check.js";
import { onRequestPost as digest } from "../functions/api/admin-digest.js";
import { newEnv, stubFetch, freezeNow } from "./_pay.mjs";

const NOW = "2026-11-20T12:00:00Z", DAY = "2026-11-20";
const CF = { CF_ANALYTICS_TOKEN: "tok_not_real", CF_ACCOUNT_ID: "acct_not_real" }; // no CLOUDFLARE_PLAN: the default is paid
const get = (u, key) => u.metrics.find((m) => m.key === key);

// One row per day from the 8th to the 20th: `perDay` rows read, `perDayW` written, `perDayReq` requests (Pages Functions), today's own values override.
function gql({ perDay = 1_000_000, perDayW = 10_000, perDayReq = 5_000, today = {}, a = 100, b = 2000 } = {}) {
  const days = []; for (let d = 1; d <= 20; d++) days.push("2026-11-" + String(d).padStart(2, "0"));
  const t = { reads: perDay, writes: perDayW, reqs: perDayReq, ...today };
  return { data: { viewer: { accounts: [{
    d1: days.map((d) => ({ dimensions: { date: d }, sum: { rowsRead: d === DAY ? t.reads : perDay, rowsWritten: d === DAY ? t.writes : perDayW } })),
    d1s: [{ dimensions: { databaseId: "x1", datetime: "2026-11-20T11:00:00Z" }, max: { databaseSizeBytes: 2_000_000 } }],
    pf: days.map((d) => ({ dimensions: { date: d, status: "success" }, sum: { requests: d === DAY ? t.reqs : perDayReq, errors: 0 } })),
    wk: [],
    r2: [{ dimensions: { date: DAY, actionType: "PutObject" }, sum: { requests: a } }, { dimensions: { date: DAY, actionType: "GetObject" }, sum: { requests: b } }],
    r2s: [{ dimensions: { bucketName: "p", datetime: "2026-11-20T11:00:00Z" }, max: { payloadSize: 10_000_000, metadataSize: 0 } }],
  }] } } };
}
const withCf = (reply) => stubFetch((url) => (/api\.cloudflare\.com/.test(String(url)) ? new Response(JSON.stringify(reply), { status: 200 }) : new Response("{}", { status: 200 })));

test("plan setting: default paid, 'free' goes back, junk falls to paid; billing day 1 to 28", () => {
  assert.equal(planOf({}), "paid"); assert.equal(planOf({ CLOUDFLARE_PLAN: "free" }), "free"); assert.equal(planOf({ CLOUDFLARE_PLAN: " FREE " }), "free");
  assert.equal(planOf({ CLOUDFLARE_PLAN: "paid" }), "paid"); assert.equal(planOf({ CLOUDFLARE_PLAN: "enterprise?" }), "paid");
  assert.equal(billingDayOf({}), 1); assert.equal(billingDayOf({ CLOUDFLARE_BILLING_DAY: "8" }), 8); assert.equal(billingDayOf({ CLOUDFLARE_BILLING_DAY: "31" }), 1); assert.equal(billingDayOf({ CLOUDFLARE_BILLING_DAY: "x" }), 1);
});

test("billing month start (UTC): calendar month by default, a cycle day before and after it, across a year end", () => {
  assert.equal(periodStartFor("2026-11-20"), "2026-11-01");
  assert.equal(periodStartFor("2026-11-20", 8), "2026-11-08"); assert.equal(periodStartFor("2026-11-08", 8), "2026-11-08");
  assert.equal(periodStartFor("2026-11-07", 8), "2026-10-08"); assert.equal(periodStartFor("2027-01-03", 8), "2026-12-08");
});

test("paid allowances are the monthly numbers from Cloudflare's pricing pages; free ones are unchanged", () => {
  const p = METRICS_PAID;
  assert.equal(p.d1_rows_read.limit, 25_000_000_000); assert.equal(p.d1_rows_written.limit, 50_000_000); assert.equal(p.d1_storage.limit, 5e9); assert.equal(p.requests.limit, 10_000_000);
  for (const k of ["d1_rows_read", "d1_rows_written", "requests"]) { assert.equal(p[k].period, "month"); assert.equal(p[k].hardStop, false); }
  assert.deepEqual([p.d1_rows_read.price.usd, p.d1_rows_written.price.usd, p.requests.price.usd, p.d1_storage.price.usd], [0.001, 1, 0.3, 0.75]);
  assert.equal(p.r2_class_a.limit, 1_000_000); assert.equal(p.email_day.limit, 100); assert.equal(p.email_day.hardStop, true, "Resend stays on its free plan");
  assert.equal(METRICS.d1_rows_read.limit, 5_000_000); assert.equal(METRICS.d1_rows_read.period, "day"); assert.equal(METRICS.d1_rows_read.hardStop, true);
  assert.deepEqual(Object.keys(metricsFor("free")), Object.keys(metricsFor("paid")));
  for (const m of Object.values(p)) assert.match(m.source, /^https:\/\//);
});

test("overage maths: nothing under the allowance, per-million and per-GB beyond it, none for hard stops", () => {
  const p = METRICS_PAID;
  assert.deepEqual(overageFor(p.requests, 10_000_000), { over: 0, usd: 0 });
  assert.deepEqual(overageFor(p.requests, 12_000_000), { over: 2_000_000, usd: 0.6 });
  assert.equal(overageFor(p.d1_rows_written, 51_500_000).usd, 1.5);
  assert.equal(overageFor(p.d1_rows_read, 26_000_000_000).usd, 1, "1 billion extra rows = 1,000 million x $0.001");
  assert.equal(overageFor(p.d1_storage, 7e9).usd, 1.5);
  assert.equal(overageFor(p.r2_class_a, 3_000_000).usd, 9);
  assert.deepEqual(overageFor(METRICS.d1_rows_read, 9_000_000), { over: 0, usd: 0 });
});

test("the query reaches back to the billing-month start for the monthly sums", () => {
  assert.ok(buildQuery("acct", "2026-11-20", "2026-11-08").includes('d1AnalyticsAdaptiveGroups(limit:200, filter:{date_geq:"2026-11-08"})'));
  assert.ok(buildQuery("acct", "2026-11-20", "2026-11-08").includes('pagesFunctionsInvocationsAdaptiveGroups(limit:1000, filter:{date_geq:"2026-11-08"})'));
  assert.ok(buildQuery("acct", "2026-11-20", "2026-10-25").includes('date_geq:"2026-10-25"'), "a cycle that began last month");
  assert.ok(buildQuery("acct", "2026-11-20").includes('d1AnalyticsAdaptiveGroups(limit:200, filter:{date_geq:"2026-11-01"})'));
  assert.ok(buildQuery("acct", "2026-11-03", "2026-11-01").includes('date_geq:"2026-10-28"'), "the 7-day trend still wins when it reaches further back");
});

test("parse: month sums run from the period start only; today and the 7-day trend are kept", () => {
  const r = parseAnalytics(gql({ today: { reads: 3_000_000 } }), DAY, "2026-11-08");
  assert.equal(r.month.d1_rows_read, 12 * 1_000_000 + 3_000_000, "8th to 19th = 12 days, plus today");
  assert.equal(r.month.requests, 12 * 5_000 + 5_000);
  assert.equal(r.now.d1_rows_read, 3_000_000, "today");
  assert.equal(r.series.d1_rows_read.length, 7);
});

test("paid plan end to end: used of included this month, today, no hard stop, no overage under the allowance", async () => {
  const restore = freezeNow(NOW), { env } = newEnv(CF), f = withCf(gql());
  try {
    const u = await getUsage(env, { force: true });
    assert.equal(u.plan, "paid"); assert.equal(u.planLabel, "Workers Paid"); assert.equal(u.periodStart, "2026-11-01"); assert.equal(u.planBaseUsd, 5);
    const r = get(u, "d1_rows_read");
    assert.equal(r.used, 20_000_000, "20 days of 1,000,000"); assert.equal(r.limit, 25_000_000_000); assert.equal(r.period, "month"); assert.equal(r.today, 1_000_000); assert.equal(r.level, "ok"); assert.equal(r.hardStop, false);
    assert.equal(get(u, "requests").used, 100_000); assert.equal(get(u, "requests").limit, 10_000_000); assert.equal(get(u, "requests").pct, 1);
    assert.equal(u.estimatedOverageUsd, 0); assert.equal(u.level, "ok");
    assert.equal(get(u, "d1_rows_read").trend.length, 7);
    assert.equal(get(u, "email_day").limit, 100, "Resend stays on the free plan");
  } finally { f.restore(); restore(); }
});

test("paid thresholds are of the included amount: 69 ok, 70 watch, 90 warning, 100 extra charges (level 'limit'), with the cost estimate", async () => {
  const restore = freezeNow(NOW);
  try {
    // writes: 19 days at perDayW plus today's value; choose totals of 34.5M, 35M, 45M, 50M, 56M against the 50M included
    for (const [total, level, usd] of [[34_500_000, "ok", 0], [35_000_000, "watch", 0], [45_000_000, "warning", 0], [50_000_000, "limit", 0], [56_000_000, "limit", 6]]) {
      const { env } = newEnv(CF), f = withCf(gql({ perDayW: 0, today: { writes: total } }));
      try {
        const u = await getUsage(env, { force: true }), m = get(u, "d1_rows_written");
        assert.equal(m.used, total); assert.equal(m.level, level, String(total)); assert.equal(m.overUsd, usd); assert.equal(u.estimatedOverageUsd, usd);
      } finally { f.restore(); }
    }
  } finally { restore(); }
});

test("paid lines say extra charges start, never 'LIMIT REACHED' or 'site stops'", async () => {
  const restore = freezeNow(NOW), { env } = newEnv(CF), f = withCf(gql({ perDayW: 0, today: { writes: 56_000_000 } }));
  try {
    const lines = usageLines(await getUsage(env, { force: true })).join("\n");
    assert.match(lines, /D1 rows written: 56,000,000 of 50,000,000 included this month \(112%\) EXTRA CHARGES START \(about USD 6\.00 so far, the site keeps working\)/);
    assert.doesNotMatch(lines, /LIMIT REACHED/i);
    for (const m of Object.values(METRICS_PAID).filter((x) => x.hardStop === false)) assert.doesNotMatch(m.breaks, /fail|stops|go blank|Error 1027/i, m.label);
  } finally { f.restore(); restore(); }
});

test("a billing day moves the monthly sum window and busts the cache", async () => {
  const restore = freezeNow(NOW), { env } = newEnv({ ...CF, CLOUDFLARE_BILLING_DAY: "8" }), f = withCf(gql());
  try {
    const u = await getUsage(env, { force: true });
    assert.equal(u.periodStart, "2026-11-08"); assert.equal(get(u, "d1_rows_read").used, 13_000_000, "8th to 20th = 13 days");
    const body = JSON.parse(f.calls[0].init.body); assert.ok(body.query.includes('date_geq:"2026-11-08"'));
    const again = await getUsage({ ...env, CLOUDFLARE_BILLING_DAY: "15" }); assert.equal(again.periodStart, "2026-11-15"); assert.equal(f.calls.length, 2, "a different period is not served from the cache");
  } finally { f.restore(); restore(); }
});

test("switching back to free: same cached analytics, daily limits and hard-stop wording return", async () => {
  const restore = freezeNow(NOW), { env } = newEnv({ ...CF, CLOUDFLARE_PLAN: "free" }), f = withCf(gql({ today: { reads: 5_000_000 } }));
  try {
    const u = await getUsage(env, { force: true }), m = get(u, "d1_rows_read");
    assert.equal(u.plan, "free"); assert.equal(m.limit, 5_000_000); assert.equal(m.used, 5_000_000, "today only"); assert.equal(m.level, "limit"); assert.equal(m.hardStop, true); assert.equal(u.estimatedOverageUsd, 0);
    assert.match(usageLines(u)[0], /D1 rows read: 5,000,000 of 5,000,000 \(100%\) LIMIT REACHED/);
    assert.equal(planOf({ CLOUDFLARE_PLAN: "free" }), "free");
  } finally { f.restore(); restore(); }
});

test("a quota error logged by the site still raises the level on paid (R2/Resend/D1 daily messages)", async () => {
  const restore = freezeNow(NOW), { env, raw } = newEnv();
  try {
    raw.prepare("INSERT INTO ops_log (kind, detail, created_at) VALUES ('limit', 'daily_quota_exceeded', '2026-11-20 11:00:00')").run();
    const u = await getUsage(env); assert.equal(u.plan, "paid"); assert.equal(u.level, "limit");
  } finally { restore(); }
});

test("usage-check answers the plan, the estimate and per-metric hardStop", async () => {
  const restore = freezeNow(NOW), { env } = newEnv({ ...CF, ALERT_CRON_KEY: "check-key-0123456789" }), f = withCf(gql({ perDayW: 0, today: { writes: 47_000_000 } }));
  try {
    const res = await check({ request: new Request("https://x.test/api/usage-check", { method: "POST", headers: { "x-alert-key": "check-key-0123456789" } }), env });
    const b = await res.json();
    assert.equal(b.plan, "paid"); assert.equal(b.planLabel, "Workers Paid"); assert.equal(b.level, "warning"); assert.equal(b.estimatedOverageUsd, 0);
    assert.equal(b.over[0].key, "d1_rows_written"); assert.equal(b.over[0].hardStop, false); assert.match(b.lines[0], /\(94%\) WARNING/);
  } finally { f.restore(); restore(); }
});

const KEY = "digest-key-0123456789";
async function runDigest(env) {
  const f = stubFetch((url) => (/api\.cloudflare\.com/.test(String(url)) ? new Response(JSON.stringify(env.__gql), { status: 200 }) : new Response("{}", { status: 200 })));
  try {
    await digest({ request: new Request("https://x.test/api/admin-digest", { method: "POST", headers: { "x-alert-key": KEY } }), env: { ...env, ALERT_CRON_KEY: KEY, RESEND_API_KEY: "re_fake" } });
    const sent = f.calls.find((c) => /resend/.test(c.url)); const body = sent ? JSON.parse(sent.init.body) : {};
    return { text: body.text || "", subject: body.subject || "" };
  } finally { f.restore(); }
}

test("digest on Workers Paid: plan line, billing month, estimate, USAGE (not LIMIT) in the subject", async () => {
  const restore = freezeNow(NOW);
  try {
    const { env } = newEnv(CF); env.__gql = gql({ perDayW: 0, today: { writes: 56_000_000 } });
    const r = await runDigest(env);
    assert.match(r.text, /Cloudflare Workers Paid usage/); assert.match(r.text, /Plan: Workers Paid \(USD 5\/month\)\. Included amounts are for the billing month from 2026-11-01/);
    assert.match(r.text, /going over is billed, it does not stop the site\. Estimated extra charges so far: USD 6\.00/);
    assert.match(r.text, /EXTRA CHARGES START/); assert.match(r.subject, /^SoCal Lights: USAGE, /); assert.doesNotMatch(r.subject, /LIMIT/);
    const { env: calm } = newEnv(CF); calm.__gql = gql();
    const c = await runDigest(calm); assert.doesNotMatch(c.subject, /USAGE|LIMIT/); assert.match(c.text, /D1 rows read: 20,000,000 of 25,000,000,000 included this month \(0.1%\)|Functions and Workers requests|D1 storage|R2/);
    const { env: free } = newEnv({ ...CF, CLOUDFLARE_PLAN: "free" }); free.__gql = gql({ today: { reads: 4_700_000 } });
    const fr = await runDigest(free); assert.match(fr.text, /Cloudflare free-plan usage/); assert.match(fr.subject, /^SoCal Lights: LIMIT, /);
  } finally { restore(); }
});

test("admin panel and scripts carry the Workers Paid wording and the free path", () => {
  const js = readFileSync("public/admin/admin.js", "utf8");
  assert.match(js, /"Workers Paid"/); assert.match(js, /"Cloudflare Free"/); assert.match(js, /Extra charges start/); assert.match(js, /Extra charges so far/); assert.match(js, /not<\/b> a stop: extra use is billed/);
  const sh = readFileSync(".github/scripts/usage-issue.sh", "utf8");
  assert.match(sh, /Cloudflare usage limit reached or near/); assert.match(sh, /NOT hard stops/); assert.match(sh, /Cloudflare free-plan limit reached or near/);
  assert.match(readFileSync(".github/workflows/usage-check.yml", "utf8"), /Workers Paid/);
});
