// Monitoring you can trust: job heartbeats, /api/health, deploy-stall rules, backup restore test, bad webhook signatures, Stripe reconcile.
// No real network, email or payment: fetch is stubbed and the database is the in-memory stand-in with every migration applied.
import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, recordHeartbeat, jobStatus, JOBS } from "../functions/_lib/heartbeat.js";
import { onRequest as heartbeat } from "../functions/api/heartbeat.js";
import { onRequest as health } from "../functions/api/health.js";
import { onRequestGet as dashboard } from "../functions/api/admin/dashboard.js";
import { onRequestPost as digest } from "../functions/api/admin-digest.js";
import { onRequestPost as reconcileApi } from "../functions/api/stripe-reconcile.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { evaluateDeploys, checkDeploys } from "../functions/_lib/deploys.js";
import { compare, reconcileStep, reconcileLines, readState } from "../functions/_lib/reconcile.js";
import { logOpOnce } from "../functions/_lib/oplog.js";
import { verifyTurnstile } from "../functions/_lib/util.js";
import { verifyDump } from "../scripts/verify-backup.mjs";
import { newEnv, stubFetch, sendWebhook, stripeEvent, session } from "./_pay.mjs";

const KEY = "monitor-key-0123456789";
const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString().slice(0, 19).replace("T", " ");
const setAll = (raw, h) => raw.prepare("UPDATE job_heartbeats SET last_at = ?, last_status = 'ok'").run(hoursAgo(h));
const call = (fn, env, path = "/api/x", init = {}) => fn({ request: new Request("https://x.test" + path, init), env: { ...env, ALERT_CRON_KEY: KEY } });
const withKey = (method = "GET") => ({ method, headers: { "x-alert-key": KEY } });

test("migration seeds every job with a fresh clock, so nothing is stale on day one", async () => {
  const { env } = newEnv();
  const st = await jobStatus(env);
  assert.equal(st.jobs.length, Object.keys(JOBS).length);
  assert.ok(st.jobs.every((j) => !j.problem && j.status === "seed"));
});

test("evaluate: stale after its window, failed on a failed run, never reported counts as stale", () => {
  const now = Date.parse("2026-11-07T12:00:00Z");
  const rows = [{ job: "backup", last_at: "2026-11-06 04:00:00", last_ok_at: "2026-11-06 04:00:00", last_status: "ok", detail: "" }, { job: "uptime", last_at: "2026-11-07 11:30:00", last_status: "fail", detail: "the site is down" }];
  const by = Object.fromEntries(evaluate(rows, now).map((j) => [j.job, j]));
  assert.equal(by.backup.stale, true);
  assert.match(by.backup.line, /Nightly backup: last ran 32 hours ago \(expected every day, flagged after 30 hours\)/);
  assert.equal(by.uptime.stale, false); assert.equal(by.uptime.failed, true); assert.match(by.uptime.line, /FAILED/);
  assert.equal(by.digest.stale, true); assert.match(by.digest.line, /last ran never/);
  assert.equal(evaluate([{ job: "backup", last_at: "2026-11-07 00:00:00", last_status: "ok" }], now).find((j) => j.job === "backup").stale, false, "12 hours is fine for a daily job");
});

test("recordHeartbeat: upserts, keeps the last good time on a failure, strips emails, ignores unknown jobs", async () => {
  const { env, raw } = newEnv(); setAll(raw, 100);
  assert.equal(await recordHeartbeat(env, "backup", "ok", "fine"), true);
  let r = raw.prepare("SELECT * FROM job_heartbeats WHERE job = 'backup'").get();
  assert.equal(r.last_status, "ok"); assert.ok(r.last_ok_at); assert.equal(r.runs, 1);
  const good = r.last_ok_at;
  await recordHeartbeat(env, "backup", "fail", "boom owner@example.com");
  r = raw.prepare("SELECT * FROM job_heartbeats WHERE job = 'backup'").get();
  assert.equal(r.last_status, "fail"); assert.equal(r.last_ok_at, good); assert.equal(r.runs, 2); assert.doesNotMatch(r.detail, /@example/);
  assert.equal(await recordHeartbeat(env, "nope", "ok"), false);
});

test("/api/heartbeat: key required, POST records, GET reports, unknown job is 400", async () => {
  const { env, raw } = newEnv(); setAll(raw, 100);
  assert.equal((await call(heartbeat, env, "/api/heartbeat")).status, 401);
  assert.equal((await call(heartbeat, env, "/api/heartbeat", { headers: { "x-alert-key": "wrong-wrong-wrong-wrong" } })).status, 401);
  assert.equal((await call(heartbeat, env, "/api/heartbeat?job=nope", withKey("POST"))).status, 400);
  const before = await (await call(heartbeat, env, "/api/heartbeat", withKey())).json();
  assert.ok(before.stale.length > 0 && before.stale.some((l) => /Nightly backup/.test(l)));
  const res = await call(heartbeat, env, "/api/heartbeat?job=backup&status=ok", withKey("POST"));
  assert.equal(res.status, 200);
  const after = await res.json();
  assert.ok(!after.stale.some((l) => /Nightly backup/.test(l)));
  assert.equal(after.jobs.find((j) => j.job === "backup").status, "ok");
});

test("/api/health: public, tiny, no secrets; stale flag flips; 503 when the database is gone", async () => {
  const { env, raw } = newEnv();
  let res = await health({ request: new Request("https://x.test/api/health"), env });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("cache-control"), /s-maxage=30/);
  assert.deepEqual(await res.json(), { ok: true, db: true, stale: false, staleJobs: [] });
  raw.prepare("UPDATE job_heartbeats SET last_at = ? WHERE job = 'backup'").run(hoursAgo(31));
  res = await health({ request: new Request("https://x.test/api/health"), env });
  const body = await res.json();
  assert.equal(body.stale, true); assert.deepEqual(body.staleJobs, ["backup"]);
  assert.doesNotMatch(JSON.stringify(body), /hours|ago|key|secret/i);
  assert.equal((await health({ request: new Request("https://x.test/api/health", { method: "HEAD" }), env })).status, 200);
  assert.equal((await health({ request: new Request("https://x.test/api/health", { method: "POST" }), env })).status, 405);
  const calls = env.DB.stats.calls; await health({ request: new Request("https://x.test/api/health"), env }); assert.equal(env.DB.stats.calls - calls, 1, "one SELECT");
  const broken = { DB: { prepare: () => ({ all: async () => { throw new Error("D1_ERROR: down"); }, first: async () => { throw new Error("D1_ERROR: down"); } }) } };
  res = await health({ request: new Request("https://x.test/api/health"), env: broken });
  assert.equal(res.status, 503); assert.equal((await res.json()).db, false);
});

test("/api/health before the migration: the database answers, so it is still 200", async () => {
  const { env, raw } = newEnv(); raw.exec("DROP TABLE job_heartbeats");
  const res = await health({ request: new Request("https://x.test/api/health"), env });
  assert.equal(res.status, 200); assert.equal((await res.json()).stale, false);
});

test("Admin home data carries the stale-job banner lines", async () => {
  const { env, raw } = newEnv(); setAll(raw, 1);
  assert.deepEqual((await (await dashboard({ env })).json()).staleJobs, []);
  raw.prepare("UPDATE job_heartbeats SET last_at = ? WHERE job = 'uptime'").run(hoursAgo(9));
  const d = await (await dashboard({ env })).json();
  assert.equal(d.staleJobs.length, 1); assert.match(d.staleJobs[0].line, /Uptime check: last ran 9 hours ago \(expected every 15 minutes/);
});

// ---------- deploy stall ----------
const NOW = Date.parse("2026-11-07T12:00:00Z");
const dep = (id, env, status, minsAgo, sha = "aaaaaaa1111", stage = "build") => ({ id, environment: env, created_on: new Date(NOW - minsAgo * 60000).toISOString(), latest_stage: { name: stage, status }, deployment_trigger: { metadata: { commit_hash: sha } } });

test("deploy rules: active 8+ minutes is stalled (preview too), 7 minutes is not", () => {
  assert.equal(evaluateDeploys([dep("d1", "preview", "active", 7), dep("d0", "production", "success", 30)], null, NOW).state, "ok");
  const r = evaluateDeploys([dep("d2", "preview", "active", 9)], null, NOW);
  assert.equal(r.state, "stalled"); assert.equal(r.problems[0].kind, "stuck"); assert.match(r.problems[0].text, /preview deployment \(d2\) has been "build: active" for 9 minutes/);
  assert.equal(evaluateDeploys([dep("d3", "production", "success", 600), dep("d4", "preview", "failure", 600)], null, NOW).state, "ok", "finished deployments, however old, are fine");
});

test("deploy rules: production must match main's head within 20 minutes", () => {
  const head = (m, sha = "bbbbbbb2222") => ({ sha, at: new Date(NOW - m * 60000).toISOString() });
  assert.equal(evaluateDeploys([dep("p", "production", "success", 40, "aaaaaaa1111")], head(10), NOW).state, "ok", "head is 10 minutes old: still building");
  assert.equal(evaluateDeploys([dep("p", "production", "success", 40, "aaaaaaa1111")], head(25), NOW).problems[0].kind, "behind");
  assert.equal(evaluateDeploys([dep("p", "production", "success", 10, "bbbbbbb2222")], head(25), NOW).state, "ok", "production is on head");
  assert.equal(evaluateDeploys([dep("p", "production", "failure", 10, "bbbbbbb2222")], head(25), NOW).problems[0].kind, "failed");
  assert.equal(evaluateDeploys([dep("p2", "production", "success", 5, "ccccccc"), dep("p1", "production", "failure", 20, "bbbbbbb2222")], null, NOW).state, "ok", "a newer success supersedes an older failure");
  assert.equal(evaluateDeploys([dep("p1", "production", "failure", 600, "bbbbbbb2222")], null, NOW).state, "ok", "an old failure is not re-reported forever");
  assert.equal(evaluateDeploys([dep("p", "production", "success", 40, "aaaaaaa1111")], null, NOW).state, "ok", "head unknown: no judgement");
});

test("checkDeploys degrades to 'not configured' without a token or permission, never throws", async () => {
  assert.equal((await checkDeploys({ token: "", accountId: "a" })).state, "not_configured");
  const f = (status, body = {}) => async () => new Response(JSON.stringify(body), { status });
  const denied = await checkDeploys({ token: "t", accountId: "a", fetchFn: f(403) });
  assert.equal(denied.state, "not_configured"); assert.match(denied.why, /Account > Cloudflare Pages > Read/);
  assert.equal((await checkDeploys({ token: "t", accountId: "a", fetchFn: f(500) })).state, "unknown");
  assert.equal((await checkDeploys({ token: "t", accountId: "a", fetchFn: async () => { throw new Error("net"); } })).state, "unknown");
  const seen = []; const ok = await checkDeploys({ token: "tok", accountId: "acc", now: NOW, fetchFn: async (u, i) => { seen.push([String(u), i]); return new Response(JSON.stringify({ result: [dep("x", "production", "active", 12)] })); } });
  assert.equal(ok.state, "stalled"); assert.match(seen[0][0], /accounts\/acc\/pages\/projects\/socal-lights\/deployments/); assert.equal(seen[0][1].method, undefined, "GET only");
});

// ---------- backup restore test ----------
test("verifyDump: a D1-style export restores; a broken or tiny one is rejected; rows are never printed", () => {
  const good = "PRAGMA defer_foreign_keys=TRUE;\nCREATE TABLE events(id TEXT PRIMARY KEY, name TEXT);\nCREATE TABLE users(id TEXT, email TEXT);\nCREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);\nINSERT INTO \"events\" VALUES('e1','Secret Street');\nINSERT INTO \"users\" VALUES('u1','a@b.com');\nINSERT INTO \"d1_migrations\" VALUES(1,'0001.sql');\n";
  const r = verifyDump(good, { tables: 3, events: 1, migrations: 1 });
  assert.equal(r.ok, false, "posts, contests and feature_orders are missing"); assert.ok(r.problems.some((p) => /table posts is missing/.test(p)));
  const full = good + "CREATE TABLE posts(id); CREATE TABLE contests(id); CREATE TABLE feature_orders(id);";
  const ok = verifyDump(full, { tables: 3, events: 1, migrations: 1 });
  assert.equal(ok.ok, true); assert.equal(ok.counts.events, 1);
  assert.doesNotMatch(JSON.stringify(ok), /Secret Street|a@b\.com/);
  assert.equal(verifyDump(full, { events: 500 }).ok, false);
  const bad = verifyDump("CREATE TABLE events(id; INSERT INTO oops 'secret value'", {});
  assert.equal(bad.ok, false); assert.match(bad.problems[0], /does not load/); assert.doesNotMatch(bad.problems[0], /secret value/);
});

// ---------- bad webhook signatures ----------
test("webhook: a bad signature is filed once an hour per cause, masked, and still answers 400", async () => {
  const { env, raw } = newEnv();
  const e = stripeEvent("checkout.session.completed", session());
  for (let i = 0; i < 3; i++) assert.equal((await sendWebhook(webhook, env, e, { secret: "whsec_wrong" })).status, 400);
  let rows = raw.prepare("SELECT kind, detail FROM ops_log").all();
  assert.equal(rows.length, 1, "deduped"); assert.equal(rows[0].kind, "webhook"); assert.match(rows[0].detail, /signature does not match.*STRIPE_WEBHOOK_SECRET/);
  assert.doesNotMatch(JSON.stringify(rows), /whsec_|t=\d|v1=/);
  await sendWebhook(webhook, env, e, { header: null });
  await sendWebhook(webhook, { ...env, STRIPE_WEBHOOK_SECRET: "" }, e);
  await sendWebhook(webhook, env, e, { t: Math.floor(Date.now() / 1000) - 900 });
  rows = raw.prepare("SELECT detail FROM ops_log ORDER BY id").all().map((r) => r.detail);
  assert.equal(rows.length, 4);
  assert.ok(rows.some((d) => /no stripe-signature header/.test(d)) && rows.some((d) => /is not set/.test(d)) && rows.some((d) => /5 minutes off/.test(d)));
  raw.prepare("UPDATE ops_log SET created_at = datetime('now','-2 hours')").run();
  await sendWebhook(webhook, env, e, { secret: "whsec_wrong" });
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM ops_log").get().n, 5, "filed again after the hour");
  assert.equal((await sendWebhook(webhook, env, stripeEvent("customer.created", {}))).status, 200, "a good signature is unaffected");
});

test("logOpOnce never throws and dedupes on kind plus detail", async () => {
  const { env, raw } = newEnv();
  assert.equal(await logOpOnce(env, "x", "same", 60), true); assert.equal(await logOpOnce(env, "x", "same", 60), false); assert.equal(await logOpOnce(env, "x", "other", 60), true);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM ops_log").get().n, 2);
  await logOpOnce({ DB: null }, "x", "y");
});

test("preview safety: TURNSTILE_REQUIRED makes a missing secret fail closed; production behaviour is unchanged", async () => {
  assert.equal(await verifyTurnstile({}, "", ""), true, "local dev: no secret, allowed");
  assert.equal(await verifyTurnstile({ TURNSTILE_REQUIRED: "1" }, "tok", ""), false, "preview: no secret, refused");
  assert.equal(await verifyTurnstile({ TURNSTILE_REQUIRED: "1", TURNSTILE_SECRET: "s" }, "", ""), false, "a secret and no token is still refused");
});

// ---------- Stripe reconcile ----------
const ago = (min) => Math.floor((Date.now() - min * 60000) / 1000);
const cs = (id, o = {}) => ({ id, mode: "payment", status: "complete", payment_status: "paid", amount_total: 1500, currency: "usd", payment_intent: "pi_" + id, created: ago(120), metadata: { event_id: "ev1", plan: "top" }, ...o });
const orderRow = (raw, sid, o = {}) => raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,payment_intent,currency,status,applied,created_at) VALUES (?,?,?,?,?,?,?,?,?,datetime('now',?))").run(sid, o.event ?? "ev1", "top", o.amount ?? 1500, "b@x.com", "pi_" + sid, "usd", o.status ?? "paid", o.applied ?? 1, o.age ?? "-2 hours");

function stripeStub(pages) { // pages: { sessions: [pageObj...], intents: [...] } answered in order; { status } objects answer an error
  const seen = []; const idx = { s: 0, p: 0 };
  const f = stubFetch((url) => {
    const u = String(url); seen.push(u);
    const key = /checkout\/sessions/.test(u) ? "sessions" : "intents", i = key === "sessions" ? "s" : "p";
    const page = pages[key][idx[i]++] || { data: [], has_more: false };
    return page.status ? new Response("{}", { status: page.status }) : new Response(JSON.stringify(page), { status: 200 });
  });
  return { calls: f.calls, seen, restore: f.restore };
}

test("reconcile compare: unrecorded, unapplied, amount and unknown are found; fine orders and recent ones are not", () => {
  const sessions = [cs("cs_ok"), cs("cs_missing"), cs("cs_new", { created: ago(5) }), cs("cs_other", { metadata: {} }), cs("cs_unpaid", { payment_status: "unpaid" }), cs("cs_setup", { mode: "setup" }), cs("cs_stuck"), cs("cs_amt", { amount_total: 2500 })];
  const orders = [{ session_id: "cs_ok", payment_intent: "pi_cs_ok", status: "paid", applied: 1, event_id: "ev1", amount: 1500, created_at: "2026-11-01 00:00:00" }, { session_id: "cs_stuck", payment_intent: "pi_cs_stuck", status: "paid", applied: 0, event_id: "ev1", plan: "top", amount: 1500, created_at: "2026-11-01 00:00:00" }, { session_id: "cs_amt", payment_intent: "pi_cs_amt", status: "paid", applied: 1, event_id: "ev1", amount: 1500, created_at: "2026-11-01 00:00:00" }];
  const kinds = compare({ sessions, orders }, Date.now()).map((f) => `${f.kind}:${f.id}`).sort();
  assert.deepEqual(kinds, ["amount:cs_amt", "unapplied:cs_stuck", "unknown:cs_other", "unrecorded:cs_missing"]);
});

test("reconcile: one step makes at most 2 Stripe calls, reads only (GET), reports a missing order, logs it to ops_log once and records the heartbeat", async () => {
  const { env, raw } = newEnv(); orderRow(raw, "cs_ok");
  const s = stripeStub({ sessions: [{ data: [cs("cs_ok"), cs("cs_missing")], has_more: false }], intents: [{ data: [], has_more: false }] });
  try {
    const r = await reconcileStep(env);
    assert.equal(r.done, true); assert.equal(r.status, "ok"); assert.equal(r.findings.length, 1); assert.equal(r.findings[0].kind, "unrecorded");
    assert.equal(s.calls.length, 2); assert.ok(s.calls.every((c) => (c.init.method || "GET") === "GET"), "read-only");
    assert.match(s.seen[0], /limit=10/); assert.match(s.seen[0], /created\[gte\]=/);
    assert.match(s.calls[0].init.headers.authorization, /^Bearer sk_test_fake$/);
  } finally { s.restore(); }
  const ops = raw.prepare("SELECT kind, detail FROM ops_log").all();
  assert.equal(ops.length, 1); assert.equal(ops[0].kind, "reconcile"); assert.match(ops[0].detail, /cs_missing/);
  assert.equal(raw.prepare("SELECT last_status FROM job_heartbeats WHERE job = 'stripe-reconcile'").get().last_status, "ok");
  assert.match(reconcileLines(await readState(env))[0], /Paid in Stripe but no order recorded/);
});

test("reconcile: pages across calls with a cursor, and a payment intent already explained by its session is not listed twice", async () => {
  const { env } = newEnv();
  const s = stripeStub({ sessions: [{ data: [cs("cs_a")], has_more: true }, { data: [cs("cs_b")], has_more: false }], intents: [{ data: [{ id: "pi_cs_a", status: "succeeded", created: ago(3000), amount: 1500, metadata: {} }], has_more: false }] });
  try {
    const r1 = await reconcileStep(env); assert.equal(r1.done, false);
    const st = await readState(env); assert.equal(st.pass.s.cur, "cs_a"); assert.equal(st.pass.p.done, true);
    const r2 = await reconcileStep(env); assert.equal(r2.done, true);
    assert.match(s.seen[2], /starting_after=cs_a/);
    assert.equal(s.calls.length, 3, "the finished list is not read again");
    assert.deepEqual(r2.findings.map((f) => f.id).sort(), ["cs_a", "cs_b"], "pi_cs_a is covered by cs_a");
  } finally { s.restore(); }
});

test("reconcile: a restricted key without permission, no key, and a Stripe outage all degrade without throwing", async () => {
  const { env } = newEnv();
  let s = stripeStub({ sessions: [{ status: 403 }], intents: [] });
  try { const r = await reconcileStep(env); assert.equal(r.done, true); assert.equal(r.status, "not_permitted"); assert.equal(s.calls.length, 1); } finally { s.restore(); }
  assert.match(reconcileLines(await readState(env))[0], /lacks read permission/);
  const none = await reconcileStep({ ...env, STRIPE_SECRET_KEY: "" }); assert.equal(none.status, "not_configured");
  s = stripeStub({ sessions: [{ status: 500 }], intents: [] });
  try { const r = await reconcileStep(env); assert.equal(r.done, false); assert.match(r.error, /500/); } finally { s.restore(); }
});

test("/api/stripe-reconcile: key required; answers counts and kinds only", async () => {
  const { env } = newEnv();
  assert.equal((await call(reconcileApi, env, "/api/stripe-reconcile", { method: "POST" })).status, 401);
  const s = stripeStub({ sessions: [{ data: [cs("cs_x")], has_more: false }], intents: [{ data: [], has_more: false }] });
  try {
    const body = await (await call(reconcileApi, env, "/api/stripe-reconcile", withKey("POST"))).json();
    assert.deepEqual({ done: body.done, status: body.status, found: body.found, kinds: body.kinds }, { done: true, status: "ok", found: 1, kinds: ["unrecorded"] });
    assert.doesNotMatch(JSON.stringify(body), /cs_x|sk_test/);
  } finally { s.restore(); }
});

// ---------- digest ----------
async function runDigest(env) {
  const f = stubFetch(() => new Response("{}", { status: 200 }));
  try {
    env.DB.stats.reset();
    const res = await digest({ request: new Request("https://x.test/api/admin-digest", { method: "POST", headers: { "x-alert-key": KEY } }), env: { ...env, ALERT_CRON_KEY: KEY, RESEND_API_KEY: "re_fake" } });
    const sent = f.calls.find((c) => /resend/.test(c.url));
    return { body: await res.json(), text: sent ? JSON.parse(sent.init.body).text : "", subject: sent ? JSON.parse(sent.init.body).subject : "", calls: env.DB.stats.calls };
  } finally { f.restore(); }
}

test("digest: names the stale job with hours and cadence, the Stripe findings and the webhook problem; stays well under 50 calls", async () => {
  const { env, raw } = newEnv(); setAll(raw, 1);
  raw.prepare("UPDATE job_heartbeats SET last_at = ? WHERE job = 'backup'").run(hoursAgo(31));
  const s = stripeStub({ sessions: [{ data: [cs("cs_gone")], has_more: false }], intents: [{ data: [], has_more: false }] });
  try { await reconcileStep(env); } finally { s.restore(); }
  await logOpOnce(env, "webhook", "Stripe webhook rejected: signature does not match", 60);
  const r = await runDigest(env);
  assert.match(r.text, /Scheduled jobs and deploys/);
  assert.match(r.text, /STALE: Nightly backup: last ran 31 hours ago \(expected every day, flagged after 30 hours\)/);
  assert.match(r.text, /STRIPE: Paid in Stripe but no order recorded: session cs_gone/);
  assert.match(r.text, /Deploy check not set up: add "Account > Cloudflare Pages > Read"/);
  assert.match(r.text, /STRIPE_WEBHOOK_SECRET is wrong/);
  assert.match(r.subject, /STALE JOBS, STRIPE MISMATCH/); assert.equal((r.text.match(/session cs_gone/g) || []).length, 1, "listed once"); assert.deepEqual(r.body.stale, ["backup"]); assert.equal(r.body.deploy, "not_configured");
  assert.ok(r.calls < 50, `digest made ${r.calls} database calls`);
});

test("digest: a stalled deploy is reported with the fix; a healthy system adds no section", async () => {
  const { env, raw } = newEnv(); setAll(raw, 1);
  let r = await runDigest({ ...env, CF_ACCOUNT_ID: "acc", CF_ANALYTICS_TOKEN: "tok" });
  assert.doesNotMatch(r.text, /DEPLOY STALLED/);
  const real = globalThis.fetch;
  globalThis.fetch = async (u) => /cloudflare\.com.*pages/.test(String(u)) ? new Response(JSON.stringify({ result: [{ id: "deadbeef0000", environment: "preview", created_on: new Date(Date.now() - 15 * 60000).toISOString(), latest_stage: { name: "deploy", status: "active" } }] })) : new Response("{}", { status: 200 });
  try {
    const env2 = { ...env, ALERT_CRON_KEY: KEY, RESEND_API_KEY: "re_fake", CF_ACCOUNT_ID: "acc", CF_ANALYTICS_TOKEN: "tok" };
    const sent = []; const inner = globalThis.fetch; globalThis.fetch = async (u, i) => { if (/resend/.test(String(u))) { sent.push(JSON.parse(i.body)); return new Response("{}"); } return inner(u, i); };
    await digest({ request: new Request("https://x.test/api/admin-digest", { method: "POST", headers: { "x-alert-key": KEY } }), env: env2 });
    assert.match(sent[0].text, /DEPLOY STALLED: A preview deployment \(deadbeef\) has been "deploy: active" for 15 minutes/);
    assert.match(sent[0].text, /cancel the stuck one, then retry the production deployment/);
  } finally { globalThis.fetch = real; }
});
