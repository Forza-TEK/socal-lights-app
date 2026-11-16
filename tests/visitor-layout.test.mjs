// Visitor audit 2026-11-16 (layout: F3, F4, F10, F18, F19). Reads the style sheet and the sheet code.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("public/styles.css", "utf8"), js = readFileSync("public/app.js", "utf8"), shell = readFileSync("functions/_lib/shell.js", "utf8");

test("F3: the chat button is hidden while an event or home card is open", () => {
  assert.match(css, /body\.detail-open \.scl-chat-fab\{display:none\}/);
});
test("F4: the count row is hidden at Peek on a phone and the sheet reports its state", () => {
  assert.match(css, /@media \(max-width:700px\)\{#panel\[data-sheet="peek"\] \.phead \.hrow\{visibility:hidden\}\}/);
  assert.match(js, /panel\.dataset\.sheet = s/);
});
test("F19: the chip row wraps on a tablet so Sort is reachable", () => {
  assert.match(css, /@media \(min-width:701px\) and \(max-width:1100px\)\{\.phead \.quick\{flex-wrap:wrap;overflow:visible\}\}/);
});
test("F18: the kicker over a photo is white with a shadow, also on free events", () => {
  assert.match(css, /\.hero\.photo \.kicker,\.hero\.free\.photo \.kicker\{color:#fff;text-shadow/);
});
test("F10: links and controls are 44 px", () => {
  assert.match(css, /\.reportline a\{min-height:44px/);
  assert.match(css, /\.pvnav\{width:44px;height:44px\}/);
  assert.match(css, /\.sp-pause::after\{content:"";position:absolute;inset:-10px\}/);
  assert.match(shell, /\.cgrid a\{min-height:44px/);
});
test("nothing new takes touches over the map: the pinch rule stays and no new fixed full-width element is added", () => {
  assert.match(css, /\.searchrow\{pointer-events:none\}\.searchrow>\*\{pointer-events:auto\}/);
  const mine = css.slice(css.indexOf("Visitor audit 2026-11-16 (layout)"));
  assert.doesNotMatch(mine, /position:fixed/);
});
