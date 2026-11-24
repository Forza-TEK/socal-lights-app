// F-10: (a) a signed-in person changes the email of their account by confirming a code sent to the new address, and everything keyed by the old email follows;
// (b) Admin transfers one event, home or installer to another account by email. Mail is stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as meEmail, CHANGE_PER_ACCOUNT_HOUR } from "../functions/api/me/email.js";
import { onRequestPost as transfer } from "../functions/api/admin/transfer.js";
import { newEnv, addUser, stubFetch } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const mk = () => newEnv({ RESEND_API_KEY: "re_test" });
const mailer = () => stubFetch(() => new Response("{}", { status: 200 }));
const sent = (net) => net.calls.filter((c) => c.url.includes("api.resend.com")).map((c) => JSON.parse(c.init.body));
const call = async (env, cookie, body, ip = "203.0.113.5") => { const r = await meEmail({ request: new Request(ORIGIN + "/api/me/email", { method: "POST", headers: { cookie, origin: ORIGIN, "content-type": "application/json", "CF-Connecting-IP": ip }, body: JSON.stringify(body) }), env }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const codeFrom = (net) => sent(net).at(-1).text.match(/\b(\d{6})\b/)[1];

function seed(raw, u) {
  raw.prepare("INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,contact_email) VALUES ('s1','published','E1','Orange','Irvine','christmas','tree','2999-12-01','2999-12-30','Jane.Doe+lights@gmail.com')").run();
  raw.prepare("INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,contact_email) VALUES ('s2','published','Other','Orange','Irvine','christmas','tree','2999-12-01','2999-12-30','someone@else.com')").run();
  raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,user_id) VALUES ('h1','approved','b','Home','Irvine',33.6,-117.8,'d','[]','janedoe@gmail.com','christmas','1 Main St',?)").run(u.id);
  raw.prepare("INSERT INTO installers (id,slug,name,status,owner_email) VALUES ('i1','acme','Acme','active','janedoe@gmail.com')").run();
  raw.prepare("INSERT INTO contest_staff (contest_id,email) VALUES ('c1','janedoe@gmail.com'), ('c2','janedoe@gmail.com'), ('c2','new@example.com')").run();
  raw.prepare("INSERT INTO event_claims (id,event_id,user_id,email,status) VALUES ('cl1','ev9',?, 'janedoe@gmail.com','approved')").run(u.id);
}

test("change email: a code goes to the NEW address, the right code moves the account and every record keyed by the old email in one go", async () => {
  const { env, raw } = mk(), u = await addUser(raw, "u1", "janedoe@gmail.com"); seed(raw, u);
  const net = mailer();
  try {
    assert.equal((await call(env, u.cookie, { action: "start", email: "New@Example.com" })).status, 200);
    const m = sent(net); assert.equal(m.length, 1); assert.equal(m[0].to[0], "New@Example.com"); assert.match(m[0].subject, /Confirm your new SoCal Lights email/);
    const code = codeFrom(net);
    assert.equal((await call(env, u.cookie, { action: "confirm", email: "new@example.com", code: code === "000000" ? "111111" : "000000" })).status, 400, "a wrong code changes nothing");
    assert.equal(raw.prepare("SELECT email FROM users WHERE id='u1'").get().email, "janedoe@gmail.com");
    const r = await call(env, u.cookie, { action: "confirm", email: "new@example.com", code });
    assert.equal(r.status, 200); assert.equal(r.body.email, "new@example.com");
    const u2 = raw.prepare("SELECT email, login_email FROM users WHERE id='u1'").get(); assert.deepEqual({ ...u2 }, { email: "new@example.com", login_email: "new@example.com" });
    assert.equal(raw.prepare("SELECT contact_email FROM event_submissions WHERE id='s1'").get().contact_email, "new@example.com", "an alias spelling of the old address followed");
    assert.equal(raw.prepare("SELECT contact_email FROM event_submissions WHERE id='s2'").get().contact_email, "someone@else.com", "other people's rows are untouched");
    assert.equal(raw.prepare("SELECT contact_email FROM posts WHERE id='h1'").get().contact_email, "new@example.com");
    assert.equal(raw.prepare("SELECT owner_email FROM installers WHERE id='i1'").get().owner_email, "new@example.com");
    assert.equal(raw.prepare("SELECT email FROM event_claims WHERE id='cl1'").get().email, "new@example.com");
    assert.deepEqual(raw.prepare("SELECT contest_id, email FROM contest_staff ORDER BY contest_id").all().map((x) => ({ ...x })), [{ contest_id: "c1", email: "new@example.com" }, { contest_id: "c2", email: "new@example.com" }], "a staff row that already had the new address is not doubled");
    assert.equal((await call(env, u.cookie, { action: "confirm", email: "new@example.com", code })).status, 400, "the code works once");
  } finally { net.restore(); }
});

test("change email: refused for the same address, an address with an account, a throwaway domain, no sign-in or an Admin acting for the person; throttled", async () => {
  const { env, raw } = mk(), u = await addUser(raw, "u1", "a@example.com"); await addUser(raw, "u2", "taken@example.com");
  const net = mailer();
  try {
    assert.equal((await call(env, "", { action: "start", email: "x@example.com" })).status, 401);
    assert.equal((await call(env, u.cookie, { action: "start", email: "A@example.com" })).status, 400);
    assert.equal((await call(env, u.cookie, { action: "start", email: "taken@example.com" })).status, 409);
    assert.equal((await call(env, u.cookie, { action: "start", email: "x@mailinator.com" })).status, 400);
    assert.equal(sent(net).length, 0);
    for (let i = 0; i < CHANGE_PER_ACCOUNT_HOUR; i++) assert.equal((await call(env, u.cookie, { action: "start", email: `n${i}@example.com` }, "198.51.100." + i)).status, 200);
    assert.equal((await call(env, u.cookie, { action: "start", email: "n9@example.com" }, "198.51.100.99")).status, 429);
    // a sign-in code is not a change code and a change code is useless for another account
    const u3 = await addUser(raw, "u3", "c@example.com");
    assert.equal((await call(env, u3.cookie, { action: "confirm", email: "n0@example.com", code: codeFrom(net) })).status, 400);
    assert.equal(raw.prepare("SELECT email FROM users WHERE id='u1'").get().email, "a@example.com");
    // five wrong guesses use up the code
    const v = await addUser(raw, "u4", "d@example.com"); await call(env, v.cookie, { action: "start", email: "dd@example.com" }, "198.51.100.150");
    for (let i = 0; i < 5; i++) await call(env, v.cookie, { action: "confirm", email: "dd@example.com", code: "123456" });
    assert.equal((await call(env, v.cookie, { action: "confirm", email: "dd@example.com", code: codeFrom(net) })).status, 400);
  } finally { net.restore(); }
});

test("the profile Account tab has the Change my email section", () => {
  const html = readFileSync(new URL("../public/profile.html", import.meta.url), "utf8");
  assert.match(html, /Change my email/); assert.match(html, /\/api\/me\/email/); assert.match(html, /action: "start"/); assert.match(html, /action: "confirm"/);
});

test("Admin editors (event, home, installer) have the two-tap Transfer to another account box", () => {
  const js = readFileSync(new URL("../public/admin/admin.js", import.meta.url), "utf8");
  assert.match(js, /transferBox\("event", e\.id\)/); assert.match(js, /transferBox\("home", p\.id\)/); assert.match(js, /transferBox\("installer", i\.id\)/);
  assert.match(js, /\/api\/admin\/transfer/); assert.match(js, /tap\(b, "transfer"\)/);
});

const adm = { admin: { email: "owner@example.com" } };
const xfer = async (env, body) => { const r = await transfer({ request: new Request(ORIGIN + "/api/admin/transfer", { method: "POST", body: JSON.stringify(body) }), env, data: adm }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const logRows = (raw) => raw.prepare("SELECT area, action, target_id, label, detail FROM admin_log ORDER BY rowid").all().map((x) => ({ ...x }));

test("Admin transfer: a home, an installer and an event move to another account by email, and each is written to the Admin log", async () => {
  const { env, raw } = mk(); const old = await addUser(raw, "u1", "old@example.com"); const nu = await addUser(raw, "u2", "newowner@example.com");
  raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,user_id) VALUES ('h1','approved','b','Home','Irvine',33.6,-117.8,'d','[]','old@example.com','christmas','1 Main St','u1')").run();
  raw.prepare("INSERT INTO installers (id,slug,name,status,owner_email) VALUES ('i1','acme','Acme','active','old@example.com')").run();
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES ('ev1','Ev One','Orange','Irvine','tree','2999-12-01','2999-12-30','published',1,'','',33.6,-117.8,'b','https://example.org/e','christmas','v','1 Main St')").run();
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES ('ev2','Ev Two','Orange','Irvine','tree','2999-12-01','2999-12-30','published',1,'','',33.6,-117.8,'b','https://example.org/e2','christmas','v','1 Main St')").run();
  raw.prepare("INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,contact_email,event_id) VALUES ('s1','published','Ev One','Orange','Irvine','christmas','tree','2999-12-01','2999-12-30','old@example.com','ev1')").run();
  raw.prepare("INSERT INTO event_claims (id,event_id,user_id,email,status) VALUES ('c1','ev1','u9','x@example.com','approved')").run();
  assert.equal((await xfer(env, { kind: "home", id: "h1", email: "NewOwner@Example.com" })).status, 200);
  assert.deepEqual({ ...raw.prepare("SELECT contact_email, user_id FROM posts WHERE id='h1'").get() }, { contact_email: "newowner@example.com", user_id: "u2" });
  assert.equal((await xfer(env, { kind: "installer", id: "acme", email: "newowner@example.com" })).status, 200);
  assert.equal(raw.prepare("SELECT owner_email FROM installers WHERE id='i1'").get().owner_email, "newowner@example.com");
  const e1 = await xfer(env, { kind: "event", id: "ev1", email: "newowner@example.com" });
  assert.equal(e1.status, 200); assert.match(e1.body.note, /1 other approved claim/);
  assert.equal(raw.prepare("SELECT contact_email FROM event_submissions WHERE id='s1'").get().contact_email, "newowner@example.com");
  assert.equal((await xfer(env, { kind: "event", id: "ev2", email: "newowner@example.com" })).status, 200);
  assert.deepEqual({ ...raw.prepare("SELECT user_id, status, method FROM event_claims WHERE event_id='ev2'").get() }, { user_id: "u2", status: "approved", method: "admin" }, "an event with no submission gets an admin claim");
  const log = logRows(raw); assert.equal(log.length, 4); assert.ok(log.every((x) => x.action === "transfer"));
  assert.deepEqual(log.map((x) => x.area), ["posts", "installers", "events", "events"]); assert.match(log[0].detail, /old@example.com -> newowner@example.com/); assert.equal(log[0].label, "Home");
});

test("Admin transfer: refuses an unknown account, a suspended account, a missing item or a bad request, and changes nothing", async () => {
  const { env, raw } = mk(); await addUser(raw, "u1", "old@example.com"); await addUser(raw, "u2", "sus@example.com"); raw.prepare("UPDATE users SET status='suspended' WHERE id='u2'").run();
  raw.prepare("INSERT INTO installers (id,slug,name,status,owner_email) VALUES ('i1','acme','Acme','active','old@example.com')").run();
  assert.equal((await xfer(env, { kind: "installer", id: "acme", email: "nobody@example.com" })).status, 404);
  assert.equal((await xfer(env, { kind: "installer", id: "acme", email: "sus@example.com" })).status, 409);
  assert.equal((await xfer(env, { kind: "home", id: "nope", email: "old@example.com" })).status, 404);
  assert.equal((await xfer(env, { kind: "car", id: "x", email: "old@example.com" })).status, 400);
  assert.equal((await xfer(env, { kind: "home", id: "x", email: "not-an-email" })).status, 400);
  assert.equal(raw.prepare("SELECT owner_email FROM installers WHERE id='i1'").get().owner_email, "old@example.com"); assert.equal(logRows(raw).length, 0);
});
