// R2 deletes: one delete() call takes up to 1000 keys and counts as one outgoing call (docs/runbooks/cloudflare-limits.md), so 400 photos must not be 400 calls.
import test from "node:test";
import assert from "node:assert/strict";
import { newEnv, addUser, ptToday } from "./_pay.mjs";
import { deleteContest } from "../functions/_lib/contests.js";
import { opsSince } from "../functions/_lib/oplog.js";

const contest = (raw, id, slug) => raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,contact_email,descr,approval) VALUES (?,?,'uO','B','C','Pasadena','LA','christmas','live',?,?,?,'[]','o@x.com','d','manual')").run(id, slug, ptToday(5), ptToday(8), ptToday(20));
const post = (raw, id, cid, photos) => raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,season,address,street,contest_id,user_id) VALUES (?,'approved','b','t','Pasadena',34,-118,'d',?,'christmas','a','a',?,'')").run(id, JSON.stringify(photos), cid);

test("deleting a contest with 400 photos is one R2 delete call, and a failing bucket is logged, not thrown", async () => {
  const { env, raw } = newEnv();
  await addUser(raw, "uO", "owner@city.gov");
  contest(raw, "c1", "big");
  for (let i = 0; i < 200; i++) post(raw, "p" + i, "c1", [`p/${i}/1.jpg`, `p/${i}/2.jpg`]);
  const calls = []; env.PHOTOS = { delete: async (k) => { calls.push(k); } };
  await deleteContest(env, { id: "c1", event_id: null });
  assert.equal(calls.length, 1); assert.equal(calls[0].length, 400);
  assert.equal(raw.prepare("SELECT COUNT(*) n FROM posts WHERE contest_id = 'c1'").get().n, 0);
  contest(raw, "c2", "b2"); post(raw, "q1", "c2", ["p/q/1.jpg"]);
  env.PHOTOS = { delete: async () => { throw new Error("r2 down"); } };
  await deleteContest(env, { id: "c2", event_id: null });
  assert.ok((await opsSince(env, "2000-01-01 00:00:00")).some((g) => g.kind === "r2" && /r2 down/.test(g.example)));
});
