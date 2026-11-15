#!/usr/bin/env node
// The sweeps' work order: what is thin on the map right now, and what to search for first.
//
//   node scripts/coverage-gaps.mjs                  season by season: each category's count against its working target, and the groups ranked by how little they hold
//   node scripts/coverage-gaps.mjs --group 8        the work order for one city group: its cities with their counts, the watchlist venues in them that have no event on the map yet,
//                                                   and the thin categories to search for in them
//   node scripts/coverage-gaps.mjs --categories     every season's categories with the searches and the places to look (no network needed)
//   node scripts/coverage-gaps.mjs --json           the same as JSON (add --group N for one group)
//   node scripts/coverage-gaps.mjs --file events.json   read a saved copy of /api/events?full=1 instead of the live API (no network)
//
// Why: the map used to be built city by city, so anything that never reaches a city calendar (a hotel's tree lighting, a zoo's light show, a railroad's Polar Express, a choir's Messiah)
// was found only by luck. The categories (scripts/coverage-categories.mjs) and the venue watchlist (docs/watchlist.json) name those things, and this script says where the map has too few.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEASONS } from "../public/seasons.js";
import { CATEGORIES, activeSeasons } from "./coverage-categories.mjs";
import { parseCities, countCity, pacificToday } from "./coverage-report.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// Name and venue only: a sentence in the description that mentions Santa or a historic site does not make the event a Santa visit or a Dickens fair, and counting those would hide the gaps.
const text = (e) => `${e.n || ""} ${e.v || ""}`;

/** One category's count among the season's upcoming events. */
export function countCategory(events, season, cat, today) {
  const hit = (e) => (cat.types && cat.types.includes(e.t)) || (cat.rx && cat.rx.test(text(e)));
  const ev = events.filter((e) => e.e >= today && e.sn === season && hit(e));
  return { ...cat, count: ev.length, ids: ev.map((e) => e.id) };
}

/** Status words: EMPTY (none), THIN (under half the working target), LOW (under the target), OK. */
export const statusOf = (n, min) => (n === 0 && min > 0 ? "EMPTY" : n < min / 2 ? "THIN" : n < min ? "LOW" : "OK");

export function seasonReport(events, today, seasons = activeSeasons(SEASONS, today)) {
  return seasons.map((s) => ({
    season: s, label: SEASONS[s].label, upcoming: events.filter((e) => e.e >= today && e.sn === s).length,
    categories: (CATEGORIES[s] || []).map((c) => { const r = countCategory(events, s, c, today); return { id: c.id, label: c.label, count: r.count, min: c.min, status: statusOf(r.count, c.min), queries: c.queries, where: c.where }; }),
  }));
}

/** City groups ranked by upcoming events per city (fewest first): the thin-county days of the rotation take the first four. */
export function groupRanking(events, cities, today) {
  const up = events.filter((e) => e.e >= today), by = {};
  for (const c of cities) { const g = (by[c.group] ||= { group: c.group, cities: 0, events: 0, zero: [] }); const n = countCity(up, c); g.cities++; g.events += n; if (n === 0) g.zero.push(c.name); }
  return Object.values(by).map((g) => ({ ...g, perCity: Math.round((g.events / g.cities) * 10) / 10 })).sort((a, b) => a.perCity - b.perCity || a.group - b.group);
}

export function loadWatchlist() { return JSON.parse(readFileSync(path.join(ROOT, "docs/watchlist.json"), "utf8")); }

/** Each watchlist venue with the number of upcoming events on the map that name it (by its `match` pattern, or its name). */
export function watchlistStatus(events, watchlist, today) {
  const up = events.filter((e) => e.e >= today);
  return watchlist.venues.map((w) => {
    const rx = new RegExp(w.match || fold(w.name).replace(/^the /, "").split(" ").filter((x) => x.length > 2).slice(0, 3).join(".*"), "i");
    const on = up.filter((e) => rx.test(fold(`${e.n} ${e.v}`)));
    return { ...w, onMap: on.length };
  });
}

export function workOrder(group, events, cities, watchlist, today) {
  const mine = cities.filter((c) => c.group === group);
  if (!mine.length) return null;
  const up = events.filter((e) => e.e >= today), names = new Set(mine.map((c) => fold(c.name)));
  const counts = mine.map((c) => ({ city: c.name, events: countCity(up, c) }));
  const venues = watchlistStatus(events, watchlist, today).filter((w) => names.has(fold(w.city)) || mine.some((c) => c.aliases.map(fold).includes(fold(w.city))));
  const seasons = seasonReport(events, today), thin = seasons.map((s) => ({ season: s.season, categories: s.categories.filter((c) => c.status !== "OK") })).filter((s) => s.categories.length);
  return { group, cities: counts, zero: counts.filter((c) => c.events === 0).map((c) => c.city), venues, venuesMissing: venues.filter((v) => v.onMap === 0), thin };
}

const pad = (s, n) => String(s).padEnd(n);
export function formatReport(rep, ranking, today) {
  const out = [`Coverage gaps on ${today} (working targets, see scripts/coverage-categories.mjs; "<city>" in a query is a city of your group)`];
  for (const s of rep) {
    out.push(``, `## ${s.label} (${s.season}): ${s.upcoming} upcoming events`);
    for (const c of s.categories) out.push(`  ${pad(c.status, 5)} ${pad(c.label, 52)} ${String(c.count).padStart(4)} / ${c.min}`);
  }
  out.push(``, `## City groups ranked by upcoming events per city (fewest first; the thin days of the rotation use the first four)`);
  for (const g of ranking.slice(0, 8)) out.push(`  group ${String(g.group).padStart(2)}: ${g.perCity} per city (${g.events} events, ${g.cities} cities)${g.zero.length ? `, none yet in: ${g.zero.slice(0, 8).join(", ")}${g.zero.length > 8 ? ` and ${g.zero.length - 8} more` : ""}` : ""}`);
  return out.join("\n");
}
export function formatWorkOrder(w, today) {
  const out = [`Work order for group ${w.group} on ${today}`, ``, `Cities (upcoming events on the map): ${w.cities.map((c) => `${c.city} ${c.events}`).join(", ")}`, `No events yet: ${w.zero.join(", ") || "none"}`];
  out.push(``, `Watchlist venues in these cities with NO event on the map yet (read each one's own holiday or events page first): ${w.venuesMissing.length}`);
  for (const v of w.venuesMissing) out.push(`  - ${v.name} (${v.city}; ${v.kind}; ${v.seasons.join("/")})${v.site ? ` ${v.site}` : ""}`);
  const have = w.venues.filter((v) => v.onMap > 0);
  if (have.length) out.push(``, `Watchlist venues already on the map (check for added dates, not duplicates): ${have.map((v) => `${v.name} ${v.onMap}`).join(", ")}`);
  out.push(``, `Thin categories (run these searches for each city of the group; skip a category when the group has no such venue):`);
  for (const s of w.thin) { out.push(`  ${s.season}:`); for (const c of s.categories) out.push(`    ${c.status} ${c.label} (${c.count} of ${c.min}): ${c.queries.join(" | ")}; look at: ${c.where}`); }
  return out.join("\n");
}

export function formatCategories() {
  const out = [];
  for (const s of Object.keys(SEASONS)) {
    out.push(`## ${SEASONS[s].label} (${s})`);
    for (const c of CATEGORIES[s] || []) out.push(`- ${c.label} (working target ${c.min}): ${c.queries.join(" | ")}. Look at: ${c.where}.`);
    out.push("");
  }
  return out.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  if (args.includes("--categories")) { console.log(formatCategories()); process.exit(0); }
  let events;
  if (opt("--file")) events = JSON.parse(readFileSync(opt("--file"), "utf8"));
  else { const res = await fetch("https://socallights.app/api/events?full=1", { headers: { "user-agent": "socal-lights-coverage-gaps" } }); if (!res.ok) { console.error("API answered " + res.status); process.exit(1); } events = await res.json(); }
  const today = process.env.TODAY || pacificToday(), cities = parseCities(readFileSync(path.join(ROOT, "docs/coverage-cities.md"), "utf8")), watchlist = loadWatchlist();
  const g = opt("--group");
  if (g) {
    const w = workOrder(Number(g), events, cities, watchlist, today);
    if (!w) { console.error(`No city group ${g} (1 to 21).`); process.exit(1); }
    console.log(args.includes("--json") ? JSON.stringify(w, null, 1) : formatWorkOrder(w, today));
  } else {
    const rep = seasonReport(events, today), ranking = groupRanking(events, cities, today);
    console.log(args.includes("--json") ? JSON.stringify({ today, seasons: rep, groups: ranking }, null, 1) : formatReport(rep, ranking, today));
  }
}
