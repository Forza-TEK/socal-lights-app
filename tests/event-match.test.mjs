// Adding an event: listings already on the map that look like it are offered, and choosing one updates THAT listing (the organizer becomes its owner, no claim step) instead of adding a second.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestGet as matchGet } from "../functions/api/events/match.js";
import { onRequestPost as submitEvent } from "../functions/api/submit-event.js";
import { matchTokens, streetKey } from "../functions/_lib/eventmatch.js";
import { CITY } from "../public/cities.js";
import { newEnv, addUser, stubFetch, ptToday } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const [LAT, LNG] = CITY["San Diego"];
const world = () => stubFetch((url) => { url = String(url); if (/census/.test(url)) return new Response(JSON.stringify({ result: { addressMatches: [{ coordinates: { x: LNG + 0.001, y: LAT + 0.001 }, matchedAddress: "4010 TWIGGS ST" }] } })); if (/api\.resend\.com/.test(url)) return new Response("{}"); return new Response("", { status: 404 }); });
const seed = (raw) => {
  raw.prepare("DELETE FROM events").run(); // only these two, so the real migration events cannot change the answers
  const ins = raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address,image) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  ins.run("trolley", "Holiday Sights Trolley Tour", "San Diego", "Old Town", "tour", ptToday(20), ptToday(50), "confirmed", 0, "Tour fare", "Daily", LAT + 0.0005, LNG + 0.0005, "sweep blurb", "https://www.sandiego.org/x", "christmas", "Old Town Market", "4010 Twiggs St, San Diego, CA 92110", "https://img.example.org/t.jpg");
  ins.run("posadas", "Las Posadas in Old Town San Diego", "San Diego", "San Diego", "walk", ptToday(30), ptToday(30), "confirmed", 1, "Free", "5pm", LAT + 0.002, LNG + 0.002, "x", "https://x.example.org/p", "christmas", "Old Town State Park", "4002 Wallace St, San Diego, CA 92110", null);
};
const body = (o = {}) => ({ name: "Old Town Trolley’s Holiday Sights and Festive Nights Tour", city: "San Diego", season: "christmas", type: "tour", start: ptToday(20), end: ptToday(50), hours: "5:30pm-8:00pm", free: false, price: "Adults from $35", blurb: "Sing along to holiday tunes on a decorated trolley led by elf conductors.", url: "", venue: "Old Town Market", address: "4010 Twiggs Street", ...o });
const post = (env, b, cookie) => submitEvent({ request: new Request(ORIGIN + "/api/submit-event", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": "203.0.113.9", cookie }, body: JSON.stringify(b) }), env, waitUntil() {} });
const get = (env, cookie, q) => matchGet({ request: new Request(ORIGIN + "/api/events/match?" + new URLSearchParams(q), { headers: { cookie } }), env });
const q = (o = {}) => ({ name: "Old Town Trolley’s Holiday Sights and Festive Nights Tour", city: "San Diego", start: ptToday(20), end: ptToday(50), address: "4010 Twiggs Street", ...o });

test("matching words: generic words are ignored, 's is dropped, and a street key skips the direction and street type", () => {
  assert.deepEqual(matchTokens("Old Town Trolley’s Holiday Sights and Festive Nights Tour").sort(), ["festive", "old", "sights", "town", "trolley"]);
  assert.equal(streetKey("350 W Hillcrest Dr"), "350 hillcrest"); assert.equal(streetKey("350 Hillcrest"), "350 hillcrest"); assert.equal(streetKey("Lake Drive & Crest Forest Dr"), "");
});

test("the match list: the same tour is found (even under another city name), a different event nearby is not; signed in only", async () => {
  const { env, raw } = newEnv(); seed(raw); const u = await addUser(raw, "u1", "talpizar@historictours.com");
  assert.equal((await get(env, "", q())).status, 401);
  const m = (await (await get(env, u.cookie, q())).json()).matches;
  assert.deepEqual(m.map((x) => x.id), ["trolley"], "Las Posadas shares nothing but the neighborhood"); assert.deepEqual(m[0].why, ["similar name", "same street address"]); assert.equal(m[0].mine, false); assert.equal(m[0].managed, false);
  assert.deepEqual((await (await get(env, u.cookie, q({ name: "Chili Cook-Off", address: "1 Elsewhere Way" }))).json()).matches, [], "nothing similar: no step is shown");
  assert.deepEqual((await (await get(env, u.cookie, q({ start: ptToday(120), end: ptToday(121) }))).json()).matches, [], "dates that do not overlap");
});

test("choosing a match updates that listing (the organizer's details win, the sweep's picture stays), makes them the owner, and notes what was there", async () => {
  const { env, raw } = newEnv(); seed(raw); const u = await addUser(raw, "u1", "talpizar@historictours.com"), w = world();
  try {
    const r = await post(env, body({ match_id: "trolley" }), u.cookie), d = await r.json(); assert.equal(r.status, 200); assert.equal(d.status, "published"); assert.equal(d.updated, true); assert.equal(d.id, "trolley");
    const e = raw.prepare("SELECT * FROM events WHERE id = 'trolley'").get();
    assert.equal(e.name, "Old Town Trolley’s Holiday Sights and Festive Nights Tour"); assert.equal(e.hours, "5:30pm-8:00pm"); assert.equal(e.price, "Adults from $35"); assert.equal(e.venue, "Old Town Market"); assert.equal(e.city, "San Diego");
    assert.equal(e.url, "https://www.sandiego.org/x", "no page given: the old one stays"); assert.equal(e.image, "https://img.example.org/t.jpg", "the picture stays");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE lower(name) LIKE '%trolley%'").get().n, 1, "no second listing");
    const s = raw.prepare("SELECT * FROM event_submissions WHERE event_id = 'trolley'").get(); assert.equal(s.contact_email, "talpizar@historictours.com"); assert.equal(s.status, "published"); assert.match(s.note, /updated the existing listing trolley .*Holiday Sights Trolley Tour; /);
    const again = await (await post(env, body({ match_id: "trolley" }), u.cookie)).json(); assert.equal(again.status, "duplicate"); assert.equal(again.mine, true, "now it is theirs");
  } finally { w.restore(); }
});

test("a listing another organizer manages, or an id the matcher would not offer, is refused and left alone", async () => {
  const { env, raw } = newEnv(); seed(raw); const a = await addUser(raw, "u1", "a@example.com"), b = await addUser(raw, "u2", "b@example.com"), w = world();
  try {
    assert.equal((await post(env, body({ match_id: "trolley" }), a.cookie)).status, 200);
    const list = (await (await get(env, b.cookie, q())).json()).matches; assert.equal(list[0].managed, true);
    const r = await post(env, body({ match_id: "trolley", blurb: "Taking over: a different text for the listing." }), b.cookie); assert.equal(r.status, 409);
    assert.notEqual(raw.prepare("SELECT blurb FROM events WHERE id = 'trolley'").get().blurb, "Taking over: a different text for the listing.");
    const x = await post(env, body({ name: "A Completely Unrelated Chili Cook-Off", address: "1 Elsewhere Way", match_id: "posadas" }), b.cookie); assert.equal(x.status, 400, "not offered for what was entered");
    assert.equal(raw.prepare("SELECT name FROM events WHERE id = 'posadas'").get().name, "Las Posadas in Old Town San Diego");
  } finally { w.restore(); }
});

test("the add-event page asks, between 'where' and 'review', only when something matches, and sends the choice", () => {
  const h = readFileSync("public/add-event.html", "utf8"), f = readFileSync("public/addflow.js", "utf8");
  assert.match(h, /id: "match", sec: "Where", title: "Is your event already on the map\?", skip: \(x\) => !\(x\._matches && x\._matches\.length\)/); assert.match(h, /\/api\/events\/match\?/); assert.match(h, /match_id: x\.match \|\| ""/);
  assert.ok(h.indexOf('id: "where"') < h.indexOf('id: "match"') && h.indexOf('id: "match"') < h.indexOf('id: "blurb"')); assert.match(h, /noPersist: \["email", "plan", "nl", "match"\]/);
  assert.match(f, /if \(s\.leave\) \{ S\.busy = true; try \{ await s\.leave\(d\); \} catch \{\} S\.busy = false; \}/);
});
