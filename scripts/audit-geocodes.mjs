#!/usr/bin/env node
// Read-only geocode quality report for the events table (audit F-24). It never writes and never calls the network.
//
//   node scripts/audit-geocodes.mjs --json events.json         a JSON export: an array of events, or { "results": [...] } (what `wrangler d1 execute --json` and /api/events?all=1 style exports give)
//   node scripts/audit-geocodes.mjs --sqlite path/to/local.sqlite   a LOCAL D1 file (after `npm run db:migrate:local`, under .wrangler/state/v3/d1/); needs Node 22.13+ (node:sqlite)
//   options: --km 15 (distance limit from the city center), --center 0.0006 (degrees counted as "at the city center"), --shared 6 (more than this many different venues on one point), --limit 40 (rows printed per section), --out report.json
//
// How the owner runs it (never against production data directly: export first):
//   1. Export a copy:   npx wrangler d1 execute socal-lights --remote --json --command "SELECT id,name,venue,address,city,county,lat,lng,status,start_date,end_date FROM events" > events.json
//      (this only READS production; the script itself touches no database.) Or use a local database with --sqlite.
//   2. node scripts/audit-geocodes.mjs --json events.json
//   3. Fix the listed rows in Admin (Events > the event > address, which re-geocodes), or in a new migration. The script changes nothing.
//
// What it reports:
//   center    the pin sits within 0.0006 degrees (about 60 m) of its city's center in public/cities.js: the geocoder found nothing and the city center was used.
//   far       the pin is more than 15 km from its city's center: a wrong hit, or a city name that does not fit the venue.
//   shared    the same point (5 decimals, about 1 m) holds more than 6 different venues: one wrong pin reused, or a real complex (a hall or mall with many events). Judge by the venue names.
//   unknown   the city is not in public/cities.js, so it cannot be compared.
import { readFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const kmBetween = (a, b) => {
  const R = 6371, rad = (d) => (d * Math.PI) / 180, dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const venueKey = (e) => String(e.venue || e.address || e.name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// events: rows with id, name, venue, address, city, lat, lng. CITY: { name: [lat, lng] }. Returns { center, far, shared, unknown, checked, skipped }.
export function auditGeocodes(events, CITY, { km = 15, center = 0.0006, shared = 6 } = {}) {
  const out = { checked: 0, skipped: 0, center: [], far: [], shared: [], unknown: [] };
  const groups = new Map();
  for (const e of events) {
    const lat = Number(e.lat), lng = Number(e.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) { out.skipped++; continue; }
    out.checked++;
    const k = lat.toFixed(5) + "," + lng.toFixed(5);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
    const c = CITY[e.city];
    if (!c) { out.unknown.push({ id: e.id, name: e.name, city: e.city }); continue; }
    if (Math.abs(lat - c[0]) <= center && Math.abs(lng - c[1]) <= center) out.center.push({ id: e.id, name: e.name, city: e.city, address: e.address || "", lat, lng });
    const d = kmBetween([lat, lng], c);
    if (d > km) out.far.push({ id: e.id, name: e.name, city: e.city, address: e.address || "", lat, lng, km: Math.round(d * 10) / 10 });
  }
  for (const [point, list] of groups) {
    const venues = new Set(list.map(venueKey));
    if (venues.size > shared) out.shared.push({ point, venues: venues.size, events: list.length, examples: [...venues].slice(0, 6), ids: list.slice(0, 12).map((e) => e.id) });
  }
  out.far.sort((a, b) => b.km - a.km);
  out.shared.sort((a, b) => b.venues - a.venues);
  return out;
}

export function readEvents({ json, sqlite }) {
  if (json) {
    const d = JSON.parse(readFileSync(json, "utf8"));
    const rows = Array.isArray(d) ? (d[0] && d[0].results ? d.flatMap((x) => x.results) : d) : d.results || [];
    return rows;
  }
  return import("node:sqlite").then(({ DatabaseSync }) => {
    const db = new DatabaseSync(sqlite, { readOnly: true });
    try { return db.prepare("SELECT id, name, venue, address, city, county, lat, lng, status FROM events").all(); } finally { db.close(); }
  });
}

const fmt = (rows, f, limit) => rows.slice(0, limit).map(f).join("\n") + (rows.length > limit ? `\n  ... and ${rows.length - limit} more (use --limit or --out)` : "");

async function main() {
  const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  const json = opt("--json"), sqlite = opt("--sqlite");
  if (!json && !sqlite) { console.error("Usage: node scripts/audit-geocodes.mjs --json events.json | --sqlite local.sqlite   (see the top of this file)"); process.exit(2); }
  const { CITY } = await import(pathToFileURL(path.join(ROOT, "public/cities.js")).href);
  const events = await readEvents({ json, sqlite });
  const limit = Number(opt("--limit", 40));
  const r = auditGeocodes(events, CITY, { km: Number(opt("--km", 15)), center: Number(opt("--center", 0.0006)), shared: Number(opt("--shared", 6)) });
  console.log(`Geocode audit: ${r.checked} events with a pin checked, ${r.skipped} without coordinates skipped.\n`);
  console.log(`At a city center (${r.center.length}):\n` + fmt(r.center, (x) => `  ${x.id}  ${x.city}  "${x.name}"  ${x.address}`, limit) + "\n");
  console.log(`More than ${opt("--km", 15)} km from the city (${r.far.length}):\n` + fmt(r.far, (x) => `  ${x.id}  ${x.km} km  ${x.city}  "${x.name}"  ${x.address}`, limit) + "\n");
  console.log(`One point shared by more than ${opt("--shared", 6)} different venues (${r.shared.length}):\n` + fmt(r.shared, (x) => `  ${x.point}  ${x.venues} venues, ${x.events} events, e.g. ${x.examples.join(" | ")}`, limit) + "\n");
  if (r.unknown.length) console.log(`City not in public/cities.js (${r.unknown.length}):\n` + fmt(r.unknown, (x) => `  ${x.id}  ${x.city}  "${x.name}"`, limit) + "\n");
  if (opt("--out")) { const { writeFileSync } = await import("node:fs"); writeFileSync(opt("--out"), JSON.stringify(r, null, 2)); console.log("Full report written to " + opt("--out")); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
