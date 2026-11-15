// Run with: node --test tests/   (Grok update call: confirm and correct events already on the map, hold what needs the owner, undo from Admin.)
import test from "node:test";
import assert from "node:assert/strict";
import { newEnv, freezeNow } from "./_pay.mjs";
import { onRequest as updates } from "../functions/api/intake/updates.js";
import { onRequest as workOrder } from "../functions/api/intake/work-order.js";
import { onRequestGet as adminGet, onRequestPost as adminPost } from "../functions/api/admin/grok.js";
import { checkUpdate, MAX_UPDATES } from "../functions/_lib/intake-updates.js";

const KEY = "test-intake-key-0123456789abcdef", NOW = "2026-11-15T20:00:00Z", TODAY = "2026-11-15";
const mk = (extra = {}) => {
  const { env, raw } = newEnv({ GROK_INTAKE_KEY: KEY, ...extra });
  const ev = raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address,image) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  const add = (id, o = {}) => ev.run(id, o.name || "Old Town Lights " + id, "Riverside", "Riverside", "show", o.start || "2026-12-05", o.end || "2026-12-05", o.status || "expected", o.free ?? 1, o.price || "Free", o.hours || "6pm–9pm; check site", 33.98, -117.37, "A holiday show.", "https://example.org/" + id, "christmas", "Venue", "100 Main St, Riverside, CA 92501", o.image === undefined ? null : o.image);
  return { env, raw, add };
};
const call = (env, body, path = "updates", handler = updates, method = "POST", key = KEY) => handler({ request: new Request("https://socallights.app/api/intake/" + path, { method, headers: { "content-type": "application/json", ...(key ? { authorization: "Bearer " + key } : {}) }, body: method === "GET" ? undefined : JSON.stringify(body) }), env }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
const row = (id, o = {}) => ({ id, url: "https://example.org/" + id, shows: ["date", "time", "place"], evidence: "Old Town Lights: Dec 5, 6pm to 9pm, 100 Main Street.", seen: TODAY, ...o });
const run = async (fn) => { const undo = freezeNow(NOW); const real = globalThis.fetch; try { globalThis.fetch = async (u, o) => (o && o.method === "HEAD" ? new Response(null, { status: 200, headers: { "content-type": "image/jpeg" } }) : new Response("{}")); return await fn(); } finally { undo(); globalThis.fetch = real; } };
const state = (raw, id) => raw.prepare("SELECT start_date, end_date, hours, price, free, status, image FROM events WHERE id = ?").get(id);

test("guard and body: key required, 1 to 8 rows, unknown fields refused", async () => {
  await run(async () => {
    const { env } = mk();
    assert.equal((await call(env, { rows: [row("a")] }, "updates", updates, "POST", null)).status, 401);
    assert.equal((await call(env, { rows: [] })).status, 400);
    assert.equal((await call(env, { rows: Array.from({ length: MAX_UPDATES + 1 }, (_, i) => row("a" + i)) })).status, 400);
    assert.equal((await call(env, { nope: 1 })).status, 400);
    assert.ok(checkUpdate(row("a", { sneaky: 1 }), TODAY).problems);
  });
});

test("confirming: a page that states date, time and place turns an expected event into confirmed", async () => {
  await run(async () => {
    const { env, raw, add } = mk(); add("a");
    const r = await call(env, { rows: [row("a")] });
    assert.equal(r.status, 200); assert.equal(r.body.results[0].verdict, "applied"); assert.equal(r.body.results[0].kind, "confirm");
    assert.equal(state(raw, "a").status, "confirmed");
    assert.equal((await call(env, { rows: [row("a")] })).body.results[0].verdict, "unchanged", "already confirmed");
    assert.equal(raw.prepare("SELECT status FROM intake_updates").get().status, "applied");
  });
});

test("correcting dates, hours and price from the page; checks like the intake (estimated hours, free flag, past dates, missing proof)", async () => {
  await run(async () => {
    const { env, raw, add } = mk(); add("a"); add("b");
    const r = await call(env, { rows: [row("a", { start: "2026-12-06", end: "2026-12-06", hours: "6 PM - 9 PM", price: "$10", free: false })] });
    assert.equal(r.body.results[0].verdict, "applied"); assert.deepEqual({ ...state(raw, "a") }, { start_date: "2026-12-06", end_date: "2026-12-06", hours: "6pm–9pm", price: "$10", free: 0, status: "confirmed", image: null });
    for (const [o, re] of [[{ hours: "TBD" }, /real times/], [{ start: "2026-10-01", end: "2026-10-02" }, /ended/], [{ price: "$5", free: true }, /free=1/], [{ shows: ["date"] }, /shows/], [{ evidence: "x" }, /evidence/], [{ seen: "2026-01-01" }, /seen/], [{ url: "http://example.org/x" }, /https/]]) {
      const x = await call(env, { rows: [row("b", { hours: "7pm", ...o })] }); assert.equal(x.body.results[0].verdict, "rejected", JSON.stringify(o)); assert.match(x.body.results[0].reasons.join(" "), re, JSON.stringify(o));
    }
    assert.equal(state(raw, "b").hours, "6pm–9pm; check site", "nothing changed by the rejected rows");
    assert.equal((await call(env, { rows: [row("nope")] })).body.results[0].verdict, "rejected", "an id that is not on the map");
  });
});

test("the owner decides: organizer events, contest homes, paid placements, cancellations, big date shifts and a switched-off intake are held, not applied", async () => {
  await run(async () => {
    const { env, raw, add } = mk(); add("u-organizer-1"); add("hcontest-9"); add("paid1"); add("cancel1"); add("far1", { status: "confirmed", start: "2026-12-05" }); add("own1");
    raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,status,applied,target) VALUES ('s1','paid1','ev_banner',5000,'paid',1,'event')").run();
    raw.prepare("INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,free,price,hours,lat,lng,blurb,url,venue,address,contact_email,event_id) VALUES ('s1','published','n','Riverside','Riverside','christmas','show','2026-12-05','2026-12-05',1,'Free','6pm',33.9,-117.3,'b','','v','a','o@example.com','own1')").run();
    const rows = [row("u-organizer-1"), row("hcontest-9"), row("paid1"), { id: "cancel1", url: "https://example.org/cancel1", evidence: "This event has been cancelled.", seen: TODAY, cancelled: true }, row("far1", { start: "2027-03-01", end: "2027-03-01", hours: "6pm" }), row("own1")];
    const a = await call(env, { rows: rows.slice(0, 3) }), b = await call(env, { rows: rows.slice(3, 6) });
    for (const x of [...a.body.results, ...b.body.results]) assert.equal(x.verdict, "held", JSON.stringify(x));
    assert.equal(state(raw, "u-organizer-1").status, "expected"); assert.equal(state(raw, "far1").start_date, "2026-12-05"); assert.equal(state(raw, "cancel1").status, "expected");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM intake_updates WHERE status = 'held'").get().n, 6);
    const off = mk({ GROK_INTAKE_PUBLISH: "0" }); off.add("a");
    assert.equal((await call(off.env, { rows: [row("a")] })).body.results[0].verdict, "held"); assert.equal(state(off.raw, "a").status, "expected");
  });
});

test("photo link: replaces a missing photo (same checks as the intake), never a photo we host or the organizer added", async () => {
  await run(async () => {
    const { env, raw, add } = mk(); add("a"); add("b", { image: "/img/events/b.jpg" }); add("c");
    const ok = await call(env, { rows: [{ id: "a", image_url: "https://example.org/img/lights.jpg" }] });
    assert.equal(ok.body.results[0].verdict, "applied"); assert.equal(ok.body.results[0].kind, "photo"); assert.equal(state(raw, "a").image, "https://example.org/img/lights.jpg"); assert.equal(state(raw, "a").status, "expected", "a photo alone does not confirm");
    assert.equal((await call(env, { rows: [{ id: "b", image_url: "https://example.org/img/x.jpg" }] })).body.results[0].verdict, "unchanged");
    assert.equal(state(raw, "b").image, "/img/events/b.jpg");
    const bad = await call(env, { rows: [{ id: "c", image_url: "https://scontent.xx.fbcdn.net/v/a.jpg?oe=1" }] }); assert.equal(bad.body.results[0].verdict, "rejected"); assert.match(bad.body.results[0].reasons[0], /expire/);
  });
});

test("Admin > From Grok > Updates: an applied change is undone, a held one applied or dismissed, only while the event still has those values", async () => {
  await run(async () => {
    const { env, raw, add } = mk(); add("a"); add("far1", { status: "confirmed" });
    const adm = (b) => adminPost({ request: new Request("https://socallights.app/api/admin/grok", { method: "POST", body: JSON.stringify(b) }), env }).then(async (x) => ({ status: x.status, body: await x.json() }));
    await call(env, { rows: [row("a", { hours: "7pm" })] });
    const u = raw.prepare("SELECT id FROM intake_updates WHERE event_id = 'a'").get();
    assert.equal(state(raw, "a").status, "confirmed");
    assert.equal((await adm({ action: "update_revert", id: u.id })).body.status, "reverted"); assert.deepEqual({ ...state(raw, "a") }, { start_date: "2026-12-05", end_date: "2026-12-05", hours: "6pm–9pm; check site", price: "Free", free: 1, status: "expected", image: null });
    assert.equal((await adm({ action: "update_revert", id: u.id })).status, 409, "only once");
    await call(env, { rows: [row("far1", { start: "2027-03-01", end: "2027-03-01", hours: "6pm" })] });
    const h = raw.prepare("SELECT id FROM intake_updates WHERE event_id = 'far1'").get();
    raw.prepare("UPDATE events SET hours = 'changed by hand' WHERE id = 'far1'").run();
    assert.equal((await adm({ action: "update_apply", id: h.id })).status, 409, "the event changed after the update arrived");
    raw.prepare("UPDATE events SET hours = '6pm–9pm; check site' WHERE id = 'far1'").run();
    assert.equal((await adm({ action: "update_apply", id: h.id })).body.status, "applied"); assert.equal(state(raw, "far1").start_date, "2027-03-01");
    assert.equal((await adm({ action: "update_dismiss", id: h.id })).status, 409);
    const list = await adminGet({ env }).then((x) => x.json()); assert.equal(list.updates.length, 2); assert.ok(list.updates.every((x) => ["reverted", "applied"].includes(x.status)));
  });
});

test("work order lists events Grok can confirm or give a photo (not organizer or contest events); a full update call stays under 50 outgoing calls", async () => {
  await run(async () => {
    const { env, raw, add } = mk(); const first = { start: "2026-11-16", end: "2026-11-16" }; add("a", first); add("u-x", first); add("hcontest-1", first); add("photoed", { ...first, image: "https://example.org/p.jpg" });
    const w = await call(env, null, "work-order", workOrder, "GET");
    assert.deepEqual(w.body.events_to_confirm.map((e) => e.id).filter((i) => ["a", "u-x", "hcontest-1", "photoed"].includes(i)).sort(), ["a", "photoed"]);
    assert.ok(w.body.events_without_photo.some((e) => e.id === "a") && !w.body.events_without_photo.some((e) => e.id === "photoed" || e.id === "u-x"));
    for (let i = 0; i < MAX_UPDATES; i++) add("z" + i);
    let outgoing = 0; globalThis.fetch = async (u, o) => { outgoing++; return new Response(null, { status: 200, headers: { "content-type": "image/jpeg" } }); };
    env.DB.stats.reset();
    const r = await call(env, { rows: Array.from({ length: MAX_UPDATES }, (_, i) => row("z" + i, { image_url: `https://example.org/i${i}.jpg` })) });
    assert.equal(r.body.applied, MAX_UPDATES); assert.ok(outgoing + env.DB.stats.calls < 50, `${outgoing} outgoing + ${env.DB.stats.calls} database calls`);
  });
});
