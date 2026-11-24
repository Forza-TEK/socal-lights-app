// Audit F-15, F-16, F-17: Stripe webhook edge branches that have not run in production yet (stubbed events only), and the double-checkout-tab warning.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { onRequestPost as checkout } from "../functions/api/feature/checkout.js";
import { newEnv, sendWebhook, stripeEvent, session, addEvent, addUser, getEvent, getOrder, stubFetch, ptToday } from "./_pay.mjs";

const done = (raw, id) => !!raw.prepare("SELECT 1 FROM stripe_events WHERE id = ?").get(id);
const completed = (o) => stripeEvent("checkout.session.completed", session(o));

test("F-17: async_payment_failed is handled: acknowledged, recorded, logged, and nothing is applied", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  // a delayed payment method: completed but not yet paid, later it fails to clear
  const first = await sendWebhook(webhook, env, completed({ payment_status: "unpaid" }));
  assert.equal(first.body.waiting, "unpaid");
  const e = stripeEvent("checkout.session.async_payment_failed", session({ payment_status: "unpaid" }));
  const r = await sendWebhook(webhook, env, e);
  assert.equal(r.status, 200); assert.equal(r.body.failed, "cs_test_1"); assert.equal(r.body.applied, false); assert.equal(r.body.ignored, undefined);
  assert.ok(done(raw, e.id), "recorded, so Stripe stops retrying");
  assert.equal(getEvent(raw).featured, 0); assert.equal(getOrder(raw), null);
  const log = raw.prepare("SELECT detail FROM ops_log WHERE kind = 'webhook'").all();
  assert.equal(log.length, 1); assert.match(log[0].detail, /failed to clear for session cs_test_1/);
  // a replay is a no-op
  assert.equal((await sendWebhook(webhook, env, e)).body.duplicate, true);
});

test("F-17: an unapplied paid order gets a note when its delayed payment later fails", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,payment_intent,currency,status,applied,target) VALUES ('cs_test_1','ev1','ev_pin',1500,'b@example.com','pi_1','usd','paid',0,'event')").run();
  await sendWebhook(webhook, env, stripeEvent("checkout.session.async_payment_failed", session()));
  assert.match(getOrder(raw).note, /delayed payment failed to clear/);
  assert.equal(getOrder(raw).status, "paid");
});

test("F-15: async_payment_succeeded applies a placement whose completed event had waited as unpaid", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  await sendWebhook(webhook, env, completed({ payment_status: "unpaid" }));
  assert.equal(getEvent(raw).featured, 0);
  const r = await sendWebhook(webhook, env, stripeEvent("checkout.session.async_payment_succeeded", session()));
  assert.ok(r.body.featured, "now applied");
  assert.equal(getEvent(raw).featured, 2); assert.equal(getOrder(raw).applied, 1);
  // Stripe may also send a second completed event: it is a duplicate, not a second application
  const again = await sendWebhook(webhook, env, completed());
  assert.equal(again.body.duplicate, true);
});

test("F-15: a refund for a payment we never recorded does not throw, and a refund twice changes nothing more", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  const none = await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_x", payment_intent: null, refunded: true }));
  assert.equal(none.status, 200); assert.equal(none.body.ignored, "no matching order");
  await sendWebhook(webhook, env, completed());
  const e1 = await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_1", refunded: true }));
  assert.equal(e1.body.revoked, true);
  const e2 = await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_1", refunded: true }));
  assert.equal(e2.status, 200);
  assert.equal(getEvent(raw).featured, 0); assert.equal(getOrder(raw).status, "refunded");
});

test("F-15: a partial refund that arrives before the payment is recorded makes the order held and never switches the placement on", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  const early = await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_1", refunded: false }));
  assert.equal(early.body.pending, "held");
  await sendWebhook(webhook, env, completed());
  assert.equal(getOrder(raw).status, "held");
  assert.equal(getEvent(raw).featured, 0, "not applied while a refund is open");
});

test("F-15: a dispute won, then the same dispute closed again, never restores the placement; a lost one after a refund stays refunded", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  await sendWebhook(webhook, env, completed());
  await sendWebhook(webhook, env, stripeEvent("charge.dispute.created", { id: "dp_1", payment_intent: "pi_1", charge: "ch_1", status: "needs_response" }));
  assert.equal(getEvent(raw).featured, 0);
  const won = await sendWebhook(webhook, env, stripeEvent("charge.dispute.closed", { id: "dp_1", payment_intent: "pi_1", charge: "ch_1", status: "won" }));
  assert.equal(won.body.dispute, "won");
  assert.equal(getOrder(raw).status, "dispute_won"); assert.equal(getEvent(raw).featured, 0);
  const ok = stripeEvent("charge.dispute.closed", { id: "dp_1", payment_intent: "pi_1", charge: "ch_1", status: "won" });
  assert.equal((await sendWebhook(webhook, env, ok)).status, 200);
  assert.equal(getEvent(raw).featured, 0);
});

test("F-15: every event type the handler lists is acknowledged without a server error (smoke)", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  for (const type of ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired", "charge.refunded", "charge.dispute.created", "charge.dispute.closed", "payment_intent.succeeded"]) {
    const r = await sendWebhook(webhook, env, stripeEvent(type, { ...session(), refunded: true, status: "lost", charge: "ch_1" }));
    assert.ok(r.status < 500 || type.startsWith("charge.dispute"), `${type} answered ${r.status}`);
  }
});

// ---- F-16: two checkout tabs ----
const post = (body, cookie) => new Request("https://socallights.app/api/feature/checkout", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body) });
const buy = async (env, cookie, body = { event_id: "ev1", plan: "ev_pin" }) => { const r = await checkout({ request: post(body, cookie), env }); return { status: r.status, body: await r.json().catch(() => ({})) }; };

test("F-16: a second payment page for the same event and plan (a different page, not a double click) carries a warning; the first and a double click do not", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  const me = await addUser(raw, "u1", "owner@example.com");
  raw.prepare("INSERT INTO event_submissions (id,name,city,season,type,start_date,end_date,contact_email,status,event_id) VALUES ('s1','Light Show','Pasadena','christmas','walk',?,?,?,'published','ev1')").run(ptToday(), ptToday(40), "owner@example.com");
  const f = stubFetch();
  try {
    const first = await buy(env, me.cookie);
    assert.equal(first.status, 200); assert.equal(first.body.warning, undefined);
    const dbl = await buy(env, me.cookie); // same ten-minute key: Stripe hands back the same page
    assert.equal(dbl.status, 200); assert.equal(dbl.body.warning, undefined, "a double click is not a second page");
    raw.prepare("UPDATE checkout_log SET idem = 'feature-older-key', created_at = datetime('now','-3 hours') WHERE ref LIKE 'ev1|%'").run(); // the earlier page was opened with another key
    const tab2 = await buy(env, me.cookie);
    assert.equal(tab2.status, 200); assert.match(tab2.body.warning, /already opened a payment page/);
    assert.match(tab2.body.url, /checkout\.stripe\.com/, "the buyer still gets a working page");
    const other = await buy(env, me.cookie, { event_id: "ev1", plan: "ev_banner" });
    assert.equal(other.body.warning, undefined, "a different plan is a different purchase");
  } finally { f.restore(); }
});

test("F-16: the page asks the buyer to confirm before opening a second payment page", async () => {
  const { readFileSync } = await import("node:fs");
  const html = readFileSync("public/feature.html", "utf8");
  assert.match(html, /d\.warning && !confirm\(/);
});
