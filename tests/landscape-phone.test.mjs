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
test("everything beside the list is measured from the phone's real side margin (the Dynamic Island edge), not a fixed 8 px", () => {
  assert.match(block, /--pr:max\(8px,env\(safe-area-inset-right,0px\)\)/);
  assert.match(block, /\.panel\{right:var\(--pr\)\}/);
  assert.match(block, /\.ptoggle\{right:calc\(var\(--panel-w\) \+ var\(--pr\)\)\}/);
  assert.match(block, /\.maplibregl-ctrl-top-right\{right:calc\(var\(--panel-w\) \+ var\(--pr\) \+ 52px\)\}/);
  assert.match(block, /\.rtpill\{right:calc\(var\(--panel-w\) \+ var\(--pr\)/);
  assert.match(block, /\.list-hidden \.rtpill\{right:calc\(env\(safe-area-inset-right,0px\) \+ 34px\)\}/, "Route these follows the list when it is hidden");
  assert.match(block, /\.topbar\{width:calc\(100vw - var\(--panel-w\) - 46px - var\(--sair\) - var\(--sail\)\)\}/);
  assert.match(js, /function panelW\(\) \{[\s\S]*?isShort\(\) && !isPhone\(\)[\s\S]*?getComputedStyle\(p\)\.right/, "the map code counts the margin too");
});
test("the page links the current stylesheet and script versions", () => {
  const html = readFileSync("public/index.html", "utf8");
  assert.match(html, /styles\.css\?v=20261126b/); assert.match(html, /app\.js\?v=20261127a/);
});

test("the sponsor / Featured strip: the whole pill is the tap target (the name link is stretched over it), the call link stays its own target, and dragging the strip still cancels the tap", () => {
  const css = readFileSync("public/styles.css", "utf8"), js = readFileSync("public/banner.js", "utf8");
  assert.match(css, /\.sp-pill\{position:relative\}/);
  assert.match(css, /\.sp-pill \.sp-name::after\{content:"";position:absolute;inset:0;border-radius:inherit\}/);
  assert.match(css, /\.sp-pill a\.sp-tel\{position:relative;z-index:1\}/);
  assert.match(css, /\.sp-pill:has\(\.sp-name:focus-visible\)\{outline:2\.5px solid var\(--focus\)/, "keyboard focus outlines the whole pill");
  assert.match(css, /\.sp-win\{touch-action:pan-y;cursor:grab/, "sideways drags belong to the strip");
  assert.match(js, /win\.addEventListener\("click", \(e\) => \{ if \(suppress\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); \} \}, true\)/, "a drag never counts as a tap");
  assert.match(js, /Math\.abs\(e\.clientX - sx\) < 6/, "a drag starts after 6 px sideways");
});

test("the strip's second (looping) copy is tappable: it was inert, so a tap on it did nothing, and it is on screen about half the time; screen readers and Tab still skip it", () => {
  const js = readFileSync("public/banner.js", "utf8");
  assert.ok(!/class="sp-set sp-dup"[^>]*\binert\b/.test(js), "the looping copy is not inert");
  assert.match(js, /class="sp-set sp-dup" aria-hidden="true">\$\{set\.replace\(\/<a \/g, '<a tabindex="-1" '\)\}/);
  assert.match(readFileSync("public/app.js", "utf8"), /banner\.js\?v=20261126a/); assert.match(readFileSync("public/index.html", "utf8"), /banner\.js\?v=20261126a/);
});

test("the account button never shows a sign-in icon over a signed-in page: it re-checks before opening a sign-in sheet, retries a failed page-load check, and the profile page tells it who is signed in", () => {
  const ch = readFileSync("public/chrome.js", "utf8"), prof = readFileSync("public/profile.html", "utf8");
  assert.match(ch, /async function recheck\(\) \{ const i = await me\(true\); if \(!i\.user\) return false; acctUser = i\.user; paint\(\); return true; \}/);
  assert.match(ch, /if \(si\) \{ if \(await recheck\(\)\) \{[^}]*openMenu\(nb, false\); return; \} const u = await signIn\(/, "tapping the sign-in icon asks again first and opens the account menu when the person is in fact signed in");
  assert.match(ch, /if \(!acctUser && firstCheck && firstCheck\.down\) recheck\(\)/, "a failed first check is retried");
  assert.match(ch, /export function setAcctUser\(u\)/);
  assert.match(prof, /if \(i\.user\) setAcctUser\(i\.user\)/);
  assert.match(prof, /import \{ setAcctUser \} from "\/chrome\.js\?v=20261126a"/);
});

test("profile: a delete waiting out its Undo time is sent when the page is hidden (switching apps on an iPhone does not fire pagehide), kept alive so it survives", () => {
  const prof = readFileSync("public/profile.html", "utf8");
  assert.match(prof, /addEventListener\("pagehide", \(\) => pendingDeletes\.forEach\(\(send\) => send\(true\)\)\);/);
  assert.match(prof, /document\.addEventListener\("visibilitychange", \(\) => \{ if \(document\.visibilityState === "hidden"\) pendingDeletes\.forEach\(\(send\) => send\(true\)\); \}\);/);
  assert.match(prof, /fetch\(url, \{ method: "DELETE", keepalive: !!leaving \}\)/, "the request outlives the page");
});
