// Add flows, the rest of the audit (docs/audit 2026-11-11, ADD-11 to ADD-23): the server checks the "I am human" token on new events and homes,
// the "declined" email links to the saved answers, and the wizard markup carries the review rows, counters, skip link and help link. Browser behavior is in tests/e2e.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as submitHome } from "../functions/api/submit.js";
import { onRequestPost as submitEvent } from "../functions/api/submit-event.js";
import { onRequestPost as adminPost } from "../functions/api/admin/posts/[id].js";
import { renderTemplate } from "../functions/_lib/mailtpl.js";
import { newEnv, addUser, stubFetch, ptToday } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const r2 = () => { const store = new Map(); return { store, put: async (k, v, o) => { store.set(k, { body: v, httpMetadata: o && o.httpMetadata }); }, get: async (k) => store.get(k) || null, delete: async (k) => { store.delete(k); } }; };
// Geocoder, Resend and Turnstile are stubbed: a token "good" passes, anything else fails.
const world = () => { const mails = []; const s = stubFetch((url, init) => {
  url = String(url);
  if (/siteverify/.test(url)) return new Response(JSON.stringify({ success: init.body.get("response") === "good" }));
  if (/api\.resend\.com/.test(url)) { mails.push(JSON.parse(init.body)); return new Response("{}", { status: 200 }); }
  if (/census/.test(url)) return new Response(JSON.stringify({ result: { addressMatches: [{ coordinates: { x: -118.13, y: 34.15 }, matchedAddress: "X" }] } }));
  return new Response("", { status: 404 });
}); return { mails, restore: s.restore }; };
const mkEnv = (extra = {}) => newEnv({ PHOTOS: r2(), RESEND_API_KEY: "re_test", DEV_AUTH: "", ...extra });
const homeForm = (o = {}) => { const f = new FormData(); for (const [k, v] of Object.entries({ biz: "Lee Family", title: "Maple Street Lights", city: "Pasadena", desc: "Ten thousand lights synced to music every night.", street: "123 Maple St", zip: "91101", lights_on: "5 to 10 pm", visit: "walk", parking: "street", radio: "88.1 FM", ...o })) f.append(k, v); return f; };
const postHome = (env, form, cookie, ip = "203.0.113.7") => submitHome({ request: new Request(ORIGIN + "/api/submit", { method: "POST", headers: { "CF-Connecting-IP": ip, cookie }, body: form }), env, waitUntil() {} });
const evBody = (o = {}) => ({ name: "Pasadena Holiday Parade", city: "Pasadena", season: "christmas", type: "parade", start: ptToday(20), end: ptToday(20), hours: "6 pm", free: true, venue: "Colorado Blvd", address: "Colorado Blvd and Fair Oaks", blurb: "A lighted parade down Colorado Boulevard.", ...o });
const postEvent = (env, b, cookie, ip = "203.0.113.8") => submitEvent({ request: new Request(ORIGIN + "/api/submit-event", { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN, "CF-Connecting-IP": ip, cookie }, body: JSON.stringify(b) }), env, waitUntil() {} });

test("ADD-17: a new event and a new home need a passing 'I am human' token when the check is configured", async () => {
  const { env, raw } = mkEnv({ TURNSTILE_SECRET: "s" }), w = world(); const u = await addUser(raw, "u1", "owner@example.com");
  try {
    const noTok = await postEvent(env, evBody(), u.cookie); assert.equal(noTok.status, 400); assert.match((await noTok.json()).error, /I am human/);
    const badTok = await postEvent(env, evBody({ "cf-turnstile-response": "bad" }), u.cookie); assert.equal(badTok.status, 400);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id LIKE 'sub-%' OR name LIKE 'Pasadena Holiday%'").get().n, 0, "nothing saved");
    const ok = await postEvent(env, evBody({ "cf-turnstile-response": "good" }), u.cookie); assert.equal(ok.status, 200);

    const h0 = await postHome(env, homeForm(), u.cookie); assert.equal(h0.status, 400); assert.match((await h0.json()).error, /I am human/);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM posts").get().n, 0);
    const h1 = await postHome(env, homeForm({ "cf-turnstile-response": "good" }), u.cookie); assert.equal(h1.status, 200);
  } finally { w.restore(); }
});
test("ADD-17: without a configured secret (local dev) the check is not required, as for every other form", async () => {
  const { env, raw } = mkEnv(), w = world(); const u = await addUser(raw, "u1", "owner@example.com");
  try { assert.equal((await postEvent(env, evBody(), u.cookie)).status, 200); assert.equal((await postHome(env, homeForm(), u.cookie)).status, 200); } finally { w.restore(); }
});

test("ADD-20: a declined home is saved as a draft on the account and the email links to it", async () => {
  const { env, raw } = mkEnv(), w = world(); const u = await addUser(raw, "u1", "owner@example.com");
  try {
    const made = await (await postHome(env, homeForm(), u.cookie)).json(); assert.equal(made.ok, true);
    const jobs = [], res = await adminPost({ params: { id: made.id }, request: new Request(ORIGIN + "/api/admin/posts/" + made.id, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "decline", reason: "Please add a street number." }) }), env, waitUntil: (p) => jobs.push(p) });
    assert.equal(res.status, 200); await Promise.all(jobs);
    const dr = raw.prepare("SELECT * FROM drafts WHERE user_id = ?").get("u1"); assert.ok(dr, "a draft was saved"); assert.equal(dr.kind, "house");
    const data = JSON.parse(dr.data); assert.equal(data.title, "Maple Street Lights"); assert.equal(data.street, "123 Maple St"); assert.equal(data.city, "Pasadena"); assert.equal(data.lightsOn, "5 to 10 pm"); assert.equal(data.visit, "walk"); assert.equal(data.radio, "88.1 FM");
    const mail = w.mails.find((m) => /About your display/.test(m.subject)); assert.ok(mail, "declined mail sent");
    assert.ok(mail.text.includes("https://socallights.app/add-house?draft=" + dr.id), "links to the saved answers"); assert.ok(!/\(https:\/\/socallights.app\/add-house\)/.test(mail.text), "not the blank form");
  } finally { w.restore(); }
});
test("ADD-20: with 10 drafts already, the declined email falls back to the blank form (and still goes out)", async () => {
  const { env, raw } = mkEnv(), w = world(); const u = await addUser(raw, "u1", "owner@example.com");
  try {
    for (let i = 0; i < 10; i++) raw.prepare("INSERT INTO drafts (id,user_id,kind,title,data,step) VALUES (?,?,?,?,?,?)").run("d" + i, "u1", "house", "x", "{}", 0);
    const made = await (await postHome(env, homeForm(), u.cookie)).json(), jobs = [];
    await adminPost({ params: { id: made.id }, request: new Request(ORIGIN + "/api/admin/posts/" + made.id, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "decline" }) }), env, waitUntil: (p) => jobs.push(p) }); await Promise.all(jobs);
    const mail = w.mails.find((m) => /About your display/.test(m.subject)); assert.ok(mail); assert.ok(mail.text.includes("https://socallights.app/add-house"));
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM drafts").get().n, 10);
  } finally { w.restore(); }
});
test("ADD-20: the declined template renders its link and has no leftover placeholder", async () => {
  const { env } = mkEnv(); const m = await renderTemplate(env, "house_declined", { name: "x", reason: "", link: "https://socallights.app/add-house?draft=abc" });
  assert.match(m.text, /add-house\?draft=abc/); assert.doesNotMatch(m.text, /\{\{/);
});

const read = (f) => readFileSync(new URL("../public/" + f, import.meta.url), "utf8");
test("wizard pages: review lists every answer, counters on the long texts, help link, skip link, buttons under the form on wide screens", () => {
  const ev = read("add-event.html"), ho = read("add-house.html"), js = read("addflow.js"), css = read("addflow.css"), add = read("add.html");
  for (const label of ["Season", "Type", "Hours", "Description"]) assert.match(ev, new RegExp(`sumRow\\("${label}"`), "event review: " + label);
  for (const label of ["Visit tips", "How to reach you", "About this installation", "About this house"]) assert.ok(ho.includes(`"${label}"`), "home review: " + label);
  assert.match(ev, /count: true/); assert.match(ho, /count: true/); assert.match(js, /ctrText/);
  assert.match(js, /Need help\?/); assert.match(js, /id="exitbtn"/); assert.match(js, /HEIC/); assert.match(js, /href="#main"/);
  assert.match(css, /@media\(min-width:900px\)\{[\s\S]*?\.bar\{position:static/); assert.match(css, /\.sumr \.link::after/);
  assert.match(add, /You'll sign in first \(free, no password\)/); assert.match(add, /href="#main"/);
  assert.match(ev, /themeBtn\(\)\}<span id="acct">/); assert.match(ho, /themeBtn\(\)\}<span id="acct">/);
});
