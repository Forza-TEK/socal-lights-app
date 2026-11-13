// Admin "Errors, last 7 days": normal activity that is logged (outreach and ad calls that worked, sponsor payment-link notes) is shown apart and NOT counted as errors;
// anything that says failed or invalid, and every other kind, still counts. The digest's problem list uses the same rule.
import test from "node:test";
import assert from "node:assert/strict";
import { errorsLast7 } from "../functions/_lib/adminhealth.js";
import { opsSince, logOp } from "../functions/_lib/oplog.js";
import { newEnv } from "./_pay.mjs";

test("activity lines are not errors; failures and other kinds still are", async () => {
  const { env, raw } = newEnv();
  const add = raw.prepare("INSERT INTO ops_log (kind, detail) VALUES (?, ?)");
  for (let i = 0; i < 5; i++) add.run("outreach", "event unsubscribe step=0 segment=contest");
  add.run("outreach", "check n=3 registered=0 listing=0");
  add.run("ads", "report rows=6 accepted=6 warnings=6");
  add.run("sponsor-pay-link", "contest some-contest: payment link host pay.example.com");
  add.run("outreach", "event failed (Could not save)");
  add.run("ads", "report failed (D1 down)");
  add.run("outreach", "event invalid reason=bad_email");
  add.run("webhook", "Stripe webhook rejected: no stripe-signature header");
  const e = await errorsLast7(env, []);
  assert.equal(e.total, 4, "3 failures/invalids and 1 webhook problem");
  assert.deepEqual(e.groups.map((g) => [g.kind, g.n]).sort(), [["ads", 1], ["outreach", 2], ["webhook", 1]]);
  assert.deepEqual(Object.fromEntries(e.activity.map((a) => [a.kind, a.n])), { outreach: 6, ads: 1, "sponsor-pay-link": 1 });
  const digest = await opsSince(env, "2000-01-01 00:00:00");
  assert.equal(digest.reduce((t, g) => t + g.n, 0), 4, "the digest leaves the activity out too");
});

test("a calm week shows nothing logged even with outreach activity", async () => {
  const { env } = newEnv();
  await logOp(env, "outreach", "event sent step=1 segment=installer");
  const e = await errorsLast7(env, []);
  assert.equal(e.total, 0); assert.equal(e.activity[0].n, 1);
});

test("lastRuns reports the newest Stripe event received", async () => {
  const { lastRuns } = await import("../functions/_lib/adminhealth.js");
  const { env, raw } = newEnv();
  assert.equal((await lastRuns(env, [])).stripe, null);
  raw.prepare("INSERT INTO stripe_events (id,type,received_at) VALUES ('evt_1','charge.refunded','2026-01-01 00:00:00'),('evt_2','checkout.session.completed','2026-02-01 00:00:00')").run();
  const r = await lastRuns(env, []);
  assert.deepEqual(r.stripe, { type: "checkout.session.completed", at: "2026-02-01 00:00:00" });
});
