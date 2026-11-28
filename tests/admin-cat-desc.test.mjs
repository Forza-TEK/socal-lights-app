import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Admin contest editor edits per-category descriptions and the API saves only the contest's categories", () => {
  const js = readFileSync("public/admin/admin.js", "utf8"), api = readFileSync("functions/api/admin/contests/[id].js", "utf8");
  assert.match(js, /catDescs/); assert.match(js, /shown under the category/);
  assert.match(api, /cleanCatDescs\(b\.catDescs/); assert.match(api, /category_desc=\?/);
});

test("Notices are full tinted boxes, not a coloured bar down one side", () => {
  for (const f of ["contest.css", "info.css", "addflow.css", "home-photos.html", "sponsor-invite.html", "organizer.html"]) {
    assert.doesNotMatch(readFileSync("public/" + f, "utf8"), /border-left:\s*[2-5]px solid/, f);
  }
});

test("Admin installer record has a two-tap bulk take-down that reuses the per-home unpublish", () => {
  const js = readFileSync("public/admin/admin.js", "utf8");
  assert.match(js, /id="iDownAll"/); assert.match(js, /tap\(down, "take down "/); assert.match(js, /action: "unpublish"/);
});

test("A phone turned sideways at SE size (667x375) gets a slim shell header and bar, and a lower collapsed list on the map", () => {
  assert.match(readFileSync("public/appshell.css", "utf8"), /max-width:699px\) and \(max-height:430px\)/);
  assert.match(readFileSync("public/admin/admin.css", "utf8"), /max-width:699px\) and \(max-height:430px\)/);
  assert.match(readFileSync("public/app.js", "utf8"), /const low = isPhone\(\) && isShort\(\)/);
});
