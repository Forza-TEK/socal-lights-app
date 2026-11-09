// Contest creation (POST /api/contests), the organizer's announce (frozen results, one write, queued emails) and the date windows.
// Mail goes to the outbox only (no network); judge invitations use a stubbed Resend.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as create, onRequestGet as list } from "../functions/api/contests/index.js";
import { onRequestPatch as patch, onRequestGet as contestGet } from "../functions/api/contests/[slug].js";
import { trustOf, windows, seasonFor } from "../functions/_lib/contests.js";
import { podium } from "../functions/_lib/podium.js";
import { newEnv as baseEnv, addUser, stubFetch, ptToday, compEveryone } from "./_pay.mjs";
const newEnv = (extra) => { const r = baseEnv(extra); compEveryone(r.raw); return r; }; // these tests are not about contest passes: every organizer is comped (see compEveryone)

const O = "https://socallights.app";
const post = (env, cookie, b, headers = {}) => create({ request: new Request(O + "/api/contests", { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...headers }, body: JSON.stringify(b) }), env });
const J = async (p) => { const r = await p; return { http: r.status, ...(await r.json().catch(() => ({}))) }; };
const good = (o = {}) => ({ name: "Maple Street Showdown", org: "Maple Street Neighbors", city: "Pasadena", descr: "Neighbors decorate, everyone votes for a favorite.", site: "", closes: ptToday(10), vs: ptToday(11), ve: ptToday(25), cats: ["Best Overall", "Most Creative"], ...o });
const row = (raw, slug) => raw.prepare("SELECT * FROM contests WHERE slug = ?").get(slug);

test("trustOf: free mail, no site, matching and non-matching sites, shared government suffixes", () => {
  assert.equal(trustOf("a@gmail.com", "x.org"), "free");
  assert.equal(trustOf("a@hotmail.co.uk", ""), "free");
  assert.equal(trustOf("a@city.gov", ""), "none");
  assert.equal(trustOf("a@city.gov", "https://www.city.gov/events"), "match");
  assert.equal(trustOf("a@events.city.gov", "city.gov"), "match", "a subdomain mailbox on the site's own domain");
  assert.equal(trustOf("a@city.gov", "https://other.org"), "other");
  assert.equal(trustOf("a@ca.gov", "https://ca.gov"), "other", "ca.gov is shared by every agency, so it proves nothing");
  assert.equal(trustOf("a@k12.ca.us", "k12.ca.us"), "other");
  assert.equal(trustOf("a@city.gov", "http://[bad"), "other");
});

test("create: signed in and same origin are required; the body must be readable", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@city.gov");
  assert.equal((await J(post(env, null, good()))).http, 401);
  assert.equal((await J(post(env, u.cookie, good(), { origin: "https://evil.example" }))).http, 403);
  assert.equal((await post(env, u.cookie, "x").then((r) => r.status)), 400);
});
test("create: validation (names, city, description, website, dates, categories)", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@city.gov");
  const cases = [[{ name: "abc" }, /name/], [{ org: "ab" }, /who is running/], [{ city: "Gotham" }, /city/], [{ descr: "short" }, /welcome message/], [{ site: "not a site !!" }, /valid website/],
    [{ closes: ptToday(-1), vs: ptToday(5), ve: ptToday(9) }, /deadline/], [{ closes: "tomorrow" }, /deadline/], [{ vs: ptToday(10) }, /after entries close/], [{ ve: ptToday(11) }, /end after/], [{ cats: [] }, /category/], [{ cats: ["", "  "] }, /category/]];
  for (const [o, re] of cases) { const r = await J(post(env, u.cookie, good(o))); assert.equal(r.http, 400, JSON.stringify(o)); assert.match(r.error, re, JSON.stringify(o)); }
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contests").get().n, 0);
});
test("create: an entry deadline of today is accepted (the date rules are Pacific days); yesterday is not", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@city.gov");
  assert.equal((await J(post(env, u.cookie, good({ closes: ptToday(0), vs: ptToday(1), ve: ptToday(9) })))).http, 200);
  assert.equal((await J(post(env, u.cookie, good({ name: "Another Showdown", closes: ptToday(-1) })))).http, 400);
});
test("create: goes live and onto the map; the season comes from the entry deadline; categories are de-duplicated and capped at 8", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@city.gov");
  const r = await J(post(env, u.cookie, good({ site: "https://city.gov", cats: ["A one", "A one", "B", "C", "D", "E", "F", "G", "H", "I"] })));
  assert.equal(r.http, 200); assert.equal(r.status, "live"); assert.equal(r.trust, "match");
  const c = row(raw, r.slug);
  assert.equal(c.status, "live"); assert.equal(c.note, "", "a matching email leaves nothing for Admin to check");
  assert.equal(c.season, seasonFor(ptToday(10))); assert.equal(c.owner_id, "u1"); assert.equal(c.contact_email, "o@city.gov");
  assert.equal(JSON.parse(c.categories).length, 8); assert.equal(c.county.length > 0, true);
  const ev = raw.prepare("SELECT * FROM events WHERE id = ?").get(c.event_id);
  assert.equal(ev.end_date, c.vote_end); assert.equal(ev.start_date, ptToday(0)); assert.equal(ev.free, 1);
  assert.ok(c.rules.length > 40, "default rules were filled in");
  const listed = await (await list({ env })).json(); assert.ok(listed.some((x) => x.slug === r.slug && x.entriesOpen === true && x.votingOpen === false));
});
test("create: flagged notes for free mail, no website and a mismatched website; the contest still goes live", async () => {
  const { env, raw } = newEnv();
  const g = await addUser(raw, "u1", "o@gmail.com"), a = await addUser(raw, "u2", "o@city.gov"), b = await addUser(raw, "u3", "o@other.org");
  const r1 = await J(post(env, g.cookie, good({ name: "Free Mail Contest", site: "x.org" }))), r2 = await J(post(env, a.cookie, good({ name: "No Site Contest" }))), r3 = await J(post(env, b.cookie, good({ name: "Mismatch Contest", site: "https://city.gov" })));
  assert.deepEqual([r1.trust, r2.trust, r3.trust], ["free", "none", "other"]);
  assert.match(row(raw, r1.slug).note, /free-mail/); assert.match(row(raw, r2.slug).note, /no website/); assert.match(row(raw, r3.slug).note, /does not match/);
  for (const r of [r1, r2, r3]) assert.equal(row(raw, r.slug).status, "live");
});
test("create: three a day per account (429); same name gets a different slug; a mode with judges stores them and sends the invitation batch", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" }); const u = await addUser(raw, "u1", "o@city.gov");
  raw.prepare("INSERT INTO contest_comps (id, org_key, allowed, valid_until) VALUES (?,?,?,?)").run("c1", "u:o@city.gov", -1, "2099-12-31"); // contest passes: this test makes several contests for one organization
  const f = stubFetch(() => new Response(JSON.stringify({ data: [] }), { status: 200 }));
  try {
    const a = await J(post(env, u.cookie, good())), b = await J(post(env, u.cookie, good({ mode: "judges", judges: "j1@example.com\nj2@example.com, bad, j1@example.com" })));
    assert.equal(a.http, 200); assert.equal(b.http, 200); assert.notEqual(a.slug, b.slug);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM judges WHERE contest_id = ?").get(row(raw, b.slug).id).n, 2, "two valid distinct judges");
    assert.equal(row(raw, b.slug).mode, "judges");
    assert.ok(f.calls.some((c) => /resend/.test(c.url)), "invitations went to the (stubbed) mail service");
    assert.equal((await J(post(env, u.cookie, good({ name: "Third Contest Here" })))).http, 200);
    assert.equal((await J(post(env, u.cookie, good({ name: "Fourth Contest Here" })))).http, 429);
  } finally { f.restore(); }
});

// ---- date windows (Pacific days, daylight saving aware) ----
test("windows: entries run through the close date, voting from vote_start through vote_end, status and manual switches apply", () => {
  const c = { status: "live", announced: 0, entries_open: 1, voting_open: 1, entries_close: "2026-12-10", vote_start: "2026-12-11", vote_end: "2026-12-20" };
  const w = (today, o = {}) => windows({ ...c, ...o }, today);
  assert.deepEqual(w("2026-12-10"), { entriesOpen: true, votingOpen: false });
  assert.deepEqual(w("2026-12-11"), { entriesOpen: false, votingOpen: true });
  assert.deepEqual(w("2026-12-20"), { entriesOpen: false, votingOpen: true });
  assert.deepEqual(w("2026-12-21"), { entriesOpen: false, votingOpen: false });
  assert.deepEqual(w("2026-12-10", { entries_open: 0 }), { entriesOpen: false, votingOpen: false });
  assert.deepEqual(w("2026-12-15", { announced: 1 }), { entriesOpen: false, votingOpen: false });
  assert.deepEqual(w("2026-12-15", { status: "declined" }), { entriesOpen: false, votingOpen: false });
});

// ---- announce ----
async function announceSetup(tc, o = {}) {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" });
  const sentTo = [], f = stubFetch((url, init) => { const b = JSON.parse(init.body), list = Array.isArray(b) ? b : [b]; sentTo.push(...list.flatMap((m) => m.to)); return new Response(JSON.stringify({ data: list.map((_, i) => ({ id: "m" + i })) }), { status: 200 }); });
  tc.after(() => f.restore());
  const owner = await addUser(raw, "uO", "owner@city.gov");
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval,one_win,prize_mode,prize) VALUES ('c1','show',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run("uO", "Show Contest", "City", "Pasadena", "Los Angeles", "christmas", "live", ptToday(-9), ptToday(-8), ptToday(o.voteEnd ?? 5), JSON.stringify(["Best Overall"]), "public", "pick", "owner@city.gov", "d", "manual", o.oneWin ? 1 : 0, "one", "$50 gift card");
  const people = ["a", "b", "c", "d"], uins = raw.prepare("INSERT INTO users (id,email,name) VALUES (?,?,?)"), pins = raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,contest_id,user_id,entry_no,approved_at) VALUES (?,'approved',?,?,'Pasadena',34.1,-118.1,'d','[]',?,'christmas',?,?,'91101','c1',?,?,datetime('now'))");
  people.forEach((p, i) => { uins.run("e" + p, `${p}@example.com`, ""); pins.run("p" + p, "Biz " + p, "Home " + p, `${p}@example.com`, `${i + 1} Oak St`, `${i + 1} Oak St`, "e" + p, i + 1); });
  // 10 voters: votes pa 4, pb 3, pc 3, pd 0
  const v = raw.prepare("INSERT INTO votes (id,contest_id,user_id,post_id,category) VALUES (?,?,?,?,?)");
  const cast = [["pa", 4], ["pb", 3], ["pc", 3]]; let n = 0;
  for (const [pid, k] of cast) for (let i = 0; i < k; i++) { raw.prepare("INSERT INTO users (id,email,name) VALUES (?,?,?)").run("v" + n, `v${n}@example.com`, ""); v.run("vote" + n, "c1", "v" + n, pid, "Best Overall"); n++; }
  return { env, raw, owner, sentTo, jobs: [] };
}
const announce = (t, body = {}) => patch({ params: { slug: "show" }, request: new Request(O + "/api/contests/show", { method: "PATCH", headers: { "content-type": "application/json", cookie: t.owner.cookie }, body: JSON.stringify({ action: "announce", ...body }) }), env: t.env, waitUntil: (p) => t.jobs.push(p) });
const outbox = (raw) => raw.prepare("SELECT template, to_email, dedupe, status FROM mail_outbox ORDER BY id").all().map((r) => ({ ...r }));

test("announce: freezes the snapshot once, locks the contest, queues one email per entrant (winner or thanks) and the organizer, ranks a podium with a tie", async (tc) => {
  const t = await announceSetup(tc);
  const before = await J(announce(t)); assert.equal(before.http, 200); await Promise.all(t.jobs);
  const c = t.raw.prepare("SELECT * FROM contests WHERE id = 'c1'").get();
  assert.equal(c.announced, 1);
  const snap = JSON.parse(c.results); assert.equal(snap.at, ptToday(0)); assert.deepEqual(snap.winners["Best Overall"], ["pa"]); assert.equal(snap.entries.length, 4);
  assert.deepEqual(snap.entries.find((e) => e.id === "pa").votes, { "Best Overall": 4 });
  const mail = outbox(t.raw), by = (tpl) => mail.filter((m) => m.template === tpl).map((m) => m.to_email).sort();
  assert.deepEqual(by("results_winner"), ["a@example.com"]);
  assert.deepEqual(by("results_entrant"), ["b@example.com", "c@example.com", "d@example.com"]);
  assert.deepEqual(by("results_organizer"), ["owner@city.gov"]);
  assert.ok(mail.every((m) => /^results:c1:/.test(m.dedupe)), "every row has a per-contest dedupe key");
  assert.deepEqual(t.sentTo.sort(), ["a@example.com", "b@example.com", "c@example.com", "d@example.com", "owner@city.gov"], "the first send goes out right away: one email each");
  assert.ok(outbox(t.raw).every((m) => m.status === "sent"));
  // podium: 1st pa, then the two with 3 votes share 2nd, the one with none is not placed
  const p = podium(snap); assert.equal(p.get("pa").place, 1); assert.equal(p.get("pb").place, 2); assert.equal(p.get("pc").place, 2); assert.equal(p.has("pd"), false);
  // locked: a second announce, edits and vote changes are refused and queue nothing
  const again = await J(announce(t)); assert.equal(again.http, 400); assert.match(again.error, /locked/);
  assert.equal(outbox(t.raw).length, mail.length);
  t.raw.prepare("INSERT INTO users (id,email,name) VALUES ('late','late@example.com','')").run();
  t.raw.prepare("INSERT INTO votes (id,contest_id,user_id,post_id,category) VALUES ('late','c1','late','pd','Best Overall')").run();
  const page = await (await contestGet({ params: { slug: "show" }, request: new Request(O + "/api/contests/show"), env: t.env })).json();
  assert.deepEqual(page.winners["Best Overall"], ["pa"], "the page reads the frozen snapshot, not live votes");
  assert.equal(page.entries.find((e) => e.id === "pd").votes["Best Overall"], 0);
});
test("announce: a one-win contest gives each home at most one award; no votes at all needs confirmation (409) and force announces with no winner", async (tc) => {
  const t = await announceSetup(tc);
  t.raw.prepare("DELETE FROM votes").run();
  const ask = await J(announce(t)); assert.equal(ask.http, 409); assert.equal(ask.needs_force, true); assert.match(ask.reason, /Nobody has voted/);
  assert.equal(t.raw.prepare("SELECT announced FROM contests").get().announced, 0);
  assert.equal(outbox(t.raw).length, 0, "nothing is sent while the organizer is deciding");
  assert.equal((await J(announce(t, { force: true }))).http, 200);
  const snap = JSON.parse(t.raw.prepare("SELECT results FROM contests").get().results); assert.deepEqual(snap.winners["Best Overall"], []);
  assert.deepEqual([...podium(snap).keys()], []);
  assert.equal(outbox(t.raw).filter((m) => m.template === "results_winner").length, 0);
});
test("announce: voting that has not started asks first; only the creator may announce", async (tc) => {
  const t = await announceSetup(tc); t.raw.prepare("UPDATE contests SET vote_start = ?").run(ptToday(3));
  const ask = await J(announce(t)); assert.equal(ask.http, 409); assert.match(ask.reason, /hasn't started/);
  const other = await addUser(t.raw, "uZ", "z@example.com");
  const res = await patch({ params: { slug: "show" }, request: new Request(O + "/api/contests/show", { method: "PATCH", headers: { "content-type": "application/json", cookie: other.cookie }, body: JSON.stringify({ action: "announce", force: true }) }), env: t.env });
  assert.ok([401, 403, 404].includes(res.status), "a stranger got " + res.status);
  assert.equal(t.raw.prepare("SELECT announced FROM contests").get().announced, 0);
});

test("create: an official-sounding name from an organizer we cannot tie to a website is held (not live, not on the map); a matching email goes live", async () => {
  const { env, raw } = newEnv();
  const free = await addUser(raw, "u1", "o@gmail.com"), match = await addUser(raw, "u2", "o@pasadena.gov");
  const held = await J(post(env, free.cookie, good({ name: "City of Pasadena Holiday Contest", org: "City of Pasadena" })));
  assert.equal(held.http, 200); assert.equal(held.status, "pending"); assert.equal(held.review, true);
  assert.equal(row(raw, held.slug).status, "pending"); assert.match(row(raw, held.slug).note, /official-sounding/); assert.ok(!row(raw, held.slug).event_id, "not on the map");
  const live = await J(post(env, match.cookie, good({ name: "City of Pasadena Lights Contest", org: "City of Pasadena", site: "https://pasadena.gov" })));
  assert.equal(live.status, "live"); assert.equal(row(raw, live.slug).note, "");
});
