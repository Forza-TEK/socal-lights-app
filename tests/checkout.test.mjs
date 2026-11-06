// Payments: the checkout endpoint's ownership gate, and the claim endpoint's auto-approval rules. fetch is stubbed: nothing reaches Stripe.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as checkout } from "../functions/api/feature/checkout.js";
import { onRequestPost as claim } from "../functions/api/me/claims.js";
import { newEnv, addEvent, addUser, stubFetch, ptToday } from "./_pay.mjs";

const post = (url, body, { cookie, ua, origin } = {}) => new Request("https://socallights.app" + url, { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...(ua ? { "user-agent": ua } : {}), ...(origin ? { origin } : {}) }, body: JSON.stringify(body) });
async function call(handler, env, req) { const r = await handler({ request: req, env }); return { status: r.status, body: await r.json().catch(() => ({})) }; }
const buy = (env, body, opts) => call(checkout, env, post("/api/feature/checkout", body, opts));
const addSubmission = (raw, id, email, o = {}) => raw.prepare("INSERT INTO event_submissions (id,name,city,season,type,start_date,end_date,contact_email,status,event_id) VALUES (?,?,?,?,?,?,?,?,?,?)")
  .run(id, "Submitted Show", "Pasadena", "christmas", "walk", ptToday(), o.end || ptToday(40), email, o.status || "pending", o.event_id || null);

test("checkout: signed out is 401 and Stripe is never called", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  const f = stubFetch();
  try { const r = await buy(env, { event_id: "ev1", plan: "pin" }); assert.equal(r.status, 401); assert.equal(f.calls.length, 0); } finally { f.restore(); }
});

test("checkout: an event the user does not own is 403", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  const me = await addUser(raw, "u1", "me@example.com");
  addSubmission(raw, "s9", "someone-else@example.com", { status: "published", event_id: "ev1" });
  const f = stubFetch();
  try { const r = await buy(env, { event_id: "ev1", plan: "pin" }, { cookie: me.cookie }); assert.equal(r.status, 403); assert.equal(f.calls.length, 0); } finally { f.restore(); }
});

test("checkout: the submitter, an approved claimant and a contest organizer pass; a pending or declined claim does not", async () => {
  const { env, raw } = newEnv(); addEvent(raw); addEvent(raw, "ev2"); addEvent(raw, "ev3");
  const sub = await addUser(raw, "u1", "Owner+tag@example.com");
  addSubmission(raw, "s1", "owner@example.com", { status: "published", event_id: "ev1" }); // normalized match: case and +tag
  const f = stubFetch();
  try {
    let r = await buy(env, { event_id: "ev1", plan: "top" }, { cookie: sub.cookie });
    assert.equal(r.status, 200); assert.match(r.body.url, /^https:\/\/checkout\.stripe\.com\//);
    assert.equal(f.calls.length, 1);
    const sent = new URLSearchParams(String(f.calls[0].init.body));
    assert.equal(sent.get("line_items[0][price_data][unit_amount]"), "1500", "the price comes from the server plan, never the browser");
    assert.equal(sent.get("metadata[user_id]"), "u1"); assert.equal(sent.get("metadata[event_id]"), "ev1"); assert.equal(sent.get("metadata[plan]"), "top");
    assert.match(f.calls[0].init.headers["idempotency-key"], /^feature-[0-9a-f]{64}$/);
    // claims
    const other = await addUser(raw, "u2", "claimant@example.com");
    raw.prepare("INSERT INTO event_claims (id,event_id,user_id,email,status) VALUES ('c1','ev2','u2','claimant@example.com','pending')").run();
    assert.equal((await buy(env, { event_id: "ev2", plan: "pin" }, { cookie: other.cookie })).status, 403, "pending claim");
    raw.prepare("UPDATE event_claims SET status='declined'").run();
    assert.equal((await buy(env, { event_id: "ev2", plan: "pin" }, { cookie: other.cookie })).status, 403, "declined claim");
    raw.prepare("UPDATE event_claims SET status='approved'").run();
    // an approved claim on a listing whose dates are only "expected" (projected) is held: the claimant cannot correct them (audit M8)
    const held = await buy(env, { event_id: "ev2", plan: "pin" }, { cookie: other.cookie });
    assert.equal(held.status, 400); assert.match(held.body.error, /projected, not confirmed/);
    raw.prepare("UPDATE events SET status='confirmed' WHERE id='ev2'").run();
    assert.equal((await buy(env, { event_id: "ev2", plan: "pin" }, { cookie: other.cookie })).status, 200, "approved claim");
    // someone else's approved claim does not help
    assert.equal((await buy(env, { event_id: "ev1", plan: "pin" }, { cookie: other.cookie })).status, 403);
    // contest organizer
    raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,entries_close,vote_start,vote_end,contact_email,status,event_id,note) VALUES ('k1','k1','u2','K','Org','Pasadena','2026-12-01','2026-12-02','2026-12-20','claimant@example.com','live','ev3','')").run();
    assert.equal((await buy(env, { event_id: "ev3", plan: "pin" }, { cookie: other.cookie })).status, 200, "contest owner");
    raw.prepare("UPDATE contests SET note='needs review'").run();
    assert.equal((await buy(env, { event_id: "ev3", plan: "pin" }, { cookie: other.cookie })).status, 403, "contest under admin review cannot buy");
  } finally { f.restore(); }
});

test("checkout: a pending submission can be paid for only by its submitter", async () => {
  const { env, raw } = newEnv();
  const mine = await addUser(raw, "u1", "mine@example.com"), theirs = await addUser(raw, "u2", "theirs@example.com");
  addSubmission(raw, "s1", "mine@example.com");
  const f = stubFetch();
  try {
    const no = await buy(env, { submission_id: "s1", plan: "pin" }, { cookie: theirs.cookie });
    assert.equal(no.status, 404, "looks exactly like a missing submission, so ids cannot be probed");
    assert.equal(f.calls.length, 0);
    const ok = await buy(env, { submission_id: "s1", plan: "pin" }, { cookie: mine.cookie });
    assert.equal(ok.status, 200);
    const sent = new URLSearchParams(String(f.calls[0].init.body));
    assert.equal(sent.get("metadata[event_id]"), "sub:s1");
    raw.prepare("UPDATE event_submissions SET status='declined'").run();
    assert.equal((await buy(env, { submission_id: "s1", plan: "pin" }, { cookie: mine.cookie })).status, 404, "declined submissions cannot be paid for");
  } finally { f.restore(); }
});

test("checkout: the native app, a bad origin, a missing key, an unknown plan and an ended event are all refused before Stripe", async () => {
  const { env, raw } = newEnv(); addEvent(raw); addEvent(raw, "old", { end_date: ptToday(-1) });
  const me = await addUser(raw, "u1", "me@example.com");
  addSubmission(raw, "s1", "me@example.com", { status: "published", event_id: "ev1" });
  const f = stubFetch();
  try {
    const body = { event_id: "ev1", plan: "pin" };
    assert.equal((await buy(env, body, { cookie: me.cookie, ua: "Mozilla/5.0 SoCalLightsApp/1.2" })).status, 403, "native app");
    assert.equal((await buy(env, body, { cookie: me.cookie, origin: "https://evil.example" })).status, 403, "cross-site");
    assert.equal((await buy({ ...env, STRIPE_SECRET_KEY: "" }, body, { cookie: me.cookie })).status, 501);
    assert.equal((await buy(env, { event_id: "ev1", plan: "free" }, { cookie: me.cookie })).status, 400);
    assert.equal((await buy(env, { event_id: "nope", plan: "pin" }, { cookie: me.cookie })).status, 404);
    addSubmission(raw, "s2", "me@example.com", { status: "published", event_id: "old" });
    assert.equal((await buy(env, { event_id: "old", plan: "pin" }, { cookie: me.cookie })).status, 400, "ended");
    assert.equal(f.calls.length, 0);
    const failing = stubFetch(() => new Response("{}", { status: 500 }));
    try { assert.equal((await buy(env, body, { cookie: me.cookie })).status, 502, "Stripe down gives a friendly 502"); } finally { failing.restore(); }
  } finally { f.restore(); }
});

// ---------------------------------------------------------------- claims
const claimIt = (env, user, event_id) => call(claim, env, post("/api/me/claims", { event_id }, { cookie: user.cookie }));

test("claims: a business domain that matches the event website is approved at once", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { url: "https://www.lightshow.example.org/tickets" });
  const u = await addUser(raw, "u1", "boss@lightshow.example.org");
  const r = await claimIt(env, u, "ev1");
  assert.equal(r.status, 200); assert.equal(r.body.status, "approved");
  const c = raw.prepare("SELECT method, status FROM event_claims").get();
  assert.equal(c.method, "domain"); assert.equal(c.status, "approved");
  assert.equal((await claimIt(env, u, "ev1")).body.status, "approved", "idempotent");
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_claims").get().n, 1);
});

test("claims: free-mail, an aggregator site and a non-matching domain wait for the admin", async () => {
  const { env, raw } = newEnv();
  addEvent(raw, "a", { url: "https://gmail.com/x" }); addEvent(raw, "b", { url: "https://www.eventbrite.com/e/123" }); addEvent(raw, "c", { url: "https://other.example.net" }); addEvent(raw, "d", { url: null });
  const free = await addUser(raw, "u1", "boss@gmail.com"), biz = await addUser(raw, "u2", "boss@lightshow.example.org");
  assert.equal((await claimIt(env, free, "a")).body.status, "pending", "free-mail");
  assert.equal((await claimIt(env, biz, "b")).body.status, "pending", "aggregator");
  assert.equal((await claimIt(env, biz, "c")).body.status, "pending", "different domain");
  assert.equal((await claimIt(env, biz, "d")).body.status, "pending", "no event website");
});

test("claims: limits (5 waiting, 10 a day), ended and unknown events, and declined claims", async () => {
  const { env, raw } = newEnv();
  const u = await addUser(raw, "u1", "boss@lightshow.example.org");
  for (let i = 0; i < 6; i++) addEvent(raw, "e" + i, { url: "https://nomatch" + i + ".example.net" });
  for (let i = 0; i < 5; i++) assert.equal((await claimIt(env, u, "e" + i)).status, 200);
  const sixth = await claimIt(env, u, "e5");
  assert.equal(sixth.status, 429); assert.match(sixth.body.error, /5 claims waiting/);
  raw.prepare("UPDATE event_claims SET status='declined'").run();
  assert.equal((await claimIt(env, u, "e0")).status, 403, "declined stays declined");
  raw.prepare("DELETE FROM event_claims").run();
  for (let i = 0; i < 10; i++) raw.prepare("INSERT INTO event_claims (id,event_id,user_id,status) VALUES (?,?,?, 'approved')").run("x" + i, "other" + i, "u1");
  assert.equal((await claimIt(env, u, "e5")).status, 429, "10 in a day");
  addEvent(raw, "gone", { end_date: ptToday(-1) });
  assert.equal((await claimIt(env, u, "gone")).status, 404); assert.equal((await claimIt(env, u, "missing")).status, 404);
  assert.equal((await call(claim, env, post("/api/me/claims", { event_id: "e1" }))).status, 401);
});

// ---------------------------------------------------------------- P10 checkout cap
test("checkout cap: 6 payment pages an hour and 20 a day per account, counted only when Stripe is reached, old rows pruned", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  const me = await addUser(raw, "u1", "me@example.com"), other = await addUser(raw, "u2", "other@example.com");
  addSubmission(raw, "s1", "me@example.com", { status: "published", event_id: "ev1" });
  const f = stubFetch();
  try {
    // refused requests are not counted
    await buy(env, { event_id: "ev1", plan: "free" }, { cookie: me.cookie }); await buy(env, { event_id: "ev1", plan: "pin" }, { cookie: other.cookie });
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM checkout_log").get().n, 0);
    for (let i = 0; i < 6; i++) assert.equal((await buy(env, { event_id: "ev1", plan: "pin" }, { cookie: me.cookie })).status, 200);
    assert.equal(f.calls.length, 6);
    const hourly = await buy(env, { event_id: "ev1", plan: "pin" }, { cookie: me.cookie });
    assert.equal(hourly.status, 429); assert.match(hourly.body.error, /last hour/); assert.equal(f.calls.length, 6, "Stripe is not called");
    // an hour later the hourly cap lifts, the daily one remains
    raw.prepare("UPDATE checkout_log SET created_at = datetime('now','-2 hours')").run();
    assert.equal((await buy(env, { event_id: "ev1", plan: "pin" }, { cookie: me.cookie })).status, 200);
    for (let i = 0; i < 13; i++) raw.prepare("INSERT INTO checkout_log (user_id, created_at) VALUES ('u1', datetime('now','-5 hours'))").run();
    const daily = await buy(env, { event_id: "ev1", plan: "pin" }, { cookie: me.cookie });
    assert.equal(daily.status, 429); assert.match(daily.body.error, /today/);
    // another account is not affected; day-old rows stop counting and rows over 3 days old are pruned on the next insert
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM checkout_log WHERE user_id = 'u2'").get().n, 0);
    raw.prepare("UPDATE checkout_log SET created_at = datetime('now','-4 days')").run();
    assert.equal((await buy(env, { event_id: "ev1", plan: "pin" }, { cookie: me.cookie })).status, 200);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM checkout_log").get().n, 1, "old rows pruned");
    // a failing log never blocks a buyer
    raw.exec("DROP TABLE checkout_log");
    assert.equal((await buy(env, { event_id: "ev1", plan: "pin" }, { cookie: me.cookie })).status, 200);
  } finally { f.restore(); }
});

// ---------------------------------------------------------------- Full run needs time left
test("checkout: Full run is refused (400) for an event with fewer than 7 days left; the 30-day plans and longer-running events are fine", async () => {
  const { env, raw } = newEnv();
  const long = { start_date: ptToday(-40) }; // 31+ days long, so only the days left decide
  addEvent(raw, "soon", { ...long, end_date: ptToday(3) }); addEvent(raw, "edge", { ...long, end_date: ptToday(7) }); addEvent(raw, "today", { ...long, end_date: ptToday(0) }); addEvent(raw, "long", { end_date: ptToday(60) });
  const me = await addUser(raw, "u1", "me@example.com");
  for (const id of ["soon", "edge", "today", "long"]) addSubmission(raw, "s-" + id, "me@example.com", { status: "published", event_id: id });
  const f = stubFetch();
  try {
    const soon = await buy(env, { event_id: "soon", plan: "season" }, { cookie: me.cookie });
    assert.equal(soon.status, 400); assert.match(soon.body.error, /too soon for the Full run plan/); assert.match(soon.body.error, new RegExp(ptToday(3)));
    assert.equal((await buy(env, { event_id: "today", plan: "season" }, { cookie: me.cookie })).status, 400);
    assert.equal(f.calls.length, 0);
    assert.equal((await buy(env, { event_id: "soon", plan: "top" }, { cookie: me.cookie })).status, 200, "a 30-day plan is still allowed");
    assert.equal((await buy(env, { event_id: "edge", plan: "season" }, { cookie: me.cookie })).status, 200, "exactly 7 days left is allowed");
    assert.equal((await buy(env, { event_id: "long", plan: "season" }, { cookie: me.cookie })).status, 200);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM checkout_log").get().n, 3, "refused requests were not counted");
  } finally { f.restore(); }
});

test("checkout: a cancelled or postponed event is refused with a clear 400 (Terms), for a direct event id and for a published submission; Stripe is never called", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { notice: "cancelled" }); addEvent(raw, "ev2", { notice: "postponed" }); addEvent(raw, "ev3");
  const me = await addUser(raw, "u1", "me@example.com");
  addSubmission(raw, "s1", "me@example.com", { status: "published", event_id: "ev1" });
  addSubmission(raw, "s2", "me@example.com", { status: "published", event_id: "ev2" });
  addSubmission(raw, "s3", "me@example.com", { status: "published", event_id: "ev3" });
  const f = stubFetch();
  try {
    let r = await buy(env, { event_id: "ev1", plan: "pin" }, { cookie: me.cookie });
    assert.equal(r.status, 400); assert.match(r.body.error, /cancelled/);
    r = await buy(env, { event_id: "ev2", plan: "pin" }, { cookie: me.cookie });
    assert.equal(r.status, 400); assert.match(r.body.error, /postponed/);
    r = await buy(env, { submission_id: "s1", plan: "pin" }, { cookie: me.cookie });
    assert.equal(r.status, 400); assert.match(r.body.error, /cancelled/);
    assert.equal(f.calls.length, 0);
    // the organizer's own 'expected' event with the dates they entered is not held
    assert.equal((await buy(env, { event_id: "ev3", plan: "pin" }, { cookie: me.cookie })).status, 200);
  } finally { f.restore(); }
});
