// Cloudflare free-plan usage: thresholds, not-connected state, admin-only access, quota-error recognition, digest section and subject, caching.
// GraphQL is stubbed; nothing here talks to Cloudflare, Resend or Stripe.
import test from "node:test";
import assert from "node:assert/strict";
import { levelFor, isQuotaError, METRICS } from "../functions/_lib/cflimits.js";
import { getUsage, usageLines, buildQuery } from "../functions/_lib/cfusage.js";
import { logOp, noteQuotaError } from "../functions/_lib/oplog.js";
import { onRequest as adminGate } from "../functions/api/admin/_middleware.js";
import { onRequestGet as usageGet } from "../functions/api/admin/usage.js";
import { onRequest as check } from "../functions/api/usage-check.js";
import { onRequestPost as digest } from "../functions/api/admin-digest.js";
import { onRequestGet as dashboard } from "../functions/api/admin/dashboard.js";
import { sendMail } from "../functions/_lib/auth.js";
import { newEnv, stubFetch, freezeNow } from "./_pay.mjs";

const NOW = "2026-11-06T12:00:00Z", DAY = "2026-11-06";
const CF = { CF_ANALYTICS_TOKEN: "tok_not_real", CF_ACCOUNT_ID: "acct_not_real" };

// A GraphQL answer shaped like the real one (field names checked against the live schema).
function gql({ reads = 1000, writes = 10, reqs = 500, a = 100, b = 2000, d1Size = 2_000_000, r2Size = 10_000_000, errors } = {}) {
  const days = ["2026-11-04", "2026-11-05", DAY];
  return { data: { viewer: { accounts: [{
    d1: days.map((d) => ({ dimensions: { date: d }, sum: { rowsRead: d === DAY ? reads : 100, rowsWritten: d === DAY ? writes : 5 } })),
    d1s: [{ dimensions: { databaseId: "x1", datetime: "2026-11-06T11:00:00Z" }, max: { databaseSizeBytes: d1Size } }, { dimensions: { databaseId: "x1", datetime: "2026-11-06T10:00:00Z" }, max: { databaseSizeBytes: 1 } }],
    pf: [{ dimensions: { date: DAY, status: "success" }, sum: { requests: reqs, errors: 0 } }, { dimensions: { date: DAY, status: "exceededCpu" }, sum: { requests: 3, errors: 3 } }],
    wk: [],
    r2: [{ dimensions: { date: DAY, actionType: "PutObject" }, sum: { requests: a } }, { dimensions: { date: DAY, actionType: "GetObject" }, sum: { requests: b } }, { dimensions: { date: DAY, actionType: "DeleteObject" }, sum: { requests: 99999 } }, { dimensions: { date: "2026-10-31", actionType: "GetObject" }, sum: { requests: 777777 } }],
    r2s: [{ dimensions: { bucketName: "p", datetime: "2026-11-06T11:00:00Z" }, max: { payloadSize: r2Size, metadataSize: 0 } }],
  }] } }, errors: errors || null };
}
const withCf = (reply) => stubFetch((url, init) => (/api\.cloudflare\.com/.test(String(url)) ? new Response(JSON.stringify(typeof reply === "function" ? reply(url, init) : reply), { status: 200 }) : new Response("{}", { status: 200 })));
const get = (u, key) => u.metrics.find((m) => m.key === key);

test("levels: 69 ok, 70 watch, 89 watch, 90 warning, 100 limit", () => {
  assert.equal(levelFor(69, 100), "ok"); assert.equal(levelFor(70, 100), "watch"); assert.equal(levelFor(89, 100), "watch");
  assert.equal(levelFor(90, 100), "warning"); assert.equal(levelFor(99, 100), "warning"); assert.equal(levelFor(100, 100), "limit"); assert.equal(levelFor(150, 100), "limit");
  assert.equal(levelFor(3_499_999, 5_000_000), "ok"); assert.equal(levelFor(3_500_000, 5_000_000), "watch");
});

test("limits live in one module and are the verified free-plan numbers", () => {
  assert.equal(METRICS.d1_rows_read.limit, 5_000_000); assert.equal(METRICS.d1_rows_written.limit, 100_000); assert.equal(METRICS.requests.limit, 100_000);
  assert.equal(METRICS.r2_class_a.limit, 1_000_000); assert.equal(METRICS.r2_class_b.limit, 10_000_000); assert.equal(METRICS.r2_storage.limit, 10e9);
  assert.equal(METRICS.email_day.limit, 100); assert.equal(METRICS.email_month.limit, 3000);
  for (const m of Object.values(METRICS)) assert.match(m.source, /^https:\/\//);
});

test("the query asks for the datasets and fields of the live schema", () => {
  const q = buildQuery("acct", "2026-11-20");
  for (const w of ["d1AnalyticsAdaptiveGroups", "rowsRead", "rowsWritten", "d1StorageAdaptiveGroups", "databaseSizeBytes", "pagesFunctionsInvocationsAdaptiveGroups", "workersInvocationsAdaptive", "r2OperationsAdaptiveGroups", "actionType", "r2StorageAdaptiveGroups", "payloadSize"]) assert.ok(q.includes(w), w);
  assert.ok(q.includes('r2OperationsAdaptiveGroups(limit:2000, filter:{date_geq:"2026-11-01"}'), "R2 looks back to the start of the month");
});

test("thresholds end to end on D1 rows read (69, 70, 89, 90, 100 percent)", async () => {
  const restore = freezeNow(NOW);
  try {
    for (const [reads, level] of [[3_450_000, "ok"], [3_500_000, "watch"], [4_450_000, "watch"], [4_500_000, "warning"], [5_000_000, "limit"]]) {
      const { env } = newEnv(CF), f = withCf(gql({ reads }));
      try { const u = await getUsage(env, { force: true }); assert.equal(get(u, "d1_rows_read").level, level, String(reads)); assert.equal(u.level, level); } finally { f.restore(); }
    }
  } finally { restore(); }
});

test("numbers: today's day, R2 month to date by class (delete is free, October is not November), storage is the latest size, CPU errors", async () => {
  const restore = freezeNow(NOW), { env } = newEnv(CF), f = withCf(gql({ reads: 2_000_000, a: 250_000, b: 1_000_000 }));
  try {
    const u = await getUsage(env);
    assert.equal(get(u, "d1_rows_read").used, 2_000_000); assert.equal(get(u, "d1_rows_read").pct, 40);
    assert.equal(get(u, "r2_class_a").used, 250_000); assert.equal(get(u, "r2_class_b").used, 1_000_000);
    assert.equal(get(u, "d1_storage").used, 2_000_000, "newest size per database, not the sum of samples");
    assert.equal(get(u, "r2_storage").used, 10_000_000);
    assert.equal(get(u, "requests").used, 503);
    assert.equal(u.cpu.exceeded, 3);
    assert.equal(get(u, "d1_rows_read").trend.length, 7); assert.equal(get(u, "d1_rows_read").trend[6].d, DAY);
    assert.equal(get(u, "email_day").limit, 100);
  } finally { f.restore(); restore(); }
});

test("not connected: friendly state, no Cloudflare call, email counts still there", async () => {
  const restore = freezeNow(NOW), { env, raw } = newEnv(), f = withCf(gql());
  raw.prepare("INSERT INTO site_hits (day, page, n) VALUES (?, 'fn:email-sent', 72)").run(DAY);
  try {
    const u = await getUsage(env);
    assert.equal(u.connected, false); assert.equal(u.error, ""); assert.equal(f.calls.length, 0);
    assert.equal(get(u, "d1_rows_read").unavailable, true); assert.equal(get(u, "d1_rows_read").why, "Not connected");
    assert.equal(get(u, "email_day").used, 72); assert.equal(get(u, "email_day").level, "watch");
  } finally { f.restore(); restore(); }
});

test("a missing permission is named exactly; a refused token is explained", async () => {
  const restore = freezeNow(NOW), { env } = newEnv(CF);
  const f = withCf({ data: { viewer: { accounts: [{ ...gql().data.viewer.accounts[0], r2: null }] } }, errors: [{ message: "not authorized for that account", path: ["viewer", "accounts", 0, "r2"], extensions: { code: "authz" } }] });
  try {
    const u = await getUsage(env, { force: true });
    assert.match(get(u, "r2_class_a").why, /Permission missing: Account > Account Analytics > Read/);
    assert.ok(get(u, "d1_rows_read").used != null, "the other datasets still show");
    assert.ok(u.missing.some((m) => m.dataset === "r2"));
  } finally { f.restore(); }
  const f2 = withCf({ data: null, errors: [{ message: "not authorized for that account", extensions: { code: "authz" } }] });
  try { const u = await getUsage(env, { force: true }); assert.match(u.error, /refused the token/); assert.equal(u.connected, true); } finally { f2.restore(); restore(); }
});

test("caching: one Cloudflare call per five minutes, refresh skips the cache, a new day does not reuse it", async () => {
  const { env } = newEnv(CF), f = withCf(gql());
  let restore = freezeNow(NOW);
  try {
    await getUsage(env); const second = await getUsage(env);
    assert.equal(f.calls.length, 1); assert.equal(second.cached, true);
    restore(); restore = freezeNow("2026-11-06T12:04:00Z"); await getUsage(env); assert.equal(f.calls.length, 1, "4 minutes later still cached");
    restore(); restore = freezeNow("2026-11-06T12:06:00Z"); await getUsage(env); assert.equal(f.calls.length, 2, "after 5 minutes it is fetched again");
    await getUsage(env, { force: true }); assert.equal(f.calls.length, 3);
    restore(); restore = freezeNow("2026-11-07T00:01:00Z"); await getUsage(env); assert.equal(f.calls.length, 4, "midnight UTC starts a new day");
  } finally { f.restore(); restore(); }
});

test("admin only: 401 without a login, 200 with the local bypass", async () => {
  const { env } = newEnv(CF);
  const ctx = (url, e) => ({ request: new Request(url), env: e, data: {}, next: async () => usageGet({ request: new Request(url), env: e }) });
  const no = await adminGate(ctx("https://socallights.app/api/admin/usage", env));
  assert.equal(no.status, 401);
  const fake = await adminGate({ ...ctx("https://socallights.app/api/admin/usage", { ...env, ACCESS_TEAM_DOMAIN: "t.example", ACCESS_AUD: "aud" }), request: new Request("https://socallights.app/api/admin/usage", { headers: { "Cf-Access-Jwt-Assertion": "a.b.c" } }) });
  assert.equal(fake.status, 401);
  const f = withCf(gql());
  try {
    const yes = await adminGate(ctx("http://localhost/api/admin/usage", { ...env, ADMIN_DEV_BYPASS: "1" }));
    assert.equal(yes.status, 200); const body = await yes.json(); assert.equal(body.connected, true); assert.ok(Array.isArray(body.metrics));
    assert.ok(!JSON.stringify(body).includes("tok_not_real") && !JSON.stringify(body).includes("acct_not_real"), "no secret in the answer");
  } finally { f.restore(); }
});

test("usage-check: 401 without the key, answers the level with it", async () => {
  const restore = freezeNow(NOW), { env } = newEnv({ ...CF, ALERT_CRON_KEY: "check-key-0123456789" }), f = withCf(gql({ reads: 4_600_000 }));
  try {
    const bad = await check({ request: new Request("https://x.test/api/usage-check", { method: "POST" }), env });
    assert.equal(bad.status, 401);
    assert.equal((await check({ request: new Request("https://x.test/api/usage-check", { method: "POST", headers: { "x-alert-key": "wrong-key-0123456789" } }), env })).status, 401);
    const ok = await check({ request: new Request("https://x.test/api/usage-check", { method: "POST", headers: { "x-alert-key": "check-key-0123456789" } }), env });
    const b = await ok.json();
    assert.equal(ok.status, 200); assert.equal(b.level, "warning"); assert.equal(b.over[0].key, "d1_rows_read"); assert.match(b.lines[0], /D1 rows read: 4,600,000 of 5,000,000 \(92%\) WARNING/);
  } finally { f.restore(); restore(); }
});

test("quota errors are recognised and logged with kind 'limit'", async () => {
  for (const m of ["D1_ERROR: Exceeded the daily rows read limit", "D1 DB reached its daily limit of rows written", "Too many subrequests", "error code: 1027", "daily_quota_exceeded"]) assert.ok(isQuotaError(m), m);
  for (const m of ["mail service answered 422 invalid to", "no such table: posts", "Stripe did not answer"]) assert.ok(!isQuotaError(m), m);
  const { env, raw } = newEnv();
  await logOp(env, "email", "welcome: mail service answered 429 daily_quota_exceeded");
  await logOp(env, "email", "other: mail service answered 500");
  const rows = raw.prepare("SELECT kind, detail FROM ops_log ORDER BY id").all();
  assert.equal(rows[0].kind, "limit"); assert.match(rows[0].detail, /^email: welcome/); assert.equal(rows[1].kind, "email");
  await logOp(env, "limit", "D1 exceeded rows read"); await logOp(env, "webhook", "Too many subrequests");
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM ops_log WHERE kind = 'limit'").get().n, 1, "repeats within ten minutes are dropped");
  assert.equal(await noteQuotaError(env, new Error("not a quota thing")), false);
  const { env: e2, raw: r2 } = newEnv();
  assert.equal(await noteQuotaError(e2, new Error("D1_ERROR: exceeded the daily limit"), "events"), true);
  assert.match(r2.prepare("SELECT detail FROM ops_log WHERE kind = 'limit'").get().detail, /^events: /);
});

test("limit hit counts for the level without analytics, and shows on the dashboard banner data", async () => {
  const restore = freezeNow(NOW), { env, raw } = newEnv();
  try {
    raw.prepare("INSERT INTO ops_log (kind, detail, created_at) VALUES ('limit', 'D1 exceeded rows read', datetime('now'))").run();
    const u = await getUsage(env);
    assert.equal(u.connected, false); assert.equal(u.level, "limit"); assert.equal(u.limitHits.length, 1);
    const d = await (await dashboard({ env })).json(); assert.equal(d.limits.length, 1);
  } finally { restore(); }
});

const KEY = "digest-key-0123456789";
async function runDigest(env) {
  const f = stubFetch((url) => (/api\.cloudflare\.com/.test(String(url)) ? new Response(JSON.stringify(env.__gql), { status: 200 }) : new Response("{}", { status: 200 })));
  try {
    const res = await digest({ request: new Request("https://x.test/api/admin-digest", { method: "POST", headers: { "x-alert-key": KEY } }), env: { ...env, ALERT_CRON_KEY: KEY, RESEND_API_KEY: "re_fake" } });
    const sent = f.calls.find((c) => /resend/.test(c.url)); const body = sent ? JSON.parse(sent.init.body) : {};
    return { status: res.status, text: body.text || "", subject: body.subject || "" };
  } finally { f.restore(); }
}

test("digest: usage section always shows the top metric; LIMIT in the subject at 90% or more", async () => {
  const restore = freezeNow(NOW);
  try {
    const { env } = newEnv(CF); env.__gql = gql({ reads: 500_000 });
    const calm = await runDigest(env);
    assert.match(calm.text, /Cloudflare free-plan usage/); assert.match(calm.text, /D1 rows read: 500,000 of 5,000,000 \(10%\)|Functions and Workers requests|R2 Class B|D1 storage/);
    assert.doesNotMatch(calm.subject, /LIMIT/);
    const { env: e2 } = newEnv(CF); e2.__gql = gql({ reads: 3_600_000 });
    const watch = await runDigest(e2); assert.match(watch.text, /D1 rows read: 3,600,000 of 5,000,000 \(72%\) watch/); assert.doesNotMatch(watch.subject, /LIMIT/);
    const { env: e3 } = newEnv(CF); e3.__gql = gql({ reads: 4_700_000 });
    const hot = await runDigest(e3); assert.match(hot.text, /D1 rows read: 4,700,000 of 5,000,000 \(94%\) WARNING/); assert.match(hot.subject, /^SoCal Lights: LIMIT, /);
    const { env: e4 } = newEnv(); const none = await runDigest(e4);
    assert.match(none.text, /Cloudflare free-plan usage/); assert.match(none.text, /Resend emails|not connected/i); assert.doesNotMatch(none.subject, /LIMIT/);
  } finally { restore(); }
});

test("digest: a logged limit hit is shown with its time", async () => {
  const { env, raw } = newEnv(); env.__gql = gql();
  raw.prepare("INSERT INTO ops_log (kind, detail, created_at) VALUES ('limit', 'events: D1 exceeded rows read', datetime('now','-1 hour'))").run();
  const r = await runDigest(env);
  assert.match(r.text, /LIMIT HIT at \d{4}-\d\d-\d\d \d\d:\d\d:\d\d UTC: events: D1 exceeded rows read/);
});

test("every email sent counts toward today's Resend total (UTC day)", async () => {
  const restore = freezeNow(NOW), { env, raw } = newEnv({ RESEND_API_KEY: "re_fake" }), f = stubFetch(() => new Response("{}", { status: 200 }));
  try {
    assert.equal(await sendMail(env, { to: "a@example.com", subject: "s", text: "t" }), true);
    assert.equal(await sendMail(env, { to: "b@example.com", subject: "s", text: "t" }), true);
    assert.equal(raw.prepare("SELECT n FROM site_hits WHERE page = 'fn:email-sent' AND day = ?").get(DAY).n, 2);
    const u = await getUsage(env); assert.equal(get(u, "email_day").used, 2); assert.equal(get(u, "email_month").used, 2);
    const failing = stubFetch(() => new Response("{}", { status: 500 }));
    try { assert.equal(await sendMail(env, { to: "c@example.com", subject: "s", text: "t" }), false); } finally { failing.restore(); }
    assert.equal(raw.prepare("SELECT n FROM site_hits WHERE page = 'fn:email-sent'").get().n, 2, "a failed send is not counted");
    assert.deepEqual(usageLines(u).length >= 1, true);
  } finally { f.restore(); restore(); }
});
