// Admin audit fixes part 2 (2026-11-16 audit 2): the Admin event save enforces the data rules (H2), near-duplicate detection for Grok rows (H4),
// tombstones with undo and before/after in the log (M7, L4), and the migration gate refusing a quiet resurrection.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { newEnv } from "./_pay.mjs";
import { onRequestPost as save } from "../functions/api/admin/events/index.js";
import { onRequestDelete as del } from "../functions/api/admin/events/[id].js";
import { onRequestPost as restore } from "../functions/api/admin/events/restore.js";
import { onRequest as middleware } from "../functions/api/admin/_middleware.js";
import { onRequestGet as logGet } from "../functions/api/admin/log.js";
import { onRequestPost as grokAct } from "../functions/api/admin/grok.js";
import { nearDuplicate, nameKey } from "../functions/_lib/dupes.js";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const ev = (o = {}) => ({ id: "t-one", season: "christmas", name: "Tree Lighting", county: "Orange", city: "Irvine", type: "tree", start: "2026-12-05", end: "2026-12-05", status: "confirmed", free: true, price: "Free", hours: "5pm–9pm", lat: 33.6846, lng: -117.8265, blurb: "A tree lighting.", url: "https://example.org/tree", venue: "Irvine Civic Center", address: "1 Civic Center Plaza, Irvine, CA 92606", ...o });
const post = (env, body) => save({ request: new Request("https://socallights.app/api/admin/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env });
const msg = async (r) => (await r.json()).error || "";

test("H2: a clean event saves; hours are tidied; Free with no price gets the price Free", async () => {
  const { env, raw } = newEnv();
  const r = await post(env, ev({ hours: "5PM - 9PM", price: "" }));
  assert.equal(r.status, 200);
  const row = raw.prepare("SELECT hours, price FROM events WHERE id = 't-one'").get();
  assert.equal(row.hours, "5pm–9pm"); assert.equal(row.price, "Free");
});

test("H2: free with a price, http link, a pin far from the city and a wrong county are refused with plain sentences", async () => {
  const { env, raw } = newEnv();
  assert.match(await msg(await post(env, ev({ free: true, price: "$50 per person" }))), /price must start with "Free"/);
  assert.match(await msg(await post(env, ev({ free: false, price: "Free parking" }))), /set free=1/);
  assert.match(await msg(await post(env, ev({ url: "http://example.com/x" }))), /https/);
  assert.match(await msg(await post(env, ev({ lat: 34.9, lng: -118.1 }))), /km from the center of Irvine/);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id LIKE 't-%'").get().n, 0);
  // the county rule needs the city to be known in our data (the test database has the real events)
  assert.equal((await post(env, ev())).status, 200);
  assert.match(await msg(await post(env, ev({ id: "t-two", county: "San Diego" }))), /Irvine events are in Orange County in our data, not San Diego/);
});

test("H2: an older row that already breaks a rule can still be edited in other fields (rules apply to what changed)", async () => {
  const { env, raw } = newEnv();
  await post(env, ev());
  raw.exec("UPDATE events SET free = 1, price = '$50 per person', url = 'http://example.com/old' WHERE id = 't-one'"); // legacy data
  assert.equal((await post(env, ev({ status: "expected", price: "$50 per person", url: "http://example.com/old" }))).status, 200); // a bulk status change goes through
  assert.equal((await post(env, ev({ price: "$60 per person" }))).status, 400); // but changing the price re-checks it
});

test("H4: nearDuplicate catches reworded names and a different link, keeps different shows at one venue apart", () => {
  const a = { name: "Tree Lighting at Riverpark", city: "Oxnard", venue: "Riverpark", address: "2000 Outlet Center Dr, Oxnard, CA 93036", start_date: "2026-11-27" };
  assert.ok(nearDuplicate(a, { ...a, name: "Tree Lighting Celebration at Riverpark" }));
  assert.ok(nearDuplicate({ ...a, name: "36th Annual Winter Fantasy" }, { ...a, name: "Winter Fantasy", venue: "Other", address: "9 Elsewhere St" }));
  assert.ok(nearDuplicate({ ...a, name: "Holiday Show", venue: "Town Center" }, { ...a, name: "Holiday Show A", venue: "Town Center", address: "" }));
  assert.ok(!nearDuplicate(a, { ...a, start_date: "2026-11-28" }), "a different day is a different event");
  assert.ok(!nearDuplicate({ ...a, name: "Candlelight Concert" }, { ...a, name: "Santa Breakfast" }), "two different shows at one venue stay apart");
  assert.ok(!nearDuplicate({ ...a, name: "Tree Lighting" }, { ...a, city: "Ventura", name: "Tree Lighting", venue: "Elsewhere", address: "5 Other Rd" }), "the same plain name in another city at another place is a different event");
  assert.deepEqual(nameKey("The 43rd Annual Light Up A Life Goleta", "Goleta"), ["light", "up", "life"]);
});

const grokRow = (env, id, status, extra = {}) => env.DB.prepare("INSERT INTO intake_events (id,status,name,city,county,season,type,start_date,end_date,hours,free,price,blurb,url,venue,address,lat,lng,evidence,seen) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
  .bind(id, status, extra.name || "Tree Lighting Celebration at Riverpark", "Oxnard", "Ventura", "christmas", "tree", "2026-11-27", "2026-11-27", "6pm", 1, "Free", "x", "https://example.org/g", "Riverpark", "2000 Outlet Center Dr, Oxnard, CA 93036", 34.2, -119.2, "e", "2026-11-15").run();

test("H4: publishing a held Grok row that duplicates a map event asks first; force publishes", async () => {
  const { env, raw } = newEnv();
  await post(env, ev({ id: "riverpark-tree", name: "Tree Lighting at Riverpark", city: "Oxnard", county: "Ventura", lat: 34.2, lng: -119.2, start: "2026-11-27", end: "2026-11-27", venue: "Riverpark", address: "2000 Outlet Center Dr, Oxnard, CA 93036" }));
  await grokRow(env, "grok-tree-lighting-celebratio-8e8900", "held");
  const call = (force) => grokAct({ request: new Request("https://x/api/admin/grok", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "publish", id: "grok-tree-lighting-celebratio-8e8900", force }) }), env });
  const r = await call(false), d = await r.json();
  assert.equal(r.status, 409); assert.equal(d.code, "duplicate"); assert.equal(d.dup.id, "riverpark-tree");
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id LIKE 'grok-%'").get().n, 0);
  assert.equal((await call(true)).status, 200);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id LIKE 'grok-%'").get().n, 1);
});

test("M7/L4: deleting keeps a tombstone; restore puts the whole row back; saving lifts the tombstone", async () => {
  const { env, raw } = newEnv();
  await post(env, ev());
  raw.exec("UPDATE events SET image = 'https://example.org/p.jpg' WHERE id = 't-one'");
  const r = await del({ request: new Request("https://x/api/admin/events/t-one", { method: "DELETE" }), params: { id: "t-one" }, env, data: { admin: { email: "a@b.co" } } });
  assert.equal((await r.json()).restorable, true);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id = 't-one'").get().n, 0);
  const t = raw.prepare("SELECT name, deleted_by, row FROM deleted_events WHERE id = 't-one'").get();
  assert.equal(t.deleted_by, "a@b.co"); assert.equal(JSON.parse(t.row).image, "https://example.org/p.jpg");
  const back = await restore({ request: new Request("https://x/api/admin/events/restore", { method: "POST", body: JSON.stringify({ action: "restore", ids: ["t-one", "nope"] }) }), env });
  const bd = await back.json(); assert.deepEqual(bd.restored, ["t-one"]); assert.deepEqual(bd.skipped, ["nope"]);
  assert.equal(raw.prepare("SELECT image FROM events WHERE id = 't-one'").get().image, "https://example.org/p.jpg");
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM deleted_events").get().n, 0);
  await del({ request: new Request("https://x", { method: "DELETE" }), params: { id: "t-one" }, env, data: {} });
  await post(env, ev()); // an Admin save on purpose clears the mark
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM deleted_events").get().n, 0);
});

test("M7: an Admin edit logs the changed fields with before and after values; the Activity log returns them", async () => {
  const { env } = newEnv(); env.ADMIN_DEV_BYPASS = "1";
  const call = (method, url, body) => middleware({ request: new Request(url, { method, headers: { "content-type": "application/json", origin: "http://localhost:8788" }, body: body ? JSON.stringify(body) : undefined }), env, data: {}, next: async () => (url.endsWith("/events") ? save({ request: new Request(url, { method, body: JSON.stringify(body) }), env }) : del({ request: new Request(url, { method }), params: { id: "t-one" }, env, data: {} })) });
  await call("POST", "http://localhost:8788/api/admin/events", ev());
  await call("POST", "http://localhost:8788/api/admin/events", ev({ name: "Tree Lighting Night", hours: "6pm–8pm" }));
  const log = await (await logGet({ request: new Request("https://x/api/admin/log"), env })).json();
  const edit = log.entries.find((e) => e.action === "edit");
  assert.ok(edit, "an edit entry exists");
  const d = JSON.parse(edit.detail);
  assert.deepEqual(d.name, ["Tree Lighting", "Tree Lighting Night"]); assert.deepEqual(d.hours, ["5pm–9pm", "6pm–8pm"]);
  assert.ok(log.entries.find((e) => e.action === "add"));
});

test("M7: the migration gate refuses a migration that brings an admin-deleted event back, unless it says so", () => {
  // run the real validator on a throwaway git repo with one new migration that upserts an event
  const dir = mkdtempSync(join(tmpdir(), "mg-")), run = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  mkdirSync(join(dir, "scripts")); mkdirSync(join(dir, "migrations")); mkdirSync(join(dir, "public"));
  for (const f of ["scripts/validate-migrations.mjs", "scripts/event-rules.mjs", "public/seasons.js", "public/cities.js"]) cpSync(new URL("../" + f, import.meta.url), join(dir, f));
  writeFileSync(join(dir, "package.json"), '{"type":"module"}');
  const sql = (extra = "") => `${extra}CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, name TEXT, county TEXT, city TEXT, type TEXT, start_date TEXT, end_date TEXT, status TEXT, free INTEGER, price TEXT, hours TEXT, lat REAL, lng REAL, blurb TEXT, url TEXT, season TEXT, venue TEXT, address TEXT, updated_at TEXT);\nINSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES ('gone-1','Tree Lighting','Orange','Irvine','tree','2026-12-05','2026-12-05','confirmed',1,'Free','5pm–9pm',33.68,-117.82,'A tree lighting downtown.','https://example.org/t','christmas','Civic Center','1 Civic Center Plaza, Irvine, CA 92606') ON CONFLICT(id) DO UPDATE SET name=excluded.name;\n`;
  writeFileSync(join(dir, "migrations/0001_base.sql"), "SELECT 1;");
  run("init", "-q"); run("-c", "user.email=a@b.co", "-c", "user.name=t", "add", "-A"); run("-c", "user.email=a@b.co", "-c", "user.name=t", "commit", "-qm", "base");
  writeFileSync(join(dir, "deleted.json"), JSON.stringify(["gone-1"]));
  const check = () => { try { return { code: 0, out: execFileSync("node", ["--no-warnings", "scripts/validate-migrations.mjs", "--gate", "--deleted-file", "deleted.json", "--files", "0002_back.sql"], { cwd: dir, encoding: "utf8" }) }; } catch (e) { return { code: e.status, out: String(e.stdout) }; } };
  writeFileSync(join(dir, "migrations/0002_back.sql"), sql());
  let r = check(); assert.equal(r.code, 1, r.out); assert.match(r.out, /admin-deleted/);
  writeFileSync(join(dir, "migrations/0002_back.sql"), sql("-- validate: revive gone-1\n"));
  r = check(); assert.equal(r.code, 0, r.out);
  rmSync(dir, { recursive: true, force: true });
});

test("workflow lists admin-deleted events for the gate without ever blocking on it", () => {
  const y = read(".github/workflows/d1-migrations.yml");
  assert.match(y, /SELECT id FROM deleted_events/); assert.match(y, /--deleted-file/); assert.match(y, /continue-on-error: true/);
});

test("Admin UI: bulk and single delete offer Undo from the tombstones", () => {
  const js = read("public/admin/admin.js");
  assert.match(js, /restoreEvents/); assert.match(js, /\/api\/admin\/events\/restore/); assert.match(js, /undo: \(\) => restoreEvents\(okIds\)/);
  assert.doesNotMatch(js, /for good \(no undo\)/);
  assert.match(js, /logDetail\(e\.detail\)/);
});

test("L9: the weekly email and the upcoming list only read events that have not ended (today or later), never the 3-day grace window", () => {
  assert.match(read("functions/api/alerts/send.js"), /WHERE end_date >= \? AND start_date <= \?/);
  assert.match(read("functions/_lib/upcoming.js"), /WHERE end_date >= \?/);
});
