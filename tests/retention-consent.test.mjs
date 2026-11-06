// Privacy PL-01 tables (home_consents, removal_requests, installers.created_by) in account deletion and the retention purge.
import test from "node:test";
import assert from "node:assert/strict";
import { makeDB } from "./_d1.mjs";
import { deleteAccount } from "../functions/_lib/account.js";
import { deleteContest } from "../functions/_lib/contests.js";
import { pruneRetention } from "../functions/_lib/retention.js";

const rows = (raw, sql, ...a) => JSON.parse(JSON.stringify(raw.prepare(sql).all(...a)));

test("deleting an account keeps the consent evidence but drops its account id and email; closed removal requests and created_by lose the address; an open request stays", async () => {
  const { DB, raw } = makeDB();
  const run = (sql, ...a) => raw.prepare(sql).run(...a);
  run("INSERT INTO users (id,email,name) VALUES ('uA','a@x.com','Alice')");
  run("INSERT INTO home_consents (id,contest_id,user_id,email,n,version,text) VALUES ('hc1','c1','uA','a@x.com',5,'v1','I confirm'), ('hc2','c2','uZ','z@x.com',2,'v1','I confirm')");
  run("INSERT INTO removal_requests (id,ref,address,email,note,status) VALUES ('r1','','1 Main','a@x.com','please','done'), ('r2','','2 Main','A@x.com','n','open'), ('r3','','3 Main','z@x.com','n','done')");
  run("INSERT INTO installers (id,slug,name,created_by) VALUES ('i1','a','A','a@x.com'), ('i2','b','B','z@x.com')");
  await deleteAccount({ DB, PHOTOS: { delete: async () => {} } }, "uA", "a@x.com");
  assert.deepEqual(rows(raw, "SELECT id, user_id, email, n, version, text FROM home_consents ORDER BY id"), [{ id: "hc1", user_id: "", email: "", n: 5, version: "v1", text: "I confirm" }, { id: "hc2", user_id: "uZ", email: "z@x.com", n: 2, version: "v1", text: "I confirm" }]);
  assert.deepEqual(rows(raw, "SELECT id, email, note FROM removal_requests ORDER BY id").map((r) => [r.id, r.email, r.note]), [["r1", "", ""], ["r2", "A@x.com", "n"], ["r3", "z@x.com", "n"]]);
  assert.deepEqual(rows(raw, "SELECT id, created_by FROM installers ORDER BY id").map((r) => r.created_by), ["", "z@x.com"]);
});

test("the purge blanks closed removal requests 6 months after they were handled, never open ones", async () => {
  const { DB, raw } = makeDB();
  raw.prepare("INSERT INTO removal_requests (id,address,email,note,status,created_at,handled_at) VALUES ('old','1 Main','a@x.com','n','done',datetime('now','-300 days'),datetime('now','-200 days')), ('recent','2 Main','b@x.com','n','declined',datetime('now','-300 days'),datetime('now','-10 days')), ('open','3 Main','c@x.com','n','open',datetime('now','-300 days'),NULL)").run();
  await pruneRetention({ DB });
  assert.deepEqual(rows(raw, "SELECT id, address, email FROM removal_requests ORDER BY id").map((r) => [r.id, r.address, r.email]), [["old", "", ""], ["open", "3 Main", "c@x.com"], ["recent", "2 Main", "b@x.com"]]);
});

test("deleting a contest removes its consent records", async () => {
  const { DB, raw } = makeDB();
  raw.prepare("INSERT INTO home_consents (id,contest_id,user_id,email) VALUES ('hc1','c1','u','e@x.com'), ('hc2','c2','u','e@x.com')").run();
  await deleteContest({ DB, PHOTOS: { delete: async () => {} } }, { id: "c1", event_id: null });
  assert.deepEqual(rows(raw, "SELECT id FROM home_consents").map((r) => r.id), ["hc2"]);
});
