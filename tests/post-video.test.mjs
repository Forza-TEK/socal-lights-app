// One video on a home or a contest entry: a YouTube or Vimeo link (public at once) or an uploaded clip (public only after Admin approves it).
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPut as putVideo, onRequestPost as postVideo } from "../functions/api/me/video/[id].js";
import { onRequestGet as getPhoto } from "../functions/api/photo/[[path]].js";
import { sniffVideo, publicVideo, MAX_VIDEO_BYTES } from "../functions/_lib/postvideo.js";
import { rowToPost } from "../functions/_lib/util.js";
import { newEnv, addUser } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const MP4 = (n = 64) => { const b = new Uint8Array(n); b.set([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]); for (let i = 12; i < n; i++) b[i] = i % 251; return b; };
const MOV = () => { const b = MP4(); b.set([0x71, 0x74, 0x20, 0x20], 8); return b; };
const WEBM = () => { const b = new Uint8Array(40); b.set([0x1a, 0x45, 0xdf, 0xa3]); return b; };
const r2 = () => { const store = new Map(); return { store, put: async (k, v, o) => { store.set(k, { buf: new Uint8Array(v), httpMetadata: o && o.httpMetadata }); }, delete: async (k) => { store.delete(k); },
  get: async (k, opt) => { const o = store.get(k); if (!o) return null; let buf = o.buf, range;
    const hdr = opt && opt.range && opt.range.get && opt.range.get("range"); if (hdr) { const m = /bytes=(\d+)-(\d*)/.exec(hdr), a = +m[1], z = m[2] ? +m[2] : buf.length - 1; buf = buf.slice(a, z + 1); range = { offset: a, length: z - a + 1 }; }
    return { body: buf, size: o.buf.length, range, httpEtag: '"x"', writeHttpMetadata: (h) => { if (o.httpMetadata) h.set("content-type", o.httpMetadata.contentType); } }; } }; };
const mk = () => newEnv({ PHOTOS: r2(), DEV_AUTH: "" });
const addPost = (raw, id, user, extra = {}) => { raw.prepare("INSERT INTO posts (id,status,biz,title,city,county,lat,lng,descr,contact_email,user_id,photos,contest_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(id, extra.status || "approved", "Lee", "Maple St", "Pasadena", "Los Angeles", 34.1, -118.1, "Lights", user.email || "o@example.com", user.id, "[]", extra.contest || null); };
const put = (env, id, bytes, cookie, headers = {}) => putVideo({ params: { id }, request: new Request(`${ORIGIN}/api/me/video/${id}`, { method: "PUT", headers: { cookie, "content-type": "video/mp4", ...headers }, body: bytes }), env });
const act = (env, id, body, cookie) => postVideo({ params: { id }, request: new Request(`${ORIGIN}/api/me/video/${id}`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body) }), env });
const photo = (env, key, cookie = "", range = "") => getPhoto({ params: { path: key.split("/") }, env, request: new Request(`${ORIGIN}/api/photo/${key}`, { headers: { ...(cookie ? { cookie } : {}), ...(range ? { range } : {}) } }) });
const row = (raw, id) => raw.prepare("SELECT * FROM posts WHERE id = ?").get(id);

test("sniffVideo: MP4, MOV and WebM by their first bytes; pictures and other files are refused", () => {
  assert.equal(sniffVideo(MP4().buffer).ext, "mp4"); assert.equal(sniffVideo(MOV().buffer).ext, "mov"); assert.equal(sniffVideo(WEBM().buffer).ext, "webm");
  assert.equal(sniffVideo(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]).buffer), null); assert.equal(sniffVideo(new TextEncoder().encode("hello world, not a video").buffer), null);
});

test("an uploaded clip waits for approval: only its owner can watch it until Admin approves, then everyone can (and can seek)", async () => {
  const { env, raw } = mk(), u = await addUser(raw, "u1", "owner@example.com"); addPost(raw, "home0001abc", { id: "u1", email: "owner@example.com" });
  const r = await put(env, "home0001abc", MP4(2000), u.cookie); const b = await r.json();
  assert.equal(r.status, 200); assert.equal(b.video.waiting, true); const key = row(raw, "home0001abc").video_file; assert.match(key, /^v\/home0001abc\/\d+\.mp4$/); assert.equal(row(raw, "home0001abc").video_ok, 0);
  assert.equal((await photo(env, key)).status, 404, "a visitor cannot watch a clip that is waiting");
  assert.equal((await photo(env, key, u.cookie)).status, 200, "its owner can");
  assert.equal("vf" in rowToPost(row(raw, "home0001abc")), false, "not in the public list");
  raw.prepare("UPDATE posts SET video_ok = 1 WHERE id = ?").run("home0001abc"); // what Admin's Approve does
  const pub = await photo(env, key); assert.equal(pub.status, 200); assert.match(pub.headers.get("cache-control"), /public/); assert.equal(pub.headers.get("accept-ranges"), "bytes");
  const part = await photo(env, key, "", "bytes=100-199"); assert.equal(part.status, 206); assert.equal(part.headers.get("content-range"), "bytes 100-199/2000"); assert.equal((await part.arrayBuffer()).byteLength, 100);
  assert.equal(rowToPost(row(raw, "home0001abc")).vf, "/api/photo/" + key);
});

test("a home that is not live shows no clip to the public, even an approved one", async () => {
  const { env, raw } = mk(), u = await addUser(raw, "u1", "owner@example.com"); addPost(raw, "home0002abc", { id: "u1", email: "owner@example.com" });
  await put(env, "home0002abc", MP4(), u.cookie); raw.prepare("UPDATE posts SET video_ok = 1, status = 'pending' WHERE id = ?").run("home0002abc");
  assert.equal((await photo(env, row(raw, "home0002abc").video_file)).status, 404);
});

test("only the person who posted it can change the video; wrong files and big files are refused", async () => {
  const { env, raw } = mk(), u = await addUser(raw, "u1", "owner@example.com"), o = await addUser(raw, "u2", "other@example.com"); addPost(raw, "home0003abc", { id: "u1", email: "owner@example.com" });
  assert.equal((await put(env, "home0003abc", MP4(), o.cookie)).status, 404);
  assert.equal((await put(env, "home0003abc", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]), u.cookie)).status, 400);
  assert.equal((await put(env, "home0003abc", new Uint8Array(MAX_VIDEO_BYTES + 10), u.cookie)).status, 413);
  assert.equal((await put(env, "home0003abc", MP4(), u.cookie, { "content-length": String(60 * 1024 * 1024) })).status, 413, "refused from the length alone");
  assert.equal(row(raw, "home0003abc").video_file, "");
});

test("a link replaces a clip (and removes its file); a clip replaces a link; remove clears both; only YouTube and Vimeo links are accepted", async () => {
  const { env, raw } = mk(), u = await addUser(raw, "u1", "owner@example.com"); addPost(raw, "home0004abc", { id: "u1", email: "owner@example.com" });
  await put(env, "home0004abc", WEBM(), u.cookie); const first = row(raw, "home0004abc").video_file; assert.match(first, /\.webm$/);
  assert.equal((await act(env, "home0004abc", { action: "link", url: "https://example.com/v.mp4" }, u.cookie)).status, 400);
  const l = await act(env, "home0004abc", { action: "link", url: "https://youtu.be/dQw4w9WgXcQ?t=5" }, u.cookie); assert.equal(l.status, 200);
  assert.equal(row(raw, "home0004abc").video, "https://www.youtube.com/watch?v=dQw4w9WgXcQ"); assert.equal(row(raw, "home0004abc").video_file, ""); assert.equal(env.PHOTOS.store.has(first), false, "the old clip file is gone");
  assert.deepEqual(rowToPost(row(raw, "home0004abc")).vid, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "a link is public at once");
  await put(env, "home0004abc", MOV(), u.cookie); assert.equal(row(raw, "home0004abc").video, ""); assert.match(row(raw, "home0004abc").video_file, /\.mov$/);
  await act(env, "home0004abc", { action: "remove" }, u.cookie); assert.equal(row(raw, "home0004abc").video_file, ""); assert.equal(env.PHOTOS.store.size, 0);
});

test("a contest entry can change its video only while the contest takes changes", async () => {
  const { env, raw } = mk(), u = await addUser(raw, "u1", "owner@example.com");
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,status,entries_close,vote_start,vote_end,contact_email,announced) VALUES ('c1','c-one','u9','Contest','Org','Pasadena','live','2026-12-01','2026-12-02','2099-01-01','o@x.org',0)").run();
  addPost(raw, "entry001abc", { id: "u1", email: "owner@example.com" }, { contest: "c1" });
  assert.equal((await put(env, "entry001abc", MP4(), u.cookie)).status, 200);
  raw.prepare("UPDATE contests SET announced = 1 WHERE id = 'c1'").run();
  assert.equal((await put(env, "entry001abc", MP4(), u.cookie)).status, 403);
});

test("publicVideo: link, approved clip or nothing", () => {
  assert.deepEqual(publicVideo({ status: "approved", video: "https://vimeo.com/123456789" }), { vid: "https://vimeo.com/123456789" });
  assert.deepEqual(publicVideo({ status: "approved", video_file: "v/a/1.mp4", video_ok: 1 }), { vf: "/api/photo/v/a/1.mp4" });
  assert.deepEqual(publicVideo({ status: "approved", video_file: "v/a/1.mp4", video_ok: 0 }), {}); assert.deepEqual(publicVideo({ status: "pending", video_file: "v/a/1.mp4", video_ok: 1 }), {});
});

test("the video box is on every place a home or entry is made or edited: the edit sheet, the 'you're done' screens of both add forms, and the contest page's Your home card", async () => {
  const { readFileSync } = await import("node:fs"), read = (f) => readFileSync(f, "utf8");
  assert.match(read("public/forms.js"), /videoBoxHtml\(h\)/); assert.match(read("public/profile.html"), /wireVideoBox\(f, \{ item: h, url: "\/api\/me\/video\/" \+ id/);
  for (const f of ["public/add-house.html", "public/contest-enter.html"]) { const h = read(f); assert.match(h, /id="vslot"/, f); assert.match(h, /mountVideoSlot\(j\.id/, f); }
  assert.match(read("public/contest.html"), /data-vslot=/); assert.match(read("public/contest.html"), /wireVideoBox\(el, \{ item: e, url: "\/api\/me\/video\/" \+ e\.id/);
  const slug = read("functions/api/contests/[slug].js"); assert.match(slug, /own\.has\(p\.id\) \? \{ video: p\.video \|\| ""/, "the owner sees their own video state");
  assert.match(read("public/videobox.js"), /fetch\(url, \{ method: "PUT"/, "uploads use fetch so the Admin act-as view can redirect them");
});
