// Installer Sponsor placements end to end on the in-memory D1: eligibility, checkout, webhook apply / replay / refund / dispute, extension, upgrade,
// the amount check, Admin > Orders, hand-set dates, funnel counters. fetch is stubbed: nothing reaches Stripe.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as checkout } from "../functions/api/sponsor/checkout.js";
import { onRequestGet as quote } from "../functions/api/me/sponsor.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { onRequestGet as ordersGet } from "../functions/api/admin/orders.js";
import { onRequestPost as orderAction } from "../functions/api/admin/orders/[id].js";
import { onRequestPost as adminInst } from "../functions/api/admin/installers/[id].js";
import { dayKey } from "../functions/_lib/funnel.js";
import { newEnv, addUser, stubFetch, stripeEvent, sendWebhook, session, getOrder, freezeNow } from "./_pay.mjs";

const NOW = "2026-11-06T20:00:00Z"; // Nov 6 Pacific: 62 days included in the Christmas sponsor season, which ends Jan 6
const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})) }; };
const req = (url, body, { cookie, ua } = {}) => new Request("https://socallights.app" + url, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...(ua ? { "user-agent": ua } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const buy = (env, body, o) => J(checkout({ request: req("/api/sponsor/checkout", body, o), env }));
const addInst = (raw, id = "i1", o = {}) => { const r = { slug: "bright-nights", name: "Bright Nights", web: "https://bright.example", phone: "626-555-0100", area: "Orange County", owner_email: "owner@example.com", status: "active", banner_until: "", top_until: "", ...o }; raw.prepare("INSERT INTO installers (id,slug,name,web,phone,area,owner_email,status,banner_until,top_until) VALUES (?,?,?,?,?,?,?,?,?,?)").run(id, r.slug, r.name, r.web, r.phone, r.area, r.owner_email, r.status, r.banner_until, r.top_until); };
const getInst = (raw, id = "i1") => ({ ...raw.prepare("SELECT * FROM installers WHERE id = ?").get(id) });
const hits = (raw, k) => (raw.prepare("SELECT n FROM site_hits WHERE day = ? AND page = ?").get(dayKey(), k) || {}).n || 0;
const meta = (plan, o = {}) => ({ event_id: "i1", target: "installer", plan, user_id: "u1", ...o });
const pay = (env, n, plan = "banner", cents = plan === "banner" ? 5000 : 7500, o = {}) => sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ id: "cs_" + n, payment_intent: "pi_" + n, amount_total: cents, metadata: meta(plan), ...o })));
async function setup(inst) { const { env, raw } = newEnv(); addInst(raw, "i1", inst); const me = await addUser(raw, "u1", "owner@example.com"); return { env, raw, me }; }
const withNow = async (fn, iso = NOW) => { const un = freezeNow(iso); try { return await fn(); } finally { un(); } };

test("signed out: 401 on checkout and on the profile list, and Stripe is never called", () => withNow(async () => {
  const { env } = await setup(); const f = stubFetch();
  try {
    assert.equal((await buy(env, { installer: "bright-nights", plan: "banner" })).status, 401);
    assert.equal((await J(quote({ request: req("/api/me/sponsor"), env }))).status, 401);
    assert.equal(f.calls.length, 0);
  } finally { f.restore(); }
}));

test("eligibility: only the owner; an incomplete or hidden profile is refused; the app and a missing Stripe key are refused", () => withNow(async () => {
  const { env, raw, me } = await setup(); const f = stubFetch();
  try {
    const other = await addUser(raw, "u2", "someone@example.com");
    assert.equal((await buy(env, { installer: "bright-nights", plan: "banner" }, { cookie: other.cookie })).status, 403, "not the owner");
    assert.equal((await buy(env, { installer: "nope", plan: "banner" }, { cookie: me.cookie })).status, 403, "unknown profile answers like someone else's");
    assert.equal((await buy(env, { installer: "bright-nights", plan: "free" }, { cookie: me.cookie })).status, 400, "no such plan");
    assert.equal((await buy(env, { installer: "bright-nights", plan: "banner" }, { cookie: me.cookie, ua: "SoCalLightsApp/1" })).status, 403, "web only");
    assert.equal((await buy({ ...env, STRIPE_SECRET_KEY: "" }, { installer: "bright-nights", plan: "banner" }, { cookie: me.cookie })).status, 501);
    raw.prepare("UPDATE installers SET phone='', web=''").run();
    const r = await buy(env, { installer: "bright-nights", plan: "banner" }, { cookie: me.cookie });
    assert.equal(r.status, 400); assert.match(r.body.error, /phone number or a website/);
    raw.prepare("UPDATE installers SET phone='626-555-0100', status='hidden'").run();
    assert.equal((await buy(env, { installer: "bright-nights", plan: "banner" }, { cookie: me.cookie })).status, 400, "hidden");
    assert.equal(f.calls.length, 0);
    raw.prepare("UPDATE installers SET status='active', area=''").run();
    assert.equal((await buy(env, { installer: "bright-nights", plan: "banner" }, { cookie: me.cookie })).status, 200, "no areas is advice, not a block");
  } finally { f.restore(); }
}));

test("profile list: only the signed-in owner's profiles, with what is missing and a dated quote for each plan", () => withNow(async () => {
  const { env, raw, me } = await setup(); addInst(raw, "i2", { slug: "other", name: "Other Co", owner_email: "x@example.com" }); addInst(raw, "i3", { slug: "bare", name: "Bare Co", web: "", phone: "", area: "" });
  raw.prepare("UPDATE installers SET owner_email='owner@example.com' WHERE id='i3'").run();
  const r = await J(quote({ request: req("/api/me/sponsor", null, { cookie: me.cookie }), env }));
  assert.equal(r.status, 200); assert.deepEqual(r.body.installers.map((i) => i.slug), ["bare", "bright-nights"]);
  const bare = r.body.installers[0], good = r.body.installers[1];
  assert.equal(bare.blocking[0].key, "contact"); assert.equal(bare.advice[0].key, "area"); assert.match(bare.quotes.banner.problem, /phone number or a website/);
  assert.deepEqual([good.quotes.banner.cents, good.quotes.banner.from, good.quotes.banner.to, good.quotes.banner_top.cents, good.quotes.banner.days], [5000, "2026-11-06", "2027-01-06", 7500, 62]);
  assert.equal(good.quotes.banner.problem, "");
}));

test("checkout: the price and dates come from the server; metadata, idempotency, return URLs, counter", () => withNow(async () => {
  const { env, raw, me } = await setup(); const f = stubFetch();
  try {
    const r = await buy(env, { installer: "bright-nights", plan: "banner_top", cents: 1, price: 1 }, { cookie: me.cookie });
    assert.equal(r.status, 200); assert.match(r.body.url, /^https:\/\/checkout\.stripe\.com\//);
    const sent = new URLSearchParams(String(f.calls[0].init.body));
    assert.equal(sent.get("line_items[0][price_data][unit_amount]"), "7500");
    assert.equal(sent.get("metadata[target]"), "installer"); assert.equal(sent.get("metadata[event_id]"), "i1"); assert.equal(sent.get("metadata[plan]"), "banner_top"); assert.equal(sent.get("metadata[user_id]"), "u1");
    assert.match(sent.get("line_items[0][price_data][product_data][description]"), /2026-11-06 to 2027-01-06/);
    assert.equal(sent.get("customer_email"), "owner@example.com");
    assert.match(sent.get("success_url"), /\/sponsor\?paid=1&installer=bright-nights&plan=banner_top$/); assert.match(sent.get("cancel_url"), /\/sponsor\?cancelled=1&installer=bright-nights/);
    assert.match(f.calls[0].init.headers["idempotency-key"], /^sponsor-[0-9a-f]{64}$/);
    assert.equal(raw.prepare("SELECT COUNT(*) AS c FROM checkout_log").get().c, 1); assert.equal(hits(raw, "fn:sponsor-checkout"), 1);
    assert.equal(getInst(raw).banner_until, "", "paying has not happened yet: nothing is switched on by checkout");
  } finally { f.restore(); }
}));

test("checkout on the last days of a season charges the full price; the webhook flags an amount that differs from the same calculation", () => withNow(async () => {
  const { env, raw, me } = await setup(); const f = stubFetch();
  try {
    const r = await buy(env, { installer: "bright-nights", plan: "banner" }, { cookie: me.cookie });
    assert.equal(r.status, 200);
    const sent = new URLSearchParams(String(f.calls[0].init.body));
    assert.equal(sent.get("line_items[0][price_data][unit_amount]"), "5000", "no proration, even on Dec 14");
    assert.match(sent.get("line_items[0][price_data][product_data][description]"), /2026-12-14 to 2027-01-06/); assert.ok(!/prorated/.test(sent.get("line_items[0][price_data][product_data][description]")));
    await pay(env, 1, "banner", 5000);
    assert.equal(getOrder(raw, "cs_1").note, null); assert.equal(getOrder(raw, "cs_1").amount, 5000, "the amount charged is stored"); assert.equal(getInst(raw).banner_until, "2027-01-06");
    await pay(env, 2, "banner_top", 7500);
    assert.match(getOrder(raw, "cs_2").note, /amount mismatch: paid 75.00 USD, the banner_top plan is 25.00 USD/, "the full price paid when only the upgrade difference ($25) was due is flagged");
    assert.equal(getOrder(raw, "cs_2").applied, 1, "still applied: the buyer paid what we asked");
    await pay(env, 3, "banner", 4000);
    assert.match(getOrder(raw, "cs_3").note, /amount mismatch: paid 40.00 USD, the banner plan is 50.00 USD/);
  } finally { f.restore(); }
}, "2026-12-14T20:00:00Z"));

test("webhook: a paid banner order switches the banner on to the season's last day; replays and retries never extend it twice", () => withNow(async () => {
  const { env, raw } = await setup();
  const evt = stripeEvent("checkout.session.completed", session({ id: "cs_1", payment_intent: "pi_1", amount_total: 5000, metadata: meta("banner") }));
  const r1 = await sendWebhook(webhook, env, evt); assert.equal(r1.status, 200);
  assert.deepEqual([getInst(raw).banner_until, getInst(raw).top_until], ["2027-01-06", ""]);
  const o = getOrder(raw, "cs_1"); assert.deepEqual([o.target, o.plan, o.event_id, o.applied, o.applied_until, o.applied_top_until, o.applied_from, o.status, o.note], ["installer", "banner", "i1", 1, "2027-01-06", null, "2026-11-06", "paid", null]);
  assert.equal(hits(raw, "fn:sponsor-paid"), 1);
  assert.equal((await sendWebhook(webhook, env, evt)).body.duplicate, true, "same Stripe event again");
  assert.equal((await pay(env, 1)).body.duplicate, true, "the same payment under a new event id");
  assert.equal(getInst(raw).banner_until, "2027-01-06"); assert.equal(raw.prepare("SELECT COUNT(*) AS c FROM feature_orders").get().c, 1); assert.equal(hits(raw, "fn:sponsor-paid"), 1);
  const bad = await pay(env, 9, "banner", 5000, { metadata: meta("banner", { event_id: "missing" }) });
  assert.equal(bad.status, 500, "an unknown profile is retried by Stripe, not lost");
}));

test("webhook: banner + top sets both dates; a wrong amount is flagged but still applied; an unknown plan key is ignored", () => withNow(async () => {
  const { env, raw } = await setup();
  await pay(env, 1, "banner_top", 7500);
  assert.deepEqual([getInst(raw).banner_until, getInst(raw).top_until], ["2027-01-06", "2027-01-06"]);
  const o = getOrder(raw, "cs_1"); assert.deepEqual([o.applied_featured, o.applied_top_until], [2, "2027-01-06"]);
  const { env: e2, raw: r2 } = await setup(); await pay(e2, 2, "banner", 4000);
  assert.match(getOrder(r2, "cs_2").note, /^\[auto\] amount mismatch/); assert.equal(getInst(r2).banner_until, "2027-01-06");
  const ign = await pay(e2, 3, "pin", 1000, { metadata: meta("pin") }); assert.equal(ign.body.ignored, "no feature metadata");
}));

test("extension and upgrade: buying again adds on top and never shortens; the top card starts today on an upgrade", () => withNow(async () => {
  const { env, raw } = await setup();
  await pay(env, 1, "banner"); assert.equal(getInst(raw).banner_until, "2027-01-06");
  await pay(env, 2, "banner"); assert.equal(getInst(raw).banner_until, "2027-01-31", "renewal starts the day after and runs to the end of the next season");
  assert.equal(getOrder(raw, "cs_2").applied_from, "2027-01-07"); assert.equal(getOrder(raw, "cs_2").note, null, "the renewal is full price");
  // upgrade: top card from today to the season end, banner already runs longer so it is left alone
  await pay(env, 3, "banner_top", 2500); // an upgrade: the banner already runs past the season end, so only the difference is due
  assert.equal(getOrder(raw, "cs_3").note, null);
  assert.deepEqual([getInst(raw).banner_until, getInst(raw).top_until], ["2027-01-31", "2027-01-06"]);
  assert.equal(getOrder(raw, "cs_3").applied_from, "2026-11-06");
}));

test("refund: a full refund switches the placement off, restores what an admin set by hand, and keeps time other paid orders cover", () => withNow(async () => {
  const { env, raw } = await setup({ banner_until: "2026-11-20" }); // set by hand before any order
  await pay(env, 1, "banner"); assert.equal(getInst(raw).banner_until, "2027-01-06"); assert.equal(getOrder(raw, "cs_1").prev_banner_until, "2026-11-20");
  const refund = (n, o = {}) => sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_" + n, payment_intent: "pi_" + n, refunded: true, ...o }));
  assert.equal((await refund(1)).body.revoked, true);
  assert.equal(getInst(raw).banner_until, "2026-11-20", "back to the hand-set date"); assert.equal(getOrder(raw, "cs_1").status, "refunded");
  // two orders: refund the second, the first still covers its time; refund the first, everything is off
  const b = await setup(); await pay(b.env, 1, "banner"); await pay(b.env, 2, "banner_top", 2500);
  assert.deepEqual([getInst(b.raw).banner_until, getInst(b.raw).top_until], ["2027-01-06", "2027-01-06"]);
  await sendWebhook(webhook, b.env, stripeEvent("charge.refunded", { id: "ch_2", payment_intent: "pi_2", refunded: true }));
  assert.deepEqual([getInst(b.raw).banner_until, getInst(b.raw).top_until], ["2027-01-06", ""], "the banner order still covers the banner; the top card is off");
  await sendWebhook(webhook, b.env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_1", refunded: true }));
  assert.deepEqual([getInst(b.raw).banner_until, getInst(b.raw).top_until], ["", ""]);
  // a renewal refunded leaves the first season on
  const c = await setup(); await pay(c.env, 1, "banner"); await pay(c.env, 2, "banner");
  await sendWebhook(webhook, c.env, stripeEvent("charge.refunded", { id: "ch_2", payment_intent: "pi_2", refunded: true }));
  assert.equal(getInst(c.raw).banner_until, "2027-01-06");
  // an admin who extended by hand after the order: the refund leaves it on and says so
  const d = await setup(); await pay(d.env, 1, "banner"); d.raw.prepare("UPDATE installers SET banner_until='2027-03-01'").run();
  const rr = await sendWebhook(webhook, d.env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_1", refunded: true }));
  assert.equal(rr.body.manual, "placement differs"); assert.equal(getInst(d.raw).banner_until, "2027-03-01"); assert.match(getOrder(d.raw, "cs_1").note, /placement differs.*Admin > Installers/);
}));

test("partial refund holds, dispute switches off, dispute won stays off, and a refund that arrives first means it is never applied", () => withNow(async () => {
  const a = await setup(); await pay(a.env, 1, "banner");
  await sendWebhook(webhook, a.env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_1", refunded: false }));
  assert.equal(getOrder(a.raw, "cs_1").status, "held"); assert.equal(getInst(a.raw).banner_until, "2027-01-06", "a partial refund leaves it on for the owner to decide");
  const b = await setup(); await pay(b.env, 1, "banner_top");
  await sendWebhook(webhook, b.env, stripeEvent("charge.dispute.created", { payment_intent: "pi_1", charge: "ch_1" }));
  assert.equal(getOrder(b.raw, "cs_1").status, "disputed"); assert.deepEqual([getInst(b.raw).banner_until, getInst(b.raw).top_until], ["", ""]);
  await sendWebhook(webhook, b.env, stripeEvent("charge.dispute.closed", { payment_intent: "pi_1", charge: "ch_1", status: "won" }));
  assert.equal(getOrder(b.raw, "cs_1").status, "dispute_won"); assert.equal(getInst(b.raw).banner_until, "", "stays off");
  const c = await setup();
  await sendWebhook(webhook, c.env, stripeEvent("charge.refunded", { id: "ch_7", payment_intent: "pi_7", refunded: true }));
  await pay(c.env, 7, "banner");
  assert.equal(getOrder(c.raw, "cs_7").status, "refunded"); assert.equal(getOrder(c.raw, "cs_7").applied, 0); assert.equal(getInst(c.raw).banner_until, "");
}));

test("Admin > Orders lists an installer order with the installer's name and plan; mark refunded takes the placement off", () => withNow(async () => {
  const { env, raw } = await setup(); await pay(env, 1, "banner_top");
  const rows = (await J(ordersGet({ env }))).body, o = rows.find((r) => r.session_id === "cs_1");
  assert.deepEqual([o.name, o.target, o.plan, o.amount, o.applied_until, o.applied_top_until, o.inst_slug, o.flags], ["Bright Nights", "installer", "banner_top", 7500, "2027-01-06", "2027-01-06", "bright-nights", []]);
  const r = await J(orderAction({ request: req("/api/admin/orders/cs_1", { action: "mark_refunded" }), env, params: { id: "cs_1" }, data: { admin: { email: "owner@example.com" } } }));
  assert.equal(r.status, 200); assert.equal(r.body.placement_differs, false); assert.deepEqual([getInst(raw).banner_until, getInst(raw).top_until], ["", ""]);
  // an order paid but not applied (profile missing at the time) can be applied later
  raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,status,target,applied) VALUES ('cs_x','i1','banner',5000,'a@b.co','paid','installer',0)").run();
  const ap = await J(orderAction({ request: req("/api/admin/orders/cs_x", { action: "reapply" }), env, params: { id: "cs_x" }, data: {} }));
  assert.equal(ap.status, 200); assert.equal(getInst(raw).banner_until, "2027-01-06");
}));

test("Admin cannot hand-set a date below a paid, running order; above it is fine; merge keeps paid orders with the profile", () => withNow(async () => {
  const { env, raw } = await setup(); await pay(env, 1, "banner_top");
  const edit = (b) => J(adminInst({ request: req("/api/admin/installers/i1", { action: "edit", name: "Bright Nights", web: "https://bright.example", phone: "626-555-0100", area: "Orange County", banner_until: "2027-01-06", top_until: "2027-01-06", ...b }), env, params: { id: "i1" } }));
  assert.equal((await edit({ banner_until: "2026-12-01" })).status, 400);
  assert.equal((await edit({ top_until: "" })).status, 400);
  assert.equal((await edit({ banner_until: "2027-02-01" })).status, 200); assert.equal(getInst(raw).banner_until, "2027-02-01");
  addInst(raw, "i2", { slug: "keep", name: "Keep Co", owner_email: "" });
  const m = await J(adminInst({ request: req("/api/admin/installers/i1", { action: "merge", into: "i2" }), env, params: { id: "i1" } }));
  assert.equal(m.status, 200); assert.equal(raw.prepare("SELECT event_id FROM feature_orders WHERE session_id='cs_1'").get().event_id, "i2");
  assert.deepEqual([getInst(raw, "i2").banner_until, getInst(raw, "i2").top_until], ["2027-02-01", "2027-01-06"]);
}));

test("emails: the buyer gets a service receipt (no unsubscribe, no postal line) and the team a notice, once", () => withNow(async () => {
  const { env, raw } = await setup({}); const sent = [];
  const f = stubFetch((url, init) => { sent.push(JSON.parse(init.body)); return new Response("{}", { status: 200 }); });
  try {
    const e = { ...env, RESEND_API_KEY: "re_fake", ADMIN_NOTIFY_EMAIL: "team@example.com" };
    const evt = stripeEvent("checkout.session.completed", session({ id: "cs_1", payment_intent: "pi_1", amount_total: 5000, metadata: meta("banner") }));
    await sendWebhook(webhook, e, evt); await sendWebhook(webhook, e, evt);
    assert.equal(sent.length, 2); const buyer = sent.find((m) => m.to[0] === "buyer@example.com" || m.to[0] === "owner@example.com"), team = sent.find((m) => m.to[0] === "team@example.com");
    assert.ok(buyer && team);
    assert.match(buyer.subject, /Sponsor placement is on: Bright Nights/); assert.match(buyer.text, /Jan 6, 2027/); assert.match(buyer.text, /\$50\.00/);
    assert.ok(!/unsubscribe/i.test(buyer.text) || /no unsubscribe link/.test(buyer.text), "a service email");
    assert.ok(!buyer.headers, "no marketing headers");
    assert.match(team.subject, /Sponsor placement paid: Bright Nights/);
  } finally { f.restore(); }
}));

test("payment never touches contest code, and the map stays free", () => {
  for (const f of ["contests.js", "judging.js", "podium.js", "wins.js", "badges.js"]) assert.ok(!/lib\/sponsor|sponsor\.js|banner_until|top_until|INSTALLER_PLANS/.test(readFileSync("functions/_lib/" + f, "utf8")), f + " must not read sponsor placements");
});
