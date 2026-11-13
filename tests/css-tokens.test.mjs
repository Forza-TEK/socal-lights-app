// Every var(--x) a stylesheet, page or page-writing script uses must be defined in public/tokens.css (the one shared palette) or declared in
// the same file. A variable that is defined on some pages only made pages fall back to light colors in night mode (the Remove-my-home form,
// the Founder city tag). Also checks that every page that uses the tokens loads tokens.css, and that the season reds are one value.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (["vendor", "tutorials", "img", "admin", "ad-assets"].includes(n) ? [] : walk(p)) : [p]; });
const files = [...walk("public"), ...walk("functions")].filter((p) => /\.(html|js|css)$/.test(p) && !p.endsWith("tokens.css"));
const tokens = readFileSync("public/tokens.css", "utf8");
const shared = new Set([...tokens.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1]));
// values a script writes onto one element (style="--tc:..") or that the print sheet receives from printables.js; they are set per element, not a palette
const PER_ELEMENT = new Set(["--tc", "--win", "--bg1", "--bg2", "--hi", "--hi2", "--dim", "--ns", "--qs"]);

test("every CSS variable in use is defined in tokens.css or in the same file", () => {
  const bad = [];
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    const own = new Set([...s.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1]));
    for (const m of s.matchAll(/var\(\s*(--[a-zA-Z0-9-]*[a-zA-Z0-9])(?![a-zA-Z0-9-])/g)) {
      const v = m[1];
      if (!shared.has(v) && !own.has(v) && !PER_ELEMENT.has(v)) bad.push(`${f}: ${v}`);
    }
  }
  assert.deepEqual([...new Set(bad)], [], "undefined variables (add them to public/tokens.css): " + [...new Set(bad)].join("; "));
});

test("pages that use the shared tokens load tokens.css first", () => {
  const miss = [];
  for (const f of files.filter((p) => p.startsWith("public/") && p.endsWith(".html"))) {
    const s = readFileSync(f, "utf8");
    if (/\/(addflow|styles)\.css/.test(s) && !/\/tokens\.css\?v=/.test(s)) miss.push(f);
    else if (/\/(addflow|styles)\.css/.test(s) && s.indexOf("/tokens.css") > s.search(/\/(addflow|styles)\.css/)) miss.push(f + " (tokens.css must come before the page stylesheet)");
  }
  const shell = readFileSync("functions/_lib/shell.js", "utf8");
  assert.match(shell, /<link rel="stylesheet" href="\/tokens\.css\?v=[0-9a-z]+"><style>/, "shell.js pages must link tokens.css before their style block");
  assert.deepEqual(miss, []);
});

test("no stylesheet or page re-declares the palette (colors live in tokens.css only)", () => {
  const dup = [];
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    if (/--s-christmas\s*:/.test(s) || /--ice\s*:/.test(s) || /--surface\s*:/.test(s) || /--tile\s*:/.test(s) || /--navhi\s*:/.test(s)) dup.push(f);
  }
  assert.deepEqual(dup, [], "move these definitions into public/tokens.css");
});

test("the text-field border token passes 3:1 against the page and card colors", () => {
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const light = tokens.match(/--field:(#[0-9a-f]{6})/i)[1], dark = tokens.match(/data-theme="dark"\][^}]*--field:(#[0-9a-f]{6})/i)[1];
  assert.ok(ratio(light, "#ffffff") >= 3, "light --field on white");
  assert.ok(ratio(dark, "#161a22") >= 3 && ratio(dark, "#0b0d12") >= 3, "dark --field on the card and page colors");
});

test("every page loads one hover layer and its asset versions match", () => {
  const css = readFileSync("public/tokens.css", "utf8");
  assert.match(css, /@media \(hover:hover\)/);
  for (const sel of [".iconbtn", "#addbtn", ".seasonbtn", ".bnav button", ".btn:not(.ghost)", ".maplibregl-ctrl-group button"]) assert.ok(css.includes(sel), sel + " has a hover color");
});
