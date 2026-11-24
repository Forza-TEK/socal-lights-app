// Audit F-31 (Admin exports: orders, users, submitted events, claims, reports) and F-33 (Admin search finds events by address, link and id, houses by street). Read-only handlers, no Stripe, no email.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as exportGet } from "../functions/api/admin/export.js";
import { onRequestGet as searchGet } from "../functions/api/admin/search.js";
import { onRequestGet as usersGet } from "../functions/api/admin/users/index.js";
import { newEnv, addEvent, addUser, ptToday } from "./_pay.mjs";

const exp = (env, q) => exportGet({ request: new Request("https://socallights.app/api/admin/export?" + q), env });
// A small CSV reader (quotes, doubled quotes, line breaks inside quotes), enough to check what a spreadsheet would see
const parse = (t) => { const rows = []; let row = [], cell = "", q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; } else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\r") { /* skip */ } else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c; } return rows; };
const get = async (env, type) => { const r = await exp(env, "type=" + type); assert.equal(r.status, 200); assert.match(r.headers.get("content-type"), /text\/csv/); assert.match(r.headers.get("content-disposition"), /attachment; filename="socal-lights-/); assert.equal(r.headers.get("cache-control"), "no-store"); return parse(await r.text()); };

test("orders CSV: refund status, buyer email, plan, amount and Stripe ids; one row per order", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { name: "Light Show" });
  const u = await addUser(raw, "u1", "buyer@example.com");
  const ins = raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,status,payment_intent,charge_id,refunded_at,note,user_id,applied,target) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
  ins.run("cs_1", "ev1", "pin", 1500, "buyer@example.com", "paid", "pi_1", "ch_1", null, null, u.id, 1, "event");
  ins.run("cs_2", "ev1", "season", 7500, "other@example.com", "refunded", "pi_2", "ch_2", "2026-11-20 10:00:00", "refunded by Rey", null, 0, "event");
  ins.run("cs_3", "ev1", "pin", 1500, "due@example.com", "refund_due", "pi_3", null, null, null, null, 1, "event");
  const t = await get(env, "orders");
  assert.deepEqual(t[0].slice(0, 12), ["ordered", "order id", "for", "what", "plan", "amount dollars", "currency", "status", "refund status", "refunded", "buyer email", "account email"]);
  assert.equal(t.length, 1 + 3, "header and three orders");
  const by = Object.fromEntries(t.slice(1, 4).map((r) => [r[1], r]));
  assert.equal(by.cs_1[2], "Light Show"); assert.equal(by.cs_1[5], "15.00"); assert.equal(by.cs_1[7], "paid"); assert.equal(by.cs_1[8], ""); assert.equal(by.cs_1[10], "buyer@example.com"); assert.equal(by.cs_1[11], "buyer@example.com"); assert.equal(by.cs_1[12], "pi_1");
  assert.equal(by.cs_2[5], "75.00"); assert.equal(by.cs_2[8], "refunded"); assert.equal(by.cs_2[9], "2026-11-20 10:00:00"); assert.equal(by.cs_2[4], "season");
  assert.equal(by.cs_3[8], "refund due");
});

test("every new export defuses a leading = + - @ in any cell (formula injection) and keeps commas, quotes and line breaks readable", async () => {
  const { env, raw } = newEnv();
  raw.prepare("INSERT INTO reports (id, ref, name, message, contact) VALUES (?,?,?,?,?)").run("r1", "e-x", "=HYPERLINK(\"http://evil\")", "line one\nline \"two\", with comma", "+1 555 0100");
  raw.prepare("INSERT INTO users (id,email,name,admin_note) VALUES (?,?,?,?)").run("u9", "-cmd@example.com", "@SUM(A1)", "=1+1");
  raw.prepare("INSERT INTO event_submissions (id,status,name,city,season,type,start_date,end_date,contact_email,note) VALUES (?,?,?,?,?,?,?,?,?,?)").run("s1", "pending", "+evil|name", "Irvine", "christmas", "walk", ptToday(5), ptToday(6), "a@example.com", "\t=tab");
  const rep = await get(env, "reports"), usr = await get(env, "users"), sub = await get(env, "submissions");
  assert.equal(rep[1][2], "'=HYPERLINK(\"http://evil\")"); assert.equal(rep[1][3], "line one\nline \"two\", with comma"); assert.equal(rep[1][4], "'+1 555 0100");
  assert.equal(usr[1][0], "'-cmd@example.com"); assert.equal(usr[1][1], "'@SUM(A1)"); assert.equal(usr[1][9], "'=1+1");
  assert.equal(sub[1][2], "'+evil|name"); assert.equal(sub[1][16], "'\t=tab");
  // the same rule as the older users list CSV
  const old = await usersGet({ request: new Request("https://socallights.app/api/admin/users?format=csv"), env });
  assert.match(await old.text(), /'-cmd@example\.com/);
});

test("submitted events, claims and reports exports list their rows; the submissions export can be filtered by status", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { name: "Light Show" }); await addUser(raw, "u1", "owner@example.com");
  const sub = raw.prepare("INSERT INTO event_submissions (id,status,name,city,season,type,start_date,end_date,contact_email,event_id,verified) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
  sub.run("s1", "published", "Light Show", "Pasadena", "christmas", "walk", ptToday(5), ptToday(6), "owner@example.com", "ev1", 1);
  sub.run("s2", "pending", "Another", "Irvine", "christmas", "walk", ptToday(5), ptToday(6), "b@example.com", null, 0);
  raw.prepare("INSERT INTO event_claims (id,event_id,user_id,email,method,status,note) VALUES (?,?,?,?,?,?,?)").run("c1", "ev1", "u1", "owner@example.com", "domain", "approved", "domain matched");
  raw.prepare("INSERT INTO reports (id, ref, name, message, contact) VALUES (?,?,?,?,?)").run("r1", "ev1", "Light Show", "It moved", "me@example.com");
  const all = await get(env, "submissions"), pend = parse(await (await exp(env, "type=submissions&status=pending")).text());
  assert.equal(all.length, 3); assert.equal(pend.length, 2); assert.equal(pend[1][2], "Another");
  const claims = await get(env, "claims"); assert.equal(claims[1][1], "approved"); assert.equal(claims[1][3], "Light Show"); assert.equal(claims[1][6], "owner@example.com");
  const reps = await get(env, "reports"); assert.equal(reps[1][1], "ev1"); assert.equal(reps[1][3], "It moved");
  const users = await get(env, "users"); assert.equal(users[1][0], "owner@example.com");
  const bad = await exp(env, "type=nope"); assert.equal(bad.status, 400); assert.match(await bad.text(), /orders, users, submissions, claims or reports/);
});

test("the older exports still work after the shared CSV helper (houses, events, installers, contests)", async () => {
  const { env, raw } = newEnv(); addEvent(raw, "ev1", { name: "=Evil Name" });
  const ev = (await get(env, "events")).find((r) => r[0] === "ev1"); assert.equal(ev[1], "'=Evil Name");
  for (const t of ["houses", "installers", "contests"]) await get(env, t);
});

// ---- F-33: search ----
const find = async (env, q) => (await (await searchGet({ request: new Request("https://socallights.app/api/admin/search?q=" + encodeURIComponent(q)), env })).json()).groups;
const group = (gs, k) => (gs.find((g) => g.k === k) || { items: [] }).items;

test("search finds an event by its street address, its web link and its id (and by name as before)", async () => {
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM events").run();
  addEvent(raw, "ev-oaks", { name: "Holidays in the Village", url: "https://holidaysinthevillage.org/" });
  raw.prepare("UPDATE events SET address = ?, venue = ? WHERE id = 'ev-oaks'").run("350 W Hillcrest Dr, Thousand Oaks, CA 91360", "The Oaks");
  addEvent(raw, "other-1", { name: "Another Show", url: "https://another.example.org/x" });
  assert.deepEqual(group(await find(env, "Hillcrest"), "events").map((x) => x.id), ["ev-oaks"], "address");
  assert.match(group(await find(env, "Hillcrest"), "events")[0].sub, /350 W Hillcrest/, "the matching address is shown so the person sees why");
  assert.deepEqual(group(await find(env, "holidaysinthevillage.org"), "events").map((x) => x.id), ["ev-oaks"], "web link");
  assert.deepEqual(group(await find(env, "ev-oaks"), "events").map((x) => x.id), ["ev-oaks"], "id");
  assert.deepEqual(group(await find(env, "e-ev-oaks"), "events").map((x) => x.id), ["ev-oaks"], "an id pasted with the card prefix");
  assert.deepEqual(group(await find(env, "Another Show"), "events").map((x) => x.id), ["other-1"], "name");
});

test("an exact id match is listed first even among newer events whose names also match; results are capped", async () => {
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM events").run();
  for (let i = 0; i < 12; i++) addEvent(raw, "show-" + i, { name: "Show " + i, start_date: ptToday(i), end_date: ptToday(i + 3) });
  addEvent(raw, "show", { name: "Show", start_date: ptToday(-30), end_date: ptToday(-20) });
  const items = group(await find(env, "show"), "events");
  assert.equal(items.length, 5, "capped at 5"); assert.equal(items[0].id, "show", "the exact id comes first");
});

test("search finds a house by street, treats % and _ literally, ignores one-letter queries, and stays within a few queries", async () => {
  const { env, raw } = newEnv();
  raw.prepare("INSERT INTO posts (id,status,title,biz,city,street,address,zip,county,season,poster_type,contact_email,lat,lng,descr) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run("p1", "approved", "Candy Cane Lane", "The Smiths", "Irvine", "25972 Limerick Ln", "", "92618", "Orange", "christmas", "homeowner", "s@example.com", 33.6, -117.7, "Lights");
  assert.equal(group(await find(env, "Limerick"), "houses").length, 1);
  assert.equal((await find(env, "50% off")).length, 0); assert.equal((await find(env, "a")).length, 0);
  env.DB.stats.reset(); await find(env, "Limerick");
  assert.ok(env.DB.stats.calls <= 6, "one query per group, no loops: " + env.DB.stats.calls);
});
