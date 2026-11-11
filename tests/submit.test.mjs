// Public submission endpoints: "Showcase a house / installer" (submit.js) and "Add your event" (submit-event.js).
// Sign-in replaced Turnstile and the honeypot on these two forms (there is no honeypot field in the code), so what is tested is: sign-in required, validation, rate limits, geocode success and failure, page verification, auto-publish.
// Geocoders, the event page and R2 are stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as submitHome } from "../functions/api/submit.js";
import { onRequestPost as submitEvent } from "../functions/api/submit-event.js";
import { newEnv, addUser, stubFetch, ptToday } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const jpeg = (name = "a.jpg") => new File([JPEG], name, { type: "image/jpeg" });
// A tiny in-memory R2: put/get/delete, with every key ever put or deleted recorded.
const r2 = () => { const store = new Map(), puts = [], dels = []; return { store, puts, dels, put: async (k, v, o) => { puts.push(k); store.set(k, { body: v, httpMetadata: o && o.httpMetadata }); }, get: async (k) => store.get(k) || null, delete: async (k) => { for (const x of [].concat(k)) { dels.push(x); store.delete(x); } } }; };

// Geocoder stub: the US Census answers { matches }, OpenStreetMap answers [hit]; anything else (an event page) is answered by `page`.
const geo = ({ census = null, osm = null, down = false, page = null } = {}) => stubFetch((url) => {
  url = String(url);
  if (down && /census|nominatim/.test(url)) throw new Error("geocoder down");
  if (/census/.test(url)) return new Response(JSON.stringify({ result: { addressMatches: census ? [{ coordinates: { x: census[1], y: census[0] }, matchedAddress: "1 MAIN ST, PASADENA, CA" }] : [] } }));
  if (/nominatim/.test(url)) return new Response(JSON.stringify(osm ? [{ lat: String(osm[0]), lon: String(osm[1]), display_name: "1 Main St, Pasadena" }] : []));
  if (page === "down") throw new Error("page down");
  return new Response(page ?? "", { status: page == null ? 404 : 200 });
});
const PASADENA = [34.148, -118.144];

// ---------------- house / installer posts ----------------
const homeForm = (o = {}) => { const f = new FormData(); const d = { biz: "Lee Family", title: "Maple Street Lights", city: "Pasadena", desc: "Ten thousand lights synced to music every night.", street: "123 Maple St", zip: "91101", ...o }; for (const [k, v] of Object.entries(d)) if (v !== undefined && v !== null) f.append(k, v); return f; };
const postHome = (env, form, cookie, ip = "203.0.113.7") => submitHome({ request: new Request(ORIGIN + "/api/submit", { method: "POST", headers: { "CF-Connecting-IP": ip, ...(cookie ? { cookie } : {}) }, body: form }), env });
const body = async (r) => ({ ...(await r.json()), http: r.status }); // http = the HTTP status; status = the post or event status in the answer

test("house post: needs a signed-in account", async () => {
  const { env } = newEnv({ PHOTOS: r2() });
  const r = await body(await postHome(env, homeForm())); assert.equal(r.http, 401);
});
test("house post: validation messages (name, city, zip, address, installer rules, photos)", async () => {
  const { env, raw } = newEnv({ PHOTOS: r2() }); const u = await addUser(raw, "u1", "owner@example.com"), f = geo();
  try {
    const bad = async (over, re, form) => { const r = await body(await postHome(env, form || homeForm(over), u.cookie)); assert.equal(r.http, 400, JSON.stringify(over)); assert.match(r.error, re, JSON.stringify(over)); };
    await bad({ biz: "" }, /Fill in/);
    await bad({ title: "" }, /Fill in/);
    await bad({ desc: "" }, /Fill in/);
    await bad({ city: "Gotham" }, /Choose a city/);
    await bad({ zip: "9110" }, /ZIP/);
    await bad({ street: "", address: "x" }, /street address/);
    await bad({ kind: "installer" }, /website or a phone/);
    await bad({ kind: "installer", web: "example.com" }, /permission/);
    await bad({ kind: "installer", web: "not a site !!", phone: "626-555-0100", permission: "1" }, /valid website/);
    const many = homeForm(); for (let i = 0; i < 9; i++) many.append("photos", jpeg()); await bad({}, /up to 8/, many);
    const notImg = homeForm(); notImg.append("photos", new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])], "x.jpg")); await bad({}, /JPG, PNG or WebP/, notImg);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM posts").get().n, 0);
  } finally { f.restore(); }
});
test("house post: geocode success pins the exact address and publishes right away; the account email is used, not the form's", async () => {
  const bucket = r2(), { env, raw } = newEnv({ PHOTOS: bucket }); const u = await addUser(raw, "u1", "owner@example.com"), f = geo({ census: [34.15, -118.13] });
  try {
    const form = homeForm({ email: "someone-else@example.com" }); form.append("photos", jpeg());
    const r = await body(await postHome(env, form, u.cookie));
    assert.equal(r.http, 200); assert.equal(r.ok, true);
    const p = raw.prepare("SELECT * FROM posts WHERE id = ?").get(r.id);
    assert.equal(p.contact_email, "owner@example.com"); assert.equal(p.user_id, "u1");
    assert.equal(p.lat, 34.15); assert.equal(p.lng, -118.13);
    assert.equal(p.status, "approved", "homes go live straight away"); assert.equal(r.status, "published");
    assert.equal(bucket.puts.length >= 1, true, "the photo was saved to R2");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM submit_log").get().n, 1);
  } finally { f.restore(); }
});
test("house post: geocoder failure or far-away match falls back to the city center and still saves", async () => {
  const { env, raw } = newEnv({ PHOTOS: r2() }); const u = await addUser(raw, "u1", "owner@example.com");
  for (const stub of [{ down: true }, {}, { census: [40.7, -74.0] }]) {
    const f = geo(stub);
    try {
      const r = await body(await postHome(env, homeForm({ biz: "Biz " + JSON.stringify(stub) }), u.cookie, "198.51.100." + Math.floor(Math.random() * 200)));
      assert.equal(r.http, 200, JSON.stringify(stub));
      const p = raw.prepare("SELECT lat, lng FROM posts WHERE id = ?").get(r.id); assert.deepEqual([p.lat, p.lng], PASADENA, JSON.stringify(stub));
    } finally { f.restore(); }
  }
});
test("house post: spammy words hold it for review; installers need website or phone and get a profile", async () => {
  const { env, raw } = newEnv({ PHOTOS: r2() }); const u = await addUser(raw, "u1", "pro@example.com"), f = geo({ census: PASADENA });
  try {
    const spam = await body(await postHome(env, homeForm({ desc: "Best casino bonus lights" }), u.cookie)); assert.equal(spam.http, 200);
    assert.equal(raw.prepare("SELECT status FROM posts WHERE id = ?").get(spam.id).status, "pending");
    const inst = await body(await postHome(env, homeForm({ kind: "installer", biz: "Bright Install Co", web: "brightinstall.example.com", permission: "1" }), u.cookie, "198.51.100.5")); assert.equal(inst.http, 200);
    const p = raw.prepare("SELECT poster_type, installer_id, installer_confirmed, web FROM posts WHERE id = ?").get(inst.id);
    assert.equal(p.poster_type, "installer"); assert.ok(p.installer_id); assert.equal(p.installer_confirmed, 1); assert.match(p.web, /brightinstall/);
  } finally { f.restore(); }
});
test("house post: 5 a day per account; the 429 says which limit and when it resets; other accounts on the same network are not blocked", async () => {
  const { env, raw } = newEnv({ PHOTOS: r2() }); const u = await addUser(raw, "u1", "owner@example.com"), f = geo({ census: PASADENA });
  try {
    for (let i = 0; i < 5; i++) assert.equal((await postHome(env, homeForm({ biz: "B" + i }), u.cookie, "192.0.2.1")).status, 200);
    const res = await postHome(env, homeForm(), u.cookie, "192.0.2.1"), r = await body(res);
    assert.equal(res.status, 429); assert.equal(r.limit, "day");
    assert.match(r.error, /5 homes in the last 24 hours, which is the daily limit for one account/); assert.match(r.error, /in about \d+ hours?/); assert.match(r.error, /info@socallights\.app/);
    assert.ok(Number(res.headers.get("retry-after")) > 0 && r.retry_after === Number(res.headers.get("retry-after")), "Retry-After header and body agree");
    // a different connection does not help: the limit is the account's
    assert.equal((await postHome(env, homeForm(), u.cookie, "192.0.2.2")).status, 429);
    // five other people on the SAME network (a library, a school) are not blocked by it (it used to be 5 submissions an hour for the whole address)
    for (let k = 2; k <= 6; k++) { const o = await addUser(raw, "u" + k, `p${k}@example.com`); assert.equal((await postHome(env, homeForm(), o.cookie, "192.0.2.1")).status, 200, "account " + k); }
  } finally { f.restore(); }
});
test("house post: one network address is capped at 30 an hour, and the message says so with a way to reach us", async () => {
  const { env, raw } = newEnv({ PHOTOS: r2() }); const u = await addUser(raw, "u1", "owner@example.com"), f = geo({ census: PASADENA });
  try {
    const ins = raw.prepare("INSERT INTO submit_log (ip) VALUES (?)"); for (let i = 0; i < 30; i++) ins.run("192.0.2.50");
    const res = await postHome(env, homeForm(), u.cookie, "192.0.2.50"), r = await body(res);
    assert.equal(res.status, 429); assert.equal(r.limit, "connection");
    assert.match(r.error, /This network \(shared Wi-Fi counts as one connection\) has sent 30 submissions in the last hour/); assert.match(r.error, /resets in about (\d+ minutes?|1 hour)/); assert.match(r.error, /email info@socallights\.app/);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM posts").get().n, 0, "nothing was saved");
    assert.equal((await postHome(env, homeForm(), u.cookie, "192.0.2.51")).status, 200, "another address is fine");
  } finally { f.restore(); }
});
// The limits are checked before anything is stored, so a refused post leaves nothing in R2.
test("house post: a refused post (limit) leaves nothing uploaded in R2", async () => {
  const bucket = r2(), { env, raw } = newEnv({ PHOTOS: bucket }); const u = await addUser(raw, "u1", "owner@example.com"), f = geo({ census: PASADENA });
  try {
    for (let i = 0; i < 5; i++) await postHome(env, homeForm({ biz: "B" + i }), u.cookie, "192.0.2." + (10 + i));
    const before = [...bucket.store.keys()].sort(), puts = bucket.puts.length;
    const form = homeForm(); form.append("photos", jpeg());
    assert.equal((await postHome(env, form, u.cookie, "192.0.2.99")).status, 429);
    assert.deepEqual([...bucket.store.keys()].sort(), before); assert.equal(bucket.puts.length, puts, "no upload was even attempted");
  } finally { f.restore(); }
});

// ---------------- events ----------------
const evBody = (o = {}) => ({ name: "Pasadena Holiday Parade", city: "Pasadena", season: "christmas", type: "parade", start: ptToday(20), end: ptToday(20), hours: "6 pm", free: true, blurb: "A lighted holiday parade down Colorado Boulevard.", url: "", venue: "Colorado Blvd", address: "100 E Colorado Blvd", ...o });
const postEvent = (env, b, cookie, { ip = "203.0.113.8", origin } = {}) => submitEvent({ request: new Request(ORIGIN + "/api/submit-event", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": ip, ...(origin ? { origin } : {}), ...(cookie ? { cookie } : {}) }, body: typeof b === "string" ? b : JSON.stringify(b) }), env });

test("event: sign-in and same-origin are required; unreadable body refused", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com");
  assert.equal((await postEvent(env, evBody())).status, 401);
  assert.equal((await postEvent(env, evBody(), u.cookie, { origin: "https://evil.example" })).status, 403);
  assert.equal((await postEvent(env, "not json", u.cookie)).status, 400);
});
test("event: validation messages", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com"), f = geo();
  try {
    const cases = [[{ name: "abc" }, /name/], [{ city: "Gotham" }, /city/], [{ season: "x" }, /season/], [{ type: "nope" }, /event type/], [{ start: "2026-13-45x" }, /dates/], [{ end: ptToday(5) }, /dates/],
      [{ start: ptToday(-5), end: ptToday(-2) }, /already ended/], [{ start: ptToday(600), end: ptToday(601) }, /too far/], [{ url: "ht!tp//bad" }, /web address/], [{ venue: "ab" }, /venue/], [{ address: "x" }, /street address/], [{ blurb: "too short" }, /description/], [{ name: "Casino night for crypto" }, /community event/]];
    for (const [o, re] of cases) { const r = await body(await postEvent(env, evBody(o), u.cookie, { ip: "198.51.100." + Math.floor(Math.random() * 250) })); assert.equal(r.http, 400, JSON.stringify(o)); assert.match(r.error, re, JSON.stringify(o)); }
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_submissions").get().n, 0);
  } finally { f.restore(); }
});
test("event: geocode hit pins it; with a page that mentions the name and year it is confirmed", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com"), year = ptToday(20).slice(0, 4);
  const f = geo({ census: [34.14, -118.15], page: `<h1>Pasadena Holiday Parade ${year}</h1>` });
  try {
    const r = await body(await postEvent(env, evBody({ url: "https://parade.example.org/info" }), u.cookie));
    assert.equal(r.http, 200); assert.equal(r.http, 200);
    const ev = raw.prepare("SELECT * FROM events WHERE id = ?").get(r.id);
    assert.equal(ev.status, "confirmed"); assert.deepEqual([ev.lat, ev.lng], [34.14, -118.15]);
    const sub = raw.prepare("SELECT * FROM event_submissions WHERE id = ?").get(r.submission_id);
    assert.equal(sub.status, "published"); assert.equal(sub.verified, 1); assert.equal(sub.contact_email, "o@example.com");
  } finally { f.restore(); }
});
test("event: geocoder down and no web page: still published as expected, pin at the city center, reasons recorded", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com"), f = geo({ down: true });
  try {
    const r = await body(await postEvent(env, evBody(), u.cookie)); assert.equal(r.http, 200);
    const ev = raw.prepare("SELECT status, lat, lng FROM events WHERE id = ?").get(r.id);
    assert.equal(ev.status, "expected"); assert.deepEqual([ev.lat, ev.lng], PASADENA);
    const note = raw.prepare("SELECT note FROM event_submissions WHERE id = ?").get(r.submission_id).note;
    assert.match(note, /city center/); assert.match(note, /no event web page/);
  } finally { f.restore(); }
});
test("event: a page that is down or does not mention the year leaves it expected", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com");
  for (const page of ["down", "<p>Pasadena Holiday Parade 1999</p>"]) {
    const f = geo({ census: PASADENA, page });
    try {
      const r = await body(await postEvent(env, evBody({ url: "https://parade.example.org/x", name: "Pasadena Holiday Parade " + page.length }), u.cookie, { ip: "198.51.100." + page.length }));
      assert.equal(r.http, 200); assert.equal(raw.prepare("SELECT status FROM events WHERE id = ?").get(r.id).status, "expected", page);
    } finally { f.restore(); }
  }
});
test("event: same name and day as one on the map is reported as a duplicate and adds nothing", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com"), f = geo({ census: PASADENA });
  try {
    const first = await body(await postEvent(env, evBody(), u.cookie)); assert.equal(first.http, 200);
    const again = await body(await postEvent(env, evBody(), u.cookie, { ip: "198.51.100.1" }));
    assert.equal(again.http, 200); assert.equal(again.status, "duplicate"); assert.equal(again.id, first.id);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_submissions").get().n, 1);
  } finally { f.restore(); }
});
test("event: 5 an hour and 8 a day per account (each 429 says which and when it resets); 30 an hour per connection", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com"), f = geo({ census: PASADENA });
  try {
    for (let i = 0; i < 5; i++) assert.equal((await postEvent(env, evBody({ name: "Holiday Show Number " + i, address: i + "00 Main Street" }), u.cookie, { ip: "192.0.2.1" })).status, 200);
    const sixth = await postEvent(env, evBody({ name: "Holiday Show Number 9", address: "950 Main Street" }), u.cookie, { ip: "192.0.2.2" }), r = await body(sixth);
    assert.equal(sixth.status, 429); assert.equal(r.limit, "account"); assert.match(r.error, /5 events in the last hour, which is the limit for one account/); assert.match(r.error, /in about (\d+ minutes?|1 hour)/);
    assert.ok(Number(sixth.headers.get("retry-after")) > 0);
    // after the hour, the daily cap of 8 applies
    raw.prepare("UPDATE event_submissions SET created_at = datetime(created_at, '-2 hours')").run();
    for (let i = 5; i < 8; i++) assert.equal((await postEvent(env, evBody({ name: "Holiday Show Number " + i, address: i + "00 Main Street" }), u.cookie, { ip: "192.0.2.2" })).status, 200);
    const ninth = await postEvent(env, evBody({ name: "Holiday Show Number 10", address: "900 Main Street" }), u.cookie, { ip: "192.0.2.3" }), n = await body(ninth);
    assert.equal(ninth.status, 429, "the 9th event for one account in a day"); assert.equal(n.limit, "day"); assert.match(n.error, /8 events in the last 24 hours, which is the daily limit for one account \(8\)/); assert.match(n.error, /info@socallights\.app/);
    // the connection: 30 an hour
    const ins = raw.prepare("INSERT INTO submit_log (ip) VALUES (?)"); for (let i = 0; i < 30; i++) ins.run("192.0.2.77");
    const o = await addUser(raw, "u2", "p@example.com"), net = await postEvent(env, evBody({ name: "Another Show Number 1", address: "1 Pine Street" }), o.cookie, { ip: "192.0.2.77" }), m = await body(net);
    assert.equal(net.status, 429); assert.equal(m.limit, "connection"); assert.match(m.error, /shared Wi-Fi counts as one connection/);
  } finally { f.restore(); }
});
test("event: after 100 auto-published in a day, new ones wait for review and are not put on the map", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com"), f = geo({ census: PASADENA });
  try {
    for (let i = 0; i < 100; i++) raw.prepare("INSERT INTO event_submissions (id,status,name,city,season,type,start_date,end_date,contact_email) VALUES (?,?,?,?,?,?,?,?,?)").run("s" + i, "published", "n" + i, "Pasadena", "christmas", "walk", "2026-12-01", "2026-12-01", "x" + i + "@example.com");
    const r = await body(await postEvent(env, evBody(), u.cookie)); assert.equal(r.http, 200); assert.equal(r.http, 200);
    const sub = raw.prepare("SELECT status, event_id FROM event_submissions WHERE name = 'Pasadena Holiday Parade'").get();
    assert.equal(sub.status, "pending"); assert.equal(sub.event_id, null);
  } finally { f.restore(); }
});
