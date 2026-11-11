// Optional automatic renewal of installer Sponsor placements: opt-in and consent, reminder, charge on the last day, failure / retry / lapse, cancel, refund and dispute,
// one season ahead, replays, account deletion, no card data. In-memory D1; fetch is stubbed (no Stripe, no mail service); nothing real is charged.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as checkout } from "../functions/api/sponsor/checkout.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { onRequestPost as cron } from "../functions/api/sponsor/renewals.js";
import { onRequestGet as cancelInfo, onRequestPost as cancelDo } from "../functions/api/sponsor/renewal.js";
import { onRequestGet as manageGet, onRequestPost as managePost } from "../functions/api/installers/[slug]/manage.js";
import { onRequestGet as adminRenewals } from "../functions/api/admin/renewals.js";
import { onRequestGet as ordersGet } from "../functions/api/admin/orders.js";
import { onRequestGet as config } from "../functions/api/config.js";
import { deleteAccount } from "../functions/_lib/account.js";
import { INSTALLER_PLANS } from "../functions/_lib/featured.js";
import { CONSENT_VERSION, CONSENT_TEXTS } from "../functions/_lib/renewal.js";
import { dayKey } from "../functions/_lib/funnel.js";
import { newEnv, addUser, stripeEvent, sendWebhook, session, getOrder, freezeNow } from "./_pay.mjs";

const KEY = "k".repeat(24);
const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})) }; };
const rq = (url, body, cookie) => new Request("https://socallights.app" + url, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const hits = (raw, k) => (raw.prepare("SELECT COALESCE(SUM(n),0) AS n FROM site_hits WHERE page = ?").get(k) || {}).n || 0; // any day: the tests move the clock
const getInst = (raw) => ({ ...raw.prepare("SELECT * FROM installers WHERE id = 'i1'").get() });
const getRen = (raw) => { const r = raw.prepare("SELECT * FROM installer_autorenew WHERE installer_id = 'i1'").get(); return r ? { ...r } : null; };
const at = (d) => freezeNow(d + "T20:00:00Z"); // 12 or 1 in the afternoon Pacific on that date

// A fake Stripe + mail service. opts.charge decides what an off-session PaymentIntent answers.
function fakeNet(opts = {}) {
  const real = globalThis.fetch, calls = [], mails = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url), body = init.body ? (init.body instanceof URLSearchParams ? Object.fromEntries(init.body) : JSON.parse(init.body)) : {};
    calls.push({ url: u, method: init.method || "GET", body, headers: init.headers || {} });
    const ok = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
    if (u.startsWith("https://api.resend.com")) { if (opts.onMail) opts.onMail(body); if (opts.mailFail) return ok({ error: "down" }, 500); mails.push(body); return ok({ id: "m" }); }
    if (u.endsWith("/v1/checkout/sessions")) return ok({ url: "https://checkout.stripe.com/c/pay/cs_fake" });
    if (/\/v1\/payment_intents\/pi_/.test(u)) return ok({ id: "pi_x", payment_method: opts.pm || "pm_saved" });
    if (/\/v1\/setup_intents\//.test(u)) return ok({ payment_method: "pm_setup" });
    if (u.endsWith("/detach")) return ok({});
    if (u.endsWith("/v1/payment_intents")) {
      const mode = typeof opts.charge === "function" ? opts.charge(body, calls) : opts.charge || "ok", id = "pi_auto_" + String(body.metadata_renewal_from || body["metadata[renewal_from]"]).replace(/-/g, "") + "_" + calls.filter((c) => c.url.endsWith("/v1/payment_intents")).length;
      if (mode === "down") return ok({ error: { message: "temporarily unavailable" } }, 503);
      if (mode === "ok") return ok({ id, status: "succeeded", amount: Number(body.amount), amount_received: Number(body.amount), currency: "usd", receipt_email: body.receipt_email, metadata: { "event_id": body["metadata[event_id]"], renewal: "1", plan: body["metadata[plan]"] } });
      if (mode === "action") return ok({ id, status: "requires_action", amount: Number(body.amount), currency: "usd" });
      return ok({ error: { code: "card_declined", decline_code: "insufficient_funds", message: "Your card was declined." }, id }, 402);
    }
    return ok({});
  };
  return { calls, mails, piCalls: () => calls.filter((c) => c.url.endsWith("/v1/payment_intents")), restore: () => { globalThis.fetch = real; } };
}
async function setup(extra = {}) {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_fake", ADMIN_NOTIFY_EMAIL: "team@example.com", ALERT_CRON_KEY: KEY, ...extra });
  raw.prepare("INSERT INTO installers (id,slug,name,web,phone,area,owner_email) VALUES ('i1','bright-nights','Bright Nights','https://bright.example','626-555-0100','Orange County','owner@example.com')").run();
  const me = await addUser(raw, "u1", "owner@example.com");
  return { env, raw, me };
}
const run = (env) => J(cron({ request: new Request("https://x.test/api/sponsor/renewals", { method: "POST", headers: { "x-alert-key": KEY } }), env }));
// a paid Checkout session whose buyer ticked "renew automatically"; the webhook applies the placement and turns renewal on
const paidRenew = (env, n = 1, o = {}) => sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ id: "cs_" + n, payment_intent: "pi_" + n, customer: "cus_1", amount_total: 5000, metadata: { event_id: "i1", target: "installer", plan: "banner", user_id: "u1", renew: "1", consent: CONSENT_VERSION, ...(o.meta || {}) } })));
const mailTo = (net, to, re) => net.mails.filter((m) => m.to[0] === to && re.test(m.subject));
async function enrolled() { const s = await setup(); const net = fakeNet(); const un = at("2026-11-06"); await paidRenew(s.env); un(); return { ...s, net }; }

test("default is OFF: a normal checkout asks Stripe to save nothing, and no renewal row exists", async () => {
  const { env, raw, me } = await setup(); const net = fakeNet();
  try {
    const un = at("2026-11-06");
    const r = await J(checkout({ request: rq("/api/sponsor/checkout", { installer: "bright-nights", plan: "banner" }, me.cookie), env }));
    un();
    assert.equal(r.status, 200);
    const sent = net.calls.find((c) => c.url.endsWith("/checkout/sessions")).body;
    assert.ok(!("customer_creation" in sent) && !("payment_intent_data[setup_future_usage]" in sent) && !("metadata[renew]" in sent));
    await sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ id: "cs_9", payment_intent: "pi_9", customer: "cus_9", amount_total: 5000, metadata: { event_id: "i1", target: "installer", plan: "banner", user_id: "u1" } })));
    assert.equal(getRen(raw), null, "paying without the box creates no renewal");
    const cfg = await (await config({ env })).json();
    assert.deepEqual([cfg.installerRenewal.version, cfg.installerRenewal.text], [CONSENT_VERSION, CONSENT_TEXTS[CONSENT_VERSION]]);
  } finally { net.restore(); }
});

test("ticking the box: Checkout is asked to save the card off-session; the webhook then stores consent and turns renewal on (ids only)", async () => {
  const { env, raw, me } = await setup(); const net = fakeNet();
  try {
    const un = at("2026-11-06");
    await J(checkout({ request: rq("/api/sponsor/checkout", { installer: "bright-nights", plan: "banner", renew: true }, me.cookie), env }));
    const sent = net.calls.find((c) => c.url.endsWith("/checkout/sessions")).body;
    assert.deepEqual([sent.customer_creation, sent["payment_intent_data[setup_future_usage]"], sent["metadata[renew]"], sent["metadata[consent]"]], ["always", "off_session", "1", CONSENT_VERSION]);
    const r = await paidRenew(env); un(); assert.equal(r.status, 200);
    const row = getRen(raw);
    assert.deepEqual([row.enabled, row.status, row.plan, row.consent_text_version, row.stripe_customer_id, row.stripe_payment_method_id, row.next_charge_date, row.last_paid_cents, row.user_id], [1, "active", "banner", CONSENT_VERSION, "cus_1", "pm_saved", "2027-01-06", 5000, "u1"]);
    assert.ok(row.consent_at && /^[a-f0-9]{36}$/.test(row.cancel_token));
    assert.equal(hits(raw, "fn:autorenew-opt-in"), 1);
    const ack = mailTo(net, "owner@example.com", /Automatic renewal is on/)[0]; assert.ok(ack, "acknowledgment email");
    assert.ok(ack.text.includes("We email you 7 days before each charge") && ack.text.includes("(currently $50)"), "it repeats the wording they agreed to");
    assert.match(ack.text, /cancel-renewal\?t=[a-f0-9]{36}/); assert.match(ack.text, /Jan 6, 2027/);
    // replays: the same event, and the same payment under a new event id, change nothing and send nothing more
    await paidRenew(env); await paidRenew(env);
    assert.equal(mailTo(net, "owner@example.com", /Automatic renewal is on/).length, 1); assert.equal(hits(raw, "fn:autorenew-opt-in"), 1);
    assert.equal(raw.prepare("SELECT COUNT(*) AS c FROM installer_autorenew").get().c, 1);
  } finally { net.restore(); }
});

test("no card data is ever stored: only Stripe ids, and the table has no card columns", async () => {
  const { raw, net } = await enrolled(); net.restore();
  const cols = raw.prepare("PRAGMA table_info(installer_autorenew)").all().map((c) => c.name);
  assert.ok(!cols.some((c) => /card|number|pan|cvc|exp/i.test(c)), cols.join(","));
  const row = getRen(raw); for (const v of Object.values(row)) assert.ok(!/\b\d{13,19}\b/.test(String(v)), "no card-number-like value");
  assert.match(row.stripe_customer_id, /^cus_/); assert.match(row.stripe_payment_method_id, /^pm_/);
});

test("the reminder goes out once, 7 days before the charge, with amount, date and cancel link; a price change is noted", async () => {
  const { env, raw, net } = await enrolled();
  try {
    let un = at("2026-12-29"); await run(env); un(); assert.equal(mailTo(net, "owner@example.com", /renews on/).length, 0, "8 days before: too early");
    un = at("2026-12-30"); const r1 = await run(env); un();
    const m = mailTo(net, "owner@example.com", /renews on Jan 6, 2027 \(\$50\.00\)/); assert.equal(m.length, 1); assert.equal(r1.body.reminded, 1);
    assert.match(m[0].text, /\$50\.00/); assert.match(m[0].text, /Jan 7, 2027 to Jan 31, 2027/); assert.match(m[0].text, /cancel-renewal\?t=[a-f0-9]{36}/); assert.ok(!/price changed/.test(m[0].text));
    un = at("2026-12-31"); await run(env); un(); assert.equal(mailTo(net, "owner@example.com", /renews on/).length, 1, "once per renewal");
    // a new price: noted in the reminder, and the charge is at the CURRENT price
    raw.prepare("UPDATE installer_autorenew SET notice_sent_for = NULL").run();
    const was = INSTALLER_PLANS.banner.cents; INSTALLER_PLANS.banner.cents = 5500;
    try { un = at("2027-01-02"); await run(env); un(); } finally { INSTALLER_PLANS.banner.cents = was; }
    const m2 = mailTo(net, "owner@example.com", /renews on/); assert.equal(m2.length, 2); assert.match(m2[1].text, /The price changed: you last paid \$50\.00 and this renewal is \$55\.00/);
    assert.equal(net.piCalls().length, 0, "no charge before the charge date");
  } finally { net.restore(); }
});

test("on the last day: exactly one off-session PaymentIntent (idempotency key per installer and season) at the current price; the next season is applied through the same order machinery", async () => {
  const { env, raw, net } = await enrolled();
  try {
    const was = INSTALLER_PLANS.banner.cents; INSTALLER_PLANS.banner.cents = 5500; // the price changed since they last paid
    let r; const un = at("2027-01-06");
    try { r = await run(env); } finally { INSTALLER_PLANS.banner.cents = was; }
    assert.equal(r.body.charged, 1); assert.equal(net.piCalls().length, 1);
    const c = net.piCalls()[0];
    assert.deepEqual([c.body.amount, c.body.currency, c.body.customer, c.body.payment_method, c.body.off_session, c.body.confirm, c.body["metadata[target]"], c.body["metadata[plan]"], c.body["metadata[event_id]"], c.body["metadata[renewal]"]], ["5500", "usd", "cus_1", "pm_saved", "true", "true", "installer", "banner", "i1", "1"]);
    assert.match(c.headers["idempotency-key"], /^renew-[0-9a-f]{64}$/); assert.equal(c.body["metadata[renewal_from]"], "2027-01-07");
    const o = raw.prepare("SELECT * FROM feature_orders WHERE renewal = 1").get();
    assert.deepEqual([o.target, o.plan, o.event_id, o.amount, o.status, o.applied, o.applied_from, o.applied_until, o.renewal, o.note], ["installer", "banner", "i1", 5500, "paid", 1, "2027-01-07", "2027-01-31", 1, null], "the placement starts the day after and ends on the next season's last day; amount matches the server calculation");
    assert.ok(o.session_id.startsWith("pi_auto_"), "keyed by the PaymentIntent");
    assert.equal(getInst(raw).banner_until, "2027-01-31");
    const row = getRen(raw); assert.deepEqual([row.next_charge_date, row.attempts, row.last_paid_cents, row.notice_sent_for], ["2027-01-31", 0, 5500, null]);
    assert.equal(hits(raw, "fn:autorenew-charged"), 1);
    assert.equal(mailTo(net, "owner@example.com", /was renewed/).length, 1, "receipt email for the automatic charge");
    // the job again the same day: no second charge. Stripe's own webhook for the same PaymentIntent: recorded once.
    await run(env); assert.equal(net.piCalls().length, 1);
    const pi = o.session_id;
    const w = await sendWebhook(webhook, env, stripeEvent("payment_intent.succeeded", { id: pi, amount: 5500, amount_received: 5500, currency: "usd", receipt_email: "owner@example.com", metadata: { renewal: "1", event_id: "i1", target: "installer", plan: "banner", user_id: "u1" } }));
    assert.equal(w.body.duplicate, true); assert.equal(getInst(raw).banner_until, "2027-01-31"); assert.equal(raw.prepare("SELECT COUNT(*) AS c FROM feature_orders WHERE renewal = 1").get().c, 1);
    assert.equal(mailTo(net, "owner@example.com", /was renewed/).length, 1);
    // an ordinary Checkout PaymentIntent event is ignored
    assert.equal((await sendWebhook(webhook, env, stripeEvent("payment_intent.succeeded", { id: "pi_plain", amount: 5000, currency: "usd", metadata: {} }))).body.ignored, "not a renewal charge");
    // Admin > Orders marks it, the Renewals view lists it
    const rows = (await J(ordersGet({ env }))).body, ord = rows.find((x) => x.renewal === 1); assert.ok(ord); assert.equal(ord.name, "Bright Nights");
    const ar = (await J(adminRenewals({ env }))).body; assert.deepEqual([ar.counts.upcoming, ar.rows[0].name, ar.rows[0].next_charge_date], [1, "Bright Nights", "2027-01-31"]);
    assert.ok(!JSON.stringify(ar).includes("pm_saved") && !JSON.stringify(ar).includes("cus_1"), "no Stripe ids in the admin view");
    un();
  } finally { net.restore(); }
});

test("a failed charge: failure email with a link, ONE retry 3 days later, then it lapses and no more automatic charges", async () => {
  const { env, raw, net } = await enrolled(); net.restore();
  const n2 = fakeNet({ charge: "decline" });
  try {
    let un = at("2027-01-06"); let r = await run(env); un();
    assert.deepEqual([r.body.failed, r.body.lapsed], [1, 0]);
    let row = getRen(raw); assert.deepEqual([row.attempts, row.retry_at, row.status, row.enabled, row.last_error], [1, "2027-01-09", "active", 1, "insufficient_funds"]);
    const f = mailTo(n2, "owner@example.com", /could not renew/); assert.equal(f.length, 1); assert.match(f[0].text, /Jan 9, 2027/); assert.match(f[0].text, /\/sponsor\?installer=bright-nights&plan=banner/);
    assert.equal(getInst(raw).banner_until, "2027-01-06", "nothing was applied"); assert.equal(hits(raw, "fn:autorenew-failed"), 1);
    un = at("2027-01-07"); await run(env); un(); un = at("2027-01-08"); await run(env); un();
    assert.equal(n2.piCalls().length, 1, "no attempt before the retry date");
    un = at("2027-01-09"); r = await run(env); un();
    assert.equal(n2.piCalls().length, 2); assert.notEqual(n2.piCalls()[0].headers["idempotency-key"], n2.piCalls()[1].headers["idempotency-key"], "the retry is its own attempt");
    row = getRen(raw); assert.deepEqual([row.status, row.enabled, row.attempts, row.retry_at], ["lapsed", 0, 2, null]); assert.equal(r.body.lapsed, 1);
    assert.equal(mailTo(n2, "owner@example.com", /automatic renewal has stopped/).length, 1, "one lapsed email");
    assert.equal(mailTo(n2, "team@example.com", /Automatic renewal: Bright Nights/).length, 1, "the team is told");
    for (const d of ["2027-01-10", "2027-01-31", "2027-02-20"]) { const u = at(d); await run(env); u(); }
    assert.equal(n2.piCalls().length, 2, "no more automatic charges after a lapse");
    assert.equal(mailTo(n2, "owner@example.com", /automatic renewal has stopped/).length, 1);
    assert.equal(getInst(raw).banner_until, "2027-01-06");
  } finally { n2.restore(); }
});

test("a requires-action answer counts as a failure; a retry that succeeds applies the next season and clears the failure", async () => {
  const { env, raw, net } = await enrolled(); net.restore();
  let mode = "action"; const n2 = fakeNet({ charge: () => mode });
  try {
    let un = at("2027-01-06"); await run(env); un(); assert.equal(getRen(raw).attempts, 1);
    mode = "ok"; un = at("2027-01-09"); const r = await run(env); un();
    assert.deepEqual([r.body.charged, r.body.retried], [1, 1]);
    const row = getRen(raw); assert.deepEqual([row.attempts, row.retry_at, row.status, row.last_error], [0, null, "active", null]);
    assert.equal(getInst(raw).banner_until, "2027-01-31"); assert.equal(getRen(raw).next_charge_date, "2027-01-31");
  } finally { n2.restore(); }
});

test("cancel by the emailed link (no login) before the charge prevents it, keeps the paid placement; a wrong or tampered token is rejected", async () => {
  const { env, raw, net } = await enrolled();
  try {
    const t = getRen(raw).cancel_token;
    const info = await J(cancelInfo({ request: rq("/api/sponsor/renewal?t=" + t), env }));
    assert.deepEqual([info.status, info.body.on, info.body.installer, info.body.price], [200, true, "Bright Nights", "$50"]);
    assert.equal(getRen(raw).enabled, 1, "opening the link (a mail scanner may) cancels nothing");
    for (const bad of [t.slice(0, -1) + (t.endsWith("0") ? "1" : "0"), t + "0", "x".repeat(36), "", t.toUpperCase()]) {
      assert.equal((await J(cancelDo({ request: rq("/api/sponsor/renewal?t=" + bad, {}), env }))).status, 404, "bad token: " + bad.slice(0, 8));
    }
    assert.equal(getRen(raw).enabled, 1);
    const r = await J(cancelDo({ request: rq("/api/sponsor/renewal", { t }), env })); assert.deepEqual([r.status, r.body.cancelled], [200, true]);
    let row = getRen(raw); assert.deepEqual([row.enabled, row.status, row.stripe_payment_method_id], [0, "cancelled", null]); assert.ok(row.cancelled_at);
    assert.ok(net.calls.some((c) => c.url.endsWith("/payment_methods/pm_saved/detach")), "the saved card is removed at Stripe");
    assert.equal(hits(raw, "fn:autorenew-cancelled"), 1); assert.equal(mailTo(net, "owner@example.com", /Automatic renewal is off/).length, 1);
    const un = at("2027-01-06"); await run(env); un();
    assert.equal(net.piCalls().length, 0, "cancelled before the charge: nothing charged"); assert.equal(getInst(raw).banner_until, "2027-01-06", "the placement already paid for stays");
    assert.equal((await J(cancelDo({ request: rq("/api/sponsor/renewal", { t }), env }))).body.was_on, false, "cancelling twice is harmless");
  } finally { net.restore(); }
});

test("the dashboard: signed out is 401, only the owner, turning on needs the ticked box and a running placement and opens a Stripe setup page, turning off cancels", async () => {
  const { env, raw, me } = await enrolled(); const net = fakeNet();
  try {
    const un = at("2026-11-20");
    const call = (b, cookie) => J(managePost({ params: { slug: "bright-nights" }, request: rq("/api/installers/bright-nights/manage", b, cookie), env }));
    assert.equal((await call({ action: "renewal_off" })).status, 401);
    const other = await addUser(raw, "u2", "other@example.com"); assert.equal((await call({ action: "renewal_off" }, other.cookie)).status, 404);
    const g = await J(manageGet({ params: { slug: "bright-nights" }, request: rq("/api/installers/bright-nights/manage", null, me.cookie), env }));
    assert.deepEqual([g.body.renewal.on, g.body.renewal.next_charge_date, g.body.renewal.price], [true, "2027-01-06", "$50"]);
    assert.equal((await call({ action: "renewal_off" }, me.cookie)).body.was_on, true);
    assert.equal((await call({ action: "renewal_on" }, me.cookie)).status, 400, "the box is unticked: no consent");
    const on = await call({ action: "renewal_on", consent: true }, me.cookie); assert.equal(on.status, 200); assert.match(on.body.url, /^https:\/\/checkout\.stripe\.com\//);
    const s = net.calls.filter((c) => c.url.endsWith("/checkout/sessions")).pop().body;
    assert.deepEqual([s.mode, s["metadata[purpose]"], s["metadata[event_id]"], s["metadata[consent]"]], ["setup", "renewal", "i1", CONSENT_VERSION]);
    // Stripe tells us the card was saved: renewal is on again, with the new card
    const w = await sendWebhook(webhook, env, stripeEvent("checkout.session.completed", { id: "cs_setup1", mode: "setup", customer: "cus_2", setup_intent: "seti_1", payment_status: "no_payment_required", metadata: { purpose: "renewal", event_id: "i1", plan: "banner", user_id: "u1", consent: CONSENT_VERSION } }));
    assert.equal(w.body.renewal, "enrolled"); const row = getRen(raw); assert.deepEqual([row.enabled, row.status, row.stripe_payment_method_id, row.stripe_customer_id], [1, "active", "pm_setup", "cus_2"]);
    assert.equal((await sendWebhook(webhook, env, stripeEvent("checkout.session.completed", { id: "cs_setup1", mode: "setup", customer: "cus_2", setup_intent: "seti_1", metadata: { purpose: "renewal", event_id: "i1", plan: "banner", user_id: "u1" } }))).body.renewal, "same", "a replay changes nothing");
    // with no running placement there is nothing to renew
    raw.prepare("UPDATE installers SET banner_until = '2026-10-01'").run();
    assert.equal((await call({ action: "renewal_on", consent: true }, me.cookie)).status, 400);
    un();
  } finally { net.restore(); }
});

test("a refund or a dispute of an automatic charge pauses renewal and tells the team; a refund of an ordinary charge does not touch a renewal that was not its own", async () => {
  for (const kind of ["refund", "dispute"]) {
    const { env, raw, net } = await enrolled();
    try {
      const un = at("2027-01-06"); await run(env);
      const pi = raw.prepare("SELECT session_id FROM feature_orders WHERE renewal = 1").get().session_id;
      assert.equal(getRen(raw).enabled, 1);
      if (kind === "refund") await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: pi, refunded: true }));
      else await sendWebhook(webhook, env, stripeEvent("charge.dispute.created", { payment_intent: pi, charge: "ch_1" }));
      const row = getRen(raw); assert.deepEqual([row.status, row.enabled], ["paused", 0], kind);
      assert.equal(mailTo(net, "team@example.com", /Automatic renewal: Bright Nights/).length, 1);
      assert.equal(getInst(raw).banner_until, "2027-01-06", "the refunded season is switched off like any other order");
      await run(env); un(); const n = net.piCalls().length; const u2 = at("2027-01-07"); await run(env); u2(); assert.equal(net.piCalls().length, n, "paused: no further charges");
    } finally { net.restore(); }
  }
});

test("at most one season ahead: if the owner already renewed by hand, the date moves and nothing is charged", async () => {
  const { env, raw, net } = await enrolled();
  try {
    raw.prepare("UPDATE installers SET banner_until = '2027-01-31'").run(); // booked through the next season already
    const un = at("2027-01-06"); await run(env); un();
    assert.equal(net.piCalls().length, 0); assert.equal(getRen(raw).next_charge_date, "2027-01-31");
  } finally { net.restore(); }
});

test("the daily job needs the shared key; with a wrong key it does nothing", async () => {
  const { env } = await setup(); const net = fakeNet();
  try {
    for (const k of ["", "short", "x".repeat(24)]) assert.equal((await J(cron({ request: new Request("https://x.test/api/sponsor/renewals", { method: "POST", headers: { "x-alert-key": k } }), env }))).status, 401);
    assert.equal((await J(cron({ request: new Request("https://x.test/api/sponsor/renewals", { method: "POST", headers: { "x-alert-key": KEY } }), env: { ...env, STRIPE_SECRET_KEY: "" } }))).body.ok, false);
    assert.equal((await run(env)).status, 200); assert.equal(net.piCalls().length, 0);
  } finally { net.restore(); }
});

test("deleting the account removes the renewal row and asks Stripe to detach the saved card; other people's renewals stay", async () => {
  const { env, raw, net } = await enrolled();
  try {
    raw.prepare("INSERT INTO installers (id,slug,name,web,phone,owner_email) VALUES ('i2','other-co','Other Co','https://o.example','1','c@x.com')").run();
    raw.prepare("INSERT INTO installer_autorenew (installer_id,user_id,stripe_customer_id,stripe_payment_method_id,plan,enabled,status,cancel_token) VALUES ('i2','u9','cus_9','pm_other','banner',1,'active','" + "a".repeat(36) + "')").run();
    await deleteAccount({ ...env, PHOTOS: { delete: async () => {} } }, "u1", "owner@example.com");
    assert.equal(getRen(raw), null); assert.equal(raw.prepare("SELECT COUNT(*) AS c FROM installer_autorenew WHERE installer_id = 'i2'").get().c, 1);
    assert.ok(net.calls.some((c) => c.url.endsWith("/payment_methods/pm_saved/detach")));
    assert.ok(!net.calls.some((c) => c.url.includes("pm_other")));
    assert.equal(raw.prepare("SELECT user_id FROM feature_orders WHERE session_id = 'cs_1'").get().user_id, null, "the financial record stays without the account link");
  } finally { net.restore(); }
});

test("the Terms, Privacy page and Sponsor page describe automatic renewal exactly as the code does, and the box is never pre-ticked", async () => {
  const { readFileSync } = await import("node:fs"), { REMINDER_DAYS, RETRY_DAYS, MAX_ATTEMPTS } = await import("../functions/_lib/renewal.js");
  const strip = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const terms = strip(readFileSync("public/terms.html", "utf8")), priv = strip(readFileSync("public/privacy.html", "utf8")), spons = readFileSync("public/sponsor.html", "utf8");
  assert.ok(terms.includes("Automatic renewal (optional)") && terms.includes("off unless you tick the box"));
  assert.ok(!terms.includes("no automatic renewal") && !terms.includes("with no subscription. Automatic"), "the old installer sentence is gone");
  assert.ok(terms.includes("one-time payment by default") && terms.includes("Featured events and homes never renew") && terms.includes("There is no subscription and nothing renews by itself"), "events and homes still never renew");
  for (const f of ["public/sponsor.html", "public/pricing.html", "public/installer-manage.html"]) assert.ok(!/(Pay once|pay once)[^.<]*no subscription|paid once, no subscription/.test(readFileSync(f, "utf8").replace(/Featured placement is optional: pick one, pay once, no subscription\./, "")), f + " must not promise no renewal for installers");
  assert.ok(terms.includes(`We email you ${REMINDER_DAYS} days before each charge`) && terms.includes(`try once more ${RETRY_DAYS} days later`) && MAX_ATTEMPTS === 2);
  assert.ok(terms.includes("on the last day of your placement") && terms.includes("at the plan's price shown on the Pricing page at that time") && terms.includes("with no login needed") && terms.includes("cancelling keeps the placement you already paid for"));
  assert.ok(terms.includes("pauses automatic renewal") && terms.includes("at most one season ahead"));
  assert.ok(CONSENT_TEXTS[CONSENT_VERSION].includes(`${REMINDER_DAYS} days before each charge`) && CONSENT_TEXTS[CONSENT_VERSION].includes("last day of your placement") && CONSENT_TEXTS[CONSENT_VERSION].includes("Cancel any time"));
  assert.ok(priv.includes("we store only Stripe's customer and payment-method ids, never the card number"));
  assert.match(spons, /<input type="checkbox" id="renew">/); assert.ok(!/id="renew"[^>]*checked/.test(spons), "unticked by default");
});

test("audit: fail closed. If the reminder email cannot be sent, nothing is charged; the next run sends it and then charges", async () => {
  const { env, raw } = await enrolled(); const opts = { mailFail: true }, net = fakeNet(opts);
  try {
    let un = at("2027-01-06"); await run(env); un();
    assert.equal(net.piCalls().length, 0, "no reminder on record: no charge"); assert.equal(getRen(raw).notice_sent_for, null); assert.equal(getInst(raw).banner_until, "2027-01-06");
    opts.mailFail = false; un = at("2027-01-06"); const r = await run(env); un(); // mail is back: the reminder goes out on record, then the charge
    assert.equal(r.body.reminded, 1); assert.equal(net.piCalls().length, 1); assert.equal(getInst(raw).banner_until, "2027-01-31");
  } finally { net.restore(); }
});

test("audit: a Stripe outage leaves the attempt pending (no failure counted) and the next run repeats the SAME idempotency key: one charge, not two", async () => {
  const { env, raw } = await enrolled(); let mode = "down"; const net = fakeNet({ charge: () => mode });
  try {
    let un = at("2027-01-06"); await run(env); un();
    assert.deepEqual([getRen(raw).attempts, getRen(raw).status, getRen(raw).retry_at], [0, "active", null], "an outage is not a decline");
    assert.equal(raw.prepare("SELECT status FROM installer_renewal_attempts").get().status, "pending");
    mode = "ok"; un = at("2027-01-06"); const r = await run(env); un();
    const keys = net.piCalls().map((c) => c.headers["idempotency-key"]); assert.equal(keys.length, 2); assert.equal(keys[0], keys[1], "same key: Stripe returns the original result");
    assert.equal(r.body.charged, 1); assert.equal(raw.prepare("SELECT status FROM installer_renewal_attempts").get().status, "done");
    await run(env); assert.equal(net.piCalls().length, 2, "answered attempts are never repeated"); assert.equal(getInst(raw).banner_until, "2027-01-31");
  } finally { net.restore(); }
});

test("audit: a cancel that lands just before the charge is honored (the attempt is claimed only while renewal is still on)", async () => {
  const { env, raw } = await enrolled(); let armed = true;
  const net = fakeNet({ onMail: (m) => { if (armed && /renews on/.test(m.subject)) { armed = false; raw.prepare("UPDATE installer_autorenew SET enabled = 0, status = 'cancelled'").run(); } } });
  try {
    const un = at("2027-01-06"); await run(env); un();
    assert.equal(net.piCalls().length, 0); assert.equal(raw.prepare("SELECT COUNT(*) AS c FROM installer_renewal_attempts").get().c, 0); assert.equal(getInst(raw).banner_until, "2027-01-06");
  } finally { net.restore(); }
});

test("audit: if the profile's owner changed after consent, nothing is charged and the team is told", async () => {
  const { env, raw } = await enrolled(); const net = fakeNet();
  try {
    raw.prepare("UPDATE installers SET owner_email = 'someone-else@example.com'").run();
    const un = at("2027-01-06"); await run(env); un();
    assert.equal(net.piCalls().length, 0); assert.deepEqual([getRen(raw).status, getRen(raw).enabled], ["paused", 0]);
    assert.equal(mailTo(net, "team@example.com", /Automatic renewal: Bright Nights/).length, 1);
  } finally { net.restore(); }
});

test("audit: consent evidence (wording, version, time, user, plan), card-only, the run heartbeat and an overdue flag", async () => {
  const { env, raw, net } = await enrolled();
  try {
    const row = getRen(raw); assert.ok(row.consent_text.includes("(currently $50)") && row.consent_text.includes("Cancel any time") && row.consent_at && row.consent_text_version === CONSENT_VERSION && row.user_id === "u1" && row.plan === "banner");
    let un = at("2027-01-07"); // the job did not run on the charge date
    const ar = (await J(adminRenewals({ env }))).body; assert.equal(ar.counts.overdue, 1); assert.equal(ar.rows[0].group, "overdue"); un();
    un = at("2027-01-06"); await run(env); un();
    assert.equal(net.piCalls()[0].body["payment_method_types[0]"], "card");
    assert.ok(hits(raw, "fn:autorenew-run") >= 1, "heartbeat");
  } finally { net.restore(); }
});

test("a Top of the list only placement renews as top-only: the stored plan, the charge ($50, plan top) and the dates touch top_until and never the banner", async () => {
  const { env, raw } = await setup(); const net = fakeNet();
  try {
    let un = at("2026-11-06");
    try { await paidRenew(env, 1, { meta: { plan: "top" } }); } finally { un(); }
    const row = getRen(raw); assert.equal(row.plan, "top"); assert.equal(row.next_charge_date, "2027-01-06");
    assert.deepEqual([getInst(raw).banner_until, getInst(raw).top_until], ["", "2027-01-06"]);
    un = at("2027-01-06");
    try { const r = await run(env); assert.equal(r.body.charged, 1); } finally { un(); }
    const c = net.piCalls()[0]; assert.deepEqual([c.body.amount, c.body["metadata[plan]"], c.body["metadata[renewal_from]"]], ["5000", "top", "2027-01-07"]);
    assert.deepEqual([getInst(raw).banner_until, getInst(raw).top_until], ["", "2027-01-31"], "only the top of the list was extended");
    const o = raw.prepare("SELECT * FROM feature_orders WHERE renewal = 1").get(); assert.deepEqual([o.plan, o.applied_until, o.applied_top_until], ["top", null, "2027-01-31"]);
    assert.equal(getRen(raw).next_charge_date, "2027-01-31");
  } finally { net.restore(); }
});
