// Home page: the hidden city/event list is byte-identical to the old two-scan version, comes from the edge copy, and the page falls back to the plain static page on any error.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as home, cityNavHtml } from "../functions/index.js";
import { loadCities } from "../functions/_lib/cityindex.js";
import { esc } from "../functions/_lib/shell.js";
import { newEnv, addEvent, ptToday } from "./_pay.mjs";

const PAGE = "<html><body><h1>map</h1></body></html>";
const mkCache = () => { const store = new Map(); return { store, default: { match: async (k) => store.get(k.url)?.clone(), put: async (k, r) => { store.set(k.url, r); } } }; };
const ctx = (env, jobs = []) => ({ request: new Request("https://x.test/"), env, waitUntil: (p) => jobs.push(p), next: async () => new Response(PAGE, { headers: { "content-type": "text/html" } }) });
// counts queries and rows returned by the database
const counting = (env) => {
  const c = { n: 0, rows: 0 };
  const spy = { ...env, DB: { prepare: (q) => { c.n++; const st = env.DB.prepare(q); return { bind: (...a) => { const b = st.bind(...a); return { all: async () => { const r = await b.all(); c.rows += r.results.length; return r; } }; } }; } } };
  return { spy, c };
};

// the previous implementation, verbatim (two queries)
async function legacyNav(env, today) {
  const cities = (await loadCities(env, today)).filter((c) => c.indexable);
  const byCounty = new Map();
  for (const c of cities) { const k = c.county || "Other"; (byCounty.get(k) || byCounty.set(k, []).get(k)).push(c); }
  const groups = [...byCounty].sort((a, b) => b[1].length - a[1].length).map(([county, list]) =>
    `<h3>${esc(county)} County</h3><ul>${list.sort((a, b) => b.n - a.n || a.city.localeCompare(b.city)).slice(0, 20).map((c) => `<li><a href="/in/${esc(c.slug)}" tabindex="-1">${esc(c.city)}: ${c.n} upcoming event${c.n === 1 ? "" : "s"}</a></li>`).join("")}</ul>`).join("");
  const evs = (await env.DB.prepare("SELECT id, name, city FROM events WHERE end_date >= ? AND status = 'confirmed' ORDER BY featured DESC, start_date, name LIMIT 20").bind(today).all()).results;
  const events = evs.length ? `<h2>Confirmed events coming up</h2><ul>${evs.map((e) => `<li><a href="/e/${encodeURIComponent(e.id)}" tabindex="-1">${esc(e.name)}, ${esc(e.city)}</a></li>`).join("")}</ul>` : "";
  return `<nav class="sr" aria-label="Browse by city"><h2>Holiday lights and events by city</h2><p><a href="/in" tabindex="-1">All cities</a> <a href="/pricing" tabindex="-1">Feature your event</a> <a href="/help" tabindex="-1">Help</a></p>${groups}${events}</nav>`;
}

test("new list equals the old one on a mixed data set (featured, ties, odd names, expected, other counties, ended)", async () => {
  const { env, raw } = newEnv(); // includes the real migration events
  for (let i = 0; i < 30; i++) addEvent(raw, "z" + i, { name: i % 3 ? "Name " + i : "Tie", city: ["Bigtown", "Smallville", "Ünï & Co"][i % 3], county: ["Orange", "Los Angeles", "San Diego"][i % 3], start_date: ptToday(i % 4), end_date: ptToday(5 + i), featured: i % 7 === 0 ? 1 : 0 });
  raw.prepare("UPDATE events SET status = 'confirmed' WHERE id LIKE 'z%' AND CAST(substr(id,2) AS INT) % 2 = 0").run();
  addEvent(raw, "old1", { start_date: ptToday(-30), end_date: ptToday(-10) });
  addEvent(raw, "nocity", { city: "" });
  const today = ptToday();
  assert.equal(await cityNavHtml(env, today), await legacyNav(env, today));
});

test("home page: served from the edge copy, one narrow query on a miss and none on a hit", async () => {
  const prev = globalThis.caches, cache = mkCache(); globalThis.caches = cache;
  try {
    const { env, raw } = newEnv(); addEvent(raw, "h1", { city: "Hometown" }); raw.prepare("UPDATE events SET status = 'confirmed' WHERE id = 'h1'").run();
    const { spy, c } = counting(env), jobs = [];
    const p1 = await (await home(ctx(spy, jobs))).text(); await Promise.all(jobs.splice(0));
    assert.equal(c.n, 1, "one query on a miss"); assert.match(p1, /^<html><body><h1>map<\/h1><nav class="sr"/); assert.match(p1, /href="\/e\/h1"/); assert.ok(p1.endsWith("</body></html>"));
    const p2 = await (await home(ctx(spy, jobs))).text();
    assert.equal(c.n, 1, "no database read on a hit"); assert.equal(jobs.length, 0); assert.equal(p2, p1);
  } finally { globalThis.caches = prev; }
});

test("stale copy: served at once, one rebuild for concurrent visitors, new data appears afterwards", async () => {
  const prev = globalThis.caches, cache = mkCache(); globalThis.caches = cache;
  try {
    const { env, raw } = newEnv(); addEvent(raw, "h1", { city: "Hometown" }); raw.prepare("UPDATE events SET status = 'confirmed' WHERE id = 'h1'").run();
    const { spy, c } = counting(env), jobs = [];
    await home(ctx(spy, jobs)); await Promise.all(jobs.splice(0));
    const k = [...cache.store.keys()][0], old = cache.store.get(k);
    cache.store.set(k, new Response(await old.clone().text(), { headers: { ...Object.fromEntries(old.headers), "x-built": String(Date.now() - 400000) } }));
    addEvent(raw, "h2", { city: "Hometown", name: "Brand New" }); raw.prepare("UPDATE events SET status = 'confirmed' WHERE id = 'h2'").run();
    const before = c.n, pages = await Promise.all([1, 2, 3].map(async () => (await home(ctx(spy, jobs))).text()));
    assert.ok(pages.every((p) => !p.includes("Brand New"))); assert.equal(jobs.length, 1);
    await Promise.all(jobs.splice(0)); assert.equal(c.n - before, 1);
    assert.match(await (await home(ctx(spy, jobs))).text(), /Brand New/);
  } finally { globalThis.caches = prev; }
});

test("falls back to the plain page when the database fails, and leaves non-HTML alone", async () => {
  const prev = globalThis.caches; globalThis.caches = { default: { match: async () => { throw new Error("cache down"); }, put: async () => { throw new Error("x"); } } };
  try {
    const bad = { DB: { prepare: () => { throw new Error("D1 down"); } } };
    assert.equal(await (await home(ctx(bad))).text(), PAGE);
    const json = { ...ctx(bad), next: async () => new Response("{}", { headers: { "content-type": "application/json" } }) };
    assert.equal(await (await home(json)).text(), "{}");
  } finally { globalThis.caches = prev; }
});
