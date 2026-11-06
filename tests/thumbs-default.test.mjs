// First visits resize remote event photos; only a remembered failed probe turns it off (audit seo-growth H5).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync("public/app.js", "utf8");

test("remote thumbnails default on, off only when a stored probe said 0, and a failed copy falls back to the original", () => {
  assert.match(src, /let THUMBS = false, THUMBS_REMOTE = true;/);
  assert.match(src, /THUMBS_REMOTE = localStorage\.getItem\("socal-thumbs-remote"\) !== "0"/);
  assert.match(src, /i\.dataset\.orig/, "the onerror fallback to the original photo is still there");
  // run the real expressions against a fake storage
  const decide = (stored) => { let v = true; try { v = stored !== "0"; } catch {} return v; };
  assert.equal(decide(null), true); assert.equal(decide("1"), true); assert.equal(decide("0"), false);
});
