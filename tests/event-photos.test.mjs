// Owners can add up to 4 photos to an event they added (Your events > Edit). Real handlers, in-memory D1, a fake R2 bucket.
import test from "node:test";
import assert from "node:assert/strict";
import { makeDB } from "./_d1.mjs";
import { addUser, ptToday } from "./_pay.mjs";
import { onRequestPost as mePost, onRequestDelete as meDelete } from "../functions/api/me/events/[id].js";
import { onRequestGet as overview } from "../functions/api/me/overview.js";
import { onRequestGet as photoGet } from "../functions/api/photo/[[path]].js";
import { rowToEvent, rowToListEvent } from "../functions/_lib/util.js";
import { healthShape, EVENT_COLS } from "../functions/_lib/eventhealth.js";
import { ownerKeys, ownerUrls, MAX_EVENT_PHOTOS, EVENT_KEY_RE } from "../functions/_lib/eventphotos.js";

const ORIGIN = "https://socallights.app";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0]);
const file = (bytes, name = "p.png", type = "image/png") => new File([bytes], name, { type });
const r2 = () => { const store = new Map(); return { store, put: async (k, v, o) => { store.set(k, { body: v, httpMetadata: o && o.httpMetadata, httpEtag: '"x"', writeHttpMetadata(h) { if (o && o.httpMetadata) h.set("content-type", o.httpMetadata.contentType); } }); }, get: async (k) => store.get(k) || null, delete: async (k) => { store.delete(k); } }; };
function setup() {
  const { DB, raw } = makeDB(), bucket = r2(), env = { DB, PHOTOS: bucket };
  raw.prepare("INSERT INTO events (id,name,city,county,type,start_date,end_date,status,lat,lng,image) VALUES ('u-oak-1','Oak Hill Tree Lighting','Pasadena','Los Angeles','tree',?,?,'confirmed',34.1,-118.1,'https://oakhill.org/photo.jpg')").run(ptToday(10), ptToday(11));
  return { env, raw, bucket };
}
async function owner(raw, id = "u1", email = "me@example.com") { const u = await addUser(raw, id, email); raw.prepare("INSERT INTO event_submissions (id,name,city,county,season,type,start_date,end_date,contact_email,status,event_id,blurb,venue,lat,lng) VALUES ('s1','Oak Hill Tree Lighting','Pasadena','Los Angeles','christmas','tree',?,?,?,'published','u-oak-1','The whole neighborhood lights the tree together.','Oak Hill Park',34.1,-118.1)").run(ptToday(10), ptToday(11), email); return u; }
const upload = (env, cookie, files, id = "s1") => { const fd = new FormData(); for (const f of files) fd.append("photos", f); return mePost({ params: { id }, env, request: new Request(ORIGIN + "/api/me/events/" + id, { method: "POST", headers: { origin: ORIGIN, cookie }, body: fd }) }); };
const act = (env, cookie, body, id = "s1") => mePost({ params: { id }, env, request: new Request(ORIGIN + "/api/me/events/" + id, { method: "POST", headers: { origin: ORIGIN, cookie, "content-type": "application/json" }, body: JSON.stringify(body) }) });

test("the owner adds photos (up to 4); they show first on the map and the old picture comes back when they are removed", async () => {
  const { env, raw, bucket } = setup(), me = await owner(raw);
  const r = await upload(env, me.cookie, [file(PNG), file(JPG, "b.jpg", "image/jpeg")]);
  assert.equal(r.status, 200); const j = await r.json(); assert.equal(j.photos.length, 2); assert.ok(j.photos.every((k) => EVENT_KEY_RE.test(k) && k.startsWith("e/u-oak-1/")));
  assert.ok(j.photos.every((k) => bucket.store.has(k)), "stored in the bucket");
  const row = raw.prepare("SELECT * FROM events WHERE id = 'u-oak-1'").get(), ev = rowToEvent(row);
  assert.equal(ev.img, `${ORIGIN}/api/photo/${j.photos[0]}`, "the owner's first photo is the cover"); assert.equal(ev.op, 2);
  assert.deepEqual(ev.imgs, [`${ORIGIN}/api/photo/${j.photos[1]}`, "https://oakhill.org/photo.jpg"], "the page's own picture follows");
  assert.equal(rowToListEvent(row).img, ev.img, "the list (the map) shows it too");
  const more = await upload(env, me.cookie, [file(PNG), file(PNG), file(PNG)]); assert.equal(more.status, 400); assert.match((await more.json()).error, /up to 4 photos/);
  assert.equal((await upload(env, me.cookie, [file(PNG), file(PNG)])).status, 200); assert.equal(ownerKeys(raw.prepare("SELECT owner_photos FROM events WHERE id='u-oak-1'").get().owner_photos).length, 4);
  const full = await upload(env, me.cookie, [file(PNG)]); assert.equal(full.status, 400); assert.match((await full.json()).error, /already has 4 photos/);
  const cover = await act(env, me.cookie, { action: "coverphoto", key: j.photos[1] }); assert.equal((await cover.json()).photos[0], j.photos[1]);
  const keys = ownerKeys(raw.prepare("SELECT owner_photos FROM events WHERE id='u-oak-1'").get().owner_photos);
  for (const k of keys) assert.equal((await act(env, me.cookie, { action: "removephoto", key: k })).status, 200);
  assert.equal(bucket.store.size, 0, "removed from the bucket"); const back = rowToEvent(raw.prepare("SELECT * FROM events WHERE id = 'u-oak-1'").get());
  assert.equal(back.img, "https://oakhill.org/photo.jpg"); assert.equal(back.op, undefined, "the old picture is back");
  assert.equal((await act(env, me.cookie, { action: "removephoto", key: "e/u-oak-1/1.png" })).status, 404, "a photo that is not on the event");
});

test("only the owner, only a live event, only real images under 6 MB, and a daily limit", async () => {
  const { env, raw } = setup(), me = await owner(raw), other = await addUser(raw, "u2", "other@example.com");
  assert.equal((await upload(env, other.cookie, [file(PNG)])).status, 404, "someone else's event");
  assert.equal((await upload(env, "", [file(PNG)])).status, 401);
  const bad = await upload(env, me.cookie, [file(new TextEncoder().encode("not an image at all"), "x.png", "image/png")]); assert.equal(bad.status, 400); assert.match((await bad.json()).error, /JPG, PNG or WebP/);
  const big = await upload(env, me.cookie, [new File([new Uint8Array(6 * 1024 * 1024 + 10).fill(1)], "big.png")]); assert.equal(big.status, 400);
  assert.equal((await upload(env, me.cookie, [])).status, 400);
  raw.prepare("UPDATE event_submissions SET status = 'pending' WHERE id = 's1'").run();
  const pend = await upload(env, me.cookie, [file(PNG)]); assert.equal(pend.status, 400); assert.match((await pend.json()).error, /once the event is on the map/);
  raw.prepare("UPDATE event_submissions SET status = 'published' WHERE id = 's1'").run();
  assert.equal((await act(env, other.cookie, { action: "removephoto", key: "e/u-oak-1/1.png" })).status, 404);
  let limited = 0; for (let i = 0; i < 45; i++) { const r = await upload(env, me.cookie, [file(new TextEncoder().encode("nope"))]); if (r.status === 429) limited++; } assert.ok(limited > 0, "40 photo changes a day");
});

test("the photo route serves the owner's photos publicly and nothing else under e/", async () => {
  const { env, raw, bucket } = setup(), me = await owner(raw); const j = await (await upload(env, me.cookie, [file(PNG)])).json();
  const get = (path) => photoGet({ params: { path: path.split("/") }, env, request: new Request(ORIGIN + "/api/photo/" + path) });
  const ok = await get(j.photos[0]); assert.equal(ok.status, 200); assert.match(ok.headers.get("cache-control"), /immutable/); assert.equal(ok.headers.get("content-type"), "image/png");
  for (const bad of ["e/u-oak-1/../x.png", "e/u-oak-1/abc.png", "e/u-oak-1/1.gif", "e/x/1.png", "e/u-oak-1/1.png/extra", "pending/s1/1.png"]) assert.equal((await get(bad)).status, 404, bad);
  assert.equal((await get("e/u-oak-1/1.png")).status, 404, "valid shape but not stored");
});

test("Your events lists the photos, the copy does not take them, deleting the event deletes them, and Admin health counts them as a photo", async () => {
  const { env, raw, bucket } = setup(), me = await owner(raw); await upload(env, me.cookie, [file(PNG), file(PNG)]);
  const o = await (await overview({ env, request: new Request(ORIGIN + "/api/me/overview", { headers: { cookie: me.cookie } }) })).json();
  assert.equal(o.events[0].photos.length, 2); assert.equal(o.events[0].owner_photos, undefined);
  const copy = await (await act(env, me.cookie, { action: "copy" })).json(); assert.ok(copy.ok);
  assert.equal(raw.prepare("SELECT owner_photos FROM events WHERE id = ?").get(copy.id).owner_photos, null, "next year's copy starts with no owner photos (the files are not shared)");
  const row = raw.prepare(`SELECT ${EVENT_COLS} FROM events WHERE id = 'u-oak-1'`).get(); assert.equal(healthShape(row).op, 2);
  const del = await meDelete({ params: { id: "s1" }, env, request: new Request(ORIGIN + "/api/me/events/s1", { method: "DELETE", headers: { origin: ORIGIN, cookie: me.cookie } }) });
  assert.equal(del.status, 200); assert.equal(bucket.store.size, 0, "the photos went with the event");
});

test("the screens: the edit sheet has a Photos box for a live event (limit 4), the profile wires it, the app credits the organizer", async () => {
  const fs = await import("node:fs"), read = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
  const forms = read("public/forms.js"); // the browser file imports /areapick.js, so it is read as text here
  assert.match(forms, /const livePhotos = e\.status === "published" && !!e\.event_id/, "the Photos box only for an event that is on the map");
  assert.match(forms, /\$\{livePhotos \? fsec\("Photos", "Up to 4\./); assert.match(forms, /photoBoxHtml\(e, e\.photos \|\| \[\], \{ max: 4, live: true, noun: "event" \}\)/);
  assert.match(forms, /const max = opts\.max \|\| MAXP/); assert.match(forms, /That is the limit of \$\{max\} photos/); assert.match(forms, /const MAXP = 8;/, "a home still allows 8");
  const profile = read("public/profile.html"); assert.match(profile, /wirePhotoBox\(f, \{ item: O\.events\.find/); assert.match(profile, /max: 4, opts: \{ live: true, noun: "event" \}/); assert.match(profile, /wirePhotoBox\(f, \{ item: h, url: "\/api\/me\/homes\/" \+ id, max: 8 \}\)/);
  assert.match(read("public/app.js"), /Photo: the organizer/);
  assert.equal(MAX_EVENT_PHOTOS, 4); assert.deepEqual(ownerUrls(["e/u-oak-1/1.png"]), [`${ORIGIN}/api/photo/e/u-oak-1/1.png`]);
});
