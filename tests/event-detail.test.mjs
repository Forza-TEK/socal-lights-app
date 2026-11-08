// The event list leaves out the blurb (b) and link (u); GET /api/events/<id> returns the whole object.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as getList } from "../functions/api/events.js";
import { onRequestGet as getOne } from "../functions/api/events/[id].js";
import { newEnv, addEvent, ptToday } from "./_pay.mjs";

const list = (env, qs = "") => getList({ request: new Request((qs.includes("all=1") ? "http://localhost/api/events" : "https://x.test/api/events") + qs), env: qs.includes("all=1") ? Object.assign(Object.create(env), { ADMIN_DEV_BYPASS: "1" }) : env, waitUntil() {} }); // ?all=1 is admin only (local dev bypass here)
const one = (env, id, headers = {}) => getOne({ request: new Request("https://x.test/api/events/" + encodeURIComponent(id), { headers }), env, params: { id }, waitUntil() {} });
const ALL_KEYS = ["id", "n", "c", "city", "t", "s", "e", "st", "free", "p", "h", "lat", "lng", "b", "u", "sn", "v", "a", "img", "imgs", "f", "nt", "lc"];
const seed = () => {
  const { env, raw } = newEnv();
  addEvent(raw, "det1", { start_date: ptToday(1), end_date: ptToday(5) });
  raw.prepare("UPDATE events SET blurb = ?, hours = ?, address = ?, venue = ? WHERE id = 'det1'").run("A long description about glowing trees.", "6-9 pm", "1 Main St", "Town Square");
  addEvent(raw, "det2", { start_date: ptToday(1), end_date: ptToday(5) });
  raw.prepare("UPDATE events SET blurb = ? WHERE id = 'det2'").run("The big holiday contest for the best lights");
  return { env, raw };
};

test("list leaves out the blurb and link but keeps what the list, search, routes and calendar need", async () => {
  const { env } = seed();
  const all = await (await list(env)).json(), e = all.find((x) => x.id === "det1");
  for (const k of ALL_KEYS.filter((k) => k !== "b" && k !== "u")) assert.ok(k in e, k);
  assert.equal(e.a, "1 Main St"); assert.equal(e.h, "6-9 pm"); assert.equal(e.v, "Town Square");
  assert.ok(all.every((x) => !("b" in x) && !("u" in x)), "no event in the list carries b or u");
});

test("list marks a contest named only in the blurb (ct) so the Contests filter works without the blurb", async () => {
  const { env } = seed();
  const all = await (await list(env)).json();
  assert.equal(all.find((x) => x.id === "det2").ct, 1);
  assert.ok(!("ct" in all.find((x) => x.id === "det1")));
});

test("?full=1, ?ended=1 and ?all=1 keep returning the whole object", async () => {
  const { env } = seed();
  for (const qs of ["?full=1", "?ended=1", "?all=1"]) {
    const e = (await (await list(env, qs)).json()).find((x) => x.id === "det1");
    for (const k of ALL_KEYS) assert.ok(k in e, qs + " " + k);
    assert.equal(e.b, "A long description about glowing trees."); assert.match(e.u, /lightshow/);
  }
});

test("GET /api/events/<id> returns every field, equal to the full list entry", async () => {
  const { env } = seed();
  const r = await one(env, "det1"), d = await r.json();
  assert.equal(r.status, 200); assert.match(r.headers.get("content-type"), /json/);
  for (const k of ALL_KEYS) assert.ok(k in d, k);
  assert.deepEqual(d, (await (await list(env, "?full=1")).json()).find((x) => x.id === "det1"));
  const l = (await (await list(env)).json()).find((x) => x.id === "det1"); // a list entry plus the detail's b and u is the whole object
  assert.deepEqual({ ...l, b: d.b, u: d.u }, d);
});

test("detail: unknown id is a 404 with JSON; an ended event still opens", async () => {
  const { env } = seed();
  const r = await one(env, "nope"); assert.equal(r.status, 404); assert.ok((await r.json()).error);
  assert.equal((await one(env, "")).status, 404);
  assert.equal((await one(env, "x".repeat(300))).status, 404);
  const { env: e2, raw } = newEnv(); addEvent(raw, "old", { start_date: ptToday(-200), end_date: ptToday(-100) });
  assert.equal((await one(e2, "old")).status, 200);
});

test("detail: ETag, 304 on a matching If-None-Match, 200 again after a change, short cache", async () => {
  const { env, raw } = seed();
  const r1 = await one(env, "det1"), tag = r1.headers.get("etag");
  assert.match(tag, /^W\/"[0-9a-f]{24}"$/); assert.match(r1.headers.get("cache-control"), /max-age=60/);
  const r2 = await one(env, "det1", { "if-none-match": tag });
  assert.equal(r2.status, 304); assert.equal(await r2.text(), ""); assert.equal(r2.headers.get("etag"), tag);
  assert.equal((await one(env, "det1", { "if-none-match": 'W/"nope"' })).status, 200);
  raw.prepare("UPDATE events SET blurb = 'Changed' WHERE id = 'det1'").run();
  const r3 = await one(env, "det1", { "if-none-match": tag });
  assert.equal(r3.status, 200); assert.notEqual(r3.headers.get("etag"), tag); assert.equal((await r3.json()).b, "Changed");
});

test("detail: the edge copy is kept briefly and served (also as 304) without the database; a 404 is not stored", async () => {
  const store = new Map(), prev = globalThis.caches;
  globalThis.caches = { default: { match: async (k) => store.get(k.url)?.clone(), put: async (k, r) => { store.set(k.url, r); } } };
  try {
    const { env, raw } = seed(), jobs = [];
    const call = (id, h = {}) => getOne({ request: new Request("https://x.test/api/events/" + id, { headers: h }), env, params: { id }, waitUntil: (p) => jobs.push(p) });
    const r1 = await call("det1"); await Promise.all(jobs.splice(0)); assert.equal(store.size, 1);
    raw.prepare("UPDATE events SET blurb = 'Changed' WHERE id = 'det1'").run();
    const r2 = await call("det1"); assert.equal((await r2.json()).b, "A long description about glowing trees.", "served from the edge copy");
    assert.equal((await call("det1", { "if-none-match": r1.headers.get("etag") })).status, 304);
    assert.equal((await call("nope")).status, 404); await Promise.all(jobs.splice(0)); assert.equal(store.size, 1);
  } finally { globalThis.caches = prev; }
});

test("the list is well under the full payload", async () => {
  const { env } = newEnv(); // the test database holds the real migration events
  const small = await (await list(env)).text(), full = await (await list(env, "?full=1")).text();
  assert.ok(small.length < full.length * 0.8, `list ${small.length} vs full ${full.length}`);
});
