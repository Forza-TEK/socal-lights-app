// Migration 0287: the organizer's duplicate of the Old Town Trolley tour is merged into the sweep row; the organizer's details win.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newEnv } from "./_pay.mjs";

test("0287: the sweep row takes the organizer's details and photo, the submission follows it, the duplicate is gone", () => {
  const { raw } = newEnv(), sql = readFileSync("migrations/0287_merge_old_town_trolley_2026-11-24.sql", "utf8");
  const U = "u-old-town-trolley-s-holid-dd720a", S = "trolley", photos = JSON.stringify([`e/${U}/1.jpg`]);
  raw.prepare("DELETE FROM events WHERE id IN (?, ?)").run(U, S);
  const ins = raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address,image,owner_photos) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  ins.run(S, "Holiday Sights Trolley Tour", "San Diego", "Old Town", "tour", "2026-11-28", "2027-01-03", "confirmed", 0, "Tour fare", "Daily", 32.7536, -117.196, "sweep blurb", "https://www.sandiego.org/x", "christmas", "Old Town Market (Old Town Trolley Tours)", "4010 Twiggs St, San Diego, CA 92110", "https://www.trolleytours.com/a.jpg", null);
  ins.run(U, "Old Town Trolley’s Holiday Sights and Festive Nights Tour", "San Diego", "San Diego", "tour", "2026-11-28", "2027-01-03", "confirmed", 0, "Adults: From $35.", "5:30pm-8:00pm", 32.7537874, -117.1957085, "organizer blurb", "https://www.trolleytours.com/san-diego/christmas-holiday-tour", "christmas", "Old Town Market", "4010 Twiggs Street", null, photos);
  raw.prepare("INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,free,price,hours,lat,lng,blurb,url,venue,address,contact_email,verified,note,event_id) VALUES ('87e325f57ab44c28','published','n','San Diego','San Diego','christmas','tour','2026-11-28','2027-01-03',0,'p','h',32.75,-117.19,'b','u','Old Town Market','4010 Twiggs Street','talpizar@historictours.com',0,'',?)").run(U);
  raw.exec(sql);
  const s = raw.prepare("SELECT * FROM events WHERE id = ?").get(S), sub = raw.prepare("SELECT * FROM event_submissions WHERE id = '87e325f57ab44c28'").get();
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events WHERE id = ?").get(U).n, 0, "the duplicate is deleted");
  assert.equal(s.name, "Old Town Trolley’s Holiday Sights and Festive Nights Tour"); assert.equal(s.city, "San Diego"); assert.equal(s.price, "Adults: From $35."); assert.equal(s.hours, "5:30pm-8:00pm");
  assert.equal(s.blurb, "organizer blurb"); assert.equal(s.url, "https://www.trolleytours.com/san-diego/christmas-holiday-tour"); assert.equal(s.venue, "Old Town Market"); assert.equal(s.lat, 32.7537874);
  assert.equal(s.address, "4010 Twiggs Street, San Diego, CA 92110"); assert.equal(s.owner_photos, photos); assert.equal(s.image, "https://www.trolleytours.com/a.jpg", "the sweep's picture stays as the linked image");
  assert.equal(sub.event_id, S); assert.equal(sub.address, "4010 Twiggs Street, San Diego, CA 92110");
  raw.exec(sql); assert.equal(raw.prepare("SELECT name FROM events WHERE id = ?").get(S).name, s.name, "running it again changes nothing");
});
