// The sweeps' gap report and work order (scripts/coverage-gaps.mjs), the season categories and the venue watchlist (docs/watchlist.json).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SEASONS } from "../public/seasons.js";
import { CATEGORIES, activeSeasons } from "../scripts/coverage-categories.mjs";
import { countCategory, statusOf, seasonReport, groupRanking, watchlistStatus, workOrder, formatReport, formatWorkOrder, loadWatchlist } from "../scripts/coverage-gaps.mjs";
import { parseCities } from "../scripts/coverage-report.mjs";

const TODAY = "2026-11-14";
const ev = (o) => ({ id: o.id || o.n, n: "", v: "", b: "", t: "tree", sn: "christmas", e: "2026-12-20", s: "2026-12-01", city: "Irvine", c: "Orange", a: "", ...o });

test("every season has categories; ids are unique, targets are positive, regexes and types are valid for that season", () => {
  for (const s of Object.keys(SEASONS)) {
    assert.ok(CATEGORIES[s] && CATEGORIES[s].length >= 3, s + " has categories");
    const ids = CATEGORIES[s].map((c) => c.id); assert.equal(new Set(ids).size, ids.length, s + " ids unique");
    for (const c of CATEGORIES[s]) {
      assert.ok(c.label && c.min > 0 && c.queries.length >= 2 && c.where, `${s}/${c.id} is complete`);
      assert.ok(c.rx instanceof RegExp || c.types, `${s}/${c.id} matches something`);
      for (const t of c.types || []) assert.ok(SEASONS[s].types[t], `${s}/${c.id}: type ${t} exists in the season`);
      for (const q of c.queries) assert.match(q, /<city>|<year>/, `${s}/${c.id}: a query names <city> or <year>: ${q}`);
    }
  }
});

test("categories recognise the events they are meant for (and not the common false friends)", () => {
  const hit = (season, id, name, extra = {}) => countCategory([ev({ n: name, sn: season, ...extra })], season, CATEGORIES[season].find((c) => c.id === id), TODAY).count;
  assert.equal(hit("christmas", "tree-lighting", "Holiday Tree Lighting at The Ritz-Carlton"), 1);
  assert.equal(hit("christmas", "santa", "Breakfast with Santa"), 1);
  assert.equal(hit("christmas", "santa", "Santa Monica Pier Fish Fry"), 0, "Santa Monica is not Santa");
  assert.equal(hit("christmas", "ballet-theater", "The Nutcracker"), 1);
  assert.equal(hit("christmas", "concerts-choirs", "Handel's Messiah Sing-Along"), 1);
  assert.equal(hit("christmas", "trains", "The Polar Express Train Ride"), 1);
  assert.equal(hit("christmas", "ice-snow", "Ice Skating at the Plaza"), 1);
  assert.equal(hit("christmas", "menorah", "Chabad Public Menorah Lighting"), 1);
  assert.equal(hit("christmas", "posada-kwanzaa", "Las Posadas on Olvera Street"), 1);
  assert.equal(hit("christmas", "nativity", "Drive-Thru Nativity", { t: "nativity" }), 1);
  assert.equal(hit("christmas", "home-displays", "17 Oak St lights", { t: "drive" }), 1);
  assert.equal(hit("christmas", "tree-lighting", "Pumpkin Patch"), 0);
  assert.equal(hit("newyear", "nye-parties", "NYE Countdown Party", { sn: "newyear" }), 1);
  assert.equal(hit("newyear", "lunar", "Lunar New Year Festival", { sn: "newyear", t: "lunar" }), 1);
  assert.equal(hit("halloween", "haunts", "Haunted Hayride", { sn: "halloween" }), 1);
  assert.equal(countCategory([ev({ n: "Old", e: "2026-11-01" })], "christmas", CATEGORIES.christmas[0], TODAY).count, 0, "ended events do not count");
  assert.equal(countCategory([ev({ n: "Tree Lighting", sn: "summer" })], "christmas", CATEGORIES.christmas[0], TODAY).count, 0, "only the season's own events count");
});

test("status words and active seasons", () => {
  assert.deepEqual([statusOf(0, 10), statusOf(4, 10), statusOf(7, 10), statusOf(10, 10)], ["EMPTY", "THIN", "LOW", "OK"]);
  const at = (d) => activeSeasons(SEASONS, d).join(",");
  assert.equal(at("2026-11-14"), "christmas", "Halloween is over");
  assert.equal(at("2026-12-22"), "newyear,valentines,christmas".split(",").sort((a, b) => Object.keys(SEASONS).indexOf(a) - Object.keys(SEASONS).indexOf(b)).join(","));
  assert.equal(at("2027-06-01"), "summer"); assert.equal(at("2027-03-01"), "spring"); assert.match(at("2026-10-20"), /halloween/);
});

test("the venue watchlist is well formed and agrees with the city groups", () => {
  const w = loadWatchlist(), md = readFileSync("docs/coverage-cities.md", "utf8"), cities = parseCities(md);
  const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const group = new Map(); for (const c of cities) { group.set(fold(c.name), c.group); c.aliases.forEach((a) => group.set(fold(a), c.group)); }
  const KINDS = new Set(["theme_park", "zoo_aquarium", "garden", "railroad", "snow", "ice_rink", "mall", "fairground", "venue", "performing_arts", "historic", "hotel_resort", "church", "tourism_board"]);
  const COUNTIES = ["Los Angeles", "Orange", "San Diego", "Riverside", "San Bernardino", "Ventura", "Santa Barbara"];
  assert.ok(w.venues.length >= 150, "a real starting list: " + w.venues.length);
  const ids = new Set();
  for (const v of w.venues) {
    assert.ok(!ids.has(v.id), "unique id " + v.id); ids.add(v.id);
    assert.ok(v.name && v.city && KINDS.has(v.kind) && COUNTIES.includes(v.county), v.id + " has name, city, kind, county");
    assert.ok(Number.isInteger(v.group) && v.group >= 1 && v.group <= 21, v.id + " group");
    if (group.has(fold(v.city))) assert.equal(group.get(fold(v.city)), v.group, `${v.id}: group matches ${v.city}`);
    assert.ok(v.seasons.length && v.seasons.every((s) => SEASONS[s]), v.id + " seasons");
    if (v.match) assert.doesNotThrow(() => new RegExp(v.match, "i"), v.id + " match compiles");
    if (v.site) assert.match(v.site, /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/|$)/, v.id + " site");
  }
  for (const [k, n] of [["hotel_resort", 20], ["tourism_board", 15], ["garden", 8], ["zoo_aquarium", 8], ["railroad", 4], ["mall", 20], ["performing_arts", 12], ["snow", 5]]) assert.ok(w.venues.filter((v) => v.kind === k).length >= n, k + " is represented");
  assert.ok(w.venues.some((v) => /ritz/i.test(v.name)), "the Ritz-Carltons are on the list");
});

test("watchlist status finds venues already on the map; the work order lists the missing ones, zero-event cities and thin categories", () => {
  const cities = parseCities(readFileSync("docs/coverage-cities.md", "utf8")), w = loadWatchlist();
  const events = [ev({ id: "rc1", n: "Holiday Tree Lighting at The Ritz-Carlton, Laguna Niguel", v: "The Ritz-Carlton, Laguna Niguel", city: "Dana Point" }), ev({ id: "dp", n: "Dana Point Tree Lighting", city: "Dana Point" })];
  const st = watchlistStatus(events, w, TODAY);
  assert.equal(st.find((v) => v.id === "the-ritz-carlton-laguna-niguel").onMap, 1);
  assert.equal(st.find((v) => v.id === "the-ritz-carlton-rancho-mirage").onMap, 0);
  const order = workOrder(8, events, cities, w, TODAY);
  assert.ok(order.venuesMissing.some((v) => /Montage Laguna Beach/.test(v.name)) && !order.venuesMissing.some((v) => /Laguna Niguel/.test(v.name)));
  assert.ok(order.zero.includes("Coto de Caza") && order.thin.length);
  const text = formatWorkOrder(order, TODAY); assert.match(text, /Work order for group 8/); assert.match(text, /Montage Laguna Beach/); assert.match(text, /look at:/);
  assert.equal(workOrder(99, events, cities, w, TODAY), null);
});

test("groups are ranked by upcoming events per city, fewest first, and the report prints seasons, categories and the ranking", () => {
  const cities = parseCities(readFileSync("docs/coverage-cities.md", "utf8"));
  const events = Array.from({ length: 40 }, (_, i) => ev({ id: "e" + i, n: "Tree Lighting " + i, city: "Irvine" }));
  const r = groupRanking(events, cities, TODAY);
  assert.equal(r.length, new Set(cities.map((c) => c.group)).size); assert.ok(r[0].perCity <= r[r.length - 1].perCity); assert.equal(r[r.length - 1].group, cities.find((c) => c.name === "Irvine").group, "the group with all the events ranks last");
  const text = formatReport(seasonReport(events, TODAY), r, TODAY);
  assert.match(text, /Thanksgiving & Christmas Lights/); assert.match(text, /EMPTY|THIN|LOW/); assert.match(text, /City groups ranked/);
});

test("--categories lists every season's categories with their searches", async () => {
  const { formatCategories } = await import("../scripts/coverage-gaps.mjs"), t = formatCategories();
  for (const s of Object.keys(SEASONS)) assert.match(t, new RegExp(`\\(${s}\\)`)); assert.match(t, /Nutcracker/); assert.match(t, /Look at:/);
});
