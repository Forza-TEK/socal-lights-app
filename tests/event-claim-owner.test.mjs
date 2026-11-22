// An approved claim makes the person the event's manager: the event joins Your profile > Events (an event_submissions row they can edit), by matching website or by Admin.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as claim } from "../functions/api/me/claims.js";
import { onRequestPost as adminDecide } from "../functions/api/admin/claims/[id].js";
import { onRequestPut as putClip } from "../functions/api/me/events/[id].js";
import { newEnv, addUser } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const MP4 = (n = 64) => { const b = new Uint8Array(n); b.set([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]); for (let i = 12; i < n; i++) b[i] = i % 251; return b; };
const r2 = () => { const store = new Map(); return { store, put: async (k, v) => { store.set(k, new Uint8Array(v)); }, delete: async (k) => { store.delete(k); }, get: async () => null }; };
const mk = () => newEnv({ PHOTOS: r2(), DEV_AUTH: "" });
const seed = (raw, url) => raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES ('grok-harbor','Harbor Glow','Los Angeles','San Pedro','walk','2999-11-20','2999-12-31','confirmed',0,'Price not listed','5pm',33.7,-118.3,'A ticketed holiday light experience',?,'christmas','West Harbor','1332 S Harbor Blvd')").run(url);
const post = (env, user) => claim({ request: new Request(`${ORIGIN}/api/me/claims`, { method: "POST", headers: { cookie: user.cookie, "content-type": "application/json", origin: ORIGIN }, body: JSON.stringify({ event_id: "grok-harbor" }) }), env });
const mine = (raw, email) => raw.prepare("SELECT * FROM event_submissions WHERE event_id = 'grok-harbor' AND lower(contact_email) = ?").get(email);

test("a claim from an email at the event's own website is approved at once and the event joins their profile", async () => {
  const { env, raw } = mk(), u = await addUser(raw, "u1", "info@harborglownights.com"); seed(raw, "https://harborglownights.com/");
  const r = await post(env, u), d = await r.json(); assert.equal(d.status, "approved"); assert.equal(d.manage, true);
  const s = mine(raw, "info@harborglownights.com"); assert.ok(s, "a submission row now links them to the event"); assert.equal(s.status, "published"); assert.equal(s.name, "Harbor Glow"); assert.equal(s.url, "https://harborglownights.com/");
  await post(env, u); assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_submissions WHERE event_id = 'grok-harbor'").get().n, 1, "claiming again adds nothing");
  const put = await putClip({ params: { id: s.id }, request: new Request(`${ORIGIN}/api/me/events/${s.id}`, { method: "PUT", headers: { cookie: u.cookie, "content-type": "video/mp4", origin: ORIGIN }, body: MP4(500) }), env });
  assert.equal(put.status, 200, "they can use the owner tools (here, a video)");
});

test("any other claim waits for Admin and joins the claimant's profile only once approved", async () => {
  const { env, raw } = mk(), u = await addUser(raw, "u2", "marina@gmail.com"); seed(raw, "https://harborglownights.com/");
  const d = await (await post(env, u)).json(); assert.equal(d.status, "pending"); assert.equal(mine(raw, "marina@gmail.com"), undefined, "nothing yet");
  const c = raw.prepare("SELECT id FROM event_claims WHERE event_id = 'grok-harbor'").get();
  const a = await adminDecide({ params: { id: c.id }, request: new Request(`${ORIGIN}/api/admin/claims/${c.id}`, { method: "POST", body: JSON.stringify({ action: "approve" }) }), env });
  assert.equal(a.status, 200); assert.ok(mine(raw, "marina@gmail.com"), "approved: the event is theirs to edit");
  const dec = raw.prepare("INSERT INTO event_claims (id,event_id,user_id,email,status) VALUES ('c2','grok-harbor','x','nobody@x.co','pending')").run();
  await adminDecide({ params: { id: "c2" }, request: new Request(`${ORIGIN}/api/admin/claims/c2`, { method: "POST", body: JSON.stringify({ action: "decline" }) }), env });
  assert.equal(mine(raw, "nobody@x.co"), undefined, "a declined claim gives nothing");
});
