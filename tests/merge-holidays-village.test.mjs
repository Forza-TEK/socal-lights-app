// Migration 0285 merges the organizer's duplicate of Holidays in the Village into the sweep row (right pin), keeping the photos and the owner's link.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newEnv } from "./_pay.mjs";

test("0285: photos and official site move to the sweep row, the submission follows it, the duplicate is gone", () => {
  const { raw } = newEnv(), sql = readFileSync("migrations/0285_merge_holidays_in_the_village_2026-11-22.sql", "utf8");
  const U = "u-holidays-in-the-village--4afd74", S = "thousand-oaks-holidays-in-the-village", photos = JSON.stringify([`e/${U}/1.jpg`, `e/${U}/2.jpg`]);
  raw.prepare("DELETE FROM events WHERE id IN (?, ?)").run(U, S);
  const ins = raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address,owner_photos) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  ins.run(S, "Holidays in the Village: A European Marketplace", "Ventura", "Thousand Oaks", "tree", "2026-12-05", "2026-12-06", "confirmed", 1, "Free", "Sat 11am-8pm", 34.1836, -118.8877, "x", "https://guide.example.org/x", "christmas", "The Oaks lot", "W Wilbur Rd", null);
  ins.run(U, "Holidays in the Village. A European Marketplace.", "Ventura", "Thousand Oaks", "tree", "2026-12-05", "2026-12-06", "confirmed", 1, "Free", "Sat 11-8", 34.18116, -118.87066, "x", "https://holidaysinthevillage.org/", "christmas", "The Oaks", "350 Hillcrest", photos);
  raw.prepare("INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,free,price,hours,lat,lng,blurb,url,venue,address,contact_email,verified,note,event_id) VALUES ('4f64f8e870394fb3','published','n','Ventura','Thousand Oaks','christmas','tree','2026-12-05','2026-12-06',1,'Free','h',34.18116,-118.87066,'b','https://holidaysinthevillage.org/','The Oaks','350 Hillcrest','info@holidaysinthevillage.org',1,'',?)").run(U);
  raw.exec(sql);
  const s = raw.prepare("SELECT * FROM events WHERE id = ?").get(S), sub = raw.prepare("SELECT * FROM event_submissions WHERE id = '4f64f8e870394fb3'").get();
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id = ?").get(U).n, 0, "the duplicate is deleted");
  assert.equal(s.owner_photos, photos); assert.equal(s.url, "https://holidaysinthevillage.org/"); assert.equal(s.lat, 34.1836, "the sweep's pin is untouched");
  assert.equal(sub.event_id, S); assert.equal(sub.address, "350 W Hillcrest Dr"); assert.equal(sub.lat, 34.1836);
  raw.exec(sql); assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id = ?").get(S).n, 1, "running it again changes nothing");
});

test("geocoder: an address with two far-apart matches (350 Hillcrest = 350 E or 350 W) is flagged for Admin, the first match is still used", async () => {
  const { geocodeAddress } = await import("../functions/_lib/util.js");
  const hit = (y, x, a) => ({ coordinates: { y, x }, matchedAddress: a });
  const fake = async () => ({ json: async () => ({ result: { addressMatches: [hit(34.18116, -118.87066, "350 E HILLCREST DR"), hit(34.18431, -118.88535, "350 W HILLCREST DR")] } }) });
  const info = {}, pt = await geocodeAddress("350 Hillcrest", "Thousand Oaks", [34.17, -118.84], 30, fake, info);
  assert.deepEqual(pt, [34.18116, -118.87066]); assert.match(info.ambiguous, /350 E HILLCREST DR or 350 W HILLCREST DR/);
  const one = async () => ({ json: async () => ({ result: { addressMatches: [hit(34.18116, -118.87066, "A"), hit(34.1812, -118.8707, "B")] } }) }), i2 = {};
  await geocodeAddress("350 Hillcrest", "Thousand Oaks", [34.17, -118.84], 30, one, i2); assert.equal(i2.ambiguous, undefined, "two matches a few meters apart are not ambiguous");
});

test("0286: the organizer's clip is attached to the surviving event and still plays, though its key names the deleted event", async () => {
  const { onRequestGet: photo } = await import("../functions/api/photo/[[path]].js");
  const { raw } = newEnv(), sql = readFileSync("migrations/0286_holidays_in_the_village_video_2026-11-22.sql", "utf8");
  const K = "ev/u-holidays-in-the-village--4afd74/1795347712908.mov", S = "thousand-oaks-holidays-in-the-village";
  raw.prepare("DELETE FROM events WHERE id = ?").run(S);
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address) VALUES (?,'HITV','Ventura','Thousand Oaks','tree','2026-12-05','2026-12-06','confirmed',1,'Free','h',34.1836,-118.8877,'x','https://x.example.org/','christmas','v','a')").run(S);
  raw.exec(sql);
  const e = raw.prepare("SELECT video_file, video_ok FROM events WHERE id = ?").get(S); assert.equal(e.video_file, K); assert.equal(e.video_ok, 1);
  const bytes = new Uint8Array(64), PHOTOS = { get: async (k) => (k === K ? { body: bytes, size: 64, httpEtag: '"x"', writeHttpMetadata: (h) => h.set("content-type", "video/quicktime") } : null) };
  const res = await photo({ params: { path: K.split("/") }, env: { DB: { prepare: (q) => ({ bind: (...a) => ({ first: async () => raw.prepare(q).get(...a) }) }) }, PHOTOS }, request: new Request("https://x.test/api/photo/" + K) });
  assert.ok(res.status === 200 || res.status === 206, "plays: " + res.status);
});
