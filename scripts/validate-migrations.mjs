#!/usr/bin/env node
// Checks new event migrations before they reach the live database.
//
//   node scripts/validate-migrations.mjs --base origin/main        files added since a git ref
//   node scripts/validate-migrations.mjs --files migrations/0041_x.sql
//   node scripts/validate-migrations.mjs --history                  replay every migration (regression test)
//
// Flags: --check-urls  load each changed row's url (dead pages are errors; 403/429/timeouts are warnings)
//        --gate        deploy gate: only HARD errors fail (things that would corrupt the map)
//
// How it works: applies every migration to a scratch in-memory SQLite database, snapshots the events table
// just before the first new file, applies the new files, then checks only the rows that were added or
// changed. Needs Node 22.13+ (built-in node:sqlite). Rules are in docs/updating-events.md.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, writeFileSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const GATE = flag("--gate");
const TODAY = process.env.TODAY || new Date().toISOString().slice(0, 10);

const COUNTIES = ["Los Angeles", "Orange", "Riverside", "San Bernardino", "San Diego", "Ventura", "Santa Barbara"];
const { SEASONS } = await import(pathToFileURL(path.join(ROOT, "public/seasons.js")).href);
const { CITY } = await import(pathToFileURL(path.join(ROOT, "public/cities.js")).href);

// ---------- which migration files are new ----------
const migDir = path.join(ROOT, "migrations");
const allFiles = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();

let newFiles = [], touchedOld = [];
if (opt("--files")) {
  newFiles = args.slice(args.indexOf("--files") + 1).filter((a) => !a.startsWith("--")).map((f) => path.basename(f));
} else if (opt("--base")) {
  const base = opt("--base");
  if (!/^0+$/.test(base)) {
    const lines = git("diff", "--name-status", `${base}...HEAD`, "--", "migrations/").split("\n").filter(Boolean);
    for (const l of lines) {
      const [st, ...rest] = l.split("\t"); const f = path.basename(rest[rest.length - 1]);
      if (st.startsWith("A")) newFiles.push(f); else touchedOld.push(`${st} ${f}`);
    }
  }
} else if (!flag("--history")) {
  console.error("Usage: validate-migrations.mjs --base <ref> | --files <a.sql ...> | --history  [--check-urls] [--gate]");
  process.exit(2);
}
newFiles = newFiles.filter((f) => allFiles.includes(f)).sort();

// ---------- findings ----------
const findings = [];
const add = (level, hard, rule, where, msg) => findings.push({ level: !hard && GATE && level === "error" ? "warn" : level, hard, rule, where, msg });
const err = (rule, where, msg, hard = false) => add("error", hard, rule, where, msg);
const warn = (rule, where, msg) => add("warn", false, rule, where, msg);

for (const t of touchedOld) err("existing-migration-edited", t, "Existing migrations must never be edited, renamed or deleted. Add a new file instead.", true);

// ---------- SQL safety (per new file) ----------
function stripSql(sql) { return sql.replace(/--[^\n]*/g, " ").replace(/'(?:[^']|'')*'/g, "''"); }
for (const f of newFiles) {
  const raw = readFileSync(path.join(migDir, f), "utf8");
  if (!/^\d{4}_[a-z0-9_.-]+\.sql$/.test(f)) err("filename", f, "Name must look like 0041_short-name.sql", true);
  const allow = /--\s*validate:\s*allow-destructive/i.test(raw);
  const s = stripSql(raw);
  const bad = [
    [/\bDROP\s+(TABLE|INDEX|VIEW)\b/i, "DROP statement"],
    [/\bTRUNCATE\b/i, "TRUNCATE"],
    [/\bALTER\s+TABLE\b[^;]*\bDROP\b/i, "ALTER TABLE ... DROP"],
    [/\bDELETE\s+FROM\b(?![^;]*\bWHERE\b)/i, "DELETE without WHERE"],
    [/(?<!\bDO\s+)\bUPDATE\b(?![^;]*\bWHERE\b)[^;]*\bSET\b/i, "UPDATE without WHERE"], // "DO UPDATE SET" is the normal upsert
    [/\bDELETE\s+FROM\s+(posts|submit_log)\b/i, "touches posts/submit_log (showcase data)"],
    [/\b(UPDATE|INSERT\s+INTO|INSERT\s+OR\s+\w+\s+INTO)\s+(posts|submit_log)\b/i, "touches posts/submit_log (showcase data)"],
  ];
  if (!allow) for (const [re, label] of bad) if (re.test(s)) err("destructive-sql", f, `${label}. If intentional, add a comment line "-- validate: allow-destructive" and explain why.`, true);
}

// ---------- replay migrations in a scratch database ----------
const db = new DatabaseSync(":memory:");
const rowsOf = () => Object.fromEntries(db.prepare("SELECT * FROM events").all().map((r) => [r.id, { ...r }]));
const hasEvents = () => !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'").get();
const strip = (r) => { const c = { ...r }; delete c.updated_at; return JSON.stringify(c); };

function diff(before, after) {
  const changed = [], removed = [];
  for (const id of Object.keys(after)) { if (!before[id]) changed.push({ id, row: after[id], kind: "added" }); else if (strip(before[id]) !== strip(after[id])) changed.push({ id, row: after[id], kind: "updated", prev: before[id] }); }
  for (const id of Object.keys(before)) if (!after[id]) removed.push(id);
  return { changed, removed };
}

let snapshot = null, failedSql = false;
const perFile = []; // for --history
for (const f of allFiles) {
  const isNew = newFiles.includes(f);
  if (isNew && snapshot === null) snapshot = hasEvents() ? rowsOf() : {};
  const before = flag("--history") && hasEvents() ? rowsOf() : null;
  try { db.exec(readFileSync(path.join(migDir, f), "utf8")); }
  catch (e) {
    if (isNew) { err("sql-error", f, `SQL failed to run: ${e.message}`, true); failedSql = true; break; }
    console.error(`note: historical migration ${f} failed in the scratch database (${e.message}); continuing`);
  }
  if (flag("--history") && before) perFile.push({ f, ...diff(before, rowsOf()) });
  if (!flag("--history") && newFiles.length && f === newFiles[newFiles.length - 1]) break; // nothing after the new files matters
}
if (snapshot === null) snapshot = hasEvents() ? rowsOf() : {};
const finalRows = hasEvents() ? rowsOf() : {};

// ---------- row rules ----------
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !Number.isNaN(Date.parse(s)) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r; const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function checkRow(e, label) {
  const r = e.row, w = `${label} ${r.id}`;
  if (!/^[a-z0-9-]{1,40}$/.test(r.id)) err("id", w, "id must be lowercase a-z, 0-9, hyphens, at most 40 characters", true);
  if (!r.name || !r.name.trim()) err("name", w, "name is empty", true);
  if (!COUNTIES.includes(r.county)) err("county", w, `county "${r.county}" is not one of the 7 covered counties`, true);
  const S = SEASONS[r.season];
  if (!S) err("season", w, `season "${r.season}" is not in public/seasons.js`, true);
  else if (!S.types[r.type]) err("type", w, `type "${r.type}" is not allowed for season ${r.season} (allowed: ${Object.keys(S.types).join(", ")})`, true);
  if (!isDate(r.start_date) || !isDate(r.end_date)) err("dates", w, `dates must be real YYYY-MM-DD (got ${r.start_date} / ${r.end_date})`, true);
  else {
    if (r.end_date < r.start_date) err("dates", w, `end_date ${r.end_date} is before start_date ${r.start_date}`, true);
    if (r.end_date < TODAY) warn("already-ended", w, `ended ${r.end_date}; it will not show on the map`);
    const far = new Date(TODAY); far.setMonth(far.getMonth() + 16);
    if (r.start_date > far.toISOString().slice(0, 10)) warn("far-future", w, `starts ${r.start_date}, more than 16 months out`);
    if (r.status === "confirmed" && r.start_date.slice(0, 4) < TODAY.slice(0, 4) && r.end_date < TODAY) warn("confirmed-old", w, "confirmed with last year's dates");
  }
  if (!["confirmed", "expected"].includes(r.status)) err("status", w, `status must be confirmed or expected (got ${r.status})`, true);
  if (![0, 1].includes(r.free)) err("free", w, "free must be 0 or 1", true);
  if (r.status === "expected" && !/check site\s*$/i.test(r.hours || "")) warn("expected-hours", w, 'expected events should have hours ending "check site"');
  if (r.free === 1 && r.price && !/free/i.test(r.price)) warn("free-price", w, `free=1 but price says "${r.price}"`);
  if (r.free === 0 && /^free$/i.test((r.price || "").trim())) warn("free-price", w, 'price says "Free" but free=0');
  const { lat, lng } = r;
  if (typeof lat !== "number" || typeof lng !== "number" || !(lat >= 32 && lat <= 35.8 && lng >= -121.5 && lng <= -114)) err("coords", w, `lat/lng (${lat}, ${lng}) outside Southern California (lat 32–35.8, lng −121.5 to −114)`, true);
  else if (CITY[r.city]) {
    const d = km(lat, lng, CITY[r.city][0], CITY[r.city][1]), lim = ["Los Angeles", "San Diego"].includes(r.city) ? 45 : 30;
    if (d > lim) warn("coords-city", w, `pin is ${Math.round(d)} km from the center of ${r.city}; check the geocode`);
  }
  if (!r.blurb || !r.blurb.trim()) warn("blurb", w, "blurb is empty"); else {
    if (r.blurb.length > 180) err("blurb-length", w, `blurb is ${r.blurb.length} characters (max 180)`);
    if (/https?:\/\//i.test(r.blurb)) warn("blurb", w, "blurb contains a link");
  }
  if (!r.venue || !r.venue.trim()) warn("venue", w, "venue is empty (directions and cards use it)");
  if (!r.address || !r.address.trim()) err("address", w, "address is empty; directions use it");
  else if (!/\b9\d{4}\b/.test(r.address) && !/&| and /i.test(r.address)) warn("address", w, `address "${r.address}" has no ZIP code or intersection`);
  if (r.url != null && r.url !== "") { if (!/^https?:\/\/[^\s]+$/i.test(r.url)) err("url", w, `url is not a valid web address: ${r.url}`); else if (/^http:\/\//i.test(r.url)) warn("url", w, "url is http, not https"); }
  else warn("url", w, "no url; the card will have no Event info link");
  if (e.kind === "updated" && e.prev && norm(e.prev.name) !== norm(r.name) && !norm(r.name).includes(norm(e.prev.name).slice(0, 12))) warn("id-reused", w, `existing id reused for a different name ("${e.prev.name}" -> "${r.name}")`);
}

const { changed, removed } = diff(snapshot, finalRows);
if (!failedSql) {
  if (!flag("--history")) for (const e of changed) checkRow(e, "row");
  // duplicates: same name+start+city, or same address+start, against the whole table
  const all = Object.values(finalRows);
  const byName = new Map(), byAddr = new Map();
  for (const r of all) { const k = `${norm(r.name)}|${r.start_date}|${norm(r.city)}`; (byName.get(k) || byName.set(k, []).get(k)).push(r.id); if (r.address) { const a = `${norm(r.address)}|${r.start_date}`; (byAddr.get(a) || byAddr.set(a, []).get(a)).push(r.id); } }
  if (!flag("--history")) for (const e of changed) {
    const r = e.row, n = byName.get(`${norm(r.name)}|${r.start_date}|${norm(r.city)}`) || [], a = byAddr.get(`${norm(r.address)}|${r.start_date}`) || [];
    if (n.length > 1) warn("duplicate", `row ${r.id}`, `same name, date and city as ${n.filter((x) => x !== r.id).join(", ")}`);
    else if (a.length > 1 && r.address) warn("duplicate", `row ${r.id}`, `same address and start date as ${a.filter((x) => x !== r.id).join(", ")}`);
  }
  if (removed.length) {
    const msg = `removes ${removed.length} event(s): ${removed.slice(0, 8).join(", ")}${removed.length > 8 ? ", ..." : ""}`;
    if (removed.length > 15) err("mass-delete", "migration", msg + ". More than 15 deletions in one change needs a human look.", true); else warn("deletes", "migration", msg);
  }
  if (changed.length > 120) warn("large-change", "migration", `${changed.length} rows changed in one go (the upkeep runs cap at 60)`);
}

// ---------- optional: load each url ----------
async function checkUrls() {
  const rows = changed.filter((e) => e.row.url && /^https?:/i.test(e.row.url));
  const urls = [...new Set(rows.map((e) => e.row.url))];
  const res = new Map();
  let i = 0;
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < urls.length) {
      const u = urls[i++];
      try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000); const r = await fetch(u, { headers: { "user-agent": UA }, redirect: "follow", signal: c.signal }); clearTimeout(t); res.set(u, { status: r.status }); }
      catch (x) { res.set(u, { err: String(x.cause?.code || x.name || x.message).slice(0, 40) }); }
    }
  }));
  for (const e of rows) {
    const r = res.get(e.row.url), w = `row ${e.row.id}`;
    if (r.status === 404 || r.status === 410 || (r.err && r.err !== "AbortError" && !/TLS|CERT/i.test(r.err))) err("url-dead", w, `source page is gone (${r.status || r.err}): ${e.row.url}`);
    else if (r.status === 403 || r.status === 429 || r.status >= 500) warn("url-blocked", w, `could not check the source page (HTTP ${r.status}); verify by hand: ${e.row.url}`);
    else if (r.err) warn("url-blocked", w, `could not load the source page (${r.err}): ${e.row.url}`);
  }
}
if (flag("--check-urls") && !failedSql && !flag("--history")) await checkUrls();

// ---------- history mode ----------
if (flag("--history")) {
  const tally = {};
  let rows = 0;
  const from = opt("--from") || "0000"; // the oldest migrations predate the season/venue/address columns
  for (const p of perFile) for (const e of p.changed) { if (p.f.slice(0, 4) < from) continue; rows++; const before = findings.length; checkRow(e, p.f); for (const f of findings.splice(before)) { const k = `${f.hard ? "HARD " : f.level.toUpperCase() + " "}${f.rule}`; (tally[k] ||= { n: 0, ex: `${f.where}: ${f.msg}` }).n++; } }
  console.log(`Replayed ${allFiles.length} migrations; checked ${rows} added/updated rows; final table has ${Object.keys(finalRows).length} events.`);
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1].n - a[1].n)) console.log(`${String(v.n).padStart(5)}  ${k}   e.g. ${v.ex}`);
  process.exit(0);
}

// ---------- report ----------
const errors = findings.filter((f) => f.level === "error"), warns = findings.filter((f) => f.level === "warn");
const added = changed.filter((c) => c.kind === "added").length, updated = changed.length - added;
const lines = [];
lines.push(`## Migration check ${errors.length ? "FAILED" : "passed"}${GATE ? " (deploy gate: hard errors only)" : ""}`);
lines.push(`Files: ${newFiles.length ? newFiles.join(", ") : "none new"}  \nEvents: ${added} added, ${updated} updated, ${removed.length} removed. Errors: ${errors.length}. Warnings: ${warns.length}.`);
for (const [title, list] of [["Errors (must fix)", errors], ["Warnings (look at these)", warns]]) {
  if (!list.length) continue;
  lines.push(`\n### ${title}`);
  const grouped = {};
  for (const f of list) (grouped[f.rule] ||= []).push(f);
  for (const [rule, fs] of Object.entries(grouped)) { lines.push(`- **${rule}** (${fs.length})`); for (const f of fs.slice(0, 25)) lines.push(`  - ${f.where}: ${f.msg}`); if (fs.length > 25) lines.push(`  - ... and ${fs.length - 25} more`); }
}
const md = lines.join("\n");
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
if (opt("--out")) writeFileSync(opt("--out"), md + "\n");
if (process.env.GITHUB_ACTIONS) for (const f of errors) console.log(`::error title=${f.rule}::${f.where}: ${f.msg}`);
process.exit(errors.length ? 1 : 0);
