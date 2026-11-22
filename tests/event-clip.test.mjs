// An event's uploaded video clip: the organizer uploads it (after the event is on the map), it waits for Admin's approval, then everyone can watch it. A link and a clip replace each other.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPut as putClip, onRequestPost as postEvent } from "../functions/api/me/events/[id].js";
import { onRequestGet as getPhoto } from "../functions/api/photo/[[path]].js";
import { onRequestPost as adminVideo } from "../functions/api/admin/event-video.js";
import { rowToEvent, rowToListEvent } from "../functions/_lib/util.js";
import { newEnv, addUser } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const MP4 = (n = 64) => { const b = new Uint8Array(n); b.set([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]); for (let i = 12; i < n; i++) b[i] = i % 251; return b; };
const r2 = () => { const store = new Map(); return { store, put: async (k, v, o) => { store.set(k, { buf: new Uint8Array(v), httpMetadata: o && o.httpMetadata }); }, delete: async (k) => { store.delete(k); },
  get: async (k) => { const o = store.get(k); if (!o) return null; return { body: o.buf, size: o.buf.length, httpEtag: '"x"', writeHttpMetadata: (h) => { if (o.httpMetadata) h.set("content-type", o.httpMetadata.contentType); } }; } }; };
const mk = () => newEnv({ PHOTOS: r2(), DEV_AUTH: "" });
const seed = (raw, status = "published") => {
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES ('clipev','Clip Event','Orange','Irvine','tree','2999-12-01','2999-12-02','confirmed',1,'Free','6pm',33.7,-117.8,'A tree lighting with a short description here','','christmas','Park','1 Main St')").run();
  raw.prepare("INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,contact_email,event_id) VALUES ('sub0001','" + status + "','Clip Event','Orange','Irvine','christmas','tree','2999-12-01','2999-12-02','owner@example.com','clipev')").run();
};
const put = (env, bytes, cookie) => putClip({ params: { id: "sub0001" }, request: new Request(`${ORIGIN}/api/me/events/sub0001`, { method: "PUT", headers: { cookie, "content-type": "video/mp4", origin: ORIGIN } , body: bytes }), env });
const act = (env, body, cookie) => postEvent({ params: { id: "sub0001" }, request: new Request(`${ORIGIN}/api/me/events/sub0001`, { method: "POST", headers: { cookie, "content-type": "application/json", origin: ORIGIN }, body: JSON.stringify(body) }), env });
const photo = (env, key, cookie = "") => getPhoto({ params: { path: key.split("/") }, env, request: new Request(`${ORIGIN}/api/photo/${key}`, { headers: cookie ? { cookie } : {} }) });
const admin = (env, body) => adminVideo({ request: new Request(`${ORIGIN}/api/admin/event-video`, { method: "POST", body: JSON.stringify(body) }), env });
const row = (raw) => raw.prepare("SELECT * FROM events WHERE id = 'clipev'").get();

test("an event's clip waits for approval: only its organizer can watch it, then Admin approves and everyone can", async () => {
  const { env, raw } = mk(), u = await addUser(raw, "u1", "owner@example.com"); seed(raw);
  const r = await put(env, MP4(2000), u.cookie), b = await r.json();
  assert.equal(r.status, 200); assert.equal(b.video.waiting, true);
  const key = row(raw).video_file; assert.match(key, /^ev\/clipev\/\d+\.mp4$/); assert.equal(row(raw).video_ok, 0);
  assert.equal((await photo(env, key)).status, 404, "a visitor cannot watch a clip that is waiting");
  assert.equal((await photo(env, key, u.cookie)).status, 200, "its organizer can");
  assert.equal("vf" in rowToEvent(row(raw)), false, "not in the public event");
  assert.equal((await admin(env, { id: "clipev", action: "approve" })).status, 200);
  assert.equal((await photo(env, key)).status, 200, "everyone can once approved");
  assert.equal(rowToEvent(row(raw)).vf, "/api/photo/" + key); assert.equal("vf" in rowToListEvent(row(raw)), false, "the list stays light: the clip address is a detail-only field");
});

test("an event's clip and its YouTube or Vimeo link replace each other; the organizer can remove the video; strangers and events in review cannot upload", async () => {
  const { env, raw } = mk(), u = await addUser(raw, "u1", "owner@example.com"), o = await addUser(raw, "u2", "other@example.com"); seed(raw);
  assert.equal((await put(env, MP4(500), o.cookie)).status, 404, "not the organizer's event");
  assert.equal((await put(env, new TextEncoder().encode("not a video at all, just words"), u.cookie)).status, 400, "only real videos");
  await put(env, MP4(500), u.cookie); const key = row(raw).video_file;
  const l = await act(env, { action: "link", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, u.cookie); assert.equal(l.status, 200);
  assert.equal(row(raw).video_file, "", "a link removes the clip"); assert.equal(env.PHOTOS.store.has(key), false, "and deletes its file"); assert.match(row(raw).video, /youtube/);
  await put(env, MP4(500), u.cookie); assert.equal(row(raw).video, "", "a new clip clears the link");
  assert.equal((await act(env, { action: "remove" }, u.cookie)).status, 200); assert.equal(row(raw).video_file, ""); assert.equal(row(raw).video, "");
  raw.prepare("UPDATE event_submissions SET status = 'pending' WHERE id = 'sub0001'").run();
  assert.equal((await put(env, MP4(500), u.cookie)).status, 400, "an event still in review cannot take a video yet");
});

test("Admin adds photos and a video clip to any event (a sweep event too): up to 4 photos, cover and remove, and an Admin clip is approved at once", async () => {
  const { onRequestPost: adminPhotos } = await import("../functions/api/admin/event-photos.js");
  const { onRequestPut: adminClip } = await import("../functions/api/admin/event-video.js");
  const { env, raw } = mk(); seed(raw);
  const JPG = (n) => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...Array(n).fill(7)])], "p.jpg", { type: "image/jpeg" });
  const upload = (files) => { const fd = new FormData(); fd.append("id", "clipev"); files.forEach((f) => fd.append("photos", f)); return adminPhotos({ request: new Request(`${ORIGIN}/api/admin/event-photos`, { method: "POST", body: fd }), env }); };
  const act = (body) => adminPhotos({ request: new Request(`${ORIGIN}/api/admin/event-photos`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env });
  let r = await upload([JPG(50), JPG(60)]), d = await r.json(); assert.equal(r.status, 200); assert.equal(d.photos.length, 2); assert.match(d.photos[0], /^e\/clipev\/\d+\.jpg$/);
  assert.equal(JSON.parse(row(raw).owner_photos).length, 2);
  assert.equal((await act({ id: "clipev", action: "cover", key: d.photos[1] })).status, 200); assert.equal(JSON.parse(row(raw).owner_photos)[0], d.photos[1], "the cover comes first");
  assert.equal((await upload([JPG(1), JPG(2), JPG(3)])).status, 400, "no more than 4 photos");
  assert.equal((await upload([new File([new TextEncoder().encode("not an image at all")], "x.jpg")])).status, 400, "only real images");
  assert.equal((await act({ id: "clipev", action: "remove", key: d.photos[0] })).status, 200); assert.equal(JSON.parse(row(raw).owner_photos).length, 1);
  assert.equal((await act({ id: "nope", action: "remove", key: "x" })).status, 404);
  const c = await adminClip({ request: new Request(`${ORIGIN}/api/admin/event-video?id=clipev`, { method: "PUT", headers: { "content-type": "video/mp4" }, body: MP4(900) }), env });
  assert.equal(c.status, 200); assert.equal(row(raw).video_ok, 1, "approved at once"); assert.match(row(raw).video_file, /^ev\/clipev\//);
  assert.equal((await photo(env, row(raw).video_file)).status, 200, "visitors can watch it");
});
