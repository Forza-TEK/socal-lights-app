// Event Partner plan (owner decision 2026-11-09): one price per season covers up to 10 of an organization's events with the Featured pin and an Event Partner badge.
// Price served by /api/config, the cap of 10, the window rules (opens 30 days before, follows the event, ends with the season), founder-city comps (free through 2026-12-31, never a price),
// checkout, webhook apply / replay, refund and dispute, the badge. In-memory D1; fetch is stubbed (nothing reaches Stripe or a mailbox).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { onRequestGet as entitlementGet } from "../functions/api/partner/entitlement.js";
import { onRequestPost as partnerCheckout } from "../functions/api/partner/checkout.js";
import { onRequestPost as partnerApply } from "../functions/api/partner/apply.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { onRequestGet as configGet } from "../functions/api/config.js";
import { onRequestGet as adminGet, onRequestPost as adminPost } from "../functions/api/admin/partner.js";
import { EVENT_PARTNER, PUBLIC_EVENT_PARTNER, partnerEntitlement, partnerQuote, offerFor } from "../functions/_lib/partner.js";
import { seasonOf } from "../functions/_lib/sponsor.js";
import { rowToEvent, rowToListEvent } from "../functions/_lib/util.js";
import { newEnv, addUser, stubFetch, stripeEvent, sendWebhook, session, getOrder, freezeNow } from "./_pay.mjs";

const NOW = "2026-11-09T20:00:00Z", T = "2026-11-09", O = "https://socallights.app";
const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})) }; };
const rq = (url, body, cookie) => new Request(O + url, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", origin: O, ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const withNow = async (fn, iso = NOW) => { const un = freezeNow(iso); try { return await fn(); } finally { un(); } };
const view = (env, cookie) => J(entitlementGet({ request: rq("/api/partner/entitlement", null, cookie), env }));
const apply = (env, cookie, event_id) => J(partnerApply({ request: rq("/api/partner/apply", { event_id }, cookie), env }));
const buy = (env, cookie) => J(partnerCheckout({ request: rq("/api/partner/checkout", {}, cookie), env }));
const KEY = "d:citya.org";
async function setup(email = "staff@citya.org") { const { env, raw } = newEnv({ ADMIN_NOTIFY_EMAIL: "admin@example.com" }); const me = await addUser(raw, "u1", email); return { env, raw, me }; }
// A live event the person submitted (so they own it).
function addEv(raw, id, email, { start = "2026-11-20", end = "2026-12-20", status = "confirmed", notice = "" } = {}) {
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,lat,lng,url,status,notice) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(id, "Event " + id, "Riverside", "Eastvale", "walk", start, end, 34, -118, "https://citya.org/e", status, notice);
  raw.prepare("INSERT INTO event_submissions (id,name,city,season,type,start_date,end_date,contact_email,status,event_id) VALUES (?,?,?,?,?,?,?,?,?,?)").run("s_" + id, "Event " + id, "Eastvale", "christmas", "walk", start, end, email, "approved", id);
}
const ev = (raw, id) => ({ ...raw.prepare("SELECT * FROM events WHERE id = ?").get(id) });
const meta = (cents = 14900, key = KEY, o = {}) => ({ event_id: key, target: "event_partner", plan: "partner", user_id: "u1", quote_from: T, quote_to: "2027-01-06", quote_cents: String(cents), ...o });
const pay = (env, n, { cents = 14900, paid = cents, key = KEY, email = "staff@citya.org", o = {} } = {}) => sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ id: "cs_" + n, payment_intent: "pi_" + n, amount_total: paid, customer_details: { email }, metadata: meta(cents, key, o) })));
const plans = (raw) => raw.prepare("SELECT * FROM event_partner_plans ORDER BY created_at, session_id").all().map((r) => ({ ...r }));

test("the price and the cap live in partner.js only: $149 per season, up to 10 events", () => {
  assert.deepEqual([EVENT_PARTNER.cents, EVENT_PARTNER.cap], [14900, 10]);
  assert.deepEqual(PUBLIC_EVENT_PARTNER, { label: "Event Partner", cents: 14900, cap: 10 });
  const hits = [];
  const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = d + "/" + e.name; if (e.isDirectory()) { if (!["vendor", "img", "tutorials", "ad-assets"].includes(e.name)) walk(p); } else if (/\.(js|html)$/.test(e.name) && /14900/.test(readFileSync(p, "utf8"))) hits.push(p); });
  walk("functions"); walk("public");
  assert.deepEqual(hits.filter((p) => !/chatkb-data/.test(p)), ["functions/_lib/partner.js"], "no other file holds the price");
});

test("/api/config serves the plan; the existing event plans are untouched", async () => {
  const c = await (await configGet({ env: {} })).json();
  assert.deepEqual(c.eventPartner, { label: "Event Partner", cents: 14900, cap: 10 });
  assert.equal(Object.keys(c.eventPlans).length, 4); assert.deepEqual(Object.values(c.eventPlans).map((p) => p.cents), [2500, 5000, 5000, 7500]);
});

test("entitlement math: a plan or a comp covers up to its cap; the larger wins; unlimited; no price once covered", () => {
  const s = seasonOf(T);
  const none = partnerEntitlement(s); assert.deepEqual([none.covered, none.cap, none.canApply], [false, 0, false]); assert.deepEqual(offerFor(none), { cents: 14900, cap: 10 });
  const plan = partnerEntitlement(s, [{ cap: 10 }], [], 9); assert.deepEqual([plan.covered, plan.cap, plan.remaining, plan.canApply], [true, 10, 1, true]); assert.equal(offerFor(plan), null);
  assert.equal(partnerEntitlement(s, [{ cap: 10 }], [], 10).canApply, false, "the 11th is refused");
  const comp = partnerEntitlement(s, [], [{ allowed: 10, valid_until: "2026-12-31" }, { allowed: 3, valid_until: "2027-01-01" }], 0); assert.deepEqual([comp.cap, comp.comp.until], [10, "2026-12-31"]);
  const unl = partnerEntitlement(s, [], [{ allowed: -1, valid_until: "2027-01-01" }], 99); assert.deepEqual([unl.unlimited, unl.cap, unl.canApply], [true, null, true]);
  assert.equal(partnerQuote(none, T).cents, 14900); assert.equal(partnerQuote(none, T).to, "2027-01-06");
  assert.match(partnerQuote(plan, T).problem, /already has an Event Partner plan/); assert.match(partnerQuote(comp, T).problem, /Founding partner/);
});

test("migration 0211 grants the two founder-city comps through 2026-12-31, with stable ids, once", () => {
  const { raw } = newEnv();
  const rows = raw.prepare("SELECT id, org_key, allowed, valid_until, revoked FROM event_partner_comps ORDER BY id").all().map((r) => ({ ...r }));
  assert.deepEqual(rows, [{ id: "founder-covinaca-gov", org_key: "d:covinaca.gov", allowed: 10, valid_until: "2026-12-31", revoked: 0 }, { id: "founder-eastvaleca-gov", org_key: "d:eastvaleca.gov", allowed: 10, valid_until: "2026-12-31", revoked: 0 }]);
  const sql = readFileSync("migrations/0211_event_partner.sql", "utf8");
  assert.doesNotMatch(sql, /2028/, "this year only");
  const ins = sql.slice(sql.indexOf("INSERT OR IGNORE INTO event_partner_comps"));
  raw.exec(ins); assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_partner_comps").get().n, 2, "running it again adds nothing");
});

test("a founder city is covered at no price this year; after 2026-12-31 it sees the normal price", async () => {
  const { env, raw } = await setup("clerk@eastvaleca.gov");
  const cookie = "scl_session=tok_u1";
  await withNow(async () => {
    const v = await view(env, cookie);
    assert.equal(v.body.org, "eastvaleca.gov"); assert.equal(v.body.verified, true);
    assert.deepEqual([v.body.covered, v.body.offer, v.body.comp.until, v.body.cap, v.body.used], [true, null, "2026-12-31", 10, 0], "no price object at all");
    assert.equal(JSON.stringify(v.body).includes("14900"), false);
    const b = await buy(env, cookie); assert.equal(b.status, 400, "nothing to buy under a comp"); assert.match(b.body.error, /Founding partner/);
  });
  await withNow(async () => {
    const v = await view(env, cookie);
    assert.deepEqual([v.body.covered, v.body.comp, v.body.offer], [false, null, { cents: 14900, cap: 10 }], "the comp ended: the normal price");
  }, "2027-01-02T20:00:00Z");
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_partner_plans").get().n, 0);
});

test("Covina is covered the same way, and a gmail user is not", async () => {
  const a = await setup("clerk@covinaca.gov"); const b = await withNow(() => view(a.env, "scl_session=tok_u1")); assert.deepEqual([b.body.org, b.body.covered], ["covinaca.gov", true]);
  const c = await setup("someone@gmail.com"); const d = await withNow(() => view(c.env, "scl_session=tok_u1")); assert.deepEqual([d.body.covered, d.body.verified, d.body.offer.cents], [false, false, 14900]);
});

test("checkout: signed in, price and season dates from the server only, locked in the payment", () => withNow(async () => {
  const { env, me } = await setup();
  const stub = stubFetch();
  try {
    assert.equal((await buy(env, null)).status, 401);
    const r = await buy(env, me.cookie); assert.equal(r.status, 200); assert.match(r.body.url, /checkout\.stripe\.com/);
    const f = new URLSearchParams(stub.calls[0].init.body);
    assert.equal(f.get("line_items[0][price_data][unit_amount]"), "14900"); assert.equal(f.get("metadata[target]"), "event_partner"); assert.equal(f.get("metadata[event_id]"), KEY);
    assert.deepEqual([f.get("metadata[quote_from]"), f.get("metadata[quote_to]"), f.get("metadata[quote_cents]")], [T, "2027-01-06", "14900"]);
    const ua = await J(partnerCheckout({ request: new Request(O + "/api/partner/checkout", { method: "POST", headers: { "content-type": "application/json", origin: O, cookie: me.cookie, "user-agent": "SoCalLightsApp/1" }, body: "{}" }), env })); assert.equal(ua.status, 403, "web only");
  } finally { stub.restore(); }
}));

test("webhook: the plan is recorded and the order applied; a replay changes nothing; a wrong amount is flagged but applied", () => withNow(async () => {
  const { env, raw } = await setup(); const stub = stubFetch();
  try {
    const a = await pay(env, "1"); assert.equal(a.status, 200); assert.ok(a.body.partner);
    const o = getOrder(raw, "cs_1"); assert.deepEqual([o.status, o.applied, o.target, o.event_id, o.applied_until], ["paid", 1, "event_partner", KEY, "2027-01-06"]);
    assert.deepEqual(plans(raw).map((p) => [p.org_key, p.cap, p.cents, p.status, p.season_start, p.season_end]), [[KEY, 10, 14900, "active", "2026-11-03", "2027-01-06"]]);
    assert.equal((await pay(env, "1")).body.duplicate, true); assert.equal(plans(raw).length, 1);
    const v = await view(env, "scl_session=tok_u1"); assert.deepEqual([v.body.hasPlan, v.body.covered, v.body.offer, v.body.used, v.body.cap], [true, true, null, 0, 10]);
    const m = await pay(env, "2", { key: "d:other.org", cents: 14900, paid: 100 }); assert.match(getOrder(raw, "cs_2").note, /amount mismatch/); assert.equal(m.status, 200);
  } finally { stub.restore(); }
}));

test("a second plan for the same organization and season (second tab) is held as refund due, not applied twice", () => withNow(async () => {
  const { env, raw } = await setup(); const stub = stubFetch();
  try { await pay(env, "1"); await pay(env, "2"); const o = getOrder(raw, "cs_2"); assert.deepEqual([o.status, o.applied], ["refund_due", 0]); assert.match(o.note, /already has an Event Partner plan/); assert.equal(plans(raw).length, 1); }
  finally { stub.restore(); }
}));

test("apply: needs a plan; Featured pin level 1 to the event's last day; badge and verified; used x of 10", () => withNow(async () => {
  const { env, raw, me } = await setup(); const stub = stubFetch();
  try {
    addEv(raw, "e1", me.email, { start: "2026-11-20", end: "2026-12-20" });
    assert.equal((await apply(env, me.cookie, "e1")).status, 402, "no plan yet");
    await pay(env, "1");
    const r = await apply(env, me.cookie, "e1"); assert.equal(r.status, 200); assert.deepEqual([r.body.from, r.body.to, r.body.used, r.body.cap, r.body.remaining], [T, "2026-12-20", 1, 10, 9]);
    const e = ev(raw, "e1"); assert.deepEqual([e.featured, e.featured_until, e.partner_until, e.partner_verified, e.banner_until], [1, "2026-12-20", "2026-12-20", 1, null]);
    const pub = rowToEvent(e); assert.deepEqual([pub.f, pub.ep, pub.epv], [1, 1, 1]);
    assert.equal(rowToListEvent(e).ep, 1);
    assert.equal((await apply(env, me.cookie, "e1")).status, 409, "the same event twice");
    const v = await view(env, me.cookie); assert.deepEqual([v.body.used, v.body.events.map((x) => x.id)], [1, ["e1"]]);
  } finally { stub.restore(); }
}));

test("the badge only shows while it runs and for covered events; the wording never calls it verified or an endorsement", () => {
  assert.equal(rowToEvent({ id: "x", name: "n", start_date: "2026-11-01", end_date: "2026-11-02" }).ep, undefined);
  assert.equal(rowToEvent({ id: "x", name: "n", partner_until: "2000-01-01", partner_verified: 1 }).ep, undefined, "over");
  const live = rowToEvent({ id: "x", name: "n", partner_until: "2999-01-01", partner_verified: 0 }); assert.deepEqual([live.ep, live.epv], [1, undefined]);
  const src = readFileSync("public/app.js", "utf8"); assert.match(src, /Event Partner<\/span>/); assert.match(src, /not an endorsement/);
});

test("window rules: opens 30 days before the event; ends at the season's last day; an ended, cancelled or already-featured event is refused", () => withNow(async () => {
  const { env, raw, me } = await setup(); const stub = stubFetch();
  try {
    await pay(env, "1");
    addEv(raw, "far", me.email, { start: "2027-01-05", end: "2027-01-05" }); // 57 days away: not open yet
    addEv(raw, "long", me.email, { start: "2026-12-01", end: "2027-01-30" }); // runs past Jan 6: capped at the season end
    addEv(raw, "past", me.email, { start: "2026-10-01", end: "2026-11-01" });
    addEv(raw, "cx", me.email, { start: "2026-11-20", end: "2026-11-25", notice: "cancelled" });
    addEv(raw, "had", me.email, { start: "2026-11-20", end: "2026-12-01" }); raw.prepare("UPDATE events SET featured=1, featured_until='2026-12-01' WHERE id='had'").run();
    const far = await apply(env, me.cookie, "far"); assert.equal(far.status, 400); assert.match(far.body.error, /opens 30 days before/);
    assert.equal(ev(raw, "far").featured, 0, "nothing applied");
    const long = await apply(env, me.cookie, "long"); assert.equal(long.status, 200); assert.equal(long.body.to, "2027-01-06"); assert.equal(ev(raw, "long").featured_until, "2027-01-06");
    assert.match((await apply(env, me.cookie, "past")).body.error, /already ended/);
    assert.match((await apply(env, me.cookie, "cx")).body.error, /cancelled/);
    const had = await apply(env, me.cookie, "had"); assert.equal(had.status, 400); assert.match(had.body.error, /already has the Featured pin/);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_partner_events").get().n, 1, "refused events use no slot");
  } finally { stub.restore(); }
}));

test("someone else's event cannot be covered by an organization's plan", () => withNow(async () => {
  const { env, raw, me } = await setup(); const stub = stubFetch();
  try { await pay(env, "1"); addEv(raw, "theirs", "stranger@gmail.com"); const r = await apply(env, me.cookie, "theirs"); assert.equal(r.status, 403); assert.equal(ev(raw, "theirs").featured, 0); } finally { stub.restore(); }
}));

test("the cap of 10: the 11th event is refused, a freed slot can be reused", () => withNow(async () => {
  const { env, raw, me } = await setup(); const stub = stubFetch();
  try {
    await pay(env, "1");
    for (let i = 1; i <= 11; i++) addEv(raw, "c" + i, me.email);
    for (let i = 1; i <= 10; i++) assert.equal((await apply(env, me.cookie, "c" + i)).status, 200, "event " + i);
    const eleventh = await apply(env, me.cookie, "c11"); assert.equal(eleventh.status, 409); assert.match(eleventh.body.error, /All 10 events/); assert.equal(ev(raw, "c11").featured, 0);
    const v = await view(env, me.cookie); assert.deepEqual([v.body.used, v.body.remaining, v.body.canApply], [10, 0, false]);
    const rel = await J(adminPost({ request: rq("/api/admin/partner", { action: "release", event_id: "c1", season_start: "2026-11-03" }), env, data: { admin: { email: "owner@x.org" } } })); assert.equal(rel.status, 200);
    assert.equal(ev(raw, "c1").partner_until, null);
    assert.equal((await apply(env, me.cookie, "c11")).status, 200, "a freed slot is usable");
  } finally { stub.restore(); }
}));

test("a founder city applies the plan to its events with no payment, and the cap is still 10", () => withNow(async () => {
  const { env, raw, me } = await setup("clerk@covinaca.gov");
  addEv(raw, "cv1", me.email); const r = await apply(env, me.cookie, "cv1"); assert.equal(r.status, 200);
  assert.deepEqual([ev(raw, "cv1").featured, ev(raw, "cv1").partner_verified], [1, 1]); assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM feature_orders").get().n, 0, "no order, no price");
  const v = await view(env, me.cookie); assert.deepEqual([v.body.used, v.body.cap, v.body.offer], [1, 10, null]);
}));

test("refund: the plan is revoked and the pins it applied are switched off; a hand-set longer placement is left and flagged", () => withNow(async () => {
  const { env, raw, me } = await setup(); const stub = stubFetch();
  try {
    await pay(env, "1"); addEv(raw, "a", me.email); addEv(raw, "b", me.email);
    await apply(env, me.cookie, "a"); await apply(env, me.cookie, "b");
    raw.prepare("UPDATE events SET featured_until = '2027-03-01' WHERE id = 'b'").run(); // Admin extended it by hand
    const r = await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_1", refunded: true }));
    assert.equal(r.status, 200); assert.equal(getOrder(raw, "cs_1").status, "refunded");
    assert.equal(plans(raw)[0].status, "revoked");
    const a = ev(raw, "a"); assert.deepEqual([a.featured, a.featured_until, a.partner_until], [0, null, null], "switched off");
    const b = ev(raw, "b"); assert.equal(b.featured, 1, "the longer hand-set placement stays"); assert.equal(b.partner_until, null, "but the badge goes");
    assert.match(getOrder(raw, "cs_1").note, /^\[auto\] manual: placement differs/, "flagged for Admin");
    const v = await view(env, me.cookie); assert.deepEqual([v.body.covered, v.body.used, v.body.offer.cents], [false, 0, 14900], "the slots come back and the plan can be bought again");
  } finally { stub.restore(); }
}));

test("a lost dispute revokes the plan too", () => withNow(async () => {
  const { env, raw, me } = await setup(); const stub = stubFetch();
  try {
    await pay(env, "1"); addEv(raw, "a", me.email); await apply(env, me.cookie, "a");
    const r = await sendWebhook(webhook, env, stripeEvent("charge.dispute.created", { id: "dp_1", charge: "ch_1", payment_intent: "pi_1" })); assert.equal(r.status, 200);
    assert.equal(getOrder(raw, "cs_1").status, "disputed"); assert.equal(ev(raw, "a").featured, 0); assert.equal(ev(raw, "a").partner_until, null); assert.equal(plans(raw)[0].status, "revoked");
  } finally { stub.restore(); }
}));

test("a refund that arrives before the payment never switches the plan on", () => withNow(async () => {
  const { env, raw } = await setup(); const stub = stubFetch();
  try { await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_1", refunded: true })); await pay(env, "1"); assert.equal(plans(raw).length, 0); assert.equal(getOrder(raw, "cs_1").status, "refunded"); } finally { stub.restore(); }
}));

test("Admin: lists organizations with used x of cap, grants and ends a comp", () => withNow(async () => {
  const { env, raw, me } = await setup(); const stub = stubFetch();
  try {
    const g = await J(adminPost({ request: rq("/api/admin/partner", { action: "grant", target: "https://www.citya.org", allowed: 5, until: "2026-12-31", note: "test" }), env, data: { admin: { email: "owner@x.org" } } }));
    assert.deepEqual([g.status, g.body.key], [200, "d:citya.org"]);
    assert.equal((await J(adminPost({ request: rq("/api/admin/partner", { action: "grant", target: "citya.org", allowed: 5, until: "2020-01-01" }), env, data: {} }))).status, 400, "a date that has passed");
    addEv(raw, "a", me.email); await apply(env, me.cookie, "a");
    const d = await J(adminGet({ env })); const o = d.body.orgs.find((x) => x.key === KEY);
    assert.deepEqual([o.used, o.cap, o.comp.until, o.events.length], [1, 5, "2026-12-31", 1]);
    assert.ok(d.body.comps.some((c) => c.org_key === "d:eastvaleca.gov" && c.running));
    await J(adminPost({ request: rq("/api/admin/partner", { action: "revoke_comp", id: g.body.id }), env, data: {} }));
    assert.equal((await view(env, me.cookie)).body.covered, false);
  } finally { stub.restore(); }
}));

test("wording: the pricing page, the plan page, the help article and the assistant say it right", () => {
  const files = ["public/partner.html", "public/partner-copy.js", "public/pricing.html", "migrations/0212_help_event_partner.sql", "docs/ai-assistant-kb.md"];
  for (const p of files) { const t = readFileSync(p, "utf8"); assert.doesNotMatch(t, /Everything (in|above)/, p); assert.doesNotMatch(t, /free forever/i, p); }
  const copy = readFileSync("public/partner-copy.js", "utf8"); assert.match(copy, /not an endorsement/); assert.match(copy, /stays free/); assert.doesNotMatch(copy, /\bverified\b/i);
  const help = readFileSync("migrations/0212_help_event_partner.sql", "utf8");
  assert.doesNotMatch(help, /\$\d/, "no prices in the help article: they are on /pricing"); assert.match(help, /through the end of 2026/);
  assert.doesNotMatch(readFileSync("public/partner.html", "utf8"), /\bhouse\b/i);
});
