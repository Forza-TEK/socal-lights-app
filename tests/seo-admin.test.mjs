// Batch D1: search visibility, event pages and Admin (audit SEO-02..12, MAP-12, MAP-13, MAP-15, ADM-01..11).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestGet as eventPage } from "../functions/e/[id].js";
import { onRequestGet as cityPage } from "../functions/in/[city].js";
import { onRequestGet as hub } from "../functions/in/index.js";
import { onRequestGet as helpArticle } from "../functions/help/[slug].js";
import { onRequestGet as pastIndex } from "../functions/past/index.js";
import { onRequestGet as sitemap } from "../functions/sitemap.xml.js";
import { onRequestGet as dashboard } from "../functions/api/admin/dashboard.js";
import { onRequestGet as counts } from "../functions/api/admin/counts.js";
import { onRequestGet as revenueApi } from "../functions/api/admin/revenue.js";
import { onRequest as adminGate } from "../functions/api/admin/_middleware.js";
import { onRequestGet as eventsApi } from "../functions/api/events.js";
import { onRequest as middleware } from "../functions/_middleware.js";
import { eventTitle, eventDesc, eventIndexable, shareImage, eventIcs, timeRange, cutName, EXPECTED_DAYS } from "../functions/_lib/eventld.js";
import { CSP_REPORT_ONLY, HSTS } from "../functions/_lib/secheaders.js";
import { HEALTH, healthTest } from "../public/admin/health.js";
import { healthShape } from "../functions/_lib/eventhealth.js";
import { rowToEvent } from "../functions/_lib/util.js";
import { sumOrders } from "../functions/_lib/revenue.js";
import { newEnv, addEvent, ptToday } from "./_pay.mjs";

const read = (p) => readFileSync(p, "utf8");
const ctx = (env, path, params = {}) => ({ request: new Request("https://x.test" + path), env, params, waitUntil() {}, next: async () => new Response("x") });
const lds = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => [].concat(JSON.parse(m[1])));

/* ---------------- event page: title, share image, buttons, indexing rule (MAP-12, MAP-13, SEO-04, SEO-06) ---------------- */
test("event title: the full name when it fits, a cut only at a word boundary and never on a dangling word (MAP-12)", () => {
  const long = "Parade of Lights Premier Viewing at the Ocean Institute";
  assert.equal(eventTitle({ n: "Candy Lane", city: "Altadena" }), "Candy Lane in Altadena, CA | SoCal Lights");
  assert.equal(eventTitle({ n: long, city: "Dana Point" }), long, "the whole name beats a cut one with a suffix");
  for (const n of ["A Very Long Event Name That Keeps Going And Going Until It Is Way Too Long For Any Title At All", "The Grand Annual Holiday Lights Spectacular and Tree Lighting at the Historic Old Town Plaza Park"]) {
    const t = eventTitle({ n, city: "Dana Point" });
    assert.ok(t.length <= 60, t); assert.doesNotMatch(t, /\s(at|the|of|in|and|for|to|with|a|an|on|by)…?$/i, "does not end on a little word: " + t);
  }
  assert.equal(cutName("Short", 20), "Short");
  assert.doesNotMatch(cutName("Holiday Lights at the Old Mission Plaza Gardens", 24), /\sat…$|\sthe…$/);
});

test("event page: share image through our resizer with size and twitter:image; Favorite, Add to calendar and Directions buttons; breadcrumb separators stay on the previous line (MAP-12, MAP-13, SEO-04)", async () => {
  const { env, raw } = newEnv();
  addEvent(raw, "conf", { name: "Candy Lane", city: "Altadena" });
  raw.prepare("UPDATE events SET status='confirmed', image='http://img.example.org/a.jpg', address='1 Candy Ln, Altadena, CA 91001', hours='6-9 pm', start_date=?, end_date=? WHERE id='conf'").run(ptToday(5), ptToday(5));
  const h = await (await eventPage(ctx(env, "/e/conf", { id: "conf" }))).text();
  assert.match(h, /og:image" content="https:\/\/x\.test\/cdn-cgi\/image\/width=1200,height=630,fit=cover,quality=70,format=jpeg\/https:\/\/img\.example\.org\/a\.jpg"/, "https photo, resized, ours");
  assert.match(h, /og:image:width" content="1200"/); assert.match(h, /og:image:height" content="630"/); assert.match(h, /name="twitter:image" content="https:\/\/x\.test\/cdn-cgi/);
  assert.doesNotMatch(h, /og:image" content="https:\/\/img\.example\.org/);
  assert.match(h, /data-fav="conf"/); assert.match(h, /socal-favs/, "the same favorites list as the map");
  assert.match(h, /href="\/e\/conf\.ics"/); assert.match(h, /href="https:\/\/www\.google\.com\/maps\/dir\/\?api=1&amp;destination=/);
  assert.match(h, /\.crumbs li:not\(:last-child\)::after/); assert.doesNotMatch(h, /\.crumbs li\+li::before/);
  // a page without a photo uses the site card with its size
  addEvent(raw, "nophoto", { name: "Plain", city: "Altadena" });
  const p = await (await eventPage(ctx(env, "/e/nophoto", { id: "nophoto" }))).text();
  assert.match(p, /og:image" content="https:\/\/x\.test\/img\/share\.png"/); assert.match(p, /og:image:width" content="1200"/); assert.match(p, /twitter:image" content="https:\/\/x\.test\/img\/share\.png"/);
  // the calendar file
  const ics = await eventPage(ctx(env, "/e/conf.ics", { id: "conf.ics" }));
  assert.match(ics.headers.get("content-type"), /text\/calendar/); const t = await ics.text();
  assert.match(t, /BEGIN:VEVENT/); assert.match(t, /SUMMARY:Candy Lane/); assert.match(t, new RegExp(`DTSTART:${ptToday(5).replace(/-/g, "")}T180000`)); assert.match(t, new RegExp(`DTEND:${ptToday(5).replace(/-/g, "")}T210000`)); assert.match(t, /\/e\/conf/);
  assert.equal((await eventPage(ctx(env, "/e/nope.ics", { id: "nope.ics" }))).status, 404);
});

test("calendar file: all-day when there are no hours; hours like '6-9 pm' and '11-1 pm' read correctly", () => {
  assert.deepEqual(timeRange({ s: "2026-12-11", e: "2026-12-11", h: "6-9 pm" }), ["180000", "210000"]);
  assert.deepEqual(timeRange({ s: "2026-12-11", e: "2026-12-11", h: "11-1 pm" }), ["110000", "130000"]);
  assert.equal(timeRange({ s: "2026-12-11", e: "2026-12-12", h: "6-9 pm" }), null);
  const t = eventIcs({ id: "a", n: "X", s: "2026-12-11", e: "2026-12-13", h: "nightly", st: "e", u: "https://e.example/x" }, "https://x.test");
  assert.match(t, /DTSTART;VALUE=DATE:20261211/); assert.match(t, /DTEND;VALUE=DATE:20261214/); assert.match(t, /Dates are estimated/);
});

test("SEO-06 rule: expected events are indexable only with a source link and a start within 180 days; never Event data; ended and cancelled never", async () => {
  const today = ptToday();
  const e = (o) => ({ st: "e", s: ptToday(10), e: ptToday(12), u: "https://src.example/x", nt: "", ...o });
  assert.equal(eventIndexable(e({}), today), true);
  assert.equal(eventIndexable(e({ u: "" }), today), false, "no link to check the dates on");
  assert.equal(eventIndexable(e({ s: ptToday(EXPECTED_DAYS + 5), e: ptToday(EXPECTED_DAYS + 6) }), today), false, "too far away");
  assert.equal(eventIndexable(e({ s: ptToday(-5), e: ptToday(-1) }), today), false, "ended");
  assert.equal(eventIndexable(e({ nt: "cancelled" }), today), false);
  assert.equal(eventIndexable(e({ st: "c", u: "" }), today), true, "confirmed events stay indexable");
  assert.equal(eventIndexable(e({ st: "c", nt: "postponed" }), today), false);
  const { env, raw } = newEnv();
  addEvent(raw, "ok", { name: "Soon Fest", start_date: ptToday(10), end_date: ptToday(11) }); raw.prepare("UPDATE events SET status='expected' WHERE id='ok'").run();
  addEvent(raw, "nolink", { name: "No Link", start_date: ptToday(10), end_date: ptToday(11), url: "" }); raw.prepare("UPDATE events SET status='expected' WHERE id='nolink'").run();
  const ok = await (await eventPage(ctx(env, "/e/ok", { id: "ok" }))).text(), nolink = await (await eventPage(ctx(env, "/e/nolink", { id: "nolink" }))).text();
  assert.doesNotMatch(ok, /name="robots"/); assert.match(nolink, /noindex,follow/);
  assert.equal(lds(ok).filter((x) => x["@type"] === "Event").length, 0, "no Event structured data for an estimated date");
  assert.match(ok, /name="description" content="[^"]*\(dates estimated\)/);
  const xml = await (await sitemap(ctx(env, "/sitemap.xml"))).text();
  assert.match(xml, /\/e\/ok</); assert.doesNotMatch(xml, /\/e\/nolink</);
  assert.match(eventDesc({ n: "X", s: "2026-12-01", e: "2026-12-01", st: "e", c: "Orange", city: "Y" }), /dates estimated/);
});

test("sitemap gives lastmod from each event's own update time and none for pages without a date (MAP-15)", async () => {
  const { env, raw } = newEnv();
  addEvent(raw, "c1", { name: "A" }); raw.prepare("UPDATE events SET status='confirmed', updated_at='2026-10-03 12:00:00' WHERE id='c1'").run();
  const xml = await (await sitemap(ctx(env, "/sitemap.xml"))).text();
  assert.match(xml, /<url><loc>https:\/\/x\.test\/e\/c1<\/loc><lastmod>2026-10-03<\/lastmod><\/url>/);
  assert.match(xml, /<url><loc>https:\/\/x\.test\/pricing<\/loc><\/url>/);
});

/* ---------------- other pages (SEO-03, 05, 07, 08, 11, 12) ---------------- */
test("Pricing, Contests and Tutorials carry a canonical link and full share tags (SEO-03)", () => {
  for (const [f, path] of [["pricing", "/pricing"], ["contests", "/contests"], ["tutorials", "/tutorials"]]) {
    const h = read(`public/${f}.html`);
    assert.ok(h.includes(`<link rel="canonical" href="https://socallights.app${path}">`), f);
    for (const t of ['property="og:url"', 'property="og:type"', 'property="og:title"', 'property="og:description"', 'property="og:image:width"', 'name="twitter:card"', 'name="twitter:image"']) assert.ok(h.includes(t), `${f}: ${t}`);
    assert.equal((h.match(/property="og:title"/g) || []).length, 1, "one og:title");
  }
});

test("home page has Organization data besides WebSite; city pages list their events as an ItemList (SEO-05)", async () => {
  const h = read("public/index.html"), m = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/), j = JSON.parse(m[1]);
  const types = j["@graph"].map((x) => x["@type"]); assert.deepEqual(types, ["WebSite", "Organization"]);
  const org = j["@graph"][1]; assert.equal(org.name, "SoCal Lights"); assert.match(org.logo, /^https:\/\/socallights\.app\/img\//); assert.ok(!org.sameAs, "no social profiles invented");
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM events").run();
  for (let i = 0; i < 3; i++) addEvent(raw, "q" + i, { city: "Bigtown", name: "Big " + i });
  const c = await (await cityPage(ctx(env, "/in/bigtown", { city: "bigtown" }))).text(), list = lds(c).find((x) => x["@type"] === "ItemList");
  assert.equal(list.numberOfItems, 3); assert.equal(list.itemListElement[0].position, 1); assert.match(list.itemListElement[0].url, /^https:\/\/x\.test\/e\//);
});

test("SEO-02: the /in hub lists cities in a fixed-column grid so a late web font cannot reflow it", async () => {
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM events").run(); addEvent(raw, "z1", { city: "Zed City" });
  const h = await (await hub(ctx(env, "/in"))).text();
  assert.match(h, /<div class="cgrid"><a href="\/in\/zed-city" title="Zed City, 1 upcoming">Zed City \(1\)<\/a><\/div>/); assert.match(h, /\.cgrid\{display:grid;grid-template-columns:repeat\(auto-fill,minmax\(180px/);
});

test("city page: the search description names the top events and the season; the visible line is different (SEO-11)", async () => {
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM events").run();
  addEvent(raw, "a", { city: "Bigtown", name: "Zebra Lights" }); addEvent(raw, "b", { city: "Bigtown", name: "Alpha Parade" }); addEvent(raw, "c", { city: "Bigtown", name: "Mid Walk" }); addEvent(raw, "d", { city: "Bigtown", name: "Fourth One" });
  raw.prepare("UPDATE events SET status='confirmed' WHERE id IN ('a','b','c')").run();
  const h = await (await cityPage(ctx(env, "/in/bigtown", { city: "bigtown" }))).text();
  const desc = h.match(/name="description" content="([^"]*)"/)[1], sub = h.match(/<p class="sub">([^<]*)<\/p>/)[1];
  assert.ok(desc.length <= 155, desc); assert.match(desc, /Zebra Lights|Alpha Parade|Mid Walk/); assert.doesNotMatch(desc, /Fourth One/, "only the three best");
  assert.notEqual(sub.slice(0, 60), desc.slice(0, 60));
  raw.prepare("UPDATE events SET season='halloween'").run();
  const o = await (await cityPage(ctx(env, "/in/bigtown2", { city: "bigtown" }))).text();
  assert.match(o.match(/name="description" content="([^"]*)"/)[1], /Halloween/); assert.doesNotMatch(o.match(/name="description" content="([^"]*)"/)[1], /Christmas/);
});

test("/past is noindex until a result exists; contest pages are not blocked in robots.txt so the noindex can be read (SEO-07, SEO-08)", async () => {
  const { env } = newEnv();
  const p = await (await pastIndex(ctx(env, "/past"))).text(); assert.match(p, /noindex,follow/);
  const robots = read("public/robots.txt"); assert.doesNotMatch(robots, /Disallow: \/c\//); assert.match(robots, /Disallow: \/admin\//);
  assert.match(read("public/_headers"), /\/c\/\*\n {2}X-Robots-Tag: noindex/, "still noindex by header");
  const c = read("functions/c/[slug].js"); assert.match(c, /twitter:image/); assert.match(c, /og:image:width/); assert.match(c, /cdn-cgi\/image/);
});

test("help articles keep Article data (SEO-12: it was already there)", () => {
  assert.match(read("functions/help/[slug].js"), /"@type": "Article"/);
});

/* ---------------- headers and redirects (SEO-09, SEO-10) ---------------- */
test("HSTS and a report-only CSP: same values in public/_headers and in the Function middleware; the CSP is not enforced (SEO-09)", async () => {
  const h = read("public/_headers"), star = h.slice(h.indexOf("/*"), h.indexOf("/admin/*"));
  assert.ok(star.includes(`Strict-Transport-Security: ${HSTS}`)); assert.ok(star.includes(`Content-Security-Policy-Report-Only: ${CSP_REPORT_ONLY}`));
  assert.doesNotMatch(h, /^\s*Content-Security-Policy:/m, "no enforced CSP");
  const res = await middleware({ next: async () => new Response("ok"), env: {} });
  assert.equal(res.headers.get("Strict-Transport-Security"), "max-age=31536000"); assert.equal(res.headers.get("Content-Security-Policy-Report-Only"), CSP_REPORT_ONLY); assert.equal(res.headers.get("Content-Security-Policy"), null);
  assert.doesNotMatch(HSTS, /includeSubDomains|preload/);
  for (const d of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'self'", "base-uri 'self'"]) assert.ok(CSP_REPORT_ONLY.includes(d), d);
});

test("redirects: capitals, spaces and trailing slashes go to the one lowercase address with a 301 and keep the query (SEO-10)", async () => {
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM events").run();
  addEvent(raw, "MixedCase-1", { city: "Los Angeles", name: "LA Show" });
  const loc = async (fn, path, params) => { const r = await fn(ctx(env, path, params)); return [r.status, r.headers.get("location")]; };
  assert.deepEqual(await loc(cityPage, "/in/Los-Angeles", { city: "Los-Angeles" }), [301, "/in/los-angeles"]);
  assert.deepEqual(await loc(cityPage, "/in/los-angeles/", { city: "los-angeles" }), [301, "/in/los-angeles"]);
  assert.deepEqual(await loc(cityPage, "/in/Los-Angeles?ref=fb", { city: "Los-Angeles" }), [301, "/in/los-angeles?ref=fb"]);
  assert.equal((await cityPage(ctx(env, "/in/los-angeles", { city: "los-angeles" }))).status, 200, "the canonical address is served");
  assert.deepEqual(await loc(hub, "/in/", {}), [301, "/in"]);
  assert.deepEqual(await loc(eventPage, "/e/MixedCase-1/", { id: "MixedCase-1" }), [301, "/e/MixedCase-1"]);
  assert.deepEqual(await loc(eventPage, "/e/mixedcase-1", { id: "mixedcase-1" }), [301, "/e/MixedCase-1"], "the id typed in another case goes to the real id");
  assert.equal((await eventPage(ctx(env, "/e/nothing-here", { id: "nothing-here" }))).status, 404, "an unknown id is still a 404");
  assert.deepEqual(await loc(helpArticle, "/help/Find-Lights", { slug: "Find-Lights" }), [301, "/help/find-lights"]);
});

/* ---------------- Admin (ADM-01..11) ---------------- */
const seedAdmin = () => {
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM events").run();
  const add = (id, o = {}) => { addEvent(raw, id, o); raw.prepare("UPDATE events SET status=?, image=?, url=?, images=?, updated_at=datetime('now', ?) WHERE id=?").run(o.status || "expected", o.image ?? "", o.url ?? "https://s.example/x", o.images || "[]", o.age || "-1 days", id); };
  add("c1", { status: "confirmed", image: "https://i.example/a.jpg" });
  add("c2", { status: "confirmed", url: "" });                                   // no photo, no link
  add("e1", { age: "-20 days", image: "https://i.example/b.jpg" });               // expected, stale
  add("e2", { images: '["p/x.jpg"]' });                                          // expected, has a gallery photo only
  add("old-exp", { start_date: ptToday(-60), end_date: ptToday(-40) });           // expected and the date passed (not on the map)
  add("old-conf", { status: "confirmed", start_date: ptToday(-60), end_date: ptToday(-40), image: "https://i.example/c.jpg" });
  add("just-ended", { status: "confirmed", start_date: ptToday(-5), end_date: ptToday(-2), image: "https://i.example/d.jpg" }); // still on the map (3-day grace)
  return { env, raw };
};

test("ADM-03: the dashboard tile and the Events badge count what the public map shows, with confirmed and expected", async () => {
  const { env, raw } = seedAdmin();
  const api = await (await eventsApi({ request: new Request("https://x.test/api/events"), env, waitUntil() {} })).json();
  const d = await (await dashboard({ env })).json(), c = await (await counts({ env })).json();
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM events").get().n, 7);
  assert.equal(d.live.events, api.length, "same number as GET /api/events"); assert.equal(c.events, api.length);
  assert.equal(d.live.events, 5); assert.equal(d.live.eventsConfirmed, 3); assert.equal(d.live.eventsExpected, 2); assert.equal(c.eventsConfirmed + c.eventsExpected, c.events);
  assert.ok(c.events < 7, "rows that ended long ago are not counted");
});

test("ADM-03: a sweep event replaced by an approved house is not counted, like on the map", async () => {
  const { env, raw } = newEnv(); raw.prepare("DELETE FROM events").run();
  addEvent(raw, "sw", { name: "Smith lights", city: "Pasadena" }); raw.prepare("UPDATE events SET address='12 Elm Street, Pasadena, CA 91101' WHERE id='sw'").run();
  raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,season,address,street,zip) VALUES ('p1','approved','b','Home','Pasadena',34,-118,'d','[]','christmas','12 Elm St, Pasadena, CA 91101','12 Elm St','91101')").run();
  const api = await (await eventsApi({ request: new Request("https://x.test/api/events"), env, waitUntil() {} })).json();
  assert.equal(api.length, 0); const c = await (await counts({ env })).json(); assert.equal(c.events, 0);
});

test("ADM-01: Data health counts equal what the Events filters select (one set of checks, shared)", async () => {
  const { env, raw } = seedAdmin(), today = ptToday();
  const d = await (await dashboard({ env })).json();
  const all = raw.prepare("SELECT * FROM events").all().map((r) => rowToEvent(r));
  for (const [k] of HEALTH) assert.equal(d.health[k], all.filter((e) => healthTest(k)(e, today)).length, k);
  assert.equal(d.health.nophoto, 1, "c2 only: a gallery photo or a main photo counts"); assert.equal(d.health.nolink, 1); assert.equal(d.health.passed, 1); assert.equal(d.health.stale, 1);
  assert.equal(d.health.map.total, 5); assert.equal(d.health.stored, 7); assert.equal(d.health.upcoming, 4 + 0);
  assert.deepEqual(healthShape({ status: "confirmed", start_date: "a", end_date: "b", image: "", images: "not json", url: "u", updated_at: "2026-01-02 03:04:05" }).imgs, []);
});

test("ADM-02: the revenue strip adds orders by product for 30 days; refunds and money at risk are separate", async () => {
  const { env, raw } = newEnv();
  const ord = (sid, target, amount, status, days = 1, cur = "usd") => raw.prepare("INSERT INTO feature_orders (session_id,event_id,plan,amount,currency,status,target,created_at) VALUES (?,?,?,?,?,?,?,datetime('now',?))").run(sid, "x", "p", amount, cur, status, target, `-${days} days`);
  ord("a", "event", 5000, "paid"); ord("b", "event", 3000, "refunded"); ord("c", "contest_pass", 14900, "paid"); ord("d", "installer", 7500, "refund_due"); ord("e", "event_partner", 14900, "paid", 45); ord("f", "home", 1000, "paid", 2, "eur");
  const r = await (await revenueApi({ request: new Request("https://x.test/api/admin/revenue?days=30"), env })).json();
  assert.equal(r.days, 30); assert.equal(r.total.orders, 4, "the 45-day-old order and the euro order are left out");
  assert.equal(r.total.gross, 5000 + 3000 + 14900 + 7500); assert.equal(r.total.refunded, 3000); assert.equal(r.total.net, 5000 + 14900 + 7500); assert.equal(r.total.atRisk, 7500); assert.equal(r.otherCurrency, 1);
  const by = Object.fromEntries(r.rows.map((x) => [x.key, x])); assert.equal(by.event.orders, 2); assert.equal(by.contest_pass.net, 14900); assert.ok(!by.event_partner);
  const d = await (await dashboard({ env })).json(); assert.equal(d.revenue.total.net, r.total.net);
  assert.deepEqual(sumOrders([]).total, { orders: 0, gross: 0, refunded: 0, atRisk: 0, net: 0 });
  assert.equal((await revenueApi({ request: new Request("https://x.test/api/admin/revenue?days=5000"), env }).then((x) => x.json())).days, 365);
});

test("revenue endpoint is behind the Access login like the rest of /api/admin", async () => {
  const { env } = newEnv();
  const res = await adminGate({ request: new Request("https://socallights.app/api/admin/revenue"), env, data: {}, next: async () => new Response("secret") });
  assert.equal(res.status, 401);
  const ok = await adminGate({ request: new Request("http://localhost/api/admin/revenue"), env: { ...env, ADMIN_DEV_BYPASS: "1" }, data: {}, next: async () => new Response("fine") });
  assert.equal(await ok.text(), "fine");
});

test("ADM-09 and ADM-10: the dashboard shows each job's last run, the latest migration and errors for 7 days, and says what it cannot know", async () => {
  const { env, raw } = newEnv();
  raw.prepare("INSERT INTO job_heartbeats (job,last_at,last_ok_at,last_status,detail,runs) VALUES ('backup',datetime('now','-2 hours'),datetime('now','-2 hours'),'ok','',1) ON CONFLICT(job) DO UPDATE SET last_at=excluded.last_at,last_ok_at=excluded.last_ok_at,last_status='ok'").run();
  raw.prepare("INSERT INTO job_heartbeats (job,last_at,last_ok_at,last_status,detail,runs) VALUES ('digest',datetime('now','-1 hours'),NULL,'fail','smtp',1) ON CONFLICT(job) DO UPDATE SET last_at=excluded.last_at,last_status='fail',last_ok_at=NULL").run();
  raw.exec("CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"); raw.prepare("INSERT INTO d1_migrations (name, applied_at) VALUES ('0300_sweep_test.sql', datetime('now','-3 hours'))").run();
  const ops = (kind, detail, ago) => raw.prepare("INSERT INTO ops_log (kind, detail, created_at) VALUES (?,?,datetime('now',?))").run(kind, detail, ago);
  ops("mail", "resend 500", "-1 days"); ops("mail", "resend 500", "-2 days"); ops("webhook", "bad signature", "-3 days"); ops("mail", "too old", "-9 days");
  raw.prepare("INSERT INTO mail_outbox (template,to_email,status,created_at) VALUES ('t','a@b.c','failed',datetime('now','-1 days'))").run();
  const d = await (await dashboard({ env })).json();
  assert.equal(d.errors.groups.find((g) => g.kind === "mail").n, 2, "older than 7 days is left out"); assert.equal(d.errors.groups.find((g) => g.kind === "webhook").label, "Stripe webhook problems");
  assert.equal(d.errors.mailFailed, 1); assert.equal(d.errors.failedJobs.length, 1); assert.equal(d.errors.total, 2 + 1 + 1 + 1);
  assert.match(d.errors.notStored.join(" "), /5xx/, "says what is not stored instead of inventing numbers");
  const bk = d.runs.workflows.find((w) => w.job === "backup"), dg = d.runs.workflows.find((w) => w.job === "digest");
  assert.equal(bk.status, "ok"); assert.equal(dg.failed, true); assert.equal(d.runs.migration.name, "0300_sweep_test.sql");
  assert.match(d.runs.notRecorded.join(" "), /no heartbeat/);
  const none = newEnv().env; const d2 = await (await dashboard({ env: none })).json(); assert.equal(d2.runs.migration, null, "no d1_migrations table: null, not a made-up time");
});

test("the dashboard stays under the 50 database calls one request may make", async () => {
  const { env } = seedAdmin(); env.DB.stats.reset(); await dashboard({ env });
  assert.ok(env.DB.stats.calls < 50, "calls: " + env.DB.stats.calls);
});

test("ADM-07: Admin tabs regrouped Review, Content, Money, Marketing, System; every tab still there; deep links still work", () => {
  const html = read("public/admin/index.html"), side = html.slice(html.indexOf('<nav class="side"'), html.indexOf("</nav>", html.indexOf('<nav class="side"')));
  assert.deepEqual([...side.matchAll(/<p class="gh">([^<]+)<\/p>/g)].map((m) => m[1]), ["Review", "Content", "Money", "Marketing", "System"]);
  const group = (name) => { const i = side.indexOf(`<p class="gh">${name}</p>`), j = side.indexOf('<p class="gh">', i + 1); return [...side.slice(i, j < 0 ? undefined : j).matchAll(/data-tab="([a-z]+)"/g)].map((m) => m[1]); };
  assert.deepEqual(group("Money"), ["orders", "partner", "passes"]); assert.ok(group("Marketing").includes("outreach") && group("Marketing").includes("ads") && group("Marketing").includes("emails"));
  const js = read("public/admin/admin.js"), TABS = js.match(/const TABS = \[([^\]]+)\]/)[1].match(/"([a-z]+)"/g).map((x) => x.replace(/"/g, ""));
  const original = ["dashboard", "pending", "subs", "claims", "orders", "partner", "contests", "reports", "approved", "events", "installers", "users", "overlaps", "data", "log", "usage", "outreach", "ads", "emails", "help", "chat"];
  for (const t of original) { assert.ok(TABS.includes(t), "deep link #" + t); assert.ok(side.includes(`data-tab="${t}"`), "nav item " + t); }
  assert.ok(TABS.includes("passes")); assert.match(js, /passes: "Contest passes"/);
});

test("ADM-04: no browser confirm() or prompt() is left in Admin; destructive buttons use the tap-again pattern or an in-page window", () => {
  for (const f of ["admin.js", "partner.js", "chat.js", "emails.js", "help.js", "kit.js"]) assert.doesNotMatch(read("public/admin/" + f), /(?<![\w.])(confirm|prompt)\(/, f);
  assert.match(read("public/admin/kit.js"), /export function askBox/);
});

test("ADM-05, 06, 08, 11: bulk select on Events and submitted events, sort controls, phone folding and paging, one 'Nothing matches that.' message", () => {
  const js = read("public/admin/admin.js"), kit = read("public/admin/kit.js"), css = read("public/admin/admin.css");
  for (const id of ["evBulk", "evSetC", "evSetE", "evMove", "evDel", "sbulk", "sPubC", "sPubE", "sDec"]) assert.ok(js.includes(`id="${id}"`), id);
  assert.match(js, /tap\(btn, verb\.replace/, "bulk actions ask for a second tap"); assert.match(js, /undo:/, "status and season changes can be undone");
  assert.match(js, /EVSORTS/); assert.match(js, /SSORTS/); assert.match(js, /HSORTS/); assert.match(kit, /export const sortSelect/);
  assert.match(js, /Nothing matches that\./); assert.doesNotMatch(js, /No events match\./); assert.doesNotMatch(js, /Nobody matches that/);
  assert.match(kit, /PAGE_PHONE = 20/); assert.match(css, /#main \.cards>\.acard\.rec:not\(\.compact\):not\(\.open\)>:not\(\.rh\)\{display:none\}/);
  assert.match(js, /id="evHealth"|"evHealth"/); assert.match(js, /data-hfilter/);
});

test("Admin asset versions moved together", () => {
  const idx = read("public/admin/index.html"), js = read("public/admin/admin.js");
  assert.match(idx, /admin\.css\?v=20261113a/); assert.match(idx, /admin\.js\?v=20261113a/); assert.match(js, /kit\.js\?v=20261113a/); assert.match(js, /health\.js\?v=20261113a/);
});
