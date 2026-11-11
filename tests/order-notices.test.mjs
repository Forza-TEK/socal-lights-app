// PAY-02, PAY-03, PAY-05, PAY-09, PAY-10, PAY-11: the home Featured receipt, "payment not applied" and "refund issued" emails, reply-to, the shared receipt lines and the email colors.
// Service mail goes even to someone who unsubscribed from marketing, never to a bounced or complained address or a deleted account.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { sweepNotApplied } from "../functions/_lib/ordermail.js";
import { addSuppression } from "../functions/_lib/outreach.js";
import { renderTemplate, TEMPLATES } from "../functions/_lib/mailtpl.js";
import { REFUND } from "../public/refund-terms.js";
import { money } from "../functions/_lib/money.js";
import { newEnv, stripeEvent, sendWebhook, session, addEvent, stubFetch } from "./_pay.mjs";

const mailer = () => stubFetch((u) => new Response("{}", { status: 200 }));
const sent = (net) => net.calls.filter((c) => c.url.includes("api.resend.com")).map((c) => JSON.parse(c.init.body));
const mkEnv = () => { const x = newEnv({ RESEND_API_KEY: "re_test" }); return x; };
const addHome = (raw, id = "h1") => raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,approved_at) VALUES (?,'approved','b','Maple Street Lights','Pasadena',34.1,-118.1,'d','[]','owner@example.com','christmas','1 Oak St, Pasadena, CA',datetime('now'))").run(id);
const homeSession = (o = {}) => session({ amount_total: 1000, metadata: { event_id: "h1", plan: "pin", user_id: "u1", target: "home" }, ...o });
const pay = (env, s) => sendWebhook(webhook, env, stripeEvent("checkout.session.completed", s));
const refund = () => stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_1", refunded: true });
const insertOrder = (raw, sid, status, o = {}) => raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,payment_intent,currency,status,target,note) VALUES (?,?,?,?,?,?,?,?,?,?)").run(sid, o.event || "ev1", "ev_pin", 2500, o.email === undefined ? "buyer@example.com" : o.email, "pi_" + sid, "usd", status, "event", o.note || null);

test("PAY-02: a Featured home sends a receipt; it also goes to someone who unsubscribed from marketing", async () => {
  const { env, raw } = mkEnv(); addHome(raw);
  raw.prepare("INSERT INTO email_prefs (email, token, optout) VALUES ('buyer@example.com', ?, 1)").run("a".repeat(36));
  const net = mailer();
  try {
    const r = await pay(env, homeSession()); assert.equal(r.status, 200);
    const m = sent(net); assert.equal(m.length, 1);
    assert.equal(m[0].to[0], "buyer@example.com"); assert.match(m[0].subject, /Your Featured placement: Maple Street Lights/);
    assert.match(m[0].text, /Thank you for featuring your home/); assert.match(m[0].text, /\$10\.00/); assert.match(m[0].text, /Paid on [A-Z][a-z]{2} \d{1,2}, \d{4}/); assert.match(m[0].text, /Order reference: SL-/);
    assert.ok(m[0].text.includes(REFUND.home), "the one refund statement for a home"); assert.match(m[0].text, /terms#refunds/);
    assert.equal(m[0].reply_to, "info@socallights.app", "PAY-09: replies reach the support mailbox");
  } finally { net.restore(); }
});

test("service mail never goes to a bounced or complained address or a deleted account, but an unsubscribe or a reply does not block it", async () => {
  for (const [reason, source, expected] of [["bounce", "grok", 0], ["complaint", "grok", 0], ["manual", "account_deleted", 0], ["unsubscribe", "app", 1], ["reply", "grok", 1]]) {
    const { env, raw } = mkEnv(); addHome(raw);
    await addSuppression(env, "buyer@example.com", reason, source);
    const net = mailer();
    try { await pay(env, homeSession()); assert.equal(sent(net).length, expected, reason + "/" + source); } finally { net.restore(); }
  }
});

test("PAY-03: a payment taken but not applied tells the buyer we are refunding it, once; the refund email follows when Stripe refunds", async () => {
  const { env, raw } = mkEnv(); addEvent(raw);
  // a second payment for what the event already has is held as refund due
  const net = mailer();
  try {
    await pay(env, session({ id: "cs_a", payment_intent: "pi_a", amount_total: 1500 }));
    sent(net).length = 0; net.calls.length = 0;
    raw.prepare("UPDATE feature_orders SET status = 'paid'").run();
    insertOrder(raw, "cs_due", "refund_due");
    assert.equal(await sweepNotApplied(env), 1);
    let m = sent(net); assert.equal(m.length, 1);
    assert.match(m[0].subject, /Your payment was not applied: we are refunding it/); assert.match(m[0].text, /\$25\.00/); assert.match(m[0].text, /Order reference: SL-S_DUE|Order reference: SL-/);
    assert.equal(m[0].reply_to, "info@socallights.app");
    assert.equal(await sweepNotApplied(env), 0, "once per order");
    // the refund
    net.calls.length = 0;
    const r = await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_a", payment_intent: "pi_a", refunded: true }));
    assert.equal(r.status, 200); m = sent(net); assert.equal(m.length, 1); assert.match(m[0].subject, /Your refund was issued/); assert.match(m[0].text, /\$15\.00/); assert.match(m[0].text, /switched off/);
    await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_a", payment_intent: "pi_a", refunded: true })); assert.equal(sent(net).length, 1, "a second refund event sends nothing more");
  } finally { net.restore(); }
});

test("PAY-03: an order whose removal can be undone is not announced as refunded; an old order and a bounced address are skipped quietly", async () => {
  const { env, raw } = mkEnv();
  insertOrder(raw, "cs_restore", "refund_due", { note: "[auto] event unpublished. Publishing it again puts the placement back." });
  insertOrder(raw, "cs_bounce", "refund_due", { email: "bad@example.com" });
  await addSuppression(env, "bad@example.com", "bounce", "grok");
  const net = mailer();
  try {
    assert.equal(await sweepNotApplied(env), 0); assert.equal(sent(net).length, 0);
    assert.equal(raw.prepare("SELECT not_applied_notice_at AS n FROM feature_orders WHERE session_id = 'cs_bounce'").get().n, "skipped");
    assert.equal(raw.prepare("SELECT not_applied_notice_at AS n FROM feature_orders WHERE session_id = 'cs_restore'").get().n, null);
  } finally { net.restore(); }
});

test("PAY-11: every receipt says when it was paid, its order reference and the refund statement; amounts always have cents", async () => {
  for (const [id, kind] of [["feature_paid", "event"], ["event_partner_paid", "partner"], ["contest_pass_paid", "pass"], ["feature_paid_home", "home"]]) {
    const t = TEMPLATES.find((x) => x.id === id);
    const vars = Object.fromEntries(Object.entries(t.vars).map(([k, v]) => [k, v[1]]));
    const m = await renderTemplate({}, id, { ...vars, refund: REFUND[kind] });
    assert.match(m.text, /Paid on Nov 11, 2026/, id); assert.match(m.text, /Order reference: SL-1A2B3C4D/, id); assert.ok(m.text.includes(REFUND[kind]), id + " carries the refund statement"); assert.match(m.text, /Full terms: https:\/\/socallights\.app\/terms#/, id);
  }
  assert.equal(money(14900), "$149.00"); assert.equal(money(5000), "$50.00"); assert.equal(money(null), "");
});

test("PAY-10: the email button and the copyright line pass 4.5:1 on white", async () => {
  const m = await renderTemplate({}, "refund_issued", { what: "x", amount: "$1.00" });
  const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const html = (await renderTemplate({}, "contest_pass_paid", { org: "o", pass: "p", amount: "$1.00", start: "a", end: "b", list: "- x", link: "https://socallights.app/add-contest" })).html;
  const btn = /bgcolor="(#[0-9a-f]{6})"/.exec(html)[1]; assert.ok(ratio(btn, "#ffffff") >= 4.5, "button " + btn);
  assert.ok(!html.includes("#9a9388"), "the old light grey copyright color is gone");
  assert.ok(ratio("#6b6760", "#ffffff") >= 4.5);
  assert.ok(m.html.length > 0);
});
