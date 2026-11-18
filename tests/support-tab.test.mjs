// The Shop tab: back on the website (Amazon categories, with a Donate card first), never inside the iPhone and Android apps (store rules). Nothing replaces it in the apps.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync("public/app.js", "utf8"), html = readFileSync("public/index.html", "utf8");

test("the website has the Shop tab; the apps never do (no Support tab either)", () => {
  assert.match(html, /id="t-shop"/); assert.match(html, /data-tab="shop"/);
  assert.match(app, /const shopCats = \(\) => \(SITE\.amazonTag && !IN_APP \?/, "no Amazon shop inside the app wrapper");
  assert.match(app, /const on = shopCats\(\)\.length > 0;/, "the tab follows the shop list only: hidden in the apps");
  assert.doesNotMatch(app, /const SUPPORT = |data-supp-share|state\.tab === "shop" && IN_APP|const GIFT/, "no in-app Support tab");
});
test("the web Shop's first card is a Donate link straight to the tip page", () => {
  assert.match(app, /class="shopcard shopsupport" href="\$\{esc\(safeUrl\(SITE\.donateUrl\)\)\}"/);
  assert.match(app, /data-m="support"/, "the More menu still has the support box");
});
