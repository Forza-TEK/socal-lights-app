// Payments audit 2026-11-07: H2 (banners use the Pacific date), M1 (the quote is locked at checkout; duplicate sessions never double-book silently), M2 (renewing banner + top with the banner already booked costs the difference).
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as bannerList } from "../functions/api/banner/index.js";
import { onRequestPost as bannerHit } from "../functions/api/banner/hit.js";
import { onRequestGet as manageGet } from "../functions/api/installers/[slug]/manage.js";
import { onRequestPost as checkout } from "../functions/api/sponsor/checkout.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { ptToday } from "../functions/_lib/featured.js";
import { sponsorWindow } from "../functions/_lib/sponsor.js";
import { newEnv, addUser, stubFetch, stripeEvent, sendWebhook, session, getOrder, freezeNow } from "./_pay.mjs";

const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})) }; };
const rq = (url, body, cookie) => new Request("https://socallights.app" + url, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
async function setup(o = {}) {
  const { env, raw } = newEnv();
  raw.prepare("INSERT INTO installers (id,slug,name,web,phone,area,owner_email,banner_until,top_until) VALUES ('i1','bright-nights','Bright Nights','https://b.example','626-555-0100','Orange County','owner@example.com',?,?)").run(o.banner || "", o.top || "");
  return { env, raw, me: await addUser(raw, "u1", "owner@example.com") };
}
const listed = async (env) => (await J(bannerList({ env }))).body.map((x) => x.n);
const getInst = (raw) => ({ ...raw.prepare("SELECT * FROM installers WHERE id = 'i1'").get() });

test("H2: one Pacific date. A banner whose last paid day is today still shows at 4:30 pm Pacific (00:30 UTC next day), summer and winter, and is gone the next Pacific day", async () => {
  for (const [last, atLastDayEvening, nextMorning] of [["2026-11-02", "2026-11-03T00:30:00Z", "2026-11-03T16:00:00Z"], ["2027-07-09", "2027-07-10T00:30:00Z", "2027-07-10T08:00:00Z"]]) {
    const { env } = await setup({ banner: last });
    let un = freezeNow(atLastDayEvening); try { assert.deepEqual(await listed(env), ["Bright Nights"], "4:30 pm Pacific on " + last + " still shows"); } finally { un(); }
    un = freezeNow(nextMorning); try { assert.deepEqual(await listed(env), [], "the next Pacific day it is off"); } finally { un(); }
  }
});

test("H2: ptToday is the real Pacific date, including daylight saving, and the banner stats and dashboard use it", async () => {
  const at = (iso) => { const un = freezeNow(iso); try { return ptToday(); } finally { un(); } };
  assert.equal(at("2026-11-07T07:59:00Z"), "2026-11-06", "PST: 11:59 pm"); assert.equal(at("2026-11-07T08:00:00Z"), "2026-11-07", "PST midnight is 08:00Z");
  assert.equal(at("2027-07-10T06:59:00Z"), "2027-07-09", "PDT: 11:59 pm"); assert.equal(at("2027-07-10T07:00:00Z"), "2027-07-10", "PDT midnight is 07:00Z, not 08:00Z");
  assert.equal(at("2027-03-14T09:59:00Z"), "2027-03-14"); assert.equal(at("2027-03-14T07:59:00Z"), "2027-03-13", "the spring-forward night");
  const { env, raw, me } = await setup({ banner: "2027-01-06" });
  const un = freezeNow("2027-01-07T00:30:00Z"); // 4:30 pm Pacific on the last day
  try {
    assert.equal((await J(bannerHit({ request: rq("/api/banner/hit", { id: "i1", k: "imp" }), env }))).status, 200);
    assert.equal(raw.prepare("SELECT day FROM banner_stats WHERE installer_id = 'i1'").get().day, "2027-01-06", "counted on the Pacific day");
    const g = await J(manageGet({ params: { slug: "bright-nights" }, request: rq("/api/installers/bright-nights/manage", null, me.cookie), env }));
    assert.equal(g.body.placement.banner_until, "2027-01-06", "the dashboard still shows it running"); assert.ok(g.body.banner);
  } finally { un(); }
});

test("M2: renewing banner + top while the banner is already booked into the next season costs the $25 difference, not $75", () => {
  const w = sponsorWindow("banner_top", { banner_until: "2027-01-31", top_until: "2027-01-06" }, "2026-12-14");
  assert.deepEqual([w.from, w.to, w.running, w.upgrade, w.cents], ["2027-01-07", "2027-01-31", true, true, 2500]);
  assert.equal(sponsorWindow("banner_top", { banner_until: "2027-01-06", top_until: "2027-01-06" }, "2026-12-14").cents, 7500, "banner not pre-booked: the full price");
});

// a checkout through the real endpoint, returning the Stripe session fields the buyer would pay on
async function openCheckout(env, me, plan) {
  const f = stubFetch();
  try { const r = await J(checkout({ request: rq("/api/sponsor/checkout", { installer: "bright-nights", plan }, me.cookie), env })); assert.equal(r.status, 200); return Object.fromEntries(new URLSearchParams(String(f.calls[0].init.body))); } finally { f.restore(); }
}
const payFor = (env, n, q) => sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ id: "cs_" + n, payment_intent: "pi_" + n, amount_total: Number(q["line_items[0][price_data][unit_amount]"]), metadata: { event_id: q["metadata[event_id]"], target: "installer", plan: q["metadata[plan]"], user_id: "u1", quote_from: q["metadata[quote_from]"], quote_to: q["metadata[quote_to]"], quote_cents: q["metadata[quote_cents]"] } })));

test("M1: checkout puts the quoted dates and price in the session; paying applies exactly that, even if the payment arrives the next day", async () => {
  const { env, raw, me } = await setup(); let un = freezeNow("2026-11-06T20:00:00Z"), q;
  try { q = await openCheckout(env, me, "banner"); } finally { un(); }
  assert.deepEqual([q["metadata[quote_from]"], q["metadata[quote_to]"], q["metadata[quote_cents]"]], ["2026-11-06", "2027-01-06", "5000"]);
  un = freezeNow("2026-11-07T20:00:00Z"); try { assert.equal((await payFor(env, 1, q)).status, 200); } finally { un(); }
  const o = getOrder(raw, "cs_1"); assert.deepEqual([o.status, o.applied, o.note, o.quote_from, o.quote_to, o.amount], ["paid", 1, null, "2026-11-06", "2027-01-06", 5000]);
  assert.equal(getInst(raw).banner_until, "2027-01-06");
});

test("M1: two checkout pages for the same plan (a stale second tab): the second payment is NOT applied, it is held for a refund with a note, never silently double-booked", async () => {
  const { env, raw, me } = await setup(); let un = freezeNow("2026-11-06T20:00:00Z"), a, b;
  try { a = await openCheckout(env, me, "banner"); b = await openCheckout(env, me, "banner"); } finally { un(); }
  un = freezeNow("2026-11-06T21:00:00Z");
  try { await payFor(env, 1, a); await payFor(env, 2, b); } finally { un(); }
  assert.equal(getOrder(raw, "cs_1").applied, 1);
  const o2 = getOrder(raw, "cs_2"); assert.deepEqual([o2.status, o2.applied], ["refund_due", 0]);
  assert.match(o2.note, /^\[auto\] quote changed: quoted 2026-11-06 to 2027-01-06 for 50.00 USD, but the placement would now run 2027-01-07 to 2027-01-31/);
  assert.equal(getInst(raw).banner_until, "2027-01-06", "only one season was applied");
  // the owner refunds it in Stripe and marks it: nothing to switch off
  const { onRequestPost: act } = await import("../functions/api/admin/orders/[id].js");
  const r = await J(act({ request: rq("/api/admin/orders/cs_2", { action: "mark_refunded" }), env, params: { id: "cs_2" }, data: { admin: { email: "o@x.com" } } }));
  assert.equal(r.status, 200); assert.equal(getInst(raw).banner_until, "2027-01-06"); assert.equal(getOrder(raw, "cs_2").status, "refunded");
});

test("M1: a deliberate renewal (the checkout was opened while the first placement was already running) is a normal order", async () => {
  const { env, raw, me } = await setup({ banner: "2027-01-06" }); const un = freezeNow("2026-11-06T20:00:00Z");
  try { const q = await openCheckout(env, me, "banner"); assert.equal(q["metadata[quote_from]"], "2027-01-07"); await payFor(env, 1, q); } finally { un(); }
  assert.deepEqual([getOrder(raw, "cs_1").status, getOrder(raw, "cs_1").note], ["paid", null]); assert.equal(getInst(raw).banner_until, "2027-01-31");
});

test("M1: a $75 payment quoted before another session bought the banner is held, not applied with a silent $50 overpay", async () => {
  const { env, raw, me } = await setup(); let un = freezeNow("2026-11-06T20:00:00Z"), top, banner;
  try { top = await openCheckout(env, me, "banner_top"); banner = await openCheckout(env, me, "banner"); } finally { un(); }
  assert.equal(top["metadata[quote_cents]"], "7500");
  un = freezeNow("2026-11-06T21:00:00Z"); try { await payFor(env, 1, banner); await payFor(env, 2, top); } finally { un(); }
  const o = getOrder(raw, "cs_2"); assert.deepEqual([o.status, o.applied], ["refund_due", 0]); assert.match(o.note, /quote changed.*75.00 USD.*25.00 USD/);
  assert.equal(getInst(raw).top_until, "", "the top card was not switched on by the stale payment");
});
