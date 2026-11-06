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

test("event objects keep exactly the fields the app reads", async () => {
  const env = seed();
  const e = (await (await get(env)).json())[0];
  for (const k of ["id", "n", "c", "city", "t", "s", "e", "st", "free", "p", "h", "lat", "lng", "b", "u", "sn", "v", "a", "img", "imgs", "f", "nt", "lc"]) assert.ok(k in e, k);
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
