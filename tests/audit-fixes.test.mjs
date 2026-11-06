// 2026-11-07 audit fixes: PL-01 (consent record, "Remove my home"), N-02 (fake official contests), S-04 (installer takeover),
// N-03 / S-10 (email caps), S-08 (admin same-origin). No real email, payment or geocoder: fetch is stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as entriesPost } from "../functions/api/contests/[slug]/entries/index.js";
import { onRequestPost as contestCreate } from "../functions/api/contests/index.js";
import { onRequestPost as adminContest } from "../functions/api/admin/contests/[id].js";
import { onRequestPost as removePost } from "../functions/api/remove-home.js";
import { onRequestGet as removalsGet, onRequestPost as removalsPost } from "../functions/api/admin/removals.js";
import { onRequestPost as submitPost } from "../functions/api/submit.js";
import { onRequestPost as claimPost } from "../functions/api/installers/[slug]/claim.js";
import { onRequestGet as confirmGet } from "../functions/api/installers/confirm.js";
import { onRequestPost as instQuote } from "../functions/api/installers/[slug]/quote.js";
import { onRequestPost as contestQuote } from "../functions/api/contests/[slug]/quote.js";
import { onRequestPost as alertsPost } from "../functions/api/alerts/index.js";
import { onRequest as adminMw } from "../functions/api/admin/_middleware.js";
import { officialSounding, trustOf } from "../functions/_lib/contests.js";
import { CONSENT_TEXT, CONSENT_VERSION } from "../functions/_lib/homes.js";
import { findOrCreateInstaller } from "../functions/_lib/installers.js";
import { TEMPLATES } from "../functions/_lib/mailtpl.js";
import { newEnv, addUser, stubFetch, ptToday } from "./_pay.mjs";

const origin = "https://socallights.app";
const jbody = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });
const q = (raw, sql, ...a) => JSON.parse(JSON.stringify(raw.prepare(sql).all(...a)));
const jreq = (path, user, body, extra = {}) => new Request(origin + path, { method: "POST", headers: { "content-type": "application/json", ...(user ? { cookie: user.cookie } : {}), ...(extra.headers || {}) }, body: JSON.stringify(body) });

// Census/OSM stand-in: every address is found near Pasadena. Resend is answered "ok" and recorded.
function stubs() {
  const mails = [];
  const s = stubFetch((url, init) => {
    const u = String(url);
    if (u.includes("api.resend.com")) { mails.push(JSON.parse(init.body)); return new Response("{}", { status: 200 }); }
    const a = decodeURIComponent((u.match(/address=([^&]*)/) || u.match(/[?&]q=([^&]*)/) || [])[1] || "");
    if (u.includes("census.gov")) return new Response(JSON.stringify({ result: { addressMatches: [{ matchedAddress: a.split(",").slice(0, 2).join(",").toUpperCase() + ", CA, 91722", coordinates: { y: 34.1 + (a.length % 7) / 1000, x: -118.0 } }] } }), { headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify([{ lat: "34.1", lon: "-118.0", display_name: a }]), { headers: { "content-type": "application/json" } });
  });
  return { mails, done: s.restore };
}
const env0 = (extra = {}) => newEnv({ RESEND_API_KEY: "re_test", ADMIN_NOTIFY_EMAIL: "admin@example.test", ...extra });
const call = (fn, o) => fn({ waitUntil: (p) => { pending.push(p); }, ...o });
const pending = [];
const flush = async () => { await Promise.all(pending.splice(0)); };

// ------------------------------------------------------------ PL-01 (a): the organizer's confirmation is stored
async function contestSetup(extra = {}) {
  const { env, raw } = env0();
  const owner = await addUser(raw, "uO", "owner@city.gov");
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval,note) VALUES ('c1','light-up','uO','Light Up','City of Covina','Pasadena','Los Angeles','christmas','live',?,?,?,'[\"Best Overall\"]','public','pick','owner@city.gov','A contest for the whole town.','manual',?)")
    .run(ptToday(5), ptToday(8), ptToday(20), extra.note || "");
  const add = (user, body) => call(entriesPost, { params: { slug: "light-up" }, request: jreq("/api/contests/light-up/entries", user, body), env }).then(jbody);
  return { env, raw, owner, add };
}

test("PL-01: confirming adds a permanent record: who, when, contest, how many homes and the exact wording; each home links to it", async () => {
  const s = stubs(), t = await contestSetup();
  try {
    assert.match(CONSENT_TEXT, /residents of the homes I am adding have agreed to have their street address shown on the public SoCal Lights map/);
    const r = await t.add(t.owner, { confirm: true, homes: [{ address: "10 Elm Ave" }, { address: "12 Elm Ave | The Lees" }] });
    assert.equal(r.status, 200); assert.equal(r.body.added.length, 2);
    const rows = q(t.raw, "SELECT * FROM home_consents");
    assert.equal(rows.length, 1);
    assert.deepEqual([rows[0].contest_id, rows[0].user_id, rows[0].email, rows[0].n, rows[0].version, rows[0].text], ["c1", "uO", "owner@city.gov", 2, CONSENT_VERSION, CONSENT_TEXT]);
    assert.match(rows[0].created_at, /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/);
    assert.deepEqual(q(t.raw, "SELECT DISTINCT consent_id FROM posts WHERE contest_id = 'c1'").map((x) => x.consent_id), [rows[0].id]);
    // not confirmed or only checked: nothing stored
    assert.equal((await t.add(t.owner, { confirm: false, homes: [{ address: "14 Elm Ave" }] })).status, 400);
    assert.equal((await t.add(t.owner, { confirm: true, dryRun: true, homes: [{ address: "16 Elm Ave" }] })).status, 200);
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM home_consents")[0].n, 1);
    // the record survives the daily clean-up of entry_add_log
    t.raw.prepare("UPDATE entry_add_log SET created_at = datetime('now','-3 days')").run();
    await t.add(t.owner, { confirm: true, homes: [{ address: "18 Elm Ave" }] });
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM entry_add_log")[0].n, 1);
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM home_consents")[0].n, 2);
  } finally { s.done(); }
});

test("PL-01: the organizer page shows exactly the stored wording next to its checkbox", () => {
  const html = readFileSync(new URL("../public/organizer.html", import.meta.url), "utf8");
  assert.ok(html.includes(CONSENT_TEXT), "the checkbox label equals CONSENT_TEXT");
});

// ------------------------------------------------------------ N-02
test("N-02: official-sounding names are spotted; plain community names are not", () => {
  for (const n of ["City of Irvine Official Lights", "Oak Park HOA Holiday Contest", "Brea Chamber of Commerce Lights", "Lincoln Elementary School Lights", "Official Holiday Lights", "Orange County Lights", "Riverside Unified Lights"]) assert.ok(officialSounding(n), n);
  for (const n of ["Maple Street Holiday Lights", "The Garcia Family Lights", "Sunset Ct Neighbors", "Light Up Fullerton"]) assert.ok(!officialSounding(n), n);
});

const contestBody = (o = {}) => ({ name: "Maple Street Holiday Lights", org: "Maple Street neighbors", city: "Pasadena", descr: "A friendly lights contest for our street.", site: "", closes: ptToday(10), vs: ptToday(12), ve: ptToday(20), cats: ["Best Overall"], ...o });
const create = (env, user, body) => call(contestCreate, { request: jreq("/api/contests", user, body), env }).then(jbody);

test("N-02: a free-mail organizer with an official-sounding name is held for review, alerts the admin and cannot add homes; a plain name stays instant", async () => {
  const s = stubs(), { env, raw } = env0();
  try {
    const gm = await addUser(raw, "u1", "someone@gmail.com");
    const fake = await create(env, gm, contestBody({ name: "City of Irvine Official Lights", org: "City of Irvine" }));
    assert.equal(fake.status, 200); assert.equal(fake.body.status, "pending"); assert.equal(fake.body.review, true);
    const c = q(raw, "SELECT * FROM contests WHERE slug = ?", fake.body.slug)[0];
    assert.equal(c.status, "pending"); assert.match(c.note, /official-sounding name/);
    assert.equal(q(raw, "SELECT COUNT(*) AS n FROM events WHERE id LIKE 'c-%'")[0].n, 0, "not on the map");
    await flush();
    assert.ok(s.mails.some((m) => m.to[0] === "admin@example.test" && /Contest to review/.test(m.subject)), "admin alert sent");
    // cannot add organizer-added homes while pending
    const add = await call(entriesPost, { params: { slug: c.slug }, request: jreq(`/api/contests/${c.slug}/entries`, gm, { confirm: true, homes: [{ address: "10 Elm Ave" }] }), env }).then(jbody);
    assert.equal(add.status, 400); assert.match(add.body.error, /isn't live/);
    // a genuine small group is not blocked
    const plain = await create(env, gm, contestBody());
    assert.equal(plain.body.status, "live");
    assert.equal(q(raw, "SELECT COUNT(*) AS n FROM events WHERE id LIKE 'c-%'")[0].n, 1);
    // an organizer whose email matches the website goes live even with an official name
    const real = await addUser(raw, "u2", "events@cityofexample.org");
    const ok = await create(env, real, contestBody({ name: "City of Example Lights", org: "City of Example", site: "https://cityofexample.org" }));
    assert.equal(ok.body.status, "live"); assert.equal(ok.body.review, false);
    // admin approves: live, on the map, organizer emailed, note cleared
    s.mails.length = 0;
    const ar = await call(adminContest, { params: { id: c.id }, request: jreq("/x", null, { action: "approve" }), env }).then(jbody);
    assert.equal(ar.status, 200); await flush();
    assert.equal(q(raw, "SELECT status, note FROM contests WHERE id = ?", c.id)[0].status, "live");
    assert.ok(s.mails.some((m) => m.to[0] === "someone@gmail.com" && /on the map/.test(m.subject)));
    assert.equal(trustOf("someone@gmail.com", ""), "free");
  } finally { s.done(); }
});

test("N-02: until Admin approves, a flagged live contest can add 25 organizer-added homes at most; after approval the usual cap applies", async () => {
  const s = stubs(), t = await contestSetup({ note: "email is a free-mail address" });
  try {
    for (let i = 0; i < 3; i++) {
      const homes = Array.from({ length: i < 2 ? 10 : 5 }, (_, k) => ({ address: `${100 + i * 10 + k} Pine Rd` }));
      assert.equal((await t.add(t.owner, { confirm: true, homes })).status, 200);
    }
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM posts WHERE contest_id='c1' AND user_id=''")[0].n, 25);
    const over = await t.add(t.owner, { confirm: true, homes: [{ address: "999 Pine Rd" }] });
    assert.equal(over.status, 400); assert.match(over.body.error, /up to 25 homes/);
    t.raw.prepare("UPDATE contests SET note = '' WHERE id = 'c1'").run();
    assert.equal((await t.add(t.owner, { confirm: true, homes: [{ address: "999 Pine Rd" }] })).status, 200);
  } finally { s.done(); }
});

// ------------------------------------------------------------ PL-01 (b): Remove my home
async function removalSetup() {
  const { env, raw } = env0();
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES ('lo-kooiman-brea','Kooiman Family Christmas Light Show','Orange','Brea','drive','2026-12-01','2026-12-31','confirmed',1,'Free','','33.9','-117.9','b','https://example.org/x','christmas','Private home (view from the street)','515 Cedar Ave, Brea, CA')").run();
  const req = (body, ip = "1.1.1.1") => call(removePost, { request: jreq("/api/remove-home", null, { ...body }, { headers: { "CF-Connecting-IP": ip } }), env }).then(jbody);
  return { env, raw, req };
}

test("PL-01: a resident files a removal request (no account); the team and the requester are both emailed; the page link ids resolve", async () => {
  const s = stubs(), t = await removalSetup();
  try {
    const bad = await t.req({ ref: "lo-kooiman-brea", email: "nope" }); assert.equal(bad.status, 400);
    const noWhere = await t.req({ email: "res@example.com" }); assert.equal(noWhere.status, 400);
    const r = await t.req({ ref: "https://socallights.app/e/lo-kooiman-brea", email: "Res@Example.com", note: "Our home, we did not agree." });
    assert.equal(r.status, 200);
    const row = q(t.raw, "SELECT * FROM removal_requests")[0];
    assert.deepEqual([row.ref, row.email, row.status], ["lo-kooiman-brea", "res@example.com", "open"]);
    await flush();
    assert.ok(s.mails.some((m) => m.to[0] === "admin@example.test" && /Home removal request/.test(m.subject)));
    const ack = s.mails.find((m) => m.to[0] === "res@example.com");
    assert.ok(ack && /We got your request/.test(ack.subject) && ack.text.includes("Kooiman"), "acknowledgment names the listing");
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM events WHERE id = 'lo-kooiman-brea'")[0].n, 1, "nothing is removed before Admin approves");
  } finally { s.done(); }
});

test("PL-01: removal requests are rate limited per connection and per address, and Turnstile is enforced when configured", async () => {
  const s = stubs(), t = await removalSetup();
  try {
    for (let i = 0; i < 3; i++) assert.equal((await t.req({ ref: "x" + i, email: "same@example.com" }, "2.2.2.2")).status, 200);
    const fourth = await t.req({ ref: "x9", email: "same@example.com" }, "2.2.2.2");
    assert.equal(fourth.status, 429);
    for (let i = 0; i < 2; i++) assert.equal((await t.req({ ref: "y" + i, email: `p${i}@example.com` }, "3.3.3.3")).status, 200);
    const cap = []; for (let i = 0; i < 4; i++) cap.push((await t.req({ ref: "z" + i, email: `q${i}@example.com` }, "3.3.3.3")).status);
    assert.ok(cap.includes(429), "per-connection cap of 5 an hour");
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM submit_log WHERE ip = '2.2.2.2'")[0].n, 3, "IP only in submit_log (pruned within 48 hours), the address limiter stores a hash");
    assert.ok(q(t.raw, "SELECT key FROM send_throttle").every((x) => /^[0-9a-f]{32}$/.test(x.key)));
    const t2 = await removalSetup(); t2.env.TURNSTILE_SECRET = "secret";
    assert.equal((await t2.req({ ref: "a", email: "t@example.com" })).status, 400, "missing Turnstile token");
  } finally { s.done(); }
});

test("PL-01: Admin sees the request and Approve deletes the listing, marks it done and emails the requester; Decline emails the reason", async () => {
  const s = stubs(), t = await removalSetup();
  try {
    await t.req({ ref: "lo-kooiman-brea", email: "res@example.com" });
    await t.req({ address: "77 Nowhere St, Brea", email: "other@example.com" }, "4.4.4.4");
    t.raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES ('h2','Another','Orange','Brea','drive','2026-12-01','2026-12-31','confirmed',1,'Free','','33.9','-117.9','b','https://example.org/y','christmas','Private home (view from the street)','77 Nowhere St, Brea, CA')").run();
    await flush();
    const list = await removalsGet({ env: t.env }).then(jbody);
    assert.equal(list.body.length, 2);
    const byEmail = Object.fromEntries(list.body.map((r) => [r.email, r]));
    assert.equal(byEmail["res@example.com"].listing.target, "event:lo-kooiman-brea");
    assert.deepEqual(byEmail["other@example.com"].matches.map((m) => m.target), ["event:h2"], "address-only request offers matches");
    s.mails.length = 0;
    const post = (body) => call(removalsPost, { request: jreq("/api/admin/removals", null, body), env: t.env }).then(jbody);
    // approving an address-only request needs a pick or "nothing to remove"
    assert.equal((await post({ id: byEmail["other@example.com"].id, action: "approve" })).status, 400);
    assert.equal((await post({ id: byEmail["res@example.com"].id, action: "approve" })).status, 200);
    await flush();
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM events WHERE id = 'lo-kooiman-brea'")[0].n, 0);
    assert.equal(q(t.raw, "SELECT status FROM removal_requests WHERE id = ?", byEmail["res@example.com"].id)[0].status, "done");
    assert.ok(s.mails.some((m) => m.to[0] === "res@example.com" && /was removed/.test(m.subject)));
    assert.equal((await post({ id: byEmail["res@example.com"].id, action: "approve" })).status, 409, "only once");
    const dec = await post({ id: byEmail["other@example.com"].id, action: "decline", reason: "No listing at that address." });
    assert.equal(dec.status, 200); await flush();
    assert.ok(s.mails.some((m) => m.to[0] === "other@example.com" && m.text.includes("No listing at that address.")));
    assert.equal(q(t.raw, "SELECT status FROM removal_requests WHERE id = ?", byEmail["other@example.com"].id)[0].status, "declined");
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM events WHERE id = 'h2'")[0].n, 1, "declined: listing stays");
  } finally { s.done(); }
});

test("PL-01: approving a removal for an organizer-added home deletes the post, its votes and scrubs the frozen results", async () => {
  const s = stubs(), t = await contestSetup();
  try {
    const r = await t.add(t.owner, { confirm: true, homes: [{ address: "10 Elm Ave" }] });
    const id = r.body.added[0].id;
    t.raw.prepare("INSERT INTO votes (contest_id, post_id, user_id, category) VALUES ('c1', ?, 'uX', 'Best Overall')").run(id);
    t.raw.prepare("UPDATE contests SET announced = 1, results = ? WHERE id = 'c1'").run(JSON.stringify({ entries: [{ id, name: "Home at 10 Elm Ave", address: "10 Elm Ave, Pasadena", city: "Pasadena", lat: 1, lng: 2, photos: [], votes: 1 }] }));
    t.raw.prepare("INSERT INTO removal_requests (id, ref, email) VALUES ('rr1', ?, 'res@example.com')").run("h-" + id);
    const out = await call(removalsPost, { request: jreq("/api/admin/removals", null, { id: "rr1", action: "approve" }), env: t.env }).then(jbody);
    assert.equal(out.status, 200);
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM posts WHERE id = ?", id)[0].n, 0);
    assert.equal(q(t.raw, "SELECT COUNT(*) AS n FROM votes WHERE post_id = ?", id)[0].n, 0);
    const snap = JSON.parse(q(t.raw, "SELECT results FROM contests WHERE id = 'c1'")[0].results);
    assert.deepEqual([snap.entries[0].address, snap.entries[0].removed, snap.entries[0].votes], ["", true, 1]);
  } finally { s.done(); }
});

// ------------------------------------------------------------ S-04
test("S-04: posting as an installer under an existing company's name does not fill or change its profile, and the post stays unverified until the owner confirms", async () => {
  const s = stubs(), { env, raw } = env0();
  try {
    raw.prepare("INSERT INTO installers (id,slug,name,web,phone,area,email,owner_email) VALUES ('i1','bright-nights','Bright Nights','','','','','')").run();
    const attacker = await addUser(raw, "uA", "attacker@bright-nights.example");
    const fd = new FormData();
    for (const [k, v] of Object.entries({ kind: "installer", biz: "bright nights", title: "Lights", city: "Pasadena", desc: "Our work", web: "https://bright-nights.example", phone: "626-555-0101", area: "LA", street: "5 Elm St", zip: "91101", permission: "1", season: "christmas" })) fd.append(k, v);
    const res = await call(submitPost, { request: new Request(origin + "/api/submit", { method: "POST", headers: { cookie: attacker.cookie, "CF-Connecting-IP": "9.9.9.9" }, body: fd }), env, waitUntil: () => {} });
    assert.equal(res.status, 200);
    const inst = q(raw, "SELECT * FROM installers WHERE id = 'i1'")[0];
    assert.deepEqual([inst.web, inst.phone, inst.area, inst.email, inst.owner_email], ["", "", "", "", ""], "profile untouched");
    assert.equal(q(raw, "SELECT COUNT(*) AS n FROM installers")[0].n, 1, "no duplicate profile");
    const post = q(raw, "SELECT installer_id, installer_confirmed, installer_token FROM posts")[0];
    assert.deepEqual([post.installer_id, post.installer_confirmed], ["i1", 0]);
    assert.ok(post.installer_token.length >= 16);
    // the claim by email-domain match cannot work on the attacker's typed website
    const claim = await call(claimPost, { params: { slug: "bright-nights" }, request: jreq("/api/installers/bright-nights/claim", attacker, {}), env }).then(jbody);
    assert.equal(claim.body.claimed, false);
    assert.equal(q(raw, "SELECT owner_email FROM installers WHERE id = 'i1'")[0].owner_email, "");
    // the real owner (owner_email set by Admin) confirms the post from the emailed link
    raw.prepare("UPDATE installers SET owner_email = 'real@brightnights.com', email = 'real@brightnights.com' WHERE id = 'i1'").run();
    const conf = await confirmGet({ request: new Request(origin + "/api/installers/confirm?t=" + post.installer_token), env });
    assert.equal(conf.status, 200);
    assert.equal(q(raw, "SELECT installer_confirmed FROM posts")[0].installer_confirmed, 1);
  } finally { s.done(); }
});

test("S-04: the profile's owner (or its creator) posting under its name is confirmed at once and may fill blanks; a new company gets a profile marked as visitor-typed", async () => {
  const { env, raw } = env0();
  raw.prepare("INSERT INTO installers (id,slug,name,web,phone,area,email,owner_email) VALUES ('i1','bright-nights','Bright Nights','','','','','real@brightnights.com')").run();
  const owner = await findOrCreateInstaller(env, { name: "Bright Nights", web: "brightnights.com", phone: "626", email: "real@brightnights.com", trusted: true });
  assert.equal(owner.owned, true); assert.equal(q(raw, "SELECT web FROM installers WHERE id='i1'")[0].web, "brightnights.com");
  const fresh = await findOrCreateInstaller(env, { name: "Glow Pros", web: "glowpros.example", email: "me@glowpros.example", trusted: true });
  assert.equal(fresh.created, true);
  const row = q(raw, "SELECT * FROM installers WHERE name = 'Glow Pros'")[0];
  assert.deepEqual([row.created_by, row.web_src, row.owner_email], ["me@glowpros.example", "user", ""]);
  const again = await findOrCreateInstaller(env, { name: "glow pros", web: "", email: "me@glowpros.example", trusted: true });
  assert.equal(again.owned, true, "the creator posting again is confirmed");
  // the creator may claim by domain; someone else at that domain may not (the web was typed by a visitor)
  const stranger = await addUser(raw, "uS", "x@glowpros.example"), creator = await addUser(raw, "uC", "me@glowpros.example");
  const c1 = await call(claimPost, { params: { slug: row.slug }, request: jreq("/x", stranger, {}), env }).then(jbody);
  assert.equal(c1.body.claimed, false);
  const c2 = await call(claimPost, { params: { slug: row.slug }, request: jreq("/x", creator, {}), env }).then(jbody);
  assert.equal(c2.body.claimed, true);
});

test("S-04: a second profile is never created for the same name, slug or website (different spelling, same domain), but shared sites do not match", async () => {
  const { env, raw } = env0();
  raw.prepare("INSERT INTO installers (id,slug,name,web) VALUES ('i1','acme-lights','Acme Lights','https://www.acmelights.com'), ('i2','fb-co','FB Co','https://facebook.com/fbco')").run();
  for (const [name, web] of [["ACME LIGHTS", ""], ["Acme-Lights", ""], ["Acme Holiday Installation", "acmelights.com/contact"]]) {
    const r = await findOrCreateInstaller(env, { name, web, trusted: false });
    assert.equal(r.inst.id, "i1", name); assert.equal(r.created, false);
  }
  const other = await findOrCreateInstaller(env, { name: "Other Co", web: "https://facebook.com/otherco", trusted: false });
  assert.equal(other.created, true, "a shared social host is not a company match");
  assert.equal(q(raw, "SELECT COUNT(*) AS n FROM installers")[0].n, 3);
});

// ------------------------------------------------------------ N-03 / S-10
test("N-03: quote requests are capped per account (5 a day, one a minute) and per connection (hashed); the cap covers both routes", async () => {
  const s = stubs(), { env, raw } = env0();
  try {
    const u = await addUser(raw, "u1", "buyer@example.com");
    for (let i = 1; i <= 7; i++) raw.prepare("INSERT INTO installers (id,slug,name,email) VALUES (?,?,?,?)").run("i" + i, "co" + i, "Co " + i, `co${i}@example.com`);
    raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,season,status,entries_close,vote_start,vote_end,categories,contact_email,installer_name,installer_email) VALUES ('c1','light-up','x','Light Up','Org','Pasadena','christmas','live',?,?,?,'[]','org@example.com','Co 1','co1@example.com')").run(ptToday(5), ptToday(8), ptToday(20));
    const body = { name: "Dana", phone: "", note: "hi", consent: true };
    const ask = (slug) => call(instQuote, { params: { slug }, request: jreq(`/api/installers/${slug}/quote`, u, body, { headers: { "CF-Connecting-IP": "7.7.7.7" } }), env }).then(jbody);
    const first = await ask("co1"); assert.equal(first.status, 200);
    const fast = await ask("co2"); assert.equal(fast.status, 429); assert.match(fast.body.error, /wait a minute/);
    const quiet = () => raw.prepare("UPDATE send_throttle SET created_at = datetime(created_at, '-5 minutes')").run();
    quiet(); assert.equal((await ask("co2")).status, 200);
    quiet(); assert.equal((await call(contestQuote, { params: { slug: "light-up" }, request: jreq("/api/contests/light-up/quote", u, body, { headers: { "CF-Connecting-IP": "7.7.7.7" } }), env }).then(jbody)).status, 200);
    quiet(); assert.equal((await ask("co3")).status, 200);
    quiet(); assert.equal((await ask("co4")).status, 200);
    quiet(); const sixth = await ask("co5");
    assert.equal(sixth.status, 429); assert.match(sixth.body.error, /several quote requests today/);
    assert.equal(q(raw, "SELECT COUNT(*) AS n FROM installer_leads WHERE installer_id = 'i5'")[0].n, 0, "no lead and no email for the refused request");
    assert.ok(q(raw, "SELECT key FROM send_throttle").every((x) => /^[0-9a-f]{32}$/.test(x.key)), "only hashes are stored");
    assert.ok(!JSON.stringify(q(raw, "SELECT * FROM send_throttle")).includes("7.7.7.7"));
    // a different account on the same connection hits the per-connection cap after 10 in a day
    for (let k = 0; k < 6; k++) { const v = await addUser(raw, "v" + k, `v${k}@example.com`); raw.prepare("UPDATE send_throttle SET created_at = datetime(created_at, '-5 minutes')").run();
      const r = await call(instQuote, { params: { slug: "co6" }, request: jreq("/api/installers/co6/quote", v, body, { headers: { "CF-Connecting-IP": "7.7.7.7" } }), env }).then(jbody);
      if (k < 5) assert.equal(r.status, 200, "v" + k); else assert.equal(r.status, 429); }
  } finally { s.done(); }
});

test("S-10: weekly-alert confirmation emails: 3 a day per address, then a clear message; a confirmed address is never re-sent", async () => {
  const s = stubs(), { env, raw } = env0();
  try {
    const sub = (email, ip = "5.5.5.5") => call(alertsPost, { request: jreq("/api/alerts", null, { email, city: "Pasadena", radius: 10, consent: true }, { headers: { "CF-Connecting-IP": ip } }), env }).then(jbody);
    for (let i = 0; i < 3; i++) assert.equal((await sub("victim@example.com")).status, 200);
    assert.equal(s.mails.filter((m) => m.to[0] === "victim@example.com").length, 3);
    const fourth = await sub("Victim@Example.com");
    assert.equal(fourth.status, 429); assert.match(fourth.body.error, /confirmation emails to this address today/);
    assert.equal(s.mails.filter((m) => m.to[0] === "victim@example.com").length, 3, "no fourth email");
    raw.prepare("UPDATE send_throttle SET created_at = datetime(created_at, '-2 days')").run();
    assert.equal((await sub("victim@example.com")).status, 200, "allowed again after a day");
    // confirmed: no email at all, so no throttle use
    raw.prepare("UPDATE alert_subs SET confirmed = 1 WHERE email = 'victim@example.com'").run();
    const n = s.mails.length;
    for (let i = 0; i < 5; i++) assert.equal((await sub("victim@example.com")).status, 200);
    assert.equal(s.mails.length, n);
    // per connection
    for (let i = 0; i < 20; i++) assert.equal((await sub(`u${i}@example.com`, "6.6.6.6")).status, 200);
    assert.equal((await sub("u99@example.com", "6.6.6.6")).status, 429);
  } finally { s.done(); }
});

// ------------------------------------------------------------ S-08
test("S-08: admin changes need a same-origin Origin or Referer; reads and header-less scripts still work", async () => {
  const env = { ADMIN_DEV_BYPASS: "1", DB: newEnv().env.DB };
  const host = "https://localhost";
  const run = (method, headers = {}) => adminMw({ request: new Request(host + "/api/admin/nothing", { method, headers, ...(method === "GET" ? {} : { body: "{}" }) }), env, data: {}, next: async () => new Response("ok") });
  for (const m of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.equal((await run(m, { origin: "https://evil.example" })).status, 403, m + " cross-site Origin");
    assert.equal((await run(m, { origin: "null" })).status, 403, m + " null Origin");
    assert.equal((await run(m, { referer: "https://evil.example/page" })).status, 403, m + " cross-site Referer");
    assert.equal((await run(m, { origin: host })).status, 200, m + " same-origin Origin");
    assert.equal((await run(m, { referer: host + "/admin/" })).status, 200, m + " same-origin Referer");
    assert.equal((await run(m)).status, 200, m + " script with neither header (workflows use key-protected routes, not these)");
  }
  assert.equal((await run("GET", { origin: "https://evil.example" })).status, 200, "reads are unchanged");
});
