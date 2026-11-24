// Audit F-19 (re-check a confirmed event's page from Admin, never downgrading anything) and F-21 (the "No photo" queue). Page fetches are stubbed: nothing leaves the process.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as recheckPost } from "../functions/api/admin/events/recheck.js";
import { onRequestGet as eventGet } from "../functions/api/admin/events/[id].js";
import { onRequestGet as queuesGet } from "../functions/api/admin/event-queues.js";
import { onRequest as middleware } from "../functions/api/admin/_middleware.js";
import { _clearRobotsCache } from "../functions/_lib/robots.js";
import { newEnv, stubFetch, ptToday } from "./_pay.mjs";

const year = ptToday(10).slice(0, 4);
const ins = (raw, id, o = {}) => {
  const e = { name: "Night in Bethlehem", url: "https://church.test/" + id, status: "confirmed", start_date: ptToday(10), end_date: ptToday(12), image: null, images: null, owner_photos: null, checked_at: null, ...o };
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address,image,images,owner_photos,checked_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, e.name, "Riverside", "Murrieta", "show", e.start_date, e.end_date, e.status, 1, "Free", "6pm", 33.5, -117.1, "", e.url, "christmas", "", "", e.image, e.images, e.owner_photos, e.checked_at, "2026-01-01 00:00:00");
};
const call = (env, b) => recheckPost({ request: new Request("https://socallights.app/api/admin/events/recheck", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "recheck", ...b }) }), env });
const row = (raw, id) => ({ ...raw.prepare("SELECT * FROM events WHERE id = ?").get(id) });
const page = (html, status = 200, headers = {}) => _clearRobotsCache() || stubFetch((url) => (/robots\.txt$/.test(String(url)) ? new Response("", { status: 404 }) : new Response(html, { status, headers })));

test("re-check: the page still mentions the name and year -> stored on the event, nothing else changes", async () => {
  const { env, raw } = newEnv(); ins(raw, "ev1"); const s = page(`<h1>A Night in Bethlehem ${year}</h1> Bethlehem nativity`);
  try {
    const before = row(raw, "ev1"), r = await call(env, { id: "ev1" }), j = await r.json();
    assert.equal(r.status, 200); assert.equal(j.read, true); assert.equal(j.still_mentions_name, true); assert.equal(j.still_mentions_year, true); assert.equal(j.cancel_words, false); assert.equal(j.year, year);
    const after = row(raw, "ev1"); assert.ok(after.checked_at); assert.match(after.check_note, /Event name: found\. \d{4}: found\./);
    for (const k of Object.keys(before)) if (!["checked_at", "check_note"].includes(k)) assert.equal(after[k], before[k], k + " is untouched (status, dates, updated_at too)");
    assert.equal(after.status, "confirmed");
    assert.ok(s.calls.some((c) => c.url === "https://church.test/ev1"), "it fetched the event's own page");
    assert.match(String(s.calls.find((c) => c.url === "https://church.test/ev1").init.headers["user-agent"]), /SoCalLightsBot/, "under our own bot name");
  } finally { s.restore(); }
});

test("re-check: a page that dropped the year, or the event name, is reported but the event is NOT downgraded or changed", async () => {
  const { env, raw } = newEnv(); ins(raw, "ev1"); ins(raw, "ev2");
  let s = page(`<h1>A Night in Bethlehem 2020</h1> Bethlehem`);
  try { const j = await (await call(env, { id: "ev1" })).json(); assert.equal(j.still_mentions_name, true); assert.equal(j.still_mentions_year, false); assert.match(j.note, new RegExp(year + ": NOT found")); } finally { s.restore(); }
  s = page(`<h1>Spring bake sale ${year}</h1>`);
  try { const j = await (await call(env, { id: "ev2" })).json(); assert.equal(j.still_mentions_name, false); assert.match(j.note, /Event name: NOT found/); } finally { s.restore(); }
  for (const id of ["ev1", "ev2"]) { const r = row(raw, id); assert.equal(r.status, "confirmed"); assert.ok(r.checked_at, "a page that was read counts as re-checked"); assert.equal(r.updated_at, "2026-01-01 00:00:00"); }
});

test("re-check: a page that says cancelled or postponed is flagged for a person to read, and still nothing changes", async () => {
  const { env, raw } = newEnv(); ins(raw, "ev1"); const s = page(`<h1>A Night in Bethlehem ${year}</h1> Bethlehem. Update: this year's show has been cancelled.`);
  try { const j = await (await call(env, { id: "ev1" })).json(); assert.equal(j.cancel_words, true); assert.match(j.note, /cancelled, postponed or rescheduled: read it/); } finally { s.restore(); }
  assert.equal(row(raw, "ev1").status, "confirmed"); assert.equal(row(raw, "ev1").notice, "");
});

test("re-check: a page we could not read (blocked, down, slow) keeps its note but is NOT marked as checked, so it stays on the 30-day list", async () => {
  const { env, raw } = newEnv(); ins(raw, "ev1"); ins(raw, "ev2");
  let s = page("Just a moment...", 403, { "cf-mitigated": "challenge" });
  try { const j = await (await call(env, { id: "ev1" })).json(); assert.equal(j.read, false); assert.equal(j.blocked, true); assert.match(j.note, /bot protection/); } finally { s.restore(); }
  s = stubFetch((url) => (/robots\.txt$/.test(String(url)) ? new Response("", { status: 404 }) : new Response("nope", { status: 404 })));
  try { const j = await (await call(env, { id: "ev2" })).json(); assert.equal(j.read, false); assert.match(j.note, /HTTP 404/); } finally { s.restore(); }
  for (const id of ["ev1", "ev2"]) { assert.equal(row(raw, id).checked_at, null); assert.ok(row(raw, id).check_note); }
  const q = await (await queuesGet({ env })).json(); assert.ok(q.stale.includes("ev1") && q.stale.includes("ev2"));
});

test("re-check: robots.txt that disallows our bot is respected (no page fetch), an event with no web page and bad input are refused", async () => {
  _clearRobotsCache(); const { env, raw } = newEnv(); ins(raw, "ev1"); ins(raw, "nourl", { url: "" });
  const s = stubFetch((url) => (/robots\.txt$/.test(String(url)) ? new Response("User-agent: *\nDisallow: /\n") : new Response("should not be fetched")));
  try {
    const j = await (await call(env, { id: "ev1" })).json(); assert.equal(j.read, false); assert.match(j.note, /robots\.txt/);
    assert.ok(!s.calls.some((c) => c.url === "https://church.test/ev1"), "the page itself was never requested");
  } finally { s.restore(); }
  assert.equal((await call(env, { id: "nourl" })).status, 400); assert.equal((await call(env, { id: "missing-one" })).status, 404); assert.equal((await call(env, { id: "../x" })).status, 400); assert.equal((await call(env, {})).status, 400);
});

test("the editor's GET shows the last re-check; the Admin log records it with the changed fields", async () => {
  const { env, raw } = newEnv({ ADMIN_DEV_BYPASS: "1" }); ins(raw, "ev1");
  const s = page(`<h1>A Night in Bethlehem ${year}</h1> Bethlehem`);
  try {
    const body = JSON.stringify({ id: "ev1", action: "recheck" }), mk = () => new Request("http://localhost:8788/api/admin/events/recheck", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:8788" }, body });
    const ctx = { request: mk(), env, data: {}, next: () => recheckPost({ request: mk(), env, data: ctx.data }) };
    assert.equal((await middleware(ctx)).status, 200);
  } finally { s.restore(); }
  const l = raw.prepare("SELECT * FROM admin_log ORDER BY id DESC LIMIT 1").get(); assert.equal(l.area, "events"); assert.equal(l.action, "recheck"); assert.equal(l.target_id, "ev1"); assert.equal(l.label, "Night in Bethlehem"); assert.match(l.detail, /checked_at/);
  const g = await (await eventGet({ params: { id: "ev1" }, env })).json(); assert.ok(g.checked_at); assert.match(g.check_note, /Page read/);
  const never = newEnv(); ins(never.raw, "ev9"); const g2 = await (await eventGet({ params: { id: "ev9" }, env: never.env })).json(); assert.equal(g2.checked_at, null); assert.equal(g2.check_note, "");
});

test("queue 'not re-checked in 30 days': upcoming confirmed events with a web page, never or long ago, soonest first", async () => {
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM events").run();
  ins(raw, "late-never", { start_date: ptToday(40), end_date: ptToday(41) });
  ins(raw, "soon-never", { start_date: ptToday(3), end_date: ptToday(4) });
  ins(raw, "old-check", { start_date: ptToday(20), end_date: ptToday(21), checked_at: new Date(Date.now() - 31 * 86400e3).toISOString().slice(0, 19).replace("T", " ") });
  ins(raw, "fresh-check", { checked_at: new Date(Date.now() - 29 * 86400e3).toISOString().slice(0, 19).replace("T", " ") });
  ins(raw, "expected-one", { status: "expected" }); ins(raw, "ended-one", { start_date: ptToday(-10), end_date: ptToday(-5) }); ins(raw, "no-page", { url: "" });
  ins(raw, "running-now", { start_date: ptToday(-2), end_date: ptToday(5) });
  const q = await (await queuesGet({ env })).json();
  assert.deepEqual(q.stale, ["running-now", "soon-never", "old-check", "late-never"]);
  assert.ok(q.checked["fresh-check"] && q.checked["old-check"] && !q.checked["soon-never"]);
});

test("queue 'No photo': upcoming events with no linked picture, no gallery and no owner photos, soonest first; any kind of photo takes an event off", async () => {
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM events").run();
  ins(raw, "b-later", { start_date: ptToday(30), end_date: ptToday(31) }); ins(raw, "a-soon", { start_date: ptToday(2), end_date: ptToday(3) });
  ins(raw, "has-image", { image: "https://img.example.org/a.jpg" }); ins(raw, "has-gallery", { images: JSON.stringify(["https://img.example.org/b.jpg"]) });
  ins(raw, "has-owner", { owner_photos: JSON.stringify(["e/has-owner/1700000000001.jpg"]) });
  ins(raw, "empty-gallery", { image: "", images: "[]", owner_photos: "[]", start_date: ptToday(5), end_date: ptToday(6) });
  ins(raw, "ended", { start_date: ptToday(-9), end_date: ptToday(-3) });
  const q = await (await queuesGet({ env })).json();
  assert.deepEqual(q.nophoto, ["a-soon", "empty-gallery", "b-later"]);
});
