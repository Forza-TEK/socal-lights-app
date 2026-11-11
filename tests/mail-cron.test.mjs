// The Cloudflare cron Worker that keeps time for the mail outbox: it drains until empty or stuck, then reports to the heartbeat. Nothing real is called: fetch is stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker, { run } from "../workers/mail-cron/index.js";

const stub = (answers) => {
  const calls = []; const real = globalThis.fetch; let n = 0;
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), key: init && init.headers["x-alert-key"], method: init && init.method }); const a = answers[Math.min(n++, answers.length - 1)]; if (a instanceof Error) throw a; return new Response(JSON.stringify(a.body ?? {}), { status: a.status ?? 200 }); };
  return { calls, restore: () => { globalThis.fetch = real; } };
};
const KEY = "k".repeat(24);

test("drains until the queue is empty, then reports ok to the heartbeat, with the key on every call", async () => {
  const s = stub([{ body: { remaining: 60, progress: true } }, { body: { remaining: 20, progress: true } }, { body: { remaining: 0, progress: true } }, { status: 200 }]);
  try {
    assert.equal(await run({ ALERT_CRON_KEY: KEY }), "ok");
    assert.deepEqual(s.calls.map((c) => c.url.replace("https://socal-lights.pages.dev", "")), ["/api/mail/drain", "/api/mail/drain", "/api/mail/drain", "/api/heartbeat?job=mail-outbox&status=ok"]);
    assert.ok(s.calls.every((c) => c.key === KEY && c.method === "POST"));
  } finally { s.restore(); }
});

test("an empty queue is one call and a heartbeat; no progress stops the loop (retries wait their turn)", async () => {
  const s = stub([{ body: { remaining: 0, progress: false } }, { status: 200 }]);
  try { assert.equal(await run({ ALERT_CRON_KEY: KEY }), "ok"); assert.equal(s.calls.length, 2); } finally { s.restore(); }
  const t = stub([{ body: { remaining: 5, progress: false } }, { status: 200 }]);
  try { assert.equal(await run({ ALERT_CRON_KEY: KEY }), "ok"); assert.equal(t.calls.length, 2); } finally { t.restore(); }
});

test("a refused or broken drain reports fail; a network error reports fail too; the loop never runs past 8 calls", async () => {
  let s = stub([{ status: 401, body: { error: "Not allowed." } }, { status: 200 }]);
  try { assert.equal(await run({}), "fail"); assert.match(s.calls.at(-1).url, /status=fail/); } finally { s.restore(); }
  s = stub([new Error("network"), { status: 200 }]);
  try { assert.equal(await run({ ALERT_CRON_KEY: KEY }), "fail"); } finally { s.restore(); }
  s = stub([{ body: { remaining: 999, progress: true } }]);
  try { await run({ ALERT_CRON_KEY: KEY }); assert.equal(s.calls.length, 9, "8 drains and one heartbeat (the 50-call limit is far away)"); } finally { s.restore(); }
});

test("the Worker is wired as a cron: 5 minutes, a scheduled handler, and nothing answers web requests; the deploy workflow sets the key", async () => {
  assert.match(readFileSync("workers/mail-cron/wrangler.toml", "utf8"), /crons = \["\*\/5 \* \* \* \*"\]/);
  const ran = []; worker.scheduled({}, { ALERT_CRON_KEY: KEY }, { waitUntil: (p) => ran.push(p) }); assert.equal(ran.length, 1);
  const s = stub([{ body: { remaining: 0, progress: false } }, { status: 200 }]); try { await ran[0]; } finally { s.restore(); }
  assert.equal(worker.fetch().status, 404);
  const wf = readFileSync(".github/workflows/deploy-mail-cron.yml", "utf8");
  assert.match(wf, /wrangler@4 deploy --config workers\/mail-cron\/wrangler\.toml/); assert.match(wf, /secret put ALERT_CRON_KEY/); assert.doesNotMatch(wf, /echo.*\$ALERT_CRON_KEY/, "the key is never printed");
});
