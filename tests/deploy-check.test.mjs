// /api/deploy-check: the site-side deploy-stall check the Cloudflare cron Worker calls every 10 minutes. Cloudflare and the mail service are stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequest as deployCheck } from "../functions/api/deploy-check.js";
import { newEnv, stubFetch } from "./_pay.mjs";

const KEY = "k".repeat(24);
const mins = (n) => new Date(Date.now() - n * 60000).toISOString();
const dep = (o) => ({ id: "abcdef1234", environment: "preview", created_on: mins(2), latest_stage: { name: "build", status: "success" }, deployment_trigger: { metadata: { commit_hash: "1111111aaaa" } }, ...o });
const call = (env, qs = "", method = "POST", key = KEY) => deployCheck({ request: new Request("https://x.test/api/deploy-check" + qs, { method, headers: { "x-alert-key": key } }), env: { ...env, ALERT_CRON_KEY: KEY, CF_PAGES_TOKEN: "t".repeat(40), CF_ACCOUNT_ID: "acct", RESEND_API_KEY: "re_test_key_0123456789" } });
const stub = (deployments, status = 200) => stubFetch((url) => String(url).includes("api.cloudflare.com") ? new Response(JSON.stringify({ result: deployments }), { status }) : new Response(JSON.stringify({ id: "mail1" }), { status: 200 }));

test("needs the shared key; GET and POST only", async () => {
  const { env } = newEnv();
  assert.equal((await call(env, "", "POST", "short")).status, 401);
  assert.equal((await call(env, "", "PUT")).status, 405);
});

test("healthy deploys: state ok, nobody emailed", async () => {
  const { env } = newEnv(); const s = stub([dep({ environment: "production", latest_stage: { name: "deploy", status: "success" } })]);
  try { const j = await (await call(env)).json(); assert.deepEqual([j.state, j.notified, j.problems], ["ok", false, []]); assert.equal(s.calls.filter((c) => !c.url.includes("cloudflare")).length, 0, "no email"); } finally { s.restore(); }
});

test("a deployment stuck active is stalled: the owner is emailed once, and not again within 3 hours", async () => {
  const { env } = newEnv(); const s = stub([dep({ created_on: mins(15), latest_stage: { name: "build", status: "active" } })]);
  try {
    const a = await (await call(env)).json(); assert.deepEqual([a.state, a.notified, a.problems.length], ["stalled", true, 1]);
    const mails = () => s.calls.filter((c) => !c.url.includes("cloudflare")).length;
    assert.ok(mails() >= 1, "an email went out");
    const b = await (await call(env)).json(); assert.deepEqual([b.state, b.notified], ["stalled", false]);
  } finally { s.restore(); }
});

test("production behind main's latest commit is found when the Worker passes main's head; a bad head is ignored", async () => {
  const { env } = newEnv(); const prod = dep({ environment: "production", latest_stage: { name: "deploy", status: "success" }, deployment_trigger: { metadata: { commit_hash: "2222222bbbb" } } });
  let s = stub([prod]);
  try {
    const behind = await (await call(env, `?sha=${"3".repeat(40)}&at=${encodeURIComponent(mins(45))}`)).json(); assert.equal(behind.state, "stalled"); assert.match(behind.problems[0], /latest commit/);
    const junk = await (await call(env, "?sha=zzz&at=nope")).json(); assert.equal(junk.state, "ok", "without a usable head only the stuck and failed rules apply");
  } finally { s.restore(); }
});

test("a token that cannot read Pages is not_configured, and a Cloudflare error is unknown: neither emails anyone", async () => {
  const { env } = newEnv();
  let s = stub([], 403); try { const j = await (await call(env)).json(); assert.deepEqual([j.state, j.notified], ["not_configured", false]); } finally { s.restore(); }
  s = stub([], 500); try { const j = await (await call(env)).json(); assert.deepEqual([j.state, j.notified], ["unknown", false]); } finally { s.restore(); }
});
