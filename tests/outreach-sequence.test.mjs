// Run with: node --test tests/   (Outreach API: server-side sequence timing, backfill with sent_at, the deliverability pre-check, the 'invalid' event.)
// No real email address and no network: every address is @example.* or a made-up test domain, DNS-over-HTTPS is a stub.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newEnv } from "./_pay.mjs";
import { stubFetch, freezeNow } from "./_pay.mjs";
import { outreachHashes, sequenceFor } from "../functions/_lib/outreach.js";
import { strictSyntax, DISPOSABLE } from "../functions/_lib/deliverability.js";
import { shiftDay } from "../functions/_lib/time.js";
import { onRequest as check } from "../functions/api/outreach/check.js";
import { onRequest as suppress } from "../functions/api/outreach/suppress.js";
import { onRequest as event } from "../functions/api/outreach/event.js";
import { onRequestGet as adminGet, onRequestPost as adminPost } from "../functions/api/admin/outreach.js";

const KEY = "test-outreach-key-0123456789abcdef";
const NOON = "2026-11-20T20:00:00Z"; // 12:00 Pacific on 2026-11-20
const TODAY = "2026-11-20";
const mk = (extra = {}) => { const { env, raw } = newEnv({ OUTREACH_API_KEY: KEY, ...extra }); return { env, raw, DB: env.DB }; };
const post = (handler, env, path, body) => handler({ request: new Request("https://socallights.app/api/outreach/" + path, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + KEY }, body: JSON.stringify(body) }), env }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
const rows = (raw, sql, ...a) => raw.prepare(sql).all(...a).map((r) => ({ ...r }));
// a stored 'sent' (or other) event on a given day, as if Grok had reported it then
async function seed(env, raw, email, step, day, ev = "sent", segment = "installer") {
  const { h, n } = await outreachHashes(env, email);
  raw.prepare("INSERT INTO outreach_events (email_hash, alias_hash, event, step, segment, day) VALUES (?,?,?,?,?,?)").run(h, n === h ? "" : n, ev, step, segment, day);
}
const seqOf = async (env, email) => (await post(check, env, "check", { emails: [email] })).body.results[0].sequence;
const ago = (n) => shiftDay(TODAY, -n);
const withClock = async (iso, fn) => { const undo = freezeNow(iso); try { return await fn(); } finally { undo(); } };

// ---------------------------------------------------------------- sequence math
test("sequence: no 'sent' event yet means the original is due now", async () => {
  await withClock(NOON, async () => {
    const { env } = mk();
    assert.deepEqual(await seqOf(env, "new.person@example.org"), { next_step: 0, due: true, due_on: TODAY, reason: "no_original_sent_yet" });
  });
});
test("sequence: follow-up 1 is due 4 days after the original (not on days 0 to 3, due on day 4 and 5)", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    for (const [age, due] of [[0, false], [1, false], [3, false], [4, true], [5, true]]) {
      const email = `d${age}@example.org`;
      await seed(env, raw, email, 0, ago(age));
      const s = await seqOf(env, email);
      assert.equal(s.next_step, 1, "age " + age); assert.equal(s.due, due, "age " + age); assert.equal(s.due_on, shiftDay(ago(age), 4));
      assert.equal(s.reason, due ? "due" : "not_due_yet");
    }
  });
});
test("sequence: follow-up 2 is due 10 days after the ORIGINAL, only once follow-up 1 was sent (day 9 no, 10 and 11 yes)", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    for (const [age, due] of [[9, false], [10, true], [11, true]]) {
      const email = `f${age}@example.org`;
      await seed(env, raw, email, 0, ago(age)); await seed(env, raw, email, 1, ago(age - 5));
      const s = await seqOf(env, email);
      assert.deepEqual(s, { next_step: 2, due, due_on: shiftDay(ago(age), 10), reason: due ? "due" : "not_due_yet" }, "age " + age);
    }
    // follow-up 1 not sent yet: follow-up 2 is never offered ahead of it
    await seed(env, raw, "skip@example.org", 0, ago(12));
    assert.equal((await seqOf(env, "skip@example.org")).next_step, 1);
  });
});
test("sequence: more than 14 days overdue is a hold for the owner (overdue_hold, due false); exactly 14 still goes", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    await seed(env, raw, "late14@example.org", 0, ago(18)); // follow-up 1 was due on day 4 = 14 days ago
    await seed(env, raw, "late15@example.org", 0, ago(19)); // 15 days ago
    const a = await seqOf(env, "late14@example.org"), b = await seqOf(env, "late15@example.org");
    assert.deepEqual(a, { next_step: 1, due: true, due_on: ago(14), reason: "due" });
    assert.deepEqual(b, { next_step: 1, due: false, due_on: ago(15), reason: "overdue_hold" });
    await seed(env, raw, "late2@example.org", 0, ago(40)); await seed(env, raw, "late2@example.org", 1, ago(30));
    assert.deepEqual(await seqOf(env, "late2@example.org"), { next_step: 2, due: false, due_on: ago(30), reason: "overdue_hold" });
  });
});
test("sequence: after follow-up 2 it is finished and never restarts, however long ago", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    for (const [email, age] of [["fin1@example.org", 11], ["fin2@example.org", 100]]) { await seed(env, raw, email, 0, ago(age)); await seed(env, raw, email, 1, ago(age - 5)); await seed(env, raw, email, 2, ago(age - 10)); }
    for (const email of ["fin1@example.org", "fin2@example.org"]) assert.deepEqual(await seqOf(env, email), { next_step: null, due: false, due_on: null, reason: "sequence_finished" });
  });
});
test("sequence: a reply, bounce, complaint or unsubscribe stops it (reason says which); so does any status but clear", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    for (const ev of ["reply", "bounce", "complaint", "unsubscribe"]) {
      const email = `${ev}@example.org`;
      await seed(env, raw, email, 0, ago(6)); // follow-up 1 would be due
      assert.equal((await seqOf(env, email)).due, true);
      assert.equal((await post(event, env, "event", { email, event: ev, step: 0, segment: "installer" })).status, 200);
      assert.deepEqual(await seqOf(env, email), { next_step: null, due: false, due_on: null, reason: ev });
    }
    await seed(env, raw, "sup@example.org", 0, ago(6));
    await post(suppress, env, "suppress", { email: "sup@example.org", reason: "manual", source: "t" });
    assert.deepEqual(await seqOf(env, "sup@example.org"), { next_step: null, due: false, due_on: null, reason: "status_suppressed" });
    raw.prepare("INSERT INTO users (id,email,name) VALUES ('u1','reg@example.org','R')").run();
    await seed(env, raw, "reg@example.org", 0, ago(6));
    assert.equal((await seqOf(env, "reg@example.org")).reason, "status_registered");
    raw.prepare("INSERT INTO posts (id,biz,title,city,lat,lng,descr,contact_email) VALUES ('p1','b','t','Pasadena',1,2,'d','lst@example.org')").run();
    assert.deepEqual(await seqOf(env, "lst@example.org"), { next_step: null, due: false, due_on: null, reason: "status_listing" });
    const r = await post(check, env, "check", { emails: ["bad"] });
    assert.deepEqual(r.body.results[0].sequence, { next_step: null, due: false, due_on: null, reason: "status_review" });
  });
});
test("sequence: a segment mismatch between events is ignored (the earliest original counts); a follow-up with no original is not guessed", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    await seed(env, raw, "seg@example.org", 0, ago(10), "sent", "installer"); await seed(env, raw, "seg@example.org", 0, ago(2), "sent", "contest"); await seed(env, raw, "seg@example.org", 1, ago(5), "sent", "event_host");
    assert.deepEqual(await seqOf(env, "seg@example.org"), { next_step: 2, due: true, due_on: TODAY, reason: "due" });
    await seed(env, raw, "orphan@example.org", 1, ago(2));
    assert.deepEqual(await seqOf(env, "orphan@example.org"), { next_step: null, due: false, due_on: null, reason: "missing_original" });
  });
});
test("sequence: the same person's +tag or Gmail-dots spelling shares the history", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    await seed(env, raw, "first.last@gmail.com", 0, ago(5));
    assert.equal((await seqOf(env, "firstlast+x@gmail.com")).next_step, 1);
  });
});
test("sequence: Pacific date boundaries (the day changes at Pacific midnight, in winter and in summer)", async () => {
  const { env, raw } = mk();
  await withClock("2026-11-21T07:30:00Z", async () => { // 23:30 PST on the 20th
    await seed(env, raw, "edge@example.org", 0, "2026-11-16");
    assert.deepEqual(await seqOf(env, "edge@example.org"), { next_step: 1, due: true, due_on: "2026-11-20", reason: "due" });
    await seed(env, raw, "edge2@example.org", 0, "2026-11-17");
    assert.equal((await seqOf(env, "edge2@example.org")).due, false, "due on the 21st, not yet");
  });
  await withClock("2026-11-21T08:30:00Z", async () => assert.equal((await seqOf(env, "edge2@example.org")).due, true, "00:30 PST on the 21st"));
  await withClock("2026-06-15T06:59:00Z", async () => { // 23:59 PDT on the 14th
    await seed(env, raw, "sum@example.org", 0, "2026-06-11");
    assert.equal((await seqOf(env, "sum@example.org")).due, false);
  });
  await withClock("2026-06-15T07:00:00Z", async () => assert.equal((await seqOf(env, "sum@example.org")).due, true)); // midnight PDT
});
test("sequenceFor is pure: the same inputs give the same answer", () => {
  assert.deepEqual(sequenceFor([{ event: "sent", step: 0, day: "2026-11-16" }], "clear", "2026-11-20"), { next_step: 1, due: true, due_on: "2026-11-20", reason: "due" });
  assert.equal(sequenceFor([], "review", "2026-11-20").next_step, null);
});

// ---------------------------------------------------------------- backfill (sent_at)
test("backfill: sent_at records an earlier send; the sequence follows it; the response says so", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    const r = await post(event, env, "event", { email: "old.send@example.org", event: "sent", step: 0, segment: "installer", sent_at: ago(10) });
    assert.equal(r.status, 200); assert.equal(r.body.ok, true);
    assert.deepEqual(rows(raw, "SELECT event, step, day FROM outreach_events"), [{ event: "sent", step: 0, day: ago(10) }]);
    assert.deepEqual(await seqOf(env, "old.send@example.org"), { next_step: 1, due: true, due_on: ago(6), reason: "due" });
  });
});
test("backfill: idempotent per address and step, the earliest sent_at wins, and a later backfill never overrides an earlier or real event", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    const send = (extra) => post(event, env, "event", { email: "idem@example.org", event: "sent", step: 0, segment: "installer", ...extra });
    await send({ sent_at: ago(5) });
    let r = await send({ sent_at: ago(5) }); assert.equal(r.body.duplicate, true);
    r = await send({ sent_at: ago(2) }); assert.equal(r.body.duplicate, true); assert.equal(r.body.day, ago(5), "later date does not override");
    r = await send({ sent_at: ago(8) }); assert.equal(r.body.day, ago(8), "earlier date wins");
    assert.deepEqual(rows(raw, "SELECT day FROM outreach_events"), [{ day: ago(8) }], "still one row");
    // a real event today (no sent_at) next to an earlier backfill: the sequence keeps counting from the earlier date
    await send({});
    assert.equal((await seqOf(env, "idem@example.org")).due_on, ago(4));
    // another step is independent
    await post(event, env, "event", { email: "idem@example.org", event: "sent", step: 1, segment: "installer", sent_at: ago(3) });
    assert.equal(rows(raw, "SELECT 1 FROM outreach_events WHERE step = 1").length, 1);
    // a real event today first, then an earlier backfill moves it earlier
    await post(event, env, "event", { email: "real@example.org", event: "sent", step: 0, segment: "contest" });
    r = await post(event, env, "event", { email: "real@example.org", event: "sent", step: 0, segment: "contest", sent_at: ago(6) });
    assert.equal(r.body.day, ago(6));
  });
});
test("backfill: sent_at is validated strictly (future, too old, not a real date, wrong type, wrong event)", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    const base = { email: "v@example.org", event: "sent", step: 0, segment: "installer" };
    const bad = [shiftDay(TODAY, 1), shiftDay(TODAY, -121), "2026-02-30", "2026-13-01", "2026-11-5", "11/05/2026", "2026-11-05T00:00:00Z", "", " 2026-11-05", 20261105, null, true, {}];
    for (const sent_at of bad) { const r = await post(event, env, "event", { ...base, sent_at }); assert.equal(r.status, 400, JSON.stringify(sent_at)); assert.equal(r.body.hold, true); }
    for (const ev of ["reply", "bounce", "complaint", "unsubscribe"]) assert.equal((await post(event, env, "event", { ...base, event: ev, sent_at: ago(3) })).status, 400, ev);
    assert.equal(rows(raw, "SELECT 1 FROM outreach_events").length, 0);
    assert.equal(rows(raw, "SELECT 1 FROM outreach_suppressions").length, 0, "a rejected event suppresses nothing");
    for (const sent_at of [TODAY, shiftDay(TODAY, -120)]) assert.equal((await post(event, env, "event", { ...base, sent_at })).status, 200, sent_at);
  });
});

// ---------------------------------------------------------------- deliverability: syntax, disposable
test("verify off: no deliverability key, no network", async () => {
  const { env } = mk(); const f = stubFetch(() => { throw new Error("no network expected"); });
  try {
    const r = await post(check, env, "check", { emails: ["a@example.org"] });
    assert.equal(r.status, 200); assert.equal(r.body.results[0].deliverability, undefined); assert.equal(r.body.verify, undefined); assert.equal(f.calls.length, 0);
    assert.equal((await post(check, env, "check", { emails: ["a@example.org"], verify: "yes" })).status, 400);
  } finally { f.restore(); }
});
test("strictSyntax: accepts normal addresses and rejects spaces, double @, bad domains, long parts", () => {
  for (const ok of ["a@example.org", "first.last+tag@sub.example.co.uk", "o'brien@example.org", "a@xn--bcher-kva.example"]) assert.equal(strictSyntax(ok), true, ok);
  const long = "a".repeat(64) + "@example.org";
  assert.equal(strictSyntax(long), true);
  for (const bad of ["a b@example.org", "a@@example.org", "a@b@example.org", "a@example", "a@-example.org", "a@example-.org", "a@exa_mple.org", "a..b@example.org", ".a@example.org", "a.@example.org", "@example.org", "a@", "a@example.c", "a@1.2.3.4", "a@example..org", "a@.example.org", "a@example.org.", "a@[127.0.0.1]", "a@exämple.org", "a(b)@example.org", "", "a".repeat(65) + "@example.org", "a@" + "b".repeat(64) + ".org", "a@" + ("b".repeat(60) + ".").repeat(5) + "org"]) assert.equal(strictSyntax(bad), false, JSON.stringify(bad));
  assert.equal(strictSyntax("a@" + "b.".repeat(125) + "org"), false, "over 254 characters");
  assert.ok(DISPOSABLE.size >= 40 && DISPOSABLE.size <= 60, "modest list: " + DISPOSABLE.size);
});
test("verify: syntax failures and disposable domains are answered without any lookup", async () => {
  const { env } = mk(); const f = stubFetch(() => { throw new Error("no network expected"); });
  try {
    const list = ["a b@example.org", "a@@example.org", "plain", "a@example", "x@mailinator.com", "Y@Sub.YOPMAIL.com"];
    const r = await post(check, env, "check", { emails: list, verify: true });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.results.map((x) => x.deliverability), ["invalid_syntax", "invalid_syntax", "invalid_syntax", "invalid_syntax", "disposable", "disposable"]);
    assert.ok(r.body.results.every((x) => x.sequence.next_step === null && x.sequence.due === false));
    assert.equal(r.body.results[4].sequence.reason, "undeliverable_disposable");
    assert.equal(f.calls.length, 0);
  } finally { f.restore(); }
});

// ---------------------------------------------------------------- deliverability: DNS (stubbed DoH)
const doh = (zones) => (url) => {
  const u = new URL(String(url)), name = u.searchParams.get("name"), type = u.searchParams.get("type"), z = zones[name];
  const j = (o) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/dns-json" } });
  if (z === "nx") return j({ Status: 3 });
  if (z === "servfail") return j({ Status: 2 });
  if (z === "http500") return new Response("x", { status: 500 });
  const ans = (z && z[type]) || [];
  return j({ Status: 0, Answer: ans.map((d) => ({ name, type: { MX: 15, A: 1, AAAA: 28 }[type], data: d })) });
};
const verify = (env, emails) => post(check, env, "check", { emails, verify: true });

test("verify: MX present is ok; NXDOMAIN, no records and a null MX are no_mail_server; A and AAAA are the fallback", async () => {
  const { env } = mk();
  const f = stubFetch(doh({ "mx.example.org": { MX: ["10 mail.mx.example.org."] }, "gone.example.org": "nx", "empty.example.org": {}, "aonly.example.org": { A: ["192.0.2.1"] }, "aaaaonly.example.org": { AAAA: ["2001:db8::1"] }, "nullmx.example.org": { MX: ["0 ."] } }));
  try {
    const r = await verify(env, ["a@mx.example.org", "a@gone.example.org", "a@empty.example.org", "a@aonly.example.org", "a@aaaaonly.example.org", "a@nullmx.example.org", "a@gmail.com"]);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.results.map((x) => x.deliverability), ["ok", "no_mail_server", "no_mail_server", "ok", "ok", "no_mail_server", "ok"]);
    for (const c of f.calls) { assert.ok(c.url.startsWith("https://cloudflare-dns.com/dns-query?name="), c.url); assert.equal(c.init.headers.accept, "application/dns-json"); assert.ok(!/a%40|@/.test(c.url), "only the domain is sent"); }
    assert.ok(!f.calls.some((c) => /gmail/.test(c.url)), "well-known free mail is not looked up");
    assert.equal(f.calls.filter((c) => /name=mx\.example\.org/.test(c.url)).length, 1, "an MX answer needs one question");
    assert.equal(r.body.results[1].sequence.reason, "undeliverable_no_mail_server");
    assert.equal(r.body.results[0].sequence.due, true);
  } finally { f.restore(); }
});
test("verify: a timeout, an error, SERVFAIL or a bad HTTP status is unknown (never no_mail_server), is not cached, and does not stop the send", async () => {
  const { env, raw } = mk({ OUTREACH_DNS_TIMEOUT_MS: "50" });
  const hang = () => new Promise(() => {});
  const f = stubFetch((url) => (/name=slow/.test(url) ? hang() : /name=boom/.test(url) ? Promise.reject(new Error("network")) : doh({ "sf.example.org": "servfail", "h5.example.org": "http500" })(url)));
  try {
    const r = await verify(env, ["a@slow.example.org", "a@boom.example.org", "a@sf.example.org", "a@h5.example.org"]);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.results.map((x) => x.deliverability), ["unknown", "unknown", "unknown", "unknown"]);
    assert.ok(r.body.results.every((x) => x.sequence.due === true), "unknown still allows the send (status clear, due)");
    assert.equal(rows(raw, "SELECT 1 FROM outreach_dns_cache").length, 0, "failures are not cached");
  } finally { f.restore(); }
});
test("verify: an answer is cached per domain for 24 hours (a second call makes no fetch); after that it is asked again", async () => {
  const { env, raw } = mk();
  const f = stubFetch(doh({ "c.example.org": { MX: ["10 m.c.example.org."] } }));
  const undo = freezeNow(NOON);
  try {
    await verify(env, ["a@c.example.org", "b@c.example.org"]);
    assert.equal(f.calls.length, 1, "one fetch for two addresses on one domain");
    const r = await verify(env, ["z@c.example.org"]);
    assert.equal(f.calls.length, 1); assert.equal(r.body.results[0].deliverability, "ok");
    assert.deepEqual(rows(raw, "SELECT domain, result FROM outreach_dns_cache"), [{ domain: "c.example.org", result: "ok" }]);
    undo(); const undo2 = freezeNow("2026-11-21T21:00:00Z"); // 25 hours later
    try { await verify(env, ["z@c.example.org"]); assert.equal(f.calls.length, 2); } finally { undo2(); }
  } finally { f.restore(); }
});
test("verify: more than 20 distinct uncached domains is a 400 with hold:true and no lookups; cached domains do not count", async () => {
  const { env } = mk();
  const zones = {}; for (let i = 0; i < 40; i++) zones[`d${i}.example.org`] = { MX: ["10 m."] };
  const f = stubFetch(doh(zones));
  try {
    const many = (a, b) => Array.from({ length: b - a }, (_, i) => `p@d${a + i}.example.org`);
    const r = await verify(env, many(0, 21));
    assert.equal(r.status, 400); assert.equal(r.body.hold, true); assert.match(r.body.error, /smaller batch/); assert.equal(f.calls.length, 0);
    assert.equal((await verify(env, many(0, 20))).status, 200); // 20 is fine
  } finally { f.restore(); }
});
test("verify: 20 new domains plus 20 cached are accepted (only uncached ones count)", async () => {
  const { env } = mk();
  const zones = {}; for (let i = 0; i < 40; i++) zones[`d${i}.example.org`] = { MX: ["10 m."] };
  const f = stubFetch(doh(zones));
  try {
    const many = (a, b) => Array.from({ length: b - a }, (_, i) => `p@d${a + i}.example.org`);
    await verify(env, many(0, 20));
    const r = await verify(env, [...many(0, 20), ...many(20, 40)].slice(0, 50)); // 40 addresses, 20 domains cached, 20 new
    assert.equal(r.status, 200); assert.ok(r.body.results.every((x) => x.deliverability === "ok"));
    assert.equal(f.calls.length, 40);
  } finally { f.restore(); }
});
test("verify: 20 domains with the worst case (no MX, A or AAAA: three questions each) stay under the 50 subrequest cap, with limited concurrency", async () => {
  const { env, DB } = mk();
  let live = 0, peak = 0;
  const f = stubFetch(async (url) => { live++; peak = Math.max(peak, live); await new Promise((r) => setTimeout(r, 5)); live--; return doh({})(url); });
  try {
    DB.stats.reset();
    const r = await verify(env, Array.from({ length: 20 }, (_, i) => `p@w${i}.example.org`));
    assert.equal(r.status, 200);
    assert.ok(f.calls.length + DB.stats.calls < 50, `subrequests: ${f.calls.length} fetches + ${DB.stats.calls} database calls`);
    assert.ok(peak <= 5, "concurrency " + peak);
    assert.ok(r.body.results.every((x) => ["no_mail_server", "unknown"].includes(x.deliverability)));
    assert.ok(r.body.results.some((x) => x.deliverability === "unknown"), "the budget ran out for the last ones: unknown, not no_mail_server");
  } finally { f.restore(); }
});
test("verify: a 'no mail server' guess is never made from a failure: the budget running out gives unknown", async () => {
  const { env } = mk();
  const f = stubFetch(doh({}));
  try {
    const r = await verify(env, Array.from({ length: 20 }, (_, i) => `p@w${i}.example.org`));
    const nm = r.body.results.filter((x) => x.deliverability === "no_mail_server").length, un = r.body.results.filter((x) => x.deliverability === "unknown").length;
    assert.equal(nm + un, 20); assert.ok(nm >= 10);
  } finally { f.restore(); }
});

// ---------------------------------------------------------------- the 'invalid' event
test("event invalid: stores only a hash and a reason, does not suppress, and later checks answer quickly (no lookup)", async () => {
  const { env, raw } = mk();
  const f = stubFetch(() => { throw new Error("no network expected"); });
  try {
    for (const reason of ["no_mail_server", "invalid_syntax"]) {
      const email = `${reason}@bad.example.org`;
      const r = await post(event, env, "event", { email, event: "invalid", reason });
      assert.equal(r.status, 200); assert.equal(r.body.suppressed, false); assert.equal(r.body.invalid, true);
      const v = (await verify(env, [email])).body.results[0];
      assert.equal(v.deliverability, reason); assert.equal(v.status, "clear"); assert.equal(v.sequence.reason, "undeliverable_" + reason);
      assert.equal((await post(check, env, "check", { emails: [email] })).body.results[0].sequence.next_step, null, "without verify too");
    }
    assert.equal(f.calls.length, 0);
    assert.equal(rows(raw, "SELECT 1 FROM outreach_suppressions").length, 0);
    const dump = JSON.stringify(rows(raw, "SELECT * FROM outreach_invalid")).toLowerCase();
    assert.ok(!dump.includes("@") && !dump.includes("bad.example"), dump);
    assert.match(rows(raw, "SELECT email_hash FROM outreach_invalid")[0].email_hash, /^[0-9a-f]{64}$/);
    // idempotent
    await post(event, env, "event", { email: "no_mail_server@bad.example.org", event: "invalid", reason: "no_mail_server" });
    assert.equal(rows(raw, "SELECT 1 FROM outreach_invalid").length, 2);
  } finally { f.restore(); }
});
test("event invalid: bad input is 400 with hold:true (unknown reason, missing reason, sent_at, a reason on another event)", async () => {
  const { env, raw } = mk();
  for (const body of [{ event: "invalid" }, { event: "invalid", reason: "typo" }, { event: "invalid", reason: "bounce" }, { event: "invalid", reason: "disposable", sent_at: TODAY }, { event: "sent", step: 0, segment: "installer", reason: "disposable" }, { event: "weird", step: 0, segment: "installer" }]) {
    const r = await post(event, env, "event", { email: "x@example.org", ...body });
    assert.equal(r.status, 400, JSON.stringify(body)); assert.equal(r.body.hold, true);
  }
  assert.equal((await post(event, env, "event", { email: "not an email", event: "invalid", reason: "disposable" })).status, 400);
  assert.equal(rows(raw, "SELECT 1 FROM outreach_invalid").length + rows(raw, "SELECT 1 FROM outreach_events").length, 0);
});

// ---------------------------------------------------------------- privacy and admin
test("what is stored: hashes everywhere, and only bare domain names in the DNS cache; responses carry no address or domain", async () => {
  const { env, raw } = mk();
  const f = stubFetch(doh({ "biz.example.org": { MX: ["10 m."] } }));
  try {
    const email = "Private.Person@biz.example.org";
    const r = await post(check, env, "check", { emails: [email, "x@gmail.com"], verify: true });
    await post(event, env, "event", { email, event: "sent", step: 0, segment: "installer", sent_at: shiftDay(ptTodayNow(), -3) });
    await post(event, env, "event", { email, event: "invalid", reason: "no_mail_server" });
    const s = JSON.stringify(r.body); assert.ok(!/@|private|person|biz\.example/i.test(s), s);
    const dump = JSON.stringify(["outreach_suppressions", "outreach_events", "outreach_rate", "outreach_invalid", "ops_log"].map((t) => rows(raw, `SELECT * FROM ${t}`))).toLowerCase();
    for (const part of ["private", "person", "biz.example", "gmail.com", "@"]) assert.ok(!dump.includes(part), "found " + part);
    assert.deepEqual(rows(raw, "SELECT domain FROM outreach_dns_cache"), [{ domain: "biz.example.org" }]);
  } finally { f.restore(); }
});
function ptTodayNow() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

test("admin reconcile: how many are due today per step, and the sequence for each row", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    await seed(env, raw, "s1@example.org", 0, ago(4));                                   // follow-up 1 due
    await seed(env, raw, "s2@example.org", 0, ago(10)); await seed(env, raw, "s2@example.org", 1, ago(5)); // follow-up 2 due
    await seed(env, raw, "s3@example.org", 0, ago(1));                                   // not due
    await seed(env, raw, "s4@example.org", 0, ago(40));                                  // overdue hold
    raw.prepare("INSERT INTO users (id,email,name) VALUES ('u1','s5@reg.example.net','R')").run();
    const req = new Request("http://localhost/api/admin/outreach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reconcile", emails: ["new1@example.org", "new2@example.org", "s1@example.org", "s2@example.org", "s3@example.org", "s4@example.org", "s5@reg.example.net"] }) });
    const j = await (await adminPost({ request: req, env })).json();
    assert.deepEqual(j.due, { 0: 2, 1: 1, 2: 1 });
    assert.equal(j.rows[3].sequence.next_step, 2); assert.equal(j.rows[5].sequence.reason, "overdue_hold");
    assert.deepEqual(j.counts, { registered: 1, listing: 0, review: 0, suppressed: 0, clear: 6 });
    assert.ok(!/@/.test(JSON.stringify(j)));
  });
});

// ---------------------------------------------------------------- releasing an overdue hold
const releaseRows = async (env, raw, email) => {
  const { h, n } = await outreachHashes(env, email);
  return rows(raw, "SELECT event, step, segment FROM outreach_events WHERE event = 'release' AND (email_hash IN (?,?) OR alias_hash IN (?,?)) ORDER BY step", h, n, h, n);
};
const adminBody = (env, body) => adminPost({ request: new Request("http://localhost/api/admin/outreach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env }).then(async (r) => ({ status: r.status, body: await r.json() }));

test("sequenceFor: a release lifts only the overdue step it names, and never a stop, a block, or a finished sequence", () => {
  const today = "2026-11-20";
  const sent = { event: "sent", step: 0, day: "2026-10-01" }; // follow-up 1 was due 2026-10-05
  const release = { event: "release", step: 1, day: today };
  assert.equal(sequenceFor([sent], "clear", today).reason, "overdue_hold");
  assert.equal(sequenceFor([sent, { event: "release", step: "2", day: today }], "clear", today).reason, "overdue_hold", "a release for the other step does nothing, even as a string");
  assert.deepEqual(sequenceFor([sent, release], "clear", today), { next_step: 1, due: true, due_on: "2026-10-05", reason: "released" });
  assert.equal(sequenceFor([sent, release, { event: "reply", step: 0, day: today }], "clear", today).reason, "reply");
  assert.equal(sequenceFor([sent, release, { event: "bounce", step: 0, day: today }], "clear", today).reason, "bounce");
  assert.equal(sequenceFor([sent, release, { event: "complaint", step: 0, day: today }], "clear", today).reason, "complaint");
  assert.equal(sequenceFor([sent, release, { event: "unsubscribe", step: 0, day: today }], "clear", today).reason, "unsubscribe");
  for (const status of ["suppressed", "registered", "listing", "review"]) assert.equal(sequenceFor([sent, release], status, today).reason, "status_" + status, status);
  const done = [sent, { event: "sent", step: 1, day: "2026-10-06" }, { event: "sent", step: 2, day: "2026-10-20" }, { event: "release", step: 2, day: today }, { event: "release", step: 3, day: today }];
  assert.equal(sequenceFor(done, "clear", today).reason, "sequence_finished");
  assert.equal(sequenceFor([{ event: "sent", step: 0, day: "2026-11-18" }, release], "clear", today).reason, "not_due_yet", "a release does not send a step early");
  assert.equal(sequenceFor([{ event: "sent", step: 0, day: "2026-11-02" }, release], "clear", today).reason, "due", "inside the 14-day window the reason stays due");
  const step2 = [sent, { event: "sent", step: 1, day: "2026-10-06" }];
  assert.equal(sequenceFor([...step2, release], "clear", today).reason, "overdue_hold", "the step-1 release does not lift follow-up 2");
  assert.equal(sequenceFor([...step2, { event: "release", step: 2, day: today }], "clear", today).reason, "released");
});

test("event release: lifts the overdue step, is idempotent, stores a hash only, and does not suppress", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    await seed(env, raw, "Late.Organizer@contest.example", 0, ago(30), "sent", "contest");
    assert.equal((await seqOf(env, "late.organizer@contest.example")).reason, "overdue_hold");
    const r = await post(event, env, "event", { email: "Late.Organizer@contest.example", event: "release" });
    assert.equal(r.status, 200);
    assert.equal(r.body.released, true); assert.equal(r.body.duplicate, false); assert.equal(r.body.suppressed, false);
    assert.equal(r.body.next_step, 1); assert.equal(r.body.reason, "released"); assert.equal(r.body.hold, undefined);
    assert.deepEqual(await seqOf(env, "late.organizer@contest.example"), { next_step: 1, due: true, due_on: ago(26), reason: "released" });
    const again = await post(event, env, "event", { email: "late.organizer@contest.example", event: "release", step: 1, segment: "contest" });
    assert.equal(again.body.duplicate, true); assert.equal(again.body.released, true);
    assert.equal((await releaseRows(env, raw, "late.organizer@contest.example")).length, 1, "still one release row");
    assert.equal(rows(raw, "SELECT 1 FROM outreach_suppressions").length, 0, "a release never suppresses");
    const dump = JSON.stringify(rows(raw, "SELECT * FROM outreach_events WHERE event = 'release'")).toLowerCase();
    for (const part of ["late", "organizer", "contest.example", "@"]) assert.ok(!dump.includes(part), "found " + part);
    assert.match(rows(raw, "SELECT email_hash FROM outreach_events WHERE event = 'release'")[0].email_hash, /^[0-9a-f]{64}$/);
    const log = JSON.stringify(rows(raw, "SELECT detail FROM ops_log")).toLowerCase();
    assert.ok(!log.includes("organizer") && !log.includes("@"), log);
  });
});

test("event release: after the released step is sent, normal timing resumes and the next overdue step stays held", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    await seed(env, raw, "two@example.org", 0, ago(40), "sent", "contest");
    assert.equal((await post(event, env, "event", { email: "two@example.org", event: "release" })).body.next_step, 1);
    assert.equal((await post(event, env, "event", { email: "two@example.org", event: "sent", step: 1, segment: "contest" })).status, 200);
    assert.deepEqual(await seqOf(env, "two@example.org"), { next_step: 2, due: false, due_on: ago(30), reason: "overdue_hold" });
    const second = await post(event, env, "event", { email: "two@example.org", event: "release" });
    assert.equal(second.body.next_step, 2); assert.equal(second.body.released, true);
    assert.deepEqual(await seqOf(env, "two@example.org"), { next_step: 2, due: true, due_on: ago(30), reason: "released" });
    await post(event, env, "event", { email: "two@example.org", event: "sent", step: 2, segment: "contest" });
    assert.equal((await seqOf(env, "two@example.org")).reason, "sequence_finished");
    const extra = await post(event, env, "event", { email: "two@example.org", event: "release", step: 2 });
    assert.equal(extra.body.released, false); assert.equal(extra.body.reason, "sequence_finished");
    assert.deepEqual((await releaseRows(env, raw, "two@example.org")).map((r) => r.step), [1, 2], "no third follow-up");
  });
});

test("event release: refuses every block, the wrong step, and a step that is not overdue, and writes nothing", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    const hold = async (email, segment = "contest") => { await seed(env, raw, email, 0, ago(30), "sent", segment); };
    for (const ev of ["reply", "bounce", "complaint", "unsubscribe"]) {
      const email = `stop-${ev}@example.org`;
      await hold(email);
      assert.equal((await post(event, env, "event", { email, event: ev, step: 0, segment: "contest" })).status, 200);
      const r = await post(event, env, "event", { email, event: "release" });
      assert.equal(r.status, 200); assert.equal(r.body.released, false); assert.equal(r.body.reason, ev); assert.equal(r.body.hold, undefined);
    }
    await hold("suppressed@example.org");
    await post(suppress, env, "suppress", { email: "suppressed@example.org", reason: "manual", source: "t" });
    assert.equal((await post(event, env, "event", { email: "suppressed@example.org", event: "release" })).body.reason, "status_suppressed");
    raw.prepare("INSERT INTO users (id,email,name) VALUES ('uR','registered@reg.example','R')").run();
    await hold("registered@reg.example");
    assert.equal((await post(event, env, "event", { email: "registered@reg.example", event: "release" })).body.reason, "status_registered");
    raw.prepare("INSERT INTO posts (id,biz,title,city,lat,lng,descr,contact_email) VALUES ('pR','b','t','Pasadena',1,2,'d','listed@example.org')").run();
    await hold("listed@example.org");
    assert.equal((await post(event, env, "event", { email: "listed@example.org", event: "release" })).body.reason, "status_listing");
    raw.prepare("INSERT INTO installers (id,slug,name,web) VALUES ('iR','r','R','reviewco.example')").run();
    await hold("info@reviewco.example");
    assert.equal((await post(event, env, "event", { email: "info@reviewco.example", event: "release" })).body.reason, "status_review");
    await hold("finished@example.org");
    await seed(env, raw, "finished@example.org", 1, ago(20), "sent", "contest");
    await seed(env, raw, "finished@example.org", 2, ago(10), "sent", "contest");
    assert.equal((await post(event, env, "event", { email: "finished@example.org", event: "release" })).body.reason, "sequence_finished");
    await seed(env, raw, "early@example.org", 0, ago(1), "sent", "contest");
    assert.equal((await post(event, env, "event", { email: "early@example.org", event: "release" })).body.reason, "not_due_yet");
    await seed(env, raw, "inside@example.org", 0, ago(10), "sent", "contest");
    assert.equal((await post(event, env, "event", { email: "inside@example.org", event: "release" })).body.reason, "due");
    await hold("wrong-step@example.org");
    const mismatch = await post(event, env, "event", { email: "wrong-step@example.org", event: "release", step: 2 });
    assert.equal(mismatch.body.released, false); assert.equal(mismatch.body.reason, "step_mismatch"); assert.equal(mismatch.body.next_step, 1);
    const seg = await post(event, env, "event", { email: "wrong-step@example.org", event: "release", segment: "installer" });
    assert.equal(seg.body.released, false); assert.equal(seg.body.reason, "segment_mismatch");
    assert.equal((await seqOf(env, "wrong-step@example.org")).reason, "overdue_hold");
    // a release that arrives, then a complaint or a new account, must stop winning
    await hold("then-stop@example.org");
    assert.equal((await post(event, env, "event", { email: "then-stop@example.org", event: "release" })).body.released, true);
    await post(event, env, "event", { email: "then-stop@example.org", event: "complaint", step: 1, segment: "contest" });
    assert.equal((await seqOf(env, "then-stop@example.org")).reason, "complaint");
    await hold("after-reg@later.example");
    assert.equal((await post(event, env, "event", { email: "after-reg@later.example", event: "release" })).body.released, true);
    raw.prepare("INSERT INTO users (id,email,name) VALUES ('uAfter','after-reg@later.example','A')").run();
    assert.equal((await seqOf(env, "after-reg@later.example")).reason, "status_registered");
    for (const email of ["stop-reply@example.org", "suppressed@example.org", "registered@reg.example", "listed@example.org", "info@reviewco.example", "finished@example.org", "early@example.org", "inside@example.org", "wrong-step@example.org"]) {
      assert.equal((await releaseRows(env, raw, email)).length, 0, email);
    }
    const bad = await post(event, env, "event", { email: "wrong-step@example.org", event: "release", step: 3 });
    assert.equal(bad.status, 400); assert.equal(bad.body.hold, true);
    assert.equal((await post(event, env, "event", { email: "wrong-step@example.org", event: "release", sent_at: ago(1) })).status, 400);
    assert.equal((await post(event, env, "event", { email: "not an email", event: "release" })).status, 400);
    assert.equal((await releaseRows(env, raw, "wrong-step@example.org")).length, 0);
    // the same person under a +tag or without Gmail dots shares the release
    await seed(env, raw, "first.last@gmail.com", 0, ago(30), "sent", "contest");
    assert.equal((await post(event, env, "event", { email: "firstlast+x@gmail.com", event: "release" })).body.released, true);
    assert.equal((await seqOf(env, "first.last@gmail.com")).reason, "released");
    assert.equal((await releaseRows(env, raw, "first.last@gmail.com")).length, 1);
  });
});

test("admin release: preview a segment, then release only its overdue steps, and a list does the same", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    const contest = (email, step, day, ev = "sent") => seed(env, raw, email, step, day, ev, "contest");
    await contest("c1@example.org", 0, ago(30));
    await contest("c2@example.org", 0, ago(30));
    await contest("c3@example.org", 0, ago(40)); await contest("c3@example.org", 1, ago(20));
    await seed(env, raw, "i1@example.org", 0, ago(30), "sent", "installer");
    await seed(env, raw, "h1@example.org", 0, ago(30), "sent", "event_host");
    await contest("c4@example.org", 0, ago(30));
    await post(suppress, env, "suppress", { email: "c4@example.org", reason: "manual", source: "t" });
    await contest("c5@example.org", 0, ago(30));
    await post(event, env, "event", { email: "c5@example.org", event: "reply", step: 0, segment: "contest" });
    await contest("c6@example.org", 0, ago(40)); await contest("c6@example.org", 1, ago(30)); await contest("c6@example.org", 2, ago(20));
    await contest("c7@example.org", 0, ago(1));
    await contest("c8@example.org", 0, ago(10));
    raw.prepare("INSERT INTO users (id,email,name) VALUES ('u9','c9@reg.example','R')").run();
    await contest("c9@reg.example", 0, ago(30));
    await contest("c10@example.org", 0, ago(30));
    const { h } = await outreachHashes(env, "c10@example.org");
    raw.prepare("INSERT INTO outreach_invalid (email_hash, reason, first_seen) VALUES (?,?,?)").run(h, "no_mail_server", TODAY);
    await contest("first.last@gmail.com", 0, ago(30));
    await post(suppress, env, "suppress", { email: "firstlast@gmail.com", reason: "unsubscribe", source: "t" });
    const before = rows(raw, "SELECT 1 FROM outreach_events WHERE event = 'release'").length;
    const preview = await adminBody(env, { action: "release", segment: "contest" });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.dry_run, true);
    assert.equal(preview.body.overdue, 4, "c1 c2 c3 and the registered c9 (hashes cannot see the account)");
    assert.deepEqual(preview.body.by_step, { 0: 0, 1: 3, 2: 1 });
    assert.equal(preview.body.released, 0);
    assert.equal(preview.body.skipped_suppressed, 2);
    assert.equal(preview.body.skipped_undeliverable, 1);
    assert.equal(preview.body.already_released, 0);
    assert.equal(rows(raw, "SELECT 1 FROM outreach_events WHERE event = 'release'").length, before, "preview writes nothing");
    assert.ok(!JSON.stringify(preview.body).includes("@") && !JSON.stringify(preview.body).includes("c1"), JSON.stringify(preview.body));
    const omitted = await adminBody(env, { action: "release", segment: "contest", dry_run: true });
    assert.equal(omitted.body.released, 0);
    const applied = await adminBody(env, { action: "release", segment: "contest", dry_run: false });
    assert.equal(applied.body.released, 4); assert.equal(applied.body.dry_run, false);
    assert.equal(rows(raw, "SELECT 1 FROM outreach_events WHERE event = 'release'").length, 4);
    assert.deepEqual(await seqOf(env, "c1@example.org"), { next_step: 1, due: true, due_on: ago(26), reason: "released" });
    assert.equal((await seqOf(env, "c3@example.org")).next_step, 2); assert.equal((await seqOf(env, "c3@example.org")).reason, "released");
    assert.equal((await seqOf(env, "c9@reg.example")).reason, "status_registered", "a release never overrides a registration");
    assert.equal((await seqOf(env, "c9@reg.example")).due, false);
    assert.equal((await seqOf(env, "c4@example.org")).reason, "status_suppressed");
    assert.equal((await seqOf(env, "c5@example.org")).reason, "reply");
    assert.equal((await seqOf(env, "first.last@gmail.com")).reason, "status_suppressed");
    assert.equal((await seqOf(env, "c6@example.org")).reason, "sequence_finished");
    assert.equal((await seqOf(env, "c10@example.org")).reason, "undeliverable_no_mail_server");
    assert.equal((await seqOf(env, "i1@example.org")).reason, "overdue_hold");
    assert.equal((await seqOf(env, "h1@example.org")).reason, "overdue_hold");
    assert.equal((await releaseRows(env, raw, "c4@example.org")).length, 0);
    assert.equal((await releaseRows(env, raw, "c5@example.org")).length, 0);
    assert.equal((await releaseRows(env, raw, "c10@example.org")).length, 0);
    assert.equal((await releaseRows(env, raw, "i1@example.org")).length, 0);
    const again = await adminBody(env, { action: "release", segment: "contest", dry_run: false });
    assert.equal(again.body.released, 0); assert.equal(again.body.already_released, 4); assert.equal(again.body.overdue, 0);
    assert.equal(rows(raw, "SELECT 1 FROM outreach_events WHERE event = 'release'").length, 4, "applying twice adds nothing");
    // the release covered step 1 only: once it is sent, step 2 is held again
    await post(event, env, "event", { email: "c1@example.org", event: "sent", step: 1, segment: "contest" });
    assert.equal((await seqOf(env, "c1@example.org")).reason, "overdue_hold");
    assert.equal((await seqOf(env, "c1@example.org")).next_step, 2);
    const next = await adminBody(env, { action: "release", segment: "contest" });
    assert.equal(next.body.overdue, 1); assert.deepEqual(next.body.by_step, { 0: 0, 1: 0, 2: 1 }); assert.equal(next.body.already_released, 3);
    // a pasted list releases only the rows that are actually on hold
    const list = await adminBody(env, { action: "release", emails: ["c1@example.org", "c8@example.org", "c9@reg.example", "c6@example.org", "nobody-new@example.org"] });
    assert.equal(list.body.dry_run, true); assert.equal(list.body.would_release, 1); assert.equal(list.body.released, 0);
    assert.equal(list.body.rows.find((x) => x.i === 0).would_release, true);
    assert.equal(list.body.rows.find((x) => x.i === 1).reason, "due");
    assert.equal(list.body.rows.find((x) => x.i === 2).reason, "status_registered");
    assert.ok(!JSON.stringify(list.body).includes("c1@example.org"));
    const listApply = await adminBody(env, { action: "release", emails: ["c1@example.org", "c8@example.org", "c9@reg.example"], dry_run: false });
    assert.equal(listApply.body.released, 1);
    assert.equal((await seqOf(env, "c1@example.org")).reason, "released");
    assert.equal((await seqOf(env, "c1@example.org")).next_step, 2);
    assert.equal((await seqOf(env, "c8@example.org")).reason, "due");
    assert.equal((await seqOf(env, "c9@reg.example")).reason, "status_registered");
    const dash = await (await adminGet({ env })).json();
    assert.ok(dash.results.every((c) => Number.isFinite(c.sent)));
    assert.equal(dash.totals.sent, rows(raw, "SELECT 1 FROM outreach_events WHERE event = 'sent'").length, "a release is not counted as a send");
  });
});

test("admin release: a bad call is refused and the other segment is untouched", async () => {
  await withClock(NOON, async () => {
    const { env, raw } = mk();
    await seed(env, raw, "host@example.org", 0, ago(30), "sent", "event_host");
    for (const body of [
      { action: "release" },
      { action: "release", segment: "contest", emails: ["a@example.org"] },
      { action: "release", segment: "contests" },
      { action: "release", segment: "contest", dry_run: "yes" },
      { action: "release", emails: [] },
      { action: "release", emails: Array.from({ length: 501 }, (_, i) => `n${i}@example.org`) },
      { action: "nope" },
    ]) assert.equal((await adminBody(env, body)).status, 400, JSON.stringify(body));
    const hosts = await adminBody(env, { action: "release", segment: "event_host", dry_run: false });
    assert.equal(hosts.body.released, 1); assert.deepEqual(hosts.body.by_step, { 0: 0, 1: 1, 2: 0 });
    assert.equal((await seqOf(env, "host@example.org")).reason, "released");
    const contest = await adminBody(env, { action: "release", segment: "contest" });
    assert.equal(contest.body.overdue, 0);
    assert.equal(rows(raw, "SELECT 1 FROM outreach_events WHERE event = 'release'").length, 1);
  });
});

test("Admin > Outreach has a preview and a two-tap release, and the script version moved", () => {
  const js = readFileSync(new URL("../public/admin/admin.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
  assert.match(js, /Release overdue follow-ups/);
  assert.match(js, /id="orpreview"/); assert.match(js, /id="orrelease"/); assert.match(js, /id="orrelmail"/);
  assert.match(js, /action: "release", segment, dry_run: true/);
  assert.match(js, /action: "release", segment, dry_run: false/);
  assert.match(js, /tap\(b, `release /); assert.match(js, /tap\(btn, `release /);
  assert.match(html, /admin\.js\?v=20261128o/);
});
