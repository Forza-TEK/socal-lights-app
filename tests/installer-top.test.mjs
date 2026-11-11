// Installer plans after 2026-11-06: Banner $50, Top of the list $50 (the company card WITHOUT the banner), both together $75. The top plan writes top_until only; upgrades to both cost the
// difference ($25) when the held one runs to the season end; the other single product is a full separate purchase; a plan that adds nothing is refused. In-memory D1; no Stripe.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as checkout } from "../functions/api/sponsor/checkout.js";
import { onRequestGet as quote } from "../functions/api/me/sponsor.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { onRequestGet as bannerList } from "../functions/api/banner/index.js";
import { onRequestPost as bannerHit } from "../functions/api/banner/hit.js";
import { onRequestGet as ordersGet } from "../functions/api/admin/orders.js";
import { INSTALLER_PLANS } from "../functions/_lib/featured.js";
import { sponsorWindow, sponsorProblem, planEnds } from "../functions/_lib/sponsor.js";
import { renewingPlan } from "../functions/_lib/renewal.js";
import { flagRefundDue } from "../functions/_lib/orders.js";
import { sponsorCopy, SPONSOR_KEYS } from "../public/sponsor-plans.js";
import { newEnv, addUser, stubFetch, stripeEvent, sendWebhook, session, getOrder, freezeNow } from "./_pay.mjs";

const NOW = "2026-11-06T20:00:00Z", T = "2026-11-06";
const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})) }; };
const req = (url, body, cookie) => new Request("https://socallights.app" + url, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const buy = (env, body, cookie) => J(checkout({ request: req("/api/sponsor/checkout", body, cookie), env }));
const addInst = (raw, o = {}) => { const r = { id: "i1", slug: "bright-nights", name: "Bright Nights", web: "https://bright.example", phone: "626-555-0100", area: "Orange County", owner_email: "owner@example.com", status: "active", banner_until: "", top_until: "", ...o }; raw.prepare("INSERT INTO installers (id,slug,name,web,phone,area,owner_email,status,banner_until,top_until) VALUES (?,?,?,?,?,?,?,?,?,?)").run(r.id, r.slug, r.name, r.web, r.phone, r.area, r.owner_email, r.status, r.banner_until, r.top_until); };
const getInst = (raw) => ({ ...raw.prepare("SELECT * FROM installers WHERE id = 'i1'").get() });
const pay = (env, n, plan, cents, quoteTo = "2027-01-06") => sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ id: "cs_" + n, payment_intent: "pi_" + n, amount_total: cents, metadata: { event_id: "i1", target: "installer", plan, user_id: "u1", quote_from: T, quote_to: quoteTo, quote_cents: String(cents) } })));
const refundOf = (n) => stripeEvent("charge.refunded", { id: "ch_" + n, payment_intent: "pi_" + n, refunded: true });
const ord = (raw, n) => ({ ...raw.prepare("SELECT * FROM feature_orders WHERE session_id = ?").get("cs_" + n) });
const withNow = async (fn, iso = NOW) => { const un = freezeNow(iso); try { return await fn(); } finally { un(); } };
async function setup(inst) { const { env, raw } = newEnv(); addInst(raw, inst); const me = await addUser(raw, "u1", "owner@example.com"); return { env, raw, me }; }

test("prices: Banner $50, Top of the list $50, both $75; each plan lists its contents in full", () => {
  assert.deepEqual(Object.entries(INSTALLER_PLANS).map(([k, p]) => [k, p.cents, p.banner, p.top]), [["banner", 5000, true, false], ["top", 5000, false, true], ["banner_top", 7500, true, true]]);
  assert.deepEqual(SPONSOR_KEYS, ["banner", "top", "banner_top"]);
  assert.match(sponsorCopy("top").bullets.join("\n"), /company card at the top of the list/); assert.match(sponsorCopy("top").bullets.join("\n"), /Not in the banner strip/);
  assert.match(sponsorCopy("banner").bullets.join("\n"), /Sponsor" banner/); assert.doesNotMatch(sponsorCopy("banner").bullets.join("\n"), /company card/);
  const both = sponsorCopy("banner_top").bullets.join("\n"); assert.match(both, /Sponsor" banner/); assert.match(both, /company card at the top of the list/);
  for (const k of SPONSOR_KEYS) assert.doesNotMatch(JSON.stringify(sponsorCopy(k)), /Everything (in|above)/);
});

test("quote: Top of the list costs $50, sets top only, to the season end (Jan 6), no proration", () => {
  const w = sponsorWindow("top", {}, T); assert.deepEqual([w.cents, w.from, w.to, w.days, w.upgrade, w.added, w.covered], [5000, T, "2027-01-06", 62, false, ["top"], []]);
  assert.equal(sponsorWindow("top", {}, "2026-12-20").cents, 5000, "the same price whenever it is bought"); assert.equal(sponsorWindow("top", {}, "2026-12-20").to, "2027-01-06");
});

test("upgrade: banner -> both and top -> both cost $25 (target minus held); the other single product is a full $50 and the UI can say both are $75", () => {
  const b = { banner_until: "2027-01-06", top_until: "" }, t = { banner_until: "", top_until: "2027-01-06" };
  assert.deepEqual([sponsorWindow("banner_top", b, T).cents, sponsorWindow("banner_top", b, T).upgrade, sponsorWindow("banner_top", b, T).covered, sponsorWindow("banner_top", b, T).added], [2500, true, ["banner"], ["top"]]);
  assert.deepEqual([sponsorWindow("banner_top", t, T).cents, sponsorWindow("banner_top", t, T).upgrade, sponsorWindow("banner_top", t, T).covered, sponsorWindow("banner_top", t, T).added], [2500, true, ["top"], ["banner"]]);
  assert.equal(sponsorWindow("top", b, T).cents, 5000, "banner held: the top of the list on its own is a full purchase"); assert.equal(sponsorWindow("top", b, T).upgrade, false);
  assert.equal(sponsorWindow("banner", t, T).cents, 5000, "top held: the banner on its own is a full purchase");
  assert.equal(sponsorWindow("banner_top", b, T).from, T, "the missing one starts today");
  // a banner that ends before the season end is not covered: full price of both
  assert.equal(sponsorWindow("banner_top", { banner_until: "2026-12-01", top_until: "" }, T).cents, 7500);
  // both held: buying both is a renewal of the next season at $75
  const both = sponsorWindow("banner_top", { banner_until: "2027-01-06", top_until: "2027-01-06" }, T); assert.deepEqual([both.cents, both.from, both.running, both.upgrade], [7500, "2027-01-07", true, false]);
});

test("a plan that adds nothing is refused: already booked as far ahead as we sell", () => {
  const far = { banner_until: "2027-01-31", top_until: "2027-01-31" }; // the horizon: the season after the one a purchase today reaches
  const inst = { status: "active", phone: "1", web: "x", ...far };
  for (const k of SPONSOR_KEYS) assert.match(sponsorProblem(inst, k, T), /already booked through 2027-01-31/);
  assert.equal(sponsorProblem({ status: "active", phone: "1", web: "x", banner_until: "2027-01-31", top_until: "" }, "top", T), "", "the banner being booked ahead does not block the top of the list");
});

test("checkout and webhook: Top of the list writes top_until only, the banner stays as it is, and the order records the top date and no banner date", () => withNow(async () => {
  const { env, raw, me } = await setup({ banner_until: "2026-12-01" }); const f = stubFetch();
  try {
    const r = await buy(env, { installer: "bright-nights", plan: "top" }, me.cookie); assert.equal(r.status, 200);
    const sent = new URLSearchParams(String(f.calls[0].init.body));
    assert.deepEqual([sent.get("line_items[0][price_data][unit_amount]"), sent.get("metadata[plan]"), sent.get("metadata[quote_to]"), sent.get("metadata[quote_cents]")], ["5000", "top", "2027-01-06", "5000"]);
    assert.match(sent.get("line_items[0][price_data][product_data][description]"), /^Top of the list · Nov 6, 2026 to Jan 6, 2027/);
  } finally { f.restore(); }
  assert.equal((await pay(env, 1, "top", 5000)).status, 200);
  assert.deepEqual([getInst(raw).banner_until, getInst(raw).top_until], ["2026-12-01", "2027-01-06"], "banner untouched");
  const o = ord(raw, 1); assert.deepEqual([o.applied, o.applied_until, o.applied_top_until, o.prev_banner_until, o.note], [1, null, "2027-01-06", null, null]);
}));

test("upgrade to both after a top-only purchase: $25, banner added, top untouched; refunding the upgrade takes the banner off again", () => withNow(async () => {
  const { env, raw, me } = await setup(); const f = stubFetch();
  await pay(env, 1, "top", 5000);
  try {
    const q = (await J(quote({ request: req("/api/me/sponsor", null, me.cookie), env }))).body.installers[0].quotes;
    assert.deepEqual([q.top.cents, q.banner.cents, q.banner_top.cents, q.banner_top.upgrade, q.banner_top.covered, q.banner_top.added], [5000, 5000, 2500, true, ["top"], ["banner"]]);
    assert.equal((await buy(env, { installer: "bright-nights", plan: "banner_top" }, me.cookie)).status, 200);
    assert.equal(new URLSearchParams(String(f.calls[0].init.body)).get("line_items[0][price_data][unit_amount]"), "2500");
  } finally { f.restore(); }
  await pay(env, 2, "banner_top", 2500);
  assert.deepEqual([getInst(raw).banner_until, getInst(raw).top_until], ["2027-01-06", "2027-01-06"]);
  assert.equal((await sendWebhook(webhook, env, refundOf(2))).body.revoked, true);
  assert.deepEqual([getInst(raw).banner_until, getInst(raw).top_until], ["", "2027-01-06"], "the top-only order still covers the card");
}));

test("refund of a top-only order switches the card off and leaves the banner; a partial refund holds it", () => withNow(async () => {
  const { env, raw } = await setup({ banner_until: "2026-12-10" });
  await pay(env, 1, "top", 5000);
  assert.equal((await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_1", refunded: false }))).body.held, "partial refund"); assert.equal(getInst(raw).top_until, "2027-01-06");
  raw.prepare("UPDATE feature_orders SET status='paid', note=NULL WHERE session_id='cs_1'").run();
  assert.equal((await sendWebhook(webhook, env, refundOf(1))).body.revoked, true);
  assert.deepEqual([getInst(raw).banner_until, getInst(raw).top_until], ["2026-12-10", ""]);
}));

test("replay and amount mismatch: a duplicate delivery applies once; a wrong amount is flagged", () => withNow(async () => {
  const { env, raw } = await setup();
  await pay(env, 1, "top", 5000); assert.equal((await pay(env, 1, "top", 5000)).body.duplicate, true);
  // a second, later purchase for the same dates is held, not double-booked
  await pay(env, 2, "top", 5000); assert.match(ord(raw, 2).note, /quote changed/); assert.equal(ord(raw, 2).status, "refund_due");
  // a payment that differs from the quoted price is flagged and still applied
  const s2 = await setup(); await sendWebhook(webhook, s2.env, stripeEvent("checkout.session.completed", session({ id: "cs_9", payment_intent: "pi_9", amount_total: 7500, metadata: { event_id: "i1", target: "installer", plan: "top", user_id: "u1", quote_from: T, quote_to: "2027-01-06", quote_cents: "5000" } })));
  assert.match(ord(s2.raw, 9).note, /^\[auto\] amount mismatch/); assert.equal(getInst(s2.raw).top_until, "2027-01-06");
}));

test("/api/banner and counts: a top-only installer is a top card, not a strip pill; the strip counts need the banner and the card counts need the top", () => withNow(async () => {
  const { env, raw } = await setup({ top_until: "2027-01-06" });
  const item = (await J(bannerList({ env }))).body.find((i) => i.id === "i1"); assert.equal(item.bn, undefined); assert.equal(item.t, 1); assert.equal(item.s, "bright-nights");
  const hit = (k) => J(bannerHit({ request: req("/api/banner/hit", { id: "i1", k }), env }));
  await hit("imp"); await hit("click"); await hit("call"); await hit("limp"); await hit("lclick");
  assert.deepEqual({ ...raw.prepare("SELECT imp, click, call, lst_imp, lst_click FROM banner_stats").get() }, { imp: 0, click: 0, call: 0, lst_imp: 1, lst_click: 1 }, "no strip counts without a banner");
  raw.prepare("UPDATE installers SET banner_until='2027-01-06', top_until='' WHERE id='i1'").run();
  const item2 = (await J(bannerList({ env }))).body.find((i) => i.id === "i1"); assert.equal(item2.bn, 1); assert.equal(item2.t, undefined);
  await hit("imp"); await hit("limp"); assert.deepEqual({ ...raw.prepare("SELECT imp, lst_imp FROM banner_stats").get() }, { imp: 1, lst_imp: 1 }, "the card needs a running top placement");
}));

test("renewal: a top-only placement renews as top-only; both renew as both; the date is the earliest end", () => {
  assert.deepEqual(renewingPlan({ banner_until: "", top_until: "2027-01-06" }, T), { plan: "top", ends: "2027-01-06" });
  assert.deepEqual(renewingPlan({ banner_until: "2027-01-06", top_until: "" }, T), { plan: "banner", ends: "2027-01-06" });
  assert.deepEqual(renewingPlan({ banner_until: "2027-01-06", top_until: "2027-01-31" }, T), { plan: "banner_top", ends: "2027-01-06" });
  assert.equal(renewingPlan({ banner_until: "", top_until: "" }, T), null);
  assert.equal(planEnds("banner_top", { banner_until: "2027-01-06", top_until: "" }, T), "", "both must be running");
});

test("Admin > Orders and the refund-due helpers understand a top-only order (no banner date, a top date)", () => withNow(async () => {
  const { env, raw } = await setup(); await pay(env, 1, "top", 5000);
  const o = (await J(ordersGet({ env }))).body.find((x) => x.session_id === "cs_1"); assert.deepEqual([o.plan, o.target, o.applied_until, o.applied_top_until], ["top", "installer", null, "2027-01-06"]);
  // a running top-only order is open (flagged when the profile is hidden); one whose top date has passed is not
  raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,status,applied,applied_top_until,target) VALUES ('past','i1','top',5000,'paid',1,'2026-10-01','installer')").run();
  assert.equal(await flagRefundDue(env.DB, { installers: ["i1"] }, "The profile was hidden.", { restorable: true, today: T }), 1);
  assert.equal(ord(raw, 1).status, "refund_due"); assert.equal(raw.prepare("SELECT status FROM feature_orders WHERE session_id='past'").get().status, "paid");
}));
