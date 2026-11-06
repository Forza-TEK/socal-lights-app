// The event organizer's Featured funnel: what the page needs from the server (/api/me/featurable), the funnel counters, the redirect
// URLs, and the confirmation email. fetch is stubbed: nothing reaches Stripe or the mail service.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as featurable } from "../functions/api/me/featurable.js";
import { onRequestPost as checkout } from "../functions/api/feature/checkout.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { onRequestPost as decide } from "../functions/api/admin/submissions/[id].js";
import { onRequestPost as visit } from "../functions/api/visit.js";
import { STEPS, dayKey } from "../functions/_lib/funnel.js";
import { eventEligibility, planWindow } from "../public/feature-plans.js";
import { PUBLIC_PLANS } from "../functions/_lib/featured.js";
import { newEnv, addEvent, addUser, stubFetch, sendWebhook, stripeEvent, session, getEvent, ptToday } from "./_pay.mjs";

const n = (raw, page) => (raw.prepare("SELECT n FROM site_hits WHERE day = ? AND page = ?").get(dayKey(), page) || {}).n || 0;
const get = (url, cookie) => new Request("https://socallights.app" + url, { headers: { ...(cookie ? { cookie } : {}) } });
const post = (url, body, cookie) => new Request("https://socallights.app" + url, { method: "POST", headers: { "content-type": "application/json", origin: "https://socallights.app", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
const addSub = (raw, id, email, o = {}) => raw.prepare("INSERT INTO event_submissions (id,name,county,city,season,type,start_date,end_date,contact_email,status,event_id,lat,lng) VALUES (?,?,?,?,?,?,?,?,?,?,?,34,-118)")
  .run(id, o.name || "Submitted Show", "Los Angeles", "Pasadena", "christmas", "walk", o.start || ptToday(), o.end || ptToday(40), email, o.status || "pending", o.event_id || null);
const mailed = (f) => f.calls.filter((c) => /api\.resend\.com/.test(c.url)).map((c) => JSON.parse(c.init.body));

test("featurable: tells an event that starts too far ahead the day featuring opens", async () => {
  const { env, raw } = newEnv(); const me = await addUser(raw, "u1", "me@example.com");
  addEvent(raw, "soon", { start_date: ptToday(10), end_date: ptToday(20) }); addEvent(raw, "later", { start_date: ptToday(50), end_date: ptToday(60) });
  addSub(raw, "s1", "me@example.com", { status: "published", event_id: "soon" }); addSub(raw, "s2", "me@example.com", { status: "published", event_id: "later" });
  const r = await (await featurable({ request: get("/api/me/featurable", me.cookie), env })).json();
  const by = Object.fromEntries(r.events.map((e) => [e.id, e]));
  assert.equal(by.soon.opens, null); assert.equal(by.later.opens, ptToday(20));
});

test("eligibility (the page's rules): later, ended, pending claim, short event for Full run", () => {
  const PL = PUBLIC_PLANS, t = ptToday();
  const later = eventEligibility({ state: "live", start: ptToday(50), end: ptToday(60) }, PL, 30, t);
  assert.equal(later.ok, false); assert.match(later.reason, /opens 30 days before/);
  assert.equal(eventEligibility({ state: "ended", start: ptToday(-9), end: ptToday(-1) }, PL, 30, t).ok, false);
  assert.match(eventEligibility({ state: "claim-pending" }, PL, 30, t).reason, /claim is waiting/);
  const short = eventEligibility({ state: "live", start: ptToday(1), end: ptToday(10) }, PL, 30, t);
  assert.deepEqual(short.plans, ["pin", "top"]);
  const w = planWindow("pin", { end: ptToday(60) }, PL, t); assert.equal(w.capped, true); assert.equal(w.until, ptToday(30));
  assert.equal(planWindow("pin", { end: ptToday(5) }, PL, t).until, ptToday(5));
});

test("checkout: success and cancel come back to the same page with the plan and event; 'payment page opened' is counted once Stripe answered", async () => {
  const { env, raw } = newEnv(); addEvent(raw); const me = await addUser(raw, "u1", "me@example.com"); addSub(raw, "s1", "me@example.com", { status: "published", event_id: "ev1" });
  const f = stubFetch();
  try {
    const bad = await checkout({ request: post("/api/feature/checkout", { event_id: "ev1", plan: "nope" }, me.cookie), env });
    assert.equal(bad.status, 400); assert.equal(n(raw, "fn:event-feature-checkout"), 0, "a refused request is not counted");
    const r = await checkout({ request: post("/api/feature/checkout", { event_id: "ev1", plan: "top" }, me.cookie), env });
    assert.equal(r.status, 200); assert.equal(n(raw, "fn:event-feature-checkout"), 1);
    const sent = new URLSearchParams(String(f.calls[0].init.body));
    assert.equal(sent.get("success_url"), "https://socallights.app/feature?paid=1&plan=top&event=ev1");
    assert.equal(sent.get("cancel_url"), "https://socallights.app/feature?cancelled=1&plan=top&event=ev1");
    // a pending submission goes by its submission id both ways
    addSub(raw, "s2", "me@example.com");
    await checkout({ request: post("/api/feature/checkout", { submission_id: "s2", plan: "pin" }, me.cookie), env });
    const p = new URLSearchParams(String(f.calls[1].init.body));
    assert.equal(p.get("success_url"), "https://socallights.app/feature?paid=1&plan=pin&sub=s2");
    assert.equal(p.get("cancel_url"), "https://socallights.app/feature?cancelled=1&plan=pin&sub=s2");
  } finally { f.restore(); }
});

test("checkout: Stripe failing is not counted", async () => {
  const { env, raw } = newEnv(); addEvent(raw); const me = await addUser(raw, "u1", "me@example.com"); addSub(raw, "s1", "me@example.com", { status: "published", event_id: "ev1" });
  const f = stubFetch(() => new Response("{}", { status: 500 }));
  try { assert.equal((await checkout({ request: post("/api/feature/checkout", { event_id: "ev1", plan: "pin" }, me.cookie), env })).status, 502); assert.equal(n(raw, "fn:event-feature-checkout"), 0); } finally { f.restore(); }
});

test("webhook: a paid, live event is counted once, featured, and the buyer gets the confirmation email (not on a replay)", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" }); addEvent(raw, "ev1", { name: "Candy Cane Lane" });
  const f = stubFetch(() => new Response("{}", { status: 200 }));
  try {
    const evt = stripeEvent("checkout.session.completed", session());
    assert.equal((await sendWebhook(webhook, env, evt)).status, 200);
    assert.equal((await sendWebhook(webhook, env, evt)).status, 200, "replay");
    assert.equal((await sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session()))).status, 200, "same session under a new event id");
    assert.equal(n(raw, "fn:event-feature-paid"), 1);
    assert.equal(getEvent(raw).featured, 2);
    const m = mailed(f); assert.equal(m.length, 1); assert.deepEqual(m[0].to, ["buyer@example.com"]);
    assert.match(m[0].subject, /Candy Cane Lane/); assert.match(m[0].text, /Top of the list/); assert.match(m[0].text, /\$15\.00/);
    assert.doesNotMatch(m[0].text, /checking your event first/);
  } finally { f.restore(); }
});

test("webhook: paid while the event waits for review sends the 'we are checking it first' email; approval then switches it on and says so", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" });
  addSub(raw, "s1", "owner@example.com", { name: "Lantern Walk" });
  const f = stubFetch(() => new Response("{}", { status: 200 }));
  try {
    assert.equal((await sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ metadata: { event_id: "sub:s1", plan: "pin", user_id: "u1" }, amount_total: 1000 })))).status, 200);
    assert.equal(n(raw, "fn:event-feature-paid"), 1);
    let m = mailed(f); assert.equal(m.length, 1); assert.match(m[0].text, /checking your event first/); assert.match(m[0].text, /full refund/);
    const r = await decide({ request: post("/api/admin/submissions/s1", { action: "approve", notify: false }), env, params: { id: "s1" } });
    assert.equal(r.status, 200);
    m = mailed(f); assert.equal(m.length, 2, "a second email once it is on"); assert.doesNotMatch(m[1].text, /checking your event first/); assert.match(m[1].text, /Featured pin/);
    assert.equal(n(raw, "fn:event-feature-paid"), 1, "still one paid");
  } finally { f.restore(); }
});

test("webhook: a mail failure never blocks the placement", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" }); addEvent(raw);
  const f = stubFetch(() => { throw new Error("mail down"); });
  try { assert.equal((await sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session()))).status, 200); assert.equal(getEvent(raw).featured, 2); } finally { f.restore(); }
});

test("funnel keys: the browser can count 'Choose' and 'event picked', and nothing can fake 'checkout' or 'paid'", async () => {
  const { env, raw } = newEnv();
  for (const k of ["fn:event-feature-choose", "fn:event-feature-pick", "fn:event-feature-checkout", "fn:event-feature-paid"]) await visit({ request: post("/api/visit", { k }), env });
  assert.equal(n(raw, "fn:event-feature-choose"), 1); assert.equal(n(raw, "fn:event-feature-pick"), 1);
  assert.equal(n(raw, "fn:event-feature-checkout"), 0); assert.equal(n(raw, "fn:event-feature-paid"), 0);
  const keys = STEPS.map(([k]) => k); for (const k of ["fn:event-feature-choose", "fn:event-feature-pick", "fn:event-feature-checkout", "fn:event-feature-paid"]) assert.ok(keys.includes(k), k + " is listed in the admin");
});
