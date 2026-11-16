// Payments audit 2026-11-16, contest lifecycle and vote integrity (PR 2): M1 announce while voting is open, M2 entrant text edits, M7 allowance re-check, M9 staff/judge/duplicate entries,
// M10 Admin edit validation and announced lock, L3 judge conflicts and judge removal log, L6 announce reminder, L7 withdraw/decline vote count in the log. In-memory D1; fetch is stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPatch as patchContest } from "../functions/api/contests/[slug].js";
import { onRequestPatch as mineEdit, onRequestDelete as mineDelete } from "../functions/api/contests/[slug]/mine.js";
import { onRequestPost as entryAction } from "../functions/api/contests/[slug]/entries/[id].js";
import { onRequestPost as judgePost } from "../functions/api/contests/[slug]/judge.js";
import { onRequestDelete as judgeRemove } from "../functions/api/contests/[slug]/judges.js";
import { onRequestPost as submit } from "../functions/api/submit.js";
import { onRequestPost as adminContest } from "../functions/api/admin/contests/[id].js";
import { onRequestPost as remind } from "../functions/api/contest-remind.js";
import { overAllowance } from "../functions/_lib/passkey.js";
import { TEMPLATES } from "../functions/_lib/mailtpl.js";
import { newEnv as baseEnv, addUser, stubFetch, compEveryone } from "./_pay.mjs";

const O = "https://socallights.app";
const newEnv = (extra) => { const r = baseEnv(extra); compEveryone(r.raw); return r; };
const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})) }; };
const rq = (url, body, cookie, method) => new Request(O + url, { method: method || (body ? "POST" : "GET"), headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
async function at(iso, fn) { // freezes Date.now() and new Date()
  const RealDate = Date, t = RealDate.parse(iso);
  class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } }
  globalThis.Date = FakeDate; try { return await fn(); } finally { globalThis.Date = RealDate; }
}
function seed(raw, o = {}) {
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval,rules,org_key,live_at) VALUES ('c1','show','uO','Show Contest','City','Pasadena','Los Angeles','christmas','live',?,?,?,?,?,?,'owner@city.gov','A long enough welcome message here',?,'rules rules rules rules rules rules rules rules rules rules','d:city.gov','2026-11-10')")
    .run(o.close || "2026-12-10", o.vs || "2026-12-12", o.ve || "2026-12-20", JSON.stringify(["Best Overall"]), o.mode || "public", o.method || "pick", o.approval || "manual");
  const ins = raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,contest_id,user_id,entry_no,approved_at) VALUES (?,?,?,?,'Pasadena',34.1,-118.1,'old text','[]',?,'christmas',?,?,'91101','c1',?,?,datetime('now'))");
  for (const [i, p] of ["a", "b"].entries()) { ins.run("p" + p, "approved", "Biz " + p, "Home " + p, `${p}@example.com`, `${i + 1} Oak St`, `${i + 1} Oak St`, "e" + p, i + 1); }
}
const vote = (raw, id, user, post, cat = "Best Overall") => raw.prepare("INSERT INTO votes (id,contest_id,user_id,post_id,category) VALUES (?,?,?,?,?)").run(id, "c1", user, post, cat);
const changes = (raw) => raw.prepare("SELECT field, old, new, by_email FROM contest_changes WHERE contest_id = 'c1' ORDER BY rowid").all().map((r) => ({ ...r }));

test("M1: announcing while voting is still open asks for confirmation even when votes exist; after the end date it does not", async () => {
  const { env, raw } = newEnv(); seed(raw); const owner = await addUser(raw, "uO", "owner@city.gov"); await addUser(raw, "v1", "v1@example.com"); vote(raw, "x1", "v1", "pa");
  const announce = (force) => J(patchContest({ params: { slug: "show" }, request: rq("/x", { action: "announce", ...(force ? { force: true } : {}) }, owner.cookie, "PATCH"), env }));
  await at("2026-12-15T20:00:00Z", async () => { const r = await announce(false); assert.equal(r.status, 409); assert.equal(r.body.needs_force, true); assert.match(r.body.reason, /Voting is still open until 2026-12-20/); });
  await at("2026-12-21T20:00:00Z", async () => { const r = await announce(false); assert.equal(r.status, 200, JSON.stringify(r.body)); });
});

test("M2: an entrant's edit of an approved entry is logged for the organizer; text that trips the word filter sends it back for review", async () => {
  const { env, raw } = newEnv(); seed(raw); const a = await addUser(raw, "ea", "a@example.com");
  const edit = (name, desc) => J(mineEdit({ params: { slug: "show" }, request: rq("/x", { id: "pa", name, desc }, a.cookie, "PATCH"), env }));
  assert.equal((await edit("Home a", "old text")).status, 200); assert.equal(changes(raw).length, 0, "no change, no log");
  assert.equal((await edit("Home A deluxe", "Lights and music")).status, 200);
  assert.equal(changes(raw).length, 1); assert.match(changes(raw)[0].field, /Entry #1 text changed by the entrant/); assert.match(changes(raw)[0].new, /Home A deluxe/);
  assert.equal(raw.prepare("SELECT status FROM posts WHERE id = 'pa'").get().status, "approved");
  const r = await edit("Best casino lights", "Visit our casino"); assert.equal(r.status, 200); assert.equal(r.body.review, true);
  assert.equal(raw.prepare("SELECT status FROM posts WHERE id = 'pa'").get().status, "pending", "back in the organizer's review list");
  assert.match(changes(raw).at(-1).field, /sent back for review/);
});

test("L7: withdrawing or declining an entry that has votes writes the vote count to the change log", async () => {
  const { env, raw } = newEnv({ PHOTOS: { put: async () => {}, get: async () => null, delete: async () => {} } }); seed(raw); const a = await addUser(raw, "ea", "a@example.com"), owner = await addUser(raw, "uO", "owner@city.gov");
  for (const u of ["v1", "v2"]) await addUser(raw, u, u + "@example.com"); vote(raw, "x1", "v1", "pa"); vote(raw, "x2", "v2", "pa"); vote(raw, "x3", "v1", "pb", "Other");
  assert.equal((await J(mineDelete({ params: { slug: "show" }, request: rq("/x?id=pa", null, a.cookie, "DELETE"), env }))).status, 200);
  assert.deepEqual(changes(raw).map((c) => [c.field, c.old, c.new]), [["Entry #1 withdrawn by the entrant", "2 votes counted", "2 votes removed with the entry"]]);
  const d = await J(entryAction({ params: { slug: "show", id: "pb" }, request: rq("/x", { action: "decline", reason: "dup" }, owner.cookie), env })); assert.equal(d.status, 200);
  assert.equal(changes(raw).at(-1).field, "Entry #2 declined"); assert.equal(changes(raw).at(-1).by_email, "owner@city.gov");
});

test("M7: the allowance is counted again after the insert: a second live contest over a single-contest pass is detected", async () => {
  const { env, raw } = baseEnv(); const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
  raw.prepare("INSERT INTO contest_passes (session_id, org_key, cap, window_start, window_end, cents, status) VALUES ('s1','d:x.gov',1,?,'2099-01-01',14900,'active')").run(today);
  const mk = (id) => raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,org_key,live_at) VALUES (?,?,'u','N','O','Pasadena','Los Angeles','christmas','live','2099-12-10','2099-12-12','2099-12-20','[]','d:x.gov',?)").run(id, id, today);
  mk("a"); assert.equal(await overAllowance(env, "d:x.gov"), false, "one contest on a one-contest pass is fine");
  mk("b"); assert.equal(await overAllowance(env, "d:x.gov"), true, "the second one raced past the gate");
  assert.match(readFileSync("functions/api/contests/index.js", "utf8"), /overAllowance\(env, gate\.key\)/); assert.match(readFileSync("functions/api/contests/[slug].js", "utf8"), /overAllowance\(env, gate\.key\)/);
});

test("M9: the contest's organizer, a co-organizer and a judge cannot enter it, and one address enters once", async () => {
  const { env, raw } = newEnv({ PHOTOS: { put: async () => {}, get: async () => null, delete: async () => {} } }); seed(raw, { close: "2099-12-10", vs: "2099-12-12", ve: "2099-12-20", mode: "both" });
  const owner = await addUser(raw, "uO", "owner@city.gov"), co = await addUser(raw, "uC", "co@city.gov"), judge = await addUser(raw, "uJ", "judge@x.com"), ok = await addUser(raw, "uN", "neighbor@example.com"), dup = await addUser(raw, "uD", "dup@example.com");
  raw.prepare("INSERT INTO contest_staff (contest_id, email) VALUES ('c1','co@city.gov')").run();
  raw.prepare("INSERT INTO judges (id,contest_id,email,token,user_id) VALUES ('j1','c1','judge@x.com','tk','uJ')").run();
  const f = stubFetch((url) => (/census/.test(String(url)) ? new Response(JSON.stringify({ result: { addressMatches: [{ coordinates: { x: -118.1, y: 34.1 }, matchedAddress: "X" }] } })) : new Response("", { status: 404 })));
  let n = 0;
  const enter = async (u, street) => { const fd = new FormData(); for (const [k, v] of Object.entries({ contest: "show", rules: "1", biz: "Family", title: "Family", street, city: "Pasadena", state: "CA", zip: "91101", desc: "Lots of lights." })) fd.append(k, v); fd.append("photos", new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1])], "a.jpg", { type: "image/jpeg" })); const r = await submit({ request: new Request(O + "/api/submit", { method: "POST", headers: { cookie: u.cookie, "CF-Connecting-IP": "203.0.113." + ++n }, body: fd }), env, waitUntil: () => {} }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  try {
    for (const u of [owner, co, judge]) { const r = await enter(u, "9 Elm St"); assert.equal(r.status, 400); assert.match(r.body.error, /can't enter their own contest/); }
    const first = await enter(ok, "9 Elm St"); assert.equal(first.status, 200, JSON.stringify(first.body));
    const again = await enter(dup, "9 Elm Street"); assert.equal(again.status, 400); assert.match(again.body.error, /already entered in this contest/);
    assert.equal((await enter(dup, "1 Oak St")).status, 400, "1 Oak St is already an entry (seed)");
    assert.equal((await enter(dup, "22 Pine Ave")).status, 200, "a different address is fine");
  } finally { f.restore(); }
});

test("M10: Admin edit checks the city and the date order, and locks name, organizer, city and dates once winners are announced", async () => {
  const { env, raw } = newEnv(); seed(raw);
  const edit = (o) => J(adminContest({ params: { id: "c1" }, request: rq("/x", { action: "edit", name: "Show Contest", org: "City", city: "Pasadena", descr: "A long enough welcome message here", site: "", contact_email: "owner@city.gov", entries_close: "2026-12-10", vote_start: "2026-12-12", vote_end: "2026-12-20", ...o }), env, waitUntil: () => {} }));
  assert.equal((await edit({})).status, 200);
  assert.equal((await edit({ city: "Atlantis" })).status, 400);
  assert.equal((await edit({ vote_start: "2026-12-09" })).status, 400, "voting before entries close");
  assert.equal((await edit({ vote_end: "2026-12-12" })).status, 400, "voting ends the day it starts");
  assert.equal((await edit({ contact_email: "not an email" })).status, 400);
  const moved = await edit({ contact_email: "new@city.gov" }); assert.equal(moved.status, 200); assert.match(moved.body.note, /did not/);
  assert.equal(raw.prepare("SELECT owner_id FROM contests WHERE id = 'c1'").get().owner_id, "uO", "the organizer account is untouched");
  raw.prepare("UPDATE contests SET announced = 1, results = '{}' WHERE id = 'c1'").run();
  assert.equal((await edit({ contact_email: "new@city.gov", name: "Renamed" })).status, 409);
  assert.equal((await edit({ contact_email: "new@city.gov", vote_end: "2026-12-30" })).status, 409);
  assert.equal((await edit({ contact_email: "new@city.gov", descr: "A different welcome message here" })).status, 200, "text can still change");
});

test("L3: a judge cannot toggle a conflict on a home they already voted on; removing a judge names them in the log", async () => {
  const { env, raw } = newEnv(); seed(raw, { vs: "2026-12-01", ve: "2099-12-20", mode: "judges" }); const judge = await addUser(raw, "uJ", "judge@x.com"), owner = await addUser(raw, "uO", "owner@city.gov");
  raw.prepare("INSERT INTO judges (id,contest_id,email,token,user_id) VALUES ('j1','c1','judge@x.com','tk','uJ')").run();
  await at("2026-12-15T20:00:00Z", async () => {
    const post = (b) => J(judgePost({ params: { slug: "show" }, request: rq("/x", b, judge.cookie), env }));
    assert.equal((await post({ action: "conflict", post_id: "pa", on: true })).status, 200, "declared before voting");
    assert.equal((await post({ action: "pick", post_id: "pb", category: "Best Overall" })).status, 200);
    assert.equal((await post({ action: "conflict", post_id: "pb", on: true })).status, 400, "locked once picked");
    assert.equal((await post({ action: "conflict", post_id: "pa", on: false })).status, 200, "a home without a pick can still be changed");
    const r = await J(judgeRemove({ params: { slug: "show" }, request: rq("/x?id=j1", null, owner.cookie, "DELETE"), env, waitUntil: () => {} })); assert.equal(r.status, 200);
    assert.match(changes(raw).at(-1).new, /Removed judge judge@x\.com \(their 1 pick or score were deleted\)/);
  });
});

test("L6: the day after voting ends the organizer is emailed once to announce; Admin is told after 7 days; already-announced and old contests are left alone", async () => {
  const { env, raw } = newEnv({ ALERT_CRON_KEY: "k".repeat(20) }); seed(raw, { close: "2026-12-01", vs: "2026-12-02", ve: "2026-12-10" });
  assert.ok(TEMPLATES.some((t) => t.id === "contest_announce_reminder"));
  const run = () => J(remind({ request: new Request(O + "/api/contest-remind", { method: "POST", headers: { "x-alert-key": "k".repeat(20) } }), env }));
  const f = stubFetch((url) => new Response(JSON.stringify({ id: "m1" }), { status: 200 }));
  try {
    await at("2026-12-10T20:00:00Z", async () => { assert.equal((await run()).body.announce.organizers, 0, "voting ends today: not yet"); });
    await at("2026-12-11T20:00:00Z", async () => {
      assert.equal((await run()).body.announce.organizers, 1); assert.equal((await run()).body.announce.organizers, 0, "once");
      assert.equal(raw.prepare("SELECT remind_announce AS r FROM contests WHERE id = 'c1'").get().r, 1);
      assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM mail_outbox WHERE template = 'contest_announce_reminder' AND to_email = 'owner@city.gov'").get().n, 1);
    });
    await at("2026-12-18T20:00:00Z", async () => { assert.equal((await run()).body.announce.admin, 1); assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM ops_log WHERE kind = 'contest' AND detail LIKE '%still not announced%'").get().n, 1); assert.equal((await run()).body.announce.admin, 0); });
    raw.prepare("UPDATE contests SET remind_announce = 0, announced = 1, results = '{}'").run();
    await at("2026-12-11T20:00:00Z", async () => { assert.equal((await run()).body.announce.organizers, 0, "announced contests are not reminded"); });
  } finally { f.restore(); }
  assert.match(readFileSync("migrations/0267_contest_announce_reminder.sql", "utf8"), /ADD COLUMN remind_announce/);
});
