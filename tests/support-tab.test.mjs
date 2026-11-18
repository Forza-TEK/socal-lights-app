// Inside the iPhone and Android apps the Shop tab is the Support tab: free ways to help, no tips, no Amazon links (store rules). On the website Shop keeps the Amazon categories and gains a Donate card.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync("public/app.js", "utf8");

test("in the app the shop tab becomes Support and offers only free actions; the web shop keeps Amazon and adds a support card", () => {
  const sync = app.slice(app.indexOf("function syncShopTab"), app.indexOf("function openSupport"));
  assert.match(sync, /const on = shopCats\(\)\.length > 0 \|\| IN_APP/, "the tab exists in the app even though the Amazon shop does not");
  assert.match(sync, /lb\.textContent = "Support"/); assert.match(sync, /"Support us"/);
  const branch = app.slice(app.indexOf('state.tab === "shop" && IN_APP'), app.indexOf('} else if (state.tab === "shop") {'));
  assert.ok(branch.length > 100); assert.doesNotMatch(branch, /amzUrl|amazon|donate|cash\.app|affiliate/i, "no money, tips or affiliate links in the app's Support tab");
  const web = app.slice(app.indexOf('} else if (state.tab === "shop") {'), app.indexOf('} else {', app.indexOf('} else if (state.tab === "shop") {')));
  assert.match(web, /amzUrl\(q\)/); assert.match(web, /class="shopcard shopsupport" href="\$\{esc\(safeUrl\(SITE\.donateUrl\)\)\}"/, "the web shop's first card is a Donate link straight to the tip page");
  const list = app.slice(app.indexOf("const SUPPORT = ["), app.indexOf("const rateUrl"));
  for (const k of ["/add-house", "/add-event", "share", "rate"]) assert.ok(list.includes(`link: "${k}"`), k);
  assert.doesNotMatch(list, /pricing|sponsor|feature|donate/, "no price pages inside the app");
  assert.match(app, /nudgeShopTabs\(\);?/); assert.match(app, /t === "shop" && !IN_APP/);
});
test("the rate-the-app card only appears when a store page is configured", () => {
  const cfg = readFileSync("public/site-config.js", "utf8");
  assert.match(cfg, /appStoreUrl: "", playStoreUrl: ""/); assert.match(app, /SUPPORT\.filter\(\(x\) => x\.link !== "rate" \|\| rateUrl\(\)\)/);
});
