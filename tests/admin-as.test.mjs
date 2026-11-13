// "Admins can do everything people can do": /api/admin/as/... runs the public user routes as the owner, with a signed header (functions/_lib/actas.js, docs/admin-parity.md).
import test from "node:test";
import assert from "node:assert/strict";
import { makeDB } from "./_d1.mjs";
import { addUser, ptToday } from "./_pay.mjs";
import { onRequest as asRoute, ROUTES, matchRoute } from "../functions/api/admin/as/[[path]].js";
import { signActAs, readActAs, ACT_AS_HEADER } from "../functions/_lib/actas.js";
import { getUser } from "../functions/_lib/auth.js";
import { onRequestPost as mePost } from "../functions/api/me/events/[id].js";

const ORIGIN = "https://socallights.app", SECRET = { ADMIN_AS_SECRET: "a-long-random-test-secret-value" };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8]);
const r2 = () => { const store = new Map(); return { store, put: async (k, v) => { store.set(k, v); }, get: async (k) => store.get(k) || null, delete: async (k) => { store.delete(k); } }; };
function setup(extra = SECRET) {
  const { DB, raw } = makeDB(), bucket = r2(), env = { DB, PHOTOS: bucket, ...extra };
  raw.prepare("INSERT INTO events (id,name,city,county,type,start_date,end_date,status,lat,lng) VALUES ('u-oak-1','Oak Hill Tree Lighting','Pasadena','Los Angeles','tree',?,?,'confirmed',34.1,-118.1)").run(ptToday(10), ptToday(11));
  return { env, raw, bucket };
}
async function owner(raw) { const u = await addUser(raw, "u1", "me@example.com"); raw.prepare("INSERT INTO event_submissions (id,name,city,county,season,type,start_date,end_date,contact_email,status,event_id,blurb,venue,lat,lng) VALUES ('s1','Oak Hill Tree Lighting','Pasadena','Los Angeles','christmas','tree',?,?,'me@example.com','published','u-oak-1','The whole neighborhood lights the tree together.','Oak Hill Park',34.1,-118.1)").run(ptToday(10), ptToday(11)); return u; }
const adminCtx = (env, path, init = {}, query = "") => ({ env, data: { admin: { email: "rey@forza-tek.com" } }, params: { path: path.split("/") }, request: new Request(`${ORIGIN}/api/admin/as/${path}${query}`, { ...init, headers: { origin: ORIGIN, ...(init.headers || {}) } }) });
const req = (headers) => new Request(ORIGIN + "/api/me/overview", { headers });

test("the signed header: valid is accepted; forged, tampered, expired, wrong secret and no secret are ignored", async () => {
  const { env, raw } = setup(); const me = await addUser(raw, "u1", "me@example.com");
  const good = await signActAs(env, { id: "u1", email: "me@example.com", admin: "rey@forza-tek.com" });
  const u = await readActAs(req({ [ACT_AS_HEADER]: good }), env); assert.equal(u.id, "u1"); assert.equal(u.adminActing, "rey@forza-tek.com");
  assert.equal((await getUser(req({ [ACT_AS_HEADER]: good }), env)).email, "me@example.com", "getUser trusts it");
  const [payload, sig] = good.split(".");
  assert.equal(await readActAs(req({ [ACT_AS_HEADER]: payload + ".AAAA" }), env), null, "bad signature");
  const evil = btoa(JSON.stringify({ i: "u1", e: "me@example.com", a: "x", x: 9999999999 })).replace(/=+$/, "");
  assert.equal(await readActAs(req({ [ACT_AS_HEADER]: evil + "." + sig }), env), null, "a changed payload with the old signature");
  assert.equal(await readActAs(req({ [ACT_AS_HEADER]: await signActAs(env, { id: "u1" }, Date.now() - 600_000) }), env), null, "expired");
  assert.equal(await readActAs(req({ [ACT_AS_HEADER]: good }), { ...env, ADMIN_AS_SECRET: "another-secret-entirely-here" }), null, "wrong secret");
  assert.equal(await readActAs(req({ [ACT_AS_HEADER]: good }), { DB: env.DB }), null, "no secret: the feature is off");
  assert.equal(await signActAs({ DB: env.DB }, { id: "u1" }), null);
  assert.equal(await getUser(req({}), env), null, "no header and no cookie: nobody");
  assert.equal((await getUser(req({ cookie: me.cookie }), env)).id, "u1", "ordinary sign-in still works");
});

test("an Admin adds, covers and removes event photos as the owner, found from the event alone; the public route still refuses a stranger", async () => {
  const { env, raw, bucket } = setup(); await owner(raw);
  const fd = new FormData(); fd.append("photos", new File([PNG], "a.png", { type: "image/png" })); fd.append("photos", new File([PNG], "b.png", { type: "image/png" }));
  const up = await asRoute(adminCtx(env, "me/events/s1", { method: "POST", body: fd })); assert.equal(up.status, 200); const j = await up.json(); assert.equal(j.photos.length, 2); assert.equal(bucket.store.size, 2);
  const cover = await asRoute(adminCtx(env, "me/events/s1", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "coverphoto", key: j.photos[1] }) })); assert.equal((await cover.json()).photos[0], j.photos[1]);
  const rm = await asRoute(adminCtx(env, "me/events/s1", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "removephoto", key: j.photos[0] }) })); assert.equal(rm.status, 200); assert.equal(bucket.store.size, 1);
  const stranger = await mePost({ params: { id: "s1" }, env, request: new Request(ORIGIN + "/api/me/events/s1", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json" }, body: JSON.stringify({ action: "notice", notice: "cancelled" }) }) });
  assert.equal(stranger.status, 401, "the public route without a sign-in or a signed header");
  const forged = await mePost({ params: { id: "s1" }, env, request: new Request(ORIGIN + "/api/me/events/s1", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json", [ACT_AS_HEADER]: "eyJ4IjoxfQ.abc" }, body: JSON.stringify({ action: "notice", notice: "cancelled" }) }) });
  assert.equal(forged.status, 401, "a forged header does nothing");
});

test("the same code runs as the person: notice, edit and copy on an event; take a home down and back; organizer calls as the contest owner; installer manage as its owner", async () => {
  const { env, raw } = setup(); await owner(raw);
  const post = (path, body, q = "") => asRoute(adminCtx(env, path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, q));
  assert.equal((await post("me/events/s1", { action: "notice", notice: "postponed" })).status, 200); assert.equal(raw.prepare("SELECT notice FROM events WHERE id='u-oak-1'").get().notice, "postponed");
  assert.equal((await post("me/events/s1", { action: "edit", blurb: "Bring the family and sing carols around the big tree." })).status, 200);
  raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,contest_id,user_id) VALUES ('h1','approved','Fam','Oak Street Lights','Pasadena',34.1,-118.1,'A long description of my lights.','[]','me@example.com','christmas','1 Oak St','1 Oak St','91101',NULL,'u1')").run();
  assert.equal((await post("me/homes/h1", { action: "pause" })).status, 200); assert.equal(raw.prepare("SELECT status FROM posts WHERE id='h1'").get().status, "paused");
  assert.equal((await post("me/homes/h1", { action: "resume" })).status, 200);
  raw.prepare("INSERT INTO contests (id,slug,name,org,city,owner_id,status,entries_close,vote_start,vote_end,announced) VALUES ('k1','oak-hill','Oak Hill Contest','Oak Hill HOA','Pasadena','u1','live',?,?,?,0)").run(ptToday(5), ptToday(6), ptToday(12));
  const manage = await asRoute(adminCtx(env, "contests/oak-hill/manage")); assert.equal(manage.status, 200, "the organizer dashboard data, as the contest owner");
  raw.prepare("INSERT INTO installers (id,slug,name,owner_email,status) VALUES ('i1','bright','Bright Nights','me@example.com','active')").run();
  const inst = await asRoute(adminCtx(env, "installers/bright/manage")); assert.equal(inst.status, 200, "the installer profile, as its owner");
  const ov = await asRoute(adminCtx(env, "me/overview", {}, "?as=me@example.com")); assert.equal(ov.status, 200); assert.equal((await ov.json()).events.length, 1, "?as=<email> names the person");
  const byId = await asRoute(adminCtx(env, "me/overview", {}, "?as=u1")); assert.equal(byId.status, 200);
  const none = await asRoute(adminCtx(env, "me/overview", {}, "?as=nobody@example.com")); assert.equal(none.status, 200, "an email that never signed in is a person with nothing yet");
  const log = raw.prepare("SELECT admin, area, action, target_id, label FROM admin_log WHERE area = 'as' ORDER BY id").all();
  assert.ok(log.length >= 8 && log.every((r) => r.admin === "rey@forza-tek.com" && r.action === "act")); assert.ok(log.some((r) => r.target_id === "POST me/events/s1" && /me@example.com/.test(r.label)), "every call is in the Admin log");
});

test("it refuses what it cannot do: off without a secret, unknown pages, an unknown owner, and anything not on the list", async () => {
  const { env, raw } = setup(); await owner(raw);
  assert.equal((await asRoute(adminCtx({ ...env, ADMIN_AS_SECRET: "", THROTTLE_SALT: "" }, "me/overview", {}, "?as=u1"))).status, 503);
  for (const bad of ["admin/users", "stripe-webhook", "me/events", "me/events/s1/extra", "feature/checkout", "auth/logout", "me/events/../../etc"]) assert.equal((await asRoute(adminCtx(env, bad))).status, 404, bad);
  assert.equal((await asRoute(adminCtx(env, "me/events/nope", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }))).status, 404, "an event with no owner needs ?as=");
  assert.equal((await asRoute(adminCtx(env, "me/overview"))).status, 404, "me/overview needs ?as=");
  assert.equal((await asRoute(adminCtx(env, "me/overview", { method: "PUT" }, "?as=u1"))).status, 405);
});

test("every listed page maps to a real handler, and the list covers each user module", async () => {
  for (const [, load, , owner] of ROUTES) { const m = await load(); assert.ok(Object.keys(m).some((k) => /^onRequest/.test(k)), "no handler"); assert.ok(["as", "event", "home", "contest", "installer"].includes(owner)); }
  const covers = (p) => ROUTES.some(([re]) => re.test(p));
  for (const p of ["me/events/x", "me/homes/x", "me/overview", "me/profile", "me/badges", "me/newsletter", "drafts", "drafts/x", "contests/a/manage", "contests/a/entries", "contests/a/entries/b", "contests/a/entries/b/photos", "contests/a/mine", "contests/a/judges", "contests/a/staff", "contests/a/sponsors", "installers/a/manage", "installers/a/logo", "installers/a/claim"]) assert.ok(covers(p), p);
  assert.deepEqual(matchRoute("me/homes/h1").params, { id: "h1" }); assert.deepEqual(matchRoute("contests/oak/entries/e1/photos").params, { slug: "oak", id: "e1" });
});

test("the Admin page /admin/as: Admin only, only listed pages, injects the shim, and the shim sends the page's calls to /api/admin/as", async () => {
  const { onRequestGet: openAs, TO_OK, injectShim } = await import("../functions/admin/as.js");
  const { env } = setup({ ...SECRET, ADMIN_DEV_BYPASS: "1" });
  const get = (qs, e = env, host = "localhost") => openAs({ env: e, request: new Request(`http://${host}/admin/as${qs}`) });
  for (const ok of ["/profile", "/contests", "/add-event", "/c/oak-hill/manage", "/installer/bright/manage"]) assert.ok(TO_OK.test(ok), ok);
  for (const bad of ["/admin/", "/api/me/overview", "/c/oak/manage/extra", "//evil.example/profile", "/profile?x=1", "https://evil.example/", "/c/../manage"]) assert.ok(!TO_OK.test(bad), bad);
  assert.equal((await get("?to=/profile", { ...env, ADMIN_DEV_BYPASS: "" }, "socallights.app")).status, 401, "not an Admin");
  assert.equal((await get("?to=/admin/")).status, 400); assert.equal((await get("?to=/profile", { ...env, ADMIN_AS_SECRET: "", THROTTLE_SALT: "" })).status, 503);
  const real = globalThis.fetch; globalThis.fetch = async (r) => new Response(`<!doctype html><html><head><title>Your profile</title></head><body>${new URL(r.url).pathname}</body></html>`, { headers: { "content-type": "text/html" } });
  try {
    const r = await get("?to=/profile&as=me@example.com&hash=events"); assert.equal(r.status, 200); const html = await r.text();
    assert.match(html, /<head><script src="\/admin\/as-shim\.js\?as=me%40example\.com&label=me%40example\.com&hash=events"><\/script><title>/); assert.equal(r.headers.get("cache-control"), "no-store");
  } finally { globalThis.fetch = real; }
  assert.equal(injectShim("<html><head lang=en>x", "u1", "u1", "").includes('<head lang=en><script src="/admin/as-shim.js'), true);
  // the shim, run against a stand-in page
  const vm = await import("node:vm"), fs = await import("node:fs"), code = fs.readFileSync(new URL("../public/admin/as-shim.js", import.meta.url), "utf8"), calls = [];
  const win = { fetch: (i) => { calls.push(typeof i === "string" ? i : i.url); return Promise.resolve(); } }, loc = new URL("https://socallights.app/profile");
  const doc = { currentScript: { src: "https://socallights.app/admin/as-shim.js?as=u1&label=Sam&hash=events" }, addEventListener() {}, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), body: { insertBefore() {}, firstChild: null } };
  vm.runInNewContext(code, { window: win, document: doc, location: Object.assign(loc, { hash: "" }), history: { replaceState() {} }, URL, URLSearchParams, Request });
  for (const u of ["/api/me/overview", "/api/me/events/s1?x=1", "/api/contests/oak/manage", "/api/auth/me", "/api/drafts"]) await win.fetch(u);
  assert.deepEqual(calls, ["/api/admin/as/me/overview?as=u1", "/api/admin/as/me/events/s1?x=1&as=u1", "/api/admin/as/contests/oak/manage?as=u1", "/api/admin/as/auth/me?as=u1", "/api/admin/as/drafts?as=u1"]);
  calls.length = 0; for (const u of ["/api/events", "/api/photo/p/abc/1.jpg", "/api/admin/users", "/api/auth/logout", "/api/config", "https://example.com/api/me/overview", "/img/x.png"]) await win.fetch(u);
  assert.deepEqual(calls, ["/api/events", "/api/photo/p/abc/1.jpg", "/api/admin/users", "/api/auth/logout", "/api/config", "https://example.com/api/me/overview", "/img/x.png"], "public calls, other sites and sign-out are left alone");
  const admin = fs.readFileSync(new URL("../public/admin/admin.js", import.meta.url), "utf8");
  assert.match(admin, /Open their profile as them/); assert.match(admin, /Edit as owner/); assert.match(admin, /manage as owner/); assert.match(admin, /Organizer dashboard \(as the organizer\)/);
});

import { readFileSync as readRoutes } from "node:fs";
test("/admin/as is a Pages Function route (without it in _routes.json the site answers 'Page not found')", () => {
  const routes = JSON.parse(readRoutes("public/_routes.json", "utf8"));
  assert.ok(routes.include.includes("/admin/as"));
  assert.ok(readRoutes("functions/admin/as.js", "utf8").includes("onRequestGet"));
});
