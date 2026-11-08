// Cloudflare caches scripts and stylesheets in the browser for 4 hours and _headers cannot change that, so a page only picks up a changed
// file when the ?v= on its tag changes. Rules enforced here:
//   1. every page references a given script or stylesheet with the same ?v= value;
//   2. every script, stylesheet and module import of our own files (/x.js, /x.css) carries a ?v= at all;
//   3. a script or stylesheet changed since origin/main has a different ?v= than on origin/main (skipped when origin/main is not there).
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
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

test("every script, stylesheet and import of our own files has a ?v=", () => {
  const bare = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/(?:\bsrc=|\bhref=|\bfrom\s+|\bimport\s+)["']\/([a-z0-9-]+\.(?:js|css))["']/g)) {
      if (m[1] === "sw.js") continue; // the service worker is registered by its plain address on purpose
      bare.push(`${f}: /${m[1]}`);
    }
  }
  assert.deepEqual(bare, [], "add ?v=<today's date and letter> to: " + bare.join("; "));
});

const git = (...a) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 }).trim();
const inTree = (rev, tag) => { try { git("grep", "-q", "-F", tag, rev, "--", "public", "functions"); return true; } catch { return false; } };
test("a script or stylesheet changed since origin/main has a ?v= that differs from the one on origin/main", (t) => {
  let base = ""; try { base = git("merge-base", "HEAD", "origin/main"); } catch {}
  if (!base) return t.skip("origin/main is not available here");
  let changed = []; try { changed = git("diff", "--name-only", base, "--", "public").split("\n").filter((f) => /^public\/[a-z-]+\.(js|css)$/.test(f)); } catch {}
  const tags = new Map(); // asset name -> the ?v= value as referenced now
  for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(/\/([a-z-]+\.(?:js|css))\?v=([0-9a-z]+)/g)) tags.set(m[1], m[2]);
  const stale = [];
  for (const f of changed) {
    const name = f.slice(7), v = tags.get(name);
    if (v && inTree(base, `/${name}?v=${v}`)) stale.push(`${name} (?v=${v})`);
  }
  assert.deepEqual(stale, [], "these files changed but their ?v= did not, so browsers may keep the old copy for hours: " + stale.join(", "));
});
