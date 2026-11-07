// Privacy audit PL-04: account deletion also clears admin_log labels and co-organizer emails in contest_changes, and a scheduled purge expires
// unconfirmed signups, declined submissions' emails, report text and person labels in the admin log.
import test from "node:test";
import assert from "node:assert/strict";
import { makeDB } from "./_d1.mjs";
import { deleteAccount } from "../functions/_lib/account.js";
import { pruneRetention, retentionStatements } from "../functions/_lib/retention.js";
import { record } from "../functions/_lib/adminlog.js";

const rows = (raw, sql, ...a) => JSON.parse(JSON.stringify(raw.prepare(sql).all(...a)));
const old = "datetime('now','-400 days')", recent = "datetime('now','-5 days')";

test("account deletion blanks the person's email in admin_log labels and co-organizer log lines, and the co-organizers' emails of contests they ran", async () => {
  const { DB, raw } = makeDB();
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('uA','a@x.com','Alice'), ('uB','b@x.com','Bob')").run();
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,entries_close,vote_start,vote_end,status) VALUES ('cA','cA','uA','A','Org','Pasadena','2026-12-01','2026-12-02','2026-12-20','live'), ('cB','cB','uB','B','Org','Pasadena','2026-12-01','2026-12-02','2026-12-20','live')").run();
  raw.prepare("INSERT INTO admin_log (admin,area,action,target_id,label) VALUES ('rey@x.com','users','suspend','uA','A@x.com'), ('rey@x.com','users','suspend','uB','b@x.com'), ('rey@x.com','posts','edit','p1','Tree house')").run();
  const cc = (id, c, field, o, n) => raw.prepare("INSERT INTO contest_changes (id,contest_id,by_email,by_name,field,old,new) VALUES (?,?,?,?,?,?,?)").run(id, c, "b@x.com", "Bob", field, o, n);
  cc("1", "cB", "Co-organizers", "", "Added a@x.com");            // the deleted person was added to someone else's contest
  cc("2", "cB", "Co-organizers", "A@X.com", "Removed");            // and removed (old holds the address)
  cc("3", "cB", "Co-organizers", "", "Added other@x.com");        // another person: stays
  cc("4", "cA", "Co-organizers", "", "Added helper@x.com");       // a co-organizer of a contest the deleted person ran: goes
  cc("5", "cB", "Name", "Old name", "New name");                  // unrelated
  await deleteAccount({ DB, PHOTOS: { delete: async () => {} } }, "uA", "a@x.com");
  const log = rows(raw, "SELECT target_id, label FROM admin_log ORDER BY id");
  assert.equal(log[0].label, ""); assert.equal(log[1].label, "b@x.com"); assert.equal(log[2].label, "Tree house");
  const ch = Object.fromEntries(rows(raw, "SELECT id, old, new FROM contest_changes").map((r) => [r.id, r]));
  assert.equal(ch["1"].new, "a co-organizer"); assert.equal(ch["2"].old, "");
  assert.equal(ch["3"].new, "Added other@x.com");
  assert.deepEqual([ch["4"].old, ch["4"].new], ["", ""]);
  assert.deepEqual([ch["5"].old, ch["5"].new], ["Old name", "New name"]);
  for (const r of rows(raw, "SELECT old, new FROM contest_changes WHERE id IN ('1','2','4')")) assert.ok(!/a@x\.com|helper@x\.com/i.test(r.old + r.new));
});

test("an admin deleting an account leaves no email label in the log (the entry the middleware writes after the delete)", async () => {
  const { DB, raw } = makeDB();
  await record({ DB }, { admin: "rey@x.com", area: "users", action: "delete", id: "uA", label: "a@x.com" });
  await record({ DB }, { admin: "rey@x.com", area: "users", action: "suspend", id: "uB", label: "b@x.com" });
  const r = rows(raw, "SELECT action, label FROM admin_log ORDER BY id");
  assert.equal(r[0].label, ""); assert.equal(r[1].label, "b@x.com");
});

test("the scheduled purge: unconfirmed signups after 30 days, 12-month limit for declined submissions, reports, person labels and co-organizer log lines; recent and other rows stay", async () => {
  const { DB, raw } = makeDB();
  const run = (sql, ...a) => raw.prepare(sql).run(...a);
  const sub = (id, email, confirmed, when) => run(`INSERT INTO alert_subs (id,email,city,lat,lng,token,confirmed,created_at) VALUES (?,?,'Pasadena',1,2,?,?,${when})`, id, email, "t" + id, confirmed);
  sub("oldU", "ou@x.com", 0, "datetime('now','-31 days')"); sub("newU", "nu@x.com", 0, recent); sub("oldC", "oc@x.com", 1, old);
  const es = (id, status, when) => run(`INSERT INTO event_submissions (id,name,city,season,type,start_date,end_date,contact_email,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,${when})`, id, "N", "Pasadena", "christmas", "walk", "2025-12-01", "2025-12-20", id + "@x.com", status);
  es("dOld", "declined", old); es("dNew", "declined", recent); es("pOld", "published", old);
  const rp = (id, when) => run(`INSERT INTO reports (id,ref,name,message,contact,created_at) VALUES (?,?,?,?,?,${when})`, id, "e1", "Pat", "it is wrong", "pat@x.com");
  rp("rOld", old); rp("rNew", recent);
  const al = (id, area, label, when) => run(`INSERT INTO admin_log (admin,area,action,target_id,label,at) VALUES ('rey@x.com',?,'x',?,?,${when})`, area, id, label);
  al("1", "users", "old@x.com", old); al("2", "users", "new@x.com", recent); al("3", "posts", "Old title", old); al("4", "reports", "Pat", old);
  const cc = (id, field, when) => run(`INSERT INTO contest_changes (id,contest_id,by_email,field,old,new,at) VALUES (?,?,?,?,?,?,${when})`, id, "c", "b@x.com", field, "x@x.com", "Added y@x.com");
  cc("co-old", "Co-organizers", old); cc("co-new", "Co-organizers", recent); cc("other-old", "Name", old);
  await pruneRetention({ DB });
  assert.deepEqual(rows(raw, "SELECT id FROM alert_subs ORDER BY id").map((r) => r.id), ["newU", "oldC"]);
  assert.deepEqual(rows(raw, "SELECT id, contact_email FROM event_submissions ORDER BY id").map((r) => [r.id, r.contact_email]), [["dNew", "dNew@x.com"], ["dOld", ""], ["pOld", "pOld@x.com"]]);
  const rep = Object.fromEntries(rows(raw, "SELECT id, name, message, contact FROM reports").map((r) => [r.id, r]));
  assert.deepEqual([rep.rOld.name, rep.rOld.message, rep.rOld.contact], ["", "", ""]); assert.equal(rep.rNew.contact, "pat@x.com");
  assert.deepEqual(rows(raw, "SELECT target_id, label FROM admin_log ORDER BY target_id").map((r) => r.label), ["", "new@x.com", "Old title", ""]);
  const c = Object.fromEntries(rows(raw, "SELECT id, old, new FROM contest_changes").map((r) => [r.id, r]));
  assert.deepEqual([c["co-old"].old, c["co-old"].new], ["", ""]); assert.equal(c["co-new"].new, "Added y@x.com"); assert.equal(c["other-old"].old, "x@x.com");
  assert.equal(retentionStatements({ DB }).length, 8); // the last two purge newsletter opt-ins (12 months after unsubscribing) and outreach result hashes (24 months), tested in outreach.test.mjs
});

test("the digest runs the purge (scheduled backstop) and a failing purge never breaks it", async () => {
  const src = (await import("node:fs")).readFileSync("functions/api/admin-digest.js", "utf8");
  assert.match(src, /await pruneRetention\(env\)/);
  await pruneRetention({ DB: { prepare() { throw new Error("boom"); } } }); // best effort: no throw
});
