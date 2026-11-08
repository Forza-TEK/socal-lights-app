// Free-plan limits per request (docs/runbooks/cloudflare-limits.md): 50 outgoing calls (fetch and every D1 query count), 100 bound parameters per D1 query.
// The in-memory D1 stand-in now enforces the 100-parameter cap and counts calls (DB.stats.calls), and fetch is stubbed (nothing leaves the machine, no real email).
import test from "node:test";
import assert from "node:assert/strict";
import { makeDB } from "./_d1.mjs";
import { newEnv, addUser, stubFetch, ptToday } from "./_pay.mjs";
import { onRequestPatch as contestPatch } from "../functions/api/contests/[slug].js";
import { onRequestPost as drainPost } from "../functions/api/mail/drain.js";
import { onRequestPost as remindPost } from "../functions/api/contest-remind.js";
import { onRequestPost as alertsSend } from "../functions/api/alerts/send.js";
import { onRequestPost as invitePost } from "../functions/api/contests/[slug]/invite.js";
import { onRequestGet as postsGet } from "../functions/api/posts.js";
import { enqueueMail, drainMail, sendNow, MAX_ATTEMPTS } from "../functions/_lib/mailbatch.js";
import { selectIn } from "../functions/_lib/dbchunk.js";
import { opsSince } from "../functions/_lib/oplog.js";

const KEY = "cron-key-0123456789abc";
const origin = "https://socallights.app";
const ALL = "2000-01-01 00:00:00";

// A Resend stub that records every call. `fail(call)` can answer with a status.
function resend(fail) {
  const calls = [];
  const f = stubFetch((url, init) => {
    const u = String(url);
    if (!u.startsWith("https://api.resend.com/")) return new Response("{}", { status: 200 });
    const body = JSON.parse(init.body); const call = { url: u, body, n: Array.isArray(body) ? body.length : 1, headers: init.headers };
    calls.push(call);
    const st = fail ? fail(call, calls.length) : 200;
    return new Response(JSON.stringify(st === 200 ? { data: (Array.isArray(body) ? body : [body]).map((_, i) => ({ id: "m" + i })) } : { message: "no" }), { status: st });
  });
  return { calls, restore: f.restore, all: f.calls };
}
const mailsTo = (calls) => calls.flatMap((c) => (Array.isArray(c.body) ? c.body : [c.body]).flatMap((m) => m.to));
const rows = (raw, sql, ...a) => JSON.parse(JSON.stringify(raw.prepare(sql).all(...a)));

test("the D1 stand-in refuses more than 100 bound parameters (as D1 does) and counts calls", async () => {
  const { DB } = makeDB();
  const ids = Array.from({ length: 101 }, (_, i) => "id" + i);
  await assert.rejects(DB.prepare(`SELECT id FROM posts WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all(), /too many SQL variables/);
  const ok = ids.slice(0, 100);
  assert.deepEqual((await DB.prepare(`SELECT id FROM posts WHERE id IN (${ok.map(() => "?").join(",")})`).bind(...ok).all()).results, []);
  DB.stats.reset(); await DB.prepare("SELECT 1 AS x").first(); await DB.batch([DB.prepare("SELECT 1"), DB.prepare("SELECT 2")]);
  assert.equal(DB.stats.calls, 2, "a batch is one call");
});

test("selectIn reads 300 ids in slices of 90", async () => {
  const { env, raw } = newEnv();
  for (let i = 0; i < 300; i++) raw.prepare("INSERT INTO users (id,email,name) VALUES (?,?,?)").run("u" + i, `u${i}@x.com`, "");
  env.DB.stats.reset();
  const got = await selectIn(env, "SELECT id FROM users WHERE id IN ({IN})", Array.from({ length: 300 }, (_, i) => "u" + i));
  assert.equal(got.length, 300); assert.equal(env.DB.stats.calls, 4);
});

// ---- (a) results emails ----
async function contestWith(n, o = {}) {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_fake", ALERT_CRON_KEY: KEY, ...(o.env || {}) });
  const owner = await addUser(raw, "uO", "owner@city.gov");
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval,one_win) VALUES ('c1','big',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)")
    .run("uO", "Big Contest", "City", "Pasadena", "Los Angeles", "christmas", "live", ptToday(-9), ptToday(-8), ptToday(-1), JSON.stringify(["Best Overall"]), "public", "pick", "owner@city.gov", "d", "manual");
  const ins = raw.prepare("INSERT INTO users (id,email,name) VALUES (?,?,?)"), post = raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,contest_id,user_id,entry_no,approved_at) VALUES (?,'approved','b','t','Pasadena',34.1,-118.1,'d','[]',?,'christmas',?,?,'91101','c1',?,?,datetime('now'))");
  for (let i = 0; i < n; i++) { ins.run("e" + i, `entrant${i}@example.com`, ""); post.run("p" + i, `entrant${i}@example.com`, `${i + 1} Oak St`, `${i + 1} Oak St`, "e" + i, i + 1); }
  for (let i = 0; i < n; i += 3) raw.prepare("INSERT INTO votes (id,contest_id,user_id,post_id,category) VALUES (?,?,?,?,?)").run("v" + i, "c1", "e" + ((i + 1) % n), "p" + i, "Best Overall");
  return { env, raw, owner };
}
const announce = (t, waitUntil) => contestPatch({ params: { slug: "big" }, request: new Request(`${origin}/api/contests/big`, { method: "PATCH", headers: { "content-type": "application/json", cookie: t.owner.cookie }, body: JSON.stringify({ action: "announce", force: true }) }), env: t.env, waitUntil });
const drain = (env) => drainPost({ request: new Request(`${origin}/api/mail/drain`, { method: "POST", headers: { "x-alert-key": KEY } }), env }).then((r) => r.json());

test("announcing a contest with 250 entrants emails every one of them (batched, no per-recipient calls), the organizer too", async () => {
  const t = await contestWith(250), r = resend(), jobs = [];
  try {
    t.env.DB.stats.reset(); const f0 = r.all.length;
    const res = await announce(t, (p) => jobs.push(p));
    assert.equal(res.status, 200, await res.clone().text());
    await Promise.all(jobs);
    const during = r.all.length - f0 + t.env.DB.stats.calls;
    assert.ok(during < 50, `the announce request made ${during} outgoing calls`);
    assert.equal(rows(t.raw, "SELECT COUNT(*) n FROM mail_outbox")[0].n, 251, "250 entrants and the organizer are queued");
    // the hourly workflow sends the rest
    let guard = 0, out;
    do { t.env.DB.stats.reset(); const f1 = r.all.length; out = await drain(t.env); assert.ok(r.all.length - f1 + t.env.DB.stats.calls < 50, "a drain request stays under the cap"); } while (out.remaining > 0 && ++guard < 12);
    assert.equal(out.remaining, 0);
    const to = mailsTo(r.calls);
    assert.equal(new Set(to).size, 251, "each of the 250 entrants and the organizer got exactly one email");
    assert.equal(to.length, 251);
    for (let i = 0; i < 250; i++) assert.ok(to.includes(`entrant${i}@example.com`), "entrant " + i);
    assert.ok(r.calls.every((c) => c.url === "https://api.resend.com/emails/batch" && c.n <= 100), "only batch calls of at most 100");
    assert.ok(r.calls.length <= 8, "251 emails took " + r.calls.length + " Resend calls");
    assert.equal(rows(t.raw, "SELECT COUNT(*) n FROM mail_outbox WHERE status = 'sent'")[0].n, 251);
    assert.equal(rows(t.raw, "SELECT COUNT(*) n FROM mail_outbox WHERE status = 'queued'")[0].n, 0);
    assert.equal(rows(t.raw, "SELECT COUNT(*) n FROM mail_outbox WHERE vars != '{}'")[0].n, 0, "message values are cleared once sent");
    // announcing again queues nothing twice
    const again = rows(t.raw, "SELECT COUNT(*) n FROM mail_outbox")[0].n;
    assert.equal(await enqueueMail(t.env, [{ id: "results_organizer", to: "owner@city.gov", dedupe: "results:c1:results_organizer", vars: {} }]), 0);
    assert.equal(rows(t.raw, "SELECT COUNT(*) n FROM mail_outbox")[0].n, again);
  } finally { r.restore(); }
});

test("a failed batch is retried later, never dropped; permanent failure is logged to ops_log without addresses", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_fake", ALERT_CRON_KEY: KEY });
  let down = true; const r = resend(() => (down ? 500 : 200));
  try {
    await enqueueMail(env, Array.from({ length: 30 }, (_, i) => ({ id: "results_entrant", to: `n${i}@example.com`, vars: { contest: "C", winners: "W", link: origin } })));
    let out = await drainMail(env);
    assert.equal(out.sent, 0); assert.equal(out.retrying, 30);
    assert.equal(rows(raw, "SELECT COUNT(*) n FROM mail_outbox WHERE status = 'queued'")[0].n, 30, "still queued");
    assert.equal((await drainMail(env)).claimed, 0, "not due yet (10 minute back-off)");
    raw.prepare("UPDATE mail_outbox SET next_at = datetime('now','-1 minute')").run();
    down = false; out = await drainMail(env);
    assert.equal(out.sent, 30);
    assert.equal(new Set(mailsTo(r.calls.filter((c, i) => i > 0))).size, 30);
    const logged = await opsSince(env, ALL);
    assert.ok(logged.some((g) => g.kind === "email" && /not sent/.test(g.example)), "the failed attempt was logged");
    assert.doesNotMatch(JSON.stringify(logged), /@example\.com/);
    // 8 failed tries in a row: marked failed and logged
    await enqueueMail(env, [{ id: "results_entrant", to: "stuck@example.com", vars: { contest: "C", winners: "W", link: origin } }]);
    down = true;
    for (let i = 0; i < MAX_ATTEMPTS; i++) { raw.prepare("UPDATE mail_outbox SET next_at = datetime('now','-1 minute') WHERE status = 'queued'").run(); await drainMail(env); }
    const row = rows(raw, "SELECT status, attempts FROM mail_outbox WHERE to_email = 'stuck@example.com'")[0];
    assert.equal(row.status, "failed"); assert.equal(row.attempts, MAX_ATTEMPTS);
    assert.ok((await opsSince(env, ALL)).some((g) => g.kind === "email" && /failed for good/.test(g.example)));
  } finally { r.restore(); }
});

test("one refused address does not block the rest of its batch (the batch is split and the bad one is marked failed)", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_fake" });
  const r = resend((c) => (c.body.some((m) => m.to.includes("bad@example.com")) ? 422 : 200));
  try {
    await enqueueMail(env, ["a", "b", "bad", "c", "d", "e"].map((n) => ({ id: "results_entrant", to: `${n}@example.com`, vars: { contest: "C", winners: "W", link: origin } })));
    const out = await drainMail(env);
    assert.equal(out.sent, 5); assert.equal(out.failed, 1);
    assert.equal(rows(raw, "SELECT status FROM mail_outbox WHERE to_email = 'bad@example.com'")[0].status, "failed");
    assert.deepEqual([...new Set(mailsTo(r.calls.filter((c) => !c.body.some((m) => m.to.includes("bad@example.com")))))].sort(), ["a@example.com", "b@example.com", "c@example.com", "d@example.com", "e@example.com"]);
  } finally { r.restore(); }
});

test("a mail quota answer (429) pauses the run without using up attempts, and unsubscribed people are skipped", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_fake" });
  let quota = true; const r = resend(() => (quota ? 429 : 200));
  try {
    raw.prepare("INSERT INTO email_prefs (email, token, optout) VALUES ('out@example.com','tok-out',1)").run();
    await enqueueMail(env, ["x", "out", "y"].map((n) => ({ id: "results_entrant", to: `${n}@example.com`, vars: { contest: "C", winners: "W", link: origin } })));
    let out = await drainMail(env);
    assert.equal(out.paused, true); assert.equal(out.retrying, 2); assert.equal(out.skipped, 1);
    assert.equal(rows(raw, "SELECT attempts FROM mail_outbox WHERE to_email = 'x@example.com'")[0].attempts, 0, "quota does not use up an attempt");
    raw.prepare("UPDATE mail_outbox SET next_at = datetime('now','-1 minute')").run(); quota = false;
    out = await drainMail(env); assert.equal(out.sent, 2);
    assert.ok(!mailsTo(r.calls).includes("out@example.com"));
  } finally { r.restore(); }
});

test("sendNow: 10 invitations are one Resend call, with unsubscribe headers per person; invite endpoint reports the count", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_fake" });
  const owner = await addUser(raw, "uO", "owner@city.gov");
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval) VALUES ('c1','big',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run("uO", "Big", "City", "Pasadena", "LA", "christmas", "live", ptToday(5), ptToday(8), ptToday(20), '["A"]', "public", "pick", "owner@city.gov", "d", "manual");
  const r = resend();
  try {
    env.DB.stats.reset(); const f0 = r.all.length;
    const res = await invitePost({ params: { slug: "big" }, request: new Request(`${origin}/api/contests/big/invite`, { method: "POST", headers: { "content-type": "application/json", cookie: owner.cookie }, body: JSON.stringify({ emails: Array.from({ length: 10 }, (_, i) => `nb${i}@example.com`) }) }), env });
    assert.equal(res.status, 200); const j = await res.json(); assert.equal(j.sent, 10);
    assert.equal(r.calls.length, 1); assert.equal(r.calls[0].n, 10);
    assert.ok(r.calls[0].body.every((m) => m.headers && /unsubscribe\?t=|api\/unsub\?t=/.test(m.headers["List-Unsubscribe"])));
    assert.ok(r.all.length - f0 + env.DB.stats.calls < 50);
  } finally { r.restore(); }
});

test("voting reminders: 150 entrants are queued once (a rerun adds nothing) and all get mail", async () => {
  const t = await contestWith(150); const r = resend();
  try {
    t.raw.prepare("UPDATE contests SET vote_start = ?, vote_end = ? WHERE id = 'c1'").run(ptToday(-1), ptToday(1));
    const go = () => remindPost({ request: new Request(`${origin}/api/contest-remind`, { method: "POST", headers: { "x-alert-key": KEY } }), env: t.env }).then((x) => x.json());
    t.env.DB.stats.reset(); const f0 = r.all.length;
    const a = await go();
    assert.ok(r.all.length - f0 + t.env.DB.stats.calls < 50, "the reminder run stays under the cap");
    assert.equal(a.queued.open, 150); assert.equal(a.queued.close, 150);
    let out; let guard = 0; do { out = await drain(t.env); } while (out.remaining > 0 && ++guard < 12);
    assert.equal(rows(t.raw, "SELECT COUNT(*) n FROM mail_outbox WHERE status = 'sent'")[0].n, 300);
    const b = await go(); assert.equal(b.queued.open + b.queued.close, 0, "each reminder is queued and sent once per contest");
    assert.equal(new Set(mailsTo(r.calls)).size, 150);
  } finally { r.restore(); }
});

test("weekly alerts: 40 subscribers are one Resend call, not 100", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_fake", ALERT_CRON_KEY: KEY });
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,lat,lng,url) VALUES ('ev1','Show','LA','Pasadena','walk',?,?,34,-118,'https://x.org')").run(ptToday(1), ptToday(5));
  for (let i = 0; i < 40; i++) raw.prepare("INSERT INTO alert_subs (id,email,city,lat,lng,radius,token,confirmed) VALUES (?,?,?,?,?,?,?,1)").run("s" + i, `s${i}@example.com`, "Pasadena", 34, -118, 25, "tok" + i);
  const r = resend();
  try {
    env.DB.stats.reset(); const f0 = r.all.length;
    const out = await alertsSend({ request: new Request(`${origin}/api/alerts/send`, { method: "POST", headers: { "x-alert-key": KEY } }), env }).then((x) => x.json());
    assert.equal(out.sent, 40); assert.equal(r.calls.length, 1);
    assert.ok(r.all.length - f0 + env.DB.stats.calls < 50, "calls: " + (r.all.length - f0 + env.DB.stats.calls));
  } finally { r.restore(); }
});

// ---- (c) posts ----
test("/api/posts with 300 winning homes works (D1 100-parameter cap) and logs, not swallows, a failure", async () => {
  const { env, raw } = newEnv();
  const ins = raw.prepare("INSERT INTO users (id,email,name) VALUES (?,?,?)"), post = raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,contest_id,user_id,approved_at) VALUES (?,'approved','b','t','Pasadena',34.1,-118.1,'d','[]',?,'christmas',?,?,'91101',NULL,?,datetime('now'))");
  const ids = [];
  for (let i = 0; i < 300; i++) { ins.run("u" + i, `w${i}@example.com`, ""); post.run("p" + i, `w${i}@example.com`, `${i + 1} Oak St`, `${i + 1} Oak St`, "u" + i); ids.push("p" + i); }
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,announced,results,contact_email,descr,approval) VALUES ('c9','old','u0','Old','City','Pasadena','LA','christmas','live',?,?,?,'[]',1,?,'o@x.com','d','manual')")
    .run(ptToday(-60), ptToday(-59), ptToday(-50), JSON.stringify({ awards: [{ category: "A", kind: "pick", label: "Grand", ids }] }));
  env.DB.stats.reset();
  const res = await postsGet({ env }); assert.equal(res.status, 200);
  const out = await res.json();
  assert.equal(out.length, 300); assert.equal(out.filter((p) => p.b && p.b.length).length, 300, "every winner keeps the crown");
  assert.ok(env.DB.stats.calls < 50, "calls: " + env.DB.stats.calls);
  assert.equal((await opsSince(env, ALL)).length, 0);
  // a failing lookup is logged and the list is still served
  const bad = { ...env, DB: { ...env.DB, prepare: (sql) => { if (/FROM users WHERE id IN/.test(sql)) throw new Error("D1_ERROR: boom"); return env.DB.prepare(sql); } } };
  const res2 = await postsGet({ env: bad }); assert.equal(res2.status, 200); assert.equal((await res2.json()).length, 300);
  assert.ok((await opsSince(env, ALL)).some((g) => g.kind === "posts" && /boom/.test(g.example)));
});
