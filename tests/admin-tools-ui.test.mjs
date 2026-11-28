// Admin tools (audit F-30, F-31, F-21, F-19): the pieces of the Admin page that call the new endpoints are wired up. The behaviour itself is tested against the real handlers in
// admin-event-merge, admin-event-recheck and admin-export-search; these checks catch a button or filter that silently disappears from the page.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const js = read("public/admin/admin.js");

test("Download CSV buttons exist for orders, submitted events, event claims and visitor reports; each type is served by the export endpoint", () => {
  for (const t of ["orders", "submissions", "claims", "reports"]) { assert.ok(js.includes(`dl("${t}")`), t + " has a button"); assert.match(read("functions/api/admin/export.js"), new RegExp(`type === "${t}"`)); }
  assert.match(js, /users\?format=csv/, "the Users page keeps its own button");
});

test("Events tab: a No photo tab with a count, an Add photo link that opens the editor at Photos, and a 'not re-checked in 30 days' filter", () => {
  assert.match(js, /\["nophoto", "No photo" \+/);
  assert.match(js, /EVVIEW !== "nophoto" \|\| EVQ2\.nophoto\.has\(e\.id\)/);
  assert.match(js, /data-focus="photos">Add photo<\/a>/);
  assert.match(js, /editEvent\(EVENTS\.find\(\(y\) => y\.id === b\.dataset\.edit\), b\.dataset\.focus\)/);
  assert.match(js, /\["recheck", `Page not re-checked in 30 days/);
  assert.match(js, /\/api\/admin\/event-queues/);
  assert.doesNotMatch(js, /\["stale", `Page not re-checked/, "the key must not collide with the existing 'stale' health filter");
});

test("event editor: Merge a duplicate (preview, then a two-tap merge with Undo) and Re-check this event's page", () => {
  assert.match(js, /fsec\("Merge a duplicate"/); assert.match(js, /\/api\/admin\/events\/merge\?keep=/); assert.match(js, /tap\(b, "merge"\)/); assert.match(js, /undo: \(\) => restoreEvents\(\[dupId\]\)/);
  assert.match(js, /fsec\("Check the event's page"/); assert.match(js, /Re-check this event's page/); assert.match(js, /\/api\/admin\/events\/recheck/);
  assert.match(js, /merge: "merged a duplicate into"/, "the Admin log reads in words");
  assert.match(read("public/admin/admin.css"), /\.mgrow\b/);
});

test("Admin script and style versions are bumped together", () => {
  const idx = read("public/admin/index.html");
  assert.match(idx, /admin\.js\?v=20261128e/); assert.match(idx, /admin\.css\?v=20261128d/);
});
