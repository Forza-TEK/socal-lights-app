// iPhone universal links: the site file, the app entitlement and the in-app handler (audit F-45).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestGet, AASA, APP_ID } from "../functions/.well-known/apple-app-site-association.js";

test("the apple-app-site-association file names the team and bundle id and only content paths", async () => {
  const r = await onRequestGet(); assert.equal(r.headers.get("content-type"), "application/json");
  const j = await r.json(); assert.deepEqual(j, AASA); assert.equal(APP_ID, "39HYGXRCC8.app.socallights.lights");
  assert.deepEqual(j.applinks.details[0].appIDs, [APP_ID]);
  const paths = j.applinks.details[0].components.map((c) => c["/"]); assert.deepEqual(paths.sort(), ["/c/*", "/e/*", "/h/*", "/in", "/in/*"]);
  for (const bad of ["/admin", "/api", "/profile", "/add"]) assert.ok(!paths.some((p) => p.startsWith(bad)), bad + " is never an app link");
  assert.match(readFileSync("app/capacitor.config.json", "utf8"), /"appId": "app\.socallights\.lights"/);
});
test("the iOS project carries the Associated Domains entitlement for both build configurations", () => {
  assert.match(readFileSync("app/ios/App/App/App.entitlements", "utf8"), /com\.apple\.developer\.associated-domains[\s\S]*<string>applinks:socallights\.app<\/string>/);
  assert.equal((readFileSync("app/ios/App/App.xcodeproj/project.pbxproj", "utf8").match(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/g) || []).length, 2);
});
test("the in-app handler follows only our own https content links", () => {
  const js = readFileSync("public/native.js", "utf8");
  assert.match(js, /appUrlOpen/); assert.match(js, /u\.hostname === "socallights\.app"/); assert.match(js, /u\.protocol === "https:"/); assert.match(js, /\^\\\/\(e\|h\|c\|in\)/);
});
