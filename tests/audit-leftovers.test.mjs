// Leftovers: #e- link while the map is open (hashchange), app-mode sign-in wording, no Pricing link in the hidden city list inside the app.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const auth = readFileSync(new URL("../public/auth.js", import.meta.url), "utf8");
const home = readFileSync(new URL("../functions/index.js", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../public/tokens.css", import.meta.url), "utf8");
test("hashchange opens an event or home card from a #e-/#h-/#m- link; unknown ids are ignored", () => {
  const i = app.indexOf('addEventListener("hashchange"'); assert.ok(i > 0);
  const b = app.slice(i, i + 900);
  assert.match(b, /\[ehm\]/); assert.match(b, /if \(!ev && !ho\) return;/); assert.match(b, /selectKey\(key, "list"\)/);
  assert.match(app, /const h = location\.hash\.slice\(1\), dl = h\.match/, "fresh-load route kept");
});
test("pinch guard untouched", () => {
  const css = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
  assert.match(css, /\.searchrow\{pointer-events:none\}\.searchrow>\*\{pointer-events:auto\}/);
});
test("sign-in sheet: neutral email wording in the app, unchanged on the web", () => {
  assert.match(auth, /inApp \? "Sign in with your email" : "Use your email instead"/);
});
test("hidden city list: the Pricing link is web-only (hidden by html.in-app)", () => {
  assert.match(home, /<a class="web-only" href="\/pricing" tabindex="-1">Feature your event<\/a>/);
  assert.match(tokens, /html\.in-app \.g-or,html\.in-app \.web-only\{display:none!important\}/);
});
