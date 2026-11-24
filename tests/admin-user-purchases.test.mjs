// Admin > Users: what a person bought (homeowner, event organizer, contest organizer), matched by account id or by the email they paid with, with the free passes Admin granted.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as one } from "../functions/api/admin/users/[id].js";
import { onRequestGet as list } from "../functions/api/admin/users/index.js";
import { newEnv, addUser, addEvent } from "./_pay.mjs";

test("a person's purchases: by account and by paying email, with totals; refunded orders are not 'kept'; Admin-granted passes are listed", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "Org@Example.com"); await addUser(raw, "u2", "other@example.com");
  addEvent(raw, "ev1", { name: "Candy Lane" });
  raw.prepare("INSERT INTO posts (id,user_id,status,title,biz,city,season,street,contest_id,lat,lng,descr) VALUES ('h1','u1','approved','Maple Lights','Lee','Pasadena','christmas','1 Maple St',NULL,34.1,-118.1,'lights')").run();
  const ins = raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,status,applied,target,user_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
  ins.run("s1", "ev1", "ev_pin", 2500, "org@example.com", "paid", 1, "event", "u1", "2026-11-20 10:00:00");      // by account id
  ins.run("s2", "h1", "pin", 1000, "org@example.com", "paid", 1, "home", null, "2026-11-21 10:00:00");          // by email only, different case
  ins.run("s3", "ev1", "ev_top", 2500, "org@example.com", "refunded", 1, "event", "u1", "2026-11-19 10:00:00"); // refunded: listed, not counted
  ins.run("s4", "ev1", "ev_pin", 2500, "other@example.com", "paid", 1, "event", "u2", "2026-11-22 10:00:00");   // someone else's
  raw.prepare("INSERT INTO contests (id,slug,name,org,org_key,city,owner_id,status,entries_close,vote_start,vote_end,announced) VALUES ('c1','lights-cup','Lights Cup','Org','org-x','Pasadena','u1','live','2026-12-01','2026-12-02','2026-12-09',0)").run();
  raw.prepare("INSERT INTO contest_comps (id,org_key,allowed,valid_until,note) VALUES ('cc1','org-x',-1,'2027-01-31','founder')").run();
  const d = await (await one({ params: { id: "u1" }, env })).json();
  assert.deepEqual(d.purchases.rows.map((r) => [r.session_id, r.target, r.name]), [["s2", "home", "Maple Lights"], ["s1", "event", "Candy Lane"], ["s3", "event", "Candy Lane"]]);
  assert.equal(d.purchases.paid_cents, 3500, "the refunded order is not counted"); assert.equal(d.purchases.comps.length, 1); assert.equal(d.purchases.comps[0].allowed, -1);
  const l = await (await list({ request: new Request("https://x.test/api/admin/users"), env })).json(), a = l.users.find((x) => x.id === "u1"), o = l.users.find((x) => x.id === "u2");
  assert.equal(a.buys, 3); assert.equal(a.spent, 3500); assert.equal(o.buys, 1); assert.equal(o.spent, 2500);
});
