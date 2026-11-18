// The Shop tab is gone (Rey, 2026-11-18): no Shop or Support tab on the website or in the apps. Donating stays in the More menu (website only); the apps have no tips or affiliate links.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync("public/app.js", "utf8"), html = readFileSync("public/index.html", "utf8");

test("there is no Shop or Support tab: the page has only Places and Favorites, and the code has no shop panel", () => {
  assert.doesNotMatch(html, /id="t-shop"|data-tab="shop"/);
  assert.match(html, /id="t-events"/); assert.match(html, /id="t-plan"/);
  assert.doesNotMatch(app, /state\.tab === "shop"|syncShopTab|nudgeShopTabs|const SUPPORT|data-supp-share|amzUrl|shopCats|shopSeason/, "no leftover shop code");
  assert.match(app, /\["events", "plan"\]\.forEach/);
});
test("the website's More menu still has the support item (donate), and it is left out of the apps", () => {
  assert.match(app, /IN_APP \? "" : row\("button", 'type="button" data-m="support"'/);
  assert.match(app, /safeUrl\(SITE\.donateUrl\)/);
});
