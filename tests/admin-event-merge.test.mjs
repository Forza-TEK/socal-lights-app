// Audit F-30: Admin "Merge duplicate events" (functions/api/admin/events/merge.js). The two real merges that needed hand-written migrations are replayed here:
//   0287 Old Town Trolley (sweep row "trolley" + the organizer's "u-old-town-trolley-s-holid-dd720a": the organizer's details win) and
//   0285 + 0286 Holidays in the Village (the sweep row stays, takes the organizer's photos, web page and the Santa video clip; the clip's key still carries the OLD event id and must keep playing).
// No Stripe, no email, nothing outside the in-memory database.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as previewGet, onRequestPost as mergePost } from "../functions/api/admin/events/merge.js";
import { onRequestPost as restorePost } from "../functions/api/admin/events/restore.js";
import { onRequestGet as photoGet } from "../functions/api/photo/[[path]].js";
import { onRequest as middleware } from "../functions/api/admin/_middleware.js";
import { newEnv, ptToday } from "./_pay.mjs";

const ORIGIN = "https://socallights.app", ME = { admin: { email: "rey@forza-tek.com" } };
const r2 = (keys = []) => { const store = new Map(keys.map((k) => [k, new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 1, 2, 3, 4])])); return { get: async (k) => { const b = store.get(k); return b ? { body: b, size: b.length, httpEtag: '"x"', writeHttpMetadata: (h) => h.set("content-type", "video/quicktime") } : null; } }; };
const preview = async (env, keep, duplicate) => previewGet({ request: new Request(`${ORIGIN}/api/admin/events/merge?keep=${keep}&duplicate=${duplicate}`), env });
const merge = (env, b) => mergePost({ request: new Request(ORIGIN + "/api/admin/events/merge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "merge", ...b }) }), env, data: { ...ME } });
const restore = (env, ids) => restorePost({ request: new Request(ORIGIN + "/api/admin/events/restore", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids }) }), env });
const ev = (raw, id) => { const r = raw.prepare("SELECT * FROM events WHERE id = ?").get(id); return r ? { ...r } : null; };
const insEv = (raw, id, o = {}) => {
  const e = { name: "Event", county: "San Diego", city: "San Diego", type: "tour", start_date: ptToday(20), end_date: ptToday(50), status: "confirmed", free: 0, price: "", hours: "", lat: 32.75, lng: -117.19, blurb: "", url: "", season: "christmas", venue: "", address: "", ...o };
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address,image,images,owner_photos,video,video_file,video_ok,featured,featured_until) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, e.name, e.county, e.city, e.type, e.start_date, e.end_date, e.status, e.free, e.price, e.hours, e.lat, e.lng, e.blurb, e.url, e.season, e.venue, e.address, e.image ?? null, e.images ?? null, e.owner_photos ?? null, e.video ?? "", e.video_file ?? "", e.video_ok ?? 0, e.featured ?? 0, e.featured_until ?? null);
};
const insSub = (raw, id, eventId, extra = {}) => raw.prepare("INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,contact_email,event_id,address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
  .run(id, "published", "Org", "San Diego", "San Diego", "christmas", "tour", ptToday(20), ptToday(50), "org@example.com", eventId, extra.address ?? "4010 Twiggs St");

const TROLLEY = "u-old-town-trolley-s-holid-dd720a";
const seedTrolley = (raw) => {
  raw.prepare("DELETE FROM events").run();
  insEv(raw, "trolley", { name: "Holiday Sights Trolley Tour", city: "Old Town", price: "Tour fare", hours: "Daily", blurb: "sweep blurb", url: "https://www.sandiego.org/x", venue: "Old Town Market", address: "4010 Twiggs St, San Diego, CA 92110", image: "https://img.example.org/t.jpg", lat: 32.7550, lng: -117.1950 });
  insEv(raw, TROLLEY, { name: "Old Town Trolley’s Holiday Sights and Festive Nights Tour", city: "San Diego", price: "Adults from $35", hours: "5:30pm-8:00pm", blurb: "Sing along on a decorated trolley led by elf conductors.", url: "https://www.trolleytours.com/holiday", venue: "Old Town Market", address: "4010 Twiggs Street", owner_photos: JSON.stringify(["e/" + TROLLEY + "/1700000000001.jpg"]), lat: 32.7553, lng: -117.1952 });
  insSub(raw, "87e325f57ab44c28", TROLLEY, { address: "4010 Twiggs Street" });
};

test("preview: nothing changes; the organizer's record is the default winner; the page lists what differs and what would move", async () => {
  const { env, raw } = newEnv(); seedTrolley(raw);
  const before = JSON.stringify([ev(raw, "trolley"), ev(raw, TROLLEY), raw.prepare("SELECT * FROM event_submissions").all()]);
  const r = await preview(env, "trolley", TROLLEY), p = await r.json();
  assert.equal(r.status, 200); assert.equal(p.managed, "duplicate"); assert.equal(p.can_merge, true); assert.deepEqual(p.blockers, []);
  assert.deepEqual(p.defaults, ["name", "city", "price", "hours", "description", "web", "address", "pin", "photos"], "the 0287 field list, minus what is already identical (venue) and what the duplicate has nothing for (video: an empty value is never taken)");
  const g = Object.fromEntries(p.groups.map((x) => [x.key, x])); assert.equal(g.name.keep, "Holiday Sights Trolley Tour"); assert.match(g.name.duplicate, /Old Town Trolley/); assert.equal(g.photos.duplicate, "1 photo"); assert.equal(g.picture.default, false);
  assert.equal(p.moves.submissions, 1);
  assert.equal(JSON.stringify([ev(raw, "trolley"), ev(raw, TROLLEY), raw.prepare("SELECT * FROM event_submissions").all()]), before, "a preview writes nothing");
  assert.equal(raw.prepare("SELECT COUNT(*) n FROM deleted_events").get().n, 0);
});

test("Old Town Trolley (migration 0287): the organizer's details win, the sweep's picture stays, the submission follows, the duplicate is tombstoned", async () => {
  const { env, raw } = newEnv(); seedTrolley(raw);
  const r = await merge(env, { keep: "trolley", duplicate: TROLLEY }), j = await r.json();
  assert.equal(r.status, 200); assert.equal(j.ok, true);
  const k = ev(raw, "trolley");
  assert.match(k.name, /Festive Nights/); assert.equal(k.city, "San Diego"); assert.equal(k.price, "Adults from $35"); assert.equal(k.hours, "5:30pm-8:00pm"); assert.match(k.blurb, /elf conductors/); assert.equal(k.url, "https://www.trolleytours.com/holiday");
  assert.equal(k.venue, "Old Town Market"); assert.equal(k.address, "4010 Twiggs Street"); assert.equal(k.lat, 32.7553); assert.equal(k.owner_photos, JSON.stringify(["e/" + TROLLEY + "/1700000000001.jpg"]));
  assert.equal(k.image, "https://img.example.org/t.jpg", "the picture found on the sweep's page stays linked");
  assert.equal(k.id, "trolley"); assert.equal(k.start_date, ptToday(20));
  assert.equal(ev(raw, TROLLEY), null, "the duplicate row is gone");
  assert.equal(raw.prepare("SELECT event_id FROM event_submissions WHERE id = '87e325f57ab44c28'").get().event_id, "trolley", "Your profile > Events now edits the surviving row");
  const t = raw.prepare("SELECT * FROM deleted_events WHERE id = ?").get(TROLLEY); assert.ok(t); assert.equal(t.deleted_by, "rey@forza-tek.com"); assert.equal(JSON.parse(t.row).name.slice(0, 8), "Old Town");
});

test("Holidays in the Village (migrations 0285 + 0286): sweep keeps its right pin, takes the photos, web page and the clip; the clip's key (still holding the old id) keeps working", async () => {
  const { env: base, raw } = newEnv(); raw.prepare("DELETE FROM events").run();
  const CLIP = "ev/u-holidays-in-the-village--4afd74/1795347712908.mov", env = { ...base, PHOTOS: r2([CLIP]) };
  const keys = [1, 2, 3, 4].map((i) => `e/u-holidays-in-the-village--4afd74/17953477${i}.jpg`);
  insEv(raw, "thousand-oaks-holidays-in-the-village", { name: "Holidays in the Village", city: "Thousand Oaks", county: "Ventura", type: "walk", lat: 34.1836, lng: -118.8877, url: "https://www.toaks.org/x", hours: "Saturday 5pm-9pm", address: "350 W Hillcrest Dr", venue: "The Oaks" });
  insEv(raw, "u-holidays-in-the-village--4afd74", { name: "Holidays in the Village", city: "Thousand Oaks", county: "Ventura", type: "walk", lat: 34.1836 + 0.0145, lng: -118.8877 + 0.0170 /* the 1.6 km wrong pin */, url: "https://holidaysinthevillage.org/", owner_photos: JSON.stringify(keys), video_file: CLIP, video_ok: 1, address: "350 Hillcrest", venue: "" });
  insSub(raw, "4f64f8e870394fb3", "u-holidays-in-the-village--4afd74", { address: "350 Hillcrest" });
  const p = await (await preview(env, "thousand-oaks-holidays-in-the-village", "u-holidays-in-the-village--4afd74")).json();
  assert.ok(p.warnings.some((w) => /km apart/.test(w)), "a pin 1.6 km away is called out so Admin can leave the pin out");
  assert.ok(p.defaults.includes("video") && p.defaults.includes("photos") && p.defaults.includes("web"));
  const r = await merge(env, { keep: "thousand-oaks-holidays-in-the-village", duplicate: "u-holidays-in-the-village--4afd74", fields: ["photos", "web", "video"] });
  assert.equal(r.status, 200);
  const k = ev(raw, "thousand-oaks-holidays-in-the-village");
  assert.equal(k.lat, 34.1836, "the sweep's correct pin was not touched"); assert.equal(k.address, "350 W Hillcrest Dr"); assert.equal(k.url, "https://holidaysinthevillage.org/");
  assert.deepEqual(JSON.parse(k.owner_photos), keys); assert.equal(k.video_file, CLIP); assert.equal(k.video_ok, 1);
  assert.equal(raw.prepare("SELECT event_id FROM event_submissions WHERE id = '4f64f8e870394fb3'").get().event_id, "thousand-oaks-holidays-in-the-village");
  const play = await photoGet({ params: { path: CLIP.split("/") }, env, request: new Request(`${ORIGIN}/api/photo/${CLIP}`) });
  assert.equal(play.status, 200, "the clip plays for visitors from the surviving event, though its key names the deleted one");
  assert.equal(ev(raw, "u-holidays-in-the-village--4afd74"), null);
});

test("a clip still waiting for approval stays waiting after the merge (it is not shown to visitors early)", async () => {
  const { env: base, raw } = newEnv(); raw.prepare("DELETE FROM events").run();
  const CLIP = "ev/u-waiting-clip-aaaaaa/1795347712999.mp4", env = { ...base, PHOTOS: r2([CLIP]) };
  insEv(raw, "sweep-1", { name: "Show" }); insEv(raw, "u-waiting-clip-aaaaaa", { name: "Show", video_file: CLIP, video_ok: 0 }); insSub(raw, "s1", "u-waiting-clip-aaaaaa");
  assert.equal((await merge(env, { keep: "sweep-1", duplicate: "u-waiting-clip-aaaaaa", fields: ["video"] })).status, 200);
  assert.equal(ev(raw, "sweep-1").video_ok, 0);
  assert.equal((await photoGet({ params: { path: CLIP.split("/") }, env, request: new Request(`${ORIGIN}/api/photo/${CLIP}`) })).status, 404, "visitors still cannot see an unapproved clip");
});

test("refused, with the reason, when the duplicate has an order or a claim; nothing is changed", async () => {
  for (const [what, seedIt, text] of [
    ["an order", (raw) => raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,status) VALUES ('cs_1',?,'pin',1500,'b@example.com','paid')").run(TROLLEY), /1 order recorded \(1 paid or waiting for a refund\)/],
    ["a refunded order", (raw) => raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,status) VALUES ('cs_2',?,'pin',1500,'b@example.com','refunded')").run(TROLLEY), /1 order recorded/],
    ["a claim", (raw) => { raw.prepare("INSERT INTO users (id,email,name) VALUES ('u1','c@example.com','')").run(); raw.prepare("INSERT INTO event_claims (id,event_id,user_id,email,status) VALUES ('c1',?,'u1','c@example.com','pending')").run(TROLLEY); }, /1 claim/],
    ["a contest listing", (raw) => raw.prepare("INSERT INTO users (id,email,name) VALUES ('u2','d@example.com','')").run() && raw.prepare("INSERT INTO contests (id,slug,name,org,city,county,owner_id,contact_email,event_id,entries_close,vote_start,vote_end) VALUES ('ct1','c-1','Contest','Org','San Diego','San Diego','u2','d@example.com',?,'2026-12-01','2026-12-02','2026-12-10')").run(TROLLEY), /contest/],
  ]) {
    const { env, raw } = newEnv(); seedTrolley(raw); try { seedIt(raw); } catch (e) { throw new Error(what + ": " + e.message); }
    const snap = () => JSON.stringify([ev(raw, "trolley"), ev(raw, TROLLEY), raw.prepare("SELECT * FROM event_submissions").all(), raw.prepare("SELECT COUNT(*) n FROM deleted_events").get()]);
    const before = snap(), pv = await (await preview(env, "trolley", TROLLEY)).json();
    assert.equal(pv.can_merge, false, what); assert.match(pv.blockers.join(" "), text, what);
    const r = await merge(env, { keep: "trolley", duplicate: TROLLEY }), j = await r.json();
    assert.equal(r.status, 409, what); assert.equal(j.code, "merge_blocked"); assert.match(j.error, text);
    assert.equal(snap(), before, what + ": nothing changed");
  }
});

test("an order that appears while the merge runs stops all of it (every statement is guarded)", async () => {
  const { env, raw } = newEnv(); seedTrolley(raw);
  const real = env.DB.batch; env.DB.batch = async (list) => { raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,status) VALUES ('cs_late',?,'pin',1500,'b@example.com','paid')").run(TROLLEY); return real(list); };
  const r = await merge(env, { keep: "trolley", duplicate: TROLLEY }); assert.equal(r.status, 409);
  assert.ok(ev(raw, TROLLEY)); assert.equal(ev(raw, "trolley").name, "Holiday Sights Trolley Tour"); assert.equal(raw.prepare("SELECT event_id FROM event_submissions").get().event_id, TROLLEY); assert.equal(raw.prepare("SELECT COUNT(*) n FROM deleted_events").get().n, 0);
});

test("the survivor's own paid placement and picture are never touched; a keep-side organizer means only blanks are filled by default", async () => {
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM events").run();
  insEv(raw, "keepme", { name: "Keep Name", featured: 2, featured_until: ptToday(30), hours: "6pm", image: "https://img.example.org/k.jpg" });
  insEv(raw, "u-dup-one-aaaaaa", { name: "Other Name", hours: "7pm", blurb: "A fuller description", url: "https://dup.example.org/", featured: 1, featured_until: ptToday(10), image: "https://img.example.org/d.jpg" });
  insSub(raw, "s-keep", "keepme");
  const p = await (await preview(env, "keepme", "u-dup-one-aaaaaa")).json();
  assert.equal(p.managed, "keep"); assert.deepEqual(p.defaults, ["description", "web"], "only what the survivor is missing");
  assert.ok(p.warnings.some((w) => /Featured or banner setting/.test(w)));
  assert.equal((await merge(env, { keep: "keepme", duplicate: "u-dup-one-aaaaaa" })).status, 200);
  const k = ev(raw, "keepme"); assert.equal(k.name, "Keep Name"); assert.equal(k.hours, "6pm"); assert.equal(k.blurb, "A fuller description"); assert.equal(k.url, "https://dup.example.org/"); assert.equal(k.featured, 2); assert.equal(k.featured_until, ptToday(30)); assert.equal(k.image, "https://img.example.org/k.jpg");
});

test("photos from both listings are combined, the duplicate's first, at most 4, none twice", async () => {
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM events").run();
  insEv(raw, "keep-one-aaaa", { owner_photos: JSON.stringify(["e/keep-one-aaaa/1700000000010.jpg", "e/shared/1700000000011.jpg", "e/keep-one-aaaa/1700000000012.jpg"]) });
  insEv(raw, "u-dup-photos-aaaaaa", { owner_photos: JSON.stringify(["e/u-dup-photos-aaaaaa/1700000000020.jpg", "e/shared/1700000000011.jpg"]) });
  assert.equal((await merge(env, { keep: "keep-one-aaaa", duplicate: "u-dup-photos-aaaaaa", fields: ["photos"] })).status, 200);
  assert.deepEqual(JSON.parse(ev(raw, "keep-one-aaaa").owner_photos), ["e/u-dup-photos-aaaaaa/1700000000020.jpg", "e/shared/1700000000011.jpg", "e/keep-one-aaaa/1700000000010.jpg", "e/keep-one-aaaa/1700000000012.jpg"]);
});

test("choosing no fields still moves the submissions and removes the duplicate; bad input is refused", async () => {
  const { env, raw } = newEnv(); seedTrolley(raw);
  assert.equal((await merge(env, { keep: "trolley", duplicate: "trolley" })).status, 400);
  assert.equal((await merge(env, { keep: "trolley", duplicate: "nope-nope" })).status, 404);
  assert.equal((await merge(env, { keep: "trolley", duplicate: TROLLEY, fields: ["name", "password"] })).status, 400);
  assert.equal((await merge(env, { keep: "trolley", duplicate: TROLLEY, fields: "name" })).status, 400);
  assert.ok(ev(raw, TROLLEY), "refusals change nothing");
  assert.equal((await merge(env, { keep: "trolley", duplicate: TROLLEY, fields: [] })).status, 200);
  assert.equal(ev(raw, "trolley").name, "Holiday Sights Trolley Tour"); assert.equal(raw.prepare("SELECT event_id FROM event_submissions").get().event_id, "trolley"); assert.equal(ev(raw, TROLLEY), null);
});

test("Undo (events/restore) brings the duplicate back, puts the survivor's fields back and points the submission home again; later edits to the survivor survive", async () => {
  const { env, raw } = newEnv(); seedTrolley(raw);
  assert.equal((await merge(env, { keep: "trolley", duplicate: TROLLEY })).status, 200);
  raw.prepare("UPDATE events SET hours = '4pm-9pm', notice = 'Closed Dec 25' WHERE id = 'trolley'").run(); // edited after the merge
  const r = await (await restore(env, [TROLLEY])).json(); assert.deepEqual(r.restored, [TROLLEY]);
  const d = ev(raw, TROLLEY); assert.match(d.name, /Festive Nights/); assert.equal(d.owner_photos, JSON.stringify(["e/" + TROLLEY + "/1700000000001.jpg"]));
  const k = ev(raw, "trolley"); assert.equal(k.name, "Holiday Sights Trolley Tour"); assert.equal(k.price, "Tour fare"); assert.equal(k.url, "https://www.sandiego.org/x"); assert.equal(k.owner_photos, null); assert.equal(k.lat, 32.7550);
  assert.equal(k.hours, "4pm-9pm", "an edit made after the merge is kept"); assert.equal(k.notice, "Closed Dec 25");
  assert.equal(raw.prepare("SELECT event_id FROM event_submissions WHERE id = '87e325f57ab44c28'").get().event_id, TROLLEY);
  assert.equal(raw.prepare("SELECT COUNT(*) n FROM deleted_events").get().n, 0);
});

test("the Admin log records the merge: who, the survivor, the duplicate removed, what moved and which fields changed", async () => {
  const { env, raw } = newEnv({ ADMIN_DEV_BYPASS: "1" }); seedTrolley(raw);
  const body = JSON.stringify({ id: "trolley", keep: "trolley", duplicate: TROLLEY, action: "merge" });
  const mk = () => new Request("http://localhost:8788/api/admin/events/merge", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:8788" }, body });
  const ctx = { request: mk(), env, data: {}, next: () => mergePost({ request: mk(), env, data: ctx.data }) }; // the handler shares the middleware's data object, as in Pages
  const res = await middleware(ctx); assert.equal(res.status, 200);
  const l = raw.prepare("SELECT * FROM admin_log ORDER BY id DESC LIMIT 1").get();
  assert.equal(l.area, "events"); assert.equal(l.action, "merge"); assert.equal(l.target_id, "trolley"); assert.equal(l.label, "Holiday Sights Trolley Tour", "the survivor, named as it was before");
  const d = JSON.parse(l.detail); assert.match(d.merged_from, new RegExp("^" + TROLLEY)); assert.equal(d.moved, "1 in event_submissions"); assert.ok(Array.isArray(d.name) && /Festive Nights/.test(d.name[1]), "changed fields keep their before and after");
  assert.equal(raw.prepare("SELECT COUNT(*) n FROM admin_log WHERE action = 'merge'").get().n, 1);
});

test("a preview request (GET) is never written to the Admin log", async () => {
  const { env, raw } = newEnv({ ADMIN_DEV_BYPASS: "1" }); seedTrolley(raw);
  const req = () => new Request(`http://localhost:8788/api/admin/events/merge?keep=trolley&duplicate=${TROLLEY}`);
  const ctx = { request: req(), env, data: {}, next: () => previewGet({ request: req(), env }) };
  assert.equal((await middleware(ctx)).status, 200); assert.equal(raw.prepare("SELECT COUNT(*) n FROM admin_log").get().n, 0);
});
