// "Today" on the server is the real Pacific calendar date (functions/_lib/time.js), daylight saving included. Before, 14 places used a fixed UTC-8, which was an hour late from March to November.
// These tests sit on the hours where the old and the real rules disagree: PDT (UTC-7) midnight is 07:00Z, PST (UTC-8) midnight is 08:00Z; and on the two clock changes.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ptDate, ptToday, shiftDay } from "../functions/_lib/time.js";
import { ptToday as featuredPtToday } from "../functions/_lib/featured.js";
import { todayPT, windows } from "../functions/_lib/contests.js";
import { rowToEvent } from "../functions/_lib/util.js";
import { build as buildEvents } from "../functions/api/events.js";
import { dayKey, funnelCounts, bump } from "../functions/_lib/funnel.js";
import { onRequestPost as digest } from "../functions/api/admin-digest.js";
import { onRequestPost as visit } from "../functions/api/visit.js";
import { onRequestPost as submitEvent } from "../functions/api/submit-event.js";
import { newEnv, addUser, stubFetch } from "./_pay.mjs";

// Freezes both Date.now() and new Date() (code uses both) for one test body.
async function at(iso, fn) {
  const RealDate = Date, t = RealDate.parse(iso);
  class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } }
  globalThis.Date = FakeDate;
  try { return await fn(); } finally { globalThis.Date = RealDate; }
}

// [instant, Pacific date]. The pairs at 07:00Z (summer) and 08:00Z (winter) are the ones the old UTC-8 rule got wrong.
const BOUNDARIES = [
  ["2026-07-15T06:59:59Z", "2026-07-14"], ["2026-07-15T07:00:00Z", "2026-07-15"], ["2026-07-15T07:59:59Z", "2026-07-15"], ["2026-07-15T08:00:00Z", "2026-07-15"], // PDT
  ["2026-12-15T07:59:59Z", "2026-12-14"], ["2026-12-15T08:00:00Z", "2026-12-15"], ["2026-12-15T07:00:00Z", "2026-12-14"], // PST
  ["2026-03-08T09:59:59Z", "2026-03-08"], ["2026-03-08T10:00:00Z", "2026-03-08"], ["2026-03-09T06:59:59Z", "2026-03-08"], ["2026-03-09T07:00:00Z", "2026-03-09"], // spring forward (2 am PST -> 3 am PDT)
  ["2026-11-01T08:59:59Z", "2026-11-01"], ["2026-11-01T09:00:00Z", "2026-11-01"], ["2026-11-02T07:59:59Z", "2026-11-01"], ["2026-11-02T08:00:00Z", "2026-11-02"], // fall back (2 am PDT -> 1 am PST)
  ["2026-12-31T23:59:59Z", "2026-12-31"], ["2027-01-01T07:59:59Z", "2026-12-31"], ["2027-01-01T08:00:00Z", "2027-01-01"], // new year
];

test("ptDate / ptToday / the featured.js re-export give the Pacific date at the boundary hours", async () => {
  for (const [iso, want] of BOUNDARIES) {
    assert.equal(ptDate(Date.parse(iso)), want, iso);
    await at(iso, () => { assert.equal(ptToday(), want, "ptToday " + iso); assert.equal(featuredPtToday(), want); assert.equal(todayPT(), want); assert.equal(dayKey(), want); });
  }
});
test("shiftDay moves by calendar days across both clock changes and month ends", () => {
  assert.equal(shiftDay("2026-03-07", 2), "2026-03-09"); assert.equal(shiftDay("2026-10-31", 2), "2026-11-02");
  assert.equal(shiftDay("2026-03-09", -2), "2026-03-07"); assert.equal(shiftDay("2026-12-31", 1), "2027-01-01"); assert.equal(shiftDay("2028-02-28", 1), "2028-02-29"); assert.equal(shiftDay("2026-11-07", 0), "2026-11-07");
});

test("Featured expiry (featuredLevel): a placement ending on day D works through the whole Pacific day D and is off from the first minute of D+1", async () => {
  const row = (until) => ({ id: "e", name: "n", featured: 2, featured_until: until });
  // summer: last day Jul 14. 06:59:59Z is still Jul 14 in Pacific; 07:00:00Z is Jul 15. (The old rule kept it on until 08:00Z.)
  await at("2026-07-15T06:59:59Z", () => assert.equal(rowToEvent(row("2026-07-14")).f, 2));
  await at("2026-07-15T07:00:00Z", () => assert.equal(rowToEvent(row("2026-07-14")).f, 0));
  await at("2026-07-15T07:30:00Z", () => assert.equal(rowToEvent(row("2026-07-14")).f, 0, "an hour after midnight: already off (old rule: still on)"));
  // winter: Dec 14
  await at("2026-12-15T07:59:59Z", () => assert.equal(rowToEvent(row("2026-12-14")).f, 2));
  await at("2026-12-15T08:00:00Z", () => assert.equal(rowToEvent(row("2026-12-14")).f, 0));
  // both clock changes
  await at("2026-03-09T06:59:59Z", () => assert.equal(rowToEvent(row("2026-03-08")).f, 2));
  await at("2026-03-09T07:00:00Z", () => assert.equal(rowToEvent(row("2026-03-08")).f, 0));
  await at("2026-11-02T07:59:59Z", () => assert.equal(rowToEvent(row("2026-11-01")).f, 2));
  await at("2026-11-02T08:00:00Z", () => assert.equal(rowToEvent(row("2026-11-01")).f, 0));
  // no end date, off, and level 1
  await at("2026-07-15T12:00:00Z", () => { assert.equal(rowToEvent({ ...row(null), featured: 1 }).f, 1); assert.equal(rowToEvent({ ...row("2026-07-15"), featured: 1 }).f, 1); assert.equal(rowToEvent({ ...row("2026-07-15"), featured: 0 }).f, 0); });
});

test("contest windows follow the Pacific day: entries close at the end of the close date, voting opens at the start of vote_start", async () => {
  const c = { status: "live", announced: 0, entries_open: 1, voting_open: 1, entries_close: "2026-07-14", vote_start: "2026-07-15", vote_end: "2026-07-20" };
  await at("2026-07-15T06:59:59Z", () => assert.deepEqual(windows(c), { entriesOpen: true, votingOpen: false }, "last second of the close date"));
  await at("2026-07-15T07:00:00Z", () => assert.deepEqual(windows(c), { entriesOpen: false, votingOpen: true }, "midnight Pacific: entries closed, voting open (old rule: an hour of nothing open)"));
  await at("2026-07-21T06:59:59Z", () => assert.deepEqual(windows(c), { entriesOpen: false, votingOpen: true }, "last second of vote_end"));
  await at("2026-07-21T07:00:00Z", () => assert.deepEqual(windows(c), { entriesOpen: false, votingOpen: false }));
  const w = { ...c, entries_close: "2026-12-14", vote_start: "2026-12-15", vote_end: "2026-12-20" }; // winter: midnight is 08:00Z
  await at("2026-12-15T07:59:59Z", () => assert.equal(windows(w).entriesOpen, true));
  await at("2026-12-15T08:00:00Z", () => assert.deepEqual(windows(w), { entriesOpen: false, votingOpen: true }));
  await at("2026-12-21T08:00:00Z", () => assert.equal(windows(w).votingOpen, false));
});

test("events list: the ended cutoff (3 days of grace) moves at Pacific midnight", async () => {
  const { env, raw } = newEnv();
  raw.prepare("DELETE FROM events").run();
  const ins = raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,lat,lng,url) VALUES (?,?,?,?,?,?,?,?,?,?)");
  for (const d of ["2026-07-10", "2026-07-11", "2026-07-12"]) ins.run("ev" + d, "E " + d, "Los Angeles", "Pasadena", "walk", d, d, 34, -118, "");
  const ids = async () => (JSON.parse((await buildEvents(env, false, false, false)).body)).map((e) => e.id).sort();
  await at("2026-07-15T06:59:59Z", async () => assert.deepEqual(await ids(), ["ev2026-07-11", "ev2026-07-12"], "Pacific Jul 14: cutoff Jul 11")); // Jul 14 minus 3 days
  await at("2026-07-15T07:00:00Z", async () => assert.deepEqual(await ids(), ["ev2026-07-12"], "Pacific Jul 15: cutoff Jul 12"));
  await at("2026-12-15T07:59:59Z", async () => { raw.prepare("UPDATE events SET start_date = '2026-12-11', end_date = '2026-12-11' WHERE id = 'ev2026-07-11'").run(); assert.ok((await ids()).includes("ev2026-07-11"), "Pacific Dec 14: cutoff Dec 11 keeps it"); });
  await at("2026-12-15T08:00:00Z", async () => assert.ok(!(await ids()).includes("ev2026-07-11"), "Pacific Dec 15: cutoff Dec 12 drops it"));
});

test("daily counters: the funnel day and page-view day roll over at Pacific midnight; the 7-day window is 7 Pacific days", async () => {
  const { env, raw } = newEnv();
  await at("2026-07-15T06:30:00Z", () => bump(env, "fn:visit"));
  await at("2026-07-15T07:30:00Z", () => bump(env, "fn:visit"));
  assert.deepEqual(raw.prepare("SELECT day, n FROM site_hits WHERE page = 'fn:visit' ORDER BY day").all().map((r) => ({ ...r })), [{ day: "2026-07-14", n: 1 }, { day: "2026-07-15", n: 1 }]);
  await at("2026-07-15T07:30:00Z", async () => { const c = (await funnelCounts(env))["fn:visit"]; assert.deepEqual(c, { today: 1, week: 2 }); });
  await at("2026-07-21T06:59:59Z", async () => assert.deepEqual((await funnelCounts(env))["fn:visit"], { today: 0, week: 2 }, "Jul 20 Pacific: window Jul 14..20 holds both"));
  await at("2026-07-21T07:00:00Z", async () => assert.deepEqual((await funnelCounts(env))["fn:visit"], { today: 0, week: 1 }, "Jul 21 Pacific: window Jul 15..21, Jul 14 dropped"));
  await at("2026-07-22T07:00:00Z", async () => assert.deepEqual((await funnelCounts(env))["fn:visit"], { today: 0, week: 0 }, "Jul 22 Pacific: window Jul 16..22"));
  // /api/visit uses the same day
  await at("2026-12-15T07:59:59Z", () => visit({ request: new Request("https://x.test/api/visit", { method: "POST", body: JSON.stringify({ k: "fn:visit" }) }), env }));
  await at("2026-12-15T08:00:00Z", () => visit({ request: new Request("https://x.test/api/visit", { method: "POST", body: JSON.stringify({ k: "fn:visit" }) }), env }));
  assert.deepEqual(raw.prepare("SELECT day FROM site_hits WHERE day LIKE '2026-12-%' ORDER BY day").all().map((r) => r.day), ["2026-12-14", "2026-12-15"]);
});

test("admin digest: the day's totals start at Pacific midnight, and 'charging in the next 7 days' counts Pacific days", async () => {
  const KEY = "digest-key-0123456789";
  const run = async (iso, beforeAt, afterAt) => at(iso, async () => {
    const { env, raw } = newEnv({ ALERT_CRON_KEY: KEY, RESEND_API_KEY: "re_fake" });
    const ins = raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,created_at) VALUES (?,'pending','b','t','Pasadena',34,-118,'d','[]','a@b.com','christmas','1 A St',?)");
    ins.run("before", beforeAt); ins.run("after", afterAt); // 10 minutes before and after Pacific midnight
    raw.prepare("INSERT INTO installers (id,slug,name,status) VALUES ('i1','i1','I One','active')").run();
    for (const [i, d] of [["i1", "2026-07-22"], ["i2", "2026-07-23"]]) raw.prepare("INSERT INTO installer_autorenew (installer_id, enabled, status, next_charge_date) VALUES (?,1,'active',?)").run(i, d);
    const f = stubFetch(() => new Response("{}", { status: 200 }));
    try {
      const res = await digest({ request: new Request("https://x.test/api/admin-digest", { method: "POST", headers: { "x-alert-key": KEY } }), env });
      assert.equal(res.status, 200);
      return f.calls.filter((c) => /resend/.test(c.url)).map((c) => JSON.parse(c.init.body)).map((b) => b.text || (b[0] && b[0].text) || "").join("\n");
    } finally { f.restore(); }
  });
  const summer = await run("2026-07-15T07:30:00Z", "2026-07-15 06:50:00", "2026-07-15 07:10:00"); // 00:30 PDT, Jul 15
  assert.match(summer, /Today so far: 1 submission\s*\S1 home,/, "only the home created after Pacific midnight counts for today");
  assert.match(summer, /1 charging in the next 7 days/, "Jul 22 is within 7 days of Pacific Jul 15 (Jul 23 is not)");
  const winter = await run("2026-12-15T08:30:00Z", "2026-12-15 07:50:00", "2026-12-15 08:10:00"); // 00:30 PST, midnight is 08:00Z
  assert.match(winter, /Today so far: 1 submission\s*\S1 home,/);
});

test("submit-event: an event that ended 'yesterday' in Pacific is refused in the first hour of the new Pacific day", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@example.com");
  const f = stubFetch(() => new Response(JSON.stringify({ result: { addressMatches: [] } })));
  const body = { name: "Pasadena Holiday Parade", city: "Pasadena", season: "christmas", type: "parade", start: "2026-07-14", end: "2026-07-14", free: true, blurb: "A lighted holiday parade down Colorado Boulevard.", venue: "Colorado Blvd", address: "100 E Colorado Blvd" };
  const send = (iso, ip) => at(iso, () => submitEvent({ request: new Request("https://socallights.app/api/submit-event", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": ip, cookie: u.cookie }, body: JSON.stringify(body) }), env }).then(async (r) => ({ http: r.status, ...(await r.json()) })));
  try {
    const late = await send("2026-07-15T06:59:59Z", "198.51.100.1"); assert.equal(late.http, 200, "still Jul 14 in Pacific: the event is running its last day");
    raw.prepare("DELETE FROM events WHERE name = 'Pasadena Holiday Parade'").run(); raw.prepare("DELETE FROM event_submissions").run();
    const next = await send("2026-07-15T07:00:00Z", "198.51.100.2"); assert.equal(next.http, 400); assert.match(next.error, /already ended/);
  } finally { f.restore(); }
});

test("no server code still uses a fixed UTC-8 offset for 'today'; client date helpers use the Pacific zone", () => {
  const files = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith(".js")) files.push(p); } };
  walk("functions");
  const hits = files.filter((p) => /\b8 \* 3600_?000|\b28800/.test(readFileSync(p, "utf8"))).map((p) => p + ": " + readFileSync(p, "utf8").split("\n").filter((l) => /\b8 \* 3600_?000|\b28800/.test(l)).map((l) => l.trim().slice(0, 90)).join(" | "));
  // The one allowed use: the digest's "since" fallback is an 8 HOUR look-back window, not a time zone.
  assert.deepEqual(hits.filter((h) => !/admin-digest\.js/.test(h)), [], "use ptToday()/ptDate() from functions/_lib/time.js instead");
  assert.match(readFileSync("public/feature-plans.js", "utf8"), /timeZone: "America\/Los_Angeles"/);
  assert.match(readFileSync("public/app.js", "utf8"), /timeZone: "America\/Los_Angeles"/);
});
