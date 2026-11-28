// 2026-11-16 audit of the creation flows (docs/audit/2026-11-16): the listing side.
// H1 "Run again next year", M1 installer stubs from a homeowner's post, M2 unfound address, M3 event page and edits, M4 "this is my home", M6 profile dead ends, L1, L6, L7.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as submitHome } from "../functions/api/submit.js";
import { onRequestPost as submitEvent } from "../functions/api/submit-event.js";
import { onRequestPost as mePost } from "../functions/api/me/events/[id].js";
import { onRequestDelete as homeDelete } from "../functions/api/me/homes/[id].js";
import { newEnv, addUser, stubFetch, ptToday } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const r2 = () => { const store = new Map(); return { store, put: async (k, v) => { store.set(k, v); }, get: async (k) => store.get(k) || null, delete: async (k) => { for (const x of [].concat(k)) store.delete(x); } }; };
const PASADENA = [34.148, -118.144];
const geo = ({ census = null, page = null } = {}) => stubFetch((url) => {
  url = String(url);
  if (/census/.test(url)) return new Response(JSON.stringify({ result: { addressMatches: census ? [{ coordinates: { x: census[1], y: census[0] }, matchedAddress: "1 MAIN ST, PASADENA, CA" }] : [] } }));
  if (/nominatim/.test(url)) return new Response("[]");
  return new Response(page ?? "", { status: page == null ? 404 : 200 });
});
let HSEQ = 0; // every default home gets its own street: the same account adding the same address twice is now refused (audit F-01)
const homeForm = (o = {}) => { const f = new FormData(); const d = { biz: "Lee Family", title: "Maple Street Lights", city: "Pasadena", desc: "Ten thousand lights synced to music every night.", street: `${100 + ++HSEQ} Maple St`, zip: "91101", permission: "1", ...o }; for (const [k, v] of Object.entries(d)) if (v !== undefined && v !== null) f.append(k, v); return f; };
const postHome = async (env, form, cookie, { ip = "203.0.113.7", origin } = {}) => { const r = await submitHome({ request: new Request(ORIGIN + "/api/submit", { method: "POST", headers: { "CF-Connecting-IP": ip, ...(origin ? { origin } : {}), ...(cookie ? { cookie } : {}) }, body: form }), env }); return { http: r.status, ...(await r.json()) }; };
const postEvent = async (env, b, cookie, ip = "203.0.113.8") => { const r = await submitEvent({ request: new Request(ORIGIN + "/api/submit-event", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": ip, cookie }, body: JSON.stringify(b) }), env }); return { http: r.status, ...(await r.json()) }; };
const evBody = (o = {}) => ({ name: "Pasadena Holiday Parade", city: "Pasadena", season: "christmas", type: "parade", start: ptToday(20), end: ptToday(20), hours: "6 pm", free: true, blurb: "A lighted holiday parade down Colorado Boulevard.", url: "", venue: "Colorado Blvd", address: "100 E Colorado Blvd", ...o });
const me = (env, id, body, cookie, ip = "203.0.113.9") => mePost({ params: { id }, env, request: new Request(ORIGIN + "/api/me/events/" + id, { method: "POST", headers: { origin: ORIGIN, cookie, "content-type": "application/json", "CF-Connecting-IP": ip }, body: JSON.stringify(body) }) }).then(async (r) => ({ http: r.status, ...(await r.json()) }));
const read = (p) => readFileSync(p, "utf8");

// An event row the way the add form leaves it, so the copy and edit tests start from the same place
function seedEvent(raw, { id = "s1", status = "published", eventId = "u-oak-1", email = "o@example.com", name = "Oak Hill Tree Lighting", start = ptToday(10), blurb = "A lighted tree and carols in the park for everyone." } = {}) {
  raw.prepare("INSERT INTO event_submissions (id,name,city,county,season,type,start_date,end_date,contact_email,status,event_id,blurb,venue,address,lat,lng,hours,price,free,url,verified) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, name, "Pasadena", "Los Angeles", "christmas", "tree", start, start, email, status, status === "published" ? eventId : null, blurb, "Oak Hill Park", "1 Oak Hill Rd", 34.1, -118.1, "6 pm", "Free", 1, "", 0);
  if (status === "published") raw.prepare("INSERT INTO events (id,name,city,county,type,start_date,end_date,status,lat,lng,season) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(eventId, name, "Pasadena", "Los Angeles", "tree", start, start, "confirmed", 34.1, -118.1, "christmas");
}

// ---------- H1 ----------
test("H1: 'Run again next year' only works on an event that is on the map; one in review or declined cannot be turned into a live copy", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com");
  seedEvent(raw, { id: "pend", status: "pending", name: "Pending Light Show" }); seedEvent(raw, { id: "dec", status: "declined", name: "Declined Light Show" });
  for (const id of ["pend", "dec"]) { const r = await me(env, id, { action: "copy" }, u.cookie); assert.equal(r.http, 400, id); assert.match(r.error, /on the map/); }
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id LIKE 'u-%'").get().n, 0, "nothing was put on the map");
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_submissions").get().n, 2);
});
test("H1: a live event copies once; the copy is Expected, a second copy for the same year is refused, and a different account cannot copy it", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com"), other = await addUser(raw, "u2", "x@example.com");
  seedEvent(raw);
  assert.equal((await me(env, "s1", { action: "copy" }, other.cookie)).http, 404);
  const r = await me(env, "s1", { action: "copy" }, u.cookie); assert.equal(r.http, 200);
  assert.equal(raw.prepare("SELECT status FROM events WHERE id = ?").get(r.id).status, "expected");
  const again = await me(env, "s1", { action: "copy" }, u.cookie); assert.equal(again.http, 409); assert.match(again.error, /already have this event for next year/);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_submissions").get().n, 2);
});
test("H1: a copy counts toward the 8-a-day limit and keeps the review words out", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com");
  for (let i = 0; i < 8; i++) seedEvent(raw, { id: "s" + i, eventId: "u-e" + i, name: "Light Show Number " + i });
  raw.prepare("UPDATE event_submissions SET created_at = datetime('now','-2 hours')").run(); // past the hourly cap, still inside the day
  const r = await me(env, "s0", { action: "copy" }, u.cookie); assert.equal(r.http, 429); assert.match(r.error, /daily limit/);
  const { env: e2, raw: r2raw } = newEnv(); const u2 = await addUser(r2raw, "u1", "o@example.com");
  seedEvent(r2raw, { id: "bad", eventId: "u-bad", name: "Escort Night Lights" });
  assert.equal((await me(e2, "bad", { action: "copy" }, u2.cookie)).http, 400);
});
test("H1: the profile shows 'Run again next year' only for an event that is on the map", () => {
  const html = read("public/profile.html");
  assert.match(html, /\$\{live \? `<select class="btn out sm" data-notice[^`]*data-ecopy>Run again next year<\/button>` : ""\}/);
});

// ---------- M1 ----------
test("M1: a homeowner naming a company nobody has listed gets a hidden stub, not a public profile; BAD words create nothing; deleting the home removes the stub", async () => {
  const { env, raw } = newEnv({ PHOTOS: r2() }); const u = await addUser(raw, "u1", "owner@example.com"), f = geo({ census: PASADENA });
  try {
    const r = await postHome(env, homeForm({ installer_name: "Glow Pros Lighting", installer_web: "glowpros.example.com" }), u.cookie); assert.equal(r.http, 200);
    const inst = raw.prepare("SELECT * FROM installers").get(); assert.equal(inst.status, "pending", "not a public profile"); assert.equal(inst.created_by, "");
    assert.equal(raw.prepare("SELECT installer_id FROM posts WHERE id = ?").get(r.id).installer_id, inst.id);
    // a company that is already public is linked, not changed
    raw.prepare("UPDATE installers SET status = 'active' WHERE id = ?").run(inst.id);
    const r2b = await postHome(env, homeForm({ installer_name: "Glow Pros Lighting", biz: "B2" }), u.cookie, { ip: "198.51.100.2" }); assert.equal(raw.prepare("SELECT status FROM installers").get().status, "active"); assert.equal(raw.prepare("SELECT installer_id FROM posts WHERE id = ?").get(r2b.id).installer_id, inst.id);
    // review words in the company name: no profile at all
    const before = raw.prepare("SELECT COUNT(*) AS n FROM installers").get().n;
    const spam = await postHome(env, homeForm({ installer_name: "Best Casino Lights", biz: "B3" }), u.cookie, { ip: "198.51.100.3" }); assert.equal(spam.http, 200);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM installers").get().n, before); assert.equal(raw.prepare("SELECT installer_id FROM posts WHERE id = ?").get(spam.id).installer_id, null);
    assert.equal(spam.status, "pending", "and the home itself waits for a person");
    // deleting the home that created a stub removes the stub; a profile that is still used stays
    const r4 = await postHome(env, homeForm({ installer_name: "Tinsel Town Installs", biz: "B4" }), u.cookie, { ip: "198.51.100.4" });
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM installers WHERE name = 'Tinsel Town Installs'").get().n, 1);
    const del = await homeDelete({ params: { id: r4.id }, env, request: new Request(ORIGIN + "/api/me/homes/" + r4.id, { method: "DELETE", headers: { origin: ORIGIN, cookie: u.cookie } }) }); assert.equal(del.status, 200);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM installers WHERE name = 'Tinsel Town Installs'").get().n, 0, "the stub went with its only home");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM installers WHERE name = 'Glow Pros Lighting'").get().n, 1, "an active profile is never removed");
  } finally { f.restore(); }
});
test("M1: the notice mail to an installer's contact is capped at 5 a day per profile", async () => {
  const sent = []; const { env, raw } = newEnv({ PHOTOS: r2(), RESEND_API_KEY: "re_test" }); const u = await addUser(raw, "u1", "owner@example.com");
  raw.prepare("INSERT INTO installers (id,slug,name,email,status) VALUES ('i1','glow','Glow Pros','info@glow.example.com','active')").run();
  const f = stubFetch((url, init) => { url = String(url); if (/resend/.test(url)) { sent.push(JSON.parse(init.body).to[0]); return new Response("{}", { status: 200 }); } if (/census/.test(url)) return new Response(JSON.stringify({ result: { addressMatches: [{ coordinates: { x: PASADENA[1], y: PASADENA[0] } }] } })); return new Response("[]"); });
  try {
    for (let i = 0; i < 7; i++) { const user = await addUser(raw, "x" + i, `p${i}@example.com`); await postHome(env, homeForm({ installer_name: "Glow Pros", biz: "B" + i }), user.cookie, { ip: "192.0.2." + i }); }
    assert.equal(sent.filter((t) => t === "info@glow.example.com").length, 5);
  } finally { f.restore(); }
});

// ---------- M2 ----------
test("M2: a home whose address cannot be found, or has no house number, or has review words in the street, waits for review and the answer says so", async () => {
  const { env, raw } = newEnv({ PHOTOS: r2() }); const u = await addUser(raw, "u1", "owner@example.com");
  let f = geo();
  try {
    const nf = await postHome(env, homeForm({ biz: "NF" }), u.cookie, { ip: "198.51.100.1" });
    assert.equal(nf.status, "pending"); assert.equal(nf.located, false); assert.equal(nf.held, "address");
    assert.equal(raw.prepare("SELECT status FROM posts WHERE id = ?").get(nf.id).status, "pending");
  } finally { f.restore(); }
  f = geo({ census: PASADENA });
  try {
    const nn = await postHome(env, homeForm({ biz: "NN", street: "Maple Street" }), u.cookie, { ip: "198.51.100.2" }); assert.equal(nn.status, "pending"); assert.equal(nn.held, "address", "no house number");
    const spam = await postHome(env, homeForm({ biz: "SP", street: "5 Visit casino-win.example for free spins" }), u.cookie, { ip: "198.51.100.3" }); assert.equal(spam.status, "pending"); assert.equal(spam.held, "text");
    const tips = await postHome(env, homeForm({ biz: "TP", where: "Best crypto tips" }), u.cookie, { ip: "198.51.100.4" }); assert.equal(tips.status, "pending", "review words in the 'other tips' box count too");
    const ok = await postHome(env, homeForm({ biz: "OK" }), u.cookie, { ip: "198.51.100.5" }); assert.equal(ok.status, "published"); assert.equal(ok.located, true); assert.equal(ok.held, undefined);
  } finally { f.restore(); }
});
test("M2: the add pages tell the poster when the pin is not exact", () => {
  assert.match(read("public/add-house.html"), /We could not find that street address on the map/);
  assert.match(read("public/add-event.html"), /We could not find that exact address, so the pin is in the middle of the city/);
  assert.match(read("public/add-event.html"), /We could not find that address or match a web page to the event/);
});

// ---------- M3 ----------
test("M3: review words in the hours, price, address or web address refuse a new event", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com"), f = geo({ census: PASADENA });
  try {
    for (const [o, i] of [[{ hours: "Win bitcoin 6 pm" }, 1], [{ price: "Free crypto chips", free: false }, 2], [{ address: "100 Main St, forex.example" }, 3], [{ url: "https://crypto.example.com/win" }, 4]]) {
      const r = await postEvent(env, evBody(o), u.cookie, "198.51.100." + i); assert.equal(r.http, 400, JSON.stringify(o)); assert.match(r.error, /community event/);
    }
  } finally { f.restore(); }
});
test("M3: an edit that points a live event at a web page that does not match drops it to Expected with a note; a matching page keeps it Confirmed; review words in the url are refused", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com"); seedEvent(raw);
  let f = geo({ page: "<p>nothing about it</p>" });
  try {
    const bad = await me(env, "s1", { action: "edit", url: "https://other.example.org/page" }, u.cookie); assert.equal(bad.http, 200); assert.equal(bad.status, "expected");
    assert.equal(raw.prepare("SELECT status FROM events WHERE id = 'u-oak-1'").get().status, "expected");
    assert.match(raw.prepare("SELECT note FROM event_submissions WHERE id = 's1'").get().note, /new web page did not match/);
  } finally { f.restore(); }
  f = geo({ page: `<h1>Oak Hill Tree Lighting ${ptToday(10).slice(0, 4)}</h1>` });
  try {
    const good = await me(env, "s1", { action: "edit", url: "https://oakhill.example.org/lighting" }, u.cookie); assert.equal(good.http, 200); assert.equal(good.status, "confirmed");
    assert.equal(raw.prepare("SELECT status FROM events WHERE id = 'u-oak-1'").get().status, "confirmed");
    const spam = await me(env, "s1", { action: "edit", url: "https://crypto.example.com/x" }, u.cookie); assert.equal(spam.http, 400);
    const hrs = await me(env, "s1", { action: "edit", hours: "Win a loan" }, u.cookie); assert.equal(hrs.http, 400);
  } finally { f.restore(); }
});

// ---------- M4 ----------
test("M4: a homeowner must confirm the address is theirs (or that they have permission); the time is stored with the home", async () => {
  const { env, raw } = newEnv({ PHOTOS: r2() }); const u = await addUser(raw, "u1", "owner@example.com"), f = geo({ census: PASADENA });
  try {
    const no = await postHome(env, homeForm({ permission: undefined }), u.cookie); assert.equal(no.http, 400); assert.match(no.error, /your home, or that you have its owner's permission/);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM posts").get().n, 0);
    const yes = await postHome(env, homeForm(), u.cookie, { ip: "198.51.100.9" }); assert.equal(yes.http, 200);
    assert.ok(raw.prepare("SELECT address_consent_at FROM posts WHERE id = ?").get(yes.id).address_consent_at);
  } finally { f.restore(); }
});
test("M4: the add-house form asks for it on the address step and sends it", () => {
  const html = read("public/add-house.html");
  assert.match(html, /check\(x, "perm", "This is my home, or I have its owner's permission to show the address on the map\."\)/);
  assert.match(html, /!pro\(x\) && !x\.perm \? bad\(/);
  assert.match(html, /set\.permission = "1"/);
});

// ---------- L7 ----------
test("L7: a cross-site post to /api/submit is refused before anything is read", async () => {
  const { env, raw } = newEnv({ PHOTOS: r2() }); const u = await addUser(raw, "u1", "owner@example.com");
  const r = await postHome(env, homeForm(), u.cookie, { origin: "https://evil.example" }); assert.equal(r.http, 403);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM posts").get().n, 0);
});

// ---------- M6, L1, L6 (the profile page) ----------
test("M6: every listing on Your profile that is not live gets a plain label, a reason and a way out (Delete; Edit while it is in review)", () => {
  const html = read("public/profile.html");
  assert.match(html, /declined: \["", "Not accepted"\]/);
  assert.match(html, /h\.status === "declined" \? \["", "Not accepted"\]/); assert.match(html, /e\.status === "declined" \? \["", "Not accepted"\]/);
  assert.match(html, /A person is looking it over before it goes on the map/); assert.match(html, /We could not put this \$\{what\} on the map/);
  assert.match(html, /h\.status === "pending" \? `<button class="btn out sm" type="button" data-medit>Edit<\/button>` : ""\}\$\{moreMenu\([^]*data-hdel>Delete<\/button>`(?:, "Take down or delete")?\)\}/, "a home in review can be edited and deleted (Delete sits in the More menu)");
  assert.match(html, /<button class="btn out sm danger" type="button" data-edel>Delete<\/button>`\)\}<\/div>/, "an event of any status can be deleted (in the More menu)");
  assert.match(html, /\$\{live \|\| e\.status === "pending" \?/, "an event in review can be edited");
  assert.ok(!/\["", [hec]\.status\]/.test(html), "no raw status word is shown");
});
test("L1: deleting the account takes the word delete, can be cancelled, is announced and mentions paid placements", () => {
  const html = read("public/profile.html");
  assert.match(html, /id="delbox" hidden/); assert.match(html, /Type <b>delete<\/b> to confirm/); assert.match(html, /id="delgo" type="button" disabled/);
  assert.match(html, /id="delsay" role="status" aria-live="polite"/); assert.match(html, /id="delcancel"/); assert.match(html, /paid placement is still running/);
});
test("L6: the Account tab no longer says homes are matched by the email typed on the form", () => {
  const html = read("public/profile.html");
  assert.ok(!/matched by the email you typed/.test(html)); assert.match(html, /Homes and events you add are tied to this account's email\./);
});
