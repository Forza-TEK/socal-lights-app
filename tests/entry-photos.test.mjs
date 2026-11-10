// Homes an organizer added herself: the organizer adds and removes photos from the dashboard, and the homeowner opens a private link, signs in and LINKS the home to their account
// (their email is then on the entry). A linked homeowner can edit the home, add and delete their own photos and HIDE the organizer's photos, but cannot delete the home or the
// organizer's photos. Covers who may do what, the 8-photo limit, JPG/PNG/WebP only, closing, unlinking, new links, throttling, account deletion and what never leaks.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as photosPost, onRequestDelete as photosDelete } from "../functions/api/contests/[slug]/entries/[id]/photos.js";
import { onRequestPost as entryAction } from "../functions/api/contests/[slug]/entries/[id].js";
import { onRequestPost as entriesPost } from "../functions/api/contests/[slug]/entries/index.js";
import { onRequestGet as manageGet } from "../functions/api/contests/[slug]/manage.js";
import { onRequestGet as contestGet } from "../functions/api/contests/[slug].js";
import { onRequestPatch as minePatch, onRequestDelete as mineDelete } from "../functions/api/contests/[slug]/mine.js";
import { onRequestPost as votePost } from "../functions/api/contests/[slug]/vote.js";
import { onRequestGet as hpGet, onRequestPost as hpPost, onRequestDelete as hpDelete } from "../functions/api/home-photos/[token].js";
import { onRequestGet as photoServe } from "../functions/api/photo/[[path]].js";
import { onRequestGet as pageGet } from "../functions/photos/[token].js";
import { deleteAccount } from "../functions/_lib/account.js";
import { newEnv, addUser, stubFetch, ptToday } from "./_pay.mjs";

const SLUG = "light-up", origin = "https://socallights.app", TOKEN = "T".repeat(10) + "t".repeat(14), TOKEN2 = "U".repeat(24);
const memR2 = () => { const m = new Map(); return { m, put: async (k, b) => { m.set(k, b instanceof ArrayBuffer || ArrayBuffer.isView(b) ? b : b); }, get: async (k) => (m.has(k) ? { body: m.get(k), httpEtag: "e", httpMetadata: {}, writeHttpMetadata: () => {} } : null), delete: async (k) => { for (const x of [].concat(k)) m.delete(x); } }; };
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]), PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const file = (bytes, name = "a.jpg", type = "image/jpeg") => new File([bytes], name, { type });
const form = (...files) => { const f = new FormData(); files.forEach((x) => f.append("photos", x)); return f; };
const json = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });

async function setup(o = {}) {
  const { env, raw } = newEnv(); env.PHOTOS = memR2();
  const owner = await addUser(raw, "uO", "owner@city.gov"), staff = await addUser(raw, "uS", "staff@city.gov"), other = await addUser(raw, "uX", "other@x.com"), resident = await addUser(raw, "uR", "resident@x.com");
  const home = await addUser(raw, "uH", "homeowner@x.com"), home2 = await addUser(raw, "uH2", "neighbor@x.com");
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval,one_win,announced) VALUES ('c1',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(SLUG, "uO", "Light Up the Town", "City of Covina", "Pasadena", "Los Angeles", "christmas", o.status || "live", ptToday(-5), ptToday(o.voteStart ?? 8), ptToday(o.voteEnd ?? 20), JSON.stringify(["Best Overall"]), "public", "pick", "owner@city.gov", "A contest.", "manual", 0, o.announced ? 1 : 0);
  raw.prepare("INSERT INTO contest_staff (contest_id,email) VALUES ('c1','staff@city.gov')").run();
  const ins = raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,contest_id,user_id,entry_no,approved_at,photo_token) VALUES (?,?,?,?,'Pasadena',34.1,-118,'Entry in light-up','[]','','christmas',?,?,'91722','c1',?,?,datetime('now'),?)");
  ins.run("paaaaaaaa", "approved", "Home at 10 Elm Ave", "Home at 10 Elm Ave", "10 Elm Ave, Pasadena, CA", "10 Elm Ave", "", 1, TOKEN);
  ins.run("pbbbbbbbb", "approved", "Home at 12 Elm Ave", "Home at 12 Elm Ave", "12 Elm Ave, Pasadena, CA", "12 Elm Ave", "", 2, TOKEN2);
  ins.run("prrrrrrrr", "approved", "Rita", "Rita Lights", "5 Oak St, Pasadena, CA", "5 Oak St", "uR", 3, null);
  const org = (user, id, method, body, search = "") => (method === "DELETE" ? photosDelete : photosPost)({ params: { slug: SLUG, id }, request: new Request(`${origin}/api/contests/${SLUG}/entries/${id}/photos${search}`, { method, headers: { ...(user ? { cookie: user.cookie } : {}), ...(o.cross ? { origin: "https://evil.example" } : {}) }, body }), env });
  const act = (user, id, body) => entryAction({ params: { slug: SLUG, id }, request: new Request(`${origin}/api/contests/${SLUG}/entries/${id}`, { method: "POST", headers: { "content-type": "application/json", ...(user ? { cookie: user.cookie } : {}) }, body: JSON.stringify(body) }), env, waitUntil: () => {} }).then(json);
  // the homeowner's side: user = who is signed in (or null)
  const hp = (method, token, user, body, search = "", ip = "1.1.1.1", cross = false) => ({ GET: hpGet, POST: hpPost, DELETE: hpDelete }[method])({ params: { token }, request: new Request(`${origin}/api/home-photos/${token}${search}`, { method, headers: { "CF-Connecting-IP": ip, ...(user ? { cookie: user.cookie } : {}), ...(body && !(body instanceof FormData) ? { "content-type": "application/json" } : {}), ...(cross ? { origin: "https://evil.example" } : {}) }, body: body && !(body instanceof FormData) ? JSON.stringify(body) : body }), env });
  const claim = (user, token = TOKEN) => hp("POST", token, user, { action: "claim" }).then(json);
  return { env, raw, users: { owner, staff, other, resident, home, home2 }, org, act, hp, claim };
}
const col = (raw, id, c) => JSON.parse(raw.prepare(`SELECT ${c} AS v FROM posts WHERE id = ?`).get(id).v);

test("organizer: owner and co-organizer add photos to a home they added; others, signed-out and cross-site requests are refused", async () => {
  const t = await setup();
  assert.equal((await json(await t.org(null, "paaaaaaaa", "POST", form(file(JPG))))).status, 401);
  assert.equal((await json(await t.org(t.users.other, "paaaaaaaa", "POST", form(file(JPG))))).status, 404, "someone else's contest looks like it does not exist");
  assert.equal((await json(await t.org(t.users.resident, "paaaaaaaa", "POST", form(file(JPG))))).status, 404);
  const a = await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG), file(PNG, "b.png", "image/png"))));
  assert.equal(a.status, 200); assert.equal(a.body.photos.length, 2);
  assert.ok(a.body.photos.every((p) => /^\d+\.(jpg|png)$/.test(p.name) && p.city && !p.hidden && p.url === "/api/photo/p/paaaaaaaa/" + p.name));
  assert.ok(a.body.photos.every((p) => t.env.PHOTOS.m.has("p/paaaaaaaa/" + p.name)), "stored in R2");
  assert.equal(col(t.raw, "paaaaaaaa", "photos_org").length, 2, "marked as the organizer's photos");
  const s = await json(await t.org(t.users.staff, "paaaaaaaa", "POST", form(file(JPG))));
  assert.equal(s.status, 200); assert.equal(s.body.photos.length, 3, "a co-organizer may too");
  const x = await setup({ cross: true });
  assert.equal((await json(await x.org(x.users.owner, "paaaaaaaa", "POST", form(file(JPG))))).status, 403);
});

test("organizer: only homes the organizer added, only JPG/PNG/WebP, at most 8, under 6 MB; a refused upload leaves nothing behind", async () => {
  const t = await setup();
  assert.equal((await json(await t.org(t.users.owner, "prrrrrrrr", "POST", form(file(JPG))))).status, 400, "a resident's own entry is not changed here");
  const bad = await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(new TextEncoder().encode("<svg onload=alert(1)>"), "x.jpg", "image/jpeg"))));
  assert.equal(bad.status, 400); assert.match(bad.body.error, /JPG, PNG or WebP/, "checked by content, not by the file name");
  const big = new Uint8Array(6 * 1024 * 1024 + 1); big.set(JPG);
  assert.equal((await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG), file(big))))).status, 400);
  assert.equal(t.env.PHOTOS.m.size, 0, "the good photo of a refused batch is not kept");
  for (let i = 0; i < 4; i++) assert.equal((await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG), file(JPG))))).status, 200);
  const over = await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG))));
  assert.equal(over.status, 400); assert.match(over.body.error, /8 photos/);
});

test("organizer: remove any photo of that home, including one the homeowner hid or added; not another home's", async () => {
  const t = await setup();
  const a = (await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG), file(JPG))))).body.photos;
  const bk = { name: "5.jpg" }; // a photo that exists only on the neighbor's home
  t.raw.prepare("UPDATE posts SET photos = ?, photos_org = ? WHERE id = 'pbbbbbbbb'").run(JSON.stringify(["p/pbbbbbbbb/5.jpg"]), JSON.stringify(["5.jpg"])); t.env.PHOTOS.m.set("p/pbbbbbbbb/5.jpg", JPG);
  assert.equal((await json(await t.org(t.users.owner, "paaaaaaaa", "DELETE", null, "?name=" + bk.name))).status, 404, "another home's photo");
  assert.equal((await json(await t.org(t.users.owner, "paaaaaaaa", "DELETE", null, "?name=../x.jpg"))).status, 404);
  const d = await json(await t.org(t.users.owner, "paaaaaaaa", "DELETE", null, "?name=" + a[0].name));
  assert.equal(d.status, 200); assert.deepEqual(d.body.photos.map((p) => p.name), [a[1].name]);
  assert.ok(!t.env.PHOTOS.m.has("p/paaaaaaaa/" + a[0].name) && t.env.PHOTOS.m.has("p/pbbbbbbbb/" + bk.name));
});

test("closing: photos change before voting and while voting is open; they stop after the vote end date, after winners are announced, or when the contest is not live", async () => {
  const day = async (o) => { const t = await setup(o); return { t, r: await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG)))) }; };
  for (const [name, o] of [["before voting", { voteStart: 8 }], ["voting open", { voteStart: -2, voteEnd: 5 }], ["last day of voting", { voteStart: -9, voteEnd: 0 }]]) assert.equal((await day(o)).r.status, 200, name);
  for (const [name, o] of [["voting over", { voteStart: -9, voteEnd: -1 }], ["announced", { announced: true }], ["not live", { status: "closed" }]]) assert.equal((await day(o)).r.status, 409, name);
});

test("homeowner link: the page shows the home and asks to sign in; nothing about the organizer or other homes leaks; the page itself is private", async () => {
  const t = await setup();
  const g = await json(await t.hp("GET", TOKEN, null));
  assert.equal(g.status, 200); assert.deepEqual([g.body.state, g.body.signedIn, g.body.canLink], ["unclaimed", false, true]);
  assert.deepEqual([g.body.home.title, g.body.contest.name], ["Home at 10 Elm Ave", "Light Up the Town"]);
  assert.ok(!g.body.photos && !g.body.details, "no details or photos before the home is linked");
  assert.ok(!/owner@city\.gov|uO|pbbbbbbbb/.test(JSON.stringify(g.body)));
  for (const tok of ["short", "x".repeat(24), "../../etc/passwd", "a".repeat(80)]) assert.equal((await json(await t.hp("GET", tok, null))).status, 404, tok);
  const res = await pageGet({ request: new Request(`${origin}/photos/${TOKEN}`), env: { ASSETS: { fetch: async () => new Response("<html>page</html>", { headers: { "content-type": "text/html" } }) } } });
  assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow"); assert.equal(res.headers.get("cache-control"), "no-store"); assert.equal(res.headers.get("referrer-policy"), "no-referrer");
});

test("linking: needs a sign-in; the first account keeps the home with its email on the entry; another account is refused; the same account may repeat", async () => {
  const t = await setup();
  assert.equal((await t.claim(null)).status, 401);
  assert.equal((await json(await t.hp("POST", TOKEN, t.users.home, { action: "claim" }, "", "1.1.1.1", true))).status, 403, "cross-site");
  const c = await t.claim(t.users.home);
  assert.equal(c.status, 200); assert.equal(c.body.state, "mine"); assert.equal(c.body.email, "homeowner@x.com");
  const row = t.raw.prepare("SELECT user_id, contact_email, claimed_at FROM posts WHERE id = 'paaaaaaaa'").get();
  assert.deepEqual([row.user_id, row.contact_email], ["uH", "homeowner@x.com"]); assert.ok(row.claimed_at);
  const again = await t.claim(t.users.home); assert.equal(again.status, 200);
  const late = await t.claim(t.users.home2); assert.equal(late.status, 409); assert.match(late.body.error, /already linked/);
  assert.equal((await json(await t.hp("GET", TOKEN, t.users.home2))).body.state, "other");
  assert.equal((await json(await t.hp("GET", TOKEN, null))).body.state, "other", "signed-out visitors see only that it is linked");
  assert.equal(t.raw.prepare("SELECT user_id FROM posts WHERE id = 'pbbbbbbbb'").get().user_id, "", "the neighbor's home is untouched");
});

test("linking: possible until winners are announced; editing closes with voting", async () => {
  const over = await setup({ voteStart: -9, voteEnd: -1 });
  assert.equal((await over.claim(over.users.home)).status, 200, "voting is over but winners are not announced: still linkable");
  assert.equal((await json(await over.hp("POST", TOKEN, over.users.home, { action: "edit", title: "Elm Ave Lights" }))).status, 409, "but nothing can be edited");
  assert.equal((await json(await over.hp("GET", TOKEN, over.users.home))).body.open, false);
  const done = await setup({ announced: true });
  const c = await done.claim(done.users.home); assert.equal(c.status, 409); assert.match(c.body.error, /announced/);
});

test("a linked homeowner can edit the details; a blank name is refused; every change is logged", async () => {
  const t = await setup(); await t.claim(t.users.home);
  const e = await json(await t.hp("POST", TOKEN, t.users.home, { action: "edit", title: "Elm Ave Lights", desc: "Twenty thousand bulbs and a snowman.", lights_on: "Every night 5 to 10 pm", visit: "walk", parking: "street", radio: "98.7", accessible: true, where: "Park on Oak St" }));
  assert.equal(e.status, 200);
  const row = t.raw.prepare("SELECT title, biz, descr, lights_on, visit, parking, radio, accessible, where_txt FROM posts WHERE id = 'paaaaaaaa'").get();
  assert.deepEqual([row.title, row.biz, row.lights_on, row.visit, row.parking, row.accessible], ["Elm Ave Lights", "Elm Ave Lights", "Every night 5 to 10 pm", "walk", "street", 1]);
  assert.equal(e.body.details.title, "Elm Ave Lights");
  assert.ok(t.raw.prepare("SELECT COUNT(*) AS n FROM listing_changes WHERE post_id = 'paaaaaaaa'").get().n > 0, "the change is in the log");
  assert.equal((await json(await t.hp("POST", TOKEN, t.users.home, { action: "edit", title: " " }))).status, 400);
  assert.equal((await json(await t.hp("POST", TOKEN, t.users.home2, { action: "edit", title: "Mine now" }))).status, 403, "only the person who linked it");
  assert.equal((await json(await t.hp("POST", TOKEN, null, { action: "edit", title: "Anon" }))).status, 401);
});

test("photos for a linked homeowner: add their own, delete their own, never delete the organizer's, hide and show the organizer's; hidden ones leave the public route", async () => {
  const t = await setup();
  const city = (await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG), file(PNG, "b.png", "image/png"))))).body.photos;
  await t.claim(t.users.home);
  const mine = await json(await t.hp("POST", TOKEN, t.users.home, form(file(JPG))));
  assert.equal(mine.status, 200); assert.equal(mine.body.photos.length, 3);
  const own = mine.body.photos.find((p) => !p.city); assert.ok(own && own.url.startsWith("/api/photo/p/paaaaaaaa/"));
  assert.equal((await json(await t.hp("POST", TOKEN, null, form(file(JPG))))).status, 401, "no sign-in, no upload");
  assert.equal((await json(await t.hp("POST", TOKEN, t.users.home2, form(file(JPG))))).status, 403);
  // city photos cannot be deleted by the homeowner
  const del = await json(await t.hp("DELETE", TOKEN, t.users.home, null, "?name=" + city[0].name));
  assert.equal(del.status, 403); assert.match(del.body.error, /hide/);
  assert.ok(t.env.PHOTOS.m.has("p/paaaaaaaa/" + city[0].name));
  // own photo can be deleted
  assert.equal((await json(await t.hp("DELETE", TOKEN, t.users.home, null, "?name=" + own.name))).status, 200);
  assert.ok(!t.env.PHOTOS.m.has("p/paaaaaaaa/" + own.name));
  // hide a city photo
  const hid = await json(await t.hp("POST", TOKEN, t.users.home, { action: "hide", name: city[0].name }));
  assert.equal(hid.status, 200);
  const hp = hid.body.photos.find((p) => p.name === city[0].name); assert.deepEqual([hp.hidden, hp.city, hp.url], [true, true, "/api/photo/h/paaaaaaaa/" + city[0].name]);
  assert.ok(!t.env.PHOTOS.m.has("p/paaaaaaaa/" + city[0].name) && t.env.PHOTOS.m.has("h/paaaaaaaa/" + city[0].name), "the file moved off the public path");
  assert.ok(!col(t.raw, "paaaaaaaa", "photos").some((k) => k.endsWith(city[0].name)), "public data no longer lists it");
  const getPhoto = (path, user) => photoServe({ params: { path: path.split("/") }, request: new Request(`${origin}/api/photo/${path}`, { headers: user ? { cookie: user.cookie } : {} }), env: t.env });
  assert.equal((await getPhoto("p/paaaaaaaa/" + city[0].name)).status, 404, "not public any more");
  assert.equal((await getPhoto("h/paaaaaaaa/" + city[0].name, null)).status, 404, "not for the public");
  assert.equal((await getPhoto("h/paaaaaaaa/" + city[0].name, t.users.other)).status, 404, "not for another signed-in person");
  assert.equal((await getPhoto("h/paaaaaaaa/" + city[0].name, t.users.home)).status, 200, "the homeowner can see it");
  assert.equal((await getPhoto("h/paaaaaaaa/" + city[0].name, t.users.staff)).status, 200, "and so can the organizers");
  assert.equal((await json(await t.hp("POST", TOKEN, t.users.home, { action: "hide", name: own.name }))).status, 404, "only the organizer's photos can be hidden");
  // a hidden photo can still not be deleted by the homeowner, but can be shown again
  assert.equal((await json(await t.hp("DELETE", TOKEN, t.users.home, null, "?name=" + city[0].name))).status, 403);
  const back = await json(await t.hp("POST", TOKEN, t.users.home, { action: "show", name: city[0].name }));
  assert.equal(back.status, 200); assert.equal(back.body.photos.find((p) => p.name === city[0].name).hidden, false);
  assert.ok(t.env.PHOTOS.m.has("p/paaaaaaaa/" + city[0].name) && !t.env.PHOTOS.m.has("h/paaaaaaaa/" + city[0].name));
  // the organizer's dashboard sees everything and can remove the homeowner's photos too
  await t.hp("POST", TOKEN, t.users.home, { action: "hide", name: city[1].name });
  const m = await json(await manageGet({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/manage`, { headers: { cookie: t.users.owner.cookie } }), env: t.env }));
  const e = m.body.entries.find((x) => x.id === "paaaaaaaa");
  assert.equal(e.claimed, true); assert.equal(e.contact, "homeowner@x.com"); assert.equal(e.photoList.find((p) => p.name === city[1].name).hidden, true);
});

test("photo limit counts hidden photos too, and the homeowner cannot go past 8", async () => {
  const t = await setup();
  const city = (await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(...Array.from({ length: 6 }, () => file(JPG)))))).body.photos;
  await t.claim(t.users.home);
  for (const p of city.slice(0, 3)) await t.hp("POST", TOKEN, t.users.home, { action: "hide", name: p.name });
  const r = await json(await t.hp("POST", TOKEN, t.users.home, form(file(JPG), file(JPG), file(JPG))));
  assert.equal(r.status, 400); assert.match(r.body.error, /room for 2 more/);
});

test("a linked home cannot be withdrawn by the homeowner, but it can be renamed from the contest page; the owner cannot vote for it", async () => {
  const t = await setup(); await t.claim(t.users.home);
  const del = await mineDelete({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/mine?id=paaaaaaaa`, { method: "DELETE", headers: { cookie: t.users.home.cookie } }), env: t.env });
  assert.equal(del.status, 403); assert.equal(t.raw.prepare("SELECT status FROM posts WHERE id = 'paaaaaaaa'").get().status, "approved");
  const ren = await minePatch({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/mine`, { method: "PATCH", headers: { cookie: t.users.home.cookie, "content-type": "application/json" }, body: JSON.stringify({ id: "paaaaaaaa", name: "Elm Ave Lights", desc: "Lots of lights" }) }), env: t.env });
  assert.equal(ren.status, 200);
  const view = await json(await contestGet({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}`, { headers: { cookie: t.users.home.cookie } }), env: t.env }));
  const mineEntry = view.body.entries.find((e) => e.id === "paaaaaaaa");
  assert.equal(mineEntry.mine, true); assert.equal(mineEntry.manage, "/photos/" + TOKEN, "the owner gets the link to manage the home");
  const other = await json(await contestGet({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}`, { headers: { cookie: t.users.other.cookie } }), env: t.env }));
  assert.ok(!JSON.stringify(other.body).includes(TOKEN), "nobody else sees the link");
  const anon = await json(await contestGet({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}`), env: t.env }));
  assert.ok(!JSON.stringify(anon.body).includes(TOKEN));
});

test("unlinking: the organizer lets go of a wrong homeowner and gets a new link; only organizers, only homes they added", async () => {
  const t = await setup(); await t.claim(t.users.home);
  assert.equal((await t.act(t.users.other, "paaaaaaaa", { action: "unclaim" })).status, 404);
  assert.equal((await t.act(t.users.owner, "prrrrrrrr", { action: "unclaim" })).status, 400, "not a resident's own entry");
  assert.equal((await t.act(t.users.owner, "pbbbbbbbb", { action: "unclaim" })).status, 400, "nobody has linked that one");
  const u = await t.act(t.users.staff, "paaaaaaaa", { action: "unclaim" });
  assert.equal(u.status, 200); assert.match(u.body.link, /^https:\/\/socallights\.app\/photos\/[A-Za-z0-9_-]{24,64}$/);
  const row = t.raw.prepare("SELECT user_id, contact_email, claimed_at, photo_token FROM posts WHERE id = 'paaaaaaaa'").get();
  assert.deepEqual([row.user_id, row.contact_email, row.claimed_at], ["", "", null]); assert.notEqual(row.photo_token, TOKEN);
  assert.equal((await json(await t.hp("GET", TOKEN, t.users.home))).status, 404, "the old link is dead");
  assert.equal((await t.claim(t.users.home2, u.body.link.split("/").pop())).status, 200, "the right person can link with the new one");
});

test("new link: replaces the old one at once; only organizers can make one", async () => {
  const t = await setup();
  assert.equal((await t.act(t.users.other, "paaaaaaaa", { action: "newlink" })).status, 404);
  assert.equal((await t.act(t.users.owner, "prrrrrrrr", { action: "newlink" })).status, 400);
  const n = await t.act(t.users.staff, "paaaaaaaa", { action: "newlink" });
  assert.equal(n.status, 200); assert.notEqual(n.body.link.split("/").pop(), TOKEN);
  assert.equal((await json(await t.hp("GET", TOKEN, null))).status, 404);
  assert.equal((await json(await t.hp("GET", n.body.link.split("/").pop(), null))).status, 200);
});

test("deleting a homeowner's account does not delete the home: it is unlinked, their own photos go, the organizer's stay (hidden ones stay hidden)", async () => {
  const t = await setup();
  const city = (await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG), file(JPG))))).body.photos;
  await t.claim(t.users.home);
  const own = (await json(await t.hp("POST", TOKEN, t.users.home, form(file(JPG))))).body.photos.find((p) => !p.city);
  await t.hp("POST", TOKEN, t.users.home, { action: "hide", name: city[1].name });
  await deleteAccount(t.env, "uH", "homeowner@x.com");
  const row = t.raw.prepare("SELECT status, user_id, contact_email, photos, photos_hidden FROM posts WHERE id = 'paaaaaaaa'").get();
  assert.deepEqual([row.status, row.user_id, row.contact_email], ["approved", "", ""], "the home stays on the ballot, unlinked");
  assert.deepEqual(JSON.parse(row.photos), ["p/paaaaaaaa/" + city[0].name]); assert.deepEqual(JSON.parse(row.photos_hidden), [city[1].name]);
  assert.ok(!t.env.PHOTOS.m.has("p/paaaaaaaa/" + own.name), "their own photo is deleted");
  assert.ok(t.env.PHOTOS.m.has("p/paaaaaaaa/" + city[0].name) && t.env.PHOTOS.m.has("h/paaaaaaaa/" + city[1].name));
  assert.equal((await json(await t.hp("GET", TOKEN, t.users.home2))).body.state, "unclaimed", "someone else can link it now");
});

test("a linked homeowner cannot vote for their own home", async () => {
  const t = await setup({ voteStart: -1, voteEnd: 10 }); await t.claim(t.users.home);
  const r = await votePost({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/vote`, { method: "POST", headers: { cookie: t.users.home.cookie, "content-type": "application/json" }, body: JSON.stringify({ post_id: "paaaaaaaa", category: "Best Overall" }) }), env: t.env, waitUntil: () => {} });
  assert.equal(r.status, 400); assert.match((await r.json()).error, /own home/);
  const ok = await votePost({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/vote`, { method: "POST", headers: { cookie: t.users.home.cookie, "content-type": "application/json" }, body: JSON.stringify({ post_id: "pbbbbbbbb", category: "Best Overall" }) }), env: t.env, waitUntil: () => {} });
  assert.equal(ok.status, 200, "the neighbor's home is fine");
});

test("throttled per link and per connection, so it cannot flood storage", async () => {
  const t = await setup(); await t.claim(t.users.home);
  let last = 0;
  for (let i = 0; i < 61; i++) last = (await t.hp("DELETE", TOKEN, t.users.home, null, "?name=1.jpg", "9.9." + (i % 250) + ".1")).status;
  assert.equal(last, 429, "past 60 changes a day through one link");
  const u = await setup(); await u.claim(u.users.home); await u.claim(u.users.home2, TOKEN2);
  let ipLast = 0; for (let i = 0; i < 81; i++) ipLast = (await u.hp("DELETE", i % 2 ? TOKEN : TOKEN2, i % 2 ? u.users.home : u.users.home2, null, "?name=1.jpg", "8.8.8.8")).status;
  assert.equal(ipLast, 429, "and 80 a day from one connection");
});

test("dashboard data: the organizer sees each added home's link, who linked it, and whether photos are open; the public contest data never carries a token", async () => {
  const t = await setup();
  const m = await json(await manageGet({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/manage`, { headers: { cookie: t.users.owner.cookie } }), env: t.env }));
  assert.equal(m.status, 200); assert.equal(m.body.photosOpen, true);
  const by = Object.fromEntries(m.body.entries.map((e) => [e.id, e]));
  assert.equal(by.paaaaaaaa.photoLink, `${origin}/photos/${TOKEN}`); assert.equal(by.paaaaaaaa.byOrganizer, true); assert.equal(by.paaaaaaaa.claimed, false);
  assert.equal(by.prrrrrrrr.photoLink, "", "no link for a resident's entry"); assert.equal(by.prrrrrrrr.byOrganizer, false);
  assert.ok(!("photo_token" in by.paaaaaaaa));
  await t.claim(t.users.home);
  const m2 = await json(await manageGet({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/manage`, { headers: { cookie: t.users.owner.cookie } }), env: t.env }));
  const e = m2.body.entries.find((x) => x.id === "paaaaaaaa"); assert.deepEqual([e.byOrganizer, e.claimed, e.contact], [true, true, "homeowner@x.com"], "still marked as added by the organizer once linked");
});

test("adding homes gives each a photo link", async () => {
  const t = await setup();
  const stub = stubFetch((url) => {
    const u = String(url), a = decodeURIComponent((u.match(/address=([^&]*)/) || u.match(/[?&]q=([^&]*)/) || [])[1] || "");
    if (u.includes("census.gov")) return new Response(JSON.stringify({ result: { addressMatches: [{ matchedAddress: a.toUpperCase(), coordinates: { y: 34.1, x: -118.0 }, addressComponents: { zip: "91722" } }] } }), { headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify([{ lat: "34.1", lon: "-118.0", display_name: a }]), { headers: { "content-type": "application/json" } });
  });
  try {
    const r = await json(await entriesPost({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/entries`, { method: "POST", headers: { "content-type": "application/json", cookie: t.users.owner.cookie }, body: JSON.stringify({ confirm: true, homes: [{ address: "20 Maple Dr, Pasadena" }] }) }), env: t.env, waitUntil: () => {} }));
    assert.equal(r.status, 200); assert.equal(r.body.added.length, 1);
    assert.match(t.raw.prepare("SELECT photo_token FROM posts WHERE id = ?").get(r.body.added[0].id).photo_token, /^[A-Za-z0-9_-]{24,64}$/);
  } finally { stub.restore(); }
});
