// Contest passes (owner decision 2026-11-07): 1 free contest per organization per 12-month window, then Up to 5 ($50), Up to 10 ($75), Up to 20 ($100), more than 20 contact us.
// Entitlement math, organization keys, counting rules, the paywall answer, pass checkout, webhook apply / replay / mismatch / refund / dispute, comps, auto-create after payment,
// /api/config and the copy. In-memory D1; fetch is stubbed (nothing reaches Stripe or a mailbox).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as createContest } from "../functions/api/contests/index.js";
import { onRequestPatch as patchContest } from "../functions/api/contests/[slug].js";
import { onRequestGet as entitlementGet } from "../functions/api/contest-pass/entitlement.js";
import { onRequestPost as passCheckout } from "../functions/api/contest-pass/checkout.js";
import { onRequestPost as passContact } from "../functions/api/contest-pass/contact.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { onRequestGet as configGet } from "../functions/api/config.js";
import { onRequestGet as ordersGet } from "../functions/api/admin/orders.js";
import { onRequestPost as orderAction } from "../functions/api/admin/orders/[id].js";
import { onRequestGet as passesGet, onRequestPost as passesPost } from "../functions/api/admin/passes.js";
import { onRequestPost as adminContest } from "../functions/api/admin/contests/[id].js";
import { CONTEST_PASSES, PASS_KEYS, PUBLIC_CONTEST_PASSES, windowEnd, windowFromDates, entitlementOf, offersFor, passQuote } from "../functions/_lib/passes.js";
import { rawOrgKey, registrable, keyFromInput, orgKeyFor } from "../functions/_lib/passkey.js";
import { STEPS, CLIENT_KEYS, dayKey } from "../functions/_lib/funnel.js";
import { passCopy, freeCopy, moreCopy } from "../public/contest-passes.js";
import { newEnv, addUser, stubFetch, stripeEvent, sendWebhook, session, getOrder, freezeNow, ptToday } from "./_pay.mjs";

const NOW = "2026-11-07T20:00:00Z", T = "2026-11-07"; // a Saturday afternoon Pacific
const O = "https://socallights.app";
const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})) }; };
const rq = (url, body, cookie, method) => new Request(O + url, { method: method || (body ? "POST" : "GET"), headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const good = (o = {}) => ({ name: "Maple Street Showdown", org: "Maple Street Neighbors", city: "Pasadena", descr: "Neighbors decorate, everyone votes for a favorite.", site: "", closes: ptToday(10), vs: ptToday(11), ve: ptToday(25), cats: ["Best Overall"], ...o });
const make = (env, cookie, o) => J(createContest({ request: rq("/api/contests", good(o), cookie), env }));
const row = (raw, slug) => raw.prepare("SELECT * FROM contests WHERE slug = ?").get(slug);
const withNow = async (fn, iso = NOW) => { const un = freezeNow(iso); try { return await fn(); } finally { un(); } };
const nameN = (n) => ({ name: "Showdown number " + "abcdefghijklmnopqrstuvwxyz"[n] + " here" });
const hits = (raw, k) => (raw.prepare("SELECT n FROM site_hits WHERE day = ? AND page = ?").get(dayKey(), k) || {}).n || 0;
const ent = (env, cookie, site) => J(entitlementGet({ request: rq("/api/contest-pass/entitlement" + (site === undefined ? "" : "?site=" + encodeURIComponent(site)), null, cookie), env }));
const buy = (env, body, cookie, ua) => J(passCheckout({ request: new Request(O + "/api/contest-pass/checkout", { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...(ua ? { "user-agent": ua } : {}) }, body: JSON.stringify(body) }), env }));
const KEY = "u:owner@gmail.com";
const fresh = (raw) => raw.prepare("UPDATE contests SET created_at = datetime('now', '-3 days')").run(); // the "3 contests a day per account" limit is not what these tests are about
async function setup(email = "owner@gmail.com") { const { env, raw } = newEnv({ ADMIN_NOTIFY_EMAIL: "admin@example.com" }); const me = await addUser(raw, "u1", email); return { env, raw, me }; }
// A paid pass as the webhook sees it, built from what checkout locked into the session metadata.
const meta = (plan, from, to, cents, key = KEY, o = {}) => ({ event_id: key, target: "contest_pass", plan, user_id: "u1", quote_from: from, quote_to: to, quote_cents: String(cents), ...o });
const pay = (env, n, plan, from, to, cents, { key = KEY, paid = cents, email = "owner@gmail.com" } = {}) => sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ id: "cs_" + n, payment_intent: "pi_" + n, amount_total: paid, customer_details: { email }, metadata: meta(plan, from, to, cents, key) })));
const passRows = (raw) => raw.prepare("SELECT * FROM contest_passes ORDER BY created_at, session_id").all().map((r) => ({ ...r }));
const refundOf = (n, full = true) => stripeEvent("charge.refunded", { id: "ch_" + n, payment_intent: "pi_" + n, refunded: full });

test("prices and caps live in one place: $50 / $75 / $100 for 5 / 10 / 20 total contests; more than 20 is contact us", () => {
  assert.deepEqual(PASS_KEYS, ["pass_5", "pass_10", "pass_20"]);
  assert.deepEqual(PASS_KEYS.map((k) => [CONTEST_PASSES[k].cap, CONTEST_PASSES[k].cents]), [[5, 5000], [10, 7500], [20, 10000]]);
  assert.deepEqual([PUBLIC_CONTEST_PASSES.free, PUBLIC_CONTEST_PASSES.windowMonths, PUBLIC_CONTEST_PASSES.contactAbove], [1, 12, 20]);
});

test("/api/config serves the contest passes (and nothing else about them is priced elsewhere)", async () => {
  const c = await (await configGet({ env: {} })).json();
  assert.deepEqual(Object.keys(c.contestPasses.plans), PASS_KEYS);
  assert.deepEqual(PASS_KEYS.map((k) => c.contestPasses.plans[k].cents), [5000, 7500, 10000]);
  assert.deepEqual(PASS_KEYS.map((k) => c.contestPasses.plans[k].cap), [5, 10, 20]);
  assert.equal(c.contestPasses.free, 1); assert.equal(c.contestPasses.contactAbove, 20);
  assert.deepEqual(Object.keys(c.eventPlans).length, 4, "the other plans are untouched");
});

test("window: starts the day the first contest goes live, ends the day before the same date a year later; a later contest starts a new window", () => {
  assert.equal(windowEnd("2026-11-07"), "2027-11-06");
  assert.equal(windowEnd("2028-02-29"), "2029-02-27".replace("27", "28"), "a Feb 29 start ends on Feb 28");
  assert.equal(windowEnd("2026-01-01"), "2026-12-31");
  const w = windowFromDates(["2026-11-07", "2026-12-01", "2027-11-06"], "2027-11-06");
  assert.deepEqual([w.start, w.end, w.used, w.active], ["2026-11-07", "2027-11-06", 3, true], "the last day of the window still counts");
  const next = windowFromDates(["2026-11-07", "2027-11-07"], "2027-11-07");
  assert.deepEqual([next.start, next.end, next.used], ["2027-11-07", "2028-11-06", 1], "a contest after the window ended starts a new window and is the first of it");
  assert.equal(windowFromDates(["2026-11-07"], "2027-11-07").active, false, "no contest yet in the new window: nothing is running");
  assert.equal(windowFromDates([], T).active, false);
});

test("entitlement math: 1 free; a pass sets the total cap; the highest pass and comp win; unlimited; offers are the passes above the cap, priced as differences", () => {
  const w = { active: true, start: "2026-11-07", end: "2027-11-06", used: 1 };
  const free = entitlementOf(w); assert.deepEqual([free.cap, free.canCreate, free.passCents], [1, false, 0]);
  assert.equal(entitlementOf({ ...w, used: 0 }).canCreate, true);
  assert.deepEqual(offersFor(free).map((o) => [o.key, o.pay, o.upgrade]), [["pass_5", 5000, false], ["pass_10", 7500, false], ["pass_20", 10000, false]]);
  const p5 = entitlementOf({ ...w, used: 5 }, [{ cap: 5, cents: 5000 }]);
  assert.deepEqual([p5.cap, p5.canCreate], [5, false]); assert.equal(entitlementOf({ ...w, used: 4 }, [{ cap: 5, cents: 5000 }]).canCreate, true, "the 5th contest is allowed");
  assert.deepEqual(offersFor(p5).map((o) => [o.key, o.pay, o.upgrade]), [["pass_10", 2500, true], ["pass_20", 5000, true]], "$25 from $50 to $75 and $50 from $50 to $100");
  const p10 = entitlementOf({ ...w, used: 10 }, [{ cap: 5, cents: 5000 }, { cap: 10, cents: 7500 }]);
  assert.deepEqual([p10.cap, offersFor(p10).map((o) => [o.key, o.pay])], [10, [["pass_20", 2500]]], "$25 from $75 to $100");
  const p20 = entitlementOf({ ...w, used: 20 }, [{ cap: 20, cents: 10000 }]); assert.deepEqual([p20.cap, offersFor(p20)], [20, []]);
  const unl = entitlementOf({ ...w, used: 99 }, [], [{ allowed: -1, valid_until: "2027-01-01" }]); assert.deepEqual([unl.unlimited, unl.cap, unl.canCreate, offersFor(unl)], [true, null, true, []]);
  const comp = entitlementOf({ ...w, used: 3 }, [], [{ allowed: 3, valid_until: "2027-01-01" }, { allowed: 2, valid_until: "2027-06-01" }]); assert.deepEqual([comp.cap, comp.canCreate], [3, false], "the larger comp wins");
  assert.equal(passQuote(p5, "pass_20").cents, 5000); assert.equal(passQuote(p5, "pass_5").problem.length > 0, true, "the same cap again is refused");
  assert.match(passQuote(entitlementOf({ active: false, start: "", end: "", used: 0 }), "pass_5").problem, /free/, "no window running: the next contest is free");
});

test("organization key: a domain-matched organizer is the website's registrable domain, a gmail owner (or a mismatch) is the person; Admin merges", async () => {
  assert.equal(rawOrgKey("clerk@covinaca.gov", "https://www.covinaca.gov/lights"), "d:covinaca.gov");
  assert.equal(rawOrgKey("clerk@parks.covinaca.gov", "covinaca.gov"), "d:covinaca.gov", "a subdomain mailbox on the site's own domain");
  assert.equal(rawOrgKey("clerk@covinaca.gov", "https://events.covinaca.gov"), "d:covinaca.gov", "a subdomain website of the same organization");
  assert.equal(rawOrgKey("Pat.Smith+lights@gmail.com", "https://covinaca.gov"), "u:patsmith@gmail.com", "a gmail owner is an individual, even with a city website");
  assert.equal(rawOrgKey("clerk@covinaca.gov", "https://other.org"), "u:clerk@covinaca.gov", "no match: the organizer's own account");
  assert.equal(rawOrgKey("clerk@covinaca.gov", ""), "u:clerk@covinaca.gov");
  assert.equal(rawOrgKey("a@ca.gov", "https://ca.gov"), "u:a@ca.gov", "ca.gov is shared by every agency");
  assert.equal(registrable("parks.irvine.gov"), "irvine.gov"); assert.equal(registrable("www.foo.co.uk"), "foo.co.uk"); assert.equal(registrable("city.gov"), "city.gov");
  assert.deepEqual(["covinaca.gov", "https://www.covinaca.gov/x", "D:CovinaCA.gov", "Pat.Smith@gmail.com", "u:x@y.org", ""].map(keyFromInput), ["d:covinaca.gov", "d:covinaca.gov", "d:covinaca.gov", "u:patsmith@gmail.com", "u:x@y.org", ""]);
  const { env, raw } = newEnv(); raw.prepare("INSERT INTO contest_org_alias (from_key, to_key) VALUES (?,?)").run("u:clerk@covinaca.gov", "d:covinaca.gov");
  assert.equal(await orgKeyFor(env, "clerk@covinaca.gov", ""), "d:covinaca.gov", "an alias set by Admin");
});

test("the first contest is free and live; the second in the window gets the paywall (402) with the picker data instead of failing silently; nothing was created", () => withNow(async () => {
  const { env, raw, me } = await setup();
  const a = await make(env, me.cookie); assert.equal(a.status, 200); assert.equal(row(raw, a.body.slug).live_at, T); assert.equal(row(raw, a.body.slug).org_key, KEY);
  const b = await make(env, me.cookie, nameN(1));
  assert.equal(b.status, 402); assert.equal(b.body.code, "pass_required"); assert.match(b.body.error, /Choose a pass/);
  assert.deepEqual([b.body.used, b.body.cap, b.body.windowStart, b.body.windowEnd, b.body.free], [1, 1, T, "2027-11-06", 1], "the count used so far and the exact window dates");
  assert.deepEqual(b.body.offers.map((o) => [o.key, o.cap, o.pay]), [["pass_5", 5, 5000], ["pass_10", 10, 7500], ["pass_20", 20, 10000]]);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contests").get().n, 1, "refused, not half created");
  const e = await ent(env, me.cookie, ""); assert.equal(e.status, 200); assert.deepEqual([e.body.used, e.body.cap, e.body.canCreate], [1, 1, false]);
}));

test("counting: drafts, held for review, declined and never-live do not count; a contest that was live and later unpublished still counts", () => withNow(async () => {
  const { env, raw, me } = await setup();
  // a contest with an official-sounding name from a free-mail organizer is held (pending): not live, no live_at, not counted, and can be created again freely
  const held = await make(env, me.cookie, { name: "City of Covina Official Lights", org: "City of Covina" }); assert.equal(held.status, 200); assert.equal(held.body.status, "pending");
  assert.equal(row(raw, held.body.slug).live_at, ""); assert.equal((await ent(env, me.cookie, "")).body.used, 0);
  const held2 = await make(env, me.cookie, { name: "Town of Covina Official Lights", org: "Covina HOA" }); assert.equal(held2.body.status, "pending", "created freely");
  // Admin declines one before it was ever live: still not counted
  await adminContest({ params: { id: row(raw, held.body.slug).id }, request: rq("/x", { action: "decline" }), env, waitUntil: () => {} });
  assert.equal((await ent(env, me.cookie, "")).body.used, 0);
  fresh(raw); const a = await make(env, me.cookie, nameN(0)); assert.equal(a.status, 200);
  assert.equal((await make(env, me.cookie, nameN(1))).status, 402, "one live contest is the free one"); fresh(raw);
  // unpublished by its creator: it was live, so it still counts
  const un = await J(patchContest({ params: { slug: a.body.slug }, request: rq("/x", { action: "unpublish" }, me.cookie, "PATCH"), env }));
  assert.equal(un.status, 200); assert.equal(row(raw, a.body.slug).status, "declined"); assert.equal(row(raw, a.body.slug).live_at, T);
  assert.equal((await ent(env, me.cookie, "")).body.used, 1, "still counts"); assert.equal((await make(env, me.cookie, nameN(2))).status, 402);
  // publishing it again does not count it twice
  assert.equal((await J(patchContest({ params: { slug: a.body.slug }, request: rq("/x", { action: "publish_again" }, me.cookie, "PATCH"), env }))).status, 200);
  assert.equal((await ent(env, me.cookie, "")).body.used, 1);
}));

test("Admin approving a held contest makes it count; going over the allowance does not block Admin but says so (overCap)", () => withNow(async () => {
  const { env, raw, me } = await setup();
  assert.equal((await make(env, me.cookie)).status, 200);
  const held = await make(env, me.cookie, { name: "City of Covina Official Lights", org: "City of Covina" });
  const r = await J(adminContest({ params: { id: row(raw, held.body.slug).id }, request: rq("/x", { action: "approve", notify: false }), env, waitUntil: () => {} }));
  assert.equal(r.status, 200); assert.deepEqual([r.body.overCap.used, r.body.overCap.cap], [2, 1]);
  assert.equal(row(raw, held.body.slug).live_at, T); assert.equal(row(raw, held.body.slug).status, "live");
  assert.equal((await ent(env, me.cookie, "")).body.used, 2);
}));

test("a window that has ended: the next contest starts a new window and is free again", async () => {
  const { env, raw, me } = await setup();
  await withNow(async () => { assert.equal((await make(env, me.cookie)).status, 200); assert.equal((await make(env, me.cookie, nameN(1))).status, 402); });
  await withNow(async () => { // Nov 6, 2027 is the last day of the window
    assert.equal((await ent(env, me.cookie, "")).body.active, true); assert.equal((await make(env, me.cookie, nameN(2))).status, 402, "still inside the window");
  }, "2027-11-06T20:00:00Z");
  await withNow(async () => {
    const e = await ent(env, me.cookie, ""); assert.deepEqual([e.body.active, e.body.canCreate], [false, true], "the window ended: a new one starts with the next contest");
    const c = await make(env, me.cookie, nameN(3)); assert.equal(c.status, 200);
    const after = await ent(env, me.cookie, ""); assert.deepEqual([after.body.windowStart, after.body.windowEnd, after.body.used], ["2027-11-08", "2028-11-07", 1]);
    assert.equal((await make(env, me.cookie, nameN(4))).status, 402);
  }, "2027-11-08T20:00:00Z");
});

test("a domain-matched organizer is counted by the website's organization, so a co-worker at the same organization shares it; a gmail owner is separate", () => withNow(async () => {
  const { env, raw } = newEnv(); const a = await addUser(raw, "ua", "clerk@covinaca.gov"), b = await addUser(raw, "ub", "intern@covinaca.gov"), g = await addUser(raw, "ug", "someone@gmail.com");
  const site = "https://www.covinaca.gov";
  assert.equal((await make(env, a.cookie, { site })).status, 200);
  const second = await make(env, b.cookie, { ...nameN(1), site }); assert.equal(second.status, 402, "a second person at the same organization shares the window");
  assert.equal(second.body.org, "covinaca.gov");
  assert.equal((await make(env, g.cookie, { ...nameN(2), site })).status, 200, "a gmail owner of a city-website contest is an individual");
  assert.equal(row(raw, (await make(env, b.cookie, { ...nameN(3) })).body.slug).org_key, "u:intern@covinaca.gov", "no website: the person");
}));

test("pass checkout: signed out 401, the app and a missing key refused, bad plan 400; the price, window and cap are locked into the Stripe session from the server", () => withNow(async () => {
  const { env, raw, me } = await setup(); const f = stubFetch();
  try {
    assert.equal((await buy(env, { plan: "pass_5" })).status, 401);
    assert.equal((await buy(env, { plan: "pass_5" }, me.cookie, "SoCalLightsApp/1")).status, 403);
    assert.equal((await buy({ ...env, STRIPE_SECRET_KEY: "" }, { plan: "pass_5" }, me.cookie)).status, 501);
    assert.equal((await buy(env, { plan: "nope" }, me.cookie)).status, 400);
    assert.match((await buy(env, { plan: "pass_5" }, me.cookie)).body.error, /new 12-month window/, "no contest live yet: no window, the first contest is free");
    assert.equal((await make(env, me.cookie)).status, 200);
    assert.equal(f.calls.length, 0, "nothing reached Stripe for a refusal");
    const r = await buy(env, { plan: "pass_10", back: "wizard" }, me.cookie); assert.equal(r.status, 200); assert.match(r.body.url, /checkout\.stripe\.com/);
    assert.equal(f.calls.length, 1); const form = new URLSearchParams(String(f.calls[0].init.body)), idem = f.calls[0].init.headers["idempotency-key"];
    assert.equal(form.get("line_items[0][price_data][unit_amount]"), "7500"); assert.equal(form.get("metadata[target]"), "contest_pass"); assert.equal(form.get("metadata[plan]"), "pass_10");
    assert.equal(form.get("metadata[event_id]"), KEY); assert.deepEqual([form.get("metadata[quote_from]"), form.get("metadata[quote_to]"), form.get("metadata[quote_cents]")], [T, "2027-11-06", "7500"]);
    assert.equal(form.get("success_url"), O + "/add-contest?resume=1&pass=paid&plan=pass_10"); assert.equal(form.get("cancel_url"), O + "/add-contest?resume=1&pass=cancelled&plan=pass_10");
    assert.match(idem, /^pass-[0-9a-f]{64}$/); assert.equal(form.get("customer_email"), "owner@gmail.com");
    const manage = await buy(env, { plan: "pass_5", back: "manage:maple-street-showdown" }, me.cookie); assert.equal(manage.status, 200);
    assert.equal(new URLSearchParams(String(f.calls[1].init.body)).get("success_url"), O + "/c/maple-street-showdown/manage?pass=paid&plan=pass_5");
    const evil = await buy(env, { plan: "pass_5", back: "https://evil.example/x" }, me.cookie); assert.equal(evil.status, 200);
    assert.match(new URLSearchParams(String(f.calls[2].init.body)).get("success_url"), /^https:\/\/socallights\.app\/contest-pass\?pass=paid/, "never an outside address");
  } finally { f.restore(); }
}));

test("pass checkout with ?site: the organization comes from the website like a new contest; an upgrade costs the difference; the same or a smaller cap is refused", () => withNow(async () => {
  const { env, raw } = newEnv(); const a = await addUser(raw, "u1", "clerk@covinaca.gov"); const f = stubFetch();
  try {
    assert.equal((await make(env, a.cookie, { site: "https://www.covinaca.gov" })).status, 200);
    const amount = () => new URLSearchParams(String(f.calls[f.calls.length - 1].init.body)).get("line_items[0][price_data][unit_amount]");
    assert.equal((await buy(env, { plan: "pass_5", site: "https://www.covinaca.gov" }, a.cookie)).status, 200); assert.equal(amount(), "5000");
    assert.equal(new URLSearchParams(String(f.calls[0].init.body)).get("metadata[event_id]"), "d:covinaca.gov");
    assert.equal((await pay(env, 1, "pass_5", T, "2027-11-06", 5000, { key: "d:covinaca.gov", email: "clerk@covinaca.gov" })).status, 200);
    assert.equal((await buy(env, { plan: "pass_5" }, a.cookie)).status, 400, "already holds up to 5");
    assert.equal((await buy(env, { plan: "pass_10" }, a.cookie)).status, 200); assert.equal(amount(), "2500", "$25 from $50 to $75");
    assert.equal((await buy(env, { plan: "pass_20" }, a.cookie)).status, 200); assert.equal(amount(), "5000", "$50 from $50 to $100");
    assert.match(new URLSearchParams(String(f.calls[f.calls.length - 1].init.body)).get("line_items[0][price_data][product_data][description]"), /upgrade/);
    assert.equal((await pay(env, 2, "pass_10", T, "2027-11-06", 2500, { key: "d:covinaca.gov", email: "clerk@covinaca.gov" })).status, 200);
    assert.equal((await buy(env, { plan: "pass_20" }, a.cookie)).status, 200); assert.equal(amount(), "2500", "$25 from $75 to $100");
    assert.equal((await pay(env, 3, "pass_20", T, "2027-11-06", 2500, { key: "d:covinaca.gov", email: "clerk@covinaca.gov" })).status, 200);
    assert.match((await buy(env, { plan: "pass_20" }, a.cookie)).body.error, /already has room/);
    const e = await ent(env, a.cookie); assert.deepEqual([e.body.cap, e.body.offers.length, e.body.contact], [20, 0, true], "at 20: only contact us is left");
  } finally { f.restore(); }
}));

test("webhook: a paid pass is applied once; the replay (same event or same session) changes nothing; the contest limit rises; one email, one funnel count", () => withNow(async () => {
  const { env, raw, me } = await setup(); const f = stubFetch(() => new Response(JSON.stringify({ id: "em_1" }), { status: 200 }));
  env.RESEND_API_KEY = "re_test";
  try {
    assert.equal((await make(env, me.cookie)).status, 200);
    const first = await pay(env, 1, "pass_5", T, "2027-11-06", 5000);
    assert.equal(first.status, 200); assert.equal(first.body.pass.cap, 5);
    const o = getOrder(raw, "cs_1"); assert.deepEqual([o.target, o.event_id, o.plan, o.amount, o.status, o.applied, o.quote_from, o.quote_to, o.note], ["contest_pass", KEY, "pass_5", 5000, "paid", 1, T, "2027-11-06", null]);
    assert.deepEqual(passRows(raw).map((p) => [p.org_key, p.cap, p.window_start, p.window_end, p.cents, p.status]), [[KEY, 5, T, "2027-11-06", 5000, "active"]]);
    const again = await pay(env, 1, "pass_5", T, "2027-11-06", 5000); assert.equal(again.body.duplicate, true);
    assert.equal(passRows(raw).length, 1); assert.equal(hits(raw, "fn:pass-paid"), 1);
    const mails = f.calls.filter((c) => /resend/.test(c.url) && /Your contest pass/.test(String(c.init.body))); assert.equal(mails.length, 1, "one confirmation email"); assert.match(String(mails[0].init.body), /Up to 5 contests/); assert.match(String(mails[0].init.body), /Nov 7, 2026/);
    for (let i = 1; i < 4; i++) { fresh(raw); assert.equal((await make(env, me.cookie, nameN(i))).status, 200, "contests 2 to 4 of 5"); } fresh(raw);
    assert.equal((await make(env, me.cookie, nameN(4))).status, 200, "the 5th contest of 5");
    assert.equal((await make(env, me.cookie, nameN(5))).status, 402, "the 6th is over the cap");
    const e = await ent(env, me.cookie, ""); assert.deepEqual([e.body.used, e.body.cap, e.body.offers.map((o) => o.pay)], [5, 5, [2500, 5000]]);
  } finally { f.restore(); }
}));

test("auto-create after payment: the wizard's contest is refused (402), the pass is paid by webhook, and the same request then creates the contest", () => withNow(async () => {
  const { env, raw, me } = await setup();
  assert.equal((await make(env, me.cookie)).status, 200);
  const body = good(nameN(1)), tryIt = () => J(createContest({ request: rq("/api/contests", body, me.cookie), env }));
  assert.equal((await tryIt()).status, 402);
  assert.equal((await pay(env, 7, "pass_5", T, "2027-11-06", 5000)).status, 200);
  const done = await tryIt(); assert.equal(done.status, 200); assert.equal(done.body.status, "live"); assert.equal(row(raw, done.body.slug).live_at, T);
  const wiz = readFileSync("public/add-contest.html", "utf8");
  for (const must of ["pass_required", "pickerHtml", "/api/contest-pass/checkout", 'back: "wizard"', 'back !== "paid"', "api.next()", "scl-contest-draft", "resume=1", "fn:pass-picker-shown", "fn:pass-choose"]) assert.ok(wiz.includes(must), "the wizard should have: " + must);
  assert.ok(/persist: "scl-contest-draft"/.test(wiz), "the form is kept in this browser across sign-in and Stripe");
}));

test("webhook: an amount that differs from the quote is applied but flagged; a pass for a changed window or an organization that already holds this much is held as refund due, not applied twice", () => withNow(async () => {
  const { env, raw, me } = await setup();
  assert.equal((await make(env, me.cookie)).status, 200);
  assert.equal((await pay(env, 1, "pass_5", T, "2027-11-06", 5000, { paid: 4000 })).status, 200);
  assert.match(getOrder(raw, "cs_1").note, /^\[auto\] amount mismatch: paid 40\.00 USD/); assert.equal(getOrder(raw, "cs_1").applied, 1);
  // a duplicate purchase of the same pass (second tab): refund due, not applied
  const dup = await pay(env, 2, "pass_5", T, "2027-11-06", 5000); assert.equal(dup.status, 200);
  assert.equal(getOrder(raw, "cs_2").status, "refund_due"); assert.equal(getOrder(raw, "cs_2").applied, 0); assert.match(getOrder(raw, "cs_2").note, /already has room for up to 5/);
  assert.equal(passRows(raw).length, 1);
  // a window that is not the current one
  const other = await pay(env, 3, "pass_10", "2025-01-01", "2025-12-31", 7500); assert.equal(other.status, 200);
  assert.equal(getOrder(raw, "cs_3").status, "refund_due"); assert.match(getOrder(raw, "cs_3").note, /window changed/);
  assert.equal(passRows(raw).length, 1);
  // no quote at all (a hand-made session): ignored
  const noq = await sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ id: "cs_9", metadata: { event_id: KEY, target: "contest_pass", plan: "pass_5", user_id: "u1" } }))); assert.equal(noq.body.ignored, "no pass quote");
  const orders = await J(ordersGet({ env })); const mine = orders.body.find((x) => x.session_id === "cs_1");
  assert.deepEqual([mine.target, mine.pass_cap, mine.pass_from, mine.pass_to, mine.pass_status], ["contest_pass", 5, T, "2027-11-06", "active"]);
  assert.ok(mine.flags.includes("mismatch")); assert.ok(orders.body.find((x) => x.session_id === "cs_2").flags.includes("refund_due"), "Admin > Orders shows the pass with org, cap and window");
}));

test("refund before the extra contests were used revokes the pass; after use the pass stays on and the order is flagged for Admin; a partial refund holds it", () => withNow(async () => {
  const { env, raw, me } = await setup();
  assert.equal((await make(env, me.cookie)).status, 200);
  await pay(env, 1, "pass_5", T, "2027-11-06", 5000);
  assert.equal((await sendWebhook(webhook, env, refundOf(1, false))).body.held, "partial refund"); assert.equal(getOrder(raw, "cs_1").status, "held"); assert.equal(passRows(raw)[0].status, "active");
  const r = await sendWebhook(webhook, env, refundOf(1)); assert.equal(r.body.revoked, true);
  assert.deepEqual([getOrder(raw, "cs_1").status, passRows(raw)[0].status], ["refunded", "revoked"]);
  assert.equal((await make(env, me.cookie, nameN(1))).status, 402, "back to the free one");
  // second pass, used, then disputed
  await pay(env, 2, "pass_5", T, "2027-11-06", 5000); assert.equal((await make(env, me.cookie, nameN(1))).status, 200); assert.equal((await make(env, me.cookie, nameN(2))).status, 200);
  const d = await sendWebhook(webhook, env, stripeEvent("charge.dispute.created", { id: "dp_1", charge: "ch_2", payment_intent: "pi_2", status: "needs_response" }));
  assert.equal(d.body.revoked, false); assert.equal(d.body.manual, "placement differs");
  const o = getOrder(raw, "cs_2"); assert.equal(o.status, "disputed"); assert.match(o.note, /^\[auto\] manual: placement differs\. The disputed contest pass was left on because the extra contests it paid for are already live/);
  assert.equal(passRows(raw).find((p) => p.session_id === "cs_2").status, "active", "contests that are live stay live");
  const flags = (await J(ordersGet({ env }))).body.find((x) => x.session_id === "cs_2").flags; assert.ok(flags.includes("disputed") && flags.includes("differs"), "flagged for Admin");
  // Admin decides: revoke
  assert.equal((await J(passesPost({ request: rq("/api/admin/passes", { action: "revoke_pass", session_id: "cs_2" }), env, data: { admin: { email: "a@x.org" } } }))).status, 200);
  assert.equal(passRows(raw).find((p) => p.session_id === "cs_2").status, "revoked");
}));

test("a refund or dispute that arrives before the order exists is remembered: the pass is never applied", () => withNow(async () => {
  const { env, raw, me } = await setup();
  assert.equal((await make(env, me.cookie)).status, 200);
  assert.equal((await sendWebhook(webhook, env, refundOf(5))).body.pending, "refunded");
  await pay(env, 5, "pass_5", T, "2027-11-06", 5000);
  assert.deepEqual([getOrder(raw, "cs_5").status, getOrder(raw, "cs_5").applied, passRows(raw).length], ["refunded", 0, 0]);
}));

test("Admin 'Mark refunded' on a pass order revokes it (when unused) and 'reapply' applies a paid order that is not applied yet", () => withNow(async () => {
  const { env, raw, me } = await setup();
  assert.equal((await make(env, me.cookie)).status, 200); await pay(env, 1, "pass_5", T, "2027-11-06", 5000);
  const r = await J(orderAction({ params: { id: "cs_1" }, request: rq("/x", { action: "mark_refunded" }), env, data: { admin: { email: "a@x.org" } } }));
  assert.equal(r.status, 200); assert.equal(r.body.placement_differs, false); assert.equal(passRows(raw)[0].status, "revoked");
  raw.prepare("UPDATE feature_orders SET status='paid', applied=0, refunded_at=NULL WHERE session_id='cs_1'").run(); raw.prepare("DELETE FROM contest_passes").run();
  const re = await J(orderAction({ params: { id: "cs_1" }, request: rq("/x", { action: "reapply" }), env, data: { admin: { email: "a@x.org" } } }));
  assert.equal(re.status, 200); assert.equal(passRows(raw).length, 1); assert.equal(getOrder(raw, "cs_1").applied, 1);
}));

test("comps: Admin grants unlimited or a number until a date; organizers see 'Founding partner: free through <date>' and no price; expiry and ending a comp end it; usage is visible", () => withNow(async () => {
  const { env, raw } = newEnv(); const a = await addUser(raw, "ua", "clerk@covinaca.gov"), g = await addUser(raw, "ug", "someone@gmail.com");
  raw.prepare("DELETE FROM contest_comps").run(); // the founder-city comps (migration 0208) are covered in tests/founder-city.test.mjs; this test grants its own
  const adm = (b) => J(passesPost({ request: rq("/api/admin/passes", b), env, data: { admin: { email: "owner@forza-tek.com" } } }));
  assert.equal((await adm({ action: "grant", target: "", allowed: "unlimited", until: "2027-03-01" })).status, 400);
  assert.equal((await adm({ action: "grant", target: "covinaca.gov", allowed: "unlimited", until: "2026-01-01" })).status, 400, "a date that has passed");
  assert.equal((await adm({ action: "grant", target: "covinaca.gov", allowed: 0, until: "2027-03-01" })).status, 400);
  const site = "https://www.covinaca.gov";
  assert.equal((await make(env, a.cookie, { site })).status, 200);
  assert.equal((await make(env, a.cookie, { ...nameN(1), site })).status, 402, "before the comp");
  const gr = await adm({ action: "grant", target: "https://www.covinaca.gov/", allowed: "unlimited", until: "2027-03-01", note: "Founding partner: Covina" }); assert.equal(gr.status, 200); assert.equal(gr.body.key, "d:covinaca.gov");
  const e = await ent(env, a.cookie, site); assert.deepEqual([e.body.canCreate, e.body.comp, e.body.offers, e.body.unlimited], [true, { until: "2027-03-01", unlimited: true }, [], true], "free, with no offers and no price");
  for (let i = 1; i < 5; i++) { fresh(raw); assert.equal((await make(env, a.cookie, { ...nameN(i), site })).status, 200, "unlimited: " + i); }
  assert.equal((await make(env, g.cookie, { ...nameN(9), site })).status, 200); assert.equal((await make(env, g.cookie, { ...nameN(10), site })).status, 402, "a gmail owner is not covered by the city's comp");
  const list = (await J(passesGet({ env }))).body; const org = list.orgs.find((o) => o.key === "d:covinaca.gov");
  assert.deepEqual([org.used, org.unlimited, org.over, org.comp.until], [5, true, false, "2027-03-01"]); assert.equal(list.comps[0].running, true); assert.equal(list.comps[0].note, "Founding partner: Covina");
  assert.equal((await adm({ action: "revoke_comp", id: list.comps[0].id })).status, 200);
  assert.equal((await ent(env, a.cookie, site)).body.canCreate, false, "ended");
  // a counted comp ("allowed 7") and expiry
  await adm({ action: "grant", target: "covinaca.gov", allowed: 7, until: "2026-12-01" });
  assert.deepEqual([(await ent(env, a.cookie, site)).body.cap, (await ent(env, a.cookie, site)).body.canCreate], [7, true]);
  await withNow(async () => { assert.deepEqual([(await ent(env, a.cookie, site)).body.cap, (await ent(env, a.cookie, site)).body.canCreate], [1, false], "after the comp's valid-until date"); }, "2026-12-02T20:00:00Z");
}));

test("Admin passes panel: usage over its limit is marked, merge moves contests and future ones, set_key, the Founding City comp needs no seed data", () => withNow(async () => {
  const { env, raw } = newEnv(); const a = await addUser(raw, "ua", "clerk@covinaca.gov"), b = await addUser(raw, "ub", "intern@gmail.com");
  const adm = (body) => J(passesPost({ request: rq("/api/admin/passes", body), env, data: { admin: { email: "o@x.org" } } }));
  assert.deepEqual(raw.prepare("SELECT org_key FROM contest_comps ORDER BY org_key").all().map((r) => r.org_key), ["d:covinaca.gov", "d:eastvaleca.gov"], "only the two founder-city comps (migration 0208) are seeded");
  raw.prepare("DELETE FROM contest_comps").run();
  await make(env, a.cookie, { site: "https://covinaca.gov" }); await make(env, b.cookie, nameN(1));
  assert.equal((await adm({ action: "merge", from: "u:intern@gmail.com", to: "covinaca.gov" })).status, 200);
  assert.equal(row(raw, raw.prepare("SELECT slug FROM contests WHERE owner_id='ub'").get().slug).org_key, "d:covinaca.gov");
  const list = (await J(passesGet({ env }))).body; const org = list.orgs.find((o) => o.key === "d:covinaca.gov"); assert.deepEqual([org.used, org.cap, org.over], [2, 1, true], "two live contests on one free allowance is over its limit");
  assert.equal((await make(env, b.cookie, nameN(2))).status, 402, "the merge also applies to the intern's next contest");
  assert.equal((await adm({ action: "set_key", contest_id: "nope", key: "x.org" })).status, 404); assert.equal((await adm({ action: "bogus" })).status, 400);
}));

test("'More than 20' contact: a signed-in organizer leaves a lead (3 a day), Admin is emailed, and it shows in the panel", () => withNow(async () => {
  const { env, raw, me } = await setup(); env.RESEND_API_KEY = "re_test"; const f = stubFetch(() => new Response(JSON.stringify({ id: "x" }), { status: 200 }));
  try {
    const post = (cookie) => J(passContact({ request: rq("/api/contest-pass/contact", { note: "We run 30 contests" }, cookie), env, waitUntil: () => {} }));
    assert.equal((await post(null)).status, 401); assert.equal((await post(me.cookie)).status, 200);
    assert.equal(raw.prepare("SELECT note FROM contest_pass_leads").get().note, "We run 30 contests");
    assert.equal((await post(me.cookie)).status, 200); assert.equal((await post(me.cookie)).status, 200); assert.equal((await post(me.cookie)).status, 429);
    assert.equal((await J(passesGet({ env }))).body.leads.length, 3);
    assert.ok(f.calls.some((c) => /resend/.test(c.url) && /admin@example\.com/.test(String(c.init.body))), "Admin is told");
  } finally { f.restore(); }
}));

test("running a contest again (clone) counts like any other contest: the paywall answers 402 with the picker data", () => withNow(async () => {
  const { env, raw, me } = await setup();
  const a = await make(env, me.cookie); assert.equal(a.status, 200);
  const r = await J(patchContest({ params: { slug: a.body.slug }, request: rq("/x", { action: "clone" }, me.cookie, "PATCH"), env }));
  assert.equal(r.status, 402); assert.equal(r.body.code, "pass_required"); assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contests").get().n, 1);
  await pay(env, 1, "pass_5", T, "2027-11-06", 5000);
  const ok = await J(patchContest({ params: { slug: a.body.slug }, request: rq("/x", { action: "clone" }, me.cookie, "PATCH"), env })); assert.equal(ok.status, 200);
  assert.equal(row(raw, ok.body.slug).live_at, T); assert.equal(row(raw, ok.body.slug).org_key, KEY);
}));

test("funnel counters: pass-picker-shown, pass-choose (browser) and pass-paid (server) are listed; the browser ones are accepted by /api/visit", () => {
  const keys = STEPS.map((s) => s[0]);
  for (const k of ["fn:pass-picker-shown", "fn:pass-choose", "fn:pass-paid"]) assert.ok(keys.includes(k), k);
  assert.ok(CLIENT_KEYS.includes("fn:pass-picker-shown") && CLIENT_KEYS.includes("fn:pass-choose") && !CLIENT_KEYS.includes("fn:pass-paid"), "paid is counted by the server only");
});

test("copy: contents in full, never 'Everything in', no price written in the pages (they come from /api/config), 'home' not 'house'", () => {
  const cfg = { contestPasses: PUBLIC_CONTEST_PASSES };
  for (const k of PASS_KEYS) { const c = passCopy(k, cfg); assert.ok(c.bullets.length >= 7, k + " lists its contents"); assert.match(c.bullets[0], new RegExp(`^${CONTEST_PASSES[k].cap} contests in your 12-month window in total`)); }
  assert.match(passCopy("pass_5", cfg).bullets[0], /plus 4 more/); assert.match(passCopy("pass_20", cfg).bullets[0], /plus 19 more/);
  const files = ["public/contest-passes.js", "public/pricing.html", "public/add-contest.html", "public/contest-pass.html", "public/terms.html", "functions/_lib/passmail.js", "functions/_lib/passes.js"];
  const blob = files.map((f) => readFileSync(f, "utf8").replace(/^\s*\/\/.*$/gm, "")).join("\n") + JSON.stringify([freeCopy(cfg), moreCopy(), ...PASS_KEYS.map((k) => passCopy(k, cfg))]);
  assert.ok(!/Everything (in|above)/i.test(blob), "never 'Everything in ...'");
  const mail = readFileSync("functions/_lib/mailtpl.js", "utf8"); assert.ok(!/Everything (in|above)/i.test(mail));
  for (const f of ["public/pricing.html", "public/contest-pass.html", "public/contest-passes.js"]) assert.ok(!/\$\s?(50|75|100)\b/.test(readFileSync(f, "utf8")), f + " must not write a pass price: prices come from /api/config");
  const pricing = readFileSync("public/pricing.html", "utf8");
  assert.ok(pricing.includes("1 contest per 12 months") && pricing.includes("contestPasses") && pricing.includes("More than") && pricing.includes("contactHref") && pricing.includes('data-pass-choose'), "Free, three passes with Choose, and More than 20: contact us");
  assert.ok(!/Free for now/i.test(pricing));
  assert.ok(!/\bhouses?\b/i.test(readFileSync("public/contest-passes.js", "utf8").replace(/\/\/.*$/gm, "")), "home, not house");
  assert.match(freeCopy(cfg).unit, /1 contest per 12 months/);
});

test("pages state that payment never affects results, and the Terms have the Contest organizer passes section", () => {
  const terms = readFileSync("public/terms.html", "utf8").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  for (const must of ["Contest organizer passes", "one free contest in every 12-month window", "A contest counts when it goes live", "A pass counts contests only", "Comps", "never affects any vote, judge, ranking, award or contest result", "pass is refunded, or a payment dispute is lost", "Co-organizers and staff do not create separate organizations", "info@socallights.app"]) assert.ok(terms.includes(must), "Terms: " + must);
  const lib = readFileSync("public/contest-passes.js", "utf8"); assert.ok(lib.includes("Payment never affects any result, vote, judge or ranking"));
  assert.ok(readFileSync("public/contest-pass.html", "utf8").includes("payment never affects any result, vote, judge or ranking"));
});
