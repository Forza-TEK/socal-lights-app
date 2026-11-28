// Audit F-03: "This is my event" saves the full previous events row (who, when, why) and Admin can revert it. Nothing reaches Stripe or a mailbox.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestGet as matchGet } from "../functions/api/events/match.js";
import { onRequestPost as submitEvent } from "../functions/api/submit-event.js";
import { onRequestPost as revertPost } from "../functions/api/admin/events/revert.js";
import { onRequestGet as revertGet } from "../functions/api/admin/events/[id].js";
import { onRequest as middleware } from "../functions/api/admin/_middleware.js";
import { deleteAccount } from "../functions/_lib/account.js";
import { CITY } from "../public/cities.js";
import { newEnv, addUser, stubFetch, ptToday } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const [LAT, LNG] = CITY["San Diego"];
const world = () => stubFetch((url) => { url = String(url); if (/census/.test(url)) return new Response(JSON.stringify({ result: { addressMatches: [{ coordinates: { x: LNG + 0.001, y: LAT + 0.001 }, matchedAddress: "4010 TWIGGS ST" }] } })); if (/api\.resend\.com/.test(url)) return new Response("{}"); return new Response("", { status: 404 }); });
const seed = (raw) => {
  raw.prepare("DELETE FROM events").run();
  const ins = raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address,image) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  ins.run("trolley", "Holiday Sights Trolley Tour", "San Diego", "Old Town", "tour", ptToday(20), ptToday(50), "confirmed", 0, "Tour fare", "Daily", LAT + 0.0005, LNG + 0.0005, "sweep blurb", "https://www.sandiego.org/x", "christmas", "Old Town Market", "4010 Twiggs St, San Diego, CA 92110", "https://img.example.org/t.jpg");
  ins.run("posadas", "Las Posadas in Old Town San Diego", "San Diego", "San Diego", "walk", ptToday(30), ptToday(30), "confirmed", 1, "Free", "5pm", LAT + 0.002, LNG + 0.002, "x", "https://x.example.org/p", "christmas", "Old Town State Park", "4002 Wallace St, San Diego, CA 92110", null);
};
const body = (o = {}) => ({ name: "Old Town Trolley’s Holiday Sights and Festive Nights Tour", city: "San Diego", season: "christmas", type: "tour", start: ptToday(20), end: ptToday(50), hours: "5:30pm-8:00pm", free: false, price: "Adults from $35", blurb: "Sing along to holiday tunes on a decorated trolley led by elf conductors.", url: "", venue: "Old Town Market", address: "4010 Twiggs Street", ...o });
const post = (env, b, cookie) => submitEvent({ request: new Request(ORIGIN + "/api/submit-event", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": "203.0.113.9", cookie }, body: JSON.stringify(b) }), env, waitUntil() {} });
const matches = async (env, cookie) => (await (await matchGet({ request: new Request(ORIGIN + "/api/events/match?" + new URLSearchParams({ name: "Old Town Trolley’s Holiday Sights and Festive Nights Tour", city: "San Diego", start: ptToday(20), end: ptToday(50), address: "4010 Twiggs Street" }), { headers: { cookie } }), env })).json()).matches;

const revertCall = (env, b) => revertPost({ request: new Request(ORIGIN + "/api/admin/events/revert", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }), env, data: { admin: { email: "rey@forza-tek.com" } } });
const viaMiddleware = (env, b) => middleware({ request: new Request("http://localhost:8788/api/admin/events/revert", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:8788" }, body: JSON.stringify(b) }), env, data: {}, next: () => revertPost({ request: new Request("http://localhost:8788/api/admin/events/revert", { method: "POST", body: JSON.stringify(b) }), env, data: { admin: { email: "dev@localhost" } } }) });
const lastEdit = async (env) => (await (await revertGet({ params: { id: "trolley" }, env })).json()).last_edit;

test("a takeover saves the whole previous events row, who and why; a refused takeover saves nothing", async () => {
  const { env, raw } = newEnv(); seed(raw); const u = await addUser(raw, "u1", "talpizar@historictours.com"), b = await addUser(raw, "u2", "b@example.com"), w = world();
  try {
    raw.prepare("UPDATE events SET featured = 1, notice = 'Closed Mondays' WHERE id = 'trolley'").run();
    assert.equal((await post(env, body({ match_id: "trolley" }), u.cookie)).status, 200);
    const h = raw.prepare("SELECT * FROM event_edit_history").all(); assert.equal(h.length, 1);
    const row = JSON.parse(h[0].row); assert.equal(row.id, "trolley"); assert.equal(row.name, "Holiday Sights Trolley Tour"); assert.equal(row.hours, "Daily"); assert.equal(row.image, "https://img.example.org/t.jpg"); assert.equal(row.featured, 1); assert.equal(row.notice, "Closed Mondays");
    assert.equal(h[0].by_email, "talpizar@historictours.com"); assert.equal(h[0].by_user_id, "u1"); assert.match(h[0].reason, /This is my event/); assert.ok(h[0].created_at);
    assert.equal(h[0].submission_id, raw.prepare("SELECT id FROM event_submissions WHERE event_id = 'trolley'").get().id);
    assert.equal((await post(env, body({ match_id: "trolley" }), b.cookie)).status, 409);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_edit_history").get().n, 1, "a refused takeover saves nothing");
  } finally { w.restore(); }
});

test("if the old row cannot be saved the listing is not changed", async () => {
  const { env, raw } = newEnv(); seed(raw); const u = await addUser(raw, "u1", "t@example.com"), w = world();
  try {
    raw.exec("DROP TABLE event_edit_history");
    assert.equal((await post(env, body({ match_id: "trolley" }), u.cookie)).status, 503);
    assert.equal(raw.prepare("SELECT name FROM events WHERE id = 'trolley'").get().name, "Holiday Sights Trolley Tour");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_submissions WHERE event_id = 'trolley'").get().n, 0);
  } finally { w.restore(); }
});

test("Admin revert restores the saved details, keeps the paid placement, photos and video, is logged, and a second click has nothing left", async () => {
  const { env, raw } = newEnv(); env.ADMIN_DEV_BYPASS = "1"; seed(raw); const u = await addUser(raw, "u1", "talpizar@historictours.com"), w = world();
  try {
    assert.equal((await post(env, body({ match_id: "trolley" }), u.cookie)).status, 200);
    raw.prepare("UPDATE events SET featured = 2, featured_until = ?, owner_photos = ?, video_file = 'ev/trolley/1700000000001.mp4' WHERE id = 'trolley'").run(ptToday(40), JSON.stringify(["e/trolley/1700000000002.jpg"]));
    assert.equal((await lastEdit(env)).by, "talpizar@historictours.com");
    const r = await viaMiddleware(env, { id: "trolley", action: "revert" }), d = await r.json(); assert.equal(r.status, 200); assert.equal(d.ok, true); assert.equal(d.unlinked, false);
    const e = raw.prepare("SELECT * FROM events WHERE id = 'trolley'").get();
    assert.equal(e.name, "Holiday Sights Trolley Tour"); assert.equal(e.hours, "Daily"); assert.equal(e.price, "Tour fare"); assert.equal(e.status, "confirmed"); assert.equal(e.address, "4010 Twiggs St, San Diego, CA 92110"); assert.equal(e.blurb, "sweep blurb");
    assert.equal(e.featured, 2, "a paid pin bought after the takeover stays"); assert.equal(e.owner_photos, JSON.stringify(["e/trolley/1700000000002.jpg"])); assert.equal(e.video_file, "ev/trolley/1700000000001.mp4");
    const h = raw.prepare("SELECT reverted_at, reverted_by FROM event_edit_history").get(); assert.ok(h.reverted_at); assert.equal(h.reverted_by, "dev@localhost");
    assert.equal(raw.prepare("SELECT contact_email FROM event_submissions WHERE event_id = 'trolley'").get().contact_email, "talpizar@historictours.com", "access is kept unless unlink is chosen");
    const log = raw.prepare("SELECT * FROM admin_log WHERE area = 'events'").all(); assert.equal(log.length, 1); assert.equal(log[0].action, "revert"); assert.equal(log[0].target_id, "trolley"); assert.equal(log[0].admin, "dev@localhost"); assert.match(log[0].detail, /"name":\["Old Town Trolley/);
    assert.equal((await revertCall(env, { id: "trolley" })).status, 404, "nothing left to revert");
    assert.equal(await lastEdit(env), null);
  } finally { w.restore(); }
});

test("Admin revert can also remove the organizer's access; bad ids and events without history are refused", async () => {
  const { env, raw } = newEnv(); seed(raw); const u = await addUser(raw, "u1", "t@example.com"), w = world();
  try {
    assert.equal((await post(env, body({ match_id: "trolley" }), u.cookie)).status, 200);
    assert.equal((await revertCall(env, { id: "" })).status, 400); assert.equal((await revertCall(env, { id: "posadas" })).status, 404); assert.equal((await revertCall(env, { id: "../x" })).status, 400);
    const r = await (await revertCall(env, { id: "trolley", unlink: true })).json(); assert.equal(r.unlinked, true);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_submissions WHERE event_id = 'trolley'").get().n, 0);
    assert.equal((await matches(env, u.cookie))[0].managed, false, "the listing can be taken again");
  } finally { w.restore(); }
});

test("deleting the account clears who made the saved change, not the saved row; the admin editor has the button and the version moved", async () => {
  const { env, raw } = newEnv(); seed(raw); const u = await addUser(raw, "u1", "t@example.com"), w = world();
  try {
    assert.equal((await post(env, body({ match_id: "trolley" }), u.cookie)).status, 200);
    await deleteAccount({ ...env, PHOTOS: { delete: async () => {} } }, "u1", "t@example.com");
    const h = raw.prepare("SELECT by_email, by_user_id, row FROM event_edit_history").get(); assert.equal(h.by_email, ""); assert.equal(h.by_user_id, ""); assert.equal(JSON.parse(h.row).id, "trolley");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id = 'trolley'").get().n, 1, "a taken-over listing is not deleted with the account");
  } finally { w.restore(); }
  const js = readFileSync("public/admin/admin.js", "utf8"), idx = readFileSync("public/admin/index.html", "utf8");
  assert.match(js, /Revert the last organizer update/); assert.match(js, /\/api\/admin\/events\/revert/); assert.match(js, /fsec\("Organizer updates"/);
  assert.match(idx, /admin\.js\?v=20261128b/);
});
