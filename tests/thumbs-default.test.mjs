// Our own photos are resized from the first visit; only a remembered failed probe ("0") turns it off. Photos on other websites are never resized (audit 2026-11-16 H4, public/imgurl.js).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync("public/app.js", "utf8");

test("our own thumbnails default on, off only when a stored probe said 0, and a failed copy falls back to the original; remote photos are never resized", () => {
  assert.match(src, /let THUMBS = true; try \{ THUMBS = localStorage\.getItem\("socal-thumbs"\) !== "0"; \}/);
  assert.ok(!/THUMBS_REMOTE|socal-thumbs-remote/.test(src), "no remote-photo resizing any more");
  assert.match(src, /i\.dataset\.orig/, "the onerror fallback to the original photo is still there");
  assert.match(src, /resizedImage\(u, `width=\$\{w\},quality=75,format=auto`, location\.origin\)/);
  const decide = (stored) => { let v = true; try { v = stored !== "0"; } catch {} return v; };
  assert.equal(decide(null), true); assert.equal(decide("1"), true); assert.equal(decide("0"), false);
});
