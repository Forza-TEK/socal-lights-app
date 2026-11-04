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
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    first: async () => db.prepare(sql).get(...args) || null,
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    _run: () => db.prepare(sql).run(...args),
  });
  const DB = {
    prepare: (sql) => stmt(sql),
    batch: async (list) => { db.exec("BEGIN"); try { for (const s of list) s._run(); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; } return []; },
  };
  return { DB, raw: db, failed };
}
