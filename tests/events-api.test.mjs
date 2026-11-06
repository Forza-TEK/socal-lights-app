// /api/events: long-ended events are left out of the default payload, stay reachable on request, and the response has a working ETag.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet } from "../functions/api/events.js";
import { newEnv, addEvent, ptToday } from "./_pay.mjs";

const get = (env, qs = "", headers = {}) => onRequestGet({ request: new Request("https://x.test/api/events" + qs, { headers }), env, waitUntil() {} });
const seed = () => {
  const { env, raw } = newEnv();
  addEvent(raw, "now", { start_date: ptToday(-5), end_date: ptToday(20) });
  addEvent(raw, "future", { start_date: ptToday(10), end_date: ptToday(12) });
  addEvent(raw, "justended", { start_date: ptToday(-12), end_date: ptToday(-1) });
  addEvent(raw, "old", { start_date: ptToday(-200), end_date: ptToday(-100) });
  return env;
};

test("default payload drops events that ended long ago, keeps current, upcoming and just-ended", async () => {
  const env = seed();
  const ids = (await (await get(env)).json()).map((e) => e.id); // the test database also holds the real migration events
  for (const id of ["now", "future", "justended"]) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes("old"));
  const cutoff = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
  assert.ok((await (await get(env)).json()).every((e) => e.e >= cutoff), "nothing older than the grace window");
});

test("?ended=1 and ?all=1 still return the long-ended events", async () => {
  const env = seed();
  for (const qs of ["?ended=1", "?all=1"]) assert.ok((await (await get(env, qs)).json()).some((e) => e.id === "old"), qs);
});

test("list event objects keep the fields cards, pins, search and routes read (the blurb and link come from /api/events/<id>, see event-detail.test.mjs)", async () => {
  const env = seed();
  const e = (await (await get(env)).json())[0];
  for (const k of ["id", "n", "c", "city", "t", "s", "e", "st", "free", "p", "h", "lat", "lng", "sn", "v", "a", "img", "imgs", "f", "nt", "lc"]) assert.ok(k in e, k);
});

test("ETag: present, 304 on a matching If-None-Match, 200 again when the data changes", async () => {
  const { env, raw } = newEnv(); addEvent(raw);
  const r1 = await get(env); const tag = r1.headers.get("etag");
  assert.match(tag, /^W\/"[0-9a-f]{24}"$/); assert.equal(r1.status, 200); assert.match(r1.headers.get("cache-control"), /max-age=60/);
  const r2 = await get(env, "", { "if-none-match": tag });
  assert.equal(r2.status, 304); assert.equal(await r2.text(), ""); assert.equal(r2.headers.get("etag"), tag);
  assert.equal((await get(env, "", { "if-none-match": '"other", ' + tag })).status, 304);
  assert.equal((await get(env, "", { "if-none-match": 'W/"nope"' })).status, 200);
  raw.prepare("UPDATE events SET name = 'Changed' WHERE id = 'ev1'").run();
  const r3 = await get(env, "", { "if-none-match": tag });
  assert.equal(r3.status, 200); assert.notEqual(r3.headers.get("etag"), tag);
});

test("edge copy: a stale copy is served at once and rebuilt in the background; a fresh one is not rebuilt", async () => {
  const store = new Map(), prev = globalThis.caches;
  globalThis.caches = { default: { match: async (k) => store.get(k.url)?.clone(), put: async (k, r) => { store.set(k.url, r); } } };
  try {
    const { env, raw } = newEnv(); addEvent(raw, "edge1", { start_date: ptToday(1), end_date: ptToday(2) });
    const jobs = [], ctx = (qs = "", h = {}) => ({ request: new Request("https://x.test/api/events" + qs, { headers: h }), env, waitUntil: (p) => jobs.push(p) });
    const r1 = await onRequestGet(ctx()); const ids1 = (await r1.json()).map((e) => e.id); await Promise.all(jobs.splice(0));
    assert.ok(ids1.includes("edge1")); assert.equal(store.size, 1);
    addEvent(raw, "edge2", { start_date: ptToday(1), end_date: ptToday(2) });
    // fresh: served from the edge copy, edge2 not yet visible, nothing rebuilt
    const r2 = await onRequestGet(ctx()); assert.ok(!(await r2.json()).some((e) => e.id === "edge2")); assert.equal(jobs.length, 0);
    assert.match(r2.headers.get("cache-control"), /max-age=60/); assert.ok(!r2.headers.get("x-built"));
    // matching If-None-Match gets a 304 from the edge copy
    assert.equal((await onRequestGet(ctx("", { "if-none-match": r1.headers.get("etag") }))).status, 304);
    // stale: the old copy is still what is served, and a rebuild is queued that makes edge2 visible
    const k = [...store.keys()][0], old = store.get(k); store.set(k, new Response(await old.clone().text(), { headers: { ...Object.fromEntries(old.headers), "x-built": String(Date.now() - 200000) } }));
    const r3 = await onRequestGet(ctx()); assert.ok(!(await r3.json()).some((e) => e.id === "edge2")); assert.equal(jobs.length, 1);
    await Promise.all(jobs.splice(0));
    assert.ok((await (await onRequestGet(ctx())).json()).some((e) => e.id === "edge2"));
    // ?all=1 never touches the cache
    const before = store.size; await onRequestGet(ctx("?all=1")); assert.equal(store.size, before);
  } finally { globalThis.caches = prev; }
});
