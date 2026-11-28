// /h/<post id>: one public page per approved home. Shows only what the public map card shows; 404 for everything not approved; sitemap lists showcase homes only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestGet as homePage } from "../functions/h/[id].js";
import { onRequestGet as sitemap } from "../functions/sitemap.xml.js";
import { onRequestGet as postsApi } from "../functions/api/posts.js";
import { newEnv, addEvent } from "./_pay.mjs";

const get = (env, id, url) => homePage({ request: new Request(url || "https://x.test/h/" + id), env, params: { id }, waitUntil() {} });
const ins = (raw, id, o = {}) => {
  const r = { status: "approved", biz: "Ann Lee", title: "Maple Street Lights", city: "Pasadena", county: "Los Angeles", lat: 34.1234, lng: -118.5678, descr: "A walk-through display with 20,000 lights.", photos: JSON.stringify([`p/${id}/1.jpg`, `p/${id}/2.jpg`]), contact_email: "ann.secret@example.com", address: "12 Maple St", street: "12 Maple St", zip: "91101", address_consent_at: "2026-11-01 10:00:00", approved_at: "2026-11-10 09:00:00", lights_on: "5-10pm", visit: "walk", parking: "street", radio: "88.5 FM", where_txt: "Corner of Maple and 2nd", web: "https://maple.example.org", phone: "", photos_hidden: JSON.stringify(["777.jpg"]), review_note: "INTERNAL-NOTE", photo_token: "TOKENSECRET" + id, ...o };
  raw.prepare(`INSERT INTO posts (id,status,biz,title,city,county,lat,lng,descr,photos,contact_email,address,street,zip,address_consent_at,approved_at,lights_on,visit,parking,radio,where_txt,web,phone,photos_hidden,review_note,photo_token,contest_id,video,video_file,video_ok) VALUES (@id,@status,@biz,@title,@city,@county,@lat,@lng,@descr,@photos,@contact_email,@address,@street,@zip,@address_consent_at,@approved_at,@lights_on,@visit,@parking,@radio,@where_txt,@web,@phone,@photos_hidden,@review_note,@photo_token,@contest_id,@video,@video_file,@video_ok)`)
    .run({ id, contest_id: null, video: "", video_file: "", video_ok: 0, ...r });
};
const seed = () => {
  const { env, raw } = newEnv();
  ins(raw, "approvedaaaa"); ins(raw, "pendingaaaa", { status: "pending" }); ins(raw, "declinedaaa", { status: "declined" }); ins(raw, "pausedaaaaa", { status: "paused" });
  ins(raw, "entryaaaaaa", { contest_id: "c1", title: "Entry House" });
  ins(raw, "legacyaaaaa", { address_consent_at: null, title: "Legacy House" });
  ins(raw, "noaddraaaaa", { address: "", street: "", title: "Quiet House", address_consent_at: null, photos: "[]" });
  return { env, raw };
};

test("approved home: title, city, photos, preview tags, canonical, map and share buttons", async () => {
  const { env } = seed(), res = await get(env, "approvedaaaa"), h = await res.text();
  assert.equal(res.status, 200);
  assert.match(h, /<title>Maple Street Lights - holiday lights in Pasadena \| SoCal Lights<\/title>/);
  assert.match(h, /<h1>Maple Street Lights<\/h1>/); assert.match(h, /Pasadena, Los Angeles County/);
  assert.match(h, /rel="canonical" href="https:\/\/x\.test\/h\/approvedaaaa"/); assert.match(h, /property="og:url" content="https:\/\/x\.test\/h\/approvedaaaa"/);
  assert.match(h, /og:image" content="https:\/\/x\.test\/cdn-cgi\/image\/width=1200,height=630,fit=cover,quality=70,format=jpeg\/https:\/\/x\.test\/api\/photo\/p\/approvedaaaa\/1\.jpg"/);
  assert.match(h, /twitter:card/); assert.match(h, /class="count">1 \/ 2</); assert.match(h, /href="\/#h-approvedaaaa"/); assert.match(h, /data-share/);
  assert.match(h, /<nav class="crumbs"/); assert.match(h, /href="\/in\/pasadena"/);
  assert.doesNotMatch(h, /name="robots"/, "a showcase home with an address statement is indexable");
});

test("the page shows the map card's fields: address, lights on, visit, radio, see it, web", async () => {
  const h = await (await get(seed().env, "approvedaaaa")).text();
  for (const t of ["12 Maple St", "5-10pm", "Walk by", "Street parking", "88.5 FM", "Corner of Maple and 2nd", "maple.example.org", "Ann Lee"]) assert.ok(h.includes(t), t);
  assert.match(h, /destination=12%20Maple%20St%2C%20Pasadena/);
});

test("404 (the event 404 page, noindex) for pending, declined, paused, unknown and malformed ids", async () => {
  const { env } = seed();
  for (const id of ["pendingaaaa", "declinedaaa", "pausedaaaaa", "nope", "a.b", "x".repeat(60)]) {
    const r = await get(env, id), h = await r.text();
    assert.equal(r.status, 404, id); assert.match(h, /noindex,follow/); assert.match(h, /We can't find that home/); assert.doesNotMatch(h, /Maple Street/);
  }
});

test("a removed home (row deleted) and an unpublished one stop rendering", async () => {
  const { env, raw } = seed();
  assert.equal((await get(env, "approvedaaaa")).status, 200);
  raw.prepare("UPDATE posts SET status='paused' WHERE id='approvedaaaa'").run(); assert.equal((await get(env, "approvedaaaa")).status, 404);
  raw.prepare("DELETE FROM posts WHERE id='approvedaaaa'").run(); assert.equal((await get(env, "approvedaaaa")).status, 404);
});

test("privacy: nothing the map API does not expose reaches the page (hidden photos, email, tokens, notes, coordinates)", async () => {
  const { env } = seed();
  const apiRow = (await (await postsApi({ env })).json()).find((p) => p.id === "approvedaaaa");
  assert.ok(apiRow && !("photos_hidden" in apiRow) && !("contact_email" in apiRow));
  for (const id of ["approvedaaaa", "entryaaaaaa", "legacyaaaaa", "noaddraaaaa"]) {
    const h = await (await get(env, id)).text();
    for (const secret of ["ann.secret", "777.jpg", "photos_hidden", "INTERNAL-NOTE", "TOKENSECRET", "34.1234", "-118.5678", "/h/" + id + "/777", "p/" + id + "/777"]) assert.ok(!h.includes(secret), id + " leaks " + secret);
    assert.doesNotMatch(h, /api\/photo\/h\//, "a hidden-photo address is never printed");
  }
});

test("a hidden photo key that sits in the visible list is still never shown", async () => {
  const { env, raw } = seed();
  raw.prepare("UPDATE posts SET photos = ? WHERE id='approvedaaaa'").run(JSON.stringify(["h/approvedaaaa/777.jpg", "p/approvedaaaa/1.jpg", "../evil.jpg"]));
  const h = await (await get(env, "approvedaaaa")).text();
  assert.doesNotMatch(h, /777\.jpg|evil/); assert.match(h, /p\/approvedaaaa\/1\.jpg/); assert.doesNotMatch(h, /class="count"/);
});

test("contest entries render but are noindex; legacy homes with an address and no statement are noindex; a home with no address shows none and stays indexable", async () => {
  const { env } = seed();
  const entry = await (await get(env, "entryaaaaaa")).text();
  assert.match(entry, /name="robots" content="noindex,follow"/); assert.match(entry, /Entry House/);
  assert.match(await (await get(env, "legacyaaaaa")).text(), /noindex,follow/);
  const quiet = await (await get(env, "noaddraaaaa")).text();
  assert.doesNotMatch(quiet, /name="robots"/); assert.doesNotMatch(quiet, /<dt>Address<\/dt>/); assert.doesNotMatch(quiet, /maps\/dir/, "no Directions without an address (no coordinates are printed)");
});

test("no photos: letter tile like events", async () => {
  const h = await (await get(seed().env, "noaddraaaaa")).text();
  assert.match(h, /<div class="logo" aria-hidden="true">Q<\/div>/); assert.match(h, /og:image" content="https:\/\/x\.test\/img\/share\.png"/);
});

test("video comes first: a link plays on tap, an approved clip shows, a waiting clip does not", async () => {
  const { env, raw } = seed();
  raw.prepare("UPDATE posts SET video='https://www.youtube.com/watch?v=dQw4w9WgXcQ' WHERE id='approvedaaaa'").run();
  let h = await (await get(env, "approvedaaaa")).text();
  assert.match(h, /class="count">1 \/ 3</); assert.ok(h.indexOf('class="vplay"') < h.indexOf('<div class="s"><img'), "the video slide is first"); assert.doesNotMatch(h, /<iframe/);
  raw.prepare("UPDATE posts SET video='', video_file='v/approvedaaaa/1.mp4', video_ok=0 WHERE id='approvedaaaa'").run();
  assert.doesNotMatch(await (await get(env, "approvedaaaa")).text(), /<video/);
  raw.prepare("UPDATE posts SET video_ok=1 WHERE id='approvedaaaa'").run();
  assert.match(await (await get(env, "approvedaaaa")).text(), /<video[^>]+src="\/api\/photo\/v\/approvedaaaa\/1\.mp4"/);
});

test("more lights near you: same-city approved showcase homes and events, never pending homes or contest entries", async () => {
  const { env, raw } = seed();
  ins(raw, "othersaaaaa", { title: "Other Lights" }); addEvent(raw, "ev1", { name: "Pasadena Parade", city: "Nowhereville" }); raw.prepare("UPDATE posts SET city='Nowhereville' WHERE id IN ('approvedaaaa','othersaaaaa')").run();
  const h = await (await get(env, "approvedaaaa")).text();
  assert.match(h, /More lights near you/); assert.match(h, /href="\/h\/othersaaaaa"/); assert.match(h, /href="\/e\/ev1"/);
  assert.doesNotMatch(h, /href="\/h\/pendingaaaa"|href="\/h\/entryaaaaaa"|href="\/h\/approvedaaaa"/);
});

test("installer attribution (as on the map card)", async () => {
  const { env, raw } = seed();
  raw.prepare("INSERT INTO installers (id,slug,name,status) VALUES ('i1','bright-co','Bright Co','active')").run();
  raw.prepare("UPDATE posts SET installer_id='i1', installer_confirmed=1 WHERE id='approvedaaaa'").run();
  const h = await (await get(env, "approvedaaaa")).text();
  assert.match(h, /Installed by <a href="\/installer\/bright-co">Bright Co<\/a>/);
});

test("trailing slash redirects to the one address; text is escaped", async () => {
  const { env, raw } = seed();
  const r = await get(env, "approvedaaaa", "https://x.test/h/approvedaaaa/?utm=1"); assert.equal(r.status, 301); assert.equal(r.headers.get("location"), "/h/approvedaaaa?utm=1");
  raw.prepare("UPDATE posts SET title='<script>alert(1)</script> & \"q\"' WHERE id='approvedaaaa'").run();
  const h = await (await get(env, "approvedaaaa")).text();
  assert.doesNotMatch(h, /<script>alert/); assert.match(h, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("sitemap lists indexable showcase homes with the approved date, never contest entries, legacy-address, pending or hidden-by-sweep homes", async () => {
  const { env, raw } = seed();
  ins(raw, "sweptaaaaaa", { title: "Swept", street: "99 Oak Ave", address: "99 Oak Ave" });
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,lat,lng,url,address,keep_listed) VALUES ('sw','Oak house','Los Angeles','Pasadena','walk','2026-12-01','2027-01-01',34,-118,'','99 Oak Ave, Pasadena',2)").run();
  const xml = await (await sitemap({ request: new Request("https://x.test/sitemap.xml"), env })).text();
  assert.match(xml, /<loc>https:\/\/x\.test\/h\/approvedaaaa<\/loc><lastmod>2026-11-10<\/lastmod>/); assert.match(xml, /\/h\/noaddraaaaa</);
  for (const id of ["entryaaaaaa", "legacyaaaaa", "pendingaaaa", "declinedaaa", "pausedaaaaa", "sweptaaaaaa"]) assert.doesNotMatch(xml, new RegExp("/h/" + id + "<"), id);
  assert.equal((await get(env, "sweptaaaaaa")).status, 404, "a home the map hides has no page either");
});

test("wiring: routes, share action, profile button, receipts and the pinned versions", () => {
  assert.match(readFileSync("public/_routes.json", "utf8"), /"\/h\/\*"/);
  const app = readFileSync("public/app.js", "utf8"); assert.match(app, /"\/h\/" \+ it\.p\.id/); assert.match(app, /detailHash = .*"#h-"/, "map links keep #h-<id>");
  assert.ok(Buffer.byteLength(app) < 204000);
  assert.match(readFileSync("public/index.html", "utf8"), /app\.js\?v=20261128a/);
  assert.match(readFileSync("public/profile.html", "utf8"), /viewBtn\("\/h\/" \+ encodeURIComponent\(h\.id\)\)/);
  assert.match(readFileSync("functions/api/submit.js", "utf8"), /map: `https:\/\/socallights\.app\/h\/\$\{id\}`/);
  assert.doesNotMatch(readFileSync("functions/_lib/featuremail.js", "utf8"), /#h-/);
});
