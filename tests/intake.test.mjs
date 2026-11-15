// Run with: node --test tests/   (Grok event intake: key guard, every row check, dedupe, publish / hold / dry run, unpublish and republish, the work order.)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newEnv, freezeNow } from "./_pay.mjs";
import { onRequest as intake } from "../functions/api/intake/events.js";
import { onRequest as workOrder } from "../functions/api/intake/work-order.js";
import { onRequestGet as adminGet, onRequestPost as adminPost } from "../functions/api/admin/grok.js";
import { checkFields, MAX_ROWS } from "../functions/_lib/intake.js";

const KEY = "test-intake-key-0123456789abcdef";
const NOW = "2026-11-15T20:00:00Z", TODAY = "2026-11-15";
const mk = (extra = {}) => newEnv({ GROK_INTAKE_KEY: KEY, GROK_INTAKE_PUBLISH: "1", ...extra });
const good = (o = {}) => ({
  name: "Mission Inn Festival of Lights", city: "Riverside", season: "christmas", type: "show", start: "2026-11-27", end: "2027-01-06", hours: "5:30pm–9:30pm", free: true, price: "Free",
  blurb: "Millions of lights across the historic hotel and its downtown blocks, with a tree lighting on opening night.", url: "https://www.missioninn.com/festival-of-lights/", venue: "The Mission Inn", address: "3649 Mission Inn Ave, Riverside, CA 92501",
  shows: ["date", "time", "place"], evidence: "Festival of Lights: Nov 27 through Jan 6, 5:30 to 9:30 pm, 3649 Mission Inn Avenue.", seen: TODAY, ...o,
});
const realFetch = globalThis.fetch;
const geo = (lat, lng) => { globalThis.fetch = async () => new Response(JSON.stringify({ result: { addressMatches: [{ matchedAddress: "X", coordinates: { x: lng, y: lat } }] } })); };
const call = (handler, env, { method = "POST", body, key = KEY, auth } = {}) => {
  const headers = { "content-type": "application/json" };
  if (auth !== undefined) headers.authorization = auth; else if (key) headers.authorization = "Bearer " + key;
  return handler({ request: new Request("https://socallights.app/api/intake/events", { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
};
const run = async (fn) => { const undo = freezeNow(NOW); try { geo(33.9806, -117.3717); return await fn(); } finally { undo(); globalThis.fetch = realFetch; } };
const send = (env, rows, extra = {}) => call(intake, env, { body: { rows, ...extra } });

test("guard: no key set 503, wrong or missing key 401, wrong method 405", async () => {
  await run(async () => {
    assert.equal((await send(mk({ GROK_INTAKE_KEY: "" }).env, [good()])).status, 503);
    assert.equal((await call(intake, mk().env, { body: { rows: [good()] }, key: "wrong-wrong-wrong-wrong" })).status, 401);
    assert.equal((await call(intake, mk().env, { body: { rows: [good()] }, key: null })).status, 401);
    assert.equal((await call(intake, mk().env, { method: "GET" })).status, 405);
  });
});

test("body: rows required, 1 to 8 per call, unknown top-level field refused", async () => {
  await run(async () => {
    const { env } = mk();
    assert.equal((await call(intake, env, { body: { nope: 1 } })).status, 400);
    assert.equal((await send(env, [])).status, 400);
    assert.equal((await send(env, Array.from({ length: MAX_ROWS + 1 }, () => good()))).status, 400);
    assert.equal((await send(env, [good()], { extra: 1 })).status, 400);
  });
});

test("a good row is published as a confirmed event with a grok- id, and shows up in the intake table", async () => {
  await run(async () => {
    const { env, raw } = mk();
    const r = await send(env, [good()]);
    assert.equal(r.status, 200); assert.equal(r.body.published, 1); assert.equal(r.body.results[0].verdict, "published");
    const id = r.body.results[0].id; assert.match(id, /^grok-mission-inn-festival-of-[a-z0-9-]*-?[0-9a-f]{6}$/);
    const e = raw.prepare("SELECT status, county, free, hours, price, season, type FROM events WHERE id = ?").get(id);
    assert.deepEqual({ ...e }, { status: "confirmed", county: e.county, free: 1, hours: "5:30pm–9:30pm", price: "Free", season: "christmas", type: "show" });
    assert.equal(raw.prepare("SELECT status FROM intake_events WHERE id = ?").get(id).status, "published");
  });
});

test("every check rejects with a reason (and one bad row never blocks the good ones)", async () => {
  await run(async () => {
    const { env, raw } = mk();
    const bad = [
      good({ name: "Bad", start: "2026-12-01", end: "2026-12-01" }),
      good({ name: "Unknown city fest", city: "Atlantis" }),
      good({ name: "Wrong type fest", type: "nope" }),
      good({ name: "Ended already fest", start: "2026-10-01", end: "2026-10-05" }),
      good({ name: "No time shown fest", shows: ["date", "place"] }),
      good({ name: "Estimated hours fest", hours: "6pm; check site" }),
      good({ name: "Long blurb fest", blurb: "x".repeat(200) }),
      good({ name: "Free mismatch fest", free: true, price: "$10" }),
      good({ name: "Insecure page fest", url: "http://example.org/e" }),
      good({ name: "No zip fest", address: "3649 Mission Inn Ave" }),
      good({ name: "Stale read fest", seen: "2026-09-01" }),
      good({ name: "Extra field fest", sneaky: 1 }),
    ];
    const r = await send(env, [...bad.slice(0, MAX_ROWS - 1), good({ name: "Fine event one" })]);
    assert.equal(r.body.results.at(-1).verdict, "published");
    for (const x of r.body.results.slice(0, -1)) { assert.equal(x.verdict, "rejected", x.name); assert.ok(x.reasons.length); }
    const r2 = await send(env, bad.slice(MAX_ROWS - 1));
    for (const x of r2.body.results) assert.equal(x.verdict, "rejected", x.name);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id LIKE 'grok-%'").get().n, 1, "only the good row went live");
    assert.ok(raw.prepare("SELECT COUNT(*) AS n FROM intake_events WHERE status = 'rejected'").get().n >= 1, "rejections are kept for the admin");
  });
});

test("hours are put in house style; free price defaults", () => {
  const c = checkFields(good({ hours: "5:30 PM - 9:30 PM", price: "" }), TODAY);
  assert.equal(c.row.hours, "5:30pm–9:30pm"); assert.equal(c.row.price, "Free");
});

test("duplicates: the same event again, the same name and day, and an existing map event are never changed", async () => {
  await run(async () => {
    const { env, raw } = mk();
    assert.equal((await send(env, [good()])).body.published, 1);
    const again = await send(env, [good()]); assert.equal(again.body.results[0].verdict, "duplicate");
    assert.equal((await send(env, [good({ url: "https://example.org/other", address: "1 Other St, Riverside, CA 92501" })])).body.results[0].verdict, "duplicate", "same name and start");
    raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES ('x1','Old Town Lights','Riverside','Riverside','show','2026-12-05','2026-12-05','confirmed',1,'Free','6pm',33.98,-117.37,'b','','christmas','V','100 Main St, Riverside, CA 92501')").run();
    const ex = await send(env, [good({ name: "Old Town Lights", start: "2026-12-05", end: "2026-12-05" })]);
    assert.equal(ex.body.results[0].verdict, "duplicate");
    assert.equal(raw.prepare("SELECT name FROM events WHERE id = 'x1'").get().name, "Old Town Lights");
    assert.equal((await send(env, [good({ name: "Twin A one" }), good({ name: "Twin A one" })])).body.results[1].verdict, "duplicate", "twice in one call");
  });
});

test("address not found or far from the city is rejected; a geocoder outage asks for a retry", async () => {
  await run(async () => {
    const { env } = mk();
    globalThis.fetch = async (u) => (String(u).includes("census") ? new Response(JSON.stringify({ result: { addressMatches: [] } })) : new Response("[]"));
    const a = await send(env, [good()]); assert.equal(a.body.results[0].verdict, "rejected"); assert.match(a.body.results[0].reasons[0], /not found/);
    geo(34.05, -118.24); // Los Angeles, about 90 km from Riverside
    const b = await send(env, [good({ name: "Far away fest" })]); assert.equal(b.body.results[0].verdict, "rejected"); assert.match(b.body.results[0].reasons[0], /far from/);
    globalThis.fetch = async () => { throw new Error("down"); };
    const c = await send(env, [good({ name: "Outage fest" })]); assert.equal(c.body.results[0].verdict, "rejected"); assert.match(c.body.results[0].reasons[0], /unavailable/);
  });
});

test("publishing off: a passing row is held (not on the map); the owner publishes it with one click and can unpublish it", async () => {
  await run(async () => {
    const { env, raw } = mk({ GROK_INTAKE_PUBLISH: "" });
    const r = await send(env, [good()]); const id = r.body.results[0].id;
    assert.equal(r.body.results[0].verdict, "held"); assert.equal(r.body.publishing, false);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id = ?").get(id).n, 0);
    const adm = (b) => adminPost({ request: new Request("https://socallights.app/api/admin/grok", { method: "POST", body: JSON.stringify(b) }), env }).then(async (x) => ({ status: x.status, body: await x.json() }));
    assert.equal((await adm({ action: "publish", id })).body.status, "published");
    assert.equal(raw.prepare("SELECT status FROM events WHERE id = ?").get(id).status, "confirmed");
    assert.equal((await adm({ action: "unpublish", id })).body.status, "unpublished");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id = ?").get(id).n, 0);
    assert.equal((await send(env, [good()])).body.results[0].verdict, "duplicate", "Grok cannot add back an event the owner took down");
    assert.equal((await adm({ action: "unpublish", id: "x1" })).status, 400, "only grok- ids");
    assert.equal((await adm({ action: "unpublish", id })).status, 409);
    const list = await adminGet({ env }).then((x) => x.json()); assert.equal(list.counts.unpublished, 1); assert.equal(list.publishing, false);
  });
});

test("dry run checks everything and stores nothing", async () => {
  await run(async () => {
    const { env, raw } = mk();
    const r = await send(env, [good(), good({ name: "Dry bad fest", city: "Atlantis" })], { dry_run: true });
    assert.deepEqual(r.body.results.map((x) => x.verdict), ["published", "rejected"]); assert.equal(r.body.dry_run, true);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id LIKE 'grok-%'").get().n, 0);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM intake_events").get().n, 0);
  });
});

test("a full call stays under the 50 outgoing calls a Pages Function may make", async () => {
  await run(async () => {
    const { env } = mk(); let outgoing = 0;
    globalThis.fetch = async () => { outgoing++; return new Response("[]"); }; // every geocoder fails: the worst case, both geocoders per row
    env.DB.stats.reset();
    await send(env, Array.from({ length: MAX_ROWS }, (_, i) => good({ name: `Limit test festival ${i}` })));
    assert.ok(outgoing + env.DB.stats.calls < 50, `${outgoing} geocoder calls + ${env.DB.stats.calls} database calls`);
  });
});

test("the daily publishing cap holds rows instead of publishing them", async () => {
  await run(async () => {
    const { env, raw } = mk();
    const ins = raw.prepare("INSERT INTO intake_events (id,status,name) VALUES (?, 'published', 'n')");
    for (let i = 0; i < 60; i++) ins.run("grok-fill-" + i);
    const r = await send(env, [good()]); assert.equal(r.body.results[0].verdict, "held"); assert.match(r.body.results[0].reasons[0], /daily/);
  });
});

test("work order: key-protected, lists thin categories and the row rules", async () => {
  await run(async () => {
    const { env } = mk();
    assert.equal((await call(workOrder, env, { method: "GET", key: null })).status, 401);
    const w = await call(workOrder, env, { method: "GET" });
    assert.equal(w.status, 200); assert.equal(w.body.max_rows_per_call, MAX_ROWS); assert.ok(w.body.fields.includes("evidence")); assert.ok(Array.isArray(w.body.thin_categories));
    assert.ok(w.body.thin_categories.length && w.body.thin_categories[0].categories[0].queries.length);
  });
});

test("wiring: routes, admin tab, version pins, no secret in the repo", () => {
  const admin = readFileSync("public/admin/admin.js", "utf8"), html = readFileSync("public/admin/index.html", "utf8");
  assert.match(admin, /renderGrok/); assert.match(admin, /"grok"/); assert.match(html, /data-tab="grok"/); assert.match(admin, /startsWith\("grok-"\)/);
  assert.match(readFileSync("functions/_lib/adminlog.js", "utf8"), /grok: \["intake_events"/);
  assert.doesNotMatch(readFileSync("functions/_lib/intake.js", "utf8"), /GROK_INTAKE_KEY\s*=\s*["']/);
});
