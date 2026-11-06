// Alerting: a failed email is logged and never marked as sent; the admin digest reports what failed.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as alertsSend } from "../functions/api/alerts/send.js";
import { onRequestPost as digest } from "../functions/api/admin-digest.js";
import { sendMail } from "../functions/_lib/auth.js";
import { logOp, opsSince } from "../functions/_lib/oplog.js";
import { newEnv, stubFetch, addEvent, ptToday } from "./_pay.mjs";

const KEY = "alert-key-0123456789";
const post = (h, env, path = "/api/alerts/send") => h({ request: new Request("https://x.test" + path, { method: "POST", headers: { "x-alert-key": KEY } }), env: { ...env, ALERT_CRON_KEY: KEY } });
const sub = (raw, id, email) => raw.prepare("INSERT INTO alert_subs (id,email,city,lat,lng,radius,token,confirmed) VALUES (?,?,?,?,?,?,?,1)").run(id, email, "Pasadena", 34, -118, 25, "tok_" + id);

test("sendMail: a rejected or unreachable mail service returns false and is logged without the address", async () => {
  const { env } = newEnv({ RESEND_API_KEY: "re_fake" });
  let f = stubFetch(() => new Response('{"message":"quota"}', { status: 429 }));
  try { assert.equal(await sendMail(env, { to: "someone@example.com", subject: "s", text: "t", tag: "judge_invite" }), false); } finally { f.restore(); }
  f = stubFetch(() => { throw new Error("network down"); });
  try { assert.equal(await sendMail(env, { to: "someone@example.com", subject: "s", text: "t" }), false); } finally { f.restore(); }
  const g = await opsSince(env, "2000-01-01 00:00:00");
  assert.equal(g.length, 1); assert.equal(g[0].kind, "email"); assert.equal(g[0].n, 2);
  assert.doesNotMatch(JSON.stringify(g), /someone@example\.com/);
});

test("logOp strips email addresses and never throws", async () => {
  const { env } = newEnv();
  await logOp(env, "x", "failed for a@b.co today");
  assert.equal((await opsSince(env, "2000-01-01 00:00:00"))[0].example, "failed for [email] today");
  await logOp({ DB: null }, "x", "ignored");
});

test("weekly alerts: failed sends are not marked as sent and are retried", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_fake" }); addEvent(raw);
  sub(raw, "s1", "a@example.com"); sub(raw, "s2", "b@example.com");
  let ok = false;
  const f = stubFetch(() => (ok ? new Response("{}", { status: 200 }) : new Response("{}", { status: 500 })));
  try {
    let r = await (await post(alertsSend, env)).json();
    assert.equal(r.sent, 0); assert.equal(r.failed, 2); assert.equal(r.remaining, 2);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM alert_subs WHERE last_sent IS NOT NULL").get().n, 0);
    ok = true;
    r = await (await post(alertsSend, env)).json();
    assert.equal(r.sent, 2); assert.equal(r.failed, 0); assert.equal(r.remaining, 0);
  } finally { f.restore(); }
});

test("digest: failures since the last update appear at the top of the email", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_fake" }); addEvent(raw);
  await logOp(env, "webhook", "charge.refunded evt_1: boom"); await logOp(env, "email", "alerts_weekly: mail service answered 500");
  const f = stubFetch(() => new Response("{}", { status: 200 }));
  try {
    const res = await post(digest, env, "/api/admin-digest");
    const body = await res.json(); assert.equal(body.problems, 2);
    const sent = JSON.parse(f.calls.find((c) => /resend/.test(c.url)).init.body);
    assert.match(sent.text, /Problems the site noticed \(2\)/); assert.match(sent.text, /Stripe webhook errors/); assert.match(sent.text, /emails that failed to send/);
    assert.match(sent.subject, /PROBLEMS/);
  } finally { f.restore(); }
});
