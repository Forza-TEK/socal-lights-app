// F-14: "ends in 3 days" and "has ended" emails to the buyer of a paid Featured event or home. Mail and Stripe are always stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { sweepPlacementNotices } from "../functions/_lib/placementmail.js";
import { onRequestPost as job } from "../functions/api/placement-notices.js";
import { addSuppression } from "../functions/_lib/outreach.js";
import { renderTemplate, TEMPLATES } from "../functions/_lib/mailtpl.js";
import { newEnv, ptToday, stubFetch } from "./_pay.mjs";

const KEY = "k".repeat(24);
const mailer = () => stubFetch(() => new Response("{}", { status: 200 }));
const sent = (net) => net.calls.filter((c) => c.url.includes("api.resend.com")).map((c) => JSON.parse(c.init.body));
const mk = () => newEnv({ RESEND_API_KEY: "re_test", ALERT_CRON_KEY: KEY });
const order = (raw, sid, until, o = {}) => raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,payment_intent,currency,status,applied,applied_featured,applied_until,target,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now', ?))")
  .run(sid, o.event_id || "ev1", "top", 1500, o.email || "buyer@example.com", "pi_" + sid, "usd", o.status || "paid", o.applied ?? 1, 2, until, o.target || "event", o.age || "-10 days");
const col = (raw, sid, c) => raw.prepare(`SELECT ${c} AS v FROM feature_orders WHERE session_id = ?`).get(sid).v;

test("3 days before the end one 'ends soon' mail goes out, once; on the day after the end one 'ended' mail, once", async () => {
  const { env, raw } = mk(); order(raw, "cs_a", ptToday(3)); order(raw, "cs_far", ptToday(10)); order(raw, "cs_h", ptToday(2), { event_id: "h1", target: "home", email: "home@example.com" });
  const net = mailer();
  try {
    assert.deepEqual(await sweepPlacementNotices(env), { ending: 2, ended: 0 });
    const m = sent(net); assert.equal(m.length, 2);
    const a = m.find((x) => x.to[0] === "buyer@example.com"); assert.match(a.subject, /Your Featured placement ends on [A-Z][a-z]{2} \d{1,2}, \d{4}/); assert.match(a.text, /\/feature\?event=ev1/); assert.match(a.text, /3 days from now/);
    assert.match(m.find((x) => x.to[0] === "home@example.com").text, /\/feature\?home=h1/);
    assert.deepEqual(await sweepPlacementNotices(env), { ending: 0, ended: 0 }, "never repeats");
    assert.equal(sent(net).length, 2);
    // the day after it ends
    const later = ptToday(4); // cs_a ended yesterday relative to 'later'
    const r = await sweepPlacementNotices(env, { today: later }); // cs_a (ended day 3) and cs_h (day 2) both ended before day 4
    assert.equal(r.ended, 2);
    const e = sent(net).filter((x) => /has ended/.test(x.subject)); assert.equal(e.length, 2);
    assert.deepEqual(await sweepPlacementNotices(env, { today: later }), { ending: 0, ended: 0 }, "ended mail once too");
    assert.equal(col(raw, "cs_far", "ending_notice_at"), null, "an order far from its end is untouched");
  } finally { net.restore(); }
});

test("not sent for refunded, held or unapplied orders, other products, a brand-new order, or a bounced/complained address (marked skipped, never retried)", async () => {
  const { env, raw } = mk();
  order(raw, "cs_ref", ptToday(2), { status: "refunded" }); order(raw, "cs_held", ptToday(2), { status: "held" }); order(raw, "cs_un", ptToday(2), { applied: 0 });
  order(raw, "cs_inst", ptToday(2), { target: "installer" }); order(raw, "cs_new", ptToday(2), { age: "-1 hours" }); order(raw, "cs_bad", ptToday(2), { email: "bad@example.com" });
  await addSuppression(env, "bad@example.com", "complaint", "test");
  const net = mailer();
  try {
    assert.deepEqual(await sweepPlacementNotices(env), { ending: 0, ended: 0 }); assert.equal(sent(net).length, 0);
    assert.equal(col(raw, "cs_bad", "ending_notice_at"), "skipped");
    for (const s of ["cs_ref", "cs_held", "cs_un", "cs_inst", "cs_new"]) assert.equal(col(raw, s, "ending_notice_at"), null, s);
    assert.deepEqual(await sweepPlacementNotices(env), { ending: 0, ended: 0 }); assert.equal(col(raw, "cs_bad", "ending_notice_at"), "skipped");
  } finally { net.restore(); }
});

test("an unsubscribed buyer still gets it (service mail); a failed send is retried next run; PLACEMENT_NOTICES=0 switches the job off", async () => {
  const { env, raw } = mk(); order(raw, "cs_u", ptToday(1));
  raw.prepare("INSERT INTO email_prefs (email, token, optout) VALUES ('buyer@example.com', ?, 1)").run("a".repeat(36));
  let net = stubFetch(() => new Response("{}", { status: 500 }));
  try { assert.equal((await sweepPlacementNotices(env)).ending, 0); assert.equal(col(raw, "cs_u", "ending_notice_at"), null, "claim released after a failed send"); } finally { net.restore(); }
  assert.deepEqual(await sweepPlacementNotices({ ...env, PLACEMENT_NOTICES: "0" }), { ending: 0, ended: 0, off: true });
  net = mailer();
  try { assert.equal((await sweepPlacementNotices(env)).ending, 1); assert.equal(sent(net).length, 1); } finally { net.restore(); }
});

test("the job endpoint needs the cron key and reports counts; the templates render with their samples", async () => {
  const { env, raw } = mk(); order(raw, "cs_j", ptToday(2));
  assert.equal((await job({ request: new Request("https://x.test/api/placement-notices", { method: "POST" }), env })).status, 401);
  const net = mailer();
  try {
    const r = await job({ request: new Request("https://x.test/api/placement-notices", { method: "POST", headers: { "x-alert-key": KEY } }), env });
    assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true, ending: 1, ended: 0 });
  } finally { net.restore(); }
  for (const id of ["placement_ending", "placement_ended"]) {
    const t = TEMPLATES.find((x) => x.id === id); assert.ok(t && t.guard === "deliverable", id);
    const vars = Object.fromEntries(Object.entries(t.vars).map(([k, v]) => [k, v[1]]));
    const m = await renderTemplate(env, id, vars); assert.ok(m.subject && m.text && m.html && !/\{\{/.test(m.text + m.html + m.subject), id);
  }
});
