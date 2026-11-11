// The add flows fix-up (docs/audit 2026-11-11, ADD-01 to ADD-10): receipt emails and their suppression, the duplicate-event states, the edit sheet (address re-geocoded, season, photos,
// text that needs a look goes back to review), and the device-side draft storage. Browser behavior (focus trap, error focus, photos kept on reload, offline message) is in tests/e2e/add-flows.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as submitHome } from "../functions/api/submit.js";
import { onRequestPost as submitEvent } from "../functions/api/submit-event.js";
import { onRequestPost as homesPost } from "../functions/api/me/homes/[id].js";
import { onRequestPost as eventsPost } from "../functions/api/me/events/[id].js";
import { sendReceipt, RECEIPT_MAX_PER_DAY } from "../functions/_lib/receipt.js";
import { addSuppression } from "../functions/_lib/outreach.js";
import { newEnv, addUser, stubFetch, ptToday } from "./_pay.mjs";
import { draftKey, purgeLegacyDrafts, clearAllLocalDrafts } from "../public/drafts-local.js";

const ORIGIN = "https://socallights.app";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const jpeg = (n = "a.jpg") => new File([JPEG], n, { type: "image/jpeg" });
const r2 = () => { const store = new Map(); return { store, put: async (k, v, o) => { store.set(k, { body: v, httpMetadata: o && o.httpMetadata }); }, get: async (k) => store.get(k) || null, delete: async (k) => { for (const x of [].concat(k)) store.delete(x); } }; };
// Stub: geocoders answer a fixed point; Resend records the mail.
const world = (point = [34.15, -118.13]) => { const mails = []; const s = stubFetch((url, init) => {
  url = String(url);
  if (/api\.resend\.com/.test(url)) { mails.push(JSON.parse(init.body)); return new Response("{}", { status: 200 }); }
  if (/census/.test(url)) return new Response(JSON.stringify({ result: { addressMatches: [{ coordinates: { x: point[1], y: point[0] }, matchedAddress: "X" }] } }));
  if (/nominatim/.test(url)) return new Response("[]");
  return new Response("", { status: 404 });
}); return { mails, restore: s.restore }; };
const mkEnv = () => newEnv({ PHOTOS: r2(), RESEND_API_KEY: "re_test", DEV_AUTH: "" });
const homeForm = (o = {}) => { const f = new FormData(); for (const [k, v] of Object.entries({ biz: "Lee Family", title: "Maple Street Lights", city: "Pasadena", desc: "Ten thousand lights synced to music every night.", street: "123 Maple St", zip: "91101", ...o })) f.append(k, v); return f; };
const postHome = (env, form, cookie, ip = "203.0.113.7") => submitHome({ request: new Request(ORIGIN + "/api/submit", { method: "POST", headers: { "CF-Connecting-IP": ip, cookie }, body: form }), env });
const evBody = (o = {}) => ({ name: "Pasadena Holiday Parade", city: "Pasadena", season: "christmas", type: "parade", start: ptToday(20), end: ptToday(20), hours: "6 pm", free: true, blurb: "A lighted holiday parade down Colorado Boulevard.", url: "", venue: "Colorado Blvd", address: "100 E Colorado Blvd", ...o });
const postEvent = (env, b, cookie, ip = "203.0.113.8") => submitEvent({ request: new Request(ORIGIN + "/api/submit-event", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": ip, cookie }, body: JSON.stringify(b) }), env });
const j = async (r) => ({ http: r.status, ...(await r.json()) });
const subjects = (w) => w.mails.map((m) => m.subject);

test("receipt: a home that goes live at once gets 'on the map'; one held for review gets 'we got it'; both link to manage it", async () => {
  const { env, raw } = mkEnv(), w = world(); const u = await addUser(raw, "u1", "owner@example.com");
  try {
    const live = await j(await postHome(env, homeForm(), u.cookie)); assert.equal(live.status, "published"); assert.equal(live.receipt, "sent"); assert.equal(live.email, "owner@example.com");
    const held = await j(await postHome(env, homeForm({ title: "Casino night lights" }), u.cookie)); assert.equal(held.status, "pending"); assert.equal(held.receipt, "sent");
    assert.deepEqual(subjects(w), ["Your home is on the map: Maple Street Lights", "We got your home: Casino night lights"]);
    assert.match(w.mails[0].text, /profile#displays/); assert.match(w.mails[1].text, /A person looks it over before it goes on the map/); assert.match(w.mails[1].text, /We email you when it is on the map/);
    assert.deepEqual(w.mails.map((m) => m.to), [["owner@example.com"], ["owner@example.com"]]);
  } finally { w.restore(); }
});
test("receipt: an event goes live ('on the map') or waits ('we got it', not on the map)", async () => {
  const { env, raw } = mkEnv(), w = world(); const u = await addUser(raw, "u1", "o@example.com");
  try {
    const live = await j(await postEvent(env, evBody(), u.cookie)); assert.equal(live.status, "published"); assert.equal(live.receipt, "sent");
    // a busy day: 100 already published today, so the next waits for review
    const ins = raw.prepare("INSERT INTO event_submissions (id,status,name,city,season,type,start_date,end_date,contact_email) VALUES (?,?,?,?,?,?,?,?,?)");
    for (let i = 0; i < 100; i++) ins.run("x" + i, "published", "n" + i, "Pasadena", "christmas", "parade", ptToday(5), ptToday(5), "z" + i + "@example.com");
    const held = await j(await postEvent(env, evBody({ name: "Altadena Tree Lighting", address: "1 Lake Ave", venue: "Lake Ave Park" }), u.cookie, "203.0.113.9")); assert.equal(held.status, "pending");
    assert.deepEqual(subjects(w), ["Your event is on the map: Pasadena Holiday Parade", "We got your event: Altadena Tree Lighting"]);
    assert.match(w.mails[1].text, /Nothing is public until it is approved/);
  } finally { w.restore(); }
});
test("receipt: not sent to an address that unsubscribed, asked to be removed, or is on the suppression list; the submission still works", async () => {
  const { env, raw } = mkEnv(), w = world();
  try {
    const a = await addUser(raw, "u1", "optout@example.com"); raw.prepare("INSERT INTO email_prefs (email, token, optout) VALUES (?,?,1)").run("optout@example.com", "t".repeat(36));
    const b = await addUser(raw, "u2", "listed@example.com"); await addSuppression(env, "listed@example.com", "manual", "test");
    const c = await addUser(raw, "u3", "fine@example.com");
    for (const u of [a, b]) { const r = await j(await postHome(env, homeForm(), u.cookie, "203.0.113." + u.id.slice(1))); assert.equal(r.status, "published"); assert.equal(r.receipt, "", "the page is not told a mail is coming"); }
    assert.equal(w.mails.length, 0, "no mail to a suppressed address");
    assert.equal((await j(await postHome(env, homeForm(), c.cookie, "203.0.113.30"))).receipt, "sent"); assert.equal(w.mails.length, 1);
    assert.equal(await sendReceipt(env, null, { id: "home_live", to: "not an address", vars: {} }), "invalid");
  } finally { w.restore(); }
});
test("receipt: the existing send throttle applies (20 a day per address, stored hashed)", async () => {
  const { env, raw } = mkEnv(), w = world();
  try {
    for (let i = 0; i < RECEIPT_MAX_PER_DAY; i++) assert.equal(await sendReceipt(env, null, { id: "home_live", to: "busy@example.com", vars: { name: "n", city: "c", map: "m", link: "l" } }), "queued");
    assert.equal(await sendReceipt(env, null, { id: "home_live", to: "busy@example.com", vars: { name: "n", city: "c", map: "m", link: "l" } }), "throttled");
    assert.equal(w.mails.length, RECEIPT_MAX_PER_DAY);
    assert.ok(raw.prepare("SELECT key FROM send_throttle WHERE kind = 'receipt'").all().every((x) => /^[0-9a-f]{32}$/.test(x.key)));
  } finally { w.restore(); }
});

test("duplicate event: your own is 'already on the map' and can be featured; someone else's is never offered Feature and says who to write to; a pending resend says it is waiting", async () => {
  const { env, raw } = mkEnv(), w = world(); const u = await addUser(raw, "u1", "o@example.com"), v = await addUser(raw, "u2", "other@example.com");
  try {
    const first = await j(await postEvent(env, evBody({ start: ptToday(10), end: ptToday(10) }), u.cookie)); assert.equal(first.status, "published"); assert.equal(first.featurable, true);
    const mine = await j(await postEvent(env, evBody({ start: ptToday(10), end: ptToday(10) }), u.cookie, "203.0.113.50"));
    assert.equal(mine.status, "duplicate"); assert.equal(mine.mine, true); assert.equal(mine.featurable, true); assert.match(mine.message, /already added this event/);
    const other = await j(await postEvent(env, evBody({ start: ptToday(10), end: ptToday(10) }), v.cookie, "203.0.113.51"));
    assert.equal(other.status, "duplicate"); assert.equal(other.mine, false); assert.equal(other.featurable, false);
    // too far ahead to feature yet (featuring opens 30 days before)
    const far = await j(await postEvent(env, evBody({ name: "Spring Bloom Walk Far", address: "9 Far St", start: ptToday(200), end: ptToday(200) }), u.cookie, "203.0.113.52")); assert.equal(far.featurable, false);
    // a pending one sent again
    raw.prepare("INSERT INTO event_submissions (id,status,name,city,season,type,start_date,end_date,contact_email) VALUES ('p1','pending','Waiting Event Name','Pasadena','christmas','parade',?,?,?)").run(ptToday(15), ptToday(15), "o@example.com");
    const again = await j(await postEvent(env, evBody({ name: "Waiting Event Name", address: "7 Wait St", start: ptToday(15), end: ptToday(15) }), u.cookie, "203.0.113.53"));
    assert.equal(again.status, "pending"); assert.equal(again.duplicate, true); assert.match(again.message, /waiting for review/);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_submissions WHERE name = 'Waiting Event Name'").get().n, 1);
  } finally { w.restore(); }
});

const editHome = (env, id, cookie, body, isForm) => homesPost({ params: { id }, env, request: new Request(`${ORIGIN}/api/me/homes/${id}`, { method: "POST", headers: { origin: ORIGIN, cookie, ...(isForm ? {} : { "content-type": "application/json" }) }, body: isForm ? body : JSON.stringify(body) }) });
test("edit sheet (home): season, a changed address is looked up again (pin and county move), same checks as a new home", async () => {
  const { env, raw } = mkEnv(), w = world([34.15, -118.13]); const u = await addUser(raw, "u1", "o@example.com");
  try {
    const made = await j(await postHome(env, homeForm(), u.cookie)); const before = raw.prepare("SELECT lat,lng FROM posts WHERE id = ?").get(made.id);
    w.restore(); const w2 = world([34.2, -118.2]);
    try {
      const bad = await j(await editHome(env, made.id, u.cookie, { action: "edit", street: "5 Elm", city: "Pasadena", zip: "9110" })); assert.equal(bad.http, 400); assert.match(bad.error, /5 digits/);
      assert.equal((await j(await editHome(env, made.id, u.cookie, { action: "edit", street: "5 Elm", city: "Gotham", zip: "91101" }))).http, 400);
      const ok = await j(await editHome(env, made.id, u.cookie, { action: "edit", season: "halloween", street: "500 Colorado Blvd", city: "Pasadena", zip: "91101" }));
      assert.equal(ok.http, 200); assert.equal(ok.located, true); assert.equal(ok.review, false);
      const p = raw.prepare("SELECT season,street,address,lat,lng,status FROM posts WHERE id = ?").get(made.id);
      assert.equal(p.season, "halloween"); assert.equal(p.street, "500 Colorado Blvd"); assert.match(p.address, /500 Colorado Blvd, Pasadena, CA 91101/); assert.equal(p.lat, 34.2); assert.notEqual(p.lat, before.lat); assert.equal(p.status, "approved");
      assert.ok(raw.prepare("SELECT 1 FROM listing_changes WHERE post_id = ? AND field = 'Street address'").get(made.id), "the change is logged");
    } finally { w2.restore(); }
  } finally { try { w.restore(); } catch {} }
});
test("edit sheet (home): text that needs a look takes the home off the map and back into review (photos made private), and says so", async () => {
  const bucket = r2(), { env, raw } = newEnv({ PHOTOS: bucket, RESEND_API_KEY: "re_test" }), w = world(); const u = await addUser(raw, "u1", "o@example.com");
  try {
    const f = homeForm(); f.append("photos", jpeg()); const made = await j(await postHome(env, f, u.cookie));
    assert.ok([...bucket.store.keys()].every((k) => k.startsWith("p/")));
    const r = await j(await editHome(env, made.id, u.cookie, { action: "edit", desc: "Best casino bonus lights for everyone tonight" }));
    assert.equal(r.http, 200); assert.equal(r.review, true);
    const p = raw.prepare("SELECT status, approved_at, photos FROM posts WHERE id = ?").get(made.id); assert.equal(p.status, "pending"); assert.equal(p.approved_at, null);
    assert.ok(JSON.parse(p.photos).every((k) => k.startsWith("pending/")) && [...bucket.store.keys()].every((k) => k.startsWith("pending/")));
  } finally { w.restore(); }
});
test("edit sheet (home): add photos (same checks as a new home: 8 at most, real images), remove one, make one the cover; only the poster", async () => {
  const bucket = r2(), { env, raw } = newEnv({ PHOTOS: bucket, RESEND_API_KEY: "re_test" }), w = world(); const u = await addUser(raw, "u1", "o@example.com"), v = await addUser(raw, "u2", "x@example.com");
  try {
    const made = await j(await postHome(env, homeForm(), u.cookie)); assert.deepEqual(JSON.parse(raw.prepare("SELECT photos FROM posts WHERE id = ?").get(made.id).photos), []);
    const fd = new FormData(); fd.append("photos", jpeg("a.jpg")); fd.append("photos", jpeg("b.jpg"));
    const added = await j(await editHome(env, made.id, u.cookie, fd, true)); assert.equal(added.http, 200); assert.equal(added.photos.length, 2); assert.ok(added.photos.every((k) => k.startsWith(`p/${made.id}/`) && bucket.store.has(k)));
    assert.equal((await j(await editHome(env, made.id, v.cookie, fd, true))).http, 404, "another account cannot touch it");
    const notImg = new FormData(); notImg.append("photos", new File([new Uint8Array(12)], "x.jpg")); assert.match((await j(await editHome(env, made.id, u.cookie, notImg, true))).error, /JPG, PNG or WebP/);
    const many = new FormData(); for (let i = 0; i < 7; i++) many.append("photos", jpeg()); assert.match((await j(await editHome(env, made.id, u.cookie, many, true))).error, /room for 6 more/);
    const [a, b] = added.photos;
    const cov = await j(await editHome(env, made.id, u.cookie, { action: "coverphoto", key: b })); assert.deepEqual(cov.photos, [b, a]);
    const rm = await j(await editHome(env, made.id, u.cookie, { action: "removephoto", key: b })); assert.deepEqual(rm.photos, [a]); assert.equal(bucket.store.has(b), false);
    assert.equal((await j(await editHome(env, made.id, u.cookie, { action: "removephoto", key: "p/zzz/1.jpg" }))).http, 404);
  } finally { w.restore(); }
});
test("edit sheet (event): season, type, city and address; a new address moves the pin; words that need a look are refused like a new event", async () => {
  const { env, raw } = mkEnv(), w = world([34.15, -118.13]); const u = await addUser(raw, "u1", "o@example.com");
  try {
    const made = await j(await postEvent(env, evBody(), u.cookie)); const sub = raw.prepare("SELECT id FROM event_submissions").get();
    w.restore(); const w2 = world([34.3, -118.3]);
    try {
      const ev = (b) => eventsPost({ params: { id: sub.id }, env, request: new Request(`${ORIGIN}/api/me/events/${sub.id}`, { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json", cookie: u.cookie }, body: JSON.stringify({ action: "edit", ...b }) }) }).then(j);
      assert.equal((await ev({ season: "halloween", type: "parade" })).http, 400, "a type that is not in the season");
      assert.equal((await ev({ address: "x" })).http, 400); assert.equal((await ev({ city: "Gotham" })).http, 400);
      assert.equal((await ev({ name: "Crypto holiday lights party" })).http, 400);
      const ok = await ev({ season: "halloween", type: "haunt", address: "200 N Lake Ave" }); assert.equal(ok.http, 200, JSON.stringify(ok));
      const row = raw.prepare("SELECT season,type,address,lat FROM events WHERE id = ?").get(made.id); assert.equal(row.season, "halloween"); assert.equal(row.address, "200 N Lake Ave"); assert.equal(row.lat, 34.3);
    } finally { w2.restore(); }
  } finally { try { w.restore(); } catch {} }
});

test("drafts on the device are keyed by account, legacy unkeyed drafts are removed, and signing out clears every one", () => {
  const store = new Map(); globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), get length() { return store.size; }, key: (i) => [...store.keys()][i] };
  Object.defineProperty(globalThis.localStorage, "__keys", { value: () => [...store.keys()] });
  const real = Object.keys; Object.keys = (o) => (o === globalThis.localStorage ? [...store.keys()] : real(o));
  try {
    assert.equal(draftKey("scl-house-draft", "u1"), "scl-house-draft:u1"); assert.notEqual(draftKey("scl-house-draft", "u1"), draftKey("scl-house-draft", "u2")); assert.equal(draftKey("scl-event-draft", ""), "scl-event-draft:anon");
    for (const k of ["scl-house-draft", "scl-event-draft", "scl-entry-draft-oak-hill", "scl-house-draft:u1", "scl-entry-draft-oak-hill:u1", "scl-theme"]) store.set(k, "{}");
    purgeLegacyDrafts(); assert.deepEqual([...store.keys()].sort(), ["scl-entry-draft-oak-hill:u1", "scl-house-draft:u1", "scl-theme"]);
    clearAllLocalDrafts(); assert.deepEqual([...store.keys()], ["scl-theme"], "sign-out leaves only unrelated keys");
  } finally { Object.keys = real; delete globalThis.localStorage; }
});
