// A tiny stand-in for Cloudflare D1 on top of node:sqlite, with every migration applied, so tests can run the real SQL in functions/.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

export function makeDB() {
  const db = new DatabaseSync(":memory:");
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
  const failed = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) {
    try { db.exec(readFileSync(join(dir, f), "utf8")); } catch (e) { failed.push(f + ": " + e.message); }
  }
  // A migration that does not apply must stop the suite (it used to be skipped silently, and tests ran on a partial schema). Report it; never edit an old migration to hide it.
  if (failed.length) throw new Error("Migrations failed to apply in the test database:\n  " + failed.join("\n  "));
  // The real D1 limits that matter here (https://developers.cloudflare.com/d1/platform/limits/): at most 100 bound parameters per query and 100 KB per SQL statement.
  // Every query counts as one outgoing call (a batch is one), because on the Workers Free plan one request may make only 50 (see docs/runbooks/cloudflare-limits.md).
  // Tests read DB.stats.calls (reset with DB.stats.reset()) to prove a path stays under the cap.
  const MAX_PARAMS = 100, MAX_SQL_BYTES = 100000;
  const stats = { calls: 0, reset() { stats.calls = 0; } };
  const check = (sql, args) => {
    if (args.length > MAX_PARAMS) throw new Error(`D1_ERROR: too many SQL variables (${args.length} bound parameters, the limit is ${MAX_PARAMS}): SQLITE_ERROR`);
    if (Buffer.byteLength(sql) > MAX_SQL_BYTES) throw new Error("D1_ERROR: statement too long (limit 100000 bytes): SQLITE_ERROR");
  };
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    all: async () => { stats.calls++; check(sql, args); return { results: db.prepare(sql).all(...args) }; },
    first: async () => { stats.calls++; check(sql, args); return db.prepare(sql).get(...args) || null; },
    run: async () => { stats.calls++; check(sql, args); const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    _run: () => { check(sql, args); if (/^\s*select\b/i.test(sql)) return { results: db.prepare(sql).all(...args), meta: { changes: 0 } }; const r = db.prepare(sql).run(...args); return { results: [], meta: { changes: Number(r.changes) } }; }, // a SELECT in a batch returns its rows, as D1 does
  });
  const DB = {
    prepare: (sql) => stmt(sql),
    batch: async (list) => { stats.calls++; db.exec("BEGIN"); const out = []; try { for (const s of list) out.push(s._run()); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; } return out; },
    stats,
  };
  return { DB, raw: db, failed };
}
