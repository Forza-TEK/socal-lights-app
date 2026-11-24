// F-25: long-ended events are archived (hidden from /api/events?ended=1), never deleted, and events with orders or an organizer are left alone.
import test from "node:test";
import assert from "node:assert/strict";
import { archiveEnded, cutoffFor } from "../functions/_lib/endedcleanup.js";
import { onRequestPost as job } from "../functions/api/archive-ended.js";
import { build } from "../functions/api/events.js";
import { newEnv, addEvent, ptToday } from "./_pay.mjs";

const KEY = "k".repeat(24);
const seed = () => {
  const { env, raw } = newEnv({ ALERT_CRON_KEY: KEY });
  addEvent(raw, "old", { start_date: ptToday(-120), end_date: ptToday(-100) });                    // due
  raw.prepare("UPDATE events SET status = 'confirmed'").run();
  addEvent(raw, "old-exp", { start_date: ptToday(-120), end_date: ptToday(-90) });                 // due, never confirmed
  raw.prepare("UPDATE events SET status = 'expected' WHERE id = 'old-exp'").run();
  addEvent(raw, "recent", { start_date: ptToday(-40), end_date: ptToday(-30) });                   // ended, but not 60 days ago
  addEvent(raw, "live", { start_date: ptToday(-5), end_date: ptToday(20) });
  addEvent(raw, "ordered", { start_date: ptToday(-120), end_date: ptToday(-100) });                // has an order
  raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,status,target) VALUES ('cs1','ordered','ev_pin',1500,'b@example.com','paid','event')").run();
  addEvent(raw, "submitted", { start_date: ptToday(-120), end_date: ptToday(-100) });              // has an organizer
  raw.prepare("INSERT INTO event_submissions (id,status,name,city,season,type,start_date,end_date,contact_email,event_id) VALUES ('s1','published','n','Pasadena','christmas','walk',?,?,'o@example.com','submitted')").run(ptToday(-120), ptToday(-100));
  addEvent(raw, "claimed", { start_date: ptToday(-120), end_date: ptToday(-100) });                // has a claim
  raw.prepare("INSERT INTO event_claims (id,event_id,user_id,email,status) VALUES ('cl1','claimed','u1','c@example.com','approved')").run();
  addEvent(raw, "c-contest", { start_date: ptToday(-120), end_date: ptToday(-100) });              // a contest's map event
  return { env, raw };
};
const archived = (raw) => raw.prepare("SELECT id FROM events WHERE archived_at IS NOT NULL ORDER BY id").all().map((r) => r.id);

test("F-25: the cutoff is 60 days back and only events past it, without orders, organizers, claims or contests, are archived", async () => {
  assert.equal(cutoffFor("2026-12-01", 60), "2026-10-02");
  const { env, raw } = seed();
  const total = raw.prepare("SELECT COUNT(*) n FROM events").get().n;
  const dry = await archiveEnded(env, { dryRun: true });
  assert.equal(dry.dryRun, true); assert.equal(dry.due, 2); assert.equal(dry.unresolved, 1); assert.deepEqual(archived(raw), [], "a dry run changes nothing");
  const r = await archiveEnded(env);
  assert.equal(r.archived, 2); assert.deepEqual(archived(raw), ["old", "old-exp"]);
  assert.equal(raw.prepare("SELECT COUNT(*) n FROM events").get().n, total, "no row is deleted");
  const again = await archiveEnded(env); assert.equal(again.archived, 0, "a second run has nothing to do");
});

test("F-25: /api/events?ended=1 leaves archived events out, the plain list and Admin ?all=1 are unchanged", async () => {
  const { env, raw } = seed();
  const ids = async (all, ended) => JSON.parse((await build(env, all, ended, false, false)).body).map((e) => e.id).sort();
  const before = await ids(false, true); assert.ok(before.includes("old"));
  await archiveEnded(env);
  const after = await ids(false, true);
  assert.ok(!after.includes("old") && !after.includes("old-exp")); assert.ok(after.includes("ordered") && after.includes("recent"));
  assert.ok((await ids(true, false)).includes("old"), "Admin still sees archived rows");
  const plain = await ids(false, false); assert.ok(plain.includes("live") && !plain.includes("old"), "the normal list never had them");
});

test("F-25: the job endpoint needs the cron key, accepts ?dry=1, and archives", async () => {
  const { env, raw } = seed();
  const call = (headers, q = "") => job({ request: new Request("https://socallights.app/api/archive-ended" + q, { method: "POST", headers }), env });
  assert.equal((await call({})).status, 401);
  assert.equal((await call({ "x-alert-key": "wrong" + KEY })).status, 401);
  const dry = await (await call({ "x-alert-key": KEY }, "?dry=1")).json(); assert.equal(dry.dryRun, true); assert.equal(dry.due, 2); assert.deepEqual(archived(raw), []);
  const real = await (await call({ "x-alert-key": KEY })).json(); assert.equal(real.ok, true); assert.equal(real.archived, 2);
});
