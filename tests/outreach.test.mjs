// Run with: node --test tests/   (Outreach API for Grok, the shared suppression list, the admin reconcile tool, and the monthly-update opt-in.)
// No real email is sent and no real address is used: every address is @example.* or a test domain.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newEnv, addUser } from "./_pay.mjs";
import { outreachHashes, FREE_MAIL } from "../functions/_lib/outreach.js";
import { deleteAccount } from "../functions/_lib/account.js";
import { onRequest as check } from "../functions/api/outreach/check.js";
import { onRequest as suppress } from "../functions/api/outreach/suppress.js";
import { onRequest as event } from "../functions/api/outreach/event.js";
import { onRequestGet as alertUnsubGet, onRequestPost as alertUnsubPost } from "../functions/api/alerts/unsubscribe.js";
import { onRequestPost as unsubPost } from "../functions/api/unsub.js";
import { onRequestGet as adminGet, onRequestPost as adminPost } from "../functions/api/admin/outreach.js";
import { onRequest as adminGate } from "../functions/api/admin/_middleware.js";
import { onRequestGet as nlGet, onRequestPost as nlPost } from "../functions/api/me/newsletter.js";
import { onRequestGet as prefsGet, onRequestPost as prefsPost } from "../functions/api/prefs.js";
import { CONSENT_VERSION, newsletterLinks } from "../functions/_lib/newsletter.js";
import { retentionStatements } from "../functions/_lib/retention.js";

const KEY = "test-outreach-key-0123456789abcdef";
const mk = (extra = {}) => { const { env, raw } = newEnv({ OUTREACH_API_KEY: KEY, ...extra }); return { env, raw, DB: env.DB }; };
const post = (handler, env, path, body, { key = KEY, method = "POST", auth } = {}) => {
  const headers = { "content-type": "application/json" };
  if (auth !== undefined) headers.authorization = auth; else if (key) headers.authorization = "Bearer " + key;
  return handler({ request: new Request("https://socallights.app/api/outreach/" + path, { method, headers, body: method === "GET" ? undefined : JSON.stringify(body) }), env }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})), headers: r.headers }));
};
const chk = (env, emails, extra = {}) => post(check, env, "check", { emails, ...extra });
const statusOf = async (env, email) => (await chk(env, [email])).body.results[0].status;
const rows = (raw, sql, ...a) => raw.prepare(sql).all(...a).map((r) => ({ ...r }));

// ---------------------------------------------------------------- auth
test("auth: no key, a wrong key and a malformed header are 401 and never return data", async () => {
  const { env } = mk();
  for (const o of [{ auth: undefined, key: "" }, { key: "wrong-key-wrong-key-wrong" }, { auth: "Basic " + KEY }, { auth: "Bearer" }, { auth: KEY }]) {
    const r = await post(check, env, "check", { emails: ["a@example.com"] }, o);
    assert.equal(r.status, 401, JSON.stringify(o));
    assert.equal(r.body.results, undefined);
  }
  const g = await post(check, env, "check", null, { method: "GET", key: "" });
  assert.equal(g.status, 401);
});
test("auth: a missing (or too short) secret answers 503 with hold:true, even with a header", async () => {
  for (const secret of [undefined, "", "short"]) {
    const { env } = newEnv(secret === undefined ? {} : { OUTREACH_API_KEY: secret });
    for (const h of [check, suppress, event]) {
      const r = await post(h, env, "x", { emails: ["a@example.com"] }, { key: secret || "anything-anything-12345" });
      assert.equal(r.status, 503); assert.equal(r.body.hold, true);
    }
  }
});
test("auth: 60 requests a minute per key; the 61st is 429 with hold:true and a retry-after", async () => {
  const { env, raw } = mk();
  for (let i = 0; i < 60; i++) assert.equal((await chk(env, ["a@example.com"])).status, 200, "call " + (i + 1));
  const r = await chk(env, ["a@example.com"]);
  assert.equal(r.status, 429); assert.equal(r.body.hold, true); assert.ok(r.headers.get("retry-after"));
  assert.equal((await post(suppress, env, "suppress", { email: "a@example.com", reason: "manual", source: "t" })).status, 429, "the limit is shared by every endpoint");
  // another minute: allowed again; old buckets are deleted
  const real = Date.now; Date.now = () => real() + 61_000;
  try { assert.equal((await chk(env, ["a@example.com"])).status, 200); } finally { Date.now = real; }
  assert.ok(rows(raw, "SELECT * FROM outreach_rate").length <= 2);
});
test("more than 50 emails, an empty list or bad input are 400 with hold:true", async () => {
  const { env } = mk();
  for (const body of [{ emails: Array.from({ length: 51 }, (_, i) => `u${i}@example.com`) }, { emails: [] }, { emails: [1] }, { emails: "a@example.com" }, {}, { emails: ["a@example.com"], domains: "x.com" }]) {
    const r = await post(check, env, "check", body);
    assert.equal(r.status, 400, JSON.stringify(body).slice(0, 40)); assert.equal(r.body.hold, true);
  }
});

// ---------------------------------------------------------------- verdicts
test("a person nobody knows is clear, and the response has the contract's shape", async () => {
  const { env } = mk();
  const r = await chk(env, ["  Nobody@Example.COM "]);
  assert.equal(r.status, 200);
  const v = r.body.results[0];
  assert.deepEqual(Object.keys(v).sort(), ["email_hash_prefix", "i", "reasons", "sequence", "status"]); // sequence was added later (additive); deliverability only with verify
  assert.equal(v.status, "clear"); assert.deepEqual(v.reasons, []); assert.match(v.email_hash_prefix, /^[0-9a-f]{8}$/);
  assert.equal(v.email_hash_prefix, (await outreachHashes(env, "nobody@example.com")).h.slice(0, 8), "lowercased and trimmed before hashing");
});
test("registered: matches users.email (also a +tag or Gmail-dots spelling of the same person)", async () => {
  const { env, raw } = mk();
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('u1','jane@example.com','Jane'), ('u2','bob@gmail.com','Bob')").run();
  assert.equal(await statusOf(env, "Jane@Example.com"), "registered");
  assert.equal(await statusOf(env, "jane+lights@example.com"), "registered");
  assert.equal(await statusOf(env, "b.o.b@gmail.com"), "registered");
  assert.equal(await statusOf(env, "other@elsewhere.example"), "clear");
  assert.equal(await statusOf(env, "other@example.com"), "review", "same non-free domain as a registered user: never guess");
});
// every table that holds the email of someone who submitted or owns something
const LISTING_TABLES = {
  event_submissions: "INSERT INTO event_submissions (id,name,city,season,type,start_date,end_date,contact_email) VALUES ('s1','Fest','Pasadena','christmas','walk','2026-12-01','2026-12-02','?')",
  posts: "INSERT INTO posts (id,biz,title,city,lat,lng,descr,contact_email) VALUES ('p1','b','t','Pasadena',1,2,'d','?')",
  "installers.owner_email": "INSERT INTO installers (id,slug,name,owner_email) VALUES ('i1','i1','Inst','?')",
  "installers.email": "INSERT INTO installers (id,slug,name,email) VALUES ('i2','i2','Inst2','?')",
  "contests.contact_email": "INSERT INTO contests (id,slug,owner_id,name,org,city,entries_close,vote_start,vote_end,contact_email) VALUES ('c1','c1','','C','Org','Pasadena','2026-12-01','2026-12-02','2026-12-20','?')",
  "contests.installer_email": "INSERT INTO contests (id,slug,owner_id,name,org,city,entries_close,vote_start,vote_end,installer_email) VALUES ('c2','c2','','C','Org','Pasadena','2026-12-01','2026-12-02','2026-12-20','?')",
  event_claims: "INSERT INTO event_claims (id,event_id,user_id,email) VALUES ('ec1','e1','u9','?')",
  contest_leads: "INSERT INTO contest_leads (id,contest_id,user_id,name,email) VALUES ('cl1','c1','u9','N','?')",
  installer_leads: "INSERT INTO installer_leads (id,installer_id,user_id,name,email) VALUES ('il1','i1','u9','N','?')",
  contest_pass_leads: "INSERT INTO contest_pass_leads (id,user_id,email) VALUES ('pl1','u9','?')",
  contest_staff: "INSERT INTO contest_staff (contest_id,email) VALUES ('c1','?')",
  judges: "INSERT INTO judges (id,contest_id,email,token) VALUES ('j1','c1','?','tok')",
  contest_sponsors: "INSERT INTO contest_sponsors (id,contest_id,name,email) VALUES ('sp1','c1','Sponsor','?')",
  alert_subs: "INSERT INTO alert_subs (id,email,city,lat,lng,token) VALUES ('as1','?','Pasadena',1,2,'tk')",
  feature_orders: "INSERT INTO feature_orders (session_id,event_id,plan,email) VALUES ('ss1','e1','pin','?')",
  home_consents: "INSERT INTO home_consents (id,contest_id,email) VALUES ('hc1','c1','?')",
};
for (const [name, sql] of Object.entries(LISTING_TABLES)) {
  test(`listing: ${name}`, async () => {
    const { env, raw } = mk();
    const e = "owner@" + name.replace(/\W/g, "") + ".example.org";
    try { raw.prepare(sql.replace("?", e.toUpperCase())).run(); }
    catch (x) { if (!/id/i.test(x.message)) throw x; raw.prepare(sql.replace("?", e.toUpperCase()).replace(/\(id,/, "(").replace(/VALUES \('[^']*',/, "VALUES (")).run(); }
    const r = (await chk(env, [e, "x" + e])).body.results;
    assert.equal(r[0].status, "listing", name); assert.ok(r[0].reasons.length >= 1);
    assert.equal(r[1].status, "clear", "a different address at the same domain is not an exact match (domain rule needs a website or account)");
  });
}
test("removal requests and app unsubscribes already on file count as suppressed", async () => {
  const { env, raw } = mk();
  raw.prepare("INSERT INTO removal_requests (id,email) VALUES ('r1','gone@example.org')").run();
  raw.prepare("INSERT INTO email_prefs (email,token,optout) VALUES ('stop@example.org','" + "a".repeat(36) + "',1), ('ok@example.org','" + "b".repeat(36) + "',0)").run();
  assert.equal(await statusOf(env, "gone@example.org"), "suppressed");
  assert.equal(await statusOf(env, "stop@example.org"), "suppressed");
  assert.equal(await statusOf(env, "ok@example.org"), "clear");
});
test("review: same website domain as a registered installer, contest or listing; same non-free domain as a user; free-mail domains never review", async () => {
  const { env, raw } = mk();
  raw.prepare("INSERT INTO installers (id,slug,name,web) VALUES ('i1','acme','Acme Lights','https://www.AcmeLights.example/about')").run();
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,entries_close,vote_start,vote_end,installer_url) VALUES ('c1','c1','','C','Org','Pasadena','2026-12-01','2026-12-02','2026-12-20','https://shop.glowcity.example')").run();
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('u1','sam@brightco.example','Sam'), ('u2','pat@gmail.com','Pat'), ('u3','kim@yahoo.com','Kim')").run();
  raw.prepare("INSERT INTO installers (id,slug,name,web) VALUES ('i2','fb','Fb Co','https://facebook.com/someone'), ('i3','gm','Gm Co','gmail.com')").run();
  const r = (await chk(env, ["info@acmelights.example", "hello@glowcity.example", "lee@brightco.example", "any@gmail.com", "any@yahoo.com", "x@facebook.com", "someone@outlook.com", "not-an-address"])).body.results;
  assert.deepEqual(r.map((x) => x.status), ["review", "review", "review", "clear", "clear", "clear", "clear", "review"]);
  assert.ok(r[0].reasons.includes("same_domain_as_installer_website"));
  assert.ok(r[1].reasons.includes("same_domain_as_contest_website"), "a deeper host (shop.glowcity.example) is the same company");
  assert.ok(r[2].reasons.includes("same_domain_as_account"));
  assert.deepEqual(r[7].reasons, ["invalid_address"]);
  assert.ok(FREE_MAIL.has("gmail.com") && FREE_MAIL.has("yahoo.com") && FREE_MAIL.has("outlook.com") && FREE_MAIL.has("icloud.com"));
});
test("optional domains are checked the same way and echoed back without anything else", async () => {
  const { env, raw } = mk();
  raw.prepare("INSERT INTO installers (id,slug,name,web) VALUES ('i1','acme','Acme','acmelights.example')").run();
  const r = await chk(env, ["a@example.org"], { domains: ["https://www.AcmeLights.example/", "unknown.example", "gmail.com"] });
  assert.deepEqual(r.body.domains.map((d) => [d.domain, d.status]), [["acmelights.example", "review"], ["unknown.example", "clear"], ["gmail.com", "clear"]]);
});
test("suppressed beats registered and listing; the strongest status wins and every reason is listed", async () => {
  const { env, raw } = mk();
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('u1','both@example.org','B')").run();
  raw.prepare("INSERT INTO posts (id,biz,title,city,lat,lng,descr,contact_email) VALUES ('p1','b','t','Pasadena',1,2,'d','both@example.org')").run();
  let v = (await chk(env, ["both@example.org"])).body.results[0];
  assert.equal(v.status, "registered"); assert.ok(v.reasons.includes("account") && v.reasons.includes("home_or_installer_post"));
  await post(suppress, env, "suppress", { email: "both@example.org", reason: "manual", source: "test" });
  v = (await chk(env, ["both@example.org"])).body.results[0];
  assert.equal(v.status, "suppressed"); assert.ok(v.reasons.includes("suppression_list"));
});

// ---------------------------------------------------------------- limits and failure
test("a batch of 50 stays inside 100 bound parameters and a handful of outgoing calls (even when every address has a +tag)", async () => {
  const { env, raw, DB } = mk();
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('u1','p3@example.org','P')").run();
  raw.prepare("INSERT INTO posts (id,biz,title,city,lat,lng,descr,contact_email) VALUES ('p1','b','t','Pasadena',1,2,'d','p4@example.org')").run();
  await post(suppress, env, "suppress", { email: "p5@example.org", reason: "reply", source: "t" });
  for (const mkEmail of [(i) => `p${i}@example.org`, (i) => `p${i}+tag@example.org`]) { // second run: 50 addresses with 2 spellings each = 100 candidates
    DB.stats.reset();
    const r = await chk(env, Array.from({ length: 50 }, (_, i) => mkEmail(i)));
    assert.equal(r.status, 200); assert.equal(r.body.results.length, 50);
    assert.ok(DB.stats.calls <= 5, "outgoing calls: " + DB.stats.calls);
    assert.equal(r.body.results[3].status, "registered"); assert.equal(r.body.results[4].status, "listing"); assert.equal(r.body.results[5].status, "suppressed");
    assert.equal(r.body.results[10].status, "review", "same domain as a registered user");
  }
});
test("any database failure answers 503 with hold:true and no verdicts", async () => {
  const { env, DB } = mk();
  const broken = { ...env, DB: { prepare: DB.prepare, batch: async (list) => { if (list.length > 3) throw new Error("D1_ERROR: boom"); return DB.batch(list); }, stats: DB.stats } };
  const r = await chk(broken, ["a@example.org"]);
  assert.equal(r.status, 503); assert.equal(r.body.hold, true); assert.equal(r.body.results, undefined);
  // a batch that comes back with the wrong shape is a failure too
  const odd = { ...env, DB: { prepare: DB.prepare, batch: async (list) => (list.length > 3 ? list.map(() => ({})) : DB.batch(list)), stats: DB.stats } };
  const r2 = await chk(odd, ["a@example.org"]);
  assert.equal(r2.status, 503); assert.equal(r2.body.hold, true);
  // the rate-limit table failing also holds
  const noRate = { ...env, DB: { prepare: DB.prepare, batch: async () => { throw new Error("down"); }, stats: DB.stats } };
  const r3 = await chk(noRate, ["a@example.org"]);
  assert.equal(r3.status, 503); assert.equal(r3.body.hold, true);
});

// ---------------------------------------------------------------- suppress and event
test("suppress is idempotent and stores only a hash, the reason, the source and the date", async () => {
  const { env, raw } = mk();
  for (let i = 0; i < 3; i++) assert.equal((await post(suppress, env, "suppress", { email: "Reply@Example.org", reason: i ? "manual" : "reply", source: "grok-email" })).status, 200);
  const r = rows(raw, "SELECT * FROM outreach_suppressions");
  assert.equal(r.length, 1);
  assert.equal(r[0].email_hash, (await outreachHashes(env, "reply@example.org")).h);
  assert.equal(r[0].reason, "reply"); assert.equal(r[0].source, "grok-email"); assert.match(r[0].first_seen, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(await statusOf(env, "reply@example.org"), "suppressed");
  assert.equal((await post(suppress, env, "suppress", { email: "x@example.org", reason: "nope", source: "s" })).status, 400);
  assert.equal((await post(suppress, env, "suppress", { email: "x@example.org", reason: "manual", source: "s".repeat(41) })).status, 400);
  assert.equal((await post(suppress, env, "suppress", { email: "not-an-email", reason: "manual", source: "s" })).status, 400);
});
test("a +tag or Gmail-dots spelling of a suppressed address is suppressed too", async () => {
  const { env, raw } = mk();
  await post(suppress, env, "suppress", { email: "s.am+x@gmail.com", reason: "unsubscribe", source: "t" });
  assert.equal(rows(raw, "SELECT * FROM outreach_suppressions").length, 2);
  for (const e of ["sam@gmail.com", "s.a.m@gmail.com", "sam+other@gmail.com", "S.AM+X@gmail.com"]) assert.equal(await statusOf(env, e), "suppressed", e);
});
test("event: sent is stored, and reply, bounce, complaint and unsubscribe also suppress", async () => {
  const { env, raw } = mk();
  const ev = (email, e, step = 0, segment = "installer") => post(event, env, "event", { email, event: e, step, segment });
  assert.equal((await ev("a@example.org", "sent")).body.suppressed, false);
  assert.equal(await statusOf(env, "a@example.org"), "clear", "sending does not suppress");
  for (const e of ["reply", "bounce", "complaint", "unsubscribe"]) {
    const addr = `${e}@example.org`;
    assert.equal((await ev(addr, e, 1, "contest")).status, 200);
    assert.equal(await statusOf(env, addr), "suppressed", e);
    assert.equal(rows(raw, "SELECT reason, source FROM outreach_suppressions WHERE email_hash = ?", (await outreachHashes(env, addr)).h)[0].reason, e);
  }
  const ev1 = rows(raw, "SELECT * FROM outreach_events WHERE event = 'sent'")[0];
  assert.equal(ev1.step, 0); assert.equal(ev1.segment, "installer"); assert.match(ev1.day, /^\d{4}-\d{2}-\d{2}$/);
  for (const bad of [{ email: "a@example.org", event: "open", step: 0, segment: "installer" }, { email: "a@example.org", event: "sent", step: 3, segment: "installer" }, { email: "a@example.org", event: "sent", step: "1", segment: "installer" }, { email: "a@example.org", event: "sent", step: 0, segment: "other" }, { email: "nope", event: "sent", step: 0, segment: "installer" }])
    assert.equal((await post(event, env, "event", bad)).status, 400, JSON.stringify(bad));
});

// ---------------------------------------------------------------- privacy of the answers and of the tables
test("responses contain no email addresses, names or other personal data; every call logs counts only", async () => {
  const { env, raw } = mk();
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('u1','private.person@example.org','Private Person')").run();
  const all = [];
  all.push(await chk(env, ["private.person@example.org", "nobody@other.example"], { domains: ["example.org"] }));
  all.push(await post(suppress, env, "suppress", { email: "private.person@example.org", reason: "manual", source: "t" }));
  all.push(await post(event, env, "event", { email: "private.person@example.org", event: "reply", step: 1, segment: "contest" }));
  all.push(await post(check, env, "check", { emails: ["bad"] }, { key: "wrong-key-wrong-key-wrong" }));
  for (const r of all) { const s = JSON.stringify(r.body); assert.ok(!/@|private|person/i.test(s), s); }
  const log = rows(raw, "SELECT kind, detail FROM ops_log WHERE kind = 'outreach'");
  assert.ok(log.length >= 3);
  for (const l of log) assert.ok(!/@|private\.person/.test(l.detail), l.detail);
  assert.match(log[0].detail, /^check n=2 registered=1 listing=0 review=0 suppressed=0 clear=1$/);
});
test("plaintext prospect addresses are never stored in any outreach table", async () => {
  const { env, raw } = mk();
  const a = "Prospect.One@Example.org", b = "prospect.two+x@gmail.com";
  await chk(env, [a, b]);
  for (const e of [a, b]) { await post(suppress, env, "suppress", { email: e, reason: "reply", source: "t" }); await post(event, env, "event", { email: e, event: "sent", step: 0, segment: "installer" }); }
  const dump = JSON.stringify(["outreach_suppressions", "outreach_events", "outreach_rate", "ops_log"].map((t) => rows(raw, `SELECT * FROM ${t}`))).toLowerCase();
  for (const part of ["prospect.one", "prospect.two", "example.org", "gmail.com", "@"]) assert.ok(!dump.includes(part), "found " + part);
  assert.match(rows(raw, "SELECT email_hash FROM outreach_suppressions")[0].email_hash, /^[0-9a-f]{64}$/);
});
test("the salt comes from OUTREACH_SALT, then THROTTLE_SALT, then a constant", async () => {
  const hs = await Promise.all([{}, { THROTTLE_SALT: "t" }, { THROTTLE_SALT: "t", OUTREACH_SALT: "o" }, { OUTREACH_SALT: "o" }].map((e) => outreachHashes(e, "a@example.org")));
  assert.equal(new Set([hs[0].h, hs[1].h, hs[2].h]).size, 3); assert.equal(hs[2].h, hs[3].h);
});

// ---------------------------------------------------------------- the app feeds the suppression list
test("unsubscribing from the weekly alerts, a notification email or the monthly update adds the hash (reason unsubscribe, source app)", async () => {
  const { env, raw } = mk();
  raw.prepare("INSERT INTO alert_subs (id,email,city,lat,lng,token) VALUES ('a1','Weekly@Example.org','Pasadena',1,2,'tok-w'), ('a2','weekly2@example.org','Pasadena',1,2,'tok-w2')").run();
  await alertUnsubGet({ request: new Request("https://socallights.app/api/alerts/unsubscribe?t=tok-w"), env });
  await alertUnsubPost({ request: new Request("https://socallights.app/api/alerts/unsubscribe?t=tok-w2", { method: "POST" }), env });
  raw.prepare("INSERT INTO email_prefs (email,token) VALUES ('notify@example.org','" + "c".repeat(36) + "')").run();
  await unsubPost({ request: new Request("https://socallights.app/api/unsub?t=" + "c".repeat(36), { method: "POST", body: "List-Unsubscribe=One-Click" }), env });
  for (const e of ["weekly@example.org", "weekly2@example.org", "notify@example.org"]) {
    const r = rows(raw, "SELECT reason, source FROM outreach_suppressions WHERE email_hash = ?", (await outreachHashes(env, e)).h);
    assert.deepEqual(r, [{ reason: "unsubscribe", source: "app" }], e);
    assert.equal(await statusOf(env, e), "suppressed");
  }
  // turning the notifications back ON does not clear the suppression (they asked once)
  await unsubPost({ request: new Request("https://socallights.app/api/unsub", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ t: "c".repeat(36), optout: false }) }), env });
  assert.equal(await statusOf(env, "notify@example.org"), "suppressed");
});
test("a bad unsubscribe token adds nothing", async () => {
  const { env, raw } = mk();
  await alertUnsubGet({ request: new Request("https://socallights.app/api/alerts/unsubscribe?t=nope"), env });
  const r = await unsubPost({ request: new Request("https://socallights.app/api/unsub?t=" + "d".repeat(36), { method: "POST" }), env });
  assert.equal(r.status, 404);
  assert.equal(rows(raw, "SELECT * FROM outreach_suppressions").length, 0);
});
test("deleting an account adds the address hash to the suppression list and keeps no plaintext", async () => {
  const { env, raw } = mk({ PHOTOS: { delete: async () => {} } });
  const u = await addUser(raw, "uDel", "Leaving.User@Example.org");
  raw.prepare("INSERT INTO newsletter_optins (user_id,email,role,opted_in_at,token) VALUES ('uDel','leaving.user@example.org','family',datetime('now'),'" + "e".repeat(36) + "')").run();
  await deleteAccount(env, u.id, u.email);
  const r = rows(raw, "SELECT * FROM outreach_suppressions");
  assert.equal(r.length, 1); assert.equal(r[0].email_hash, (await outreachHashes(env, u.email)).h); assert.equal(r[0].source, "account_deleted");
  assert.equal(rows(raw, "SELECT * FROM newsletter_optins").length, 0, "the opt-in row goes with the account");
  assert.equal(rows(raw, "SELECT * FROM users").length, 0);
  assert.ok(!JSON.stringify(rows(raw, "SELECT * FROM outreach_suppressions")).toLowerCase().includes("leaving"));
  assert.equal(await statusOf(env, "leaving.user@example.org"), "suppressed");
});

// ---------------------------------------------------------------- admin
const admin = { ADMIN_DEV_BYPASS: "1" };
const adminReq = (method, body) => new Request("http://localhost/api/admin/outreach", { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
test("Admin > Outreach is behind the admin gate", async () => {
  const { env } = mk();
  const next = async () => new Response("passed");
  const denied = await adminGate({ request: new Request("https://socallights.app/api/admin/outreach"), env, data: {}, next });
  assert.equal(denied.status, 401);
  const ok = await adminGate({ request: adminReq("GET"), env: { ...env, ...admin }, data: {}, next });
  assert.equal(await ok.text(), "passed");
});
test("admin reconcile: counts by status, a row per input, nothing stored", async () => {
  const { env, raw } = mk();
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('u1','reg@reg.example','R')").run();
  raw.prepare("INSERT INTO posts (id,biz,title,city,lat,lng,descr,contact_email) VALUES ('p1','b','t','Pasadena',1,2,'d','lst@lst.example')").run();
  raw.prepare("INSERT INTO installers (id,slug,name,web) VALUES ('i1','a','A','acmelights.example')").run();
  await post(suppress, env, "suppress", { email: "sup@sup.example", reason: "manual", source: "t" });
  const list = ["reg@reg.example", "lst@lst.example", "info@acmelights.example", "sup@sup.example", "clear1@c1.example", "clear2@c2.example"];
  const before = JSON.stringify(["outreach_suppressions", "outreach_events", "users", "posts"].map((t) => rows(raw, `SELECT * FROM ${t}`)));
  const res = await adminPost({ request: adminReq("POST", { action: "reconcile", emails: list }), env });
  const j = await res.json();
  assert.deepEqual(j.counts, { registered: 1, listing: 1, review: 1, suppressed: 1, clear: 2 });
  assert.deepEqual(j.rows.map((r) => r.status), ["registered", "listing", "review", "suppressed", "clear", "clear"]);
  assert.ok(!/@/.test(JSON.stringify(j)), "no addresses in the answer");
  assert.equal(JSON.stringify(["outreach_suppressions", "outreach_events", "users", "posts"].map((t) => rows(raw, `SELECT * FROM ${t}`))), before, "nothing stored");
});
test("admin reconcile takes up to 500 addresses within the call cap, and refuses 501", async () => {
  const { env, DB } = mk();
  const emails = Array.from({ length: 500 }, (_, i) => `bulk${i}@example.org`);
  DB.stats.reset();
  const r = await adminPost({ request: adminReq("POST", { action: "reconcile", emails }), env });
  assert.equal(r.status, 200); const j = await r.json(); assert.equal(j.counts.clear, 500);
  assert.ok(DB.stats.calls <= 15, "calls: " + DB.stats.calls);
  assert.equal((await adminPost({ request: adminReq("POST", { action: "reconcile", emails: [...emails, "x@example.org"] }), env })).status, 400);
  assert.equal((await adminPost({ request: adminReq("POST", { action: "reconcile", emails: [] }), env })).status, 400);
});
test("admin panel data: suppression count and last entries are hash prefixes, results by segment and step, conversions joined by hash at read time", async () => {
  const { env, raw } = mk();
  const ev = (email, e, step, segment) => post(event, env, "event", { email, event: e, step, segment });
  await ev("will.register@example.org", "sent", 0, "installer"); await ev("will.register@example.org", "sent", 1, "installer");
  await ev("will.list@example.org", "sent", 0, "event_host");
  await ev("never@example.org", "sent", 0, "contest"); await ev("never@example.org", "reply", 0, "contest");
  await ev("bounce@example.org", "sent", 0, "contest"); await ev("bounce@example.org", "bounce", 0, "contest");
  await ev("old.user@example.org", "sent", 0, "installer");
  // they showed up after being emailed
  raw.prepare("INSERT INTO users (id,email,name,created_at) VALUES ('u1','Will.Register@example.org','W',datetime('now'))").run();
  raw.prepare("INSERT INTO event_submissions (id,name,city,season,type,start_date,end_date,contact_email) VALUES ('s1','Fest','Pasadena','christmas','walk','2026-12-01','2026-12-02','will.list@example.org')").run();
  // registered BEFORE they were emailed: not credited
  raw.prepare("INSERT INTO users (id,email,name,created_at) VALUES ('u2','old.user@example.org','O','2020-01-01 00:00:00')").run();
  const j = await (await adminGet({ request: adminReq("GET"), env })).json();
  const cell = (seg, step) => j.results.find((c) => c.segment === seg && c.step === step);
  assert.equal(cell("installer", 0).sent, 2); assert.equal(cell("installer", 1).sent, 1);
  assert.equal(cell("installer", 1).registered, 1, "credited to the latest step sent before they registered");
  assert.equal(cell("installer", 0).registered, 0);
  assert.equal(cell("event_host", 0).listed, 1);
  assert.equal(cell("contest", 0).replies, 1); assert.equal(cell("contest", 0).bounces, 1);
  assert.equal(j.totals.sent, 6); assert.equal(j.totals.registered, 1); assert.equal(j.totals.listed, 1);
  assert.equal(j.suppression.count, 2);
  assert.equal(j.suppression.last.length, 2);
  for (const l of j.suppression.last) { assert.match(l.prefix, /^[0-9a-f]{8}$/); assert.ok(["reply", "bounce"].includes(l.reason)); assert.equal(l.source, "outreach"); }
  assert.ok(!/@/.test(JSON.stringify(j)));
  // API health: last check time and counts
  await chk(env, ["a@example.org", "will.register@example.org"]);
  const h = (await (await adminGet({ request: adminReq("GET"), env })).json()).api;
  assert.equal(h.configured, true); assert.ok(h.lastCheckAt); assert.equal(h.lastCheck.emails, 2); assert.equal(h.lastCheck.registered, 1); assert.equal(h.week.calls, 1);
});

// ---------------------------------------------------------------- monthly update opt-in
const nlReq = (user, body, method = "POST") => new Request("https://socallights.app/api/me/newsletter", { method, headers: { cookie: user.cookie, "content-type": "application/json" }, body: method === "GET" ? undefined : JSON.stringify(body) });
test("monthly update: off by default for everyone (an account or a listing never subscribes anyone)", async () => {
  const { env, raw } = mk();
  const u = await addUser(raw, "u1", "fam@example.org");
  raw.prepare("INSERT INTO posts (id,biz,title,city,lat,lng,descr,contact_email,user_id) VALUES ('p1','b','t','Pasadena',1,2,'d','fam@example.org','u1')").run();
  const j = await (await nlGet({ request: nlReq(u, null, "GET"), env })).json();
  assert.equal(j.optin, null);
  assert.equal(rows(raw, "SELECT * FROM newsletter_optins").length, 0);
  assert.ok(j.config.disclosure.toLowerCase().includes("sponsored") && j.config.disclosure.toLowerCase().includes("affiliate"));
  assert.deepEqual(j.config.roles.map((r) => r.id), ["installer", "host", "family"]);
  assert.equal((await nlGet({ request: new Request("https://socallights.app/api/me/newsletter"), env })).status, 401);
});
test("monthly update: opting in records time, method, page and wording version; only valid topics for the role are kept", async () => {
  const { env, raw } = mk();
  const u = await addUser(raw, "u1", "inst@example.org");
  const r = await nlPost({ request: nlReq(u, { optin: true, role: "installer", topics: ["seasonal_reminders", "shop_suggestions", "outings", "bogus", "seasonal_reminders"], method: "profile checkbox", source_page: "profile" }), env });
  assert.equal(r.status, 200);
  const row = rows(raw, "SELECT * FROM newsletter_optins")[0];
  assert.equal(row.email, "inst@example.org"); assert.equal(row.user_id, "u1"); assert.equal(row.role, "installer");
  assert.deepEqual(JSON.parse(row.topics), ["seasonal_reminders", "shop_suggestions"]);
  assert.equal(row.method, "profile checkbox"); assert.equal(row.source_page, "profile"); assert.equal(row.consent_text_version, CONSENT_VERSION);
  assert.match(row.opted_in_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/); assert.equal(row.unsubscribed_at, null); assert.match(row.token, /^[a-f0-9]{36}$/);
  assert.ok((await chk(env, ["inst@example.org"])).body.results[0].reasons.includes("newsletter_optin"), "an active opt-in is a record in the app (and is not suppressed)");
  // changing role keeps the original time and method
  await nlPost({ request: nlReq(u, { optin: true, role: "host", topics: ["planning_tips"], method: "add-listing checkbox", source_page: "add-event" }), env });
  const again = rows(raw, "SELECT * FROM newsletter_optins")[0];
  assert.equal(again.role, "host"); assert.equal(again.method, "profile checkbox"); assert.equal(again.opted_in_at, row.opted_in_at); assert.equal(again.token, row.token);
  // bad input
  for (const bad of [{ optin: true, role: "boss", method: "profile checkbox", source_page: "profile" }, { optin: true, role: "family", method: "web", source_page: "profile" }, { optin: true, role: "family", method: "profile checkbox", source_page: "elsewhere" }, { role: "family" }, { optin: "yes", role: "family", method: "profile checkbox", source_page: "profile" }])
    assert.equal((await nlPost({ request: nlReq(u, bad), env })).status, 400, JSON.stringify(bad));
  // the add-listing path records how
  const v = await addUser(raw, "u2", "host@example.org");
  await nlPost({ request: nlReq(v, { optin: true, role: "host", topics: [], method: "add-listing checkbox", source_page: "add-contest" }), env });
  assert.deepEqual(rows(raw, "SELECT method, source_page FROM newsletter_optins WHERE user_id = 'u2'"), [{ method: "add-listing checkbox", source_page: "add-contest" }]);
  // cross-site posts are refused
  const x = new Request("https://socallights.app/api/me/newsletter", { method: "POST", headers: { cookie: v.cookie, origin: "https://evil.example", "content-type": "application/json" }, body: JSON.stringify({ optin: true, role: "family", method: "profile checkbox", source_page: "profile" }) });
  assert.equal((await nlPost({ request: x, env })).status, 403);
});
test("monthly update: the profile switch unsubscribes; opting in again records a new time and method", async () => {
  const { env, raw } = mk();
  const u = await addUser(raw, "u1", "fam@example.org");
  await nlPost({ request: nlReq(u, { optin: true, role: "family", topics: ["outings"], method: "profile checkbox", source_page: "profile" }), env });
  await nlPost({ request: nlReq(u, { optin: false }), env });
  const row = rows(raw, "SELECT * FROM newsletter_optins")[0];
  assert.ok(row.unsubscribed_at);
  assert.deepEqual(rows(raw, "SELECT reason, source FROM outreach_suppressions"), [{ reason: "unsubscribe", source: "app" }]);
  await nlPost({ request: nlReq(u, { optin: true, role: "family", topics: [], method: "add-listing checkbox", source_page: "add-house" }), env });
  const back = rows(raw, "SELECT * FROM newsletter_optins")[0];
  assert.equal(back.unsubscribed_at, null); assert.equal(back.method, "add-listing checkbox"); assert.equal(back.source_page, "add-house");
});
const prefs = (t, body, method = "POST") => ({ request: new Request("https://socallights.app/api/prefs" + (t ? "?t=" + t : ""), { method, headers: { "content-type": "application/json" }, body: body === undefined || method === "GET" ? undefined : typeof body === "string" ? body : JSON.stringify(body) }) });
test("preferences page: token validation, change role and topics, unsubscribe, one-click, no login", async () => {
  const { env, raw } = mk();
  const u = await addUser(raw, "u1", "pat@example.org");
  await nlPost({ request: nlReq(u, { optin: true, role: "family", topics: ["outings"], method: "profile checkbox", source_page: "profile" }), env });
  const t = rows(raw, "SELECT token FROM newsletter_optins")[0].token;
  for (const bad of ["", "nope", "A".repeat(36), "f".repeat(36), t.slice(0, 35)]) {
    assert.equal((await prefsGet({ ...prefs(bad, undefined, "GET"), env })).status, 404, "GET " + bad);
    assert.equal((await prefsPost({ ...prefs(bad, { action: "unsubscribe" }), env })).status, 404, "POST " + bad);
  }
  const g = await (await prefsGet({ ...prefs(t, undefined, "GET"), env })).json();
  assert.equal(g.active, true); assert.equal(g.role, "family"); assert.deepEqual(g.topics, ["outings"]);
  assert.ok(!g.email.includes("pat@") && g.email.endsWith("@example.org"), "masked");
  const s = await prefsPost({ ...prefs(t, { t, action: "save", role: "host", topics: ["opportunities", "outings"] }), env });
  assert.equal(s.status, 200);
  assert.deepEqual(rows(raw, "SELECT role, topics FROM newsletter_optins").map((r) => [r.role, JSON.parse(r.topics)])[0], ["host", ["opportunities"]]);
  assert.equal((await prefsPost({ ...prefs(t, { t, action: "save", role: "boss" }), env })).status, 400);
  // one-click (RFC 8058): a form body, token in the query string
  const one = await prefsPost({ ...prefs(t, "List-Unsubscribe=One-Click"), env });
  assert.equal(one.status, 200);
  assert.ok(rows(raw, "SELECT unsubscribed_at FROM newsletter_optins")[0].unsubscribed_at);
  assert.deepEqual(rows(raw, "SELECT reason, source FROM outreach_suppressions"), [{ reason: "unsubscribe", source: "app" }]);
  assert.equal((await prefsPost({ ...prefs(t, { t, action: "save", role: "family" }), env })).status, 409, "no re-subscribing through the link");
  assert.equal((await prefsPost({ ...prefs(t, { t, action: "unsubscribe" }), env })).status, 200, "unsubscribing twice is fine");
  assert.equal(rows(raw, "SELECT * FROM outreach_suppressions").length, 1);
});
test("the future newsletter gets List-Unsubscribe and List-Unsubscribe-Post pointing at the same prefs machinery, and nothing without an active opt-in", async () => {
  const { env, raw } = mk();
  const u = await addUser(raw, "u1", "pat@example.org");
  assert.equal(await newsletterLinks(env, "pat@example.org"), null);
  await nlPost({ request: nlReq(u, { optin: true, role: "family", topics: [], method: "profile checkbox", source_page: "profile" }), env });
  const t = rows(raw, "SELECT token FROM newsletter_optins")[0].token;
  const l = await newsletterLinks(env, "PAT@example.org");
  assert.equal(l.prefsUrl, "https://socallights.app/prefs?t=" + t);
  assert.match(l.headers["List-Unsubscribe"], new RegExp("<https://socallights.app/api/prefs\\?t=" + t + ">"));
  assert.equal(l.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  await nlPost({ request: nlReq(u, { optin: false }), env });
  assert.equal(await newsletterLinks(env, "pat@example.org"), null);
});
test("retention: unsubscribed opt-ins go after 12 months, active ones stay; the suppression list stays", async () => {
  const { env, raw } = mk();
  raw.prepare("INSERT INTO newsletter_optins (email,role,opted_in_at,token,unsubscribed_at) VALUES ('old@example.org','family','2020-01-01','" + "1".repeat(36) + "','2020-02-01 00:00:00'), ('recent@example.org','family','2020-01-01','" + "2".repeat(36) + "',datetime('now')), ('active@example.org','family','2020-01-01','" + "3".repeat(36) + "',NULL)").run();
  await post(suppress, env, "suppress", { email: "old@example.org", reason: "unsubscribe", source: "app" });
  await env.DB.batch(retentionStatements(env));
  assert.deepEqual(rows(raw, "SELECT email FROM newsletter_optins ORDER BY email").map((r) => r.email), ["active@example.org", "recent@example.org"]);
  assert.equal(rows(raw, "SELECT * FROM outreach_suppressions").length, 1);
});

// ---------------------------------------------------------------- the pages
const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
test("the Profile control and the add-form checkboxes are unchecked by default and are not remembered in drafts", () => {
  const prof = read("public/profile.html");
  assert.match(prof, /Email me a monthly update with seasonal recommendations/);
  assert.match(prof, /data-nl-on/);
  assert.ok(!/data-nl-on[^>]*\bchecked\b(?![^>]*\$\{)/.test(prof.replace(/\$\{[^}]*\}/g, "")), "the switch is never checked in the markup by itself");
  for (const f of ["add-house", "add-event", "add-contest"]) {
    const s = read(`public/${f}.html`);
    assert.match(s, /nlCheck\(/, f); assert.match(s, /nlSave\(/, f); assert.match(s, /noPersist: \[[^\]]*"nl"/, f + " does not save the box in drafts");
  }
  const af = read("public/addflow.js");
  assert.match(af, /export const nlCheck/); assert.match(af, /export async function nlSave/);
  assert.ok(!/data-k="nl"[^>]*checked/.test(af));
});
test("prefs page exists, is noindex, and the privacy policy tells the truth about outreach and the monthly update", () => {
  const p = read("public/prefs.html");
  assert.match(p, /noindex/); assert.match(p, /\/api\/prefs/);
  const pr = read("public/privacy.html");
  assert.match(pr, /public sources/i); assert.match(pr, /one-way hash/i); assert.match(pr, /monthly update/i); assert.match(pr, /sponsored|affiliate/i);
});
