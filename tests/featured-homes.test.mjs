// Phase 3: Featured homes for podium finishers. Podium from the frozen snapshot, ownership, checkout, webhook apply/revoke, Admin > Orders, contest integrity.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { rankValues, podium, snapshotRanks } from "../functions/_lib/podium.js";
import { onRequestPost as checkout } from "../functions/api/feature/checkout.js";
import { onRequestGet as featurable } from "../functions/api/me/featurable.js";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook.js";
import { onRequestGet as ordersGet } from "../functions/api/admin/orders.js";
import { onRequestPost as postAction } from "../functions/api/admin/posts/[id].js";
import { onRequestGet as postsGet } from "../functions/api/posts.js";
import { computeResults } from "../functions/_lib/contests.js";
import { rowToPost } from "../functions/_lib/util.js";
import { newEnv, addUser, stubFetch, stripeEvent, sendWebhook, session, getOrder, ptToday } from "./_pay.mjs";

const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})) }; };
const buy = (env, body, cookie) => J(checkout({ request: new Request("https://socallights.app/api/feature/checkout", { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }), env }));
const mine = (env, cookie) => J(featurable({ request: new Request("https://socallights.app/api/me/featurable", { headers: { cookie } }), env }));

// one contest, 6 homes. Public votes in "Best Overall": h1 10, h2 10 (tie for 1st), h3 7 (3rd, 2 firsts then 3rd), h4 5 (4th), h5 0, h6 disqualified with 99.
const entry = (id, votes, extra = {}) => ({ id, name: id, address: "", city: "Pasadena", photos: [], no: 1, dq: false, votes: { "Best Overall": votes }, ...extra });
const SNAP = { at: "2026-12-20", categories: ["Best Overall"], winners: {}, jwinners: {}, awards: [], entries: [entry("h1", 10), entry("h2", 10), entry("h3", 7), entry("h4", 5), entry("h5", 0), entry("h6", 99, { dq: true })] };
function seed(raw, { announced = 1, snap = SNAP, note = "", cstatus = "live" } = {}) {
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,entries_close,vote_start,vote_end,contact_email,status,event_id,note,announced,results) VALUES ('k1','k1','org1','Lights Cup','Org','Pasadena','2026-12-01','2026-12-02','2026-12-20','org@example.com',?,NULL,?,?,?)").run(cstatus, note, announced, announced ? JSON.stringify(snap) : "");
  const ins = raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,contest_id,user_id,entry_no,approved_at) VALUES (?,'approved','b',?,'Pasadena',34.1,-118.1,'d','[]',?,'christmas','1 Oak St, Pasadena, CA','k1',?,?,datetime('now'))");
  ["h1", "h2", "h3", "h4", "h5", "h6"].forEach((id, i) => ins.run(id, "Home " + id, id === "h1" ? "Owner+x@example.com" : id === "h2" ? "o2@example.com" : "", id === "h2" ? "u2" : id === "h3" ? "" : id === "h1" ? "" : "ux", i + 1));
}
const getPost = (raw, id) => ({ ...raw.prepare("SELECT * FROM posts WHERE id = ?").get(id) });

test("podium: competition ranking, ties share a place and skip the next, zeros and disqualified are out", () => {
  assert.deepEqual(rankValues([{ id: "a", value: 5 }, { id: "b", value: 9 }, { id: "c", value: 9 }, { id: "d", value: 7 }, { id: "e", value: 0 }]), [{ id: "b", place: 1 }, { id: "c", place: 1 }, { id: "d", place: 3 }, { id: "a", place: 4 }]);
  const p = podium(SNAP);
  assert.equal(p.get("h1").place, 1); assert.equal(p.get("h2").place, 1); assert.equal(p.get("h3").place, 3);
  assert.equal(p.has("h4"), false, "4th is not on the podium"); assert.equal(p.has("h5"), false, "zero votes"); assert.equal(p.has("h6"), false, "disqualified");
  // judges: pick counts and score averages, a home's best finish across awards wins
  const snap = { categories: ["A"], entries: [{ id: "x", votes: { A: 1 }, jv: { A: { avg: 8.5, n: 3 } } }, { id: "y", votes: { A: 9 }, jv: { A: { avg: 9.1, n: 3 } } }, { id: "z", votes: { A: 0 }, jv: { A: { avg: 0, n: 2 } } }] };
  const kinds = snapshotRanks(snap); assert.deepEqual(kinds.map((k) => k.kind), ["public", "judge"]);
  assert.equal(podium(snap).get("x").place, 2); assert.equal(podium(snap).get("y").place, 1); assert.equal(podium(snap).has("z"), false);
  assert.equal(podium({ categories: ["A"], entries: [{ id: "q", jv: { A: 2 } }, { id: "r", jv: { A: 2 } }, { id: "s", jv: { A: 1 } }] }).get("s").place, 3, "pick counts");
  assert.equal(podium(null).size, 0);
});

test("featurable: only the owner's podium homes; normalized email counts; 4th place and unannounced contests are absent", async () => {
  const { env, raw } = newEnv(); seed(raw);
  const a = await addUser(raw, "uA", "owner@example.com"), b = await addUser(raw, "u2", "o2@example.com"), c = await addUser(raw, "uC", "nobody@example.com"), d = await addUser(raw, "ux", "x@example.com");
  const ra = await mine(env, a.cookie);
  assert.equal(ra.status, 200); assert.deepEqual(ra.body.homes.map((h) => [h.id, h.place, h.kind, h.award]), [["h1", 1, "home", "People's Choice"]], "h1 matched by +tag-normalized email on the form");
  assert.equal(ra.body.homes[0].contest, "Lights Cup"); assert.equal(ra.body.homes[0].featured, 0);
  assert.deepEqual((await mine(env, b.cookie)).body.homes.map((h) => h.id), ["h2"], "account match");
  assert.deepEqual((await mine(env, c.cookie)).body.homes, []);
  assert.deepEqual((await mine(env, d.cookie)).body.homes, [], "owns h4/h5/h6: 4th, zero votes and disqualified are not eligible");
  raw.prepare("UPDATE contests SET announced = 0").run();
  assert.deepEqual((await mine(env, a.cookie)).body.homes, [], "nothing before the winners are announced");
  raw.prepare("UPDATE contests SET announced = 1, status = 'declined'").run();
  assert.deepEqual((await mine(env, a.cookie)).body.homes, [], "an unpublished contest is not live");
  assert.equal((await mine(env, "")).status, 401);
});

test("featurable: organizer-added homes (no owner) are listed for contest staff and owner, not for strangers; owned homes are not", async () => {
  const { env, raw } = newEnv(); seed(raw);
  raw.prepare("UPDATE posts SET user_id = '', contact_email = '' WHERE id = 'h3'").run();
  const o = await addUser(raw, "org1", "org@example.com"), s = await addUser(raw, "stf", "staff@example.com"), x = await addUser(raw, "uX", "x2@example.com");
  raw.prepare("INSERT INTO contest_staff (contest_id,email) VALUES ('k1','staff@example.com')").run();
  assert.deepEqual((await mine(env, o.cookie)).body.homes.map((h) => [h.id, h.role]), [["h3", "organizer"]], "not h1/h2, which belong to residents");
  assert.deepEqual((await mine(env, s.cookie)).body.homes.map((h) => h.id), ["h3"]);
  assert.deepEqual((await mine(env, x.cookie)).body.homes, []);
  raw.prepare("UPDATE contests SET note = 'review'").run();
  assert.deepEqual((await mine(env, s.cookie)).body.homes, [], "a contest Admin has a note on cannot buy (existing ownership rule)");
});

test("checkout: owner of a podium home pays the server price; metadata says home; the season plan, 4th place, strangers and unannounced contests are refused", async () => {
  const { env, raw } = newEnv(); seed(raw);
  const a = await addUser(raw, "uA", "owner@example.com"), c = await addUser(raw, "uC", "nobody@example.com"), d = await addUser(raw, "ux", "x@example.com");
  const f = stubFetch();
  try {
    let r = await buy(env, { home_id: "h1", plan: "pin" }, a.cookie);
    assert.equal(r.status, 200); assert.match(r.body.url, /^https:\/\/checkout\.stripe\.com\//);
    const sent = new URLSearchParams(String(f.calls[0].init.body));
    assert.equal(sent.get("line_items[0][price_data][unit_amount]"), "1000"); assert.equal(sent.get("metadata[target]"), "home"); assert.equal(sent.get("metadata[event_id]"), "h1"); assert.equal(sent.get("metadata[user_id]"), "uA");
    assert.match(sent.get("success_url"), /home=1/); assert.match(sent.get("cancel_url"), /home=h1/); assert.match(sent.get("line_items[0][price_data][product_data][description]"), /Winner: Lights Cup/);
    assert.equal((await buy(env, { home_id: "h1", plan: "top" }, a.cookie)).status, 200);
    assert.equal((await buy(env, { home_id: "h1", plan: "season" }, a.cookie)).status, 400, "no season plan for homes");
    assert.equal((await buy(env, { home_id: "h1", plan: "pin" }, c.cookie)).status, 404, "someone else's home looks like a missing one");
    assert.equal((await buy(env, { home_id: "h1", plan: "pin" })).status, 401);
    const n = f.calls.length;
    assert.equal((await buy(env, { home_id: "h4", plan: "pin" }, d.cookie)).status, 403, "4th place");
    assert.equal((await buy(env, { home_id: "h6", plan: "pin" }, d.cookie)).status, 403, "disqualified");
    assert.equal((await buy(env, { home_id: "nope", plan: "pin" }, a.cookie)).status, 404);
    raw.prepare("UPDATE contests SET announced = 0").run();
    assert.equal((await buy(env, { home_id: "h1", plan: "pin" }, a.cookie)).status, 404, "not announced");
    assert.equal(f.calls.length, n, "Stripe was not called for any refused request");
  } finally { f.restore(); }
});

const payHome = (env, n, o = {}) => sendWebhook(webhook, env, stripeEvent("checkout.session.completed", session({ id: "cs_h" + n, payment_intent: "pi_h" + n, amount_total: 1000, metadata: { event_id: "h1", plan: "pin", user_id: "uA", target: "home", ...(o.m || {}) }, ...(o.s || {}) })));

test("webhook: a paid home order switches the home on (30 days, Pacific), never touches events or contest results; replay and extension behave", async () => {
  const { env, raw } = newEnv(); seed(raw);
  const before = JSON.stringify(await computeResults(env, { id: "k1", categories: JSON.stringify(["Best Overall"]), mode: "public", judge_method: "pick" }).catch(() => null));
  const r = await payHome(env, 1);
  assert.equal(r.status, 200); assert.equal(r.body.featured.featured, 1);
  const o = getOrder(raw, "cs_h1"); assert.equal(o.target, "home"); assert.equal(o.applied, 1); assert.equal(o.event_id, "h1");
  const p = getPost(raw, "h1"); assert.equal(p.featured, 1); assert.equal(p.featured_until, new Date(Date.parse(ptToday() + "T00:00:00Z") + 30 * 86400_000).toISOString().slice(0, 10));
  assert.equal(rowToPost({ ...p, photos: "[]" }).f, 1, "the public post carries the featured level");
  assert.equal((await payHome(env, 1)).body.duplicate, true, "same session twice");
  assert.equal(getPost(raw, "h2").featured, 0, "other homes untouched");
  // top plan extends and never lowers; level 2
  const r2 = await payHome(env, 2, { m: { plan: "top" }, s: { amount_total: 1500 } });
  assert.equal(r2.body.featured.featured, 2); assert.equal(getPost(raw, "h1").featured_until, new Date(Date.parse(ptToday() + "T00:00:00Z") + 60 * 86400_000).toISOString().slice(0, 10));
  assert.equal(rowToPost({ ...getPost(raw, "h1"), photos: "[]" }).f, 2);
  // payment changes no result
  assert.equal(JSON.stringify(await computeResults(env, { id: "k1", categories: JSON.stringify(["Best Overall"]), mode: "public", judge_method: "pick" }).catch(() => null)), before);
  assert.equal(raw.prepare("SELECT results FROM contests WHERE id='k1'").get().results, JSON.stringify(SNAP), "the frozen snapshot is untouched");
});

test("webhook: expiry, partial refund, refund and dispute handling for homes", async () => {
  const { env, raw } = newEnv(); seed(raw);
  await payHome(env, 1);
  const keep = getPost(raw, "h1").featured_until;
  raw.prepare("UPDATE posts SET featured_until = ? WHERE id = 'h1'").run(ptToday(-1));
  assert.equal(rowToPost({ ...getPost(raw, "h1"), photos: "[]" }).f, 0, "past its last day: off");
  raw.prepare("UPDATE posts SET featured_until = ? WHERE id = 'h1'").run(keep);
  const h = await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_h1", refunded: false }));
  assert.equal(h.body.held, "partial refund"); assert.equal(getPost(raw, "h1").featured, 1, "a partial refund leaves it on for the owner to decide");
  const full = await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_1", payment_intent: "pi_h1", refunded: true }));
  assert.equal(full.body.revoked, true); assert.equal(getPost(raw, "h1").featured, 0); assert.equal(getPost(raw, "h1").featured_until, null); assert.equal(getOrder(raw, "cs_h1").status, "refunded");
  // dispute lost on a second order
  await payHome(env, 2, { s: {} });
  assert.equal(getPost(raw, "h1").featured, 1);
  const dl = await sendWebhook(webhook, env, stripeEvent("charge.dispute.closed", { payment_intent: "pi_h2", charge: "ch_2", status: "lost" }));
  assert.equal(dl.body.revoked, true); assert.equal(getPost(raw, "h1").featured, 0); assert.equal(getOrder(raw, "cs_h2").status, "disputed");
  // a refund that arrives first is remembered and the order is created already refunded
  await sendWebhook(webhook, env, stripeEvent("charge.refunded", { id: "ch_3", payment_intent: "pi_h3", refunded: true }));
  const late = await payHome(env, 3);
  assert.equal(late.body.skipped, "refunded"); assert.equal(getPost(raw, "h1").featured, 0);
  // an order for a home that no longer exists is retried (500) rather than lost
  const gone = await payHome(env, 4, { m: { event_id: "gone" } });
  assert.equal(gone.status, 500);
  // an event order and a home order never mix: the season plan is ignored for homes
  const sea = await payHome(env, 5, { m: { plan: "season" }, s: { amount_total: 2000 } });
  assert.equal(sea.body.ignored, "no season plan for homes");
});

test("Admin > Orders shows the home's name and contest; declining, unpublishing or deleting a home with a running paid placement makes it refund due", async () => {
  const { env, raw } = newEnv(); seed(raw);
  await payHome(env, 1);
  const rows = (await J(await ordersGet({ env }))).body;
  assert.equal(rows.length, 1); assert.equal(rows[0].target, "home"); assert.equal(rows[0].name, "Home h1"); assert.equal(rows[0].contest_name, "Lights Cup"); assert.equal(rows[0].ev_featured, 1);
  const act = (id, body) => J(postAction({ request: new Request("https://x.test/api/admin/posts/" + id, { method: "POST", body: JSON.stringify(body) }), env, params: { id }, data: { admin: { email: "o@example.com" } }, waitUntil: () => {} }));
  const d = await act("h1", { action: "decline" });
  assert.equal(d.status, 200); assert.equal(getOrder(raw, "cs_h1").status, "refund_due"); assert.match(getOrder(raw, "cs_h1").note, /^\[auto\] The home was declined/);
  assert.deepEqual((await J(await ordersGet({ env }))).body[0].flags.slice(0, 1), ["refund_due"]);
  // an expired placement is not flagged
  await payHome(env, 2); raw.prepare("UPDATE feature_orders SET applied_until = ? WHERE session_id = 'cs_h2'").run(ptToday(-1));
  await act("h1", { action: "decline" });
  assert.equal(getOrder(raw, "cs_h2").status, "paid");
});

test("contest integrity: no contest, ballot, vote, results, judge, archive or export code reads posts.featured", () => {
  const files = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith(".js")) files.push(p); } };
  ["functions/api/contests", "functions/past"].forEach(walk);
  ["contests", "judging", "archive", "badges", "wins"].forEach((n) => files.push(`functions/_lib/${n}.js`));
  files.push("functions/api/archive.js");
  const bad = files.filter((f) => /featured/i.test(readFileSync(f, "utf8").replace(/\/\/.*$/gm, "")));
  assert.deepEqual(bad, [], "these files must not read or sort by featured: " + bad.join(", "));
});

test("the public posts list carries the featured level (and only that) for a featured home", async () => {
  const { env, raw } = newEnv(); seed(raw);
  await payHome(env, 1);
  const list = (await J(await postsGet({ env }))).body;
  assert.equal(list.find((p) => p.id === "h1").f, 1); assert.equal(list.find((p) => p.id === "h2").f, 0);
});
