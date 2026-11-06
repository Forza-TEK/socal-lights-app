// City pages: thin pages are noindex and out of the sitemap, nearby links, the /in hub, and the hidden city list on the home page.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as cityPage } from "../functions/in/[city].js";
import { onRequestGet as hub } from "../functions/in/index.js";
import { onRequestGet as sitemap } from "../functions/sitemap.xml.js";
import { onRequestGet as home } from "../functions/index.js";
import { summarize, nearby, isIndexable } from "../functions/_lib/cityindex.js";
import { newEnv, addEvent, ptToday } from "./_pay.mjs";

const seed = () => {
  const { env, raw } = newEnv();
  raw.prepare("DELETE FROM events").run();
  for (let i = 0; i < 3; i++) addEvent(raw, "big" + i, { city: "Bigtown", name: "Big " + i, lat: 34.0, lng: -118.0 });         // 3 events: indexable
  addEvent(raw, "conf1", { city: "Solo Confirmed", lat: 34.05, lng: -118.0 });
  raw.prepare("UPDATE events SET status = 'confirmed' WHERE id = 'conf1'").run();
  addEvent(raw, "exp1", { city: "Tiny Expected", lat: 34.01, lng: -118.01 });
  raw.prepare("UPDATE events SET status = 'expected' WHERE id = 'exp1'").run();
  return env;
};
const get = (fn, env, path, params = {}) => fn({ request: new Request("https://x.test" + path), env, params, waitUntil() {}, next: async () => new Response("<html><body><h1>map</h1></body></html>", { headers: { "content-type": "text/html" } }) });

test("indexable rule: 3+ events or one confirmed", () => {
  assert.equal(isIndexable({ n: 3, confirmed: 0 }), true);
  assert.equal(isIndexable({ n: 1, confirmed: 1 }), true);
  assert.equal(isIndexable({ n: 2, confirmed: 0 }), false);
});

test("summarize merges by slug and nearby skips thin cities", () => {
  const cs = summarize([{ city: "A", c: "X", lat: 34, lng: -118, st: "c" }, { city: "B b", c: "X", lat: 34.1, lng: -118, st: "e" }, { city: "C", c: "X", lat: 35, lng: -118, st: "c" }]);
  assert.deepEqual(nearby(cs, "a", 5).map((c) => c.slug), ["c"]); // b is thin (1 expected), c is confirmed
});

test("thin city page is noindex,follow with nearby links; strong page is indexable", async () => {
  const env = seed();
  const thin = await (await get(cityPage, env, "/in/tiny-expected", { city: "tiny-expected" })).text();
  assert.match(thin, /<meta name="robots" content="noindex,follow">/);
  assert.match(thin, /href="\/in\/bigtown"/); assert.match(thin, /href="\/in"/); assert.match(thin, /href="\/add-event"/);
  const big = await (await get(cityPage, env, "/in/bigtown", { city: "bigtown" })).text();
  assert.doesNotMatch(big, /name="robots"/);
  assert.match(big, /href="\/in\/solo-confirmed"/);
});

test("sitemap lists indexable cities and the hub, not thin ones", async () => {
  const xml = await (await get(sitemap, seed(), "/sitemap.xml")).text();
  assert.match(xml, /\/in\/bigtown</); assert.match(xml, /\/in\/solo-confirmed</); assert.match(xml, /<loc>https:\/\/x\.test\/in<\/loc>/);
  assert.doesNotMatch(xml, /tiny-expected/);
});

test("hub lists every city; home page gets a hidden city list and stays otherwise unchanged", async () => {
  const env = seed();
  const h = await (await get(hub, env, "/in")).text();
  for (const s of ["bigtown", "solo-confirmed", "tiny-expected"]) assert.match(h, new RegExp(`/in/${s}"`));
  const page = await (await get(home, env, "/")).text();
  assert.match(page, /<h1>map<\/h1>/); assert.match(page, /<nav class="sr" aria-label="Browse by city">/);
  assert.match(page, /href="\/in\/bigtown"/); assert.doesNotMatch(page, /tiny-expected/);
});
