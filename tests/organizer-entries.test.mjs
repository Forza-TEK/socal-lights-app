// Organizer-added contest entries: POST /api/contests/<slug>/entries (paste a list of addresses, check it, add it), and what that does to
// voting, judging, results, the Past pages and account deletion. The geocoder is stubbed: nothing here reaches the internet.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as entriesPost } from "../functions/api/contests/[slug]/entries/index.js";
import { onRequestPost as entryAction } from "../functions/api/contests/[slug]/entries/[id].js";
import { onRequestGet as manageGet } from "../functions/api/contests/[slug]/manage.js";
import { onRequestPost as votePost } from "../functions/api/contests/[slug]/vote.js";
import { onRequestGet as judgeGet, onRequestPost as judgePost } from "../functions/api/contests/[slug]/judge.js";
import { onRequestGet as contestGet, onRequestPatch as contestPatch } from "../functions/api/contests/[slug].js";
import { onRequestGet as pastGet } from "../functions/past/[slug].js";
import { computeResults } from "../functions/_lib/contests.js";
import { deleteAccount } from "../functions/_lib/account.js";
import { parseHome, homeKey } from "../functions/_lib/homes.js";
import { newEnv, addUser, stubFetch, ptToday } from "./_pay.mjs";

const SLUG = "light-up";
const origin = "https://socallights.app";
const json = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });
const q = (raw, sql, ...a) => JSON.parse(JSON.stringify(raw.prepare(sql).all(...a)));
const added = (raw) => q(raw, "SELECT * FROM posts WHERE contest_id = 'c1' AND user_id = '' ORDER BY entry_no");

// A fake Census/OSM geocoder: streets with "Nowhere" are not found, "Faraway" is in San Diego, "Down" makes every request fail. Everything else is near Pasadena/Covina.
const geo = (calls) => (url) => {
  const u = String(url), a = decodeURIComponent((u.match(/address=([^&]*)/) || u.match(/[?&]q=([^&]*)/) || [])[1] || "");
  calls.push(a);
  if (/Down/.test(a)) throw new Error("network down");
  const at = /Faraway/.test(a) ? [32.7, -117.1] : [34.1 + (a.length % 7) / 1000, -118.0];
  const hit = !/Nowhere/.test(a);
  if (u.includes("census.gov")) return new Response(JSON.stringify({ result: { addressMatches: hit ? [{ matchedAddress: a.split(",").slice(0, 2).join(",").toUpperCase() + ", CA, 91722", coordinates: { y: at[0], x: at[1] } }] : [] } }), { headers: { "content-type": "application/json" } });
  return new Response(JSON.stringify(hit ? [{ lat: String(at[0]), lon: String(at[1]), display_name: a }] : []), { headers: { "content-type": "application/json" } });
};

async function setup(o = {}) {
  const { env, raw } = newEnv();
  const owner = await addUser(raw, "uO", "owner@city.gov"), staff = await addUser(raw, "uS", "staff@city.gov"), other = await addUser(raw, "uX", "other@x.com");
  const voter = await addUser(raw, "uV", "voter@x.com"), resident = await addUser(raw, "uR", "resident@x.com"), judge = await addUser(raw, "uJ", "judge@x.com");
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval,one_win) VALUES ('c1',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(SLUG, "uO", "Light Up the Town", "City of Covina", "Pasadena", "Los Angeles", "christmas", "live", ptToday(5), ptToday(8), ptToday(20), JSON.stringify(o.cats || ["Best Overall"]), o.mode || "both", o.method || "pick", "owner@city.gov", "A contest for the whole town.", "manual", o.oneWin ? 1 : 0);
  raw.prepare("INSERT INTO contest_staff (contest_id,email) VALUES ('c1','staff@city.gov')").run();
  raw.prepare("INSERT INTO judges (id,contest_id,email,token,user_id) VALUES ('j1','c1','judge@x.com','tk','uJ')").run();
  // one resident entry (approved, with a photo) so entry numbers continue from it
  raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,contest_id,user_id,entry_no,approved_at) VALUES ('pR','approved','Rita','Rita Lights','Pasadena',34.1,-118.1,'d','[\"p/abcd1234efgh/1.jpg\"]','resident@x.com','christmas','5 Oak Street, Pasadena, CA 91101','5 Oak Street','91101','c1','uR',1,datetime('now'))").run();
  const calls = []; const stub = stubFetch(geo(calls));
  const users = { owner, staff, other, voter, resident, judge };
  const post = (user, body, opts = {}) => entriesPost({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/entries`, { method: "POST", headers: { "content-type": "application/json", ...(user ? { cookie: user.cookie } : {}), ...(opts.origin ? { origin: opts.origin } : {}) }, body: JSON.stringify(body) }), env, waitUntil: () => {} }).then(json);
  const add = (body, user = owner) => post(user, { confirm: true, ...body });
  return { env, raw, users, calls, post, add, done: stub.restore };
}
const homes = (...a) => a.map((x) => (typeof x === "string" ? { address: x } : x));

test("only the organizers of this contest can add homes: 401 signed out, 403 someone else, 403 cross-site, staff allowed", async () => {
  const t = await setup();
  try {
    const body = { homes: homes("10 Elm Ave"), dryRun: true };
    assert.equal((await t.post(null, body)).status, 401);
    assert.equal((await t.post(t.users.other, body)).status, 403);
    assert.equal((await t.post(t.users.resident, body)).status, 403, "an entrant is not an organizer");
    assert.equal((await t.post(t.users.owner, body, { origin: "https://evil.example" })).status, 403);
    assert.equal((await t.post(t.users.owner, body)).status, 200);
    assert.equal((await t.post(t.users.staff, body)).status, 200);
    const r = await entriesPost({ params: { slug: "nope" }, request: new Request(`${origin}/api/contests/nope/entries`, { method: "POST", headers: { cookie: t.users.owner.cookie }, body: "{}" }), env: t.env });
    assert.equal(r.status, 404);
    assert.equal((await entriesPost({ params: { slug: SLUG }, request: new Request(`${origin}/x`, { method: "POST", headers: { cookie: t.users.owner.cookie }, body: JSON.stringify({ confirm: true, homes: homes("10 Elm Ave") }) }), env: t.env })).headers.get("cache-control"), "no-store");
  } finally { t.done(); }
});

test("confirm is required to add (the residents agreed to show their address); a dry run needs no confirmation and writes nothing", async () => {
  const t = await setup();
  try {
    const none = await t.post(t.users.owner, { homes: homes("10 Elm Ave") });
    assert.equal(none.status, 400); assert.match(none.body.error, /residents agreed/);
    assert.equal((await t.post(t.users.owner, { homes: homes("10 Elm Ave"), confirm: "yes" })).status, 400, "only the boolean true counts");
    assert.equal(added(t.raw).length, 0);
    const dry = await t.post(t.users.owner, { homes: homes("10 Elm Ave, Pasadena | The Lees", "12 Elm Ave", "5 oak st", "9 Nowhere Rd", "77 Nowhere Rd"), dryRun: true });
    assert.equal(dry.status, 200); assert.equal(dry.body.dryRun, true);
    assert.deepEqual(dry.body.found.map((x) => x.index), [0, 1]);
    assert.equal(dry.body.found[0].title, "The Lees"); assert.equal(dry.body.found[1].title, "Home at 12 Elm Ave");
    assert.match(dry.body.found[0].matched, /10 ELM AVE/);
    assert.deepEqual(dry.body.skipped.map((x) => [x.index, x.reason]), [[2, "Already in this contest."]]);
    assert.deepEqual(dry.body.failed.map((x) => x.index), [3, 4]);
    assert.equal(added(t.raw).length, 0, "nothing written");
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM posts")[0].n, 1);
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM contest_changes")[0].n, 0, "no change-log line for a dry run");
    assert.equal((await t.post(t.users.owner, { confirm: true })).status, 400, "no homes");
    assert.equal((await t.post(t.users.owner, { confirm: true, homes: [{ nope: 1 }] })).status, 400, "each home needs an address");
  } finally { t.done(); }
});

test("parseHome reads the formats the card documents", () => {
  const p = (s) => parseHome(s, "Pasadena");
  assert.deepEqual(p("123 Main St"), { street: "123 Main St", city: "Pasadena", zip: "" });
  assert.deepEqual(p("123 main street, Covina, CA 91722"), { street: "123 Main St", city: "Covina", zip: "91722" });
  assert.deepEqual(p("123 Main St, Covina, 91722"), { street: "123 Main St", city: "Covina", zip: "91722" });
  assert.deepEqual(p("123 Main St, 91722"), { street: "123 Main St", city: "Pasadena", zip: "91722" });
  assert.deepEqual(p("123 Main St\tPasadena\t91101"), { street: "123 Main St", city: "Pasadena", zip: "91101" });
  assert.deepEqual(p("1. 123 Main St, pasadena"), { street: "123 Main St", city: "Pasadena", zip: "" }, "numbering is dropped and a known city gets its usual spelling");
  assert.deepEqual(p("- 123 Main St Apt 4, Pasadena"), { street: "123 Main St Apt 4", city: "Pasadena", zip: "" });
  assert.deepEqual(p("123 Main St, Apt 4, Pasadena"), { street: "123 Main St Apt 4", city: "Pasadena", zip: "" });
  assert.deepEqual(p("123 Main St Pasadena CA 91101"), { street: "123 Main St", city: "Pasadena", zip: "91101" }, "no commas at all");
  assert.ok(p("Candy Cane Lane, Pasadena").error, "a house number is required");
  assert.ok(p("   ").error);
  assert.equal(homeKey("5 Oak Street, Pasadena"), homeKey("5 oak st."));
  assert.notEqual(homeKey("5 Oak St"), homeKey("6 Oak St"));
});

test("a lookup that finds nothing, finds the wrong place, or can't be reached is reported and not created; the pin is never the city center", async () => {
  const t = await setup();
  try {
    const r = await t.add({ homes: homes("1 Nowhere Rd", "2 Faraway Blvd", "3 Down Ln", "4 Elm Ave", "x") });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.added.map((x) => x.index), [3]);
    const why = Object.fromEntries(r.body.failed.map((x) => [x.index, x.reason]));
    assert.match(why[0], /^Not found/);
    assert.match(why[1], /too far from Pasadena/, "30 km rule, centered on the contest city");
    assert.match(why[2], /isn't answering/, "geocoder unreachable");
    assert.match(why[4], /house number/);
    assert.equal(added(t.raw).length, 1);
    const [h] = added(t.raw); assert.ok(h.lat > 34 && h.lat < 34.2 && h.lng === -118.0, "pin from the geocoder");
  } finally { t.done(); }
});

test("created entries are approved, photo-less, ownerless, numbered after the existing ones, and logged", async () => {
  const t = await setup();
  try {
    const r = await t.add({ homes: homes({ address: "10 Elm Ave, Covina, 91722", name: "the garcia family", descr: "Candy canes" }, "11 Elm Ave", "11 elm avenue", "5 Oak St") });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.added.map((x) => [x.index, x.entry_no]), [[0, 2], [1, 3]]);
    assert.deepEqual(r.body.skipped.map((x) => [x.index, x.reason]), [[2, "Listed twice."], [3, "Already in this contest."]], "same house twice in one paste, and the resident's own entry");
    const [a, b] = added(t.raw);
    assert.equal(a.status, "approved"); assert.equal(a.contest_id, "c1"); assert.equal(a.user_id, ""); assert.equal(a.added_by, "uO");
    assert.equal(a.photos, "[]"); assert.equal(a.season, "christmas"); assert.equal(a.county, "Los Angeles"); assert.equal(a.show_address, 1);
    assert.equal(a.title, "The Garcia Family"); assert.equal(a.descr, "Candy canes"); assert.equal(a.city, "Covina"); assert.equal(a.street, "10 Elm Ave"); assert.equal(a.zip, "91722");
    assert.equal(a.address, "10 Elm Ave, Covina, CA 91722"); assert.ok(a.approved_at); assert.equal(a.contact_email, "");
    assert.equal(b.title, "Home at 11 Elm Ave"); assert.equal(b.descr, "Entry in Light Up the Town"); assert.equal(b.city, "Pasadena");
    assert.deepEqual(q(t.raw, "SELECT field, new, by_email FROM contest_changes"), [{ field: "Entries", new: "Added 2 homes", by_email: "owner@city.gov" }]);
    // a second call keeps counting; a declined entry does not block the same address again
    const more = await t.add({ homes: homes("12 Elm Ave") }, t.users.staff);
    assert.equal(more.body.added[0].entry_no, 4); assert.equal(added(t.raw).pop().added_by, "uS");
    t.raw.prepare("UPDATE posts SET status = 'declined' WHERE id = ?").run(more.body.added[0].id);
    assert.equal((await t.add({ homes: homes("12 Elm Ave") })).body.added.length, 1);
    // the organizer's list shows the tag, no contact, no photo
    const m = await json(await manageGet({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/manage`, { headers: { cookie: t.users.owner.cookie } }), env: t.env }));
    const mine = m.body.entries.filter((e) => e.byOrganizer);
    assert.equal(mine.length, 4); assert.ok(mine.every((e) => e.contact === null && e.photos.length === 0));
    assert.equal(m.body.entries.find((e) => e.id === "pR").byOrganizer, false);
  } finally { t.done(); }
});

test("limits: 100 homes a call, 500 added homes a contest, 10 calls an hour per account", async () => {
  const t = await setup();
  try {
    const many = (n, from = 0) => Array.from({ length: n }, (_, i) => ({ address: `${1000 + from + i} Pine Ct` }));
    const big = await t.add({ homes: many(101) });
    assert.equal(big.status, 400); assert.match(big.body.error, /up to 100/);
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM entry_add_log")[0].n, 0, "a refused call is not counted");
    const ok = await t.add({ homes: many(100) });
    assert.equal(ok.status, 200); assert.equal(ok.body.added.length, 100);
    // 500 per contest: seed up to 499 added homes, then 2 more is refused and 1 more works
    const ins = t.raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,season,address,street,contest_id,user_id,added_by,entry_no) VALUES (?,'approved','b','t','Pasadena',34.1,-118.1,'d','[]','christmas',?,?,'c1','','uO',?)");
    for (let i = 0; i < 399; i++) ins.run("seed" + i, `${5000 + i} Seed Way`, `${5000 + i} Seed Way`, 200 + i);
    const over = await t.add({ homes: many(2, 500) });
    assert.equal(over.status, 400); assert.match(over.body.error, /up to 500.*room for 1 more/);
    assert.equal((await t.add({ homes: many(1, 500) })).body.added.length, 1);
    assert.equal(added(t.raw).length, 500);
    // calls an hour: 2 used so far (the refused ones do not count), so 8 more go through and the 11th is 429
    for (let i = 0; i < 8; i++) assert.equal((await t.post(t.users.owner, { homes: homes("1 Nowhere Rd"), dryRun: true })).status, 200, "call " + (i + 3));
    const limited = await t.post(t.users.owner, { homes: homes("1 Nowhere Rd"), dryRun: true });
    assert.equal(limited.status, 429); assert.match(limited.body.error, /10 times an hour/);
    assert.equal((await t.post(t.users.staff, { homes: homes("1 Nowhere Rd"), dryRun: true })).status, 200, "the limit is per account");
    t.raw.prepare("UPDATE entry_add_log SET created_at = datetime('now','-2 hours')").run();
    assert.equal((await t.post(t.users.owner, { homes: homes("1 Nowhere Rd"), dryRun: true })).status, 200, "an hour later it works again");
  } finally { t.done(); }
});

test("locked after the winners are announced; refused once voting has started", async () => {
  const t = await setup();
  try {
    t.raw.prepare("UPDATE contests SET vote_start = ? WHERE id = 'c1'").run(ptToday());
    const started = await t.add({ homes: homes("10 Elm Ave") });
    assert.equal(started.status, 400); assert.match(started.body.error, /Voting has started/);
    assert.equal((await t.post(t.users.owner, { homes: homes("10 Elm Ave"), dryRun: true })).status, 400, "a dry run says so too");
    // a vote cast by an early "start" that moved the date back is caught by the votes themselves
    t.raw.prepare("UPDATE contests SET vote_start = ? WHERE id = 'c1'").run(ptToday(8));
    assert.equal((await t.add({ homes: homes("10 Elm Ave") })).status, 200);
    t.raw.prepare("INSERT INTO votes (id,contest_id,user_id,post_id,category) VALUES ('v0','c1','uV','pR','Best Overall')").run();
    assert.equal((await t.add({ homes: homes("11 Elm Ave") })).status, 400);
    t.raw.prepare("DELETE FROM votes").run();
    t.raw.prepare("UPDATE contests SET announced = 1, results = '{}' WHERE id = 'c1'").run();
    const locked = await t.add({ homes: homes("12 Elm Ave") });
    assert.equal(locked.status, 409); assert.equal(locked.body.error, "Results are locked.");
    t.raw.prepare("UPDATE contests SET announced = 0, status = 'pending' WHERE id = 'c1'").run();
    assert.equal((await t.add({ homes: homes("12 Elm Ave") })).status, 400, "not live");
  } finally { t.done(); }
});

// --- results, voting and judging with entries that have no photo and no owner
const call = async (fn, user, path, method, body, env, params = { slug: SLUG }) => json(await fn({ params, request: new Request(`${origin}/api/contests/${SLUG}/${path}`, { method, headers: { "content-type": "application/json", ...(user ? { cookie: user.cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, waitUntil: () => {} }));
const startVoting = (raw) => raw.prepare("UPDATE contests SET vote_start = ?, voting_open = 1 WHERE id = 'c1'").run(ptToday());

test("voting: nobody is blocked by the self-vote rule on an ownerless entry, and the resident's own home still is; existing votes are untouched", async () => {
  const t = await setup({ cats: ["Best Overall", "Most Creative"] });
  try {
    t.raw.prepare("INSERT INTO votes (id,contest_id,user_id,post_id,category) VALUES ('v1','c1','uV','pR','Best Overall')").run();
    t.raw.prepare("UPDATE contests SET vote_start = ? WHERE id = 'c1'").run(ptToday(8)); // the early vote above is the test seed; voting has not started
    t.raw.prepare("DELETE FROM votes").run();
    const r = await t.add({ homes: homes("10 Elm Ave | Lees", "11 Elm Ave | Parks") });
    const [lees, parks] = r.body.added.map((x) => x.id);
    startVoting(t.raw);
    t.raw.prepare("INSERT INTO votes (id,contest_id,user_id,post_id,category) VALUES ('v1','c1','uV','pR','Best Overall')").run();
    const before = q(t.raw, "SELECT * FROM votes ORDER BY id");
    // the organizer herself, a staff member and a resident can all vote for an organizer-added home
    for (const u of [t.users.owner, t.users.staff, t.users.resident]) assert.equal((await call(votePost, u, "vote", "POST", { post_id: lees, category: "Best Overall" }, t.env)).status, 200, u.email);
    assert.equal((await call(votePost, t.users.resident, "vote", "POST", { post_id: "pR", category: "Most Creative" }, t.env)).status, 400, "own home is still blocked");
    // a judge can score/pick one, and recuse from it
    assert.equal((await call(judgePost, t.users.judge, "judge", "POST", { action: "pick", post_id: lees, category: "Best Overall" }, t.env)).status, 200);
    assert.equal((await call(judgePost, t.users.judge, "judge", "POST", { action: "conflict", post_id: parks, on: true }, t.env)).status, 200);
    const jg = (await call(judgeGet, t.users.judge, "judge", "GET", null, t.env)).body;
    assert.equal(jg.entries.length, 3); assert.ok(jg.entries.every((e) => e.mine === false || e.id === "pR") && jg.entries.filter((e) => e.mine).length === 0);
    assert.deepEqual(jg.entries.find((e) => e.id === lees).photos, [], "no photo");
    assert.deepEqual(jg.conflicts, [parks]);
    // the existing vote did not change
    assert.deepEqual(q(t.raw, "SELECT * FROM votes WHERE id = 'v1'"), before.filter((v) => v.id === "v1"));
    // the "mine" view: the resident's own home is theirs, organizer-added homes are nobody's
    const c = (await call(contestGet, t.users.resident, "", "GET", null, t.env)).body;
    assert.deepEqual(c.entries.filter((e) => e.mine).map((e) => e.id), ["pR"]);
    const co = (await call(contestGet, t.users.owner, "", "GET", null, t.env)).body;
    assert.equal(co.entries.filter((e) => e.mine).length, 0, "the organizer does not own the homes she added");
    assert.deepEqual(co.entries.find((e) => e.id === lees).photos, []);
    // results count the homes normally
    const res = await computeResults(t.env, q(t.raw, "SELECT * FROM contests WHERE id = 'c1'")[0]);
    assert.equal(res.counts[lees]["Best Overall"], 3); assert.deepEqual(res.winners["Best Overall"], [lees]); assert.deepEqual(res.jwinners["Best Overall"], [lees]);
  } finally { t.done(); }
});

test("one-win and judge conflicts work with ownerless entries", async () => {
  const t = await setup({ cats: ["A", "B"], oneWin: true, mode: "judges" });
  try {
    const [x, y] = (await t.add({ homes: homes("10 Elm Ave", "11 Elm Ave") })).body.added.map((e) => e.id);
    startVoting(t.raw);
    const pick = (cat, id) => call(judgePost, t.users.judge, "judge", "POST", { action: "pick", post_id: id, category: cat }, t.env);
    assert.equal((await pick("A", x)).status, 200); assert.equal((await pick("B", x)).status, 200);
    let res = await computeResults(t.env, q(t.raw, "SELECT * FROM contests WHERE id = 'c1'")[0]);
    assert.deepEqual(res.jwinners.A, [x]); assert.deepEqual(res.jwinners.B, [], "one win per home: the second category finds no other picks");
    assert.equal((await pick("B", y)).status, 200);
    res = await computeResults(t.env, q(t.raw, "SELECT * FROM contests WHERE id = 'c1'")[0]);
    assert.deepEqual(res.jwinners.B, [y]);
    await call(judgePost, t.users.judge, "judge", "POST", { action: "conflict", post_id: y, on: true }, t.env);
    res = await computeResults(t.env, q(t.raw, "SELECT * FROM contests WHERE id = 'c1'")[0]);
    assert.deepEqual(res.jwinners.B, [], "a recused judge's pick doesn't count");
  } finally { t.done(); }
});

test("announce freezes photo-less entries, and the Past page, archive shape and contest page render them with no photo", async () => {
  const t = await setup();
  try {
    const [lees] = (await t.add({ homes: homes("10 Elm Ave, Covina | The Lees", "11 Elm Ave | The Parks") })).body.added.map((x) => x.id);
    startVoting(t.raw);
    await call(votePost, t.users.voter, "vote", "POST", { post_id: lees, category: "Best Overall" }, t.env);
    await call(judgePost, t.users.judge, "judge", "POST", { action: "pick", post_id: lees, category: "Best Overall" }, t.env);
    const an = await call(contestPatch, t.users.owner, "", "PATCH", { action: "announce" }, t.env);
    assert.equal(an.status, 200, JSON.stringify(an.body));
    const snap = JSON.parse(q(t.raw, "SELECT results FROM contests WHERE id = 'c1'")[0].results);
    const e = snap.entries.find((x) => x.id === lees);
    assert.deepEqual(e.photos, []); assert.equal(e.name, "The Lees"); assert.equal(e.address, "10 Elm Ave, Covina, CA"); assert.equal(e.votes["Best Overall"], 1);
    assert.ok(snap.awards.every((a) => a.ids.includes(lees)), "People's and Judges' choice both went to the home");
    // nobody is emailed: there is no entrant account behind the home (and the resident still is)
    // the public page shows the winner with no broken image
    const pub = (await call(contestGet, null, "", "GET", null, t.env)).body;
    assert.deepEqual(pub.winners["Best Overall"], [lees]); assert.deepEqual(pub.entries.find((x) => x.id === lees).photos, []);
    const page = await pastGet({ request: new Request(`${origin}/past/${SLUG}`), env: t.env, params: { slug: SLUG } });
    const html = await page.text();
    assert.equal(page.status, 200); assert.match(html, /The Lees/); assert.match(html, /The Parks/);
    assert.equal((html.match(/<img src="\/api\/photo\/p\/abcd1234efgh/g) || []).length, 1, "only the resident's home has an image");
    assert.equal((html.match(/<img src="\/api\/photo\/[^"]*"/g) || []).length, 1, "the added homes draw the empty tile, not an image");
    // more homes can't be added now, and the organizer's own entry buttons are locked
    assert.equal((await t.add({ homes: homes("12 Elm Ave") })).status, 409);
    assert.equal((await call(entryAction, t.users.owner, `entries/${lees}`, "POST", { action: "decline" }, t.env, { slug: SLUG, id: lees })).status, 409);
  } finally { t.done(); }
});

test("an organizer can remove an added home before voting (decline), and its votes go with it", async () => {
  const t = await setup();
  try {
    const [x] = (await t.add({ homes: homes("10 Elm Ave") })).body.added.map((e) => e.id);
    const d = await call(entryAction, t.users.owner, `entries/${x}`, "POST", { action: "decline" }, t.env, { slug: SLUG, id: x });
    assert.equal(d.status, 200);
    assert.equal(q(t.raw, "SELECT status FROM posts WHERE id = ?", x)[0].status, "declined");
    assert.equal((await t.add({ homes: homes("10 Elm Ave") })).body.added.length, 1, "the address can be added again");
  } finally { t.done(); }
});

test("deleting the organizer's account keeps the homes she added and clears added_by", async () => {
  const t = await setup();
  try {
    await t.add({ homes: homes("10 Elm Ave | Lees", "11 Elm Ave | Parks") });
    await t.add({ homes: homes("12 Elm Ave | Wus") }, t.users.staff);
    assert.equal(added(t.raw).length, 3);
    await deleteAccount({ ...t.env, PHOTOS: { delete: async () => {}, get: async () => null } }, "uO", "owner@city.gov");
    const after = added(t.raw);
    assert.equal(after.length, 3, "entries stay with the contest");
    assert.deepEqual(after.map((x) => x.added_by), [null, null, "uS"], "only the deleted organizer's link is cleared");
    assert.ok(after.every((x) => x.user_id === "" && x.status === "approved"));
    assert.equal(q(t.raw, "SELECT status FROM contests WHERE id = 'c1'")[0].status, "closed", "an unannounced contest closes, as before");
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM posts WHERE id = 'pR'")[0].n, 1, "other people's entries stay too");
    // deleting a resident does not touch them either
    await deleteAccount({ ...t.env, PHOTOS: { delete: async () => {}, get: async () => null } }, "uR", "resident@x.com");
    assert.equal(added(t.raw).length, 3);
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM posts WHERE id = 'pR'")[0].n, 0);
  } finally { t.done(); }
});
