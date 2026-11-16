// Visitor audit 2026-11-16 (F1, F2, F5, F8, F9, F12, F20, F22): history steps for the event card, an error with Try again,
// "did you mean" search, ZIP suggestion, offline and map-tile notes, empty seasons. public/app.js has no exports, so
// these read its source and run the pure search helpers in isolation.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const js = readFileSync("public/app.js", "utf8"), css = readFileSync("public/styles.css", "utf8");

test("F1: opening a card pushes a history step, Back/popstate closes it, Forward reopens it", () => {
  assert.match(js, /history\.pushState\(st, "", h\)/);
  assert.match(js, /addEventListener\("popstate"/);
  assert.match(js, /openDetail\(k, true\)/, "Forward reopens the card without pushing another step");
  assert.match(js, /\$\("#back"\)\.onclick = closeDetail/, "the round Back arrow takes the step back");
  assert.match(js, /if \(!state\.detail\) dropDetailStep\(\)/, "a card closed another way leaves no stale step");
  assert.match(js, /const detailHash = \(k\) => \(\/\^e:\/\.test\(k\) \? "#e-" : "#h-"\)/, "the step uses the same #e-/#h- links the deep-link handler reads");
});

test("F2: a failed event list is an error with a Try again button, not the empty state", () => {
  assert.match(js, /function loadFailed\(\)/);
  assert.match(js, /id="retryload"/);
  assert.match(js, /Events couldn't load\. Check your connection and try again\./);
  assert.match(js, /: !E\.length \? `<div class="empty" role="alert">Events couldn't load/, "an empty list is never shown as 'no events yet'");
  assert.match(js, /if \(isPhone\(\)\) setSheet\("full"\); \/\/ the collapsed sheet would hide the message/);
});

// the pure search helpers, pulled out of app.js
const slice = (from, to) => { const a = js.indexOf(from), b = js.indexOf(to, a); assert.ok(a > 0 && b > a, from); return js.slice(a, b); };
const helpers = () => new Function("CITY_OPTS", "E", "TODAY", `
  const SUFFIX = { street: "st", avenue: "ave", drive: "dr", road: "rd", lane: "ln", court: "ct", circle: "cir", place: "pl", boulevard: "blvd", terrace: "ter", parkway: "pkwy", highway: "hwy", north: "n", south: "s", east: "e", west: "w" };
  const hay = (t) => String(t || "").toLowerCase().replace(/[.,#]/g, " ").replace(/\\b[a-z]+\\b/g, (w) => SUFFIX[w] || w).replace(/\\s+/g, " ");
  ${slice("function editDist(", "document.addEventListener(\"click\", (e) => {\n  const wl")}
  return { editDist, didYouMean, zipInfo };`);
const CITIES = { Pasadena: [0, 0], "East Pasadena": [0, 0], Irvine: [0, 0], "San Diego": [0, 0], Anaheim: [0, 0], "Los Angeles": [0, 0] };

test("F5: a misspelled city gets a 'did you mean'", () => {
  const { didYouMean } = helpers()(CITIES, [], "2026-11-16");
  assert.deepEqual(didYouMean("Pasedena").slice(0, 1), ["Pasadena"]);
  assert.ok(didYouMean("anahiem").includes("Anaheim"));
  assert.ok(didYouMean("Los Angelas").includes("Los Angeles"));
  assert.deepEqual(didYouMean("pasadena"), [], "an exact match is not a suggestion");
  assert.deepEqual(didYouMean("zzzzzz"), []);
  assert.deepEqual(didYouMean("irv"), [], "short text is left alone");
  assert.deepEqual(didYouMean("92101"), []);
});

test("F5: nothing matched on the collapsed phone sheet lifts the sheet", () => {
  assert.match(js, /!E\.some\(evMatch\) && !SHOW\.some\(instMatch\)\) setSheet\("full"\)/);
});

test("F12: a ZIP search says what it found", () => {
  const { zipInfo } = helpers()(CITIES, [
    { city: "San Diego", e: "2026-12-30", a: "1 A St, San Diego, CA 92101" }, { city: "San Diego", e: "2026-12-30", a: "9 B St, San Diego, CA 92101" },
    { city: "Irvine", e: "2026-12-30", a: "x, Irvine, CA 92602" }, { city: "San Diego", e: "2020-01-01", a: "old 92101" },
  ], "2026-11-16");
  assert.deepEqual(zipInfo("92101"), { n: 2, city: "San Diego" });
  assert.equal(zipInfo("99999"), null); assert.equal(zipInfo("sandiego"), null);
  assert.match(js, /data-zip="1"/);
});

test("F8/F9: offline and map-tile notes never take touches", () => {
  assert.match(js, /addEventListener\("offline", offlineNote\)/);
  assert.match(js, /map\.on\("error"/);
  assert.match(js, /Map tiles are unavailable right now\. The list still works\./);
  const rule = css.match(/\.mapnote\{[^}]*\}/);
  assert.ok(rule && /pointer-events:none/.test(rule[0]), ".mapnote is pointer-events:none (pinch fix of 2026-11-14)");
});

test("F20: seasons with nothing listed are marked in the menu", () => {
  assert.match(js, /const seasonHasPlaces = /);
  assert.match(js, /Nothing listed yet/);
});

test("the map-pinch rule of 2026-11-14 is still there", () => {
  assert.match(css, /\.searchrow\{pointer-events:none\}\.searchrow>\*\{pointer-events:auto\}/);
});
