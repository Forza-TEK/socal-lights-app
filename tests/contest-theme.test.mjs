// Each contest page gets a festive backdrop that matches its title (public/contesttheme.js).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { themeFor, applyTheme, THEME_KEYS } from "../public/contesttheme.js";

test("the theme follows the words in the contest's title, then its season", () => {
  const cases = [
    ["City of Eastvale - Holiday Home Lighting Contest 2026", "christmas", "lights"], ["Covina Christmas Lights Contest", "christmas", "lights"], ["Winter Wonderland Yard Contest", "christmas", "winter"],
    ["Haunted Home Spooktacular", "halloween", "halloween"], ["Pumpkin Porch Contest", "christmas", "halloween"], ["Fall Harvest Porch Contest", "christmas", "harvest"], ["Thanksgiving Table Decor", "christmas", "harvest"],
    ["New Year Countdown Lights", "newyear", "newyear"], ["Valentine's Door Contest", "valentines", "valentines"], ["Spring Garden Showcase", "spring", "spring"], ["Fourth of July Patriot Yards", "summer", "patriotic"],
    ["Best Yard 2026", "christmas", "lights"], ["Best Yard", "halloween", "halloween"], ["", "", "lights"],
  ];
  for (const [name, season, want] of cases) assert.equal(themeFor(name, season), want, name);
});

test("applyTheme sets the page variables for a theme and clears an unknown one", () => {
  const style = new Map(), el = { dataset: {}, style: { setProperty: (k, v) => style.set(k, v) } };
  globalThis.document = { querySelector: () => ({ offsetHeight: 72 }) };
  for (const k of THEME_KEYS) { style.clear(); applyTheme(el, k); assert.equal(el.dataset.fest, k); for (const v of ["--fest-band", "--fest-art", "--fest-tile", "--fest-top"]) assert.ok(style.get(v), k + " " + v); assert.match(style.get("--fest-art"), /^url\("data:image\/svg\+xml/); }
  applyTheme(el, "nope"); assert.equal(el.dataset.fest, undefined);
});

test("the contest page applies the theme from the contest's name and season, and cards stay solid", () => {
  const html = readFileSync("public/contest.html", "utf8"), css = readFileSync("public/contest.css", "utf8");
  assert.match(html, /applyTheme\(document\.body, themeFor\(D\.contest\.name, D\.contest\.season\)\)/);
  assert.match(css, /body\[data-fest\] \.cmain \.card\{background:var\(--surface/);
});
