// Payments audit 2026-11-16, high findings: H1 (a pass bought ahead is found by the contest), H2 (a declined or closed contest cannot be run again), H3 (vote void/restore is logged and
// the snapshot counts voided votes), H4 (the vote review is paged and flags cover every vote). In-memory D1; fetch is stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as createContest } from "../functions/api/contests/index.js";
import { onRequestPatch as patchContest, onRequestGet as contestGet } from "../functions/api/contests/[slug].js";
import { onRequestGet as entitlementGet } from "../functions/api/contest-pass/entitlement.js";
import { onRequestPost as passCheckout } from "../functions/api/contest-pass/checkout.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { onRequestGet as votesGet, onRequestPost as votesPost } from "../functions/api/contests/[slug]/votes.js";
import { onRequestGet as changesGet } from "../functions/api/contests/[slug]/changes.js";
import { keyForUser, emailDomainKey } from "../functions/_lib/passkey.js";
import { newEnv, addUser, stubFetch, stripeEvent, sendWebhook, session, freezeNow, ptToday } from "./_pay.mjs";

const O = "https://socallights.app", NOW = "2026-11-10T20:00:00Z", T = "2026-11-10", END = "2027-11-09";
const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})) }; };
const rq = (url, body, cookie, method) => new Request(O + url, { method: method || (body ? "POST" : "GET"), headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const good = (o = {}) => ({ name: "Maple Street Showdown", org: "Maple Street Neighbors", city: "Pasadena", descr: "Neighbors decorate, everyone votes for a favorite.", site: "", closes: ptToday(10), vs: ptToday(11), ve: ptToday(25), cats: ["Best Overall"], ...o });
const make = (env, cookie, o) => J(createContest({ request: rq("/api/contests", good(o), cookie), env }));
const withNow = async (fn) => { const un = freezeNow(NOW); try { return await fn(); } finally { un(); } };
const pay = (env, n, plan, cents, key, email) => sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ id: "cs_" + n, payment_intent: "pi_" + n, amount_total: cents, customer_details: { email }, metadata: { event_id: key, target: "contest_pass", plan, user_id: "u1", quote_from: T, quote_to: END, quote_cents: String(cents) } })));
const patch = (env, slug, body, cookie) => J(patchContest({ params: { slug }, request: rq("/x", body, cookie, "PATCH"), env }));

// ---------------- H1 ----------------
test("H1: with no website a clerk at an organization email domain buys for the domain, and the contest created later (blank website) finds that pass", () => withNow(async () => {
  const { env, raw } = newEnv({ ADMIN_NOTIFY_EMAIL: "admin@example.com" }); const me = await addUser(raw, "u1", "clerk@springfieldca.gov");
  assert.equal(emailDomainKey("clerk@springfieldca.gov"), "d:springfieldca.gov");
  assert.equal(emailDomainKey("someone@gmail.com"), "", "free mail has no organization");
  assert.equal(await keyForUser(env, me, null), "d:springfieldca.gov", "the entitlement with no ?site= is the domain's");
  assert.equal((await J(entitlementGet({ request: rq("/api/contest-pass/entitlement", null, me.cookie), env }))).body.key, "d:springfieldca.gov");
  const f = stubFetch();
  try { const r = await J(passCheckout({ request: rq("/api/contest-pass/checkout", { plan: "pass_1" }, me.cookie), env })); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.match(decodeURIComponent(String(f.calls[0].init.body)), /metadata\[event_id\]=d:springfieldca\.gov/); } finally { f.restore(); }
  assert.equal((await pay(env, 1, "pass_1", 14900, "d:springfieldca.gov", "clerk@springfieldca.gov")).status, 200);
  const a = await make(env, me.cookie, { site: "" }); assert.equal(a.status, 200, JSON.stringify(a.body));
  assert.equal(raw.prepare("SELECT org_key FROM contests WHERE slug = ?").get(a.body.slug).org_key, "d:springfieldca.gov", "no second payment asked for");
}));
test("H1: two keys: a gmail account keeps u:<email>; a pass on one domain does not cover an account at another", () => withNow(async () => {
  const { env, raw } = newEnv(); const g = await addUser(raw, "u1", "owner@gmail.com"), c = await addUser(raw, "u2", "clerk@other.gov");
  assert.equal(await keyForUser(env, g, null), "u:owner@gmail.com");
  assert.equal((await pay(env, 1, "pass_1", 14900, "d:springfieldca.gov", "x@springfieldca.gov")).status, 200);
  const a = await make(env, c.cookie, {}); assert.equal(a.status, 402, "a pass on another organization does not cover this one");
  assert.equal(await keyForUser(env, c, "springfieldca.gov"), "u:clerk@other.gov", "a website that does not match the email stays an account key");
}));
test("H1: the pass page has a contest website box and says whose pass it will be", () => {
  const h = readFileSync("public/contest-pass.html", "utf8");
  assert.match(h, /id="orgsite"/); assert.match(h, /This pass will belong to/); assert.match(h, /let site = /);
});

// ---------------- H2 ----------------
const seedContest = (raw, o = {}) => raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,contact_email,descr,approval,rules,note,org_key,live_at,unpublished_by,announced) VALUES ('c1','old','u1','Old Contest 2025','Org','Pasadena','Los Angeles','christmas',?, '2026-12-10','2026-12-12','2026-12-20','[\"Best Overall\"]','o@springfieldca.gov','A long enough welcome message here','manual','rules rules rules rules rules rules rules rules rules rules',?, 'd:free.gov', '2026-11-10', ?, 0)")
  .run(o.status || "live", o.note === undefined ? "" : o.note, o.by || "");
test("H2: Run it again is refused for a declined, held or Admin-closed contest, and the copy of a live one keeps the review note", () => withNow(async () => {
  const { env, raw } = newEnv(); const me = await addUser(raw, "u1", "o@springfieldca.gov");
  raw.prepare("INSERT INTO contest_comps (id, org_key, allowed, valid_until, note) VALUES ('k','d:free.gov',-1,'2099-12-31','t'), ('k2','u:o@springfieldca.gov',-1,'2099-12-31','t'), ('k3','d:springfieldca.gov',-1,'2099-12-31','t')").run();
  for (const [status, by] of [["declined", ""], ["declined", "owner"], ["pending", ""], ["closed", ""]]) {
    raw.prepare("DELETE FROM contests").run(); seedContest(raw, { status, by });
    const r = await patch(env, "old", { action: "clone" }, me.cookie);
    assert.equal(r.status, 400, status + "/" + by); assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contests").get().n, 1, "no copy was made");
  }
  raw.prepare("DELETE FROM contests").run(); seedContest(raw, { status: "live", note: "email is a free-mail address" });
  const ok = await patch(env, "old", { action: "clone" }, me.cookie); assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const c = raw.prepare("SELECT * FROM contests WHERE slug = ?").get(ok.body.slug);
  assert.equal(c.status, "live"); assert.equal(c.note, "email is a free-mail address", "the note carries over, so organizer-added homes stay capped until Admin vouches"); assert.equal(c.unpublished_by, "");
}));

// ---------------- H3 / H4 ----------------
function seedVotes(raw, nVoters = 4) {
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,contact_email,descr,approval,rules,org_key,live_at) VALUES ('c1','show','uO','Show','Org','Pasadena','Los Angeles','christmas','live','2026-11-01','2026-11-02','2026-11-30','[\"A\",\"B\",\"C\"]','public','owner@springfieldca.gov','A long enough welcome message here','manual','rules rules rules rules rules rules rules rules rules rules','d:x.gov','2026-11-10')").run();
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('ea','h@example.com','')").run();
  raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,contest_id,user_id,entry_no,approved_at) VALUES ('pa','approved','Biz','Home A','Pasadena',34,-118,'d','[]','h@example.com','christmas','1 Oak','1 Oak','91101','c1','ea',1,datetime('now'))").run();
  const ins = raw.prepare("INSERT INTO votes (id,contest_id,user_id,post_id,category,created_at) VALUES (?,?,?,?,?,?)");
  for (let i = 0; i < nVoters; i++) { raw.prepare("INSERT INTO users (id,email,name) VALUES (?,?,?)").run("v" + i, `v${i}@example.com`, ""); ["A", "B", "C"].forEach((k, j) => ins.run(`v${i}-${j}`, "c1", "v" + i, "pa", k, `2026-11-05 10:${String(i).padStart(2, "0")}:${String(j * 10).padStart(2, "0")}`)); }
  // the bot: 3 votes in 2 seconds, the OLDEST rows of the contest
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('bot','bot@example.com','')").run();
  ["A", "B", "C"].forEach((k, j) => ins.run("bot" + j, "c1", "bot", "pa", k, `2026-11-03 09:00:0${j}`));
}
const vget = (env, cookie, q = "") => J(votesGet({ params: { slug: "show" }, request: rq("/api/contests/show/votes" + q, null, cookie), env }));
const vpost = (env, cookie, body) => J(votesPost({ params: { slug: "show" }, request: rq("/api/contests/show/votes", body, cookie), env }));
test("H3: voiding and restoring a vote is written to the change log with a voter code and the reason (no email), and the snapshot counts the removed votes", () => withNow(async () => {
  const { env, raw } = newEnv(); const owner = await addUser(raw, "uO", "owner@springfieldca.gov"); seedVotes(raw);
  const r1 = await vpost(env, owner.cookie, { vote_id: "bot0", voided: true, reason: "script, 3 votes in 2 seconds" }); assert.equal(r1.status, 200);
  await vpost(env, owner.cookie, { vote_id: "bot0", voided: true }); // repeat: no second log row
  await vpost(env, owner.cookie, { vote_id: "bot1", voided: true });
  const log = raw.prepare("SELECT * FROM contest_changes WHERE contest_id = 'c1' ORDER BY rowid").all();
  assert.equal(log.length, 2); assert.equal(log[0].field, "Vote voided"); assert.equal(log[0].by_email, "owner@springfieldca.gov");
  assert.match(log[0].new, /A vote for Home A, voter [0-9a-f]{8}, reason: script/); assert.ok(!/bot@example\.com/.test(JSON.stringify(log)), "no voter email in the log");
  await vpost(env, owner.cookie, { vote_id: "bot1", voided: false });
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contest_changes WHERE field = 'Vote restored'").get().n, 1);
  assert.equal((await vpost(env, owner.cookie, { vote_id: "nope", voided: true })).status, 404);
  assert.equal((await J(changesGet({ params: { slug: "show" }, request: rq("/x", null, owner.cookie), env }))).body.changes.length, 3, "co-organizers read it in the dashboard change list");
  const r = await patch(env, "show", { action: "announce", force: true }, owner.cookie); assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(JSON.parse(raw.prepare("SELECT results FROM contests WHERE id = 'c1'").get().results).voided, 1);
  assert.equal((await J(contestGet({ params: { slug: "show" }, request: rq("/api/contests/show", null, owner.cookie), env }))).body.contest.votesRemoved, 1);
  assert.match(readFileSync("public/contest.html", "utf8"), /votesRemoved/);
}));
test("H4: the vote review is paged, the flags and totals cover all votes (the oldest ones too), and a flagged-only view lists the bot", () => withNow(async () => {
  const { env, raw } = newEnv(); const owner = await addUser(raw, "uO", "owner@springfieldca.gov"); seedVotes(raw, 4);
  const p1 = (await vget(env, owner.cookie, "?limit=5")).body;
  assert.equal(p1.total, 15); assert.equal(p1.votes.length, 5); assert.equal(p1.flaggedVoters, 1); assert.equal(p1.flaggedVotes, 3);
  assert.ok(!p1.votes.some((v) => v.flags.length), "the bot's votes are the oldest, so not on page one");
  const p3 = (await vget(env, owner.cookie, "?limit=5&offset=10")).body; assert.equal(p3.votes.length, 5); assert.equal(p3.votes.filter((v) => v.flags.length).length, 3, "flagged on a later page");
  assert.match(p3.votes.find((v) => v.flags.length).flags[0], /Cast 3 votes in 2 seconds/);
  const f = (await vget(env, owner.cookie, "?flagged=1")).body; assert.equal(f.votes.length, 3); assert.equal(f.matching, 3); assert.equal(f.filtered, true);
  assert.equal((await vget(env, owner.cookie)).body.votes.length, 15);
  const org = readFileSync("public/organizer.html", "utf8"); assert.match(org, /id="vmore"/); assert.match(org, /Showing /);
}));
test("H4: more than 1000 votes: every vote is reachable and the total is right", () => withNow(async () => {
  const { env, raw } = newEnv(); const owner = await addUser(raw, "uO", "owner@springfieldca.gov"); seedVotes(raw, 0);
  const ins = raw.prepare("INSERT INTO votes (id,contest_id,user_id,post_id,category,created_at) VALUES (?,?,?,?,?,?)"), u = raw.prepare("INSERT INTO users (id,email,name) VALUES (?,?,?)");
  raw.exec("BEGIN"); for (let i = 0; i < 1100; i++) { u.run("m" + i, `m${i}@example.com`, ""); ins.run("mv" + i, "c1", "m" + i, "pa", "A", "2026-11-06 12:00:00"); } raw.exec("COMMIT");
  const all = (await vget(env, owner.cookie, "?limit=500")).body; assert.equal(all.total, 1103); assert.equal(all.votes.length, 500);
  assert.equal((await vget(env, owner.cookie, "?limit=500&offset=1000")).body.votes.length, 103);
}));
