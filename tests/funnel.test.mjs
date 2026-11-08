// Funnel counters: allowlisted client keys, capped page names, server-side completion counts, dashboard and digest.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as visit } from "../functions/api/visit.js";
import { onRequestPost as subscribe } from "../functions/api/alerts/index.js";
import { onRequestGet as confirm } from "../functions/api/alerts/confirm.js";
import { onRequestPost as digest } from "../functions/api/admin-digest.js";
import { onRequestGet as dashboard } from "../functions/api/admin/dashboard.js";
import { funnelCounts, dayKey } from "../functions/_lib/funnel.js";
import { startSession } from "../functions/_lib/auth.js";
import { newEnv, stubFetch, addEvent } from "./_pay.mjs";

const post = (env, body) => visit({ request: new Request("https://x.test/api/visit", { method: "POST", body: JSON.stringify(body) }), env });
const n = (raw, page) => (raw.prepare("SELECT n FROM site_hits WHERE day = ? AND page = ?").get(dayKey(), page) || {}).n || 0;

test("client funnel keys are counted; unknown keys and fake page names are not", async () => {
  const { env, raw } = newEnv();
  for (const k of ["fn:visit", "fn:event-open", "fn:event-open", "fn:signin-open"]) await post(env, { k });
  await post(env, { k: "fn:signin-done" }); // server-only step: not accepted from a browser
  await post(env, { k: "fn:made-up" });
  assert.equal(n(raw, "fn:event-open"), 2); assert.equal(n(raw, "fn:visit"), 1); assert.equal(n(raw, "fn:signin-open"), 1);
  assert.equal(n(raw, "fn:signin-done"), 0); assert.equal(n(raw, "fn:made-up"), 0);
});

test("page names: the same page keeps counting, but a day cannot grow without limit", async () => {
  const { env, raw } = newEnv();
  for (let i = 0; i < 100; i++) await post(env, { p: "/junk" + i });
  const distinct = raw.prepare("SELECT COUNT(*) AS c FROM site_hits WHERE day = ?").get(dayKey()).c;
  assert.ok(distinct <= 80, "distinct " + distinct);
  await post(env, { p: "/junk0" }); assert.equal(n(raw, "junk0"), 2);
});

test("sign-in completion and weekly-email sign-up are counted on the server", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('u1','a@x.com','')").run();
  await startSession(env, new Request("https://x.test/"), "u1");
  assert.equal(n(raw, "fn:signin-done"), 1);
  const f = stubFetch(() => new Response("{}", { status: 200 }));
  try {
    const go = () => subscribe({ request: new Request("https://x.test/api/alerts", { method: "POST", body: JSON.stringify({ email: "w@x.com", city: "Pasadena", radius: 10, consent: true }) }), env: { ...env, RESEND_API_KEY: "re_fake" } });
    assert.equal((await go()).status, 200); await go();
    assert.equal(n(raw, "fn:subscribe"), 1, "a repeat sign-up is not counted twice");
  } finally { f.restore(); }
  const tok = raw.prepare("SELECT token FROM alert_subs").get().token;
  const c = () => confirm({ request: new Request("https://x.test/api/alerts/confirm?t=" + tok), env });
  await c(); await c(); assert.equal(n(raw, "fn:subscribe-confirm"), 1);
});

test("dashboard and digest show the funnel and leave funnel keys out of page views", async () => {
  const { env, raw } = newEnv();
  await post(env, { k: "fn:event-open" }); await post(env, { p: "/tutorials" });
  const d = await (await dashboard({ env })).json();
  assert.equal(d.funnel.counts["fn:event-open"].today, 1);
  assert.deepEqual(d.trends.topPages.map((p) => p.page), ["tutorials"]);
  const f = stubFetch(() => new Response("{}", { status: 200 }));
  try {
    await digest({ request: new Request("https://x.test/api/admin-digest", { method: "POST", headers: { "x-alert-key": "digest-key-0123456789" } }), env: { ...env, ALERT_CRON_KEY: "digest-key-0123456789", RESEND_API_KEY: "re_fake" } });
    const text = JSON.parse(f.calls.find((c) => /resend/.test(c.url)).init.body).text;
    assert.match(text, /How people used the site/); assert.match(text, /Opened an event card: 1 today/);
  } finally { f.restore(); }
  assert.deepEqual((await funnelCounts(env))["fn:visit"], { today: 0, week: 0 });
});
