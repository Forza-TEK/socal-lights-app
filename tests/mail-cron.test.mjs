// The Cloudflare cron Worker (workers/mail-cron): the clock for every scheduled job that only needs to call the site. Nothing real is called: fetch is stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker, { run, runJob, JOBS, CRONS } from "../workers/mail-cron/index.js";
import { JOBS as HEARTBEAT_JOBS } from "../functions/_lib/heartbeat.js";

const KEY = "k".repeat(24);
const stub = (answers) => {
  const calls = []; const real = globalThis.fetch; let n = 0;
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url).replace("https://socal-lights.pages.dev", ""), key: init && init.headers["x-alert-key"], method: init && init.method }); const a = answers[Math.min(n++, answers.length - 1)]; if (a instanceof Error) throw a; return new Response(JSON.stringify(a.body ?? {}), { status: a.status ?? 200 }); };
  return { calls, restore: () => { globalThis.fetch = real; } };
};
const path = (c) => c.url;

test("mail outbox: drains until empty, then reports ok, with the key on every call", async () => {
  const s = stub([{ body: { remaining: 60, progress: true } }, { body: { remaining: 20, progress: true } }, { body: { remaining: 0, progress: true } }, { status: 200 }]);
  try {
    assert.equal(await run({ ALERT_CRON_KEY: KEY }), "ok");
    assert.deepEqual(s.calls.map(path), ["/api/mail/drain", "/api/mail/drain", "/api/mail/drain", "/api/heartbeat?job=mail-outbox&status=ok"]);
    assert.ok(s.calls.every((c) => c.key === KEY && c.method === "POST"));
  } finally { s.restore(); }
});

test("mail outbox: an empty queue is one call; no progress stops; a refusal, a network error or the 8-call cap behave", async () => {
  let s = stub([{ body: { remaining: 0, progress: false } }, {}]);
  try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "mail-outbox"), "ok"); assert.equal(s.calls.length, 2); } finally { s.restore(); }
  s = stub([{ body: { remaining: 5, progress: false } }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "mail-outbox"), "ok"); assert.equal(s.calls.length, 2); } finally { s.restore(); }
  s = stub([{ status: 401, body: { error: "no" } }, {}]); try { assert.equal(await runJob({}, "mail-outbox"), "fail"); assert.match(s.calls.at(-1).url, /status=fail/); } finally { s.restore(); }
  s = stub([new Error("network"), {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "mail-outbox"), "fail"); } finally { s.restore(); }
  s = stub([{ body: { remaining: 999, progress: true } }]); try { await runJob({ ALERT_CRON_KEY: KEY }, "mail-outbox"); assert.equal(s.calls.length, 9, "8 drains and a heartbeat"); } finally { s.restore(); }
});

test("usage check: asks with notify=1, ok for a real level, fail for anything else", async () => {
  let s = stub([{ body: { level: "watch" } }, {}]);
  try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "usage-check"), "ok"); assert.deepEqual(s.calls.map(path), ["/api/usage-check?notify=1", "/api/heartbeat?job=usage-check&status=ok"]); } finally { s.restore(); }
  s = stub([{ body: { level: "weird" } }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "usage-check"), "fail"); } finally { s.restore(); }
  s = stub([{ status: 500 }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "usage-check"), "fail"); } finally { s.restore(); }
});

test("stripe reconcile: repeats until done, fails on an error status or a refusal, gives up after 12 calls", async () => {
  let s = stub([{ body: { done: false } }, { body: { done: true } }, {}]);
  try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "stripe-reconcile"), "ok"); assert.deepEqual(s.calls.map(path), ["/api/stripe-reconcile", "/api/stripe-reconcile", "/api/heartbeat?job=stripe-reconcile&status=ok"]); } finally { s.restore(); }
  s = stub([{ body: { status: "error" } }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "stripe-reconcile"), "fail"); } finally { s.restore(); }
  s = stub([{ status: 503 }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "stripe-reconcile"), "fail"); } finally { s.restore(); }
  s = stub([{ body: { done: false } }]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "stripe-reconcile"), "fail"); assert.equal(s.calls.length, 13, "12 calls and a heartbeat"); } finally { s.restore(); }
});

test("sponsor renewals and contest reminders: ok only on the answers the old workflows accepted", async () => {
  let s = stub([{ body: { ok: true } }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "sponsor-renewals"), "ok"); } finally { s.restore(); }
  s = stub([{ body: { ok: false, note: "STRIPE_SECRET_KEY is not set" } }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "sponsor-renewals"), "fail"); } finally { s.restore(); }
  s = stub([{ body: { contests: 2 } }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "contest-reminders"), "ok"); assert.match(s.calls.at(-1).url, /job=contest-reminders&status=ok/); } finally { s.restore(); }
  s = stub([{ body: { error: "x" } }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "contest-reminders"), "fail"); } finally { s.restore(); }
  s = stub([{ body: { checked: 2, confirmed: 1, failed: 1 } }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "verify-events"), "ok"); assert.match(s.calls[0].url, /\/api\/verify-events$/); assert.match(s.calls.at(-1).url, /job=verify-events&status=ok/); } finally { s.restore(); }
  s = stub([{ body: { error: "x" } }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "verify-events"), "fail"); } finally { s.restore(); }
});

test("weekly lights email: batches until remaining is 0; an all-failed batch or a missing count is a failure", async () => {
  const fast = globalThis.setTimeout; globalThis.setTimeout = (f) => fast(f, 0);
  try {
    let s = stub([{ body: { sent: 40, failed: 0, remaining: 40 } }, { body: { sent: 40, failed: 0, remaining: 0 } }, {}]);
    try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "alerts"), "ok"); assert.equal(s.calls.filter((c) => c.url === "/api/alerts/send").length, 2); } finally { s.restore(); }
    s = stub([{ body: { sent: 0, failed: 3, remaining: 10 } }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "alerts"), "fail"); } finally { s.restore(); }
    s = stub([{ body: { hello: 1 } }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "alerts"), "fail"); } finally { s.restore(); }
  } finally { globalThis.setTimeout = fast; }
});

test("deploy watch: passes main's latest commit from GitHub to the site, still checks without it, ok for any answer the site gives (a stalled deploy is a finding), fail when the site does not answer", async () => {
  let s = stub([{ body: { sha: "a".repeat(40), commit: { committer: { date: "2026-11-12T10:00:00Z" } } } }, { body: { state: "stalled", problems: ["x"] } }, {}]);
  try {
    assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "deploy-watch"), "ok");
    assert.match(s.calls[0].url.replace("https://socal-lights.pages.dev", ""), /api\.github\.com\/repos\/Forza-TEK\/socal-lights-app\/commits\/main/);
    assert.match(s.calls[1].url, /^\/api\/deploy-check\?sha=a{40}&at=2026-11-12T10%3A00%3A00Z$/);
    assert.match(s.calls[2].url, /job=deploy-watch&status=ok/);
  } finally { s.restore(); }
  s = stub([new Error("github down"), { body: { state: "ok" } }, {}]);
  try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "deploy-watch"), "ok"); assert.equal(s.calls[1].url, "/api/deploy-check", "no head: still checks"); } finally { s.restore(); }
  s = stub([{ status: 500 }, { status: 500, body: {} }, {}]); try { assert.equal(await runJob({ ALERT_CRON_KEY: KEY }, "deploy-watch"), "fail"); } finally { s.restore(); }
});

test("wiring: every cron in wrangler.toml has jobs, every job has a heartbeat name the site knows, scheduled() runs the right ones, the deploy workflow sets the key", async () => {
  const toml = readFileSync("workers/mail-cron/wrangler.toml", "utf8");
  const listed = [...toml.match(/crons = \[(.*?)\]/s)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(listed.sort(), Object.keys(CRONS).sort(), "the cron list and the job table agree");
  for (const names of Object.values(CRONS)) for (const n of names) { assert.ok(JOBS[n], n + " has a job"); assert.ok(HEARTBEAT_JOBS[n], n + " reports to a heartbeat the site knows"); }
  const ran = [], s = stub([{ body: { remaining: 0, sent: 0, failed: 0 } }, {}]);
  try {
    worker.scheduled({ cron: "30 17 * * 4" }, { ALERT_CRON_KEY: KEY }, { waitUntil: (p) => ran.push(p) }); assert.equal(ran.length, 1); await ran[0];
    assert.match(s.calls[0].url, /\/api\/alerts\/send/); assert.match(s.calls[1].url, /job=alerts&status=ok/);
    const before = s.calls.length; worker.scheduled({ cron: "unknown" }, { ALERT_CRON_KEY: KEY }, { waitUntil: (p) => ran.push(p) }); await ran[1]; assert.equal(s.calls.length, before, "an unknown schedule runs nothing");
  } finally { s.restore(); }
  assert.equal(worker.fetch().status, 404);
  const wf = readFileSync(".github/workflows/deploy-mail-cron.yml", "utf8");
  assert.match(wf, /wrangler@4 deploy --config workers\/mail-cron\/wrangler\.toml/); assert.match(wf, /secret put ALERT_CRON_KEY/); assert.doesNotMatch(wf, /echo.*\$ALERT_CRON_KEY/, "the key is never printed");
});
