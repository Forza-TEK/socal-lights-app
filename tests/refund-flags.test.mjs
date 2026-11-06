// Engineering H1 / payments M4: every path that deletes or unpublishes something with a paid placement must flag the order refund_due ([auto] note, so it reaches Admin > Orders and the digest),
// and a republish must put the placement back. Also a scan that fails when a new delete path forgets the helper. Nothing reaches Stripe or a mailbox.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { newEnv, addEvent, addUser, getEvent, ptToday } from "./_pay.mjs";
import { deleteAccount } from "../functions/_lib/account.js";
import { deleteContest } from "../functions/_lib/contests.js";
import { flagRefundDue, restoreRefundDue, NEEDS_ATTENTION, ORDER_FROM } from "../functions/_lib/orders.js";
import { onRequestDelete as deleteMyHome } from "../functions/api/me/homes/[id].js";
import { onRequestDelete as deleteMyEvent } from "../functions/api/me/events/[id].js";
import { onRequestPatch as patchContest } from "../functions/api/contests/[slug].js";
import { onRequestPost as adminContest, onRequestDelete as adminContestDelete } from "../functions/api/admin/contests/[id].js";
import { onRequestPost as adminInstaller } from "../functions/api/admin/installers/[id].js";

const PHOTOS = { delete: async () => {} };
const until = ptToday(30);
const order = (raw, sid, target, id, o = {}) => raw.prepare("INSERT INTO feature_orders (session_id,event_id,target,plan,amount,email,status,applied,applied_featured,applied_until) VALUES (?,?,?,?,?,?,?,?,?,?)")
  .run(sid, id, target, o.plan || "pin", 1000, "buyer@example.com", o.status || "paid", o.applied ?? 1, 1, o.until === undefined ? until : o.until);
const ord = (raw, sid) => ({ ...raw.prepare("SELECT * FROM feature_orders WHERE session_id = ?").get(sid) });
const flagged = (o) => { assert.equal(o.status, "refund_due"); assert.match(o.note, /^\[auto\] /); };
const contest = (raw, owner = "uK", eventId = "c-k1") => raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,entries_close,vote_start,vote_end,contact_email,status,event_id,note) VALUES ('k1','k1',?,'Lights','Org','Pasadena','2026-12-01','2026-12-02','2027-12-20','k@x.com','live',?,'')").run(owner, eventId);
const home = (raw, id = "h1", userId = "uK", cid = null) => raw.prepare("INSERT INTO posts (id,biz,title,city,lat,lng,descr,user_id,contest_id,contact_email,status,photos,featured,featured_until) VALUES (?,?,?,?,?,?,?,?,?,?,'approved','[]',1,?)").run(id, "b", "My Home", "Pasadena", 1, 2, "d", userId, cid, "k@x.com", until);
const req = (method, url, body, cookie) => new Request("https://socallights.app" + url, { method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

test("the helper flags paid, unrefunded orders that are running or unapplied, and leaves ended, refunded and other targets alone", async () => {
  const { env, raw } = newEnv();
  order(raw, "run", "event", "x"); order(raw, "unapplied", "event", "x", { applied: 0, until: null }); order(raw, "ended", "event", "x", { until: ptToday(-5) });
  order(raw, "refunded", "event", "x", { status: "refunded" }); order(raw, "home", "home", "x"); order(raw, "held", "event", "x", { status: "held" });
  const n = await flagRefundDue(env.DB, { events: ["x"] }, "why", { restorable: false });
  assert.equal(n, 3);
  for (const s of ["run", "unapplied", "held"]) flagged(ord(raw, s));
  for (const s of ["ended", "refunded", "home"]) assert.notEqual(ord(raw, s).status, "refund_due");
  assert.equal(await flagRefundDue(env.DB, { events: [] }, "why"), 0);
});

test("more than 100 ids stay under the 100 parameter limit (slices)", async () => {
  const { env, raw } = newEnv();
  const ids = Array.from({ length: 250 }, (_, i) => "h" + i);
  order(raw, "s1", "home", "h249");
  assert.equal(await flagRefundDue(env.DB, { homes: ids }, "why"), 1);
  flagged(ord(raw, "s1"));
});

test("flagged orders show up in the needs-attention list that feeds Admin > Orders and the digest", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  order(raw, "s1", "event", "ev1");
  const count = async () => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${ORDER_FROM} WHERE ${NEEDS_ATTENTION}`).bind(ptToday()).first()).n;
  assert.equal(await count(), 0);
  await flagRefundDue(env.DB, { events: ["ev1"] }, "why");
  assert.equal(await count(), 1);
});

test("account deletion flags a contest owner's event, their homes and their installer profile's Sponsor order", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('uK','k@x.com','K')").run();
  contest(raw, "uK", "ev1"); home(raw);
  raw.prepare("INSERT INTO installers (id,slug,name,email,owner_email,status,banner_until) VALUES ('i1','acme','Acme','k@x.com','k@x.com','active',?)").run(until);
  order(raw, "ev", "event", "ev1"); order(raw, "hm", "home", "h1"); order(raw, "sp", "installer", "i1", { plan: "banner" });
  await deleteAccount({ ...env, PHOTOS }, "uK", "k@x.com");
  for (const s of ["ev", "hm", "sp"]) flagged(ord(raw, s));
  assert.equal(raw.prepare("SELECT 1 FROM events WHERE id='ev1'").get(), undefined);
  assert.equal(raw.prepare("SELECT 1 FROM posts WHERE id='h1'").get(), undefined);
});

test("DELETE /api/me/homes/<id> flags the home's paid order; an unrelated home's order is untouched", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "uK", "k@x.com");
  home(raw, "h1"); home(raw, "h2");
  order(raw, "a", "home", "h1"); order(raw, "b", "home", "h2");
  const r = await deleteMyHome({ params: { id: "h1" }, request: req("DELETE", "/api/me/homes/h1", null, u.cookie), env: { ...env, PHOTOS } });
  assert.equal(r.status, 200);
  flagged(ord(raw, "a")); assert.equal(ord(raw, "b").status, "paid");
});

test("DELETE /api/me/events/<id> flags the event's paid order and a pending submission's", async () => {
  const { env, raw } = newEnv(); addEvent(raw); const u = await addUser(raw, "uK", "k@x.com");
  raw.prepare("INSERT INTO event_submissions (id,name,city,season,type,start_date,end_date,contact_email,status,event_id) VALUES ('s1','Show','Pasadena','christmas','walk',?,?,'k@x.com','published','ev1')").run(ptToday(), ptToday(40));
  order(raw, "a", "event", "ev1"); order(raw, "b", "event", "sub:s1", { applied: 0, until: null });
  const r = await deleteMyEvent({ params: { id: "s1" }, request: req("DELETE", "/api/me/events/s1", null, u.cookie), env });
  assert.equal(r.status, 200);
  flagged(ord(raw, "a")); flagged(ord(raw, "b"));
});

test("a contest creator's Unpublish flags the paid order, and Publish again restores the placement and the order", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "uK", "k@x.com");
  addEvent(raw, "c-k1", { featured: 1, featured_until: until }); contest(raw);
  order(raw, "a", "event", "c-k1");
  let r = await patchContest({ params: { slug: "k1" }, request: req("PATCH", "/api/contests/k1", { action: "unpublish" }, u.cookie), env, waitUntil: () => {} });
  assert.equal(r.status, 200);
  flagged(ord(raw, "a")); assert.equal(raw.prepare("SELECT 1 FROM events WHERE id='ev1'").get(), undefined);
  r = await patchContest({ params: { slug: "k1" }, request: req("PATCH", "/api/contests/k1", { action: "publish_again" }, u.cookie), env, waitUntil: () => {} });
  assert.equal(r.status, 200);
  const ev = getEvent(raw, "c-k1"); assert.equal(ev.featured, 1); assert.equal(ev.featured_until, until); // the placement is back
  assert.equal(ord(raw, "a").status, "paid"); assert.equal(ord(raw, "a").note, null);
});

test("an order the owner already refunded stays refunded when the contest is published again", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "uK", "k@x.com");
  addEvent(raw, "c-k1", { featured: 1, featured_until: until }); contest(raw); order(raw, "a", "event", "c-k1");
  await patchContest({ params: { slug: "k1" }, request: req("PATCH", "/api/contests/k1", { action: "unpublish" }, u.cookie), env, waitUntil: () => {} });
  raw.prepare("UPDATE feature_orders SET status='refunded' WHERE session_id='a'").run();
  await patchContest({ params: { slug: "k1" }, request: req("PATCH", "/api/contests/k1", { action: "publish_again" }, u.cookie), env, waitUntil: () => {} });
  assert.equal(ord(raw, "a").status, "refunded"); assert.equal(getEvent(raw, "c-k1").featured, 0);
});

test("Admin contest decline flags and Approve restores; Admin contest delete flags the event and the podium homes", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "c-k1", { featured: 1, featured_until: until }); contest(raw, "uK");
  order(raw, "a", "event", "c-k1");
  let r = await adminContest({ params: { id: "k1" }, request: req("POST", "/api/admin/contests/k1", { action: "decline" }), env, waitUntil: () => {} });
  assert.equal(r.status, 200); flagged(ord(raw, "a"));
  r = await adminContest({ params: { id: "k1" }, request: req("POST", "/api/admin/contests/k1", { action: "approve" }), env, waitUntil: () => {} });
  assert.equal(r.status, 200); assert.equal(ord(raw, "a").status, "paid"); assert.equal(getEvent(raw, "c-k1").featured, 1);
  // delete: the event and a home entered in the contest (podium home) both carry paid orders
  raw.prepare("UPDATE feature_orders SET event_id='c-k1' WHERE session_id='a'").run();
  home(raw, "h1", "uZ", "k1"); order(raw, "b", "home", "h1");
  await adminContestDelete({ params: { id: "k1" }, env: { ...env, PHOTOS } });
  flagged(ord(raw, "a")); flagged(ord(raw, "b"));
  assert.equal(raw.prepare("SELECT 1 FROM contests WHERE id='k1'").get(), undefined);
});

test("deleteContest called directly flags too (the helper lives in the library, not the route)", async () => {
  const { env, raw } = newEnv(); addEvent(raw); contest(raw, "uK", "ev1"); order(raw, "a", "event", "ev1");
  await deleteContest({ ...env, PHOTOS }, { id: "k1", event_id: "ev1" });
  flagged(ord(raw, "a"));
});

test("Admin hide of a sponsored installer flags the Sponsor order; Show restores it; an unsponsored profile is untouched", async () => {
  const { env, raw } = newEnv();
  raw.prepare("INSERT INTO installers (id,slug,name,status,banner_until) VALUES ('i1','acme','Acme','active',?), ('i2','beta','Beta','active','')").run(until);
  order(raw, "sp", "installer", "i1", { plan: "banner" });
  const act = (id, action) => adminInstaller({ params: { id }, request: req("POST", "/api/admin/installers/" + id, { action }), env });
  assert.equal((await act("i1", "hide")).status, 200);
  flagged(ord(raw, "sp")); assert.equal(raw.prepare("SELECT status FROM installers WHERE id='i1'").get().status, "hidden");
  assert.equal((await act("i1", "show")).status, 200);
  assert.equal(ord(raw, "sp").status, "paid"); assert.equal(ord(raw, "sp").note, null);
  assert.equal((await act("i2", "hide")).status, 200);
});

test("restoreRefundDue only undoes restorable flags, never a plain refund_due (a delete)", async () => {
  const { env, raw } = newEnv();
  order(raw, "a", "event", "x"); order(raw, "b", "event", "x");
  await flagRefundDue(env.DB, { events: ["x"] }, "deleted");
  await restoreRefundDue(env.DB, { events: ["x"] });
  flagged(ord(raw, "a")); flagged(ord(raw, "b"));
});

// ---- The guard: a new delete/unpublish path that does not use the helper fails here ----
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/.*$/gm, "");
const files = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith(".js")) files.push(p); } };
walk("functions");
const REMOVES = /DELETE FROM (events|installers)\b|DELETE FROM posts\b|UPDATE installers SET status|unlistFromMap\(/;
const HANDLES = /\b(flagRefundDue|refundDueStatements|contestDeletedStatements|takeOffMap|unlistFromMap|markRefundDue|markHomeRefundDue|livePaidOrders)\b/;
// Files that remove one of these rows and are allowed not to flag, with the reason. Keep this list short.
const ALLOWED = {
  "functions/api/admin/installers/[id].js": "has the flag on hide; the merge delete moves the orders to the kept profile first",
};

test("guard: every function that deletes an event, home or installer row, or hides an installer, uses the refund-flag helper", () => {
  const bad = files.filter((f) => { const src = strip(readFileSync(f, "utf8")); return REMOVES.test(src) && !HANDLES.test(src) && !ALLOWED[f.replace(/\\/g, "/")]; });
  assert.deepEqual(bad, [], "these files remove a row that can carry a paid placement without flagging its orders refund_due (use flagRefundDue / refundDueStatements from functions/_lib/orders.js): " + bad.join(", "));
});

test("guard: the scan can fail (a file with a bare delete is caught)", () => {
  const src = 'await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(id).run();';
  assert.ok(REMOVES.test(src) && !HANDLES.test(src));
});

test("guard: the per-path calls are really there (hide, delete, unlist, account)", () => {
  const has = (f, re) => assert.match(strip(readFileSync(f, "utf8")), re, f);
  has("functions/api/admin/installers/[id].js", /flagRefundDue\(env\.DB, \{ installers/);
  has("functions/api/me/homes/[id].js", /refundDueStatements\(env\.DB, \{ homes/);
  has("functions/_lib/account.js", /refundDueStatements\(env\.DB, \{ events[^}]*homes[^}]*installers/);
  has("functions/_lib/contests.js", /takeOffMap/); has("functions/_lib/contests.js", /putBackOnMap/);
});
