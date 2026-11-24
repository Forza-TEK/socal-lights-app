// Audit F-09: deleting an account removes the events the person added (with their owner photos and clip) and flags a paid pin for refund; an event they only manage through an approved claim
// (or a "this is my event" takeover) stays on the map, unlinked. Homes' clips go too. Nothing reaches Stripe or a mailbox.
import test from "node:test";
import assert from "node:assert/strict";
import { newEnv, addEvent, ptToday } from "./_pay.mjs";
import { deleteAccount } from "../functions/_lib/account.js";
import { grantEventOwnership } from "../functions/_lib/claimgrant.js";

const until = ptToday(30);
const store = () => { const deleted = []; return { deleted, PHOTOS: { delete: async (k) => { deleted.push(...(Array.isArray(k) ? k : [k])); } } }; };
const order = (raw, sid, target, id, status = "paid") => raw.prepare("INSERT INTO feature_orders (session_id,event_id,target,plan,amount,email,status,applied,applied_featured,applied_until) VALUES (?,?,?,?,?,?,?,1,1,?)").run(sid, id, target, "pin", 1500, "buyer@example.com", status, until);
const ord = (raw, sid) => ({ ...raw.prepare("SELECT * FROM feature_orders WHERE session_id = ?").get(sid) });
const sub = (raw, id, eventId, email, status = "published", note = "") => raw.prepare("INSERT INTO event_submissions (id,status,name,city,season,type,start_date,end_date,contact_email,note,event_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(id, status, "N " + id, "Pasadena", "christmas", "walk", ptToday(1), ptToday(5), email, note, eventId);
const user = (raw, id, email) => raw.prepare("INSERT INTO users (id,email,name) VALUES (?,?,?)").run(id, email, "");
const has = (raw, table, id) => !!raw.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id);

test("an event the person added is deleted with its owner photos and clip, and its paid pin is flagged refund due", async () => {
  const { env, raw } = newEnv(); const { deleted, PHOTOS } = store();
  user(raw, "uA", "a@x.com"); user(raw, "uB", "b@x.com");
  addEvent(raw, "u-mine-abc123"); addEvent(raw, "u-other-def456");
  raw.prepare("UPDATE events SET owner_photos = ?, video_file = ? WHERE id = 'u-mine-abc123'").run(JSON.stringify(["e/u-mine-abc123/1700000000001.jpg", "e/u-mine-abc123/1700000000002.png"]), "ev/u-mine-abc123/1700000000003.mp4");
  raw.prepare("UPDATE events SET owner_photos = ? WHERE id = 'u-other-def456'").run(JSON.stringify(["e/u-other-def456/1700000000009.jpg"]));
  sub(raw, "s1", "u-mine-abc123", "A@X.com"); sub(raw, "s2", "u-other-def456", "b@x.com");
  order(raw, "paidpin", "event", "u-mine-abc123"); order(raw, "otherpin", "event", "u-other-def456");
  order(raw, "waiting", "event", "sub:s3"); sub(raw, "s3", null, "a@x.com", "pending");
  await deleteAccount({ ...env, PHOTOS }, "uA", "a@x.com");
  assert.equal(has(raw, "events", "u-mine-abc123"), false); assert.equal(has(raw, "event_submissions", "s1"), false); assert.equal(has(raw, "event_submissions", "s3"), false, "a pending submission goes too");
  assert.deepEqual(deleted.sort(), ["e/u-mine-abc123/1700000000001.jpg", "e/u-mine-abc123/1700000000002.png", "ev/u-mine-abc123/1700000000003.mp4"]);
  for (const s of ["paidpin", "waiting"]) { assert.equal(ord(raw, s).status, "refund_due"); assert.match(ord(raw, s).note, /^\[auto\] /); }
  assert.equal(has(raw, "events", "u-other-def456"), true, "someone else's event is untouched"); assert.equal(ord(raw, "otherpin").status, "paid");
  assert.equal(has(raw, "users", "uA"), false);
});

test("an event managed only through an approved claim or a takeover stays on the map, unlinked, and its order is left alone", async () => {
  const { env, raw } = newEnv(); const { deleted, PHOTOS } = store();
  user(raw, "uA", "a@x.com");
  addEvent(raw, "sweep-1"); addEvent(raw, "u-old-111111"); addEvent(raw, "grok-9");
  raw.prepare("UPDATE events SET owner_photos = ?, video_file = ? WHERE id = 'sweep-1'").run(JSON.stringify(["e/sweep-1/1700000000001.jpg"]), "ev/sweep-1/1700000000002.mp4");
  raw.prepare("INSERT INTO event_claims (id,event_id,user_id,email,method,status) VALUES ('c1','sweep-1','uA','a@x.com','admin','approved')").run();
  await grantEventOwnership(env, "sweep-1", "a@x.com"); // the real claim-approval path
  sub(raw, "t1", "u-old-111111", "a@x.com", "published", "updated the existing listing u-old-111111 instead of adding a new one (it was: x)"); // takeover
  sub(raw, "g1", "grok-9", "a@x.com"); // an event id the add form never makes
  order(raw, "claimedpin", "event", "sweep-1");
  await deleteAccount({ ...env, PHOTOS }, "uA", "a@x.com");
  for (const e of ["sweep-1", "u-old-111111", "grok-9"]) assert.equal(has(raw, "events", e), true, e + " stays on the map");
  assert.deepEqual(deleted, [], "no owner photo or clip of an event that stays is deleted");
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_submissions WHERE contact_email != ''").get().n, 0, "no submission still names the person");
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_submissions WHERE event_id IN ('sweep-1','u-old-111111','grok-9')").get().n, 3);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM event_claims WHERE user_id = 'uA'").get().n, 0);
  assert.equal(ord(raw, "claimedpin").status, "paid");
});

test("an added event another person also manages (approved claim or second submission) is kept; only this person's link goes", async () => {
  const { env, raw } = newEnv(); const { deleted, PHOTOS } = store();
  user(raw, "uA", "a@x.com"); user(raw, "uC", "c@x.com");
  addEvent(raw, "u-shared-1"); addEvent(raw, "u-shared-2");
  sub(raw, "a1", "u-shared-1", "a@x.com"); sub(raw, "c1", "u-shared-1", "c@x.com", "published", "claimed by the organizer (claim approved)");
  sub(raw, "a2", "u-shared-2", "a@x.com"); raw.prepare("INSERT INTO event_claims (id,event_id,user_id,email,method,status) VALUES ('k','u-shared-2','uC','c@x.com','admin','approved')").run();
  await deleteAccount({ ...env, PHOTOS }, "uA", "a@x.com");
  assert.equal(has(raw, "events", "u-shared-1"), true); assert.equal(has(raw, "events", "u-shared-2"), true);
  assert.equal(raw.prepare("SELECT contact_email AS e FROM event_submissions WHERE id = 'c1'").get().e, "c@x.com");
  assert.equal(raw.prepare("SELECT contact_email AS e FROM event_submissions WHERE id = 'a1'").get().e, "");
  assert.deepEqual(deleted, []);
});

test("a blank account email never matches the blank contact emails already on other submissions", async () => {
  const { env, raw } = newEnv(); const { PHOTOS } = store();
  user(raw, "uZ", "z@x.com"); addEvent(raw, "u-blank-1"); sub(raw, "b1", "u-blank-1", "");
  await deleteAccount({ ...env, PHOTOS }, "uZ", "");
  assert.equal(has(raw, "events", "u-blank-1"), true);
});

test("a home's video clip, hidden photos and photos are deleted with the account; the delete uses one batch for the rows", async () => {
  const { env, raw } = newEnv(); const { deleted, PHOTOS } = store();
  user(raw, "uA", "a@x.com");
  raw.prepare("INSERT INTO posts (id,biz,title,city,lat,lng,descr,user_id,contact_email,status,photos,photos_hidden,video_file) VALUES ('abcdefgh1','b','My Home','Pasadena',1,2,'d','uA','a@x.com','approved',?,?,?)")
    .run(JSON.stringify(["p/abcdefgh1/1.jpg"]), JSON.stringify(["2.jpg"]), "v/abcdefgh1/1700000000004.mp4");
  await deleteAccount({ ...env, PHOTOS }, "uA", "a@x.com");
  assert.deepEqual(deleted.sort(), ["h/abcdefgh1/2.jpg", "p/abcdefgh1/1.jpg", "v/abcdefgh1/1700000000004.mp4"]);
  assert.equal(has(raw, "posts", "abcdefgh1"), false);
});
