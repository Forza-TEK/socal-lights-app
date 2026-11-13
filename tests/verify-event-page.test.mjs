// verifyEventPage: a slow or dropped first load gets one more try; a real answer is judged on its content.
import test from "node:test";
import assert from "node:assert/strict";
import { verifyEventPage } from "../functions/_lib/events.js";

const page = (t, status = 200) => new Response(t, { status });
const NAME = "Night in Bethlehem", START = "2026-12-11";

test("first load fails, second works: the event is confirmed", async () => {
  let n = 0;
  const r = await verifyEventPage("https://example.org/x", NAME, START, async () => { if (n++ === 0) throw new Error("reset"); return page("A Night in Bethlehem 2026 at the church"); });
  assert.equal(n, 2); assert.equal(r.ok, true);
});
test("a 503 then a good page: tried again and confirmed", async () => {
  let n = 0;
  const r = await verifyEventPage("https://example.org/x", NAME, START, async () => (n++ === 0 ? page("busy", 503) : page("Night in Bethlehem 2026 Bethlehem")));
  assert.equal(r.ok, true); assert.equal(n, 2);
});
test("both loads fail: the note says the site would not answer, not that the page is wrong", async () => {
  let n = 0;
  const r = await verifyEventPage("https://example.org/x", NAME, START, async () => { n++; throw new Error("timeout"); });
  assert.equal(n, 2); assert.equal(r.ok, false); assert.match(r.note, /slow or would not answer/); assert.match(r.note, /open the link/);
});
test("a 404 is final (no second try) and is reported as such", async () => {
  let n = 0;
  const r = await verifyEventPage("https://example.org/x", NAME, START, async () => { n++; return page("nope", 404); });
  assert.equal(n, 1); assert.match(r.note, /HTTP 404/);
});
test("a page that loads but does not mention the event or year is still rejected", async () => {
  assert.match((await verifyEventPage("https://example.org/x", NAME, START, async () => page("Welcome to our church 2026"))).note, /name/);
  assert.match((await verifyEventPage("https://example.org/x", NAME, START, async () => page("Night in Bethlehem Bethlehem 2025"))).note, /2026/);
});
test("a bad link never reaches the network", async () => {
  const r = await verifyEventPage("not a url", NAME, START, async () => { throw new Error("should not run"); });
  assert.equal(r.ok, false); assert.match(r.note, /valid web address/);
});
