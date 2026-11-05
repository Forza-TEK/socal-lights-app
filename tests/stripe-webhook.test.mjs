// Payments: the real Stripe webhook handler, signed like Stripe signs, against the in-memory D1 with every migration applied.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { applyPlan, verifyStripeSignature } from "../functions/_lib/featured.js";
import { rowToEvent } from "../functions/_lib/util.js";
import { newEnv, sign, stripeEvent, sendWebhook, session, addEvent, getEvent, getOrder, ptToday, freezeNow, stubFetch } from "./_pay.mjs";

const done = (raw, id) => !!raw.prepare("SELECT 1 FROM stripe_events WHERE id = ?").get(id);
const paidEvt = (o) => stripeEvent("checkout.session.completed", session(o));

test("signature: bad, stale and missing are 400; good passes", async () => {
  const { env } = newEnv();
  const e = paidEvt();
  assert.equal((await sendWebhook(webhook, env, e, { secret: "whsec_wrong" })).status, 400);
  assert.equal((await sendWebhook(webhook, env, e, { t: Math.floor(Date.now() / 1000) - 400 })).status, 400, "older than 5 minutes");
  assert.equal((await sendWebhook(webhook, env, e, { t: Math.floor(Date.now() / 1000) + 400 })).status, 400, "from the future");
  assert.equal((await sendWebhook(webhook, env, e, { header: null })).status, 400, "no header");
  assert.equal((await sendWebhook(webhook, env, "{not json", {})).status, 400, "signed but not JSON");
  const noSecret = { ...env, STRIPE_WEBHOOK_SECRET: "" };
  assert.equal((await sendWebhook(webhook, noSecret, e)).status, 400, "no secret configured never accepts");
  // a body changed after signing fails
  const body = JSON.stringify(e);
  assert.equal(await verifyStripeSignature(body + " ", sign(body), env.STRIPE_WEBHOOK_SECRET), false);
  assert.equal(await verifyStripeSignature(body, sign(body) + ",v1=deadbeef", env.STRIPE_WEBHOOK_SECRET), true, "any matching v1 is enough");
});

test("signature: unhandled event types are acknowledged and change nothing", async () => {
  const { env, raw } = newEnv();
  const r = await sendWebhook(webhook, env, stripeEvent("customer.created", {}));
  assert.equal(r.status, 200);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM stripe_events").get().n, 0);
});

test("paid: applies the placement, records the buyer's user_id, and a replay is a no-op", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  const e = paidEvt();
  const r = await sendWebhook(webhook, env, e);
  assert.equal(r.status, 200);
  const ev = getEvent(raw);
  assert.equal(ev.featured, 2);
  assert.equal(ev.featured_until, ptToday(30));
  const o = getOrder(raw);
  assert.equal(o.applied, 1); assert.equal(o.status, "paid"); assert.equal(o.user_id, "u1"); assert.equal(o.amount, 1500); assert.equal(o.payment_intent, "pi_1");
  assert.equal(o.applied_featured, 2); assert.equal(o.applied_until, ptToday(30));
  assert.ok(done(raw, e.id));
  // same Stripe event again
  const again = await sendWebhook(webhook, env, e);
  assert.equal(again.body.duplicate, true);
  // a different event id for the same Checkout session (async_payment_succeeded after completed) must not extend again
  const second = await sendWebhook(webhook, env, stripeEvent("checkout.session.async_payment_succeeded", session()));
  assert.equal(second.body.duplicate, true);
  assert.equal(getEvent(raw).featured_until, ptToday(30));
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM feature_orders").get().n, 1);
});

test("paid: an unpaid completed session only waits", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  const r = await sendWebhook(webhook, env, paidEvt({ payment_status: "unpaid" }));
  assert.equal(r.body.waiting, "unpaid");
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM feature_orders").get().n, 0);
  assert.equal(getEvent(raw).featured, 0);
});

test("paid: a failed first attempt (event missing) returns 500 and is retried to completion", async () => {
  const { env, raw } = newEnv(); // no event yet
  const e = paidEvt();
  const first = await sendWebhook(webhook, env, e);
  assert.equal(first.status, 500);
  assert.equal(done(raw, e.id), false, "the Stripe event must stay unrecorded so Stripe redelivers it");
  assert.equal(getOrder(raw).applied, 0, "the order row exists but is not applied");
  addEvent(raw);
  const retry = await sendWebhook(webhook, env, e); // Stripe redelivers the same event id
  assert.equal(retry.status, 200);
  assert.equal(getOrder(raw).applied, 1);
  assert.equal(getEvent(raw).featured, 2);
  assert.ok(done(raw, e.id));
});

test("paid: a payment with no feature metadata is ignored", async () => {
  const { env, raw } = newEnv();
  const r = await sendWebhook(webhook, env, paidEvt({ metadata: {} }));
  assert.equal(r.status, 200); assert.ok(r.body.ignored);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM feature_orders").get().n, 0);
});

test("paid: a payment for a still-pending submission is held, not applied", async () => {
  const { env, raw } = newEnv();
  raw.prepare("INSERT INTO event_submissions (id,name,city,season,type,start_date,end_date,contact_email) VALUES ('s1','New','Pasadena','christmas','walk',?,?,'a@b.com')").run(ptToday(), ptToday(40));
  const r = await sendWebhook(webhook, env, paidEvt({ metadata: { event_id: "sub:s1", plan: "pin", user_id: "u1" }, amount_total: 1000 }));
  assert.equal(r.status, 200); assert.ok(r.body.held);
  const o = getOrder(raw); assert.equal(o.applied, 0); assert.equal(o.status, "paid"); assert.equal(o.event_id, "sub:s1");
});

test("expired checkout is recorded and changes nothing", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  const e = stripeEvent("checkout.session.expired", session({ payment_status: "unpaid" }));
  const r = await sendWebhook(webhook, env, e);
  assert.equal(r.status, 200); assert.equal(r.body.expired, "cs_test_1");
  assert.ok(done(raw, e.id));
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM feature_orders").get().n, 0);
  assert.equal(getEvent(raw).featured, 0);
});

async function paidOrder(env, raw, o = {}) { addEvent(raw, o.event || "ev1", o.eventRow); const r = await sendWebhook(webhook, env, paidEvt(o.session)); assert.equal(r.status, 200); }
const refund = (o = {}) => stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_1", refunded: true, ...o });

test("refund: a full refund switches off the placement it applied", async () => {
  const { env, raw } = newEnv(); await paidOrder(env, raw);
  const r = await sendWebhook(webhook, env, refund());
  assert.equal(r.body.revoked, true);
  const ev = getEvent(raw); assert.equal(ev.featured, 0); assert.equal(ev.featured_until, null);
  const o = getOrder(raw); assert.equal(o.status, "refunded"); assert.ok(o.refunded_at); assert.equal(o.charge_id, "ch_1");
});

test("refund: a hand-comped or later-extended placement is left alone", async () => {
  const { env, raw } = newEnv(); await paidOrder(env, raw);
  raw.prepare("UPDATE events SET featured_until = ? WHERE id = 'ev1'").run(ptToday(120)); // the owner extended it by hand
  const r = await sendWebhook(webhook, env, refund());
  assert.equal(r.status, 200);
  assert.equal(r.body.revoked, false);
  const ev = getEvent(raw); assert.equal(ev.featured, 2); assert.equal(ev.featured_until, ptToday(120));
  assert.equal(getOrder(raw).status, "refunded", "the order is still marked refunded");
});

test("refund: a partial refund holds the order and keeps the placement", async () => {
  const { env, raw } = newEnv(); await paidOrder(env, raw);
  const r = await sendWebhook(webhook, env, refund({ refunded: false }));
  assert.ok(r.body.held);
  assert.equal(getOrder(raw).status, "held");
  assert.equal(getEvent(raw).featured, 2);
  // a later full refund of the held order still revokes it
  const full = await sendWebhook(webhook, env, refund());
  assert.equal(full.body.revoked, true);
  assert.equal(getEvent(raw).featured, 0);
});

const dispute = (type, o = {}) => stripeEvent(type, { id: "dp_1", payment_intent: "pi_1", charge: "ch_1", status: "needs_response", ...o });

test("dispute: created revokes at once; closed as lost stays revoked", async () => {
  const { env, raw } = newEnv(); await paidOrder(env, raw);
  const c = await sendWebhook(webhook, env, dispute("charge.dispute.created"));
  assert.equal(c.body.revoked, true);
  assert.equal(getOrder(raw).status, "disputed"); assert.equal(getEvent(raw).featured, 0);
  const l = await sendWebhook(webhook, env, dispute("charge.dispute.closed", { status: "lost" }));
  assert.equal(l.status, 200);
  assert.equal(getOrder(raw).status, "disputed"); assert.equal(getEvent(raw).featured, 0);
});

test("dispute: closed as won marks dispute_won and does not restore the placement", async () => {
  const { env, raw } = newEnv(); await paidOrder(env, raw);
  await sendWebhook(webhook, env, dispute("charge.dispute.created"));
  const w = await sendWebhook(webhook, env, dispute("charge.dispute.closed", { status: "won" }));
  assert.equal(w.body.dispute, "won");
  assert.equal(getOrder(raw).status, "dispute_won");
  assert.equal(getEvent(raw).featured, 0, "re-granting is a manual decision");
});

test("dispute: closed with another status changes nothing", async () => {
  const { env, raw } = newEnv(); await paidOrder(env, raw);
  const r = await sendWebhook(webhook, env, dispute("charge.dispute.closed", { status: "warning_closed" }));
  assert.ok(r.body.ignored);
  assert.equal(getOrder(raw).status, "paid"); assert.equal(getEvent(raw).featured, 2);
});

test("dispute: naming only its charge is resolved through the stored charge id, else through Stripe (stubbed)", async () => {
  const { env, raw } = newEnv(); await paidOrder(env, raw);
  raw.prepare("UPDATE feature_orders SET charge_id = 'ch_9'").run();
  const known = await sendWebhook(webhook, env, stripeEvent("charge.dispute.created", { id: "dp_2", charge: "ch_9" }));
  assert.equal(known.body.revoked, true);
  const { env: env2, raw: raw2 } = newEnv(); await paidOrder(env2, raw2);
  const f = stubFetch((url) => new Response(JSON.stringify({ payment_intent: "pi_1" }), { status: 200 }));
  try {
    const looked = await sendWebhook(webhook, env2, stripeEvent("charge.dispute.created", { id: "dp_3", charge: "ch_unknown" }));
    assert.equal(looked.body.revoked, true);
    assert.match(f.calls[0].url, /\/v1\/charges\/ch_unknown$/);
    const f2 = stubFetch(() => new Response("{}", { status: 500 }));
    const { env: env3, raw: raw3 } = newEnv(); await paidOrder(env3, raw3);
    const bad = await sendWebhook(webhook, env3, stripeEvent("charge.dispute.created", { id: "dp_4", charge: "ch_unknown" }));
    assert.equal(bad.status, 502, "Stripe unreachable: ask for a redelivery");
    assert.equal(done(raw3, "dp_4"), false);
    f2.restore();
  } finally { f.restore(); }
});

test("applyPlan: extension adds time on top of a running placement", () => {
  const today = "2026-12-01";
  const ev = { end_date: "2027-01-10", featured: 2, featured_until: "2026-12-10" };
  assert.deepEqual(applyPlan(ev, "top", today), { featured: 2, featured_until: "2027-01-09" });
  assert.deepEqual(applyPlan({ end_date: "2027-01-10", featured: 0, featured_until: null }, "pin", today), { featured: 1, featured_until: "2026-12-31" });
  const expired = { end_date: "2027-01-10", featured: 2, featured_until: "2026-11-20" };
  assert.deepEqual(applyPlan(expired, "pin", today), { featured: 1, featured_until: "2026-12-31" }, "an expired placement does not carry its old level or time");
});

test("applyPlan: an upgrade never downgrades the level", () => {
  const today = "2026-12-01";
  const r = applyPlan({ end_date: "2027-01-10", featured: 2, featured_until: "2026-12-10" }, "pin", today);
  assert.equal(r.featured, 2);
  assert.equal(r.featured_until, "2027-01-09");
  assert.equal(applyPlan({ end_date: "2027-01-10", featured: 1, featured_until: "2026-12-10" }, "top", today).featured, 2);
});

test("applyPlan: season runs to the event end, never shortens, and on its last day lasts only that day", () => {
  const today = "2026-12-01";
  assert.deepEqual(applyPlan({ end_date: "2027-01-10", featured: 0, featured_until: null }, "season", today), { featured: 2, featured_until: "2027-01-10" });
  assert.equal(applyPlan({ end_date: "2026-12-20", featured: 2, featured_until: "2027-02-01" }, "season", today).featured_until, "2027-02-01", "a longer running placement is kept");
  assert.equal(applyPlan({ end_date: today, featured: 0, featured_until: null }, "season", today).featured_until, today, "last day: through today only");
  assert.equal(applyPlan({ end_date: "2026-11-30", featured: 0, featured_until: null }, "season", today).featured_until, today, "an already-ended event gets today at most");
});

test("featuredLevel: a placement lasts through its last Pacific day and ends at Pacific midnight", () => {
  const row = { featured: 2, featured_until: "2026-12-09" };
  let restore = freezeNow("2026-12-10T07:59:59Z"); // 23:59:59 PST on the 9th
  try { assert.equal(rowToEvent(row).f, 2); } finally { restore(); }
  restore = freezeNow("2026-12-10T08:00:00Z"); // 00:00:00 PST on the 10th
  try { assert.equal(rowToEvent(row).f, 0); } finally { restore(); }
  restore = freezeNow("2026-12-10T08:00:00Z");
  try { assert.equal(rowToEvent({ featured: 1, featured_until: null }).f, 1, "no end date means no expiry"); assert.equal(rowToEvent({ featured: 0, featured_until: "2099-01-01" }).f, 0); assert.equal(rowToEvent({ featured: 5, featured_until: null }).f, 2, "levels are clamped"); } finally { restore(); }
});
