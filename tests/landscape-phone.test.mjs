// A phone turned sideways (short and wide): one compact list layout, kept clear of the map's own buttons. Rebuilt 2026-11-25 (the old one showed barely one card and the Filters sheet ran off the screen).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("public/styles.css", "utf8"), js = readFileSync("public/app.js", "utf8");
const block = (css.match(/\/\* ---- Phone turned sideways[\s\S]*?\/\* end sideways phone layout \*\//) || [""])[0];

test("the sideways-phone layout exists and is limited to short, wide screens", () => {
  assert.ok(block.length > 2000);
  assert.match(block, /@media \(min-width:701px\) and \(max-height:500px\)\{/);
  assert.ok(!/@media \(max-width:700px\)/.test(block), "phones held upright are not touched");
});
test("it keeps the header to one scrolling row, shows cards as photo beside text, and puts the date pill away", () => {
  assert.match(block, /\.panel \.phead\{display:flex;flex-wrap:nowrap/);
  assert.match(block, /\.panel \.list \.item\{grid-template-columns:92px minmax\(0,1fr\)/);
  assert.match(block, /\.panel \.list \.tile \.when,\.panel \.list \.thumb \.when\{display:none\}/);
});
test("--panel-w stays a plain pixel number (the map code reads it with parseFloat; a clamp() would read as 0 and the pin card would slide under the list)", () => {
  const vals = [...block.matchAll(/--panel-w:([^;}]+)/g)].map((m) => m[1].trim());
  assert.ok(vals.length >= 2);
  for (const v of vals) assert.match(v, /^\d+px/, v);
});
test("Filters is a centered full-height sheet and the pin card fits a short screen", () => {
  assert.match(block, /\.fpanel\{[^}]*bottom:8px/);
  assert.match(block, /\.preview\{max-height:calc\(100vh - 16px\);overflow-y:auto/);
  assert.match(js, /const isShort = \(\) => matchMedia\("\(max-height:500px\)"\)\.matches/);
  assert.match(js, /isPhone\(\) \|\| isShort\(\)\) \{ f\.style\.top/);
  assert.match(js, /y = Math\.max\(isShort\(\) \? 62 : 96/);
});
test("an open event hides the sponsor line and tabs so the photo and facts get the height; the AI button is a round icon at the bottom left", () => {
  assert.match(block, /body\.detail-open \.panel>\.sponsor,body\.detail-open \.panel \.ptabs\{display:none\}/);
  assert.match(block, /:root \.scl-chat-fab\{right:auto;left:/);
});
test("the page links the current stylesheet and script versions", () => {
  const html = readFileSync("public/index.html", "utf8");
  assert.match(html, /styles\.css\?v=20261125e/); assert.match(html, /app\.js\?v=20261125d/);
});
