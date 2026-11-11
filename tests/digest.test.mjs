// Payments: the admin digest reports orders that need the owner, and says nothing extra when there are none.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as digest } from "../functions/api/admin-digest.js";
import { newEnv, stubFetch, addEvent, ptToday } from "./_pay.mjs";

const KEY = "digest-key-0123456789";
async function run(env) {
  const f = stubFetch(() => new Response("{}", { status: 200 }));
  try {
    const res = await digest({ request: new Request("https://x.test/api/admin-digest", { method: "POST", headers: { "x-alert-key": KEY } }), env: { ...env, ALERT_CRON_KEY: KEY, RESEND_API_KEY: "re_fake" } });
    const sent = f.calls.find((c) => /resend/.test(c.url));
    return { status: res.status, body: await res.json(), text: sent ? JSON.parse(sent.init.body).text : "" };
  } finally { f.restore(); }
}
const order = (raw, sid, ev, st, o = {}) => raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,payment_intent,currency,status,applied,applied_featured,applied_until,note,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now',?))")
  .run(sid, ev, "top", 1500, "b@x.com", "pi_" + sid, "usd", st, o.applied ?? 1, 2, o.until ?? ptToday(20), o.note ?? null, o.age ?? "-1 day");

test("digest: no payment section and the usual content when nothing needs the owner", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  order(raw, "fine", "ev1", "paid");
  const r = await run(env);
  assert.equal(r.status, 200); assert.equal(r.body.sent, true);
  assert.match(r.text, /Nothing new since the last update/);
  assert.doesNotMatch(r.text, /Payments that need you/);
  assert.match(r.text, /Right now/);
});

test("digest: lists refunds due, disputes, unapplied, mismatched and cancelled-event placements", async () => {
  const { env, raw } = newEnv(); addEvent(raw); addEvent(raw, "gone", { notice: "postponed" });
  order(raw, "fine", "ev1", "paid");
  order(raw, "due", "ev1", "refund_due"); order(raw, "disp", "ev1", "disputed"); order(raw, "held", "ev1", "held");
  order(raw, "stuck", "ev1", "paid", { applied: 0, until: null, age: "-3 hours" });
  order(raw, "mm", "ev1", "paid", { note: "[auto] amount mismatch: paid 12.00 USD" });
  order(raw, "can", "gone", "paid");
  raw.exec("UPDATE feature_orders SET not_applied_notice_at = 'test'"); // the buyer notice is tested in order-notices.test.mjs; here only the admin digest is captured
  const r = await run(env);
  assert.match(r.text, /Payments that need you \(6\)/);
  for (const w of ["refund it in Stripe", "disputed", "partial refund", "paid but not applied", "amount differs", "cancelled or postponed"]) assert.match(r.text, new RegExp(w));
  assert.match(r.text, /Admin > Orders/);
  assert.match(r.text, /Light Show · top USD 15\.00/);
  assert.match(r.text, /Nothing new since the last update/, "the existing content is still there");
});

test("digest: still works when the orders table cannot be read, and refuses a wrong key", async () => {
  const { env, raw } = newEnv(); raw.exec("DROP TABLE feature_orders");
  assert.equal((await run(env)).body.sent, true);
  const res = await digest({ request: new Request("https://x.test/api/admin-digest", { method: "POST", headers: { "x-alert-key": "nope" } }), env: { ...env, ALERT_CRON_KEY: KEY } });
  assert.equal(res.status, 401);
});
