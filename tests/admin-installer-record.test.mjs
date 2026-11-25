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
