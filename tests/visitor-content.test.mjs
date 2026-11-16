// Visitor audit 2026-11-16 (content rules: F7, F11, F14, F15, F16, F17). public/app.js has no exports, so the pure helpers are cut out of its source and run here.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const js = readFileSync("public/app.js", "utf8");
const slice = (from, to) => { const a = js.indexOf(from), b = js.indexOf(to, a); assert.ok(a >= 0 && b > a, from); return js.slice(a, b); };
const lib = new Function(`
  ${slice("function tidyEvents(", "const CITY_OPTS")}
  const cut = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
  ${slice("function priceLine(", "const cut =")}
  ${slice("const homeTitleOf", "function placeHouses")}
  return { tidyEvents, unsureTonight, priceLine, homeTitleOf };`)();

test("F7: Tonight and This weekend leave out Expected events whose hours say check site", () => {
  const { unsureTonight } = lib;
  assert.equal(unsureTonight({ st: "e", h: "Nightly; check site" }), true);
  assert.equal(unsureTonight({ st: "e", h: "Check site" }), true);
  assert.equal(unsureTonight({ st: "e", h: "6-10pm" }), false, "expected with real hours stays");
  assert.equal(unsureTonight({ st: "c", h: "Nightly; check site" }), false, "confirmed stays");
  assert.match(js, /state\.date > ev\.e \|\| unsureTonight\(ev\)/);
  assert.match(js, /ev\.s > b \|\| unsureTonight\(ev\)/);
});

test("F17: price tags show paid extras and a neutral 'not listed'; past-years free is not free", () => {
  const { priceLine, tidyEvents } = lib;
  assert.equal(priceLine({ free: true, p: "Free" }), "Free");
  assert.equal(priceLine({ free: true, p: "Free; Santa photos $20" }), "Free + paid extras");
  assert.equal(priceLine({ free: false, p: "$25 adults" }), "From $25");
  for (const p of ["", "Check listing", "See site", "Price not listed"]) assert.equal(priceLine({ free: false, p }), "Price not listed", p);
  assert.equal(priceLine({ free: false, p: "Ticketed" }), "Ticketed");
  const [a, b] = tidyEvents([{ free: true, p: "Free in past years" }, { free: true, p: "Free" }]);
  assert.equal(a.free, false); assert.equal(b.free, true);
});

test("F15: http:// event photos are upgraded to https://", () => {
  const [a, b, c] = lib.tidyEvents([{ img: "http://example.com/a.jpg" }, { img: "https://x.org/b.jpg" }, {}]);
  assert.equal(a.img, "https://example.com/a.jpg"); assert.equal(b.img, "https://x.org/b.jpg"); assert.equal(c.img, undefined);
});

test("F14: a home titled 'Home at <street>' is listed as 'Home in <city>'", () => {
  const { homeTitleOf } = lib;
  assert.equal(homeTitleOf("Home at 12 Oak St", "Covina"), "Home in Covina");
  assert.equal(homeTitleOf("The D'Angelo's", "Covina"), "The D'Angelo's");
  assert.equal(homeTitleOf("Home at 12 Oak St", ""), "Home at 12 Oak St");
});

test("F11: the More menu links to /es", () => {
  assert.match(js, /href="\/es" hreflang="es" lang="es"[\s\S]{0,400}"Español"/);
});

test("F16: the map says Home, not 'Home display'", () => {
  assert.doesNotMatch(js, /["'>]Home displays?["'<]/);
  assert.doesNotMatch(readFileSync("public/index.html", "utf8"), /a home display/);
});

test("the map-pinch rule of 2026-11-14 is still there", () => {
  assert.match(readFileSync("public/styles.css", "utf8"), /\.searchrow\{pointer-events:none\}\.searchrow>\*\{pointer-events:auto\}/);
});
