// Payments audit 2026-11-16, payments / receipts / emails / partner (PR 3): M3 receipt guards, M4 refund wording and overdue refunds, M5 refund note on the payment page,
// M6 days left in the season, M7 partner cap in the INSERT, M11 expiring founding comps in the digest, L1 idempotency key with the return address, L2 test-mode webhook events,
// L4 Admin passes list, L5 refund email for a pass, L9 window wording. In-memory D1; fetch is stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as passCheckout } from "../functions/api/contest-pass/checkout.js";
import { onRequestPost as partnerCheckout } from "../functions/api/partner/checkout.js";
import { onRequestPost as partnerApply } from "../functions/api/partner/apply.js";
import { onRequestGet as partnerEntitlement } from "../functions/api/partner/entitlement.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { onRequestPost as digest } from "../functions/api/admin-digest.js";
import { onRequestGet as passesGet } from "../functions/api/admin/passes.js";
import { TEMPLATES, sendTemplate, renderTemplate } from "../functions/_lib/mailtpl.js";
import { refundAfter } from "../functions/_lib/ordermail.js";
import { refundNote } from "../functions/_lib/stripe.js";
import { outreachHashes } from "../functions/_lib/outreach.js";
import { partnerQuote, partnerEntitlement as entOf, daysLeft } from "../functions/_lib/partner.js";
import { seasonOf } from "../functions/_lib/sponsor.js";
import { WINDOW_RULE } from "../public/contest-passes.js";
import { newEnv, addUser, stubFetch, stripeEvent, sendWebhook, session, freezeNow, ptToday } from "./_pay.mjs";

const O = "https://socallights.app", NOW = "2026-11-09T20:00:00Z";
const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})) }; };
const rq = (url, body, cookie) => new Request(O + url, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", origin: O, ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const withNow = async (fn, iso = NOW) => { const un = freezeNow(iso); try { return await fn(); } finally { un(); } };
const decode = (call) => decodeURIComponent(String(call.init.body).replace(/\+/g, " "));

test("M3: every receipt template is guarded against bounced, complained and deleted addresses, and a suppressed address gets no receipt", async () => {
  const byId = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));
  for (const id of ["feature_paid", "feature_paid_home", "event_partner_paid", "contest_pass_paid", "payment_not_applied", "refund_issued"]) assert.equal(byId[id].guard, "deliverable", id);
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" });
  const { h } = await outreachHashes(env, "bounced@example.com");
  raw.prepare("INSERT INTO outreach_suppressions (email_hash, reason, source, first_seen) VALUES (?, 'bounce', 'resend', '2026-11-01')").run(h);
  const f = stubFetch(() => new Response(JSON.stringify({ id: "m1" }), { status: 200 }));
  try {
    const vars = { org: "x.gov", pass: "Single contest", amount: "$149", start: "Nov 9, 2026", end: "Nov 8, 2027", list: "- a", link: "https://socallights.app/add-contest" };
    assert.equal(await sendTemplate(env, "contest_pass_paid", "bounced@example.com", vars), false);
    assert.equal(f.calls.length, 0, "nothing was sent to a bounced address");
    assert.ok(await sendTemplate(env, "contest_pass_paid", "fine@example.com", vars), "a good address still gets its receipt");
  } finally { f.restore(); }
});

test("M4 / L5: the not-applied email promises a refund to come (not one already on its way) to the payment method used; the refund email says what happens to a pass or plan", async () => {
  const t = TEMPLATES.find((x) => x.id === "payment_not_applied"), r = TEMPLATES.find((x) => x.id === "refund_issued");
  assert.match(t.text, /We will refund the full amount to the payment method you used/); assert.doesNotMatch(t.text, /We are refunding|card you paid/); assert.match(t.subject, /we will refund it/);
  assert.doesNotMatch(r.text, /card you paid with/); assert.match(r.text, /\{\{#after\}\}/);
  assert.equal(refundAfter({ target: "contest_pass" }, true), "Your contest pass is switched off.");
  assert.match(refundAfter({ target: "contest_pass" }, false), /contests that are already live stay as they are/);
  assert.match(refundAfter({ target: "event_partner" }, false), /events it already covers stay as they are/);
  assert.equal(refundAfter({ target: "" }, true), "");
  const { env } = newEnv(), out = await renderTemplate(env, "refund_issued", { what: "Contest pass", amount: "$149.00", off: "", after: refundAfter({ target: "contest_pass" }, false), paid_on: "", ref: "" }), text = out.text;
  assert.match(text, /We refunded \$149\.00 for Contest pass\. Your contest pass and the contests that are already live stay as they are/);
});

const KEY = "digest-key-0123456789";
async function runDigest(env) {
  const f = stubFetch(() => new Response("{}", { status: 200 }));
  try {
    const res = await digest({ request: new Request("https://x.test/api/admin-digest", { method: "POST", headers: { "x-alert-key": KEY } }), env: { ...env, ALERT_CRON_KEY: KEY, RESEND_API_KEY: "re_fake" } });
    const sent = f.calls.find((c) => /resend/.test(c.url)), b = sent ? JSON.parse(sent.init.body) : {};
    return { status: res.status, text: b.text || "", subject: b.subject || "" };
  } finally { f.restore(); }
}
const order = (raw, sid, st, age) => raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,payment_intent,currency,status,applied,applied_featured,applied_until,note,created_at,not_applied_notice_at) VALUES (?,?,?,?,?,?,?,?,0,0,NULL,NULL,datetime('now', ?),'test')").run(sid, "ev1", "top", 1500, "b@x.com", "pi_" + sid, "usd", st, age);
test("M4: a refund still due after 3 days is called out in the digest and its subject", async () => {
  const { env, raw } = newEnv();
  order(raw, "fresh", "refund_due", "-1 day");
  assert.doesNotMatch((await runDigest(env)).text, /REFUND OVERDUE/);
  order(raw, "old", "refund_due", "-5 days");
  const r = await runDigest(env); assert.match(r.text, /REFUND OVERDUE: waiting 5 days/); assert.match(r.subject, /REFUNDS OVERDUE/);
});
test("M11: a founding comp that ends within 30 days with no contest yet is listed in the digest; one that has a contest is not", async () => {
  const { env, raw } = newEnv();
  raw.prepare("DELETE FROM contest_comps").run();
  raw.prepare("INSERT INTO contest_comps (id, org_key, allowed, valid_until, note) VALUES ('a','d:idlecity.gov',1,?, 't'), ('b','d:usedcity.gov',1,?, 't'), ('c','d:farcity.gov',1,?, 't')").run(ptToday(10), ptToday(10), ptToday(90));
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,org_key,live_at) VALUES ('k','k','u','N','O','Pasadena','Los Angeles','christmas','live','2099-12-10','2099-12-12','2099-12-20','[]','d:usedcity.gov',?)").run(ptToday(-1));
  const r = await runDigest(env);
  assert.match(r.text, /Founding comps ending soon with no contest yet \(1\)/); assert.match(r.text, /d:idlecity\.gov: free contest ends/); assert.doesNotMatch(r.text, /usedcity|farcity/);
});

test("M5 / L1: contest pass and partner payment pages carry the refund rule; the pass idempotency key includes the return address", () => withNow(async () => {
  const { env, raw } = newEnv(); const me = await addUser(raw, "u1", "owner@gmail.com"), clerk = await addUser(raw, "u2", "staff@citya.org");
  const f = stubFetch();
  try {
    assert.equal((await J(passCheckout({ request: rq("/api/contest-pass/checkout", { plan: "pass_1", back: "wizard" }, me.cookie), env }))).status, 200);
    assert.equal((await J(passCheckout({ request: rq("/api/contest-pass/checkout", { plan: "pass_1" }, me.cookie), env }))).status, 200);
    var [a, b] = f.calls; assert.match(decode(a), /custom_text\[submit\]\[message\]=If we cannot apply your pass, you get a full refund/); assert.match(decode(a), /socallights\.app\/terms#passes/);
    assert.notEqual(a.init.headers["idempotency-key"], b.init.headers["idempotency-key"], "a different return address is a different session");
    assert.equal((await J(partnerCheckout({ request: rq("/api/partner/checkout", {}, clerk.cookie), env }))).status, 200);
    var p = f.calls[2]; assert.match(decode(p), /If we cannot apply your plan, you get a full refund/); assert.match(decode(p), /\d+ days? left in this season/);
  } finally { f.restore(); }
  assert.match(decode(a), /consent_collection\[terms_of_service\]=required/); assert.match(decode(p), /consent_collection\[terms_of_service\]=required/);
  assert.ok(refundNote("event").length < 1000);
  for (const file of ["functions/api/feature/checkout.js", "functions/api/sponsor/checkout.js", "functions/api/installers/[slug]/manage.js"]) assert.doesNotMatch(readFileSync(file, "utf8"), /consent_collection/, file + " must not ask for Terms consent");
  for (const file of ["functions/api/feature/checkout.js", "functions/api/sponsor/checkout.js"]) assert.match(readFileSync(file, "utf8"), /custom_text\[submit\]\[message\]/, file);
}));

test("M6: the partner quote and page say how many days are left in the season", () => withNow(async () => {
  assert.equal(daysLeft("2027-01-05", "2027-01-06"), 2); assert.equal(daysLeft("2027-01-06", "2027-01-06"), 1); assert.equal(daysLeft("2027-01-07", "2027-01-06"), 0);
  const s = seasonOf("2026-11-09"), ent = entOf(s, [], [], 0); assert.equal(partnerQuote(ent, "2026-11-09").daysLeft, daysLeft("2026-11-09", s.end));
  const { env, raw } = newEnv(); const clerk = await addUser(raw, "u2", "staff@citya.org");
  const v = (await J(partnerEntitlement({ request: rq("/api/partner/entitlement", null, clerk.cookie), env }))).body; assert.equal(v.season.daysLeft, daysLeft("2026-11-09", v.season.end));
  assert.match(readFileSync("public/partner.html", "utf8"), /day\$\{v\.season\.daysLeft === 1 \? "" : "s"\} left/);
}));

function addEv(raw, id, email) {
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,lat,lng,url,status,notice) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(id, "Event " + id, "Riverside", "Eastvale", "walk", "2026-11-20", "2026-12-20", 34, -118, "https://citya.org/e", "confirmed", "");
  raw.prepare("INSERT INTO event_submissions (id,name,city,season,type,start_date,end_date,contact_email,status,event_id) VALUES (?,?,?,?,?,?,?,?,?,?)").run("s_" + id, "Event " + id, "Eastvale", "christmas", "walk", "2026-11-20", "2026-12-20", email, "approved", id);
}
test("M7: two requests for the last place of an Event Partner plan: one gets it, the other is told the plan is used up and its event is untouched", () => withNow(async () => {
  const { env, raw } = newEnv(); const clerk = await addUser(raw, "u2", "staff@citya.org");
  raw.prepare("INSERT INTO event_partner_comps (id, org_key, allowed, valid_until, note) VALUES ('c','d:citya.org',1,'2099-12-31','t')").run();
  addEv(raw, "a", "staff@citya.org"); addEv(raw, "b", "staff@citya.org");
  const apply = (id) => J(partnerApply({ request: rq("/api/partner/apply", { event_id: id }, clerk.cookie), env }));
  const rs = await Promise.all([apply("a"), apply("b")]);
  assert.deepEqual(rs.map((r) => r.status).sort(), [200, 409], JSON.stringify(rs.map((r) => r.body)));
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_partner_events WHERE status = 'active'").get().n, 1);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE partner_until IS NOT NULL AND partner_until != ''").get().n, 1, "only the event that got the place is badged");
}));

test("L2: a test-mode event is ignored when the site runs on a live key, and still processed on a test key", async () => {
  const evt = (o) => stripeEvent("checkout.session.completed", { ...session({ id: "cs_lm", metadata: { event_id: "ev1", plan: "top", user_id: "u1" } }), ...o });
  const live = newEnv({ STRIPE_SECRET_KEY: "sk_live_abc" }), r1 = await sendWebhook(webhook, live.env, { ...evt(), livemode: false });
  assert.equal(r1.body.ignored, "test-mode event"); assert.equal(live.raw.prepare("SELECT COUNT(*) AS n FROM stripe_events").get().n, 0);
  const test_ = newEnv({ STRIPE_SECRET_KEY: "sk_test_abc" }), r2 = await sendWebhook(webhook, test_.env, { ...evt(), livemode: false });
  assert.notEqual(r2.body.ignored, "test-mode event");
  const r3 = await sendWebhook(webhook, live.env, { ...evt(), livemode: true }); assert.notEqual(r3.body.ignored, "test-mode event");
});

test("L4: the Admin passes list works out used / cap / over from every running pass, not only the newest 300", async () => {
  const { env, raw } = newEnv(); const today = ptToday();
  raw.prepare("INSERT INTO contest_passes (session_id, org_key, cap, window_start, window_end, cents, status, created_at) VALUES ('old','d:oldorg.gov',1,?,?,14900,'active','2026-01-01 00:00:00')").run(today, "2099-01-01");
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,org_key,live_at) VALUES ('k','k','u','N','O','Pasadena','Los Angeles','christmas','live','2099-12-10','2099-12-12','2099-12-20','[]','d:oldorg.gov',?)").run(today);
  raw.exec("BEGIN"); const ins = raw.prepare("INSERT INTO contest_passes (session_id, org_key, cap, window_start, window_end, cents, status, created_at) VALUES (?,?,5,?,?,29900,'active','2026-06-01 00:00:00')");
  for (let i = 0; i < 320; i++) ins.run("s" + i, "d:filler" + i + ".gov", today, "2099-01-01"); raw.exec("COMMIT");
  const r = (await J(passesGet({ env }))).body, org = r.orgs.find((o) => o.key === "d:oldorg.gov");
  assert.equal(org.cap, 1); assert.equal(org.used, 1); assert.equal(org.over, false, "the old pass still counts");
  assert.equal(r.truncated.passes, true);
});

test("L9: the window rule says an unpublished contest still counts; the pages load the new script version", () => {
  assert.match(WINDOW_RULE, /live and is later unpublished, by you or by us, still counts/);
  for (const f of ["public/add-contest.html", "public/contest-pass.html", "public/pricing.html"]) assert.match(readFileSync(f, "utf8"), /contest-passes\.js\?v=20261116a/, f);
});
