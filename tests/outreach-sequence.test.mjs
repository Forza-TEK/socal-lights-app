// Run with: node --test tests/   (Outreach API: server-side sequence timing, backfill with sent_at, the deliverability pre-check, the 'invalid' event.)
// No real email address and no network: every address is @example.* or a made-up test domain, DNS-over-HTTPS is a stub.
import test from "node:test";
import assert from "node:assert/strict";
import { newEnv } from "./_pay.mjs";
import { stubFetch, freezeNow } from "./_pay.mjs";
import { outreachHashes, sequenceFor } from "../functions/_lib/outreach.js";
import { strictSyntax, DISPOSABLE } from "../functions/_lib/deliverability.js";
import { shiftDay } from "../functions/_lib/time.js";
import { onRequest as check } from "../functions/api/outreach/check.js";
import { onRequest as suppress } from "../functions/api/outreach/suppress.js";
import { onRequest as event } from "../functions/api/outreach/event.js";
import { onRequestPost as adminPost } from "../functions/api/admin/outreach.js";

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
