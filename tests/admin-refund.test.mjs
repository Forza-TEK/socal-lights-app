// F-13: Admin > Orders "Refund in Stripe". Stripe is always stubbed here: no real call is ever made.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as orderAction } from "../functions/api/admin/orders/[id].js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { newEnv, addEvent, getEvent, getOrder, ptToday, stubFetch, stripeEvent, sendWebhook } from "./_pay.mjs";

const admin = { admin: { email: "owner@example.com" } };
const act = async (env, id, body) => { const r = await orderAction({ request: new Request("https://x.test/api/admin/orders/" + id, { method: "POST", body: JSON.stringify(body) }), env, params: { id }, data: admin }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const row = (raw, sid, st = "paid", pi = "pi_" + sid) => raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,payment_intent,currency,status,applied,applied_featured,applied_until,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))").run(sid, "ev1", "top", 1500, "b@x.com", pi, "usd", st, 1, 2, ptToday(20));
const stripe = (reply) => stubFetch(async (url, init) => (reply ? reply(url, init) : new Response(JSON.stringify({ id: "re_123", status: "succeeded" }), { status: 200, headers: { "content-type": "application/json" } })));

test("Refund in Stripe: one refunds call with the payment intent and an idempotency key per order, then the order is marked refunded exactly like 'mark refunded'", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { featured: 2, featured_until: ptToday(20) }); row(raw, "cs_a");
  const s = stripe();
  try {
    const r = await act(env, "cs_a", { action: "refund_stripe" });
    assert.equal(r.status, 200); assert.equal(r.body.refund, "re_123");
    assert.equal(s.calls.length, 1);
    const c = s.calls[0]; assert.equal(c.url, "https://api.stripe.com/v1/refunds"); assert.equal(c.init.method, "POST");
    assert.equal(c.init.headers["idempotency-key"], "refund-cs_a"); assert.equal(c.init.headers.authorization, "Bearer sk_test_fake");
    assert.equal(new URLSearchParams(c.init.body).get("payment_intent"), "pi_cs_a");
    const o = getOrder(raw, "cs_a"); assert.equal(o.status, "refunded"); assert.ok(o.refunded_at); assert.match(o.note, /Marked refunded by owner@example.com .*refunded in Stripe from Admin, re_123/);
    assert.equal(getEvent(raw).featured, 0, "the placement came off");
    // asking again does not call Stripe again
    assert.equal((await act(env, "cs_a", { action: "refund_stripe" })).status, 409); assert.equal(s.calls.length, 1);
    // the charge.refunded webhook that follows leaves it refunded
    const w = await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_cs_a", refunded: true }));
    assert.equal(w.status, 200); assert.equal(getOrder(raw, "cs_a").status, "refunded");
  } finally { s.restore(); }
});

test("Refund in Stripe: when Stripe refuses or is down, its message comes back and nothing changes", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { featured: 2, featured_until: ptToday(20) }); row(raw, "cs_b");
  let s = stripe(() => new Response(JSON.stringify({ error: { message: "Charge ch_1 has already been refunded." } }), { status: 400, headers: { "content-type": "application/json" } }));
  try {
    const r = await act(env, "cs_b", { action: "refund_stripe" });
    assert.equal(r.status, 400); assert.equal(r.body.error, "Charge ch_1 has already been refunded.");
    assert.equal(getOrder(raw, "cs_b").status, "paid"); assert.equal(getOrder(raw, "cs_b").refunded_at, null); assert.equal(getOrder(raw, "cs_b").note, null); assert.equal(getEvent(raw).featured, 2);
  } finally { s.restore(); }
  s = stripe(() => { throw new Error("offline"); });
  try {
    const r = await act(env, "cs_b", { action: "refund_stripe" });
    assert.equal(r.status, 502); assert.equal(getOrder(raw, "cs_b").status, "paid");
  } finally { s.restore(); }
});

test("Refund in Stripe: refused without calling Stripe for an order with no payment, a disputed order, a missing key or a missing order", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1"); row(raw, "cs_c", "paid", null); row(raw, "cs_d", "disputed"); row(raw, "cs_e");
  const s = stripe();
  try {
    assert.equal((await act(env, "cs_c", { action: "refund_stripe" })).status, 400);
    assert.equal((await act(env, "cs_d", { action: "refund_stripe" })).status, 400);
    assert.equal((await act({ ...env, STRIPE_SECRET_KEY: "" }, "cs_e", { action: "refund_stripe" })).status, 503);
    assert.equal((await act(env, "cs_nope", { action: "refund_stripe" })).status, 404);
    assert.equal(s.calls.length, 0);
  } finally { s.restore(); }
});

test("Admin Orders UI: a two-tap Refund in Stripe button on paid and refund-due orders, ?v= bumped", () => {
  const js = readFileSync(new URL("../public/admin/admin.js", import.meta.url), "utf8"), html = readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
  assert.match(js, /data-oact="refund_stripe"/); assert.match(js, /tap\(b, "refund this payment in Stripe"\)/);
  assert.match(html, /admin\.js\?v=20261126a/);
});
