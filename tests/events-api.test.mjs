// /api/events: long-ended events are left out of the default payload, stay reachable on request, and the response has a working ETag.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet } from "../functions/api/events.js";
import { onRequestGet as adminList } from "../functions/api/admin/events/index.js";
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

const asAdmin = (env, qs = "?all=1") => onRequestGet({ request: new Request("http://localhost/api/events" + qs), env: Object.assign(Object.create(env), { ADMIN_DEV_BYPASS: "1" }), waitUntil() {} });

test("?ended=1 is public and returns the long-ended events; ?all=1 does too, for an admin only", async () => {
  const env = seed();
  assert.ok((await (await get(env, "?ended=1")).json()).some((e) => e.id === "old"));
  assert.ok((await (await asAdmin(env)).json()).some((e) => e.id === "old"));
  const anon = await get(env, "?all=1"); assert.equal(anon.status, 401); assert.ok(!(await anon.text()).includes("old"));
  assert.equal((await get(env, "?all=1", { "cf-access-jwt-assertion": "a.b.c" })).status, 401, "a made-up token is not enough");
});

test("GET /api/admin/events (the admin editor's feed) returns everything, uncached", async () => {
  const env = seed(), r = await adminList({ env });
  assert.equal(r.status, 200); assert.equal(r.headers.get("cache-control"), "no-store");
  assert.ok((await r.json()).some((e) => e.id === "old"));
});

test("cache key ignores unknown params: random query strings share one edge copy and never rebuild", async () => {
  const store = new Map(), prev = globalThis.caches;
  globalThis.caches = { default: { match: async (k) => store.get(k.url)?.clone(), put: async (k, r) => { store.set(k.url, r); } } };
  try {
    const env = seed(), jobs = [];
    let queries = 0; const db = env.DB; const spy = { ...env, DB: { prepare: (q) => { queries++; return db.prepare(q); } } };
    const ctx = (qs) => ({ request: new Request("https://x.test/api/events" + qs), env: spy, waitUntil: (p) => jobs.push(p) });
    await onRequestGet(ctx("")); await Promise.all(jobs.splice(0));
    const q1 = queries;
    for (const qs of ["?x=1", "?x=2&ref=fb", "?cb=" + Math.random(), "?ended=0", "?all=0"]) { const r = await onRequestGet(ctx(qs)); assert.equal(r.status, 200); }
    assert.equal(queries, q1, "no further database reads"); assert.equal(store.size, 1);
    await onRequestGet(ctx("?ended=1&junk=1")); await onRequestGet(ctx("?junk=2&ended=1")); await Promise.all(jobs.splice(0));
    assert.equal(store.size, 2, "ended has its own copy, whatever else is on the URL");
    await onRequestGet(ctx("?full=1&ended=1")); await Promise.all(jobs.splice(0));
    assert.equal(store.size, 3);
    assert.deepEqual([...store.keys()].sort(), ["https://x.test/api/events", "https://x.test/api/events?ended=1", "https://x.test/api/events?ended=1&full=1"]);
  } finally { globalThis.caches = prev; }
});

test("stale copy: concurrent requests start one rebuild, not one each", async () => {
  const store = new Map(), prev = globalThis.caches;
  globalThis.caches = { default: { match: async (k) => store.get(k.url)?.clone(), put: async (k, r) => { store.set(k.url, r); } } };
  try {
    const env = seed(), jobs = [], ctx = () => ({ request: new Request("https://x.test/api/events"), env, waitUntil: (p) => jobs.push(p) });
    await onRequestGet(ctx()); await Promise.all(jobs.splice(0));
    const k = [...store.keys()][0], old = store.get(k); store.set(k, new Response(await old.clone().text(), { headers: { ...Object.fromEntries(old.headers), "x-built": String(Date.now() - 300000) } }));
    await Promise.all([1, 2, 3, 4, 5].map(() => onRequestGet(ctx())));
    assert.equal(jobs.length, 1);
    await Promise.all(jobs.splice(0));
    // a later request, with the first rebuild finished and the copy fresh, starts nothing
    await onRequestGet(ctx()); assert.equal(jobs.length, 0);
    // a lease from another isolate (no in-flight entry here) also holds: the stored copy was pushed back, so a stale-looking-but-leased copy is not rebuilt
    const o2 = store.get(k); store.set(k, new Response(await o2.clone().text(), { headers: { ...Object.fromEntries(o2.headers), "x-built": String(Date.now() - 120000 + 15000) } }));
    await onRequestGet(ctx()); assert.equal(jobs.length, 0);
  } finally { globalThis.caches = prev; }
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
    const before = store.size; await onRequestGet({ request: new Request("http://localhost/api/events?all=1"), env: Object.assign(Object.create(env), { ADMIN_DEV_BYPASS: "1" }), waitUntil() {} }); assert.equal(store.size, before);
  } finally { globalThis.caches = prev; }
});
