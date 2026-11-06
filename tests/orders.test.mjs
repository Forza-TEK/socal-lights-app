// Payments: Admin > Orders (list, actions, badge), declined/unpublished/deleted paid placements, overlapping orders and refunds.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { onRequestGet as ordersGet } from "../functions/api/admin/orders.js";
import { onRequestPost as orderAction } from "../functions/api/admin/orders/[id].js";
import { onRequestPost as subAction } from "../functions/api/admin/submissions/[id].js";
import { onRequestDelete as eventDelete } from "../functions/api/admin/events/[id].js";
import { onRequestGet as countsGet } from "../functions/api/admin/counts.js";
import { deleteAccount } from "../functions/_lib/account.js";
import { newEnv, stripeEvent, sendWebhook, session, addEvent, getEvent, getOrder, ptToday } from "./_pay.mjs";

const admin = { admin: { email: "owner@example.com" } };
const json = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });
const act = async (env, id, body) => json(await orderAction({ request: new Request("https://x.test/api/admin/orders/" + id, { method: "POST", body: JSON.stringify(body) }), env, params: { id }, data: admin }));
const subAct = async (env, id, body) => json(await subAction({ request: new Request("https://x.test/api/admin/submissions/" + id, { method: "POST", body: JSON.stringify(body) }), env, params: { id } }));
const list = async (env) => (await json(await ordersGet({ env }))).body;
const counts = async (env) => (await json(await countsGet({ env }))).body;
const pay = (n, o = {}) => sendWebhook(webhook, o.env, stripeEvent("checkout.session.completed", session({ id: "cs_" + n, payment_intent: "pi_" + n, ...(o.s || {}) })));
const addSub = (raw, id = "s1", o = {}) => raw.prepare("INSERT INTO event_submissions (id,name,county,city,season,type,start_date,end_date,lat,lng,contact_email,status,event_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
  .run(id, "Sub Show", "Los Angeles", "Pasadena", "christmas", "walk", ptToday(), ptToday(60), 34, -118, "o@example.com", o.status || "pending", o.event_id || null);
const age = (raw, sid, mod) => raw.prepare("UPDATE feature_orders SET created_at = datetime('now', ?) WHERE session_id = ?").run(mod, sid);

test("decline: a paid order on a declined submission becomes refund_due and shows in Orders and the badge; restoring puts it back", async () => {
  const { env, raw } = newEnv(); addSub(raw);
  await pay(1, { env, s: { metadata: { event_id: "sub:s1", plan: "pin", user_id: "u1" }, amount_total: 1000 } });
  assert.equal(getOrder(raw, "cs_1").status, "paid");
  const d = await subAct(env, "s1", { action: "decline", reason: "not real" });
  assert.equal(d.status, 200); assert.equal(d.body.refund_due, 1);
  const o = getOrder(raw, "cs_1"); assert.equal(o.status, "refund_due"); assert.match(o.note, /^\[auto\] .*Refund it in the Stripe dashboard/);
  const rows = await list(env);
  assert.equal(rows.length, 1); assert.deepEqual(rows[0].flags, ["refund_due", "note"]); assert.equal(rows[0].name, "Sub Show"); assert.equal(rows[0].stripe_url, "https://dashboard.stripe.com/payments/pi_1");
  assert.equal((await counts(env)).orders, 1);
  assert.equal((await subAct(env, "s1", { action: "restore" })).status, 200);
  assert.equal(getOrder(raw, "cs_1").status, "paid"); assert.equal(getOrder(raw, "cs_1").note, null);
  await subAct(env, "s1", { action: "decline" });
  const m = await act(env, "cs_1", { action: "mark_refunded" });
  assert.equal(m.status, 200);
  assert.equal(getOrder(raw, "cs_1").status, "refunded"); assert.ok(getOrder(raw, "cs_1").refunded_at); assert.match(getOrder(raw, "cs_1").note, /Marked refunded by owner@example.com/);
  assert.equal((await counts(env)).orders, 0, "handled orders leave the badge");
  assert.equal((await act(env, "cs_1", { action: "mark_refunded" })).status, 200, "idempotent");
  assert.equal((await act(env, "cs_missing", { action: "note", note: "x" })).status, 404);
  assert.equal((await act(env, "cs_1", { action: "explode" })).status, 400);
});

test("orders list: Needs attention first, every reason flagged, and the badge count matches the flags", async () => {
  const { env, raw } = newEnv();
  addEvent(raw, "ok"); addEvent(raw, "cancelled", { notice: "cancelled" }); addEvent(raw, "late");
  const row = (sid, ev, st, o = {}) => raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,payment_intent,currency,status,applied,applied_featured,applied_until,note,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now',?))")
    .run(sid, ev, "top", 1500, "b@x.com", "pi_" + sid, "usd", st, o.applied ?? 1, 2, o.until ?? ptToday(20), o.note ?? null, o.age ?? "-1 day");
  row("fine", "ok", "paid"); row("due", "ok", "refund_due"); row("disp", "ok", "disputed"); row("held", "ok", "held");
  row("unapplied", "late", "paid", { applied: 0, until: null, age: "-2 hours" });
  row("fresh", "late", "paid", { applied: 0, until: null, age: "-5 minutes" }); // under an hour: not yet a problem
  row("subwait", "sub:zzz", "paid", { applied: 0, until: null, age: "-3 hours" }); // a pending submission may wait a day
  row("differs", "ok", "refunded", { note: "[auto] manual: placement differs." }); row("mismatch", "ok", "paid", { note: "[auto] amount mismatch: paid 100" });
  row("cancel", "cancelled", "paid"); row("won", "ok", "dispute_won", { note: "[auto] dispute won" });
  row("done", "ok", "refunded", { note: "Marked refunded by me" });
  const rows = await list(env);
  const flagged = rows.filter((r) => r.flags.length).map((r) => r.session_id).sort();
  assert.deepEqual(flagged, ["cancel", "differs", "disp", "due", "held", "mismatch", "unapplied", "won"].sort());
  const firstQuiet = rows.findIndex((r) => !r.flags.length);
  assert.ok(rows.slice(firstQuiet).every((r) => !r.flags.length), "everything needing attention comes first");
  assert.deepEqual(rows.find((r) => r.session_id === "cancel").flags, ["cancelled"]);
  assert.deepEqual(rows.find((r) => r.session_id === "differs").flags, ["differs"]);
  assert.deepEqual(rows.find((r) => r.session_id === "mismatch").flags, ["mismatch"]);
  assert.equal((await counts(env)).orders, flagged.length, "SQL badge and JS flags agree");
  // writing a note of your own clears an [auto] flag
  await act(env, "mismatch", { action: "note", note: "Checked in Stripe: price was changed on purpose." });
  assert.equal((await counts(env)).orders, flagged.length - 1);
  assert.equal(getOrder(raw, "mismatch").note, "Checked in Stripe: price was changed on purpose.");
});

test("reapply: an unapplied paid order is applied once its event exists; refused while it cannot be", async () => {
  const { env, raw } = newEnv();
  await pay(1, { env, s: { metadata: { event_id: "ev1", plan: "top", user_id: "u1" } } }); // event missing: 500, order row exists unapplied
  assert.equal(getOrder(raw, "cs_1").applied, 0);
  assert.equal((await act(env, "cs_1", { action: "reapply" })).status, 409);
  addEvent(raw, "ev1");
  const r = await act(env, "cs_1", { action: "reapply" });
  assert.equal(r.status, 200); assert.equal(getEvent(raw, "ev1").featured, 2); assert.equal(getOrder(raw, "cs_1").applied, 1);
  assert.equal((await act(env, "cs_1", { action: "reapply" })).status, 400, "already applied");
  // a pending submission that is still waiting
  addSub(raw);
  await pay(2, { env, s: { metadata: { event_id: "sub:s1", plan: "pin", user_id: "u1" } } });
  assert.equal((await act(env, "cs_2", { action: "reapply" })).status, 409);
});

test("a refund that cannot cleanly remove the placement leaves a note in the order, not just the webhook response", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  await pay(1, { env });
  raw.prepare("UPDATE events SET featured_until = ?").run(ptToday(120));
  const r = await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_1", refunded: true }));
  assert.equal(r.body.revoked, false);
  assert.match(getOrder(raw, "cs_1").note, /^\[auto\] manual: placement differs/);
  assert.equal((await list(env))[0].flags.includes("differs"), true);
  // partial refund and a won dispute are noted too
  await pay(2, { env, s: { metadata: { event_id: "ev1", plan: "pin", user_id: "u1" } } });
  await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_2", payment_intent: "pi_2", refunded: false }));
  assert.match(getOrder(raw, "cs_2").note, /partial refund/);
});

// ---------------------------------------------------------------- P3 overlapping orders
const refundOf = (n) => stripeEvent("charge.refunded", { id: "ch_" + n, payment_intent: "pi_" + n, refunded: true });

test("overlap: two stacked orders; refunding the newer shortens the placement to what the older paid for", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  await pay(1, { env, s: { metadata: { event_id: "ev1", plan: "pin", user_id: "u1" }, amount_total: 1000 } }); // level 1 until +30
  await pay(2, { env, s: { metadata: { event_id: "ev1", plan: "top", user_id: "u1" } } });                     // level 2, still +30: the 30-day cap from payment
  assert.deepEqual([getEvent(raw).featured, getEvent(raw).featured_until], [2, ptToday(30)]);
  const r = await sendWebhook(webhook, env, refundOf(2));
  assert.equal(r.body.revoked, true);
  assert.deepEqual([getEvent(raw).featured, getEvent(raw).featured_until], [1, ptToday(30)], "the older order's time and level remain");
  const r2 = await sendWebhook(webhook, env, refundOf(1));
  assert.equal(r2.body.revoked, true);
  assert.deepEqual([getEvent(raw).featured, getEvent(raw).featured_until], [0, null], "refund both: off");
});

test("overlap: refunding the older order keeps the placement the newer order covers; then refunding the newer switches it off", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  await pay(1, { env, s: { metadata: { event_id: "ev1", plan: "pin", user_id: "u1" } } });
  await pay(2, { env, s: { metadata: { event_id: "ev1", plan: "top", user_id: "u1" } } });
  const r = await sendWebhook(webhook, env, refundOf(1));
  assert.equal(r.body.revoked, true);
  assert.deepEqual([getEvent(raw).featured, getEvent(raw).featured_until], [2, ptToday(30)]);
  assert.equal(getOrder(raw, "cs_1").status, "refunded"); assert.equal(getOrder(raw, "cs_2").status, "paid");
  const r2 = await sendWebhook(webhook, env, refundOf(2));
  assert.equal(r2.body.revoked, true);
  assert.deepEqual([getEvent(raw).featured, getEvent(raw).featured_until], [0, null]);
});

test("overlap: a hand-applied comp longer than every order is never touched by a refund or a lost dispute", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  await pay(1, { env, s: { metadata: { event_id: "ev1", plan: "pin", user_id: "u1" } } });
  await pay(2, { env, s: { metadata: { event_id: "ev1", plan: "pin", user_id: "u1" } } });
  raw.prepare("UPDATE events SET featured = 2, featured_until = ?").run(ptToday(200)); // comped by hand on top
  const r = await sendWebhook(webhook, env, refundOf(2));
  assert.equal(r.body.revoked, false);
  assert.deepEqual([getEvent(raw).featured, getEvent(raw).featured_until], [2, ptToday(200)]);
  const d = await sendWebhook(webhook, env, stripeEvent("charge.dispute.created", { id: "dp_1", payment_intent: "pi_1", charge: "ch_1" }));
  assert.equal(d.body.revoked, false);
  assert.deepEqual([getEvent(raw).featured, getEvent(raw).featured_until], [2, ptToday(200)]);
  assert.equal(getOrder(raw, "cs_1").status, "disputed");
});

test("overlap: an expired older order is not counted as remaining, and a second refund event for the same order changes nothing", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  await pay(1, { env, s: { metadata: { event_id: "ev1", plan: "pin", user_id: "u1" } } });
  raw.prepare("UPDATE feature_orders SET applied_until = ? WHERE session_id = 'cs_1'").run(ptToday(-5)); // long over
  raw.prepare("UPDATE events SET featured = 0, featured_until = NULL").run();
  await pay(2, { env, s: { metadata: { event_id: "ev1", plan: "top", user_id: "u1" } } });
  const r = await sendWebhook(webhook, env, refundOf(2));
  assert.equal(r.body.revoked, true);
  assert.deepEqual([getEvent(raw).featured, getEvent(raw).featured_until], [0, null]);
  const again = await sendWebhook(webhook, env, refundOf(2));
  assert.equal(again.body.revoked, true, "no false 'placement differs' on a repeat");
  assert.equal(getOrder(raw, "cs_2").note, null);
});

// ---------------------------------------------------------------- P5 / P17 lifecycle
const publishedWithOrder = async (env, raw) => {
  addSub(raw);
  await pay(1, { env, s: { metadata: { event_id: "sub:s1", plan: "top", user_id: "u1" } } });
  const a = await subAct(env, "s1", { action: "approve", status: "confirmed" });
  assert.equal(a.status, 200);
  return a.body.id;
};

test("approve: a plan paid while waiting is applied, one order at a time", async () => {
  const { env, raw } = newEnv(); addSub(raw);
  await pay(1, { env, s: { metadata: { event_id: "sub:s1", plan: "pin", user_id: "u1" } } });
  await pay(2, { env, s: { metadata: { event_id: "sub:s1", plan: "top", user_id: "u1" } } });
  const a = await subAct(env, "s1", { action: "approve", status: "confirmed" });
  const ev = getEvent(raw, a.body.id);
  assert.deepEqual([ev.featured, ev.featured_until], [2, ptToday(30)]);
  assert.equal(getOrder(raw, "cs_1").applied_until, ptToday(30), "each order records what it added");
  assert.equal(getOrder(raw, "cs_2").applied_until, ptToday(30), "a second order for the same window adds no time (30-day cap from payment)");
  assert.equal(getOrder(raw, "cs_1").event_id, a.body.id);
});

test("unpublish: refused with 409 and the order list while a paid placement runs; with confirm the orders are kept and republishing restores it", async () => {
  const { env, raw } = newEnv();
  const id = await publishedWithOrder(env, raw);
  const no = await subAct(env, "s1", { action: "unpublish" });
  assert.equal(no.status, 409); assert.equal(no.body.code, "paid_placement"); assert.equal(no.body.orders.length, 1); assert.match(no.body.error, /top/);
  assert.ok(getEvent(raw, id), "nothing was deleted");
  const yes = await subAct(env, "s1", { action: "unpublish", confirm: true });
  assert.equal(yes.status, 200);
  assert.equal(raw.prepare("SELECT 1 FROM events WHERE id = ?").get(id), undefined);
  assert.equal(getOrder(raw, "cs_1").status, "paid"); assert.match(getOrder(raw, "cs_1").note, /unpublished/);
  assert.equal((await counts(env)).orders, 1, "visible to the owner");
  const back = await subAct(env, "s1", { action: "approve", status: "confirmed" });
  assert.equal(back.body.id, id); assert.equal(back.body.restored, true);
  assert.deepEqual([getEvent(raw, id).featured, getEvent(raw, id).featured_until], [2, ptToday(30)]);
  // and a refund after the republish still revokes it
  const r = await sendWebhook(webhook, env, refundOf(1));
  assert.equal(r.body.revoked, true); assert.equal(getEvent(raw, id).featured, 0);
});

test("unpublish: an event with no paid placement unpublishes without a prompt", async () => {
  const { env, raw } = newEnv(); addSub(raw);
  const a = await subAct(env, "s1", { action: "approve" });
  assert.equal((await subAct(env, "s1", { action: "unpublish" })).status, 200);
  assert.equal(raw.prepare("SELECT 1 FROM events WHERE id = ?").get(a.body.id), undefined);
});

test("admin delete of an event: 409 while a paid placement runs; confirmed, its orders become refund_due", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  await pay(1, { env });
  const del = (q = "") => eventDelete({ request: new Request("https://x.test/api/admin/events/ev1" + q, { method: "DELETE" }), params: { id: "ev1" }, env }).then(json);
  const no = await del();
  assert.equal(no.status, 409); assert.ok(getEvent(raw, "ev1"));
  const yes = await del("?confirm=1");
  assert.equal(yes.status, 200); assert.equal(yes.body.refund_due, 1);
  assert.equal(raw.prepare("SELECT 1 FROM events WHERE id = 'ev1'").get(), undefined);
  assert.equal(getOrder(raw, "cs_1").status, "refund_due");
  addEvent(raw, "plain"); // no orders: deletes straight away
  assert.equal((await eventDelete({ request: new Request("https://x.test/api/admin/events/plain", { method: "DELETE" }), params: { id: "plain" }, env })).status, 200);
});

// ---------------------------------------------------------------- P8 webhook ordering, P18 amount check
const pendingRow = (raw, pi) => { const r = raw.prepare("SELECT * FROM feature_pending_revocations WHERE payment_intent = ?").get(pi); return r ? { ...r } : null; };

test("ordering: a refund that arrives before its order is recorded, and the order is then born refunded and never applied", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  const r = await sendWebhook(webhook, env, refundOf(1));
  assert.equal(r.status, 200); assert.equal(r.body.pending, "refunded");
  assert.equal(pendingRow(raw, "pi_1").kind, "refunded");
  const p = await pay(1, { env });
  assert.equal(p.status, 200); assert.equal(p.body.skipped, "refunded");
  const o = getOrder(raw, "cs_1");
  assert.equal(o.status, "refunded"); assert.equal(o.applied, 0); assert.ok(o.refunded_at); assert.match(o.note, /a refund reached us before the payment was recorded/);
  assert.equal(getEvent(raw).featured, 0, "the placement is never switched on");
  assert.equal(pendingRow(raw, "pi_1"), null, "the pending row is consumed");
  assert.equal((await list(env))[0].flags.includes("note"), true, "and it is flagged for the owner");
});

test("ordering: a dispute before its order, closed as won before the order too", async () => {
  const { env, raw } = newEnv(); addEvent(raw); addEvent(raw, "ev2");
  const d = await sendWebhook(webhook, env, stripeEvent("charge.dispute.created", { id: "dp_1", payment_intent: "pi_1", charge: "ch_1" }));
  assert.equal(d.body.pending, "disputed");
  await pay(1, { env });
  assert.equal(getOrder(raw, "cs_1").status, "disputed"); assert.equal(getEvent(raw).featured, 0);
  await sendWebhook(webhook, env, stripeEvent("charge.dispute.created", { id: "dp_2", payment_intent: "pi_2", charge: "ch_2" }));
  await sendWebhook(webhook, env, stripeEvent("charge.dispute.closed", { id: "dp_2", payment_intent: "pi_2", charge: "ch_2", status: "won" }));
  assert.equal(pendingRow(raw, "pi_2").kind, "dispute_won");
  await pay(2, { env, s: { metadata: { event_id: "ev2", plan: "top", user_id: "u1" } } });
  assert.equal(getOrder(raw, "cs_2").status, "dispute_won"); assert.equal(getEvent(raw, "ev2").featured, 0);
  // an unrelated payment is unaffected
  addEvent(raw, "ev3");
  await pay(3, { env, s: { metadata: { event_id: "ev3", plan: "top", user_id: "u1" } } });
  assert.equal(getEvent(raw, "ev3").featured, 2);
});

test("ordering: a refund for a payment we never heard of and cannot key is still acknowledged without error", async () => {
  const { env } = newEnv();
  const r = await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_9", refunded: true }));
  assert.equal(r.status, 200); assert.ok(r.body.ignored);
});

test("amount check: a payment that differs from the plan price still applies, with a flagged note", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  const r = await pay(1, { env, s: { amount_total: 1200 } }); // 'top' costs 1500
  assert.equal(r.status, 200);
  assert.equal(getEvent(raw).featured, 2, "the buyer paid what we asked at checkout, so they get the placement");
  const o = getOrder(raw, "cs_1"); assert.equal(o.applied, 1); assert.match(o.note, /^\[auto\] amount mismatch: paid 12\.00 USD, the top plan is 15\.00 USD/);
  assert.deepEqual((await list(env))[0].flags, ["mismatch"]);
  addEvent(raw, "ev2");
  await pay(2, { env, s: { currency: "eur", metadata: { event_id: "ev2", plan: "top", user_id: "u1" } } });
  assert.match(getOrder(raw, "cs_2").note, /EUR/);
  addEvent(raw, "ev3");
  await pay(3, { env, s: { metadata: { event_id: "ev3", plan: "top", user_id: "u1" } } }); // exact price
  assert.equal(getOrder(raw, "cs_3").note, null);
});

test("account deletion of a contest owner: the map event goes, and its paid placement is surfaced as refund_due", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('uK','k@x.com','K')").run();
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,entries_close,vote_start,vote_end,contact_email,status,event_id,note) VALUES ('k1','k1','uK','K','Org','Pasadena','2026-12-01','2026-12-02','2026-12-20','k@x.com','live','ev1','')").run();
  await pay(1, { env });
  await deleteAccount({ ...env, PHOTOS: { delete: async () => {} } }, "uK", "k@x.com");
  assert.equal(raw.prepare("SELECT 1 FROM events WHERE id = 'ev1'").get(), undefined);
  assert.equal(getOrder(raw, "cs_1").status, "refund_due");
});
