// Founder city badge (migrations 0208, 0209): the two seeded comps, the badge only while the comp runs and only on that organization's contests,
// the grant checkbox, and proof that the badge never changes results or order. In-memory D1; nothing reaches Stripe or a mailbox.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as createContest, onRequestGet as listGet } from "../functions/api/contests/index.js";
import { onRequestGet as detailGet } from "../functions/api/contests/[slug].js";
import { onRequestGet as entitlementGet } from "../functions/api/contest-pass/entitlement.js";
import { onRequestGet as archiveGet } from "../functions/api/archive.js";
import { onRequestGet as pastGet } from "../functions/past/[slug].js";
import { onRequestGet as passesGet, onRequestPost as passesPost } from "../functions/api/admin/passes.js";
import { computeResults } from "../functions/_lib/contests.js";
import { newEnv, addUser, freezeNow, ptToday } from "./_pay.mjs";

const O = "https://socallights.app", NOW = "2026-11-09T20:00:00Z";
const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})) }; };
const rq = (url, body, cookie) => new Request(O + url, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const good = (o = {}) => ({ name: "Maple Street Showdown", org: "Maple Street Neighbors", city: "Pasadena", descr: "Neighbors decorate, everyone votes for a favorite.", site: "", closes: ptToday(10), vs: ptToday(11), ve: ptToday(25), cats: ["Best Overall"], ...o });
const withNow = async (fn, iso = NOW) => { const un = freezeNow(iso); try { return await fn(); } finally { un(); } };
const adm = (env, b) => J(passesPost({ request: rq("/api/admin/passes", b), env, data: { admin: { email: "owner@forza-tek.com" } } }));
const founderOf = async (env, slug) => (await J(detailGet({ params: { slug }, request: rq("/api/contests/" + slug), env }))).body.contest.founder;
const listed = async (env) => Object.fromEntries((await J(listGet({ env }))).body.map((c) => [c.slug, c.founder]));
async function setup() {
  const { env, raw } = newEnv(); const a = await addUser(raw, "ua", "clerk@covinaca.gov"), g = await addUser(raw, "ug", "someone@gmail.com");
  const mk = async (u, o) => (await J(createContest({ request: rq("/api/contests", good(o), u.cookie), env }))).body.slug;
  const city = await mk(a, { name: "Covina Holiday Lights", site: "https://www.covinaca.gov" }), other = await mk(g, { name: "Gmail Street Lights" });
  raw.prepare("UPDATE contests SET created_at = datetime('now', '-3 days')").run();
  return { env, raw, a, g, city, other };
}

test("migration 0208 seeds the two founder-city comps: one free contest per window through 2026-12-31, badge on through 2028-12-31, ids stable", () => {
  const { raw } = newEnv();
  const rows = raw.prepare("SELECT * FROM contest_comps ORDER BY org_key").all();
  assert.deepEqual(rows.map((r) => [r.id, r.org_key, r.allowed, r.valid_until, r.note, r.badge, r.badge_until, r.revoked]), [
    ["founder-city-covinaca-gov", "d:covinaca.gov", 1, "2026-12-31", "Founder city", 1, "2028-12-31", 0],
    ["founder-city-eastvaleca-gov", "d:eastvaleca.gov", 1, "2026-12-31", "Founder city", 1, "2028-12-31", 0]]);
  assert.match(rows[0].created_by, /^system:/);
  const sql = readFileSync(new URL("../migrations/0208_founder_city_badge.sql", import.meta.url), "utf8");
  raw.exec(sql.split("\n").filter((l) => !/ALTER TABLE/.test(l)).join("\n")); // the inserts again: no duplicates
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contest_comps").get().n, 2);
});

test("the badge shows on the organization's own contests only, in the list and the detail", () => withNow(async () => {
  const { env, city, other } = await setup();
  assert.equal(await founderOf(env, city), true); assert.equal(await founderOf(env, other), false, "another organization is unaffected");
  assert.deepEqual(await listed(env), { [city]: true, [other]: false });
}));

test("the badge shows only while the comp is active: revoked, expired and badge-off hide it, and the comp's other rules are unchanged", () => withNow(async () => {
  const { env, raw, city } = await setup();
  raw.prepare("UPDATE contest_comps SET revoked = 1 WHERE id = 'founder-city-covinaca-gov'").run();
  assert.equal(await founderOf(env, city), false, "revoked");
  raw.prepare("UPDATE contest_comps SET revoked = 0 WHERE id = 'founder-city-covinaca-gov'").run();
  assert.equal(await founderOf(env, city), true);
  raw.prepare("UPDATE contest_comps SET badge = 0 WHERE id = 'founder-city-covinaca-gov'").run();
  assert.equal(await founderOf(env, city), false, "a comp without the badge");
  raw.prepare("UPDATE contest_comps SET badge = 1 WHERE id = 'founder-city-covinaca-gov'").run();
  await withNow(async () => { assert.equal(await founderOf(env, city), true, "the badge outlasts the free contest"); const e = (await J(entitlementGet({ request: rq("/api/contest-pass/entitlement?site=" + encodeURIComponent("https://www.covinaca.gov")), env }))).body; assert.ok(!e.comp, "the free contest comp has lapsed: normal prices"); }, "2027-06-01T20:00:00Z");
  await withNow(async () => assert.equal(await founderOf(env, city), true), "2028-12-31T20:00:00Z");
  await withNow(async () => assert.equal(await founderOf(env, city), false, "past badge_until"), "2029-01-02T20:00:00Z");
}));

test("the badge stays for the whole comp period however many contests are used; the free message ends when the free contest is used", () => withNow(async () => {
  const { env, a, city } = await setup();
  const e = (await J(entitlementGet({ request: rq("/api/contest-pass/entitlement?site=" + encodeURIComponent("https://www.covinaca.gov"), null, a.cookie), env }))).body;
  assert.deepEqual([e.canCreate, e.comp.unlimited, e.cap], [false, false, 1], "one contest per window: used, so the normal pass offers show");
  assert.ok(e.offers.length > 0);
  assert.equal(await founderOf(env, city), true);
}));

test("Admin grant: the checkbox sets the badge, the list shows it, and a comp without it shows nothing", () => withNow(async () => {
  const { env } = await setup();
  assert.equal((await adm(env, { action: "grant", target: "pasadena.gov", allowed: "unlimited", until: "2027-03-01", note: "x", badge: true })).status, 200);
  assert.equal((await adm(env, { action: "grant", target: "irvine.gov", allowed: 3, until: "2027-03-01" })).status, 200);
  const comps = (await J(passesGet({ env }))).body.comps, by = (k) => comps.find((c) => c.org_key === k);
  assert.deepEqual([by("d:pasadena.gov").badge, by("d:irvine.gov").badge, by("d:covinaca.gov").badge, by("d:covinaca.gov").running], [true, false, true, true]); assert.equal(by("d:covinaca.gov").badge_running, true); assert.equal(by("d:pasadena.gov").badge_until, "2027-03-01", "badge_until defaults to valid-until");
  assert.equal((await adm(env, { action: "revoke_comp", id: by("d:covinaca.gov").id })).status, 200);
  assert.equal((await J(passesGet({ env }))).body.comps.find((c) => c.org_key === "d:covinaca.gov").badge_running, false, "a revoked comp hides the badge");
  const src = readFileSync(new URL("../public/admin/admin.js", import.meta.url), "utf8");
  assert.match(src, /Show a Founder city badge/); assert.match(src, /Founder city badge/); assert.match(src, /Badge until/);
  assert.match(readFileSync(new URL("../public/contest-passes.js", import.meta.url), "utf8"), /your free contest is available through/);
}));

test("the badge never changes results, ranking or order: the same standings with it on and off", () => withNow(async () => {
  const { env, raw, city } = await setup();
  const c = raw.prepare("SELECT * FROM contests WHERE slug = ?").get(city);
  const snap = async () => JSON.stringify({ r: await computeResults(env, c), d: (await J(detailGet({ params: { slug: city }, request: rq("/api/contests/" + city), env }))).body.entries });
  const on = await snap();
  raw.prepare("UPDATE contest_comps SET badge = 0").run();
  assert.equal(await snap(), on);
  for (const f of ["functions/_lib/contests.js", "functions/_lib/judging.js", "functions/api/contests/[slug]/vote.js"]) assert.doesNotMatch(readFileSync(new URL("../" + f, import.meta.url), "utf8"), /founder/i, f + " must not know about the badge");
}));

test("the results pages: /api/archive and /past/<slug> carry the badge for the founder city only", () => withNow(async () => {
  const { env, raw, city, other } = await setup();
  const snap = JSON.stringify({ at: "2026-11-09", categories: ["Best Overall"], entries: [], awards: [], winners: {}, jwinners: {} });
  raw.prepare("UPDATE contests SET announced = 1, results = ?, status = 'live'").run(snap);
  const arch = (await J(archiveGet({ env }))).body, by = (s) => arch.find((c) => c.slug === s);
  assert.deepEqual([by(city).founder, by(other).founder], [true, false]);
  const page = async (s) => (await pastGet({ request: new Request(O + "/past/" + s), env, params: { slug: s }, waitUntil() {} })).text();
  assert.match(await page(city), /Founder city/); assert.doesNotMatch(await page(other), /Founder city/);
  const html = (f) => readFileSync(new URL("../public/" + f, import.meta.url), "utf8");
  for (const f of ["contest.html", "contests.html", "organizer.html"]) assert.match(html(f), /Founder city: one of the first cities to run contests on SoCal Lights/, f);
}));
