// Contest passes (owner decision 2026-11-09, replaces the 2026-11-07 rule): organizers pay from the first contest. Single contest $149, up to 5 $299, up to 20 $499, more than 20 contact us.
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
import { CONTEST_PASSES, LEGACY_PASSES, PASS_KEYS, PUBLIC_CONTEST_PASSES, FREE_CONTESTS, PAID_FROM, windowEnd, windowFromDates, entitlementOf, offersFor, passQuote } from "../functions/_lib/passes.js";
import { rawOrgKey, registrable, keyFromInput, orgKeyFor } from "../functions/_lib/passkey.js";
import { STEPS, CLIENT_KEYS, dayKey } from "../functions/_lib/funnel.js";
import { passCopy, moreCopy, capLine } from "../public/contest-passes.js";
import { newEnv, addUser, stubFetch, stripeEvent, sendWebhook, session, getOrder, freezeNow, ptToday } from "./_pay.mjs";

const NOW = "2026-11-10T20:00:00Z", T = "2026-11-10"; // a Tuesday afternoon Pacific, the first day contests are paid (PAID_FROM)
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
const END = "2027-11-09", P1 = 14900, P5 = 29900, P20 = 49900; // the window that starts on T, and the three prices in cents
// An organization that has paid for a pass (no window running yet: the pass starts it on T) and then makes its first contest.
const first = async (env, me, plan = "pass_1", cents = P1, o, n = "f0") => { const r = await pay(env, n, plan, T, END, cents, { email: me.email }); assert.equal(r.status, 200); return make(env, me.cookie, o); };
const refundOf = (n, full = true) => stripeEvent("charge.refunded", { id: "ch_" + n, payment_intent: "pi_" + n, refunded: full });

test("prices and caps live in one place: single contest $149, up to 5 $299, up to 20 $499; more than 20 is contact us; nothing is free", () => {
  assert.deepEqual(PASS_KEYS, ["pass_1", "pass_5", "pass_20"]);
  assert.deepEqual(PASS_KEYS.map((k) => [CONTEST_PASSES[k].cap, CONTEST_PASSES[k].cents]), [[1, 14900], [5, 29900], [20, 49900]]);
  assert.equal(CONTEST_PASSES.pass_1.label, "Single contest");
  assert.deepEqual([PUBLIC_CONTEST_PASSES.free, PUBLIC_CONTEST_PASSES.windowMonths, PUBLIC_CONTEST_PASSES.contactAbove], [0, 12, 20]);
  assert.equal(FREE_CONTESTS, 0, "no contest is free any more");
  assert.ok(!("pass_10" in CONTEST_PASSES) && !PASS_KEYS.includes("pass_10"), "pass_10 is retired: never offered");
  assert.deepEqual([LEGACY_PASSES.pass_10.cap, LEGACY_PASSES.pass_10.cents], [10, 7500], "kept only so an order already paid under it still applies");
});

test("pass_10 is no longer sold (checkout refuses it) but a pass_10 order that was already paid still applies and counts for 10 contests", () => withNow(async () => {
  const { env, raw, me } = await setup(); const f = stubFetch();
  try {
    assert.equal((await buy(env, { plan: "pass_10" }, me.cookie)).status, 400, "not offered, not sold");
    assert.equal(f.calls.length, 0);
    assert.ok(!(await ent(env, me.cookie, "")).body.offers.some((o) => o.key === "pass_10"));
    const r = await pay(env, "old", "pass_10", T, END, 7500); assert.equal(r.status, 200, "the webhook still applies the pass_10 order already paid");
    assert.deepEqual(passRows(raw).map((p) => [p.cap, p.cents, p.status]), [[10, 7500, "active"]]);
    const e = await ent(env, me.cookie, ""); assert.deepEqual([e.body.cap, e.body.canCreate], [10, true]);
  } finally { f.restore(); }
}));

test("/api/config serves the contest passes (and nothing else about them is priced elsewhere)", async () => {
  const c = await (await configGet({ env: {} })).json();
  assert.deepEqual(Object.keys(c.contestPasses.plans), PASS_KEYS);
  assert.deepEqual(PASS_KEYS.map((k) => c.contestPasses.plans[k].cents), [14900, 29900, 49900]);
  assert.deepEqual(PASS_KEYS.map((k) => c.contestPasses.plans[k].cap), [1, 5, 20]);
  assert.equal(c.contestPasses.free, 0); assert.equal(c.contestPasses.contactAbove, 20);
  assert.deepEqual(Object.keys(c.eventPlans).length, 4, "the other plans are untouched");
});

test("window: starts the day the first contest goes live, ends the day before the same date a year later; a later contest starts a new window", () => {
  assert.equal(windowEnd("2026-11-10"), "2027-11-09");
  assert.equal(windowEnd("2028-02-29"), "2029-02-27".replace("27", "28"), "a Feb 29 start ends on Feb 28");
  assert.equal(windowEnd("2026-01-01"), "2026-12-31");
  const w = windowFromDates(["2026-11-10", "2026-12-01", "2027-11-09"], "2027-11-09");
  assert.deepEqual([w.start, w.end, w.used, w.active], ["2026-11-10", "2027-11-09", 3, true], "the last day of the window still counts");
  const next = windowFromDates(["2026-11-10", "2027-11-10"], "2027-11-10");
  assert.deepEqual([next.start, next.end, next.used], ["2027-11-10", "2028-11-09", 1], "a contest after the window ended starts a new window and is the first of it");
  assert.equal(windowFromDates(["2026-11-10"], "2027-11-10").active, false, "no contest yet in the new window: nothing is running");
  assert.equal(windowFromDates([], T).active, false);
  // contests that went live before pricing began (PAID_FROM) were run under the old free rule: never counted, they do not start a window
  assert.equal(PAID_FROM, "2026-11-09", "pricing starts the day the owner decided it (Pacific)");
  assert.equal(windowFromDates(["2026-11-07", "2026-11-08"], T).active, false, "an organization that already used its free contest starts clean");
  const mixed = windowFromDates(["2026-11-08", "2026-11-12"], "2026-11-12"); assert.deepEqual([mixed.start, mixed.used], ["2026-11-12", 1]);
  // a pass bought before any contest starts the window on the day it was bought, and is not itself a contest
  const bought = windowFromDates(["2026-11-14"], "2026-11-14", ["2026-11-12"]); assert.deepEqual([bought.start, bought.end, bought.used, bought.active], ["2026-11-12", "2027-11-11", 1, true]);
  assert.deepEqual([windowFromDates([], "2026-11-12", ["2026-11-12"]).used, windowFromDates([], "2026-11-12", ["2026-11-12"]).active], [0, true]);
});

test("entitlement math: nothing free; a pass sets the total cap; the highest pass and comp win; unlimited; offers are the passes above the cap, priced as differences", () => {
  const w = { active: true, start: "2026-11-10", end: "2027-11-09", used: 0 };
  const none = entitlementOf(w); assert.deepEqual([none.cap, none.canCreate, none.passCents], [0, false, 0], "no pass, no comp: the first contest is not allowed");
  assert.equal(entitlementOf({ active: false, start: "", end: "", used: 0 }).canCreate, false, "no window running: still needs a pass");
  assert.deepEqual(offersFor(none).map((o) => [o.key, o.pay, o.upgrade]), [["pass_1", 14900, false], ["pass_5", 29900, false], ["pass_20", 49900, false]]);
  const p1 = entitlementOf(w, [{ cap: 1, cents: 14900 }]); assert.deepEqual([p1.cap, p1.canCreate], [1, true]); assert.equal(entitlementOf({ ...w, used: 1 }, [{ cap: 1, cents: 14900 }]).canCreate, false, "the single contest is used");
  assert.deepEqual(offersFor(p1).map((o) => [o.key, o.pay, o.upgrade]), [["pass_5", 15000, true], ["pass_20", 35000, true]], "upgrade = the difference: $150 from $149 to $299 and $350 from $149 to $499");
  const p5 = entitlementOf({ ...w, used: 5 }, [{ cap: 5, cents: 29900 }]);
  assert.deepEqual([p5.cap, p5.canCreate], [5, false]); assert.equal(entitlementOf({ ...w, used: 4 }, [{ cap: 5, cents: 29900 }]).canCreate, true, "the 5th contest is allowed");
  assert.deepEqual(offersFor(p5).map((o) => [o.key, o.pay, o.upgrade]), [["pass_20", 20000, true]], "$200 from $299 to $499");
  const p20 = entitlementOf({ ...w, used: 20 }, [{ cap: 20, cents: 49900 }]); assert.deepEqual([p20.cap, offersFor(p20)], [20, []]);
  const unl = entitlementOf({ ...w, used: 99 }, [], [{ allowed: -1, valid_until: "2027-01-01" }]); assert.deepEqual([unl.unlimited, unl.cap, unl.canCreate, offersFor(unl)], [true, null, true, []]);
  const comp = entitlementOf({ ...w, used: 3 }, [], [{ allowed: 3, valid_until: "2027-01-01" }, { allowed: 2, valid_until: "2027-06-01" }]); assert.deepEqual([comp.cap, comp.canCreate], [3, false], "the larger comp wins");
  const compOnly = entitlementOf({ active: false, start: "", end: "", used: 0 }, [], [{ allowed: 2, valid_until: "2027-01-01" }]); assert.deepEqual([compOnly.canCreate, compOnly.passCents], [true, 0], "a comp needs no window and is not a pass: it never lowers a price");
  assert.equal(passQuote(p5, "pass_20").cents, 20000); assert.equal(passQuote(p5, "pass_5").problem.length > 0, true, "the same cap again is refused");
  assert.equal(passQuote(p1, "pass_1").problem.length > 0, true);
  // no window running: a pass is bought at its full price and starts a window today
  const q = passQuote(entitlementOf({ active: false, start: "", end: "", used: 0 }), "pass_1", "2026-11-12");
  assert.deepEqual([q.problem, q.cents, q.upgrade, q.from, q.to], ["", 14900, false, "2026-11-12", "2027-11-11"]);
  assert.equal(passQuote(entitlementOf({ active: false, start: "", end: "", used: 0 }), "pass_10").problem, "Choose a pass.", "pass_10 cannot be quoted");
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

test("the first contest needs a pass: without one the paywall answers 402 with the picker data and nothing is created; after a single-contest pass it goes live; the second gets the paywall again", () => withNow(async () => {
  const { env, raw, me } = await setup();
  const none = await make(env, me.cookie);
  assert.equal(none.status, 402); assert.equal(none.body.code, "pass_required"); assert.match(none.body.error, /Choose a pass/);
  assert.deepEqual([none.body.used, none.body.cap, none.body.active, none.body.free], [0, 0, false, 0], "no window, nothing allowed, nothing free");
  assert.deepEqual(none.body.offers.map((o) => [o.key, o.cap, o.pay]), [["pass_1", 1, 14900], ["pass_5", 5, 29900], ["pass_20", 20, 49900]]);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contests").get().n, 0, "refused, not half created");
  const a = await first(env, me); assert.equal(a.status, 200); assert.equal(row(raw, a.body.slug).live_at, T); assert.equal(row(raw, a.body.slug).org_key, KEY);
  const b = await make(env, me.cookie, nameN(1));
  assert.equal(b.status, 402); assert.equal(b.body.code, "pass_required");
  assert.deepEqual([b.body.used, b.body.cap, b.body.windowStart, b.body.windowEnd], [1, 1, T, END], "the count used so far and the exact window dates");
  assert.deepEqual(b.body.offers.map((o) => [o.key, o.cap, o.pay, o.upgrade]), [["pass_5", 5, 15000, true], ["pass_20", 20, 35000, true]], "upgrade prices are the difference");
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contests").get().n, 1);
  const e = await ent(env, me.cookie, ""); assert.equal(e.status, 200); assert.deepEqual([e.body.used, e.body.cap, e.body.canCreate], [1, 1, false]);
}));

test("an organization that already used its free contest under the old rule starts clean: its old contest is not counted, it needs a pass for the next one, and the pass starts a new window", () => withNow(async () => {
  const { env, raw, me } = await setup();
  // the old free contest went live the day before pricing began; it stays live and untouched
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,descr,site,contact_email,season,status,entries_close,vote_start,vote_end,categories,vote_rule,approval,rules,org_key,live_at) VALUES ('old1','old-one','u1','Old free contest','Maple','Pasadena','Los Angeles','d','','owner@gmail.com','christmas','live','2026-12-01','2026-12-02','2026-12-20','[\"Best Overall\"]','cat','manual','r',?,?)").run(KEY, "2026-11-08"); // the day before pricing began
  const e = await ent(env, me.cookie, ""); assert.deepEqual([e.body.active, e.body.used, e.body.cap, e.body.canCreate], [false, 0, 0, false], "not counted, but a new contest needs a pass");
  assert.equal(row(raw, "old-one").status, "live", "the contest that is already live is not touched");
  assert.equal((await make(env, me.cookie)).status, 402);
  const a = await first(env, me); assert.equal(a.status, 200);
  const after = await ent(env, me.cookie, ""); assert.deepEqual([after.body.windowStart, after.body.windowEnd, after.body.used, after.body.cap], [T, END, 1, 1], "a new 12-month window, only the new contest counts");
}));

test("counting: drafts, held for review, declined and never-live do not count; a contest that was live and later unpublished still counts", () => withNow(async () => {
  const { env, raw, me } = await setup();
  // a contest with an official-sounding name from a free-mail organizer is held (pending): not live, no live_at, not counted, and needs no pass yet
  const held = await make(env, me.cookie, { name: "City of Covina Official Lights", org: "City of Covina" }); assert.equal(held.status, 200); assert.equal(held.body.status, "pending");
  assert.equal(row(raw, held.body.slug).live_at, ""); assert.equal((await ent(env, me.cookie, "")).body.used, 0);
  const held2 = await make(env, me.cookie, { name: "Town of Covina Official Lights", org: "Covina HOA" }); assert.equal(held2.body.status, "pending", "created freely");
  // Admin declines one before it was ever live: still not counted
  await adminContest({ params: { id: row(raw, held.body.slug).id }, request: rq("/x", { action: "decline" }), env, waitUntil: () => {} });
  assert.equal((await ent(env, me.cookie, "")).body.used, 0);
  fresh(raw); const a = await first(env, me, "pass_1", P1, nameN(0)); assert.equal(a.status, 200);
  assert.equal((await make(env, me.cookie, nameN(1))).status, 402, "one live contest uses the single-contest pass"); fresh(raw);
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
  assert.equal((await first(env, me)).status, 200);
  const held = await make(env, me.cookie, { name: "City of Covina Official Lights", org: "City of Covina" });
  const r = await J(adminContest({ params: { id: row(raw, held.body.slug).id }, request: rq("/x", { action: "approve", notify: false }), env, waitUntil: () => {} }));
  assert.equal(r.status, 200); assert.deepEqual([r.body.overCap.used, r.body.overCap.cap], [2, 1]);
  assert.equal(row(raw, held.body.slug).live_at, T); assert.equal(row(raw, held.body.slug).status, "live");
  assert.equal((await ent(env, me.cookie, "")).body.used, 2);
}));

test("a window that has ended: the next contest needs a new pass, and the new pass starts a new window", async () => {
  const { env, raw, me } = await setup();
  await withNow(async () => { assert.equal((await first(env, me)).status, 200); assert.equal((await make(env, me.cookie, nameN(1))).status, 402); });
  await withNow(async () => { // Nov 9, 2027 is the last day of the window
    assert.equal((await ent(env, me.cookie, "")).body.active, true); assert.equal((await make(env, me.cookie, nameN(2))).status, 402, "still inside the window");
  }, "2027-11-09T20:00:00Z");
  await withNow(async () => {
    const e = await ent(env, me.cookie, ""); assert.deepEqual([e.body.active, e.body.canCreate], [false, false], "the window ended: a new pass is needed");
    assert.equal((await make(env, me.cookie, nameN(3))).status, 402);
    assert.equal((await pay(env, "n2", "pass_1", "2027-11-11", "2028-11-10", P1)).status, 200);
    const c = await make(env, me.cookie, nameN(3)); assert.equal(c.status, 200);
    const after = await ent(env, me.cookie, ""); assert.deepEqual([after.body.windowStart, after.body.windowEnd, after.body.used, after.body.cap], ["2027-11-11", "2028-11-10", 1, 1]);
    assert.equal((await make(env, me.cookie, nameN(4))).status, 402);
  }, "2027-11-11T20:00:00Z");
});

test("a domain-matched organizer is counted by the website's organization, so a co-worker at the same organization shares it; a gmail owner is separate", () => withNow(async () => {
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM contest_comps").run(); /* the founder-city comps seeded by migration 0208 would cover covinaca.gov */ const a = await addUser(raw, "ua", "clerk@covinaca.gov"), b = await addUser(raw, "ub", "intern@covinaca.gov"), g = await addUser(raw, "ug", "someone@gmail.com");
  const site = "https://www.covinaca.gov";
  assert.equal((await make(env, a.cookie, { site })).status, 402, "the first contest needs a pass");
  assert.equal((await pay(env, 1, "pass_1", T, END, P1, { key: "d:covinaca.gov", email: "clerk@covinaca.gov" })).status, 200);
  assert.equal((await make(env, a.cookie, { site })).status, 200);
  const second = await make(env, b.cookie, { ...nameN(1), site }); assert.equal(second.status, 402, "a second person at the same organization shares the window");
  assert.equal(second.body.org, "covinaca.gov");
  assert.equal((await make(env, g.cookie, { ...nameN(2), site })).status, 402, "a gmail owner of a city-website contest is an individual: the city's pass does not cover it");
  assert.equal((await pay(env, 2, "pass_1", T, END, P1, { key: "u:someone@gmail.com", email: "someone@gmail.com" })).status, 200);
  assert.equal((await make(env, g.cookie, { ...nameN(2), site })).status, 200); assert.equal((await make(env, g.cookie, { ...nameN(10), site })).status, 402);
  assert.equal((await pay(env, 3, "pass_1", T, END, P1, { key: "u:intern@covinaca.gov", email: "intern@covinaca.gov" })).status, 200);
  assert.equal(row(raw, (await make(env, b.cookie, { ...nameN(3) })).body.slug).org_key, "u:intern@covinaca.gov", "no website: the person");
}));

test("pass checkout: signed out 401, the app and a missing key refused, bad plan 400; the price, window and cap are locked into the Stripe session from the server", () => withNow(async () => {
  const { env, raw, me } = await setup(); const f = stubFetch();
  try {
    assert.equal((await buy(env, { plan: "pass_5" })).status, 401);
    assert.equal((await buy(env, { plan: "pass_5" }, me.cookie, "SoCalLightsApp/1")).status, 403);
    assert.equal((await buy({ ...env, STRIPE_SECRET_KEY: "" }, { plan: "pass_5" }, me.cookie)).status, 501);
    assert.equal((await buy(env, { plan: "nope" }, me.cookie)).status, 400);
    assert.equal(f.calls.length, 0, "nothing reached Stripe for a refusal");
    // no contest yet and no window: a pass can be bought, at its full price, and the window starts today
    const r = await buy(env, { plan: "pass_1", back: "wizard" }, me.cookie); assert.equal(r.status, 200); assert.match(r.body.url, /checkout\.stripe\.com/);
    assert.equal(f.calls.length, 1); const form = new URLSearchParams(String(f.calls[0].init.body)), idem = f.calls[0].init.headers["idempotency-key"];
    assert.equal(form.get("line_items[0][price_data][unit_amount]"), "14900"); assert.equal(form.get("metadata[target]"), "contest_pass"); assert.equal(form.get("metadata[plan]"), "pass_1");
    assert.equal(form.get("metadata[event_id]"), KEY); assert.deepEqual([form.get("metadata[quote_from]"), form.get("metadata[quote_to]"), form.get("metadata[quote_cents]")], [T, END, "14900"]);
    assert.equal(form.get("success_url"), O + "/add-contest?resume=1&pass=paid&plan=pass_1"); assert.equal(form.get("cancel_url"), O + "/add-contest?resume=1&pass=cancelled&plan=pass_1");
    assert.match(idem, /^pass-[0-9a-f]{64}$/); assert.equal(form.get("customer_email"), "owner@gmail.com");
    const amount = (i) => new URLSearchParams(String(f.calls[i].init.body)).get("line_items[0][price_data][unit_amount]");
    assert.equal((await buy(env, { plan: "pass_5" }, me.cookie)).status, 200); assert.equal(amount(1), "29900");
    assert.equal((await buy(env, { plan: "pass_20" }, me.cookie)).status, 200); assert.equal(amount(2), "49900");
    assert.equal((await buy(env, { plan: "pass_10" }, me.cookie)).status, 400, "pass_10 is retired");
    const manage = await buy(env, { plan: "pass_5", back: "manage:maple-street-showdown" }, me.cookie); assert.equal(manage.status, 200);
    assert.equal(new URLSearchParams(String(f.calls[3].init.body)).get("success_url"), O + "/c/maple-street-showdown/manage?pass=paid&plan=pass_5");
    const evil = await buy(env, { plan: "pass_5", back: "https://evil.example/x" }, me.cookie); assert.equal(evil.status, 200);
    assert.match(new URLSearchParams(String(f.calls[4].init.body)).get("success_url"), /^https:\/\/socallights\.app\/contest-pass\?pass=paid/, "never an outside address");
  } finally { f.restore(); }
}));

test("pass checkout with ?site: the organization comes from the website like a new contest; an upgrade costs the difference; the same or a smaller cap is refused", () => withNow(async () => {
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM contest_comps").run(); /* the founder-city comps seeded by migration 0208 would cover covinaca.gov */ const a = await addUser(raw, "u1", "clerk@covinaca.gov"); const f = stubFetch();
  try {
    const amount = () => new URLSearchParams(String(f.calls[f.calls.length - 1].init.body)).get("line_items[0][price_data][unit_amount]");
    const site = "https://www.covinaca.gov", K = { key: "d:covinaca.gov", email: "clerk@covinaca.gov" };
    assert.equal((await buy(env, { plan: "pass_1", site }, a.cookie)).status, 200); assert.equal(amount(), "14900");
    assert.equal(new URLSearchParams(String(f.calls[0].init.body)).get("metadata[event_id]"), "d:covinaca.gov");
    assert.equal((await pay(env, 1, "pass_1", T, END, P1, K)).status, 200);
    assert.equal((await make(env, a.cookie, { site })).status, 200);
    assert.equal((await buy(env, { plan: "pass_1", site }, a.cookie)).status, 400, "already holds a single contest");
    assert.equal((await buy(env, { plan: "pass_5", site }, a.cookie)).status, 200); assert.equal(amount(), "15000", "$150 from $149 to $299");
    assert.equal((await buy(env, { plan: "pass_20", site }, a.cookie)).status, 200); assert.equal(amount(), "35000", "$350 from $149 to $499");
    assert.match(new URLSearchParams(String(f.calls[f.calls.length - 1].init.body)).get("line_items[0][price_data][product_data][description]"), /upgrade/);
    assert.equal((await pay(env, 2, "pass_5", T, END, 15000, K)).status, 200);
    assert.equal((await buy(env, { plan: "pass_20", site }, a.cookie)).status, 200); assert.equal(amount(), "20000", "$200 from $299 to $499");
    assert.equal((await pay(env, 3, "pass_20", T, END, 20000, K)).status, 200);
    assert.match((await buy(env, { plan: "pass_20", site }, a.cookie)).body.error, /already has room/);
    const e = await ent(env, a.cookie, site); assert.deepEqual([e.body.cap, e.body.offers.length, e.body.contact], [20, 0, true], "at 20: only contact us is left");
  } finally { f.restore(); }
}));

test("webhook: a paid pass is applied once; the replay (same event or same session) changes nothing; the contest limit rises; one email, one funnel count", () => withNow(async () => {
  const { env, raw, me } = await setup(); const f = stubFetch(() => new Response(JSON.stringify({ id: "em_1" }), { status: 200 }));
  env.RESEND_API_KEY = "re_test";
  try {
    // a pass bought before any contest: the window starts the day it was bought
    const firstPay = await pay(env, 1, "pass_5", T, END, P5);
    assert.equal(firstPay.status, 200); assert.equal(firstPay.body.pass.cap, 5);
    const o = getOrder(raw, "cs_1"); assert.deepEqual([o.target, o.event_id, o.plan, o.amount, o.status, o.applied, o.quote_from, o.quote_to, o.note], ["contest_pass", KEY, "pass_5", P5, "paid", 1, T, END, null]);
    assert.deepEqual(passRows(raw).map((p) => [p.org_key, p.cap, p.window_start, p.window_end, p.cents, p.status]), [[KEY, 5, T, END, P5, "active"]]);
    const again = await pay(env, 1, "pass_5", T, END, P5); assert.equal(again.body.duplicate, true);
    assert.equal(passRows(raw).length, 1); assert.equal(hits(raw, "fn:pass-paid"), 1);
    const mails = f.calls.filter((c) => /resend/.test(c.url) && /Your contest pass/.test(String(c.init.body))); assert.equal(mails.length, 1, "one confirmation email"); assert.match(String(mails[0].init.body), /Up to 5 contests/); assert.match(String(mails[0].init.body), /Nov 10, 2026/);
    assert.ok(!/free first contest|is free again/.test(String(mails[0].init.body)), "the email no longer talks about a free first contest");
    const e0 = await ent(env, me.cookie, ""); assert.deepEqual([e0.body.active, e0.body.windowStart, e0.body.used, e0.body.cap], [true, T, 0, 5], "a window is running although no contest is live yet");
    for (let i = 0; i < 4; i++) { fresh(raw); assert.equal((await make(env, me.cookie, nameN(i))).status, 200, "contests 1 to 4 of 5"); } fresh(raw);
    assert.equal((await make(env, me.cookie, nameN(4))).status, 200, "the 5th contest of 5");
    assert.equal((await make(env, me.cookie, nameN(5))).status, 402, "the 6th is over the cap");
    const e = await ent(env, me.cookie, ""); assert.deepEqual([e.body.used, e.body.cap, e.body.offers.map((o) => o.pay)], [5, 5, [20000]]);
  } finally { f.restore(); }
}));

test("auto-create after payment: the wizard's contest is refused (402), the pass is paid by webhook, and the same request then creates the contest", () => withNow(async () => {
  const { env, raw, me } = await setup();
  const body = good(nameN(1)), tryIt = () => J(createContest({ request: rq("/api/contests", body, me.cookie), env }));
  assert.equal((await tryIt()).status, 402);
  assert.equal((await pay(env, 7, "pass_1", T, END, P1)).status, 200);
  const done = await tryIt(); assert.equal(done.status, 200); assert.equal(done.body.status, "live"); assert.equal(row(raw, done.body.slug).live_at, T);
  const wiz = readFileSync("public/add-contest.html", "utf8");
  for (const must of ["pass_required", "pickerHtml", "/api/contest-pass/checkout", 'back: "wizard"', 'back !== "paid"', "api.next()", "scl-contest-draft", "resume=1", "fn:pass-picker-shown", "fn:pass-choose"]) assert.ok(wiz.includes(must), "the wizard should have: " + must);
  assert.ok(/persist: "scl-contest-draft"/.test(wiz), "the form is kept in this browser across sign-in and Stripe");
}));

test("webhook: an amount that differs from the quote is applied but flagged; a pass for a changed window or an organization that already holds this much is held as refund due, not applied twice", () => withNow(async () => {
  const { env, raw, me } = await setup();
  assert.equal((await first(env, me, "pass_5", P5, undefined, "cs_x")).status, 200);
  assert.equal((await pay(env, 1, "pass_20", T, END, P20, { paid: 40000 })).status, 200);
  assert.match(getOrder(raw, "cs_1").note, /^\[auto\] amount mismatch: paid 400\.00 USD/); assert.equal(getOrder(raw, "cs_1").applied, 1);
  // a duplicate purchase of the same pass (second tab): refund due, not applied
  const dup = await pay(env, 2, "pass_5", T, END, P5); assert.equal(dup.status, 200);
  assert.equal(getOrder(raw, "cs_2").status, "refund_due"); assert.equal(getOrder(raw, "cs_2").applied, 0); assert.match(getOrder(raw, "cs_2").note, /already has room for up to 20/);
  assert.equal(passRows(raw).length, 2);
  // a window that is not the current one
  const other = await pay(env, 3, "pass_20", "2025-01-01", "2025-12-31", P20); assert.equal(other.status, 200);
  assert.equal(getOrder(raw, "cs_3").status, "refund_due"); assert.match(getOrder(raw, "cs_3").note, /window changed/);
  assert.equal(passRows(raw).length, 2);
  // no quote at all (a hand-made session): ignored
  const noq = await sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ id: "cs_9", metadata: { event_id: KEY, target: "contest_pass", plan: "pass_5", user_id: "u1" } }))); assert.equal(noq.body.ignored, "no pass quote");
  const orders = await J(ordersGet({ env })); const mine = orders.body.find((x) => x.session_id === "cs_1");
  assert.deepEqual([mine.target, mine.pass_cap, mine.pass_from, mine.pass_to, mine.pass_status], ["contest_pass", 20, T, END, "active"]);
  assert.ok(mine.flags.includes("mismatch")); assert.ok(orders.body.find((x) => x.session_id === "cs_2").flags.includes("refund_due"), "Admin > Orders shows the pass with org, cap and window");
}));

test("a pass whose quoted window had already ended when the payment arrived is held as refund due, not applied", () => withNow(async () => {
  const { env, raw, me } = await setup();
  const late = await pay(env, 1, "pass_1", "2025-01-01", "2025-12-31", P1); assert.equal(late.status, 200);
  assert.equal(getOrder(raw, "cs_1").status, "refund_due"); assert.match(getOrder(raw, "cs_1").note, /window changed/); assert.equal(passRows(raw).length, 0);
}));

test("refund before the contests were used revokes the pass; after use the pass stays on and the order is flagged for Admin; a partial refund holds it", () => withNow(async () => {
  const { env, raw, me } = await setup();
  await pay(env, 1, "pass_5", T, END, P5);
  assert.equal((await sendWebhook(webhook, env, refundOf(1, false))).body.held, "partial refund"); assert.equal(getOrder(raw, "cs_1").status, "held"); assert.equal(passRows(raw)[0].status, "active");
  const r = await sendWebhook(webhook, env, refundOf(1)); assert.equal(r.body.revoked, true);
  assert.deepEqual([getOrder(raw, "cs_1").status, passRows(raw)[0].status], ["refunded", "revoked"]);
  assert.equal((await make(env, me.cookie, nameN(1))).status, 402, "no pass any more");
  // second pass, used, then disputed
  await pay(env, 2, "pass_5", T, END, P5); assert.equal((await make(env, me.cookie, nameN(1))).status, 200); assert.equal((await make(env, me.cookie, nameN(2))).status, 200);
  const d = await sendWebhook(webhook, env, stripeEvent("charge.dispute.created", { id: "dp_1", charge: "ch_2", payment_intent: "pi_2", status: "needs_response" }));
  assert.equal(d.body.revoked, false); assert.equal(d.body.manual, "placement differs");
  const o = getOrder(raw, "cs_2"); assert.equal(o.status, "disputed"); assert.match(o.note, /^\[auto\] manual: placement differs\. The disputed contest pass was left on because the extra contests it paid for are already live/);
  assert.equal(passRows(raw).find((p) => p.session_id === "cs_2").status, "active", "contests that are live stay live");
  const flags = (await J(ordersGet({ env }))).body.find((x) => x.session_id === "cs_2").flags; assert.ok(flags.includes("disputed") && flags.includes("differs"), "flagged for Admin");
  // Admin decides: revoke
  assert.equal((await J(passesPost({ request: rq("/api/admin/passes", { action: "revoke_pass", session_id: "cs_2" }), env, data: { admin: { email: "a@x.org" } } }))).status, 200);
  assert.equal(passRows(raw).find((p) => p.session_id === "cs_2").status, "revoked");
}));

test("a single-contest pass that was used is not revoked by a refund: the contest it paid for is live, so Admin looks", () => withNow(async () => {
  const { env, raw, me } = await setup();
  assert.equal((await first(env, me)).status, 200);
  const r = await sendWebhook(webhook, env, refundOf("f0")); assert.equal(r.body.revoked, false);
  assert.equal(passRows(raw)[0].status, "active"); assert.equal(getOrder(raw, "cs_f0").status, "refunded");
}));

test("a refund or dispute that arrives before the order exists is remembered: the pass is never applied", () => withNow(async () => {
  const { env, raw, me } = await setup();
  assert.equal((await sendWebhook(webhook, env, refundOf(5))).body.pending, "refunded");
  await pay(env, 5, "pass_5", T, END, P5);
  assert.deepEqual([getOrder(raw, "cs_5").status, getOrder(raw, "cs_5").applied, passRows(raw).length], ["refunded", 0, 0]);
}));

test("Admin 'Mark refunded' on a pass order revokes it (when unused) and 'reapply' applies a paid order that is not applied yet", () => withNow(async () => {
  const { env, raw, me } = await setup();
  await pay(env, 1, "pass_5", T, END, P5);
  const r = await J(orderAction({ params: { id: "cs_1" }, request: rq("/x", { action: "mark_refunded" }), env, data: { admin: { email: "a@x.org" } } }));
  assert.equal(r.status, 200); assert.equal(r.body.placement_differs, false); assert.equal(passRows(raw)[0].status, "revoked");
  raw.prepare("UPDATE feature_orders SET status='paid', applied=0, refunded_at=NULL WHERE session_id='cs_1'").run(); raw.prepare("DELETE FROM contest_passes").run();
  const re = await J(orderAction({ params: { id: "cs_1" }, request: rq("/x", { action: "reapply" }), env, data: { admin: { email: "a@x.org" } } }));
  assert.equal(re.status, 200); assert.equal(passRows(raw).length, 1); assert.equal(getOrder(raw, "cs_1").applied, 1);
}));

test("comps: Admin grants unlimited or a number until a date; organizers see 'Founding partner: free through <date>' and no price; expiry and ending a comp end it; usage is visible; a comp needs no pass and a comp organizer never sees a price", () => withNow(async () => {
  const { env, raw } = newEnv(); const a = await addUser(raw, "ua", "clerk@covinaca.gov"), g = await addUser(raw, "ug", "someone@gmail.com");
  raw.prepare("DELETE FROM contest_comps").run(); // the founder-city comps (migration 0208) are covered in tests/founder-city.test.mjs; this test grants its own
  const adm = (b) => J(passesPost({ request: rq("/api/admin/passes", b), env, data: { admin: { email: "owner@forza-tek.com" } } }));
  assert.equal((await adm({ action: "grant", target: "", allowed: "unlimited", until: "2027-03-01" })).status, 400);
  assert.equal((await adm({ action: "grant", target: "covinaca.gov", allowed: "unlimited", until: "2026-01-01" })).status, 400, "a date that has passed");
  assert.equal((await adm({ action: "grant", target: "covinaca.gov", allowed: 0, until: "2027-03-01" })).status, 400);
  const site = "https://www.covinaca.gov";
  assert.equal((await make(env, a.cookie, { site })).status, 402, "before the comp: a pass is needed from the first contest");
  const gr = await adm({ action: "grant", target: "https://www.covinaca.gov/", allowed: "unlimited", until: "2027-03-01", note: "Founding partner: Covina" }); assert.equal(gr.status, 200); assert.equal(gr.body.key, "d:covinaca.gov");
  const e = await ent(env, a.cookie, site); assert.deepEqual([e.body.canCreate, e.body.comp, e.body.offers, e.body.unlimited], [true, { until: "2027-03-01", unlimited: true }, [], true], "free, with no offers and no price");
  assert.ok(!/\$\d/.test(JSON.stringify(e.body)), "no price anywhere in what a comp organizer is sent");
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contest_passes").get().n, 0, "no pass was bought");
  for (let i = 1; i < 5; i++) { fresh(raw); assert.equal((await make(env, a.cookie, { ...nameN(i), site })).status, 200, "unlimited: " + i); }
  assert.equal((await make(env, g.cookie, { ...nameN(9), site })).status, 402, "a gmail owner is not covered by the city's comp");
  const list = (await J(passesGet({ env }))).body; const org = list.orgs.find((o) => o.key === "d:covinaca.gov");
  assert.deepEqual([org.used, org.unlimited, org.over, org.comp.until], [4, true, false, "2027-03-01"]); assert.equal(list.comps[0].running, true); assert.equal(list.comps[0].note, "Founding partner: Covina");
  assert.equal(list.free, 0);
  assert.equal((await adm({ action: "revoke_comp", id: list.comps[0].id })).status, 200);
  assert.equal((await ent(env, a.cookie, site)).body.canCreate, false, "ended");
  // a counted comp ("allowed 7") and expiry
  await adm({ action: "grant", target: "covinaca.gov", allowed: 7, until: "2026-12-01" });
  assert.deepEqual([(await ent(env, a.cookie, site)).body.cap, (await ent(env, a.cookie, site)).body.canCreate], [7, true]);
  await withNow(async () => { assert.deepEqual([(await ent(env, a.cookie, site)).body.cap, (await ent(env, a.cookie, site)).body.canCreate], [0, false], "after the comp's valid-until date: back to needing a pass"); }, "2026-12-02T20:00:00Z");
}));

test("a comp does not lower a price: an organization with a counted comp that buys a pass pays the full price", () => withNow(async () => {
  const { env, raw, me } = await setup(); const f = stubFetch();
  try {
    raw.prepare("INSERT INTO contest_comps (id, org_key, allowed, valid_until, note) VALUES ('c1', ?, 2, '2027-01-01', 'Founding partner')").run(KEY);
    const e = await ent(env, me.cookie, ""); assert.deepEqual(e.body.offers, [], "a comp organizer is shown no offers while it can still create contests");
    assert.equal((await make(env, me.cookie)).status, 200); assert.equal((await make(env, me.cookie, nameN(1))).status, 200); fresh(raw);
    const over = await ent(env, me.cookie, ""); assert.deepEqual([over.body.canCreate, over.body.offers.map((o) => [o.key, o.pay, o.upgrade])], [false, [["pass_5", 29900, false], ["pass_20", 49900, false]]], "over the comp: full prices, not differences");
    assert.equal((await buy(env, { plan: "pass_5" }, me.cookie)).status, 200); assert.equal(new URLSearchParams(String(f.calls[0].init.body)).get("line_items[0][price_data][unit_amount]"), "29900");
  } finally { f.restore(); }
}));

test("Admin passes panel: usage over its limit is marked, merge moves contests and future ones, set_key, the Founding City comp needs no seed data", () => withNow(async () => {
  const { env, raw } = newEnv(); const a = await addUser(raw, "ua", "clerk@covinaca.gov"), b = await addUser(raw, "ub", "intern@gmail.com");
  const adm = (body) => J(passesPost({ request: rq("/api/admin/passes", body), env, data: { admin: { email: "o@x.org" } } }));
  assert.deepEqual(raw.prepare("SELECT org_key FROM contest_comps ORDER BY org_key").all().map((r) => r.org_key), ["d:covinaca.gov", "d:eastvaleca.gov"], "only the two founder-city comps (migration 0208) are seeded");
  raw.prepare("DELETE FROM contest_comps").run();
  await pay(env, 1, "pass_1", T, END, P1, { key: "d:covinaca.gov", email: "clerk@covinaca.gov" }); await pay(env, 2, "pass_1", T, END, P1, { key: "u:intern@gmail.com", email: "intern@gmail.com" });
  await make(env, a.cookie, { site: "https://covinaca.gov" }); await make(env, b.cookie, nameN(1));
  assert.equal((await adm({ action: "merge", from: "u:intern@gmail.com", to: "covinaca.gov" })).status, 200);
  assert.equal(row(raw, raw.prepare("SELECT slug FROM contests WHERE owner_id='ub'").get().slug).org_key, "d:covinaca.gov");
  const list = (await J(passesGet({ env }))).body; const org = list.orgs.find((o) => o.key === "d:covinaca.gov"); assert.deepEqual([org.used, org.cap, org.over], [2, 1, true], "two live contests on one single-contest pass is over its limit");
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
  const a = await first(env, me); assert.equal(a.status, 200);
  const r = await J(patchContest({ params: { slug: a.body.slug }, request: rq("/x", { action: "clone" }, me.cookie, "PATCH"), env }));
  assert.equal(r.status, 402); assert.equal(r.body.code, "pass_required"); assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contests").get().n, 1);
  await pay(env, 1, "pass_5", T, END, 15000); // the upgrade: $150 from $149 to $299
  const ok = await J(patchContest({ params: { slug: a.body.slug }, request: rq("/x", { action: "clone" }, me.cookie, "PATCH"), env })); assert.equal(ok.status, 200);
  assert.equal(row(raw, ok.body.slug).live_at, T); assert.equal(row(raw, ok.body.slug).org_key, KEY);
}));

test("funnel counters: pass-picker-shown, pass-choose (browser) and pass-paid (server) are listed; the browser ones are accepted by /api/visit", () => {
  const keys = STEPS.map((s) => s[0]);
  for (const k of ["fn:pass-picker-shown", "fn:pass-choose", "fn:pass-paid"]) assert.ok(keys.includes(k), k);
  assert.ok(CLIENT_KEYS.includes("fn:pass-picker-shown") && CLIENT_KEYS.includes("fn:pass-choose") && !CLIENT_KEYS.includes("fn:pass-paid"), "paid is counted by the server only");
});

test("copy: contents in full, never 'Everything in', no price written in the pages (they come from /api/config), 'home' not 'house', nothing free, no 'free forever'", () => {
  const cfg = { contestPasses: PUBLIC_CONTEST_PASSES };
  for (const k of PASS_KEYS) { const c = passCopy(k, cfg); assert.ok(c.bullets.length >= 7, k + " lists its contents"); assert.equal(c.bullets[0], capLine(CONTEST_PASSES[k].cap)); }
  assert.equal(passCopy("pass_1", cfg).bullets[0], "1 contest in your 12-month window"); assert.equal(passCopy("pass_1", cfg).name, "Single contest");
  assert.equal(passCopy("pass_5", cfg).bullets[0], "Up to 5 contests in your 12-month window in total"); assert.equal(passCopy("pass_20", cfg).bullets[0], "Up to 20 contests in your 12-month window in total");
  const files = ["public/contest-passes.js", "public/pricing.html", "public/add-contest.html", "public/contest-pass.html", "public/terms.html", "public/add.html", "functions/_lib/passmail.js", "functions/_lib/passes.js"];
  const blob = files.map((f) => readFileSync(f, "utf8").replace(/^\s*\/\/.*$/gm, "")).join("\n") + JSON.stringify([moreCopy(), ...PASS_KEYS.map((k) => passCopy(k, cfg))]);
  assert.ok(!/Everything (in|above)/i.test(blob), "never 'Everything in ...'");
  assert.ok(!/free forever|always be free|always free/i.test(blob), "no promise of free forever");
  const mail = readFileSync("functions/_lib/mailtpl.js", "utf8"); assert.ok(!/Everything (in|above)/i.test(mail));
  for (const f of ["public/pricing.html", "public/contest-pass.html", "public/contest-passes.js", "public/add.html"]) assert.ok(!/\$\s?(50|75|100|149|299|499)\b/.test(readFileSync(f, "utf8")), f + " must not write a pass price: prices come from /api/config");
  const pricing = readFileSync("public/pricing.html", "utf8");
  assert.ok(pricing.includes("contestPasses") && pricing.includes("More than") && pricing.includes("contactHref") && pricing.includes('data-pass-choose'), "three passes with Choose, and More than 20: contact us");
  assert.ok(!/id="cfree"|1 contest per 12 months|first contest in every 12-month window is free/i.test(pricing), "no free contest card on Pricing");
  assert.ok(!/Free for now/i.test(pricing));
  assert.ok(!/\bhouses?\b/i.test(readFileSync("public/contest-passes.js", "utf8").replace(/\/\/.*$/gm, "")), "home, not house");
  // nowhere a page, email or help text still says a contest is free to run
  for (const f of ["public/add-contest.html", "public/contest-pass.html", "public/pricing.html", "public/terms.html", "public/contest-passes.js", "public/app.js", "functions/_lib/passmail.js", "functions/_lib/chatkb.js", "functions/_lib/chatcards.js", "docs/ai-assistant-kb.md"])
    assert.ok(!/first contest[^.]{0,60}\bfree\b|free first contest|one free contest|1 contest per 12 months|is free again/i.test(readFileSync(f, "utf8")), f + " still says the first contest is free");
  assert.ok(!/first contest[^.]{0,60}\bfree\b|free first contest|is free again/i.test(readFileSync("functions/_lib/mailtpl.js", "utf8")), "the pass email");
});

test("the Add page tile for a contest shows the price from /api/config, not 'Free'", () => {
  const add = readFileSync("public/add.html", "utf8");
  assert.ok(!/Free · about 3 minutes/.test(add), "the contest tile no longer says Free");
  assert.ok(add.includes('"/api/config"') && add.includes("contestPasses") && add.includes("#o-contest"), "the price is read from /api/config");
  assert.ok(/Free · about 1 minute/.test(add) && /Free · about 2 minutes/.test(add), "event and home stay free");
});

test("pages state that payment never affects results, and the Terms have the Contest organizer passes section", () => {
  const terms = readFileSync("public/terms.html", "utf8").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  for (const must of ["Contest organizer passes", "A pass sets the total number of contests the organization may run in a 12-month window", "buys its pass, or the day its first contest goes live if that comes first", "Contests that were already live or announced before contest passes began are not counted", "A contest counts when it goes live", "A pass counts contests only", "Comps", "never affects any vote, judge, ranking, award or contest result", "pass is refunded, or a payment dispute is lost", "Co-organizers and staff do not create separate organizations", "info@socallights.app"]) assert.ok(terms.includes(must), "Terms: " + must);
  const lib = readFileSync("public/contest-passes.js", "utf8"); assert.ok(lib.includes("Payment never affects any result, vote, judge or ranking"));
  assert.ok(readFileSync("public/contest-pass.html", "utf8").includes("payment never affects any result, vote, judge or ranking"));
});
