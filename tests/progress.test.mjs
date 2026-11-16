// Run with: node --test tests/   (Admin > Progress: live counts, the half-hour log, the cron job.)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newEnv } from "./_pay.mjs";
import { onRequestGet as progress } from "../functions/api/admin/progress.js";
import { onRequest as logRoute } from "../functions/api/progress-log.js";
import { JOBS, CRONS } from "../workers/mail-cron/index.js";

const KEY = "test-cron-key-0123456789abcdef";
const mk = () => newEnv({ ALERT_CRON_KEY: KEY });

test("the admin endpoint counts the map live: totals, shares, counties, season categories, Grok's work, and the two hand-kept lists", async () => {
  const { env, raw } = mk();
  const add = raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address,image) VALUES (?,?,?,?,?,?,?,?,1,'Free','6pm',33.9,-117.3,'b','','christmas','V','1 Main St, Riverside, CA 92501',?)");
  add.run("zz-1", "Probe tree lighting one", "Riverside", "Riverside", "tree", "2999-12-01", "2999-12-01", "confirmed", "https://example.org/a.jpg");
  add.run("grok-zz-2", "Probe tree lighting two", "Riverside", "Riverside", "tree", "2999-12-02", "2999-12-02", "expected", null);
  const d = await (await progress({ env })).json();
  assert.ok(d.upcoming >= 2 && d.confirmed >= 1 && d.expected >= 1 && d.from_grok >= 1 && d.with_photo >= 1);
  assert.equal(d.confirmed + d.expected, d.upcoming);
  const riv = d.counties.find((c) => c.name === "Riverside"); assert.ok(riv && riv.confirmed >= 1 && riv.expected >= 1);
  assert.ok(d.cats_total > 10 && d.cats_ok <= d.cats_total && d.cats[0].count / d.cats[0].min <= d.cats.at(-1).count / d.cats.at(-1).min, "categories listed thinnest first");
  assert.ok(["published", "held", "rejected", "unpublished"].every((k) => typeof d.intake[k] === "number") && typeof d.updates.applied === "number");
  assert.ok(d.redesign.length > 10 && d.redesign.every((r) => ["done", "next", "todo"].includes(r.status)) && d.shipped.length > 3);
  assert.equal(d.history.length, 1, "opening the page records this half hour");
  await progress({ env }); assert.equal((await (await progress({ env })).json()).history.length, 1, "at most one row per half hour");
  const c = raw.prepare("SELECT upcoming, confirmed, from_grok FROM progress_log").get(); assert.equal(c.upcoming, d.upcoming); assert.ok(c.from_grok >= 1);
});

test("the cron route needs the shared key, only accepts POST, and writes the log", async () => {
  const { env, raw } = mk();
  const call = (key, method = "POST") => logRoute({ request: new Request("https://socallights.app/api/progress-log", { method, headers: key ? { "x-alert-key": key } : {} }), env }).then(async (r) => ({ status: r.status, body: await r.json() }));
  assert.equal((await call(null)).status, 401); assert.equal((await call("wrong-wrong-wrong-wrong")).status, 401); assert.equal((await call(KEY, "GET")).status, 405);
  const ok = await call(KEY); assert.equal(ok.status, 200); assert.ok(ok.body.ok && ok.body.upcoming >= 0);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM progress_log").get().n, 1);
});

test("the cron Worker runs the log job every half hour and it fails loudly when the site answers badly", async () => {
  assert.ok(JOBS["progress-log"] && CRONS["13,43 * * * *"].includes("progress-log"));
  assert.match(readFileSync("workers/mail-cron/wrangler.toml", "utf8"), /"13,43 \* \* \* \*"/);
  const real = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 }); assert.equal(await JOBS["progress-log"]({ ALERT_CRON_KEY: KEY }), "ok");
    globalThis.fetch = async () => new Response("{}", { status: 500 }); assert.equal(await JOBS["progress-log"]({ ALERT_CRON_KEY: KEY }), "fail");
  } finally { globalThis.fetch = real; }
});

test("wiring: the Progress tab is in the menu, the tab list and the titles", () => {
  const html = readFileSync("public/admin/index.html", "utf8"), js = readFileSync("public/admin/admin.js", "utf8");
  assert.match(html, /data-tab="progress"/); assert.match(js, /renderProgress/); assert.match(js, /progress: "Progress"/); assert.match(js, /"grok", "progress"/);
});
