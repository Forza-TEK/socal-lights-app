// Creation audit second pass (2026-11-16): H2 official-sounding hold on edit (the contest stays live under its old name), H3 clone of a taken-down contest (verification),
// M7 category/judge limits refused with a message, M8 contest entry rules (photo, other city, duplicate address), L9 Turnstile, one pending contest per account, throttled admin mail.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as createContest } from "../functions/api/contests/index.js";
import { onRequestPatch as patchContest } from "../functions/api/contests/[slug].js";
import { onRequestPost as adminContest } from "../functions/api/admin/contests/[id].js";
import { onRequestPost as submit } from "../functions/api/submit.js";
import { newEnv as baseEnv, addUser, stubFetch, compEveryone, ptToday } from "./_pay.mjs";

const O = "https://socallights.app";
const newEnv = (extra) => { const r = baseEnv({ RESEND_API_KEY: "re_test", ADMIN_NOTIFY_EMAIL: "admin@example.com", PHOTOS: { put: async () => {}, get: async () => null, delete: async () => {} }, ...extra }); compEveryone(r.raw); return r; };
const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})) }; };
const rq = (url, body, cookie, method) => new Request(O + url, { method: method || (body ? "POST" : "GET"), headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const good = (o = {}) => ({ name: "Maple Street Showdown", org: "Maple Street Neighbors", city: "Pasadena", descr: "Neighbors decorate, everyone votes for a favorite.", site: "", closes: ptToday(10), vs: ptToday(11), ve: ptToday(25), cats: ["Best Overall"], ...o });
const make = (env, cookie, o) => J(createContest({ request: rq("/api/contests", good(o), cookie), env, waitUntil: () => {} }));
const row = (raw, slug) => raw.prepare("SELECT * FROM contests WHERE slug = ?").get(slug);
// Records every outgoing mail (Resend) so a test can see who was written to
function mailSpy() { const sent = []; const f = stubFetch((url, init) => { if (/resend/.test(String(url))) sent.push(String(init && init.body)); return new Response(JSON.stringify({ id: "x" }), { status: 200 }); }); return { sent, restore: f.restore }; }
const edit = (env, cookie, slug, o, W) => J(patchContest({ params: { slug }, request: rq("/x", { action: "edit", name: "Holiday Lights Contest", org: "Oak Hill Neighbors", descr: "Neighbors decorate, everyone votes for a favorite.", closes: ptToday(10), vs: ptToday(11), ve: ptToday(25), rules: "These are the official rules of this contest. ".repeat(3), approval: "manual", prizeMode: "none", ...o }, cookie, "PATCH"), env, waitUntil: W || (() => {}) }));

test("H2: editing a live contest to an official-sounding name keeps it live under the old name, holds the rename, notes it and tells Admin; Admin approving applies it", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "owner@gmail.com"), spy = mailSpy(), jobs = [];
  try {
    const made = await make(env, u.cookie, { name: "Holiday Lights Contest", org: "Oak Hill Neighbors" }); assert.equal(made.status, 200); assert.equal(made.body.status, "live");
    const r = await edit(env, u.cookie, made.body.slug, { name: "City of Covina Official Holiday Contest", org: "City of Covina", descr: "A new welcome message for neighbors." }, (p) => jobs.push(p));
    assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.held, true);
    await Promise.all(jobs);
    const c = row(raw, made.body.slug);
    assert.equal(c.status, "live", "not unlisted"); assert.equal(c.name, "Holiday Lights Contest"); assert.equal(c.org, "Oak Hill Neighbors");
    assert.match(c.note, /official-sounding name held on edit/); assert.equal(JSON.parse(c.pending_edit).name, "City of Covina Official Holiday Contest");
    assert.ok(spy.sent.some((b) => /admin@example\.com/.test(b)), "Admin was told");
    // the other fields of the same edit (dates etc.) were saved
    const ad = await J(adminContest({ params: { id: c.id }, request: rq("/x", { action: "approve" }), env, waitUntil: () => {} })); assert.equal(ad.status, 200);
    const d = row(raw, made.body.slug); assert.equal(d.name, "City of Covina Official Holiday Contest"); assert.equal(d.org, "City of Covina"); assert.equal(d.pending_edit, ""); assert.equal(d.note, ""); assert.equal(d.status, "live");
  } finally { spy.restore(); }
});

test("H2: not re-held when the name was already official-sounding, nor for a matching organizer, nor for an ordinary rename", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "owner@gmail.com"), m = await addUser(raw, "u2", "me@covina.gov"), spy = mailSpy();
  try {
    // already official-sounding (created held, Admin approved): later edits go through
    const made = await make(env, u.cookie, { name: "City of Covina Holiday Contest", org: "City of Covina" }); assert.equal(made.body.status, "pending");
    raw.prepare("UPDATE contests SET status='live', note='' WHERE slug = ?").run(made.body.slug);
    const r = await edit(env, u.cookie, made.body.slug, { name: "City of Covina Holiday Contest 2026", org: "City of Covina" }); assert.equal(r.status, 200); assert.equal(r.body.held, undefined);
    assert.equal(row(raw, made.body.slug).name, "City of Covina Holiday Contest 2026"); assert.equal(row(raw, made.body.slug).pending_edit, "");
    // a matching organizer
    const mm = await make(env, m.cookie, { name: "Covina Lights", org: "Covina Parks", site: "https://covina.gov" }); assert.equal(mm.body.status, "live");
    const r2 = await edit(env, m.cookie, mm.body.slug, { name: "City of Covina Official Lights", org: "City of Covina" }); assert.equal(r2.body.held, undefined);
    assert.equal(row(raw, mm.body.slug).name, "City of Covina Official Lights");
    // an ordinary rename
    const o = await make(env, u.cookie, { name: "Pine Street Lights", org: "Pine Street", city: "Irvine" }); const r3 = await edit(env, u.cookie, o.body.slug, { name: "Pine Street Lights 2026", org: "Pine Street" });
    assert.equal(r3.body.held, undefined); assert.equal(row(raw, o.body.slug).name, "Pine Street Lights 2026");
  } finally { spy.restore(); }
});

test("H2: review words typed into a live contest's text on edit are held the same way (old text stays), and the contest stays live", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "owner@gmail.com"), spy = mailSpy();
  try {
    const made = await make(env, u.cookie, { name: "Plain Lights Contest", org: "Oak Hill Neighbors" });
    const r = await edit(env, u.cookie, made.body.slug, { name: "Plain Lights Contest", org: "Oak Hill Neighbors", descr: "Win bitcoin prizes for your lights!!" }); assert.equal(r.body.held, true);
    const c = row(raw, made.body.slug); assert.equal(c.status, "live"); assert.match(c.descr, /Neighbors decorate/); assert.match(c.note, /review words/);
    // create: review words hold the contest
    const b = await make(env, u.cookie, { name: "Casino Night Lights", org: "Oak Hill Neighbors" }); assert.equal(b.body.status, "pending"); assert.match(row(raw, b.body.slug).note, /review words/);
  } finally { spy.restore(); }
});

test("H3 (verify): clone is refused for a declined, held or Admin-closed contest and creates nothing; a live one can be cloned", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "owner@gmail.com"), spy = mailSpy();
  try {
    const made = await make(env, u.cookie, {}); const slug = made.body.slug;
    const clone = () => J(patchContest({ params: { slug }, request: rq("/x", { action: "clone" }, u.cookie, "PATCH"), env, waitUntil: () => {} }));
    const count = () => raw.prepare("SELECT COUNT(*) AS n FROM contests").get().n;
    raw.prepare("UPDATE contests SET status='declined', unpublished_by='' WHERE slug = ?").run(slug);
    assert.equal((await clone()).status, 400); assert.equal(count(), 1);
    raw.prepare("UPDATE contests SET status='pending' WHERE slug = ?").run(slug); assert.equal((await clone()).status, 400); assert.equal(count(), 1);
    raw.prepare("UPDATE contests SET status='live' WHERE slug = ?").run(slug); const ok = await clone(); assert.equal(ok.status, 200, JSON.stringify(ok.body)); assert.equal(count(), 2);
  } finally { spy.restore(); }
});

test("M7: more than 8 categories or 15 judges is a 400 with a message (create and edit), never a silent cut", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "owner@gmail.com"), spy = mailSpy();
  try {
    const cats = Array.from({ length: 9 }, (_, i) => "Category " + (i + 1));
    const a = await make(env, u.cookie, { cats }); assert.equal(a.status, 400); assert.match(a.body.error, /at most 8 categories/);
    const judges = Array.from({ length: 16 }, (_, i) => `j${i}@example.com`);
    const b = await make(env, u.cookie, { mode: "judges", judges }); assert.equal(b.status, 400); assert.match(b.body.error, /at most 15 judges/);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contests").get().n, 0);
    assert.equal((await make(env, u.cookie, { cats: cats.slice(0, 8) })).status, 200, "8 is fine");
    const slug = raw.prepare("SELECT slug FROM contests").get().slug;
    const e = await edit(env, u.cookie, slug, { name: "Maple Street Showdown", org: "Maple Street Neighbors", cats }); assert.equal(e.status, 400); assert.match(e.body.error, /at most 8 categories/);
    const src = readFileSync("public/add-contest.html", "utf8");
    assert.match(src, /of \$\{MAXC\} categories/); assert.match(src, /of \$\{MAXJ\} judges/); assert.match(src, /Add<\/button>|data-a="addcat"\$\{x\.on\.length >= MAXC/);
  } finally { spy.restore(); }
});

// A live contest in Pasadena for entry tests
function seedEntryContest(raw, o = {}) {
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval,rules,org_key,live_at) VALUES ('c1','show','uO','Show Contest','City','Pasadena','Los Angeles','christmas','live',?,?,?,?,'public','pick','owner@city.gov','A long enough welcome message here',?,'rules rules rules rules rules rules rules rules rules rules','d:city.gov','2026-11-10')")
    .run(ptToday(10), ptToday(11), ptToday(20), JSON.stringify(["Best Overall"]), o.approval || "auto");
}
const JPG = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1])], "a.jpg", { type: "image/jpeg" });
async function enter(env, u, o = {}, photos = 1) {
  const fd = new FormData(); for (const [k, v] of Object.entries({ contest: "show", rules: "1", biz: "Family", title: "Family", street: "9 Elm St", city: "Pasadena", state: "CA", zip: "91101", desc: "Lots of lights.", ...o })) fd.append(k, v);
  for (let i = 0; i < photos; i++) fd.append("photos", JPG());
  const r = await submit({ request: new Request(O + "/api/submit", { method: "POST", headers: { cookie: u.cookie, "CF-Connecting-IP": "203.0.113.9" }, body: fd }), env, waitUntil: () => {} });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

test("M8: a contest entry needs a photo; another city is kept but not auto-approved and the organizer is told; a duplicate address is refused", async () => {
  const { env, raw } = newEnv(); seedEntryContest(raw); await addUser(raw, "uO", "owner@city.gov"); const a = await addUser(raw, "ua", "a@example.com"), b = await addUser(raw, "ub", "b@example.com"), c = await addUser(raw, "uc", "c@example.com");
  const sent = [], f = stubFetch((url, init) => { if (/resend/.test(String(url))) sent.push(String(init && init.body)); return /census/.test(String(url)) ? new Response(JSON.stringify({ result: { addressMatches: [{ coordinates: { x: -118.1, y: 34.1 }, matchedAddress: "X" }] } })) : new Response(JSON.stringify({ id: "x" }), { status: 200 }); });
  try {
    const none = await enter(env, a, {}, 0); assert.equal(none.status, 400); assert.match(none.body.error, /at least one photo/); assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM posts").get().n, 0);
    const home = await enter(env, a); assert.equal(home.status, 200, JSON.stringify(home.body)); assert.equal(raw.prepare("SELECT status FROM posts WHERE user_id='ua'").get().status, "approved", "same city, auto approval: live at once");
    const far = await enter(env, b, { street: "5 Beach Rd", city: "Irvine", zip: "92602" }); assert.equal(far.status, 200, JSON.stringify(far.body));
    assert.equal(raw.prepare("SELECT status FROM posts WHERE user_id='ub'").get().status, "pending", "other city: kept, not auto-approved");
    assert.ok(sent.some((m) => /owner@city\.gov/.test(m) && /Irvine/.test(m) && /not approved automatically/.test(m)), "the organizer is told the city differs");
    const dup = await enter(env, c, { street: "9 Elm Street" }); assert.equal(dup.status, 400); assert.match(dup.body.error, /already entered in this contest/);
    raw.prepare("UPDATE posts SET status='declined' WHERE user_id='ua'").run();
    assert.equal((await enter(env, c, { street: "9 Elm Street" })).status, 200, "a declined entry does not block the address");
  } finally { f.restore(); }
});

test("L9: contest creation needs the human check when Turnstile is on; one contest waiting for review per account; the admin mail is throttled", async () => {
  const { env, raw } = newEnv({ TURNSTILE_SECRET: "ts_secret" }); const u = await addUser(raw, "u1", "owner@gmail.com");
  const f = stubFetch((url, init) => /turnstile/.test(String(url)) ? new Response(JSON.stringify({ success: /goodtoken/.test(String(init.body instanceof FormData ? init.body.get("response") : init.body)) })) : new Response(JSON.stringify({ id: "x" }), { status: 200 }));
  try {
    const miss = await make(env, u.cookie, { name: "City of Irvine Lights", org: "City of Irvine" }); assert.equal(miss.status, 400); assert.match(miss.body.error, /human/);
    const bad = await make(env, u.cookie, { name: "City of Irvine Lights", org: "City of Irvine", "cf-turnstile-response": "nope" }); assert.equal(bad.status, 400);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contests").get().n, 0);
    const first = await make(env, u.cookie, { name: "City of Irvine Lights", org: "City of Irvine", "cf-turnstile-response": "goodtoken" }); assert.equal(first.status, 200, JSON.stringify(first.body)); assert.equal(first.body.status, "pending");
    const second = await make(env, u.cookie, { name: "City of Tustin Lights", org: "City of Tustin", "cf-turnstile-response": "goodtoken" }); assert.equal(second.status, 429); assert.match(second.body.error, /already have a contest waiting/);
    // the cap counts pending rows, so Admin approving frees the slot
    raw.prepare("UPDATE contests SET status='live' WHERE status='pending'").run();
    assert.equal((await make(env, u.cookie, { name: "Plain Lights Contest", org: "Oak Hill", "cf-turnstile-response": "goodtoken" })).status, 200);
  } finally { f.restore(); }
  // throttle: two held contests from one account within the hour send one admin mail
  const { env: e2, raw: r2 } = newEnv(); const v = await addUser(r2, "u2", "v@gmail.com"), spy = mailSpy(), jobs = [];
  try {
    const mk = (o) => J(createContest({ request: rq("/api/contests", good(o), v.cookie), env: e2, waitUntil: (p) => jobs.push(p) }));
    await mk({ name: "Plain Lights Contest", org: "Oak Hill" }); // live with a free-mail note: one mail to Admin
    await mk({ name: "Other Plain Lights", org: "Oak Hill" }); await Promise.all(jobs);
    assert.equal(spy.sent.filter((b) => /admin@example\.com/.test(b)).length, 1, "one admin mail per account per hour");
    assert.equal(r2.prepare("SELECT COUNT(*) AS n FROM contests").get().n, 2, "both contests are still created and noted");
  } finally { spy.restore(); }
});

test("wizard: the review screen mounts the human check and sends the token; the entry page warns about another city", () => {
  const w = readFileSync("public/add-contest.html", "utf8"), e = readFileSync("public/contest-enter.html", "utf8");
  assert.match(w, /await ts\.init\(\)/); assert.match(w, /<div id="ts"><\/div>/); assert.match(w, /ts\.mount\(\)/); assert.match(w, /"cf-turnstile-response": ts\.token\(\)/); assert.match(w, /ts\.need\(\)/);
  assert.match(e, /the organizer decides whether to accept it/);
});

test("clone counts toward the 3-a-day creation cap: 3 clones then the 4th is 429; create and clone count together; a refused clone makes nothing", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "owner@gmail.com");
  const made = await make(env, u.cookie, {}); assert.equal(made.status, 200); const slug = made.body.slug;
  const clone = () => J(patchContest({ params: { slug }, request: rq("/x", { action: "clone" }, u.cookie, "PATCH"), env, waitUntil: () => {} }));
  const count = () => raw.prepare("SELECT COUNT(*) AS n FROM contests").get().n;
  assert.equal((await clone()).status, 200); assert.equal((await clone()).status, 200); // 1 create + 2 clones = 3 today
  const fourth = await clone(); assert.equal(fourth.status, 429); assert.match(fourth.body.error, /created several contests today/); assert.equal(count(), 3);
  const create = await make(env, u.cookie, { name: "Another Showdown Here" }); assert.equal(create.status, 429, "a new contest is refused on the same count");
  assert.equal(count(), 3);
  // an older day frees the cap again
  raw.prepare("UPDATE contests SET created_at = datetime('now','-2 day') WHERE slug != ?").run(slug);
  assert.equal((await clone()).status, 200);
  // a clone of something not live is still a 400, not a 429
  raw.prepare("UPDATE contests SET status='declined', unpublished_by='' WHERE slug = ?").run(slug);
  assert.equal((await clone()).status, 400);
});
test("clone: three clones in a day are allowed, the 4th is 429 (no creates)", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u2", "o2@gmail.com");
  const made = await make(env, u.cookie, {}); const slug = made.body.slug;
  raw.prepare("UPDATE contests SET created_at = datetime('now','-2 day')").run();
  const clone = () => J(patchContest({ params: { slug }, request: rq("/x", { action: "clone" }, u.cookie, "PATCH"), env, waitUntil: () => {} }));
  for (let i = 0; i < 3; i++) assert.equal((await clone()).status, 200, "clone " + (i + 1));
  assert.equal((await clone()).status, 429);
});
