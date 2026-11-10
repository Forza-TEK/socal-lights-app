// Photos for homes an organizer added herself: the organizer adds or removes them from the dashboard, and the homeowner can do the same through a private link
// (no sign-in) until voting closes. Covers who may do what, the 8-photo limit, JPG/PNG/WebP only, the closing rule, new links, throttling and what never leaks.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as photosPost, onRequestDelete as photosDelete } from "../functions/api/contests/[slug]/entries/[id]/photos.js";
import { onRequestPost as entryAction } from "../functions/api/contests/[slug]/entries/[id].js";
import { onRequestPost as entriesPost } from "../functions/api/contests/[slug]/entries/index.js";
import { onRequestGet as manageGet } from "../functions/api/contests/[slug]/manage.js";
import { onRequestGet as contestGet } from "../functions/api/contests/[slug].js";
import { onRequestGet as hpGet, onRequestPost as hpPost, onRequestDelete as hpDelete } from "../functions/api/home-photos/[token].js";
import { onRequestGet as photoServe } from "../functions/api/photo/[[path]].js";
import { onRequestGet as pageGet } from "../functions/photos/[token].js";
import { newEnv, addUser, stubFetch, ptToday } from "./_pay.mjs";

const SLUG = "light-up", origin = "https://socallights.app", TOKEN = "T".repeat(10) + "t".repeat(14);
const memR2 = () => { const m = new Map(); return { m, put: async (k, b) => { m.set(k, b); }, get: async (k) => (m.has(k) ? { body: m.get(k), httpEtag: "e", writeHttpMetadata: () => {} } : null), delete: async (k) => { for (const x of [].concat(k)) m.delete(x); } }; };
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]), PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const file = (bytes, name = "a.jpg", type = "image/jpeg") => new File([bytes], name, { type });
const form = (...files) => { const f = new FormData(); files.forEach((x) => f.append("photos", x)); return f; };
const json = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });

async function setup(o = {}) {
  const { env, raw } = newEnv(); env.PHOTOS = memR2();
  const owner = await addUser(raw, "uO", "owner@city.gov"), staff = await addUser(raw, "uS", "staff@city.gov"), other = await addUser(raw, "uX", "other@x.com"), resident = await addUser(raw, "uR", "resident@x.com");
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval,one_win,announced) VALUES ('c1',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(SLUG, "uO", "Light Up the Town", "City of Covina", "Pasadena", "Los Angeles", "christmas", o.status || "live", ptToday(-5), ptToday(o.voteStart ?? 8), ptToday(o.voteEnd ?? 20), JSON.stringify(["Best Overall"]), "public", "pick", "owner@city.gov", "A contest.", "manual", 0, o.announced ? 1 : 0);
  raw.prepare("INSERT INTO contest_staff (contest_id,email) VALUES ('c1','staff@city.gov')").run();
  const ins = raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,contest_id,user_id,entry_no,approved_at,photo_token) VALUES (?,?,?,?,'Pasadena',34.1,-118,'d','[]','','christmas',?,?,'91722','c1',?,?,datetime('now'),?)");
  ins.run("paaaaaaaa", "approved", "Home at 10 Elm Ave", "Home at 10 Elm Ave", "10 Elm Ave, Pasadena, CA", "10 Elm Ave", "", 1, TOKEN);
  ins.run("pbbbbbbbb", "approved", "Home at 12 Elm Ave", "Home at 12 Elm Ave", "12 Elm Ave, Pasadena, CA", "12 Elm Ave", "", 2, "U".repeat(24));
  ins.run("prrrrrrrr", "approved", "Rita", "Rita Lights", "5 Oak St, Pasadena, CA", "5 Oak St", "uR", 3, null);
  const org = (user, id, method, body, search = "") => (method === "DELETE" ? photosDelete : photosPost)({ params: { slug: SLUG, id }, request: new Request(`${origin}/api/contests/${SLUG}/entries/${id}/photos${search}`, { method, headers: { ...(user ? { cookie: user.cookie } : {}), ...(o.cross ? { origin: "https://evil.example" } : {}) }, body }), env });
  const hp = (method, token, body, search = "", ip = "1.1.1.1") => ({ GET: hpGet, POST: hpPost, DELETE: hpDelete }[method])({ params: { token }, request: new Request(`${origin}/api/home-photos/${token}${search}`, { method, headers: { "CF-Connecting-IP": ip }, body }), env });
  return { env, raw, users: { owner, staff, other, resident }, org, hp };
}
const photosOf = (raw, id) => JSON.parse(raw.prepare("SELECT photos FROM posts WHERE id = ?").get(id).photos);

test("organizer: owner and co-organizer add photos to a home they added; others, signed-out and cross-site requests are refused", async () => {
  const t = await setup();
  assert.equal((await json(await t.org(null, "paaaaaaaa", "POST", form(file(JPG))))).status, 401);
  assert.equal((await json(await t.org(t.users.other, "paaaaaaaa", "POST", form(file(JPG))))).status, 404, "someone else's contest looks like it does not exist");
  assert.equal((await json(await t.org(t.users.resident, "paaaaaaaa", "POST", form(file(JPG))))).status, 404);
  const a = await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG), file(PNG, "b.png", "image/png"))));
  assert.equal(a.status, 200); assert.equal(a.body.photos.length, 2);
  assert.ok(a.body.photos.every((k) => /^p\/paaaaaaaa\/\d+\.(jpg|png)$/.test(k)) && a.body.photos[0] !== a.body.photos[1]);
  assert.ok(a.body.photos.every((k) => t.env.PHOTOS.m.has(k)), "stored in R2");
  const s = await json(await t.org(t.users.staff, "paaaaaaaa", "POST", form(file(JPG))));
  assert.equal(s.status, 200); assert.equal(s.body.photos.length, 3, "a co-organizer may too");
  const x = await setup({ cross: true });
  assert.equal((await json(await x.org(x.users.owner, "paaaaaaaa", "POST", form(file(JPG))))).status, 403);
});

test("organizer: only homes the organizer added, only JPG/PNG/WebP, at most 8, under 6 MB; a refused upload leaves nothing behind", async () => {
  const t = await setup();
  const r = await json(await t.org(t.users.owner, "prrrrrrrr", "POST", form(file(JPG))));
  assert.equal(r.status, 400, "a resident's own entry is not changed here");
  const bad = await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(new TextEncoder().encode("<svg onload=alert(1)>"), "x.jpg", "image/jpeg"))));
  assert.equal(bad.status, 400); assert.match(bad.body.error, /JPG, PNG or WebP/, "checked by content, not by the file name");
  const big = new Uint8Array(6 * 1024 * 1024 + 1); big.set(JPG);
  assert.equal((await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG), file(big))))).status, 400);
  assert.equal(t.env.PHOTOS.m.size, 0, "the good photo of a refused batch is not kept");
  assert.equal(photosOf(t.raw, "paaaaaaaa").length, 0);
  for (let i = 0; i < 4; i++) assert.equal((await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG), file(JPG))))).status, 200);
  assert.equal(photosOf(t.raw, "paaaaaaaa").length, 8);
  const over = await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG))));
  assert.equal(over.status, 400); assert.match(over.body.error, /8 photos/);
});

test("organizer: remove a photo; it must be a photo of that home", async () => {
  const t = await setup();
  const a = await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG), file(JPG))));
  const [k1, k2] = a.body.photos;
  const bk = (await json(await t.org(t.users.owner, "pbbbbbbbb", "POST", form(file(JPG))))).body.photos[0];
  assert.equal((await json(await t.org(t.users.owner, "paaaaaaaa", "DELETE", null, "?key=" + encodeURIComponent(bk)))).status, 404, "another home's photo");
  assert.equal((await json(await t.org(t.users.owner, "paaaaaaaa", "DELETE", null, "?key=" + encodeURIComponent("p/paaaaaaaa/../x.jpg")))).status, 404);
  const d = await json(await t.org(t.users.owner, "paaaaaaaa", "DELETE", null, "?key=" + encodeURIComponent(k1)));
  assert.equal(d.status, 200); assert.deepEqual(d.body.photos, [k2]);
  assert.ok(!t.env.PHOTOS.m.has(k1) && t.env.PHOTOS.m.has(k2) && t.env.PHOTOS.m.has(bk));
});

test("closing: open before voting and while voting is open; closed after the vote end date, after winners are announced, or when the contest is not live", async () => {
  const day = (o) => setup(o).then(async (t) => ({ t, r: await json(await t.org(t.users.owner, "paaaaaaaa", "POST", form(file(JPG)))), h: await json(await t.hp("POST", TOKEN, form(file(JPG)))) }));
  for (const [name, o] of [["before voting", { voteStart: 8 }], ["voting open", { voteStart: -2, voteEnd: 5 }], ["last day of voting", { voteStart: -9, voteEnd: 0 }]]) {
    const x = await day(o); assert.equal(x.r.status, 200, name + ": organizer"); assert.equal(x.h.status, 200, name + ": homeowner");
  }
  for (const [name, o] of [["voting over", { voteStart: -9, voteEnd: -1 }], ["announced", { announced: true }], ["not live", { status: "closed" }]]) {
    const x = await day(o); assert.equal(x.r.status, 409, name + ": organizer"); assert.equal(x.h.status, 409, name + ": homeowner");
    const g = await json(await x.t.hp("GET", TOKEN)); assert.equal(g.status, 200); assert.equal(g.body.open, false, "the page can still say it is closed");
  }
});

test("homeowner link: no sign-in; shows the home and its photos; adds and removes photos of that home only", async () => {
  const t = await setup();
  const g = await json(await t.hp("GET", TOKEN));
  assert.equal(g.status, 200); assert.equal(g.body.open, true); assert.equal(g.body.max, 8);
  assert.deepEqual([g.body.home.title, g.body.contest.name], ["Home at 10 Elm Ave", "Light Up the Town"]);
  assert.ok(!JSON.stringify(g.body).includes("owner@city.gov") && !JSON.stringify(g.body).includes("uO"), "no organizer details");
  const p = await json(await t.hp("POST", TOKEN, form(file(JPG), file(PNG, "b.png", "image/png"))));
  assert.equal(p.status, 200); assert.equal(p.body.photos.length, 2);
  assert.ok(p.body.photos.every((x) => x.url.startsWith("/api/photo/p/paaaaaaaa/")));
  assert.equal(photosOf(t.raw, "pbbbbbbbb").length, 0, "the neighbor's home is untouched");
  const pub = await photoServe({ params: { path: p.body.photos[0].key.split("/") }, env: t.env });
  assert.equal(pub.status, 200, "the photo is public at once, like any approved entry's");
  const other = (await json(await t.hp("POST", "U".repeat(24), form(file(JPG))))).body.photos[0];
  assert.equal((await json(await t.hp("DELETE", TOKEN, null, "?key=" + encodeURIComponent(other.key)))).status, 404, "cannot remove another home's photo");
  const d = await json(await t.hp("DELETE", TOKEN, null, "?key=" + encodeURIComponent(p.body.photos[0].key)));
  assert.equal(d.status, 200); assert.equal(d.body.photos.length, 1);
  const more = await json(await t.hp("POST", TOKEN, form(...Array.from({ length: 8 }, () => file(JPG)))));
  assert.equal(more.status, 400); assert.match(more.body.error, /room for 7 more/);
});

test("homeowner link: unknown, malformed, declined and resident-entry tokens are not active; the page itself is private", async () => {
  const t = await setup();
  for (const tok of ["short", "x".repeat(24), "../../etc/passwd", "a".repeat(80)]) assert.equal((await json(await t.hp("GET", tok))).status, 404, tok);
  t.raw.prepare("UPDATE posts SET photo_token = ? WHERE id = 'prrrrrrrr'").run("R".repeat(24));
  assert.equal((await json(await t.hp("GET", "R".repeat(24)))).status, 404, "a resident's own entry has no link");
  t.raw.prepare("UPDATE posts SET status = 'declined' WHERE id = 'paaaaaaaa'").run();
  assert.equal((await json(await t.hp("GET", TOKEN))).status, 404, "a removed home's link stops working");
  const res = await pageGet({ request: new Request(`${origin}/photos/${TOKEN}`), env: { ASSETS: { fetch: async () => new Response("<html>page</html>", { headers: { "content-type": "text/html" } }) } } });
  assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow"); assert.equal(res.headers.get("cache-control"), "no-store"); assert.equal(res.headers.get("referrer-policy"), "no-referrer");
});

test("homeowner link: a new link replaces the old one at once; only organizers can make one, and only for homes they added", async () => {
  const t = await setup();
  const act = (user, id, body) => entryAction({ params: { slug: SLUG, id }, request: new Request(`${origin}/api/contests/${SLUG}/entries/${id}`, { method: "POST", headers: { "content-type": "application/json", ...(user ? { cookie: user.cookie } : {}) }, body: JSON.stringify(body) }), env: t.env, waitUntil: () => {} }).then(json);
  assert.equal((await act(t.users.other, "paaaaaaaa", { action: "newlink" })).status, 404);
  assert.equal((await act(t.users.owner, "prrrrrrrr", { action: "newlink" })).status, 400, "not for a resident's entry");
  const n = await act(t.users.staff, "paaaaaaaa", { action: "newlink" });
  assert.equal(n.status, 200); assert.match(n.body.link, /^https:\/\/socallights\.app\/photos\/[A-Za-z0-9_-]{24,64}$/);
  assert.notEqual(n.body.link.split("/").pop(), TOKEN);
  assert.equal((await json(await t.hp("GET", TOKEN))).status, 404, "the old link no longer works");
  assert.equal((await json(await t.hp("GET", n.body.link.split("/").pop()))).status, 200);
});

test("homeowner link: throttled per link and per connection, so it cannot be used to flood storage", async () => {
  const t = await setup();
  let last = 0;
  for (let i = 0; i < 41; i++) { last = (await t.hp("DELETE", TOKEN, null, "?key=" + encodeURIComponent("p/paaaaaaaa/1.jpg"), "9.9." + (i % 250) + ".1")).status; }
  assert.equal(last, 429, "the 41st change in a day through one link is refused");
  const u = await setup();
  let ipLast = 0; for (let i = 0; i < 81; i++) ipLast = (await u.hp("DELETE", i % 2 ? TOKEN : "U".repeat(24), null, "?key=" + encodeURIComponent("p/paaaaaaaa/1.jpg"), "8.8.8.8")).status;
  assert.equal(ipLast, 429, "and 80 a day from one connection");
});

test("dashboard data: the organizer sees each added home's link and whether photos are open; the public contest data never carries a token", async () => {
  const t = await setup();
  const m = await json(await manageGet({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/manage`, { headers: { cookie: t.users.owner.cookie } }), env: t.env }));
  assert.equal(m.status, 200); assert.equal(m.body.photosOpen, true);
  const by = Object.fromEntries(m.body.entries.map((e) => [e.id, e]));
  assert.equal(by.paaaaaaaa.photoLink, `${origin}/photos/${TOKEN}`);
  assert.equal(by.prrrrrrrr.photoLink, "", "no link for a resident's entry");
  assert.ok(!("photo_token" in by.paaaaaaaa));
  const pub = await contestGet({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}`, { headers: { cookie: t.users.voter?.cookie || "" } }), env: t.env });
  assert.ok(!(await pub.text()).includes(TOKEN), "the contest page's data does not contain the link");
});

test("adding homes gives each a photo link", async () => {
  const t = await setup(); const calls = [];
  const stub = stubFetch((url) => {
    const u = String(url), a = decodeURIComponent((u.match(/address=([^&]*)/) || u.match(/[?&]q=([^&]*)/) || [])[1] || "");
    if (u.includes("census.gov")) return new Response(JSON.stringify({ result: { addressMatches: [{ matchedAddress: a.toUpperCase(), coordinates: { y: 34.1, x: -118.0 }, addressComponents: { zip: "91722" } }] } }), { headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify([{ lat: "34.1", lon: "-118.0", display_name: a }]), { headers: { "content-type": "application/json" } });
  });
  try {
    const r = await json(await entriesPost({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/entries`, { method: "POST", headers: { "content-type": "application/json", cookie: t.users.owner.cookie }, body: JSON.stringify({ confirm: true, homes: [{ address: "20 Maple Dr, Pasadena" }] }) }), env: t.env, waitUntil: () => {} }));
    assert.equal(r.status, 200); assert.equal(r.body.added.length, 1);
    const row = t.raw.prepare("SELECT photo_token FROM posts WHERE id = ?").get(r.body.added[0].id);
    assert.match(row.photo_token, /^[A-Za-z0-9_-]{24,64}$/);
  } finally { stub.restore(); }
});
