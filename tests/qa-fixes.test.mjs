// Fixes found by the live QA pass (2026-11-16).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (f) => readFileSync(f, "utf8");

test("the shared safe-area rule has the specificity of a plain body, so a page stylesheet's own side padding (the 24px gutter) still wins", () => {
  const t = read("public/tokens.css");
  // A bare body:not(:has(>#map)) takes the specificity of the #map id and beat addflow.css, leaving the add forms, contests and entry pages with no side gutter on a phone.
  assert.ok(!/(^|\n)body:not\(:has\(>#map\)\)\{/.test(t), "no id-weight selector on body");
  assert.match(t, /body:where\(:not\(:has\(>#map\)\)\)\{padding-top:var\(--sat\)/);
});

test("Contests: panel ids differ from the tab names written to the address bar, so the page does not scroll to the panel on load", () => {
  const h = read("public/contests.html");
  for (const k of ["live", "mine", "past"]) { assert.ok(h.includes(`id="p-${k}"`), k); assert.ok(!h.includes(`id="${k}"`), `no element with id="${k}" (it would be the #${k} fragment target)`); }
});

test("Add a contest: the judges counter updates as you type", () => {
  const h = read("public/add-contest.html");
  assert.match(h, /id="jcount"/);
  assert.match(h, /if \(k === "judges"\) \{ const el = document\.getElementById\("jcount"\)/);
  assert.match(h, /of \$\{MAXJ\} judges/);
});

test("Report or hide dialog scrolls on a short phone, and the assistant button stays off the filter button and the add-flow Next button", () => {
  assert.match(read("public/styles.css"), /\.rptscrim\{[^}]*overflow-y:auto/);
  const c = read("public/chat.css");
  assert.match(c, /body\.filters-open \.scl-chat-fab\{display:none\}/);
  assert.match(c, /body:has\(#nextbtn\) \.scl-chat-fab\{bottom:/);
});
