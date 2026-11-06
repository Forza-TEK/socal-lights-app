// Every page must reference a given script or stylesheet with the same ?v= value (Cloudflare caches them for 4 hours,
// so a page left on an older value keeps serving the old file).
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (["vendor", "tutorials", "img", "admin"].includes(n) ? [] : walk(p)) : [p]; });
const files = [...walk("public"), ...walk("functions")].filter((p) => /\.(html|js)$/.test(p));

test("one ?v= value per asset across all pages", () => {
  const seen = new Map();
  for (const f of files) {
    for (const m of readFileSync(f, "utf8").matchAll(/\/([a-z-]+\.(?:js|css))\?v=([0-9a-z]+)/g)) {
      const [, name, v] = m; if (!seen.has(name)) seen.set(name, new Map());
      const byV = seen.get(name); byV.set(v, [...(byV.get(v) || []), f]);
    }
  }
  const bad = [...seen].filter(([, byV]) => byV.size > 1).map(([n, byV]) => `${n}: ${[...byV.keys()].join(" vs ")}`);
  assert.deepEqual(bad, [], "mixed versions: " + bad.join("; "));
});
