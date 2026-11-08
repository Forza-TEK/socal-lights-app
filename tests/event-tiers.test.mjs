// Event organizer tiers (2026-11-06): Featured pin $25, Banner + pin $50, Top of the list + pin $50, all three $75, made of additive $25 components.
// Quote (components, dates, price), the 30-day opening rule, the season and event-end caps, additive upgrades and the refuse-if-nothing-new rule, checkout, webhook apply / replay /
// mismatch / refund / dispute / restore, /api/banner, the admin date floor, Admin > Orders, the organizer's counts. In-memory D1; fetch is stubbed: nothing reaches Stripe.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { onRequestPost as checkout } from "../functions/api/feature/checkout.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { onRequestGet as bannerList } from "../functions/api/banner/index.js";
import { onRequestPost as bannerHit } from "../functions/api/banner/hit.js";
import { onRequestGet as featurable } from "../functions/api/me/featurable.js";
import { onRequestGet as quoteGet } from "../functions/api/feature/quote.js";
import { onRequestGet as configGet } from "../functions/api/config.js";
import { onRequestGet as ordersGet } from "../functions/api/admin/orders.js";
import { onRequestPost as adminEventSave } from "../functions/api/admin/events/index.js";
import { onRequestGet as adminEventGet, onRequestDelete as adminEventDelete } from "../functions/api/admin/events/[id].js";
import { EVENT_PLANS, EVENT_PLAN_KEYS, COMPONENT_CENTS, PLANS, eventQuote, applyOrder, restorePlacement, eventFloor } from "../functions/_lib/featured.js";
import { flagRefundDue } from "../functions/_lib/orders.js";
import { eventTierCopy, EVENT_KEYS } from "../public/feature-plans.js";
import { newEnv, addEvent, addUser, stubFetch, getEvent, getOrder, stripeEvent, sendWebhook, session, freezeNow } from "./_pay.mjs";

const NOW = "2026-11-06T20:00:00Z", T = "2026-11-06"; // Nov 6 Pacific: the Christmas sponsor season, which ends Jan 6
const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})) }; };
const req = (url, body, cookie) => new Request("https://socallights.app" + url, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const buy = (env, body, cookie) => J(checkout({ request: req("/api/feature/checkout", body, cookie), env }));
const own = (raw, id) => raw.prepare("INSERT INTO event_submissions (id,name,city,season,type,start_date,end_date,contact_email,status,event_id) VALUES (?,?,?,?,?,?,?,?,?,?)").run("s-" + id, "Show", "Pasadena", "christmas", "walk", T, "2027-02-01", "me@example.com", "published", id);
const withNow = async (fn, iso = NOW) => { const un = freezeNow(iso); try { return await fn(); } finally { un(); } };
const q = (ev, plan, today = T) => eventQuote(ev, plan, today);
const pay = (env, n, plan, cents, { id = "ev1", quote } = {}) => sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ id: "cs_" + n, payment_intent: "pi_" + n, amount_total: cents, metadata: { event_id: id, plan, user_id: "u1", ...(quote ? { quote_from: quote[0], quote_to: quote[1], quote_cents: String(quote[2]) } : {}) } })));
const refundOf = (n, full = true) => stripeEvent("charge.refunded", { id: "ch_" + n, payment_intent: "pi_" + n, refunded: full });
const place = (raw, id = "ev1") => { const e = getEvent(raw, id); return [e.featured, e.featured_until, e.banner_until]; };

test("prices: $25 per component, tiers add up to $25 / $50 / $50 / $75, in cents, in one place; homes keep $10 and $15", async () => {
  assert.deepEqual(COMPONENT_CENTS, { pin: 2500, banner: 2500, top: 2500 });
  assert.deepEqual(EVENT_PLAN_KEYS, ["ev_pin", "ev_banner", "ev_top", "ev_all"]);
  assert.deepEqual(EVENT_PLAN_KEYS.map((k) => EVENT_PLANS[k].cents), [2500, 5000, 5000, 7500]);
  assert.deepEqual(EVENT_PLAN_KEYS.map((k) => EVENT_PLANS[k].level), [1, 1, 2, 2]);
  assert.deepEqual([PLANS.pin.cents, PLANS.top.cents, PLANS.pin.days, PLANS.top.days], [1000, 1500, 30, 30], "homes: unchanged");
  const c = await (await configGet({ env: {} })).json();
  assert.deepEqual(Object.keys(c.eventPlans), EVENT_PLAN_KEYS); assert.equal(c.eventPlans.ev_all.cents, 7500); assert.deepEqual(c.eventPlans.ev_banner.components, ["pin", "banner"]);
  assert.deepEqual(c.eventComponentCents, COMPONENT_CENTS); assert.deepEqual(Object.keys(c.featurePlans), ["pin", "top"]); assert.equal(c.featurePlans.pin.cents, 1000); assert.equal(c.featurePlans.top.cents, 1500);
  assert.deepEqual(Object.keys(c.installerPlans), ["banner", "top", "banner_top"]);
});

test("quote: components, dates and price for each tier on a short event, a season-long event and one ending before the season", () => {
  const short = { start_date: "2026-11-10", end_date: "2026-11-20" };
  const want = { ev_pin: [["pin"], 2500], ev_banner: [["pin", "banner"], 5000], ev_top: [["pin", "top"], 5000], ev_all: [["pin", "banner", "top"], 7500] };
  for (const k of EVENT_PLAN_KEYS) { const x = q(short, k); assert.deepEqual([x.components, x.cents, x.from, x.to, x.capped, x.days, x.problem], [want[k][0], want[k][1], T, "2026-11-20", "event", 15, ""], k); assert.deepEqual(x.added, want[k][0]); }
  const long = q({ start_date: "2026-11-20", end_date: "2027-03-01" }, "ev_all"); // runs past the season: capped at Jan 6
  assert.deepEqual([long.to, long.capped, long.season, long.days, long.cents], ["2027-01-06", "season", "Thanksgiving & Christmas Lights", 62, 7500]);
  const ends = q({ start_date: "2026-11-20", end_date: "2026-12-31" }, "ev_pin"); assert.deepEqual([ends.to, ends.capped], ["2026-12-31", "event"]);
  const oneNight = q({ start_date: "2026-11-20", end_date: "2026-11-20" }, "ev_pin"); assert.deepEqual([oneNight.from, oneNight.to, oneNight.days], [T, "2026-11-20", 15], "featured from the moment of payment, not only on the event's night");
  const today = q({ start_date: "2026-11-06", end_date: "2026-11-06" }, "ev_pin"); assert.equal(today.days, 1);
  // after Dec 27 the map shows New Year's, but the Christmas sponsor season runs to Jan 6; Jan 7 starts the New Year's season (ends Jan 31)
  assert.equal(q({ start_date: "2026-12-20", end_date: "2027-02-20" }, "ev_pin", "2026-12-28").to, "2027-01-06");
  assert.equal(q({ start_date: "2027-01-01", end_date: "2027-02-20" }, "ev_pin", "2027-01-07").to, "2027-01-31");
});

test("quote: purchase opens 30 days before the event starts; an ended event is refused", () => {
  assert.match(q({ start_date: "2026-12-07", end_date: "2026-12-20" }, "ev_pin").problem, /^Featuring opens 30 days before your event: come back on 2026-11-07/);
  assert.equal(q({ start_date: "2026-12-06", end_date: "2026-12-20" }, "ev_pin").problem, "", "day 30 is fine");
  assert.match(q({ start_date: "2026-10-01", end_date: "2026-11-05" }, "ev_pin").problem, /already ended/);
  assert.equal(q({}, "nope").problem, "Choose a plan.");
});

test("additive upgrades: $25 for each component the event does not already hold for the whole window; nothing new is refused", () => {
  const ev = { start_date: "2026-11-10", end_date: "2026-11-30" }, to = "2026-11-30";
  const held = (o) => ({ ...ev, ...o });
  assert.equal(q(held({ featured: 1, featured_until: to }), "ev_all").cents, 5000, "pin -> all: banner + top");
  assert.deepEqual(q(held({ featured: 1, featured_until: to }), "ev_all").added, ["banner", "top"]);
  assert.equal(q(held({ featured: 1, featured_until: to, banner_until: to }), "ev_all").cents, 2500, "banner + pin -> all: only top");
  assert.equal(q(held({ featured: 2, featured_until: to }), "ev_all").cents, 2500, "top + pin -> all: only the banner");
  assert.equal(q(held({ featured: 2, featured_until: to }), "ev_banner").cents, 2500, "top held: banner + pin adds only the banner");
  assert.equal(q(held({ featured: 1, featured_until: to }), "ev_banner").cents, 2500);
  assert.equal(q(held({ featured: 1, featured_until: to }), "ev_top").cents, 2500, "pin held: top adds only top");
  // a component held only until before the window's end still counts as new (flat price, no proration)
  assert.equal(q(held({ featured: 1, featured_until: "2026-11-20" }), "ev_pin").cents, 2500);
  // nothing new: refused with a clear message
  for (const k of EVENT_PLAN_KEYS) { const x = q(held({ featured: 2, featured_until: to, banner_until: to }), k); assert.match(x.problem, /^Nothing to add: this event already has /); assert.deepEqual(x.added, []); }
  assert.match(q(held({ featured: 1, featured_until: to }), "ev_pin").problem, /Nothing to add: this event already has the Featured pin through 2026-11-30/);
  // an expired or hand-set open-ended placement
  assert.equal(q(held({ featured: 1, featured_until: "2026-11-01" }), "ev_pin").cents, 2500, "expired: buy again");
  assert.equal(q(held({ featured: 1, featured_until: null }), "ev_pin").problem.startsWith("Nothing to add"), true, "an open-ended hand-set pin already covers it");
});

test("checkout: the price and window come from the server, are locked into the payment (metadata), and the old keys are refused", () => withNow(async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: "2026-11-10", end_date: "2027-03-01" }); own(raw, "ev1");
  const me = await addUser(raw, "u1", "me@example.com"); const f = stubFetch();
  try {
    const r = await buy(env, { event_id: "ev1", plan: "ev_all", price: 1 }, me.cookie); assert.equal(r.status, 200);
    const sent = new URLSearchParams(String(f.calls[0].init.body));
    assert.deepEqual([sent.get("line_items[0][price_data][unit_amount]"), sent.get("metadata[plan]"), sent.get("metadata[quote_from]"), sent.get("metadata[quote_to]"), sent.get("metadata[quote_cents]")], ["7500", "ev_all", T, "2027-01-06", "7500"]);
    assert.match(sent.get("line_items[0][price_data][product_data][description]"), /Top of the list \+ Banner \+ Featured pin/); assert.match(sent.get("line_items[0][price_data][product_data][description]"), /2026-11-06 to 2027-01-06/);
    for (const plan of ["pin", "top", "season", "nope"]) assert.equal((await buy(env, { event_id: "ev1", plan }, me.cookie)).status, 400, plan);
    assert.equal(f.calls.length, 1);
    // an event that already has the pin: the banner tier charges only $25 more
    raw.prepare("UPDATE events SET featured=1, featured_until='2027-01-06' WHERE id='ev1'").run(); f.calls.length = 0;
    assert.equal((await buy(env, { event_id: "ev1", plan: "ev_banner" }, me.cookie)).status, 200);
    assert.equal(new URLSearchParams(String(f.calls[0].init.body)).get("line_items[0][price_data][unit_amount]"), "2500");
    // nothing new: 400 and Stripe is not called
    raw.prepare("UPDATE events SET featured=2, featured_until='2027-01-06', banner_until='2027-01-06' WHERE id='ev1'").run(); f.calls.length = 0;
    const none = await buy(env, { event_id: "ev1", plan: "ev_all" }, me.cookie); assert.equal(none.status, 400); assert.match(none.body.error, /Nothing to add/); assert.equal(f.calls.length, 0);
  } finally { f.restore(); }
}));

test("checkout: early, ended, cancelled and expected-claim refusals still apply to the new tiers", () => withNow(async () => {
  const { env, raw } = newEnv(); const me = await addUser(raw, "u1", "me@example.com");
  addEvent(raw, "far", { start_date: "2026-12-20", end_date: "2026-12-30" }); addEvent(raw, "old", { start_date: "2026-10-01", end_date: "2026-11-01" }); addEvent(raw, "can", { start_date: "2026-11-10", end_date: "2026-11-20", notice: "cancelled" });
  for (const id of ["far", "old", "can"]) own(raw, id); const f = stubFetch();
  try {
    assert.match((await buy(env, { event_id: "far", plan: "ev_pin" }, me.cookie)).body.error, /opens 30 days before/);
    assert.match((await buy(env, { event_id: "old", plan: "ev_pin" }, me.cookie)).body.error, /already ended/);
    assert.match((await buy(env, { event_id: "can", plan: "ev_pin" }, me.cookie)).body.error, /cancelled/);
    assert.equal(f.calls.length, 0);
  } finally { f.restore(); }
}));

test("webhook: every tier applies pin level, top level and the banner date to the quoted last day", () => withNow(async () => {
  const cases = [["ev_pin", 2500, [1, "2026-11-20", null]], ["ev_banner", 5000, [1, "2026-11-20", "2026-11-20"]], ["ev_top", 5000, [2, "2026-11-20", null]], ["ev_all", 7500, [2, "2026-11-20", "2026-11-20"]]];
  for (const [plan, cents, expect] of cases) {
    const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: "2026-11-10", end_date: "2026-11-20" });
    const r = await pay(env, 1, plan, cents, { quote: [T, "2026-11-20", cents] }); assert.equal(r.status, 200, plan);
    assert.deepEqual(place(raw), expect, plan);
    const o = getOrder(raw, "cs_1"); assert.deepEqual([o.status, o.applied, o.applied_featured, o.applied_until, o.applied_banner_until, o.quote_to, o.note], ["paid", 1, expect[0], "2026-11-20", expect[2], "2026-11-20", null], plan);
  }
}));

test("webhook: the window is the quoted one: a season-capped quote ends Jan 6 even for a longer event; a payment a day late keeps the quote; never past the event's last day", () => withNow(async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: "2026-11-10", end_date: "2027-03-01" });
  await pay(env, 1, "ev_all", 7500, { quote: [T, "2027-01-06", 7500] }); assert.deepEqual(place(raw), [2, "2027-01-06", "2027-01-06"]);
  addEvent(raw, "ev2", { start_date: "2026-11-10", end_date: "2026-12-01" }); // the organizer moved the end date earlier after the quote
  await pay(env, 2, "ev_pin", 2500, { id: "ev2", quote: [T, "2027-01-06", 2500] }); assert.equal(getEvent(raw, "ev2").featured_until, "2026-12-01");
  addEvent(raw, "ev3", { start_date: "2026-11-10", end_date: "2026-11-30" }); // a quote from yesterday: still honored
  await pay(env, 3, "ev_banner", 5000, { id: "ev3", quote: ["2026-11-05", "2026-11-30", 5000] }); assert.deepEqual(place(raw, "ev3"), [1, "2026-11-30", "2026-11-30"]);
}));

test("webhook: replay and duplicate delivery apply once; a second session for what the event already has is held as refund due", () => withNow(async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: "2026-11-10", end_date: "2026-11-20" });
  assert.equal((await pay(env, 1, "ev_all", 7500, { quote: [T, "2026-11-20", 7500] })).body.featured.featured, 2);
  const dup = await pay(env, 1, "ev_all", 7500, { quote: [T, "2026-11-20", 7500] }); assert.equal(dup.body.duplicate, true);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM feature_orders").get().n, 1);
  const second = await pay(env, 2, "ev_all", 7500, { quote: [T, "2026-11-20", 7500] }); // a second tab paid for the same thing
  const o = getOrder(raw, "cs_2"); assert.deepEqual([o.status, o.applied], ["refund_due", 0]); assert.match(o.note, /nothing new/); assert.equal(second.body.skipped, "refund_due");
  assert.deepEqual(place(raw), [2, "2026-11-20", "2026-11-20"]);
}));

test("webhook: an amount that differs from the quote is flagged (and still applied); old plan amounts are grandfathered", () => withNow(async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: "2026-11-10", end_date: "2026-11-20" }); addEvent(raw, "ev2", { start_date: "2026-11-10", end_date: "2026-11-20" });
  await pay(env, 1, "ev_pin", 1000, { quote: [T, "2026-11-20", 2500] });
  const o = getOrder(raw, "cs_1"); assert.match(o.note, /^\[auto\] amount mismatch: paid 10\.00 USD, the ev_pin plan is 25\.00 USD/); assert.equal(o.applied, 1);
  // the old keys at their old prices: no flag, and they apply the old way (30 days capped by the last day)
  await pay(env, 2, "pin", 1000, { id: "ev2" }); assert.equal(getOrder(raw, "cs_2").note, null); assert.deepEqual(place(raw, "ev2"), [1, "2026-11-20", null]);
  addEvent(raw, "ev3", { start_date: "2026-11-10", end_date: "2027-03-01" });
  await pay(env, 3, "season", 2500, { id: "ev3" }); assert.equal(getOrder(raw, "cs_3").note, null); assert.equal(getEvent(raw, "ev3").featured, 2);
  await pay(env, 4, "top", 1500, { id: "ev3" }); assert.equal(getOrder(raw, "cs_4").note, null);
}));

test("webhook: a payment held for a submission still in review applies the quoted window when it is approved", () => withNow(async () => {
  const { env, raw } = newEnv();
  raw.prepare("INSERT INTO event_submissions (id,name,city,season,type,start_date,end_date,contact_email,status) VALUES ('s1','Show','Pasadena','christmas','walk','2026-11-10','2026-11-25','me@example.com','pending')").run();
  const r = await pay(env, 1, "ev_banner", 5000, { id: "sub:s1", quote: [T, "2026-11-25", 5000] }); assert.equal(r.body.held, "waiting for the event to be approved");
  addEvent(raw, "ev1", { start_date: "2026-11-10", end_date: "2026-11-25" });
  const o = raw.prepare("SELECT * FROM feature_orders WHERE session_id='cs_1'").get(); assert.equal(o.quote_to, "2026-11-25");
  assert.deepEqual(await applyOrder(env.DB, { ...o }, "ev1", T), { featured: 1, featured_until: "2026-11-25", banner_until: "2026-11-25" });
}));

test("refund, partial refund and dispute: the banner goes off with the order; time other orders paid for stays; a hand-set date is left on and flagged", () => withNow(async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: "2026-11-10", end_date: "2027-03-01" });
  await pay(env, 1, "ev_banner", 5000, { quote: [T, "2026-12-15", 5000] }); assert.deepEqual(place(raw), [1, "2026-12-15", "2026-12-15"]);
  // a partial refund holds the order and leaves the placement on
  const part = await sendWebhook(webhook, env, refundOf(1, false)); assert.equal(part.body.held, "partial refund"); assert.deepEqual(place(raw), [1, "2026-12-15", "2026-12-15"]); assert.equal(getOrder(raw, "cs_1").status, "held");
  raw.prepare("UPDATE feature_orders SET status='paid', note=NULL WHERE session_id='cs_1'").run();
  const rf = await sendWebhook(webhook, env, refundOf(1)); assert.equal(rf.body.revoked, true); assert.deepEqual(place(raw), [0, null, null]);
  // two orders: the later one extends the banner; refunding it falls back to the first order's banner
  raw.prepare("UPDATE events SET featured=0, featured_until=NULL, banner_until=NULL WHERE id='ev1'").run();
  await pay(env, 2, "ev_banner", 5000, { quote: [T, "2026-12-01", 5000] }); await pay(env, 3, "ev_all", 7500, { quote: [T, "2027-01-06", 7500] });
  assert.deepEqual(place(raw), [2, "2027-01-06", "2027-01-06"]);
  const dp = await sendWebhook(webhook, env, stripeEvent("charge.dispute.created", { id: "dp_3", payment_intent: "pi_3", charge: "ch_3" })); assert.equal(dp.body.revoked, true);
  assert.deepEqual(place(raw), [1, "2026-12-01", "2026-12-01"], "back to what the first order paid for");
  // a banner date an admin set longer than every order is not removed by a refund
  raw.prepare("UPDATE events SET banner_until='2027-02-01' WHERE id='ev1'").run();
  const r2 = await sendWebhook(webhook, env, refundOf(2)); assert.equal(r2.body.revoked, false); assert.equal(getEvent(raw).banner_until, "2027-02-01"); assert.match(getOrder(raw, "cs_2").note, /placement differs/);
}));

test("restore: an unpublished event that comes back gets its pin level and its banner date back from its valid orders", () => withNow(async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: "2026-11-10", end_date: "2027-03-01" });
  await pay(env, 1, "ev_all", 7500, { quote: [T, "2027-01-06", 7500] });
  raw.prepare("UPDATE events SET featured=0, featured_until=NULL, banner_until=NULL WHERE id='ev1'").run();
  assert.deepEqual(await restorePlacement(env.DB, "ev1", T), { featured: 2, featured_until: "2027-01-06", banner_until: "2027-01-06" });
  assert.deepEqual(place(raw), [2, "2027-01-06", "2027-01-06"]);
  assert.equal(await restorePlacement(env.DB, "ev1", T), null, "nothing more to put back");
}));

test("an unpublish or delete with a running banner order flags it refund due (the shared helpers cover the banner date); a finished order is not flagged", () => withNow(async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: "2026-11-10", end_date: "2026-11-30" }); addEvent(raw, "ev2", { start_date: "2026-10-01", end_date: "2026-10-30" });
  await pay(env, 1, "ev_banner", 5000, { quote: [T, "2026-11-30", 5000] });
  raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,status,applied,applied_featured,applied_until,applied_banner_until,target) VALUES ('old','ev2','ev_banner',5000,'paid',1,1,'2026-10-30','2026-10-30','event')").run();
  const n = await flagRefundDue(env.DB, { events: ["ev1", "ev2"] }, "The event was unpublished while a paid placement was running.", { restorable: true, today: T });
  assert.equal(n, 1); assert.equal(getOrder(raw, "cs_1").status, "refund_due"); assert.equal(raw.prepare("SELECT status FROM feature_orders WHERE session_id='old'").get().status, "paid");
}));

test("/api/banner: an event pill shows only while its banner window runs, and not for a cancelled, postponed or ended event; installers keep their own entries", () => withNow(async () => {
  const { env, raw } = newEnv();
  addEvent(raw, "on", { name: "Lantern Walk", city: "Pasadena", start_date: "2026-11-10", end_date: "2026-12-30" }); addEvent(raw, "off", { start_date: "2026-11-10", end_date: "2026-12-30" });
  addEvent(raw, "can", { start_date: "2026-11-10", end_date: "2026-12-30", notice: "cancelled" }); addEvent(raw, "gone", { start_date: "2026-10-01", end_date: "2026-11-01" }); addEvent(raw, "lapsed", { start_date: "2026-11-10", end_date: "2026-12-30" });
  raw.prepare("UPDATE events SET banner_until='2026-12-30' WHERE id IN ('on','can')").run(); raw.prepare("UPDATE events SET banner_until='2026-11-01' WHERE id='lapsed'").run(); raw.prepare("UPDATE events SET banner_until='2026-12-30' WHERE id='gone'").run();
  raw.prepare("INSERT INTO installers (id,slug,name,web,phone,area,owner_email,status,banner_until,top_until) VALUES ('i1','a','Alpha','https://a.example','626-555-0100','Orange County','o@x.com','active','2026-12-01',''), ('i2','b','Beta','https://b.example','626-555-0101','','o2@x.com','active','','2026-12-01')").run();
  const list = (await J(bannerList({ env }))).body, ev = list.filter((i) => i.ev);
  assert.deepEqual(ev.map((i) => i.id), ["ev:on"]); assert.deepEqual(ev[0], { id: "ev:on", ev: 1, n: "Lantern Walk", c: "Pasadena", s: "2026-11-10", e: "2026-12-30", u: "/e/on" });
  assert.equal(list.find((i) => i.id === "i1").bn, 1); assert.equal(list.find((i) => i.id === "i2").bn, undefined, "a top-only installer is not a strip pill"); assert.equal(list.find((i) => i.id === "i2").t, 1);
  // after the window: gone
  const un = freezeNow("2026-12-31T20:00:00Z"); try { assert.deepEqual((await J(bannerList({ env }))).body.filter((i) => i.ev), []); } finally { un(); }
}));

test("/api/banner/hit: an event counts shown and taps only while on the banner; totals only; made-up ids are ignored", () => withNow(async () => {
  const { env, raw } = newEnv(); addEvent(raw, "on", { start_date: "2026-11-10", end_date: "2026-12-30" }); addEvent(raw, "off", { start_date: "2026-11-10", end_date: "2026-12-30" });
  raw.prepare("UPDATE events SET banner_until='2026-12-30' WHERE id='on'").run();
  const hit = (id, k) => J(bannerHit({ request: req("/api/banner/hit", { id, k }), env }));
  await hit("ev:on", "imp"); await hit("ev:on", "imp"); await hit("ev:on", "click"); await hit("ev:off", "imp"); await hit("ev:nope", "imp"); await hit("ev:on", "call"); await hit("ev:on", "limp");
  const rows = raw.prepare("SELECT installer_id, imp, click, call, lst_imp FROM banner_stats").all().map((r) => ({ ...r }));
  assert.deepEqual(rows, [{ installer_id: "ev:on", imp: 2, click: 1, call: 0, lst_imp: 0 }]);
  assert.deepEqual(raw.prepare("PRAGMA table_info(banner_stats)").all().map((c) => c.name).sort(), ["call", "click", "day", "imp", "installer_id", "lst_call", "lst_click", "lst_imp"], "no person, device or address is stored");
}));

test("/api/me/featurable: each event carries the server's quotes, its banner date and how many times the banner was shown and tapped", () => withNow(async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: "2026-11-10", end_date: "2026-11-30" }); own(raw, "ev1"); raw.prepare("UPDATE event_submissions SET end_date='2026-11-30' WHERE id='s-ev1'").run();
  const me = await addUser(raw, "u1", "me@example.com");
  raw.prepare("UPDATE events SET featured=1, featured_until='2026-11-30', banner_until='2026-11-30' WHERE id='ev1'").run();
  raw.prepare("INSERT INTO banner_stats (installer_id, day, imp, click) VALUES ('ev:ev1','2026-11-06',12,3), ('ev:ev1','2026-11-05',8,1)").run();
  const r = await J(featurable({ request: req("/api/me/featurable", null, me.cookie), env })); assert.equal(r.status, 200);
  const e = r.body.events.find((x) => x.id === "ev1");
  assert.deepEqual(e.banner, { shown: 20, taps: 4 }); assert.equal(e.banner_until, "2026-11-30");
  assert.deepEqual([e.quotes.ev_pin.cents, e.quotes.ev_pin.problem === "", e.quotes.ev_all.cents, e.quotes.ev_all.added], [0, false, 2500, ["top"]], "pin and banner held: all adds only the top of the list; the pin alone adds nothing");
  assert.match(e.quotes.ev_banner.problem, /Nothing to add/);
}));

test("/api/feature/quote: the add-event page gets the same quotes for a new event's dates", () => withNow(async () => {
  const r = await J(quoteGet({ request: req("/api/feature/quote?start=2026-11-10&end=2027-03-01") }));
  assert.deepEqual([r.body.quotes.ev_pin.cents, r.body.quotes.ev_all.cents, r.body.quotes.ev_all.to, r.body.quotes.ev_all.capped], [2500, 7500, "2027-01-06", "season"]);
  assert.equal((await J(quoteGet({ request: req("/api/feature/quote?start=nope") }))).status, 400);
}));

test("admin: the events editor shows the placement fields; a level or date can never go below a paid order that is still running; raising is fine", () => withNow(async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: "2026-11-10", end_date: "2027-03-01" });
  await pay(env, 1, "ev_all", 7500, { quote: [T, "2027-01-06", 7500] });
  const g = await J(adminEventGet({ params: { id: "ev1" }, env })); assert.deepEqual([g.body.featured, g.body.featured_until, g.body.banner_until, g.body.floor], [2, "2027-01-06", "2027-01-06", { featured: 2, featured_until: "2027-01-06", banner_until: "2027-01-06" }]);
  const ev = { id: "ev1", name: "Light Show", county: "Los Angeles", city: "Pasadena", type: "walk", start: "2026-11-10", end: "2027-03-01", status: "confirmed", season: "christmas", lat: 34, lng: -118 };
  const save = (placement) => J(adminEventSave({ request: req("/api/admin/events", { ...ev, ...(placement ? { placement } : {}) }), env }));
  const r1 = await save({ featured: 2, featured_until: "2027-01-06", banner_until: "2027-01-01" }); assert.equal(r1.status, 400); assert.match(r1.body.error, /banner date cannot be earlier/);
  const r2 = await save({ featured: 1, featured_until: "2027-01-06", banner_until: "2027-01-06" }); assert.equal(r2.status, 400); assert.match(r2.body.error, /cannot be lowered/);
  const r3 = await save({ featured: 2, featured_until: "2027-01-05", banner_until: "2027-01-06" }); assert.equal(r3.status, 400);
  assert.deepEqual(place(raw), [2, "2027-01-06", "2027-01-06"], "nothing changed by the refused saves");
  assert.equal((await save({ featured: 2, featured_until: "2027-02-10", banner_until: "2027-02-10" })).status, 200); assert.deepEqual(place(raw), [2, "2027-02-10", "2027-02-10"]);
  assert.equal((await save()).status, 200); assert.deepEqual(place(raw), [2, "2027-02-10", "2027-02-10"], "a save without the placement fields leaves them alone");
  assert.deepEqual(await eventFloor(env.DB, "ev1", T), { featured: 2, featured_until: "2027-01-06", banner_until: "2027-01-06" });
  // with no running order, the admin can turn everything off
  await sendWebhook(webhook, env, refundOf(1)); assert.equal((await save({ featured: 0, featured_until: "", banner_until: "" })).status, 200); assert.deepEqual(place(raw), [0, null, null]);
}));

test("Admin > Orders shows the plan, the banner date it wrote and the event's banner now; an order with a banner still running blocks a silent delete", () => withNow(async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { start_date: "2026-11-10", end_date: "2026-11-30" });
  await pay(env, 1, "ev_banner", 5000, { quote: [T, "2026-11-30", 5000] });
  const rows = (await J(ordersGet({ env }))).body, o = rows.find((x) => x.session_id === "cs_1");
  assert.deepEqual([o.plan, o.applied_featured, o.applied_until, o.applied_banner_until, o.ev_banner], ["ev_banner", 1, "2026-11-30", "2026-11-30", "2026-11-30"]);
  const del = await J(adminEventDelete({ request: new Request("https://socallights.app/api/admin/events/ev1", { method: "DELETE" }), params: { id: "ev1" }, env })); assert.equal(del.status, 409);
}));

// ---- copy: the pages and the shared module (no hardcoded prices, every tier lists its contents in full, no "Everything in") ----
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (["vendor", "tutorials", "img"].includes(n) ? [] : walk(p)) : [p]; });
test("copy: no 'Everything in' / 'Everything above' on any page, script or email default; event tiers list their contents in full", () => {
  const files = [...walk("public").filter((p) => /\.(html|js)$/.test(p)), "functions/_lib/mailtpl.js", "functions/_lib/featuremail.js"];
  for (const f of files) assert.doesNotMatch(readFileSync(f, "utf8").replace(/(^|\s)\/\/.*$/gm, ""), /Everything (in|above)/i, f); // comments that forbid the phrase do not count
  for (const k of EVENT_KEYS) { const c = eventTierCopy(k).bullets.join("\n"); assert.match(c, /gold-ringed pin/); assert.match(c, /"Featured" badge/); assert.match(c, /Runs from the moment you pay until your event ends or the season ends \(Christmas lights: Jan 6\), whichever comes first/); }
  assert.match(eventTierCopy("ev_banner").bullets.join("\n"), /pill labelled "Featured" in the strip at the top of the map list/); assert.doesNotMatch(eventTierCopy("ev_banner").bullets.join("\n"), /listed first/);
  assert.match(eventTierCopy("ev_top").bullets.join("\n"), /listed first when people browse your area/); assert.doesNotMatch(eventTierCopy("ev_top").bullets.join("\n"), /pill/);
  const all = eventTierCopy("ev_all").bullets.join("\n"); assert.match(all, /pill labelled "Featured"/); assert.match(all, /listed first/); assert.match(all, /gold-ringed pin/);
});
test("copy: the pages show prices from /api/config, never hardcoded", () => {
  for (const f of ["public/pricing.html", "public/feature.html", "public/add-event.html", "public/sponsor.html", "public/feature-plans.js", "public/sponsor-plans.js"]) {
    const t = readFileSync(f, "utf8").replace(/\$\{[^}]*\}/g, ""); // template placeholders are not prices
    assert.doesNotMatch(t, /\$(25|50|75)(?![0-9])/, f + ": a price is written in the page");
  }
  const p = readFileSync("public/pricing.html", "utf8"); assert.match(p, /cfg\.eventPlans/); assert.match(p, /data-choose|href="\/feature\?plan=\$\{k\}"/);
  assert.match(readFileSync("public/feature.html", "utf8"), /cfg\.eventPlans/); assert.match(readFileSync("public/add-event.html", "utf8"), /cfg\.eventPlans/);
});
test("copy: the strip's empty pill says 'Advertise here' and points at /pricing; event pills are labelled Featured", () => {
  const b = readFileSync("public/banner.js", "utf8");
  assert.match(b, /href="\/pricing">Advertise here</); assert.doesNotMatch(b, /Installers: advertise here|pricing#banner/);
  assert.match(b, /sp-lbl">Featured</); assert.match(b, /EVENT_PILLS_MAX = 3/);
});
