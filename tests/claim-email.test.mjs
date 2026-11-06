// Admin approves or declines an event claim: the person is emailed once; failures never block the decision.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as decide } from "../functions/api/admin/claims/[id].js";
import { renderTemplate, TEMPLATES, sampleVars, checkTemplate } from "../functions/_lib/mailtpl.js";
import { newEnv, addEvent, addUser, stubFetch } from "./_pay.mjs";

const mailOk = () => new Response(JSON.stringify({ id: "m1" }), { status: 200 });
const sent = (f) => f.calls.filter((c) => /resend/.test(c.url)).map((c) => JSON.parse(c.init.body));
async function setup() {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" });
  addEvent(raw, "ev1", { name: "Candy Cane Lane" });
  await addUser(raw, "u1", "organizer@example.com");
  raw.prepare("INSERT INTO event_claims (id,event_id,user_id,email,status) VALUES ('c1','ev1','u1','organizer@example.com','pending')").run();
  return { env, raw };
}
const act = (env, id, action) => decide({ request: new Request("https://socallights.app/api/admin/claims/" + id, { method: "POST", body: JSON.stringify({ action }) }), env, params: { id } }).then(async (r) => ({ status: r.status, body: await r.json() }));
const row = (raw) => ({ ...raw.prepare("SELECT status, method, emailed_status FROM event_claims WHERE id = 'c1'").get() });

test("approve sends one email with the event name and a /feature link that has the event chosen; a repeat click sends none", async () => {
  const { env, raw } = await setup(); const f = stubFetch(mailOk);
  try {
    const r = await act(env, "c1", "approve");
    assert.equal(r.status, 200); assert.equal(r.body.emailed, true);
    const m = sent(f); assert.equal(m.length, 1);
    assert.deepEqual(m[0].to, ["organizer@example.com"]);
    assert.match(m[0].subject, /Your claim is approved: Candy Cane Lane/);
    assert.match(m[0].text, /https:\/\/socallights\.app\/feature\?event=ev1/);
    assert.match(m[0].text, /one-time payment/); assert.match(m[0].text, /info@socallights\.app/);
    assert.deepEqual(row(raw), { status: "approved", method: "admin", emailed_status: "approved" });
    await act(env, "c1", "approve"); await act(env, "c1", "approve");
    assert.equal(sent(f).length, 1, "no resend");
  } finally { f.restore(); }
});

test("decline sends one kind email (no placeholder left) and a repeat sends none", async () => {
  const { env, raw } = await setup(); const f = stubFetch(mailOk);
  try {
    await act(env, "c1", "decline"); await act(env, "c1", "decline");
    const m = sent(f); assert.equal(m.length, 1);
    assert.match(m[0].subject, /About your claim: Candy Cane Lane/);
    assert.match(m[0].text, /info@socallights\.app/);
    assert.ok(!/\{\{|\}\}|undefined|null/.test(m[0].text + m[0].html + m[0].subject));
    assert.equal(row(raw).emailed_status, "declined");
    await act(env, "c1", "approve"); assert.equal(sent(f).length, 2, "a changed decision is a new decision");
  } finally { f.restore(); }
});

test("a claim that was approved automatically (email matched the website) sends nothing when the admin clicks approve", async () => {
  const { env, raw } = await setup(); const f = stubFetch(mailOk);
  try {
    raw.prepare("UPDATE event_claims SET status = 'approved', method = 'domain' WHERE id = 'c1'").run();
    const r = await act(env, "c1", "approve"); assert.equal(r.status, 200);
    assert.equal(sent(f).length, 0);
  } finally { f.restore(); }
});

test("a failed send does not break the decision, is logged in ops_log, is not marked sent, and a later click retries", async () => {
  const { env, raw } = await setup();
  let f = stubFetch(() => new Response("boom", { status: 500 }));
  try {
    const r = await act(env, "c1", "approve");
    assert.equal(r.status, 200); assert.equal(r.body.ok, true); assert.equal(r.body.emailed, false);
    assert.equal(row(raw).status, "approved"); assert.equal(row(raw).emailed_status, null);
    assert.ok(raw.prepare("SELECT COUNT(*) n FROM ops_log WHERE kind = 'email'").get().n >= 1);
    assert.ok(!/organizer@example\.com/.test(JSON.stringify(raw.prepare("SELECT detail FROM ops_log").all())), "no address in the log");
  } finally { f.restore(); }
  f = stubFetch(mailOk);
  try { await act(env, "c1", "approve"); assert.equal(sent(f).length, 1); assert.equal(row(raw).emailed_status, "approved"); } finally { f.restore(); }
});

test("a mail service that throws does not break the decision either", async () => {
  const { env, raw } = await setup();
  const f = stubFetch(() => { throw new Error("network down"); });
  try { const r = await act(env, "c1", "decline"); assert.equal(r.status, 200); assert.equal(row(raw).status, "declined"); assert.equal(row(raw).emailed_status, null); } finally { f.restore(); }
});

test("both templates are registered, pass the editor's checks, and render with no unresolved placeholders", async () => {
  for (const id of ["claim_approved", "claim_declined"]) {
    const t = TEMPLATES.find((x) => x.id === id); assert.ok(t, id);
    assert.equal(checkTemplate(t, t.subject, t.text), "");
    const m = await renderTemplate({}, id, sampleVars(t));
    assert.ok(!/\{\{|\}\}/.test(m.subject + m.text + m.html), id);
    assert.equal(m.marketing, false, "a service email: no marketing unsubscribe");
  }
});
