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

test("Admin windows wire their own X from inside the window (a record page behind one has its own #mClose, and a page-wide lookup grabbed that one: the X and Cancel did nothing), and the Edit house window keeps Save/Cancel inside its card", () => {
  const js = readFileSync("public/admin/admin.js", "utf8");
  assert.ok(!/\$\("#mClose"\)/.test(js), 'no page-wide $("#mClose") lookups remain');
  assert.ok((js.match(/m\.querySelector\("#mClose"\)\.onclick/g) || []).length >= 10, "each window wires the X it contains");
  const edit = js.slice(js.indexOf("function editPost("), js.indexOf("function editPost(") + 6500);
  assert.ok(!/\{ hint: "Shown on the listing\." \}\)\)\}\s*<\/div>\s*<div class="mfoot sticky">/.test(edit), "no stray </div> closes the card before the Save/Cancel bar");
});

test("a user's page: an 'Events they submitted' row opens that exact submission (by id), not the list with the name typed into the search box", async () => {
  const js = readFileSync("public/admin/admin.js", "utf8");
  assert.match(js, /data-pf-sub="\$\{esc\(e\.name\)\}" data-pf-subid="\$\{esc\(e\.id \|\| ""\)\}" data-pf-view="\$\{e\.status === "published" \? "published" : e\.status === "declined" \? "declined" : "pending"\}"/);
  assert.match(js, /SUBOPEN = b\.dataset\.pfSubid \|\| ""; PRESET = SUBOPEN \? "" : b\.dataset\.pfSub; SUBVIEW = b\.dataset\.pfView \|\| "pending"; setTab\("subs"\);/);
  const { DB, raw } = makeDB(); const { onRequestGet: userGet } = await import("../functions/api/admin/users/[id].js");
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('u1','org@example.com','Olive')").run();
  raw.prepare("INSERT INTO event_submissions (id,name,city,county,season,type,start_date,end_date,contact_email,status) VALUES ('s1','Living Nativity','Rancho Santa Fe','San Diego','christmas','show','2026-12-18','2026-12-18','org@example.com','published')").run();
  const d = await (await userGet({ params: { id: "u1" }, env: { DB } })).json();
  assert.equal(d.events[0].id, "s1", "the user's record gives each submitted event's id");
});
