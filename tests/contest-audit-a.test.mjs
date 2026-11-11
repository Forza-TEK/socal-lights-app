// Contest audit batch A (2026-11-11): Pacific time everywhere (CON-05, CON-08, CON-11), tie labels (CON-09), the trailing-dash address (CON-10),
// the vote-speed flag (CON-19), /past with one damaged contest (CON-22), the vote limit (CON-26), the entry confirmation email (CON-21), and the page rules that
// are plain text (no browser date maths, no squeezed score box, one request per vote tap).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestGet as listContests, onRequestPost as createContest } from "../functions/api/contests/index.js";
import { onRequestGet as contestGet } from "../functions/api/contests/[slug].js";
import { onRequestPost as vote } from "../functions/api/contests/[slug]/vote.js";
import { onRequestGet as votesGet, fastVoteReason } from "../functions/api/contests/[slug]/votes.js";
import { onRequestPost as submit } from "../functions/api/submit.js";
import { onRequestGet as pastIndex } from "../functions/past/index.js";
import { onRequestGet as pastPage } from "../functions/past/[slug].js";
import { onRequestGet as archiveGet } from "../functions/api/archive.js";
import { onRequestGet as contestPage } from "../functions/c/[slug].js";
import { onRequestGet as enterPage } from "../functions/c/[slug]/enter.js";
import { onRequestGet as manageRedirect } from "../functions/c/[slug]/manage.js";
import { windows, states, contestSlug, trimmedSlugFor } from "../functions/_lib/contests.js";
import { renderTemplate } from "../functions/_lib/mailtpl.js";
import { rulesDefault } from "../public/rules.js";
import { fmtDate, ptToday as clientToday, statusChips, tieText, entriesClosedText } from "../public/contestfmt.js";
import { newEnv as baseEnv, addUser, stubFetch, compEveryone } from "./_pay.mjs";
import { readdirSync } from "node:fs";

const O = "https://socallights.app";
const newEnv = (extra) => { const r = baseEnv(extra); compEveryone(r.raw); return r; };
const J = async (p) => { const r = await p; return { http: r.status, ...(await r.json().catch(() => ({}))) }; };
// Freezes Date.now() and new Date() (the server uses the first, some code the second)
async function at(iso, fn) {
  const RealDate = Date, t = RealDate.parse(iso);
  class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } }
  globalThis.Date = FakeDate;
  try { return await fn(); } finally { globalThis.Date = RealDate; }
}
const assets = { fetch: async (req) => new Response("<html><title>x</title></html>", { status: 200, headers: { "content-type": "text/html" } }) };

// A live contest with voting from Dec 12 (the Covina shape), two homes and one voter.
function seed(raw, o = {}) {
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval,prize_mode,rules) VALUES ('c1',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(o.slug || "show", "uO", "Show Contest", "City", "Pasadena", "Los Angeles", "christmas", "live", o.close || "2026-12-10", o.vs || "2026-12-12", o.ve || "2026-12-20", JSON.stringify(o.cats || ["Best Overall", "Most Creative", "Best Animated"]), "public", "pick", "owner@city.gov", "A contest for the neighbors.", "manual", "none", "");
  const ins = raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,contest_id,user_id,entry_no,approved_at) VALUES (?,'approved',?,?,'Pasadena',34.1,-118.1,'d','[]',?,'christmas',?,?,'91101','c1',?,?,datetime('now'))");
  for (const [i, p] of ["a", "b"].entries()) { raw.prepare("INSERT OR IGNORE INTO users (id,email,name) VALUES (?,?,?)").run("e" + p, `${p}@example.com`, ""); ins.run("p" + p, "Biz " + p, "Home " + p, `${p}@example.com`, `${i + 1} Oak St`, `${i + 1} Oak St`, "e" + p, i + 1); }
}
const castVote = (env, cookie, body, ip = "198.51.100.1") => vote({ params: { slug: "show" }, request: new Request(O + "/api/contests/show/vote", { method: "POST", headers: { "content-type": "application/json", cookie, "CF-Connecting-IP": ip }, body: JSON.stringify(body) }), env });
const getContest = (env, cookie = "") => contestGet({ params: { slug: "show" }, request: new Request(O + "/api/contests/show", { headers: cookie ? { cookie } : {} }), env }).then((r) => r.json());

// ---------------- CON-05 / CON-08: Pacific time, 5 pm the day before voting opens ----------------
test("CON-05: at 5 pm Pacific the day before voting opens (the UTC date is already the next day) every surface still says 'Voting opens Dec 12'", async () => {
  const { env, raw } = newEnv(); seed(raw); const u = await addUser(raw, "v1", "v1@example.com");
  await at("2026-12-12T01:00:00Z", async () => { // 5:00 pm PST on Dec 11; UTC says Dec 12
    assert.equal(clientToday(), "2026-12-11", "the shared browser helper is the Pacific date, not the UTC one");
    const listed = (await (await listContests({ env })).json())[0];
    assert.equal(listed.votingOpen, false); assert.equal(listed.votingState, "before"); assert.equal(listed.entriesState, "ended");
    const page = await getContest(env, u.cookie);
    assert.equal(page.contest.votingState, "before"); assert.equal(page.contest.votingOpen, false);
    assert.deepEqual(statusChips(page.contest).map((c) => c.text), ["Entries closed Dec 10", "Voting opens Dec 12"]);
    assert.deepEqual(statusChips(page.contest).map((c) => c.tone), ["idle", "idle"], "waiting is grey, not an error colour");
    assert.deepEqual(statusChips(listed).map((c) => c.text), ["Entries closed Dec 10", "Voting opens Dec 12"]);
    const r = await J(castVote(env, u.cookie, { post_id: "pa", category: "Best Overall" })); assert.equal(r.http, 400); assert.match(r.error, /isn't open/);
  });
  await at("2026-12-12T08:00:00Z", async () => { // midnight PST: voting opens
    assert.equal(clientToday(), "2026-12-12");
    assert.equal((await getContest(env, u.cookie)).contest.votingState, "open");
    const r = await J(castVote(env, u.cookie, { post_id: "pa", category: "Best Overall" })); assert.equal(r.http, 200); assert.equal(r.ok, true);
  });
  await at("2026-12-21T07:59:00Z", async () => assert.equal((await getContest(env)).contest.votingState, "open", "11:59 pm PST on the last day is still open"));
  await at("2026-12-21T08:00:00Z", async () => assert.equal((await getContest(env)).contest.votingState, "over"));
});
test("CON-05: the same in summer (PDT is UTC-7): 5 pm Pacific is midnight UTC", async () => {
  const { env, raw } = newEnv(); seed(raw, { close: "2026-07-10", vs: "2026-07-12", ve: "2026-07-20" });
  await at("2026-07-12T00:00:00Z", async () => { assert.equal(clientToday(), "2026-07-11"); assert.equal((await getContest(env)).contest.votingState, "before"); });
  await at("2026-07-12T06:59:59Z", async () => assert.equal((await getContest(env)).contest.votingState, "before", "11:59:59 pm PDT"));
  await at("2026-07-12T07:00:00Z", async () => assert.equal((await getContest(env)).contest.votingState, "open", "midnight PDT"));
});
test("states(): entries and voting in words, including paused by hand and announced", () => {
  const c = { status: "live", announced: 0, entries_open: 1, voting_open: 1, entries_close: "2026-12-10", vote_start: "2026-12-12", vote_end: "2026-12-20" };
  assert.deepEqual(states(c, "2026-12-10"), { entriesState: "open", votingState: "before" });
  assert.deepEqual(states(c, "2026-12-11"), { entriesState: "ended", votingState: "before" });
  assert.deepEqual(states(c, "2026-12-12"), { entriesState: "ended", votingState: "open" });
  assert.deepEqual(states({ ...c, entries_open: 0 }, "2026-12-09"), { entriesState: "paused", votingState: "before" });
  assert.equal(states({ ...c, voting_open: 0 }, "2026-12-13").votingState, "paused");
  assert.deepEqual(states({ ...c, announced: 1 }, "2026-12-13"), { entriesState: "over", votingState: "over" });
  assert.equal(states({ ...c, status: "declined" }, "2026-12-09").entriesState, "paused");
  // the old two-flag answer is unchanged
  assert.deepEqual(windows(c, "2026-12-12"), { entriesOpen: false, votingOpen: true });
});
test("CON-08: the default rules and every date a person reads say Pacific and use 'Dec 10, 2026' (CON-11)", async () => {
  const t = rulesDefault({ name: "Maple Showdown", org: "Maple HOA", city: "Pasadena", closes: "2026-12-10", vs: "2026-12-11", ve: "2026-12-20", mode: "public" });
  assert.match(t, /Enter by Dec 10, 2026 \(Pacific time; entries are accepted through 11:59 pm that day\)/);
  assert.match(t, /Voting runs Dec 11, 2026 to Dec 20, 2026 \(Pacific time; voting opens at 12:00 am on the first day and closes at 11:59 pm on the last day\)/);
  assert.match(t, /Winners are determined when voting closes on Dec 20, 2026 \(11:59 pm Pacific\) and are announced on the contest page and by email when the Organizer announces them/);
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(t), "no ISO dates in the rules");
  assert.equal(fmtDate("2026-12-10"), "Dec 10, 2026"); assert.equal(fmtDate("2026-12-10", false), "Dec 10"); assert.equal(fmtDate("soon"), "soon");
  const env = { DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) } };
  for (const [id, vars] of [
    ["entry_approved", { name: "A", contest: "C", vote_start: "Dec 12, 2026", vote_end: "Dec 20, 2026", link: "https://socallights.app/c/x" }],
    ["contest_remind_open", { contest: "C", vote_end: "Dec 20, 2026", link: "https://socallights.app/c/x" }],
    ["contest_remind_close", { contest: "C", vote_end: "Dec 20, 2026", link: "https://socallights.app/c/x" }],
    ["judge_nudge", { org: "O", contest: "C", done: "1", total: "3", vote_end: "Dec 20, 2026", link: "https://socallights.app/c/x" }],
    ["entry_received", { name: "A", contest: "C", review: "The organizer will review it before it goes on the map.", vote_start: "Dec 12, 2026", vote_end: "Dec 20, 2026", link: "https://socallights.app/c/x" }],
  ]) { const m = await renderTemplate(env, id, vars); assert.match(m.text, /Pacific/, id); }
});
test("CON-08: dates in emails are written 'Dec 20, 2026', not ISO (reminder, approval, judge nudge are fed fmtDate)", () => {
  for (const f of ["functions/api/contest-remind.js", "functions/api/contests/[slug]/nudge.js", "functions/api/contests/[slug]/entries/[id].js"]) assert.match(readFileSync(f, "utf8"), /fmtDate\(c\.vote_end\)/, f);
});

// ---------------- CON-09: ties ----------------
test("CON-09: a tie is labelled and grouped: 'Tied (3 homes, 2 votes each)'", () => {
  const byId = { a: { votes: { Best: 2 } }, b: { votes: { Best: 2 } }, c: { votes: { Best: 2 } } };
  assert.equal(tieText({ category: "Best", kind: "public", ids: ["a", "b", "c"] }, byId), "Tied (3 homes, 2 votes each)");
  assert.equal(tieText({ category: "Best", kind: "public", ids: ["a"] }, byId), "", "one winner is no tie");
  assert.equal(tieText({ category: "Best", kind: "public", ids: ["a", "b"] }, { a: { votes: { Best: 1 } }, b: { votes: { Best: 1 } } }), "Tied (2 homes, 1 vote each)");
  assert.equal(tieText({ category: "Best", kind: "judge", ids: ["a", "b"] }, { a: { jv: { Best: { avg: 9, n: 3 } } }, b: { jv: { Best: { avg: 9, n: 3 } } } }, "score"), "Tied (2 homes, judges' average 9.0)");
  assert.equal(tieText({ category: "Best", kind: "judge", ids: ["a", "b"] }, { a: { jv: { Best: 2 } }, b: { jv: { Best: 2 } } }, "pick"), "Tied (2 homes, 2 judge picks each)");
});
function frozen(o = {}) {
  const e = (id, name, v) => ({ id, name, biz: name, address: "1 Oak St", city: "Pasadena", photos: [], no: 1, dq: false, votes: { "Most Creative": v } });
  return { at: "2026-11-10", categories: ["Most Creative"], winners: { "Most Creative": ["pa", "pb"] }, jwinners: {}, awards: [{ category: "Most Creative", kind: "public", label: "People's Choice", ids: ["pa", "pb"], prize: "" }], jv: {},
    entries: [e("pa", "Garcia", 2), e("pb", "Nguyen", 2), e("pc", "Lee", 1)], ...o };
}
function addAnnounced(raw, id, slug, results) {
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval,announced,results) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, slug, "uO", "Contest " + slug, "City", "Pasadena", "Los Angeles", "christmas", "live", "2026-11-01", "2026-11-02", "2026-11-09", JSON.stringify(["Most Creative"]), "public", "pick", "o@city.gov", "d", "manual", 1, results);
}
const get = (fn, path, env, extra = {}) => fn({ params: extra.params || {}, request: new Request(O + path), env, waitUntil: () => {} });

// ---------------- CON-22 / CON-27 / CON-09 / CON-11: /past ----------------
test("CON-22: one announced contest with a damaged results record does not take /past, /past/<slug> or /api/archive down", async () => {
  const { env, raw } = newEnv(); addAnnounced(raw, "g1", "good-one", JSON.stringify(frozen())); addAnnounced(raw, "b1", "bad-one", JSON.stringify({ at: "2026-11-10" })); addAnnounced(raw, "b2", "worse-one", "not json at all");
  const res = await get(pastIndex, "/past", env); assert.equal(res.status, 200);
  const html = await res.text(); assert.match(html, /good-one/); assert.ok(!/bad-one|worse-one/.test(html), "the damaged rows are left out");
  assert.match(html, /Christmas 2026/); assert.ok(!/Christmas \| 2026/.test(html), "no pipe in the heading (CON-27)");
  const api = await get(archiveGet, "/api/archive", env); assert.equal(api.status, 200); assert.deepEqual((await api.json()).map((c) => c.slug), ["good-one"]);
  const ok = await get(pastPage, "/past/good-one", env, { params: { slug: "good-one" } }); assert.equal(ok.status, 200);
  const bad = await get(pastPage, "/past/bad-one", env, { params: { slug: "bad-one" } }); assert.equal(bad.status, 404, "that one contest's page says it is unavailable, not a 500");
});
test("CON-27: the empty /past has no 'Results of 0 ...' sentence", async () => {
  const { env } = newEnv(); const html = await (await get(pastIndex, "/past", env)).text();
  assert.ok(!/Results of 0/.test(html)); assert.match(html, /No contest has announced winners yet/);
});
test("CON-09 and CON-11: the results page labels the tie and writes dates like the rest of the site", async () => {
  const { env, raw } = newEnv(); addAnnounced(raw, "g1", "good-one", JSON.stringify(frozen()));
  const html = await (await get(pastPage, "/past/good-one", env, { params: { slug: "good-one" } })).text();
  assert.match(html, /Tied \(2 homes, 2 votes each\)/); assert.match(html, /Results locked Nov 10, 2026/); assert.ok(!/Results locked 2026-11-10/.test(html));
  const api = await (await get(archiveGet, "/api/archive", env)).json(); assert.equal(api[0].awards[0].tie, "Tied (2 homes, 2 votes each)");
});

// ---------------- CON-10: the trailing dash ----------------
test("CON-10: a name cut at 40 characters never leaves a dash on the end of the address (the Covina slug), also with a collision tail", async () => {
  assert.equal(contestSlug("Light Up The Town! Holiday Home Lighting Contest 2026"), "light-up-the-town-holiday-home-lighting");
  assert.equal(contestSlug("!!!"), "contest"); assert.equal(contestSlug("Maple Street Showdown"), "maple-street-showdown");
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@city.gov");
  const body = { name: "Light Up The Town! Holiday Home Lighting Contest 2026", org: "City of Covina", city: "Pasadena", descr: "Neighbors decorate, everyone votes for a favorite.", site: "https://city.gov", closes: clientToday(Date.now() + 10 * 86400e3), vs: clientToday(Date.now() + 11 * 86400e3), ve: clientToday(Date.now() + 25 * 86400e3), cats: ["Best Overall"] };
  const make = () => J(createContest({ request: new Request(O + "/api/contests", { method: "POST", headers: { "content-type": "application/json", cookie: u.cookie }, body: JSON.stringify(body) }), env, waitUntil: () => {} }));
  const a = await make(), b = await make();
  assert.equal(a.slug, "light-up-the-town-holiday-home-lighting"); assert.ok(!/-$/.test(b.slug) && !/--/.test(b.slug) && b.slug.startsWith(a.slug.slice(0, 20)), "second one: " + b.slug);
});
test("CON-10: the live link that ends in '-' redirects to the trimmed address (query kept), and the migration trims the stored slug", async () => {
  const { env, raw } = newEnv(); seed(raw, { slug: "light-up-the-town-holiday-home-lighting" });
  assert.equal(await trimmedSlugFor(env, "light-up-the-town-holiday-home-lighting-"), "light-up-the-town-holiday-home-lighting");
  assert.equal(await trimmedSlugFor(env, "light-up-the-town-holiday-home-lighting"), "", "a normal address is not redirected");
  assert.equal(await trimmedSlugFor(env, "no-such-contest-"), "");
  const r = await contestPage({ request: new Request(O + "/c/light-up-the-town-holiday-home-lighting-?src=qr"), env: { ...env, ASSETS: assets }, params: { slug: "light-up-the-town-holiday-home-lighting-" } });
  assert.equal(r.status, 301); assert.equal(r.headers.get("location"), O + "/c/light-up-the-town-holiday-home-lighting?src=qr");
  const m = await manageRedirect({ request: new Request(O + "/c/light-up-the-town-holiday-home-lighting-/manage"), env: { ...env, ASSETS: assets }, params: { slug: "light-up-the-town-holiday-home-lighting-" } });
  assert.equal(m.status, 301); assert.equal(m.headers.get("location"), O + "/c/light-up-the-town-holiday-home-lighting/manage");
  const e = await enterPage({ request: new Request(O + "/c/light-up-the-town-holiday-home-lighting-/enter"), env: { ...env, ASSETS: assets }, params: { slug: "light-up-the-town-holiday-home-lighting-" } });
  assert.equal(e.status, 301); assert.equal(e.headers.get("location"), O + "/c/light-up-the-town-holiday-home-lighting/enter");
  // the migration, on the database as the live site has it (the contest stored with the dash)
  const sql = readFileSync("migrations/" + readdirSync("migrations").find((f) => /contest_slug_trailing_dash/.test(f)), "utf8");
  const { env: e2, raw: r2 } = newEnv(); seed(r2, { slug: "light-up-the-town-holiday-home-lighting-" });
  r2.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval) VALUES ('c2','taken-',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run("uO", "T", "O", "Pasadena", "Los Angeles", "christmas", "live", "2026-12-10", "2026-12-12", "2026-12-20", "[]", "public", "pick", "o@city.gov", "d", "manual");
  r2.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval) VALUES ('c3','taken',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run("uO", "T2", "O", "Pasadena", "Los Angeles", "christmas", "live", "2026-12-10", "2026-12-12", "2026-12-20", "[]", "public", "pick", "o@city.gov", "d", "manual");
  r2.exec(sql);
  assert.equal(r2.prepare("SELECT slug FROM contests WHERE id = 'c1'").get().slug, "light-up-the-town-holiday-home-lighting");
  assert.equal(r2.prepare("SELECT slug FROM contests WHERE id = 'c2'").get().slug, "taken-", "left alone when the trimmed address is already another contest's");
  // and the old address, now not stored, redirects
  const old = await contestPage({ request: new Request(O + "/c/light-up-the-town-holiday-home-lighting-"), env: { ...e2, ASSETS: assets }, params: { slug: "light-up-the-town-holiday-home-lighting-" } });
  assert.equal(old.status, 301);
});
test("CON-28: /c/<slug>/enter for a contest that does not exist goes to /contests", async () => {
  const { env } = newEnv();
  const r = await enterPage({ request: new Request(O + "/c/nope/enter"), env: { ...env, ASSETS: assets }, params: { slug: "nope" } });
  assert.equal(r.status, 302); assert.equal(r.headers.get("location"), O + "/contests");
  assert.match(readFileSync("public/contest-enter.html", "utf8"), /if \(!slug\) location\.replace\("\/contests"\)/);
});

// ---------------- CON-19: the vote-speed flag ----------------
test("CON-19: honest voters are not flagged; only votes faster than a person can look at homes are", () => {
  const s = (...secs) => secs.map((x) => Date.UTC(2026, 11, 12, 18, 0, 0) + x * 1000);
  assert.equal(fastVoteReason(s(0, 6, 13, 21)), "", "four categories in 21 seconds is a normal voter");
  assert.equal(fastVoteReason(s(0, 3.5, 7)), "", "3.5 seconds a vote is fine");
  assert.equal(fastVoteReason(s(0, 40)), "", "two votes never flag");
  assert.equal(fastVoteReason(s(0, 4, 9)), "");
  assert.match(fastVoteReason(s(0, 1, 2, 3)), /^Cast 4 votes in 3 seconds\. People usually take longer/);
  assert.match(fastVoteReason(s(0, 0, 0)), /under a second/);
});
test("CON-19: the organizer's vote list flags the script and leaves the careful voter alone", async () => {
  const { env, raw } = newEnv(); seed(raw); const owner = await addUser(raw, "uO", "owner@city.gov");
  const ins = raw.prepare("INSERT INTO votes (id,contest_id,user_id,post_id,category,created_at) VALUES (?,?,?,?,?,?)");
  for (const [u, e] of [["honest", "h@example.com"], ["robot", "r@example.com"]]) raw.prepare("INSERT INTO users (id,email,name) VALUES (?,?,?)").run(u, e, "");
  ["Best Overall", "Most Creative", "Best Animated"].forEach((k, i) => { ins.run("h" + i, "c1", "honest", "pa", k, `2026-12-12 18:00:${String(i * 9).padStart(2, "0")}`); ins.run("r" + i, "c1", "robot", "pb", k, `2026-12-12 18:05:0${i}`); });
  const j = await (await votesGet({ params: { slug: "show" }, request: new Request(O + "/api/contests/show/votes", { headers: { cookie: owner.cookie } }), env })).json();
  assert.deepEqual([...new Set(j.votes.filter((v) => v.flags.length).map((v) => v.email))], ["r@example.com"]);
  assert.match(j.votes.find((v) => v.email === "r@example.com").flags[0], /Cast 3 votes in 2 seconds/);
});

// ---------------- CON-26: the vote limit ----------------
test("CON-26: 40 votes a minute per connection, then a friendly 429; another connection is not affected", async () => {
  const { env, raw } = newEnv(); seed(raw); const u = await addUser(raw, "v1", "v1@example.com"), w = await addUser(raw, "v2", "v2@example.com");
  await at("2026-12-13T20:00:00Z", async () => {
    for (let i = 0; i < 40; i++) assert.equal((await castVote(env, u.cookie, { post_id: i % 2 ? "pa" : "pb", category: "Best Overall" }, "203.0.113.9")).status, 200, "vote " + (i + 1));
    const r = await J(castVote(env, u.cookie, { post_id: "pa", category: "Best Overall" }, "203.0.113.9"));
    assert.equal(r.http, 429); assert.match(r.error, /Slow down/);
    assert.equal((await castVote(env, w.cookie, { post_id: "pa", category: "Best Overall" }, "203.0.113.10")).status, 200, "a different connection votes normally");
  });
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM votes WHERE user_id = 'v1'").get().n, 1, "still one vote per category");
});

// ---------------- CON-21: the entry confirmation ----------------
test("CON-21: entering a contest sends a 'we received your entry' email with the voting dates and the contest link", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test", PHOTOS: { put: async () => {}, get: async () => null, delete: async () => {} } }); seed(raw, { close: "2099-12-10", vs: "2099-12-12", ve: "2099-12-20" });
  const u = await addUser(raw, "u9", "entrant@example.com"), sent = [];
  const f = stubFetch((url, init) => { url = String(url); if (/resend/.test(url)) { sent.push(JSON.parse(init.body)); return new Response(JSON.stringify({ id: "m1" }), { status: 200 }); } if (/census/.test(url)) return new Response(JSON.stringify({ result: { addressMatches: [{ coordinates: { x: -118.1, y: 34.1 }, matchedAddress: "1 MAIN ST" }] } })); return new Response("", { status: 404 }); });
  try {
    const fd = new FormData(); for (const [k, v] of Object.entries({ contest: "show", rules: "1", biz: "Lee Family", title: "Lee Family", street: "1 Main St", city: "Pasadena", state: "CA", zip: "91101", desc: "Lots of lights." })) fd.append(k, v);
    fd.append("photos", new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1])], "a.jpg", { type: "image/jpeg" }));
    const jobs = []; const r = await submit({ request: new Request(O + "/api/submit", { method: "POST", headers: { cookie: u.cookie, "CF-Connecting-IP": "203.0.113.50" }, body: fd }), env, waitUntil: (p) => jobs.push(p) });
    assert.equal(r.status, 200); await Promise.all(jobs);
    const mail = sent.flatMap((b) => (Array.isArray(b) ? b : [b])).find((m) => /received your entry/.test(m.subject || ""));
    assert.ok(mail, "an entry_received email went out: " + JSON.stringify(sent.map((s) => s.subject)));
    assert.deepEqual([].concat(mail.to), ["entrant@example.com"]);
    assert.match(mail.text || mail.html, /Dec 12, 2099 to Dec 20, 2099/); assert.match(mail.text || mail.html, /Pacific/); assert.match(mail.text || mail.html, /socallights\.app\/c\/show/); assert.match(mail.text || mail.html, /withdraw/i);
  } finally { f.restore(); }
});

// ---------------- page rules that are plain text ----------------
const page = (f) => readFileSync("public/" + f, "utf8");
test("CON-05: no contest page works out a date with toISOString (that is the UTC date); the wizard uses the Pacific date", () => {
  for (const f of ["contest.html", "contests.html", "judge.html", "organizer.html", "contest-enter.html"]) assert.ok(!/new Date\([^)]*\)\.toISOString\(\)\.slice\(0, 10\)/.test(page(f)), f + " still works out the date in the browser");
  assert.ok(!/8 \* 3600_000/.test(page("organizer.html")) && !/8 \* 3600_000/.test(page("add-contest.html")), "no fixed UTC-8");
  assert.match(page("add-contest.html"), /ptToday\(\)/);
});
test("CON-01 / CON-02: the judge ballot has tap chips 1 to 10 (no squeezed select), a Start button and a checklist", () => {
  const h = page("judge.html");
  assert.ok(!/<select/.test(h), "no select box for the score"); assert.match(h, /data-chip=/); assert.match(h, /id="startscoring"/); assert.match(h, /Your categories/); assert.match(h, /homes scored/);
  assert.match(h, /Your \$\{score \? "score" : "pick"\} for it won't count/);
  assert.match(page("contest.css"), /\.chip\{min-height:44px/);
});
test("CON-31: a vote tap sends one request at a time and the confirmation stays on the page", () => {
  const h = page("contest.html");
  assert.match(h, /if \(BUSY\) return/); assert.match(h, /VOTEMSG = /); assert.match(h, /role="status" aria-live="polite">\$\{esc\(VOTEMSG\)\}/);
});
test("CON-12 / CON-15 / CON-16 / CON-17 / CON-14: contest page wording", () => {
  const h = page("contest.html");
  assert.match(h, /Voting ended \$\{fmt\(c\.frozenAt \|\| c\.voteEnd\)\}/);
  assert.match(h, /entriesClosedText\(c\)/); assert.ok(!/aria-disabled="true"/.test(h), "closed entries is text, not a disabled button");
  assert.match(h, /Drive past these homes in a few routes/); assert.match(h, /aria-label="On map: /);
  assert.match(page("contest-enter.html"), /entriesClosedText\(C\)/);
  assert.equal(entriesClosedText({ entriesState: "ended", entriesClose: "2026-11-10", votingState: "before", voteStart: "2026-12-12" }), "Entries closed on Nov 10, 2026. Voting opens Dec 12, 2026.");
  assert.equal(entriesClosedText({ entriesState: "paused" }), "The organizer has paused new entries for now.");
});
test("CON-04 / CON-18 / CON-23 / CON-30: dashboard after announcing, entries order, the announce panel, votes and voters", () => {
  const h = page("organizer.html");
  assert.match(h, /Winners announced\$\{c\.frozenAt/); assert.match(h, /c\.announced \? doneCards|\$\{c\.announced \? `<div class="card annc">/);
  assert.match(h, /sort\(\(a, b\) => \(b\.status === "pending"\) - \(a\.status === "pending"\)\)/); assert.match(h, /class="qlink" data-entry=/); assert.match(h, /a === "flag" && !confirm\(/);
  assert.match(h, /function announceDialog\(\)/); assert.ok(!/Tap again to confirm\. This ends voting/.test(h)); assert.match(h, /Not yet/);
  assert.match(h, /Votes\$\{ST\.voters \? ` \(\$\{ST\.voters\} voter/);
});
