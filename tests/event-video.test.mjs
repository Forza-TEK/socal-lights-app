// An event's video (YouTube or Vimeo link): parsing, saving by the owner and by Admin, what the list and the detail return.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseVideo } from "../public/video.js";
import { makeDB } from "./_d1.mjs";
import { ptToday } from "./_pay.mjs";
import { onRequest as asRoute } from "../functions/api/admin/as/[[path]].js";
import { onRequestPost as adminSave } from "../functions/api/admin/events/index.js";
import { onRequestGet as detail } from "../functions/api/events/[id].js";
import { rowToEvent, rowToListEvent } from "../functions/_lib/util.js";

test("parseVideo: YouTube and Vimeo links in every usual shape become one clean form; anything else is null", () => {
  const yt = "dQw4w9WgXcQ";
  for (const u of [`https://www.youtube.com/watch?v=${yt}`, `https://youtube.com/watch?v=${yt}&t=10s`, `https://youtu.be/${yt}?si=abc`, `https://www.youtube.com/embed/${yt}`, `https://www.youtube-nocookie.com/embed/${yt}?rel=0`, `https://m.youtube.com/watch?v=${yt}`, `https://www.youtube.com/shorts/${yt}`, ` https://www.youtube.com/live/${yt} `]) {
    const v = parseVideo(u); assert.equal(v && v.id, yt, u); assert.equal(v.watch, `https://www.youtube.com/watch?v=${yt}`); assert.match(v.embed, /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
  }
  for (const u of ["https://vimeo.com/123456789", "https://vimeo.com/channels/staffpicks/123456789", "https://player.vimeo.com/video/123456789?h=abc"]) { const v = parseVideo(u); assert.equal(v && v.id, "123456789", u); assert.equal(v.watch, "https://vimeo.com/123456789"); assert.match(v.embed, /^https:\/\/player\.vimeo\.com\/video\/123456789/); }
  for (const u of ["", "nope", "javascript:alert(1)", "https://example.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/watch?v=short", "https://www.youtube.com/@channel", "https://evil.com/?u=https://youtu.be/dQw4w9WgXcQ", "https://vimeo.com/about", "ftp://youtu.be/dQw4w9WgXcQ"]) assert.equal(parseVideo(u), null, u);
});

test("the list leaves the video out; the detail and the full row carry it as `vid`", () => {
  const row = { id: "e1", name: "Fest", county: "Orange", city: "X", type: "show", start_date: "2026-12-01", end_date: "2026-12-02", status: "confirmed", free: 1, lat: 33, lng: -117, video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" };
  assert.equal(rowToEvent(row).vid, row.video); assert.equal("vid" in rowToListEvent(row), false);
  assert.equal("vid" in rowToEvent({ ...row, video: "" }), false, "no empty field when there is no video");
});

test("Admin saves a video on an event, rejects a non-video link, and an empty value removes it; the detail endpoint returns it", async () => {
  const { DB, raw } = makeDB(), env = { DB };
  const body = (o) => ({ id: "t-vid", name: "Holidays in the Pines", county: "San Bernardino", city: "Crestline", type: "show", start: ptToday(5), end: ptToday(6), status: "confirmed", free: true, price: "Free", hours: "", lat: 34.24, lng: -117.29, blurb: "Tree lighting and more.", url: "https://example.org/x", season: "christmas", venue: "", address: "", ...o });
  const save = (o) => adminSave({ request: new Request("https://x.test/api/admin/events", { method: "POST", body: JSON.stringify(body(o)) }), env, data: { admin: { email: "rey@forza-tek.com" } } });
  assert.equal((await save({ video: "https://youtu.be/dQw4w9WgXcQ?si=zz" })).status, 200);
  assert.equal(raw.prepare("SELECT video FROM events WHERE id='t-vid'").get().video, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const d = await (await detail({ request: new Request("https://x.test/api/events/t-vid"), env, params: { id: "t-vid" }, waitUntil() {} })).json(); assert.equal(d.vid, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal((await save({ video: "https://example.com/video.mp4" })).status, 400);
  assert.equal(raw.prepare("SELECT video FROM events WHERE id='t-vid'").get().video, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "a rejected save changes nothing");
  assert.equal((await save({})).status, 200); assert.ok(raw.prepare("SELECT video FROM events WHERE id='t-vid'").get().video, "a save that does not mention the video leaves it alone");
  assert.equal((await save({ video: "" })).status, 200); assert.equal(raw.prepare("SELECT video FROM events WHERE id='t-vid'").get().video, "");
});

test("the owner's edit saves a video (also through Admin 'edit as owner') and rejects a bad link", async () => {
  const { DB, raw } = makeDB(), env = { DB, ADMIN_AS_SECRET: "a-long-random-test-secret-value" };
  const { addUser } = await import("./_pay.mjs"); await addUser(raw, "u1", "me@example.com");
  raw.prepare("INSERT INTO events (id,name,city,county,type,start_date,end_date,status,lat,lng) VALUES ('u-oak-1','Oak Hill Tree Lighting','Pasadena','Los Angeles','tree',?,?,'confirmed',34.1,-118.1)").run(ptToday(10), ptToday(11));
  raw.prepare("INSERT INTO event_submissions (id,name,city,county,season,type,start_date,end_date,contact_email,status,event_id,blurb,venue,lat,lng,address,hours,price,free) VALUES ('s1','Oak Hill Tree Lighting','Pasadena','Los Angeles','christmas','tree',?,?,'me@example.com','published','u-oak-1','Bring the family and sing carols around the big tree.','Oak Park',34.1,-118.1,'1 Oak St, Pasadena','6pm','Free',1)").run(ptToday(10), ptToday(11));
  const post = (b) => asRoute({ env, data: { admin: { email: "rey@forza-tek.com" } }, params: { path: "me/events/s1".split("/") }, request: new Request("https://socallights.app/api/admin/as/me/events/s1", { method: "POST", headers: { origin: "https://socallights.app", "content-type": "application/json" }, body: JSON.stringify({ action: "edit", ...b }) }) });
  const ok = await post({ video: "https://vimeo.com/123456789" }); assert.equal(ok.status, 200, await ok.clone().text());
  assert.equal(raw.prepare("SELECT video FROM events WHERE id='u-oak-1'").get().video, "https://vimeo.com/123456789");
  assert.equal((await post({ video: "https://example.com/clip" })).status, 400);
  assert.equal(raw.prepare("SELECT video FROM events WHERE id='u-oak-1'").get().video, "https://vimeo.com/123456789");
  assert.equal((await post({ blurb: "Bring the family and sing carols around the big tree, again." })).status, 200); assert.ok(raw.prepare("SELECT video FROM events WHERE id='u-oak-1'").get().video, "an edit that does not send the video keeps it");
  assert.equal((await post({ video: "" })).status, 200); assert.equal(raw.prepare("SELECT video FROM events WHERE id='u-oak-1'").get().video, "");
});

test("the card shows a button, loads no player until it is tapped, and the edit forms have the field", () => {
  const app = readFileSync("public/app.js", "utf8"), forms = readFileSync("public/forms.js", "utf8"), adm = readFileSync("public/admin/admin.js", "utf8");
  assert.match(app, /data-vid="\$\{esc\(v\.embed\)\}"/); assert.match(app, /f\.src = b\.dataset\.vid/); assert.doesNotMatch(app, /<iframe/);
  assert.match(app, /const HEAVY = \["b", "u", "vid"\]/); assert.match(app, /swap\("#dvideo", videoBlock\(ev\)\)/);
  assert.match(forms, /inp\("video", e\.video/); assert.match(adm, /id="eV"/); assert.match(adm, /video: \$\("#eV"\)\.value/);
});

test("the owner's event form puts the video field with the photos (and still shows it when photos are not available yet)", () => {
  // forms.js imports browser-only modules by absolute URL, so this reads its source instead of running it
  const src = readFileSync("public/forms.js", "utf8"), form = src.slice(src.indexOf("export function eventForm"), src.indexOf("// When the season changes"));
  assert.equal((form.match(/inp\("video"/g) || []).length, 1, "one video input, built once as videoField");
  assert.match(form, /const videoField = ff\("Video link \(optional\)", inp\("video", e\.video, 'maxlength="300" type="url" placeholder="Paste a YouTube or Vimeo link"'\), \{ c: "c6" \}\);/);
  assert.match(form, /livePhotos \? fsec\("Photos and video",[\s\S]*?data-pbox>\$\{photoBoxHtml\(e, e\.photos \|\| \[\], \{ max: 4, live: true, noun: "event" \}\)\}<\/div>` \+ videoField\) : fsec\("Video",[^\n]*videoField\)\}/, "with the photos when they are available, in its own section otherwise");
  const details = form.slice(form.indexOf('fsec("Details"')); assert.ok(!details.includes("video"), "nothing about video under Details");
  const at = (t) => form.indexOf(t); assert.ok(at('fsec("Event"') < at('fsec("Photos and video"') && at('fsec("Photos and video"') < at('fsec("Where"'), "right after the event name and type, before the address");
});
