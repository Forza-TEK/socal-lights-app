// Featured event pricing: the window follows the event. Placement starts at payment and ends on the event's last day, capped at 30 days
// (pin, top) or 90 days (Full run, stored plan key "season"); featuring opens 30 days before the event starts. Nothing here reaches Stripe.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as checkout } from "../functions/api/feature/checkout.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { onRequestGet as configGet } from "../functions/api/config.js";
import { PLANS, PUBLIC_PLANS, applyOrder, applyPlan, restorePlacement, eventPlanProblem } from "../functions/_lib/featured.js";
import { newEnv, addEvent, addUser, stubFetch, getEvent, getOrder, stripeEvent, sendWebhook, session, ptToday } from "./_pay.mjs";

const post = (body, cookie) => new Request("https://socallights.app/api/feature/checkout", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body) });
const buy = async (env, body, cookie) => { const r = await checkout({ request: post(body, cookie), env }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const own = (raw, id, n = 1) => raw.prepare("INSERT INTO event_submissions (id,name,city,season,type,start_date,end_date,contact_email,status,event_id) VALUES (?,?,?,?,?,?,?,?,?,?)").run("s" + n + id, "Show", "Pasadena", "christmas", "walk", ptToday(), ptToday(40), "me@example.com", "published", id);
const pay = (env, n, plan, cents, id = "ev1") => sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ id: "cs_" + n, payment_intent: "pi_" + n, amount_total: cents, metadata: { event_id: id, plan, user_id: "u1" } })));
const refundOf = (n) => stripeEvent("charge.refunded", { id: "ch_" + n, payment_intent: "pi_" + n, refunded: true });
const pair = (raw, id = "ev1") => { const e = getEvent(raw, id); return [e.featured, e.featured_until]; };

test("prices and rules live only in PLANS and reach the browser through /api/config", async () => {
  assert.deepEqual([PLANS.pin.cents, PLANS.top.cents, PLANS.season.cents], [1000, 1500, 2500]);
  assert.equal(PLANS.season.label, "Full run"); assert.equal(PLANS.season.level, 2);
  assert.deepEqual([PLANS.pin.days, PLANS.top.days, PLANS.season.maxDays, PLANS.season.minLength, PLANS.season.minDays], [30, 30, 90, 31, 7]);
  const cfg = await (await configGet({ env: {} })).json();
  assert.deepEqual(cfg.featurePlans, JSON.parse(JSON.stringify(PUBLIC_PLANS))); assert.equal(cfg.featureOpenDays, 30);
  assert.equal(cfg.featurePlans.season, undefined, "the old Full run is not offered any more; the home plans (pin, top) stay"); assert.deepEqual(Object.keys(cfg.featurePlans), ["pin", "top"]);
});

test("window: a short event is featured from payment to its last day, not for 30 days", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: ptToday(-1), end_date: ptToday(10) });
  await pay(env, 1, "pin", 1000);
  assert.deepEqual(pair(raw), [1, ptToday(10)]); assert.equal(getOrder(raw, "cs_1").applied_until, ptToday(10));
  addEvent(raw, "ev2", { start_date: ptToday(), end_date: ptToday() });
  await pay(env, 2, "top", 1500, "ev2");
  assert.deepEqual(pair(raw, "ev2"), [2, ptToday()], "a one-day event: through its day only");
});

test("window: an event running past 30 days is capped at 30 days from payment (pin and top)", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { end_date: ptToday(90) }); addEvent(raw, "ev2", { end_date: ptToday(90) });
  await pay(env, 1, "pin", 1000); await pay(env, 2, "top", 1500, "ev2");
  assert.deepEqual(pair(raw), [1, ptToday(30)]); assert.deepEqual(pair(raw, "ev2"), [2, ptToday(30)]);
});

test("window: the date fixed when paid stays; a later date change does not extend the placement", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: ptToday(-1), end_date: ptToday(10) });
  await pay(env, 1, "pin", 1000);
  raw.prepare("UPDATE events SET end_date = ? WHERE id = 'ev1'").run(ptToday(40));
  assert.deepEqual(pair(raw), [1, ptToday(10)]);
});

test("early purchase: refused with a clear 400 until 30 days before the start; a running event and day 30 are fine", async () => {
  const { env, raw } = newEnv(); const me = await addUser(raw, "u1", "me@example.com");
  addEvent(raw, "far", { start_date: ptToday(31), end_date: ptToday(40) }); addEvent(raw, "edge", { start_date: ptToday(30), end_date: ptToday(40) }); addEvent(raw, "run", { start_date: ptToday(-5), end_date: ptToday(5) });
  for (const id of ["far", "edge", "run"]) own(raw, id);
  const f = stubFetch();
  try {
    for (const plan of ["ev_pin", "ev_banner", "ev_top", "ev_all"]) {
      const r = await buy(env, { event_id: "far", plan }, me.cookie);
      assert.equal(r.status, 400, plan); assert.match(r.body.error, /^Featuring opens 30 days before your event: come back on /);
      assert.ok(r.body.error.includes(ptToday(1)), "names the date the window opens (start minus 30 days)");
    }
    assert.equal(f.calls.length, 0);
    assert.equal((await buy(env, { event_id: "edge", plan: "ev_pin" }, me.cookie)).status, 200, "exactly 30 days before the start");
    assert.equal((await buy(env, { event_id: "run", plan: "ev_top" }, me.cookie)).status, 200, "already running");
  } finally { f.restore(); }
  // a submission still in review follows the same rule
  raw.prepare("INSERT INTO event_submissions (id,name,city,season,type,start_date,end_date,contact_email,status) VALUES ('sfar','Far','Pasadena','christmas','walk',?,?,'me@example.com','pending')").run(ptToday(45), ptToday(50));
  assert.match((await buy(env, { submission_id: "sfar", plan: "ev_pin" }, me.cookie)).body.error, /come back on/);
});

test("repeat purchase: adds nothing beyond the event's last day, never shortens, and a higher level is still sold", async () => {
  const { env, raw } = newEnv(); const me = await addUser(raw, "u1", "me@example.com");
  addEvent(raw, "ev1", { start_date: ptToday(-1), end_date: ptToday(10) }); own(raw, "ev1");
  await pay(env, 1, "pin", 1000);
  const f = stubFetch();
  try {
    const again = await buy(env, { event_id: "ev1", plan: "ev_pin" }, me.cookie);
    assert.equal(again.status, 400); assert.match(again.body.error, /Nothing to add/); assert.equal(f.calls.length, 0);
    assert.equal((await buy(env, { event_id: "ev1", plan: "ev_top" }, me.cookie)).status, 200, "upgrade pin to top");
  } finally { f.restore(); }
  await pay(env, 2, "top", 1500);
  assert.deepEqual(pair(raw), [2, ptToday(10)], "level up, same last day");
  await pay(env, 3, "pin", 1000); // even if it is paid anyway (a stale checkout page), nothing is lost or added
  assert.deepEqual(pair(raw), [2, ptToday(10)]);
  const f2 = stubFetch();
  try { assert.equal((await buy(env, { event_id: "ev1", plan: "ev_top" }, me.cookie)).status, 400, "top again adds nothing"); } finally { f2.restore(); }
});

test("repeat purchase: on a long event a later purchase extends by the cap, up to the last day, and never past it", () => {
  const ev = { end_date: "2027-03-01", featured: 1, featured_until: "2026-12-01" };
  assert.equal(applyPlan(ev, "pin", "2026-11-21").featured_until, "2026-12-21", "paid on day 20: 30 days from payment");
  assert.equal(applyPlan({ ...ev, end_date: "2026-12-10" }, "pin", "2026-11-21").featured_until, "2026-12-10", "never past the event's last day");
  assert.equal(applyPlan({ ...ev, featured_until: "2027-02-01" }, "pin", "2026-11-21").featured_until, "2027-02-01", "never shortens a longer placement");
});

test("Full run (old plan key, grandfathered): an order already paid or in flight still applies: level 2, last day capped at 90 days, no mismatch flag at $25", async () => {
  const { env, raw } = newEnv();
  addEvent(raw, "l31", { start_date: ptToday(-23), end_date: ptToday(7) });
  addEvent(raw, "big", { start_date: ptToday(-10), end_date: ptToday(200) });
  await pay(env, 1, "season", 2500, "big");
  assert.deepEqual(pair(raw, "big"), [2, ptToday(90)], "capped at 90 days from payment");
  await pay(env, 2, "season", 2500, "l31");
  assert.deepEqual(pair(raw, "l31"), [2, ptToday(7)], "an event ending sooner than the cap runs to its last day");
  assert.equal(getOrder(raw, "cs_1").note, null, "no amount-mismatch flag at $25");
});

test("grandfathered: an old $20 whole-season order still applies to the event's last day (no 90-day cap) and is not flagged", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: ptToday(-10), end_date: ptToday(200) });
  const r = await pay(env, 1, "season", 2000);
  assert.deepEqual(r.body.featured, { featured: 2, featured_until: ptToday(200) });
  assert.deepEqual(pair(raw), [2, ptToday(200)]); assert.equal(getOrder(raw, "cs_1").note, null);
  // an amount that is neither the old nor the new price is still flagged
  addEvent(raw, "ev2"); await pay(env, 2, "season", 1234, "ev2");
  assert.match(getOrder(raw, "cs_2").note, /amount mismatch/);
  // a refund of the legacy order switches it off exactly as before
  const rf = await sendWebhook(webhook, env, refundOf(1));
  assert.equal(rf.body.revoked, true); assert.deepEqual(pair(raw), [0, null]);
});

test("homes: Full run is refused at checkout and ignored by the webhook; pin and top stay 30 days from payment", async () => {
  const { env, raw } = newEnv(); const me = await addUser(raw, "u1", "me@example.com");
  const f = stubFetch();
  try { assert.match((await buy(env, { home_id: "h1", plan: "season" }, me.cookie)).body.error, /Homes can be featured for 30 days/); assert.equal(f.calls.length, 0); } finally { f.restore(); }
  assert.deepEqual(applyPlan({ featured: 0, featured_until: null }, "pin", "2026-12-01", { home: true }), { featured: 1, featured_until: "2026-12-31" });
  assert.deepEqual(applyPlan({ featured: 1, featured_until: "2026-12-10" }, "top", "2026-12-01", { home: true }), { featured: 2, featured_until: "2027-01-09" }, "a home still stacks 30 days on a running placement");
});

test("recompute: a refund or lost dispute of the newer, extending order falls back to what the older order paid for; restore puts the valid orders back", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { end_date: ptToday(90) });
  await pay(env, 1, "pin", 1000); // pin until +30
  // a second order bought 20 days later (applyOrder takes the day explicitly): top, 30 days from then, still inside the event
  raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,payment_intent,currency,status,user_id,target) VALUES ('cs_2','ev1','top',1500,'b@x.com','pi_2','usd','paid','u1','event')").run();
  const o2 = raw.prepare("SELECT * FROM feature_orders WHERE session_id='cs_2'").get();
  assert.deepEqual(await applyOrder(env.DB, { ...o2 }, "ev1", ptToday(20)), { featured: 2, featured_until: ptToday(50) });
  assert.equal(getOrder(raw, "cs_2").applied_until, ptToday(50));
  assert.deepEqual(pair(raw), [2, ptToday(50)]);
  // the event is unpublished and comes back: both orders are still valid, the placement is rebuilt from them
  raw.prepare("UPDATE events SET featured=0, featured_until=NULL WHERE id='ev1'").run();
  assert.deepEqual(await restorePlacement(env.DB, "ev1", ptToday()), { featured: 2, featured_until: ptToday(50), banner_until: null });
  // refund of the newer order: level and end fall back to the pin
  const rf = await sendWebhook(webhook, env, refundOf(2));
  assert.equal(rf.body.revoked, true); assert.deepEqual(pair(raw), [1, ptToday(30)]);
  // and lost dispute of the older one then switches it off
  const dp = await sendWebhook(webhook, env, stripeEvent("charge.dispute.created", { id: "dp_1", payment_intent: "pi_1", charge: "ch_1" }));
  assert.equal(dp.body.revoked, true); assert.deepEqual(pair(raw), [0, null]);
});

test("recompute: refunding the older order of two that share the capped window keeps the newer one's placement", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: ptToday(-1), end_date: ptToday(10) });
  await pay(env, 1, "pin", 1000); await pay(env, 2, "top", 1500);
  assert.deepEqual(pair(raw), [2, ptToday(10)]);
  assert.equal((await sendWebhook(webhook, env, refundOf(1))).body.revoked, true); assert.deepEqual(pair(raw), [2, ptToday(10)]);
  assert.equal((await sendWebhook(webhook, env, refundOf(2))).body.revoked, true); assert.deepEqual(pair(raw), [0, null]);
});
