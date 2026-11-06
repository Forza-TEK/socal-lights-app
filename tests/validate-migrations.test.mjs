// scripts/validate-migrations.mjs is the gate the scheduled routines rely on when they push event migrations straight to main.
// The script works on the migrations folder next to it, so these tests run a copy of it in a scratch git repo (real migrations plus one test file per case).
// "Source URL" checks use a throwaway server on 127.0.0.1; nothing leaves the machine.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const TODAY = "2026-11-07";
let root, srv, port, baseSha;

before(async () => {
  root = mkdtempSync(join(tmpdir(), "scl-validate-"));
  mkdirSync(join(root, "scripts")); mkdirSync(join(root, "public"));
  cpSync(join(REPO, "scripts/validate-migrations.mjs"), join(root, "scripts/validate-migrations.mjs"));
  for (const f of ["seasons.js", "cities.js"]) cpSync(join(REPO, "public", f), join(root, "public", f));
  cpSync(join(REPO, "migrations"), join(root, "migrations"), { recursive: true });
  const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-q"); git("config", "user.email", "t@example.com"); git("config", "user.name", "t"); git("config", "commit.gpgsign", "false"); git("add", "-A"); git("commit", "-q", "-m", "base");
  baseSha = git("rev-parse", "HEAD").trim();
  srv = createServer((req, res) => { const code = Number(req.url.replace(/\D/g, "")) || 200; res.writeHead(code); res.end("x"); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r)); port = srv.address().port;
});
after(() => { srv && srv.close(); root && rmSync(root, { recursive: true, force: true }); });

const run = (args, env = {}) => new Promise((resolve) => execFile(process.execPath, ["--no-warnings", join(root, "scripts/validate-migrations.mjs"), ...args], { cwd: root, env: { ...process.env, TODAY, GITHUB_ACTIONS: "", GITHUB_STEP_SUMMARY: "", ...env } }, (e, out, errOut) => resolve({ code: e ? e.code : 0, out: String(out), err: String(errOut) })));
let n = 9000;
// Writes a new migration file, validates it (--files), and removes it again.
async function check(sql, flags = [], name) {
  const f = name || `${++n}_case.sql`, p = join(root, "migrations", f);
  writeFileSync(p, sql);
  try { return await run(["--files", f, ...flags]); } finally { rmSync(p, { force: true }); }
}
const COLS = "id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address";
const UPSERT = "ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city, type=excluded.type, start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status, free=excluded.free, price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng, blurb=excluded.blurb, url=excluded.url, season=excluded.season, venue=excluded.venue, address=excluded.address, updated_at=datetime('now');";
const q = (v) => (typeof v === "number" ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
const ev = (o = {}) => ({ id: "t-lights-26", name: "Test Lights Night", county: "Los Angeles", city: "Pasadena", type: "walk", start_date: "2026-12-05", end_date: "2026-12-20", status: "confirmed", free: 1, price: "Free", hours: "5-9pm", lat: 34.148, lng: -118.144, blurb: "Neighborhood lights walk with cocoa.", url: "https://example.org/lights", season: "christmas", venue: "Memorial Park", address: "85 E Holly St, Pasadena, CA 91103", ...o });
const sqlFor = (o, { upsert = true } = {}) => { const r = ev(o); return `INSERT INTO events (${COLS}) VALUES (${COLS.split(",").map((c) => q(r[c])).join(",")}) ${upsert ? UPSERT : ";"}\n`; };
const has = (r, rule) => new RegExp("\\*\\*" + rule + "\\*\\*").test(r.out);
// Is row `id` listed under `rule` in the report? (the report groups findings: "- **rule** (n)" then "  - row <id>: message")
const flagged = (r, rule, id) => { const i = r.out.indexOf(`- **${rule}**`); if (i < 0) return false; const rest = r.out.slice(i + 1), j = rest.indexOf("\n- **"); return (j < 0 ? rest : rest.slice(0, j)).includes(`row ${id}:`); };

test("a clean, correctly upserted event passes with no errors", async () => {
  const r = await check(sqlFor({}));
  assert.equal(r.code, 0, r.out); assert.match(r.out, /Migration check passed/); assert.match(r.out, /1 added, 0 updated, 0 removed. Errors: 0. Warnings: 0/);
});
test("a migration that only ADDS a column to events does not make every existing event look 'updated' (it must not trigger URL checks of all events)", async () => {
  const r = await check("ALTER TABLE events ADD COLUMN banner_until_test TEXT;\n");
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Events: 0 added, 0 updated, 0 removed/);
});
test("re-using an existing id with new details is reported as an update, and a different name under that id is warned about", async () => {
  const r = await check(sqlFor({ id: "g7-jingle-fest-26", name: "Completely Different Parade", city: "Santa Clarita", start_date: "2026-11-14", end_date: "2026-11-15", lat: 34.4363, lng: -118.519, address: "27150 Bouquet Canyon Rd, Santa Clarita, CA 91350" }));
  assert.equal(r.code, 0, r.out); assert.match(r.out, /0 added, 1 updated/); assert.ok(has(r, "id-reused"));
});
test("a plain INSERT of an id that already exists fails the SQL (so it is blocked, not silently doubled)", async () => {
  const r = await check(sqlFor({ id: "g7-jingle-fest-26" }, { upsert: false }));
  assert.equal(r.code, 1); assert.ok(has(r, "sql-error")); assert.match(r.out, /UNIQUE|constraint/i);
});
test("bad dates: impossible day, wrong format, end before start, empty end", async () => {
  const bad = { "t-d1": { start_date: "2026-02-30" }, "t-d2": { start_date: "12/05/2026" }, "t-d3": { start_date: "2026-12-20", end_date: "2026-12-05" }, "t-d4": { end_date: "" } };
  const r = await check(Object.entries(bad).map(([id, o]) => sqlFor({ id, ...o })).join(""));
  assert.equal(r.code, 1, r.out); for (const id of Object.keys(bad)) assert.ok(flagged(r, "dates", id), id + "\n" + r.out);
});
test("hard rules: id format, county, season/type, status, free flag, coordinates, missing address, empty name", async () => {
  const cases = { "t-county": [{ county: "Fresno" }, "county"], "t-season": [{ season: "winter" }, "season"], "t-type": [{ type: "haunt" }, "type"], "t-status": [{ status: "maybe" }, "status"], "t-free": [{ free: 2 }, "free"], "t-coords": [{ lat: 40.7, lng: -74 }, "coords"], "t-addr": [{ address: "" }, "address"], "t-name": [{ name: " " }, "name"] };
  const r = await check(Object.entries(cases).map(([id, [o]]) => sqlFor({ id, ...o })).join("") + sqlFor({ id: "Bad_ID" }));
  assert.equal(r.code, 1, r.out);
  for (const [id, [, rule]] of Object.entries(cases)) assert.ok(flagged(r, rule, id), `${id} -> ${rule}\n${r.out}`);
  assert.ok(flagged(r, "id", "Bad_ID"), r.out);
});
test("soft rules are warnings, not failures: ended, far future, expected without 'check site', free/price mismatch, no url, http, far pin, missing venue/blurb, no ZIP", async () => {
  const cases = { "t-ended": [{ start_date: "2026-10-01", end_date: "2026-10-02" }, "already-ended"], "t-far": [{ start_date: "2028-06-01", end_date: "2028-06-02" }, "far-future"], "t-exp": [{ status: "expected", hours: "evenings" }, "expected-hours"],
    "t-fp1": [{ free: 1, price: "$20" }, "free-price"], "t-fp2": [{ free: 0, price: "Free" }, "free-price"], "t-nourl": [{ url: "" }, "url"], "t-http": [{ url: "http://example.org/x" }, "url"], "t-far2": [{ lat: 34.9, lng: -118.1 }, "coords-city"],
    "t-venue": [{ venue: "" }, "venue"], "t-blurb": [{ blurb: "" }, "blurb"], "t-zip": [{ address: "Somewhere nice" }, "address"] };
  const r = await check(Object.entries(cases).map(([id, [o]]) => sqlFor({ id, ...o })).join(""));
  assert.equal(r.code, 0, r.out);
  for (const [id, [, rule]] of Object.entries(cases)) assert.ok(flagged(r, rule, id), `${id} -> ${rule}\n${r.out}`);
  const hard = await check(sqlFor({ id: "t-long", blurb: "x".repeat(181) }) + sqlFor({ id: "t-url", url: "ftp://nope" }));
  assert.equal(hard.code, 1); assert.ok(flagged(hard, "blurb-length", "t-long")); assert.ok(flagged(hard, "url", "t-url"));
});
test("duplicates: same name, date and city as an existing event is warned about", async () => {
  const r = await check(sqlFor({ id: "t-dup", name: "Jingle Fest '26", city: "Santa Clarita", start_date: "2026-11-14", end_date: "2026-11-14", lat: 34.4363, lng: -118.519, address: "1 Other St, Santa Clarita, CA 91350" }));
  assert.equal(r.code, 0, r.out); assert.ok(has(r, "duplicate"));
});
test("removed events: a few are a warning that points at paid Featured orders; more than 15 in one change is an error", async () => {
  const one = await check("DELETE FROM events WHERE id = 'g7-jingle-fest-26';\n");
  assert.equal(one.code, 0, one.out); assert.match(one.out, /1 removed/); assert.ok(has(one, "deletes")); assert.match(one.out, /Featured order/);
  const many = await check("DELETE FROM events WHERE start_date >= '2000-01-01';\n");
  assert.equal(many.code, 1); assert.ok(has(many, "mass-delete"));
});
test("destructive SQL and showcase data are blocked unless explicitly allowed; filenames must follow the pattern", async () => {
  const stmts = { "DROP statement": "DROP TABLE events;", "DELETE without WHERE": "DELETE FROM events;", "UPDATE without WHERE": "UPDATE events SET price = 'x';", "TRUNCATE": "TRUNCATE events;", "ALTER TABLE ... DROP": "ALTER TABLE events DROP COLUMN blurb;", "touches posts/submit_log": "UPDATE posts SET status = 'approved' WHERE id = 'x';" };
  const bad = await check(Object.values(stmts).join("\n") + "\nDELETE FROM submit_log WHERE 1 = 1;\n"); // one file, so one replay
  assert.equal(bad.code, 1); assert.ok(has(bad, "destructive-sql"));
  for (const label of Object.keys(stmts)) assert.ok(bad.out.includes(label), label + "\n" + bad.out);
  const allowed = await check("-- validate: allow-destructive (test)\nDELETE FROM events WHERE id = 'nope';\n"); assert.equal(allowed.code, 0, allowed.out);
  const quoted = await check("INSERT INTO events (" + COLS + ") VALUES ('t-q','Drop table casino','Los Angeles','Pasadena','walk','2026-12-05','2026-12-06','confirmed',1,'Free','5pm',34.148,-118.144,'DROP TABLE x; a blurb that mentions it in text.','https://example.org/q','christmas','Park','1 A St, Pasadena, CA 91103') " + UPSERT.replace(/\n/g, "") + "\n");
  assert.equal(quoted.code, 0, "words inside string literals are not statements\n" + quoted.out);
  const badName = await check(sqlFor({}), [], `${++n}_Bad Name.sql`); assert.equal(badName.code, 1); assert.ok(has(badName, "filename"));
});
test("a migration that does not run is reported as a SQL error", async () => {
  const r = await check("INSERT INTO no_such_table VALUES (1);\n"); assert.equal(r.code, 1); assert.ok(has(r, "sql-error"));
});
test("--gate: only hard errors fail; a long blurb (soft error) is downgraded, a bad county still fails", async () => {
  const soft = await check(sqlFor({ id: "t-gate", blurb: "x".repeat(181) }), ["--gate"]); assert.equal(soft.code, 0, soft.out); assert.match(soft.out, /deploy gate/);
  const hard = await check(sqlFor({ id: "t-gate2", county: "Fresno" }), ["--gate"]); assert.equal(hard.code, 1);
});
test("--check-urls: a dead source page (404/410, refused connection) fails; blocked pages (403/429/500) only warn; a good page is clean", async () => {
  const base = `http://127.0.0.1:${port}`;
  const one = (code, path) => check(sqlFor({ id: "t-url-" + code, url: `${base}/${path || code}` }), ["--check-urls"]);
  const ok = await one(200); assert.equal(ok.code, 0, ok.out); assert.ok(!has(ok, "url-dead")); assert.ok(!has(ok, "url-blocked"));
  for (const code of [404, 410]) { const r = await one(code); assert.equal(r.code, 1, "HTTP " + code); assert.ok(has(r, "url-dead")); }
  for (const code of [403, 429, 500]) { const r = await one(code); assert.equal(r.code, 0, "HTTP " + code + r.out); assert.ok(has(r, "url-blocked")); }
  const refused = await check(sqlFor({ id: "t-url-refused", url: "http://127.0.0.1:1/x" }), ["--check-urls"]); assert.equal(refused.code, 1, refused.out); assert.ok(has(refused, "url-dead"));
});
test("--base: editing or deleting an existing migration is a hard error; adding a clean new one passes; no change says none new", async () => {
  const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const none = await run(["--base", baseSha]); assert.equal(none.code, 0, none.out); assert.match(none.out, /none new/);
  const first = readdirSync(join(root, "migrations")).sort()[0];
  const old = readFileSync(join(root, "migrations", first), "utf8");
  writeFileSync(join(root, "migrations", first), old + "\n-- sneaky edit\n"); git("commit", "-qam", "edit old");
  const edited = await run(["--base", baseSha]); assert.equal(edited.code, 1); assert.ok(has(edited, "existing-migration-edited"));
  const gate = await run(["--base", baseSha, "--gate"]); assert.equal(gate.code, 1, "a hard error even in gate mode");
  writeFileSync(join(root, "migrations", first), old); git("commit", "-qam", "revert");
  writeFileSync(join(root, "migrations", "9100_new_event.sql"), sqlFor({ id: "t-base" })); git("add", "-A"); git("commit", "-qm", "add");
  const added = await run(["--base", baseSha]); assert.equal(added.code, 0, added.out); assert.match(added.out, /9100_new_event\.sql/); assert.match(added.out, /1 added/);
  git("rm", "-q", "migrations/" + first); git("commit", "-qm", "delete old");
  const deleted = await run(["--base", baseSha]); assert.equal(deleted.code, 1); assert.ok(has(deleted, "existing-migration-edited"), "deleting an old migration counts too");
});
test("usage error without arguments", async () => { assert.equal((await run([])).code, 2); });
// (--history replays every migration and takes about 9 s, so it is not part of the fast suite; run it by hand: node scripts/validate-migrations.mjs --history --from 0170)
