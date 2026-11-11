#!/usr/bin/env node
// Counts what the live map holds, so the coverage and confirmation lists never go stale (audit 2026-11-11: DAT-03, DAT-04, DAT-08, DAT-11).
//
//   node scripts/coverage-report.mjs                       read https://socallights.app/api/events (one anonymous GET) and print the report
//   node scripts/coverage-report.mjs --file events.json    read a saved copy of the API instead (no network)
//   node scripts/coverage-report.mjs --write-doc           also rewrite the generated block in docs/coverage-cities.md
//
// "City has N events" = upcoming events (end date today or later, Pacific) whose `city` is that city or whose street address names it,
// the same way docs/coverage-cities.md has always been counted. City names come from the numbered group lines of that file.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOC = path.join(ROOT, "docs/coverage-cities.md");
const START = "<!-- coverage:start -->", END = "<!-- coverage:end -->";

const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const pacificToday = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const addDays = (ymd, n) => { const d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// "Los Angeles (Downtown, Hollywood), Beverly Hills" -> [{ name: "Los Angeles", aliases: ["Downtown", "Hollywood"] }, { name: "Beverly Hills", aliases: [] }]
export function parseCities(md) {
  const out = [], seen = new Set();
  for (const line of md.split("\n")) {
    if (/^## Region-wide/i.test(line)) break;
    const m = line.match(/^(\d+)\.\s+\*\*[^*]+\*\*\s+[—-]\s+(.+)$/); if (!m) continue;
    const items = []; let depth = 0, cur = "";
    for (const ch of m[2]) { if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && depth === 0) { items.push(cur); cur = ""; } else cur += ch; }
    items.push(cur);
    for (const it of items) {
      const mm = it.trim().match(/^([^(]+?)(?:\s*\(([^)]*)\))?\s*$/); if (!mm) continue;
      let name = mm[1].replace(/\s*\(.*$/, "").trim(), subs = (mm[2] || "").split(",").map((x) => x.trim()).filter(Boolean);
      if (!name || seen.has(fold(name))) continue;
      if (/\//.test(name)) { subs = subs.concat(name.split("/").map((x) => x.trim())); name = name.split("/")[0].trim(); }
      seen.add(fold(name)); out.push({ name, aliases: subs.filter((s) => !/^including\b/i.test(s)), group: Number(m[1]) });
    }
  }
  return out;
}

export function countCity(events, c) {
  const names = [c.name, ...c.aliases].map(fold).filter(Boolean);
  return events.filter((e) => {
    const city = fold(e.city), addr = " " + fold(e.a) + " ";
    return names.some((n) => city === n || addr.includes(" " + n + " "));
  }).length;
}

export function report(events, cities, today) {
  const up = events.filter((e) => e.e >= today);
  const exp = up.filter((e) => e.st !== "c");
  const in14 = (e) => e.s <= addDays(today, 14);
  const counts = cities.map((c) => ({ ...c, n: countCity(up, c) }));
  const zero = counts.filter((c) => c.n === 0), one = counts.filter((c) => c.n === 1);
  const byGroup = (list) => { const o = {}; for (const c of list) (o[c.group] ||= []).push(c.name); return Object.entries(o).map(([g, v]) => `${v.join(", ")} (group ${g})`).join("; "); };
  const drive = up.filter((e) => e.t === "drive");
  const urlCount = {}; for (const e of up) { const k = String(e.u || "").split("#")[0].replace(/\/+$/, "").toLowerCase(); if (k) urlCount[k] = (urlCount[k] || 0) + 1; }
  const shared = Object.entries(urlCount).filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1]);
  const fm = up.filter((e) => (e.free && !/^free\b/i.test(e.p || "")) || (!e.free && /^free\b/i.test(e.p || "")));
  return {
    today, upcoming: up.length, confirmed: up.length - exp.length, expected: exp.length,
    expectedPct: up.length ? Math.round((100 * exp.length) / up.length * 10) / 10 : 0,
    expectedStarted: exp.filter((e) => e.s < today).map((e) => e.id), expectedEnded: events.filter((e) => e.st !== "c" && e.e < today).map((e) => e.id),
    expectedNext14: exp.filter(in14).length, expectedDrive: exp.filter((e) => e.t === "drive").length, drive: drive.length, driveConfirmed: drive.filter((e) => e.st === "c").length,
    expectedHoursWithoutCheck: exp.filter((e) => !/check site\s*$/i.test(e.h || "")).length,
    expectedByCounty: Object.fromEntries(Object.entries(exp.reduce((o, e) => ((o[e.c] = (o[e.c] || 0) + 1), o), {})).sort()),
    withoutPhoto: up.filter((e) => !e.img).length, freeMismatch: fm.map((e) => e.id), sharedUrls: shared.slice(0, 10),
    cities: counts.length, zero, one, zeroText: byGroup(zero), oneText: byGroup(one),
  };
}

export function block(r) {
  return [
    START,
    `### Priority cities (0–1 upcoming events on the map, ${r.today})`,
    `Generated by \`node scripts/coverage-report.mjs --write-doc\` from \`/api/events\` (${r.upcoming} upcoming events, ${r.cities} city names in the groups above). Count = upcoming events whose city or address names the city. Sweeps should dig into these first, even if the rest of the group is already well covered. Few events may simply mean a quiet town, but each one still needs a real look. Do not edit this block by hand; re-run the script after each round of sweeps.`,
    ``,
    `- **0 events (${r.zero.length}):** ${r.zeroText || "none"}`,
    `- **1 event (${r.one.length}):** ${r.oneText || "none"}`,
    END,
  ].join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  let events;
  if (opt("--file")) events = JSON.parse(readFileSync(opt("--file"), "utf8"));
  else { const res = await fetch("https://socallights.app/api/events?full=1", { headers: { "user-agent": "socal-lights-coverage-report" } }); if (!res.ok) { console.error("API answered " + res.status); process.exit(1); } events = await res.json(); }
  const md = readFileSync(DOC, "utf8"), cities = parseCities(md), r = report(events, cities, process.env.TODAY || pacificToday());
  console.log(`Upcoming ${r.upcoming}: ${r.confirmed} confirmed, ${r.expected} expected (${r.expectedPct}%). Drive-by lights: ${r.driveConfirmed} of ${r.drive} confirmed.`);
  console.log(`Expected and due within 14 days: ${r.expectedNext14}. Expected drive-by lights: ${r.expectedDrive}. Expected by county: ${JSON.stringify(r.expectedByCounty)}.`);
  console.log(`Expected but already started (resolve or list for the owner): ${r.expectedStarted.join(", ") || "none"}. Expected and already ended: ${r.expectedEnded.join(", ") || "none"}.`);
  console.log(`Expected rows whose hours do not end in "check site": ${r.expectedHoursWithoutCheck}. Upcoming without a photo: ${r.withoutPhoto}. Free flag disagrees with price text: ${r.freeMismatch.join(", ") || "none"}.`);
  console.log(`Source pages shared by 4+ upcoming events: ${r.sharedUrls.map(([u, n]) => `${u} (${n})`).join("; ") || "none"}.`);
  console.log(`\n${block(r)}`);
  if (args.includes("--write-doc")) {
    const a = md.indexOf(START), b = md.indexOf(END);
    if (a < 0 || b < 0) { console.error("coverage block markers not found in docs/coverage-cities.md"); process.exit(1); }
    writeFileSync(DOC, md.slice(0, a) + block(r) + md.slice(b + END.length));
    console.log("\nUpdated docs/coverage-cities.md");
  }
}
