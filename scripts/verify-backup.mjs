#!/usr/bin/env node
// Proves a D1 export can really be restored: loads it into an empty in-memory SQLite database (Node 22.13+, built-in node:sqlite) and checks the shape.
//   node scripts/verify-backup.mjs backup.sql.gz [--min-tables 30] [--min-events 500] [--min-migrations 100]
// Accepts .sql or .sql.gz. Prints ONLY counts (tables, indexes, rows of a few key tables): never a row, an address or a value, because CI logs of this public repository are world-readable.
// Exit 1 when the file does not load, or a count is below its floor. Used by .github/workflows/backup.yml before the file is uploaded, so a bad export never replaces a good one.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";

// Returns { ok, tables, indexes, counts, problems }. Never includes row data.
export function verifyDump(sql, floors = {}) {
  const f = { tables: 30, events: 500, migrations: 100, ...floors };
  const problems = [], counts = {};
  const db = new DatabaseSync(":memory:");
  try { db.exec(sql); } catch (e) { return { ok: false, tables: 0, indexes: 0, counts, problems: ["the export does not load into SQLite: " + String(e.message).replace(/'[^']*'/g, "'...'").slice(0, 160)] }; }
  const n = (q) => Number(db.prepare(q).get().n);
  const tables = n("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"), indexes = n("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'");
  for (const t of ["events", "users", "posts", "contests", "feature_orders", "d1_migrations"]) { try { counts[t] = n(`SELECT COUNT(*) AS n FROM "${t}"`); } catch { counts[t] = null; problems.push(`table ${t} is missing`); } }
  if (tables < f.tables) problems.push(`only ${tables} tables (expected at least ${f.tables})`);
  if (counts.events != null && counts.events < f.events) problems.push(`only ${counts.events} events (expected at least ${f.events})`);
  if (counts.d1_migrations != null && counts.d1_migrations < f.migrations) problems.push(`only ${counts.d1_migrations} applied migrations (expected at least ${f.migrations})`);
  db.close();
  return { ok: problems.length === 0, tables, indexes, counts, problems };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), file = a.find((x) => !x.startsWith("--") && !/^\d+$/.test(x));
  const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? Number(a[i + 1]) : undefined; };
  if (!file) { console.error("Usage: verify-backup.mjs <file.sql|file.sql.gz> [--min-tables N] [--min-events N] [--min-migrations N]"); process.exit(2); }
  const buf = readFileSync(file), sql = (file.endsWith(".gz") ? gunzipSync(buf) : buf).toString("utf8");
  const r = verifyDump(sql, { tables: opt("--min-tables"), events: opt("--min-events"), migrations: opt("--min-migrations") });
  console.log(`restore test: ${r.ok ? "PASSED" : "FAILED"}: ${r.tables} tables, ${r.indexes} indexes, rows: ${Object.entries(r.counts).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  for (const p of r.problems) console.log(`::error::${p}`);
  process.exit(r.ok ? 0 : 1);
}
