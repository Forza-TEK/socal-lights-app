// Admin > Installers > an installer's record page: the figures are real numbers (the 30-day banner and top-card counts used to come back without the top-card ones: "shown undefined, taps NaN"),
// and the page's sections have room around them.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeDB } from "./_d1.mjs";
import { onRequestGet } from "../functions/api/admin/installers/[id].js";

test("the record's banner figures include the top-card counts, as numbers, with and without any stats", async () => {
  const { DB, raw } = makeDB(), env = { DB };
  raw.prepare("INSERT INTO installers (id,slug,name,status) VALUES ('i1','bright','Bright Nights','active')").run();
  let d = await (await onRequestGet({ params: { id: "i1" }, env })).json();
  for (const k of ["imp", "click", "call", "lst_imp", "lst_click", "lst_call"]) assert.equal(d.banner[k], 0, k + " is 0, not undefined");
  const day = new Date().toISOString().slice(0, 10);
  raw.prepare("INSERT INTO banner_stats (installer_id, day, imp, click, call, lst_imp, lst_click, lst_call) VALUES ('i1', ?, 5, 2, 1, 40, 6, 3)").run(day);
  d = await (await onRequestGet({ params: { id: "i1" }, env })).json();
  assert.deepEqual(d.banner, { imp: 5, click: 2, call: 1, lst_imp: 40, lst_click: 6, lst_call: 3 });
});

test("record pages: the small section headings inside a card keep their margins (a card-wide rule had zeroed the top one), and the status row and stat tiles have room", () => {
  const css = readFileSync("public/admin/admin.css", "utf8");
  assert.match(css, /\.rcard h3\.psec\{margin:30px 0 12px\}/);
  assert.match(css, /\.rcard \.rt\{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;margin:0 0 18px\}/);
});

test("Admin > Installers and Contests lists: the Actions cell is a spaced group (Open, View public page, Edit as owner, Hide) and long city lists are cut to three plus '+N more'", () => {
  const js = readFileSync("public/admin/admin.js", "utf8"), css = readFileSync("public/admin/admin.css", "utf8");
  assert.match(js, /<div class="racts"><a class="rl" href="#installers" data-iedit=[^>]*>Open<\/a><a class="rl" href="\/installer\/\$\{esc\(i\.slug\)\}" target="_blank" rel="noopener">View public page ↗<\/a><a class="rl" href="\$\{asUrl\("\/installer\/" \+ i\.slug \+ "\/manage"\)\}" target="_blank" rel="noopener">Edit as owner ↗<\/a>/);
  assert.match(js, /<div class="racts"><a class="rl" href="#contests" data-copen=[^>]*>Open<\/a>\$\{c\.owner_email \? `<a class="rl"[^`]*Edit as owner ↗<\/a>` : ""\}<\/div>/);
  assert.match(css, /\.racts\{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px 18px\}/);
  assert.doesNotMatch(js, /manage as owner<\/a>|view page<\/a>/, "the old run-together labels are gone");
  const f = new Function("esc", js.match(/const areasShort = [^\n]*/)[0] + "; return areasShort;")((s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"));
  assert.equal(f("Pasadena, Malibu"), "Pasadena, Malibu");
  assert.match(f("A, B, C, D, E, F"), /^A, B, C <span class="more" title="A, B, C, D, E, F">\+3 more<\/span>$/);
  assert.equal(f(""), "");
});
