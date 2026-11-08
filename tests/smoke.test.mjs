// Smoke test: every server module loads and every browser script parses. Cloudflare's Pages build is otherwise the only check, and it only runs after merge.
// - functions/**/*.js are imported (a syntax error, a bad import path or a missing export fails here). Route files may only export the handler names Pages knows.
// - public/**/*.js (browser code, ES modules or classic scripts) are syntax-checked by Node; they are not run, because they need a browser.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync, copyFileSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
const walk = (dir, ext = ".js") => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p, ext) : p.endsWith(ext) ? [p] : []; }).sort();
const HANDLERS = new Set(["onRequest", "onRequestGet", "onRequestPost", "onRequestPut", "onRequestPatch", "onRequestDelete", "onRequestHead", "onRequestOptions"]);

test("every functions/**/*.js module imports without error", async () => {
  const files = walk(join(ROOT, "functions"));
  assert.ok(files.length > 100, "found " + files.length + " function files");
  const bad = [];
  for (const f of files) {
    try { await import(pathToFileURL(f).href); } catch (e) { bad.push(`${relative(ROOT, f)}: ${e && e.message}`); }
  }
  assert.deepEqual(bad, []);
});

test("route modules export only handler names Pages recognizes (a typo like onRequestPsot would silently make a route 404/405)", async () => {
  const bad = [];
  for (const f of walk(join(ROOT, "functions"))) {
    const rel = relative(ROOT, f);
    if (rel.startsWith("functions/_lib/")) continue; // helpers
    const m = await import(pathToFileURL(f).href);
    const names = Object.keys(m);
    const odd = names.filter((n) => /^onrequest/i.test(n) && !HANDLERS.has(n));
    if (odd.length) bad.push(`${rel}: ${odd.join(", ")}`);
    for (const n of names.filter((n) => HANDLERS.has(n))) if (typeof m[n] !== "function") bad.push(`${rel}: ${n} is not a function`);
  }
  assert.deepEqual(bad, []);
});

test("the API has at least one handler per route file (no file under functions/api that exports nothing routable and nothing else)", async () => {
  const empty = [];
  for (const f of walk(join(ROOT, "functions/api"))) {
    const m = await import(pathToFileURL(f).href);
    if (!Object.keys(m).some((n) => HANDLERS.has(n)) && !Object.keys(m).length) empty.push(relative(ROOT, f));
  }
  assert.deepEqual(empty, []);
});

test("every public/**/*.js file parses (checked as a module; the files are not run)", () => {
  const files = walk(join(ROOT, "public")), tmp = mkdtempSync(join(tmpdir(), "scl-syntax-")), bad = [];
  try {
    files.forEach((f, i) => {
      const t = join(tmp, `f${i}.mjs`); copyFileSync(f, t);
      try { execFileSync(process.execPath, ["--check", t], { stdio: ["ignore", "pipe", "pipe"] }); }
      catch (e) { bad.push(`${relative(ROOT, f)}: ${String(e.stderr).split("\n").find((l) => /Error/.test(l)) || e.message}`); }
    });
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  assert.ok(files.length > 20);
  assert.deepEqual(bad, []);
});

test("public modules that have no browser dependency import cleanly in Node (the pure helpers the pages and the server share)", async () => {
  const PURE = ["seasons.js", "cities.js", "rules.js", "feature-plans.js", "sponsor-plans.js", "norm.js", "stock.js"];
  const bad = [];
  for (const n of PURE) {
    const f = join(ROOT, "public", n);
    if (!statSync(f, { throwIfNoEntry: false })) { bad.push(n + ": missing (update this list)"); continue; }
    try { await import(pathToFileURL(f).href); } catch (e) { bad.push(`${n}: ${e && e.message}`); }
  }
  assert.deepEqual(bad, []);
});

test("every <script src> and module import in public/*.html points at a file that exists", () => {
  const missing = [];
  for (const h of walk(join(ROOT, "public"), ".html")) {
    const html = readFileSync(h, "utf8");
    for (const m of html.matchAll(/<script[^>]+src="([^"#?]+)(?:\?[^"]*)?"/g)) {
      const src = m[1]; if (/^(https?:)?\/\//.test(src)) continue;
      const p = src.startsWith("/") ? join(ROOT, "public", src) : join(h, "..", src);
      if (!statSync(p, { throwIfNoEntry: false })) missing.push(`${relative(ROOT, h)} -> ${src}`);
    }
  }
  assert.deepEqual(missing, []);
});
