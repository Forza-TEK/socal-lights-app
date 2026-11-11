// Home page speed (audit SEO-01): the first screen must not wait for the map, the assistant, a font host or the whole event list.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync, existsSync } from "node:fs";
import { onRequestGet, headOf, HEAD_COUNT } from "../functions/api/events.js";
import { defaultSeason } from "../public/seasons.js";
import { newEnv, addEvent, ptToday } from "./_pay.mjs";

const read = (p) => readFileSync(p, "utf8");
const html = read("public/index.html"), app = read("public/app.js");
const get = (env, qs = "", headers = {}) => onRequestGet({ request: new Request("https://x.test/api/events" + qs, { headers }), env, waitUntil() {} });

// the order the page gives the list before the map exists (see renderPanel and effStart in app.js): paid top placements, then start day (running now = today), then name
const pageOrder = (list, today, season) => list.filter((e) => (e.sn || "christmas") === season && e.e >= today)
  .sort((a, b) => (b.f === 2 ? 1 : 0) - (a.f === 2 ? 1 : 0) || (a.s > today ? a.s : today).localeCompare(b.s > today ? b.s : today) || a.n.localeCompare(b.n)).map((e) => e.id);

const mk = (i, s, e, over = {}) => ({ id: "e" + i, n: "Event " + String(i).padStart(3, "0"), s, e, sn: "christmas", f: 0, ...over });
const shift = (ymd, n) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);

test("headOf: the first page of the list from the head equals the first page from the whole list, ties and running events included", () => {
  const today = ptToday(), season = defaultSeason(today);
  const list = [];
  for (let i = 0; i < 400; i++) list.push(mk(i, shift(today, (i * 7) % 90 - 30), shift(today, (i * 7) % 90 + (i % 5)), { sn: i % 6 === 0 ? "summer" : season, f: i === 13 ? 2 : 0 }));
  for (let i = 400; i < 440; i++) list.push(mk(i, shift(today, -3), shift(today, 5), { n: "Zed running " + i })); // many running events, only name order separates them
  const head = headOf(list, today);
  assert.ok(head.length < list.length, "the head is a part of the list");
  assert.deepEqual(pageOrder(head, today, season).slice(0, HEAD_COUNT), pageOrder(list, today, season).slice(0, HEAD_COUNT));
  assert.ok(head.some((e) => e.f === 2), "paid top placements are always in the head");
});

test("headOf: few events, none this season, and a date a day off all still give a usable head", () => {
  const today = ptToday();
  assert.deepEqual(headOf([], today), []);
  const few = [mk(1, today, today), mk(2, shift(today, 40), shift(today, 41))];
  assert.equal(headOf(few, today).length, 2, "fewer events than a page: all of them");
  const other = [mk(1, shift(today, 2), shift(today, 3), { sn: "zzz" })];
  assert.ok(Array.isArray(headOf(other, today)));
});

test("/api/events?head=1: a smaller list built from the same data, own edge copy, never the head for ended/full, ETag works", async () => {
  const { env, raw } = newEnv();
  for (let i = 0; i < 150; i++) addEvent(raw, "hd" + i, { start_date: shift(ptToday(), i), end_date: shift(ptToday(), i + 1) });
  const whole = await (await get(env)).json(), headRes = await get(env, "?head=1"), head = await headRes.json();
  assert.equal(headRes.status, 200);
  assert.ok(head.length > 0 && head.length < whole.length, `${head.length} of ${whole.length}`);
  const ids = new Set(whole.map((e) => e.id)); assert.ok(head.every((e) => ids.has(e.id)), "nothing in the head that the whole list lacks");
  assert.deepEqual(head[0], whole.find((e) => e.id === head[0].id), "same shape as the whole list");
  const tag = headRes.headers.get("etag"); assert.ok(tag);
  assert.equal((await get(env, "?head=1", { "if-none-match": tag })).status, 304);
  assert.equal((await (await get(env, "?head=1&ended=1")).json()).length, (await (await get(env, "?ended=1")).json()).length, "ended=1 is never trimmed");
  assert.equal((await (await get(env, "?full=1&head=1")).json()).length, (await (await get(env, "?full=1")).json()).length, "full=1 is never trimmed");
});

test("/api/events?head=1 has its own cache key", async () => {
  const store = new Map(), prev = globalThis.caches, jobs = [];
  globalThis.caches = { default: { match: async (k) => store.get(k.url)?.clone(), put: async (k, r) => { store.set(k.url, r); } } };
  try {
    const { env } = newEnv();
    for (const qs of ["", "?head=1", "?head=1&x=2"]) { await onRequestGet({ request: new Request("https://x.test/api/events" + qs), env, waitUntil: (p) => jobs.push(p) }); await Promise.all(jobs.splice(0)); }
    assert.deepEqual([...store.keys()].sort(), ["https://x.test/api/events", "https://x.test/api/events?head=1"]);
  } finally { globalThis.caches = prev; }
});

test("home page: the map library, the assistant and a font host are not on the way to the first screen", () => {
  assert.ok(!/rel="preload"[^>]*maplibre/.test(html), "the 200 KB map library is not preloaded; app.js starts it after the first photos (mapWhenCalm)");
  assert.ok(!/<script[^>]*src="\/chat\.js[^>]*defer/.test(html) && /s\.src="\/chat\.js\?v=/.test(html), "the assistant is added when the page is idle");
  assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html), "the font is our own copy");
  assert.ok(/rel="preload" href="\/fonts\/plus-jakarta-sans-latin\.woff2" as="font"[^>]*crossorigin/.test(html));
  for (const f of ["latin", "latin-ext"]) assert.ok(existsSync(`public/fonts/plus-jakarta-sans-${f}.woff2`) && html.includes(`/fonts/plus-jakarta-sans-${f}.woff2`));
  assert.match(app, /function mapWhenCalm\(\)/); assert.ok(app.includes("mapWhenCalm(); //") && !/\n\s*loadMapLib\(\); \/\/ the list is on screen/.test(app));
});

test("home page: the first screen is asked for as a small head first, the whole list after it, and a shared link or #season waits for the whole list", () => {
  assert.ok(html.includes('"/api/events?head=1"') && html.includes("location.hash.length<2"));
  const pre = html.slice(html.indexOf("window.__pre="), html.indexOf("</script>", html.indexOf("window.__pre=")));
  assert.ok(pre.indexOf("api/events?head=1") < pre.indexOf('g("/api/events")') && /h\.then\(/.test(pre), "the whole list is requested only after the head has answered");
  assert.ok(pre.includes('"/api/posts"') && pre.includes('"/api/config"'));
  assert.match(app, /pre\["\/api\/events\?head=1"\]/); assert.match(app, /function takeFull\(ev\)/);
  assert.ok(/\.headonly \.hcount b/.test(html), "counts are hidden until the whole list is in");
});

test("list: when the whole list or a small map move leaves the first page of cards unchanged, the cards (and their photos) are not redrawn", () => {
  assert.match(app, /const pageSig = vis\.length > LIST_PAGE \?/);
  assert.match(app, /opts && \(opts\.quiet \|\| opts\.keepPage\) && pageSig && pageSig === listPageSig/);
  assert.match(app, /renderPanel\(\{ keepPage: true \}\)/);
  assert.ok(!/SOCAL_CTR/.test(app), "the order of the first list is still decided as before (Nearest once the map is there)");
});

test("service worker: ?head=1 is matched by path like the whole list", () => {
  const sw = read("public/sw.js");
  assert.ok(sw.includes('const DATA = ["/api/events", "/api/posts"]'), "matched by path, so ?head=1 is kept for offline use like the whole list");
});

test("asset budget: what the home page needs before the first screen stays small (bytes on disk, before compression)", () => {
  const size = (p) => statSync("public/" + p.replace(/\?.*/, "")).size;
  const first = ["styles.css", "routes.css", "app.js", "cities.js", "seasons.js", "stock.js", "site-config.js", "norm-ui.js", "norm.js", "tour.js", "maps.js", "banner.js", "auth.js", "chrome.js", "fonts/plus-jakarta-sans-latin.woff2", "img/badge-120.webp"];
  const total = first.reduce((n, f) => n + size(f), 0);
  assert.ok(total < 435_000, `first-screen files ${total} bytes (budget 435000; 420 KB when this test was written)`);
  assert.ok(size("img/badge-120.webp") < 8_000, "the header badge is a small copy, not the 160 px original");
  assert.ok(html.includes('src="/img/badge-120.webp" width="44"'));
  assert.ok(size("app.js") < 200_000, "app.js stays under 200 KB");
  assert.ok(size("vendor/maplibre-gl-4.7.1.js") > 100_000 && !/vendor\/maplibre[^"]*"[^>]*>\s*\n?<script/.test(html), "the map library is loaded by app.js, not by a tag in the page");
});

test("list photos: stock thumbnails go through the image resizer like our other photos", () => {
  assert.ok(/img\\\/events\|api\\\/photo\|img\\\/stock\\\/t/.test(app));
});
