// A contest's event card (map) and page (/e/c-<slug>) list the homes entered: the first 12 and the total.
import test from "node:test";
import assert from "node:assert/strict";
import { pickHomes, contestHomes } from "../functions/_lib/contesthomes.js";
import { onRequestGet as eventGet } from "../functions/api/events/[id].js";
import { newEnv } from "./_pay.mjs";

const row = (i, photo) => ({ id: "p" + i, title: "Home " + i, biz: "", address: `${i} Elm Ave, Covina, CA`, city: "Covina", photos: JSON.stringify(photo ? [`p/p${i}/1.jpg`] : []), entry_no: i });

test("pickHomes: photos first, then entry number, 12 at most, with the total", () => {
  const rows = Array.from({ length: 20 }, (_, i) => row(i + 1, i % 2 === 0));
  const r = pickHomes(rows);
  assert.equal(r.total, 20); assert.equal(r.homes.length, 12);
  assert.ok(r.homes.slice(0, 10).every((h) => h.photo), "the 10 homes with photos lead");
  assert.deepEqual(r.homes.slice(0, 3).map((h) => h.no), [1, 3, 5]);
});

test("pickHomes: while voting, homes with photos rotate by day; otherwise the order is stable", () => {
  const rows = [1, 2, 3].map((i) => row(i, true));
  assert.deepEqual(pickHomes(rows, { voting: true, day: 1 }).homes.map((h) => h.no), [2, 3, 1]);
  assert.deepEqual(pickHomes(rows, { voting: false, day: 1 }).homes.map((h) => h.no), [1, 2, 3]);
});

test("the event API returns ch for a live contest's event only, approved homes only", async () => {
  const { env, raw } = newEnv();
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval,one_win,event_id) VALUES ('c1','light-up','u','Light Up','City','Covina','Los Angeles','christmas','live','2026-01-01','2026-12-01','2026-12-20','[\"Best\"]','public','pick','a@b.c','d','auto',0,'c-light-up')").run();
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb) VALUES ('c-light-up','Light Up','Los Angeles','Covina','drive','2026-11-01','2026-12-20','confirmed',1,'Free','',34.1,-118,'b')").run();
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb) VALUES ('x-1','Other','Los Angeles','Covina','drive','2026-11-01','2026-12-20','confirmed',1,'Free','',34.1,-118,'b')").run();
  const ins = raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,contest_id,user_id,entry_no) VALUES (?,?,?,?,'Covina',34.1,-118,'x',?,'','christmas',?,'1 Elm','',?, '',?)");
  ins.run("a", "approved", "A", "The A's", '["p/a/1.jpg"]', "1 Elm Ave, Covina, CA", "c1", 1);
  ins.run("b", "pending", "B", "The B's", "[]", "2 Elm Ave, Covina, CA", "c1", 2);
  ins.run("c", "declined", "C", "The C's", "[]", "3 Elm Ave, Covina, CA", "c1", 3);
  const get = async (id) => (await eventGet({ request: new Request("https://socallights.app/api/events/" + id), env, params: { id }, waitUntil() {} })).json();
  const d = await get("c-light-up");
  assert.equal(d.ch.slug, "light-up"); assert.equal(d.ch.total, 1); assert.deepEqual(d.ch.homes.map((h) => [h.name, h.address, h.photo]), [["The A's", "1 Elm Ave, Covina, CA", "p/a/1.jpg"]]);
  assert.deepEqual([d.ch.homes[0].lat, d.ch.homes[0].lng], [34.1, -118], "each home carries its pin, for directions");
  assert.equal((await get("x-1")).ch, undefined);
  assert.equal(await contestHomes(env, "x-1"), null);
});
