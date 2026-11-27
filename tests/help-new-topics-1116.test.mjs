// Help Center audit 2026-11-16, part 2: the fifteen new articles exist, are in the right shape, and name buttons and labels the product really has.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { makeDB } from "./_d1.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
const { raw } = makeDB();
const rows = raw.prepare("SELECT * FROM help_articles").all();
const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));
const CATS = new Set(["find", "post", "enter", "vote", "run", "sponsors", "account"]), KINDS = new Set(["howto", "fix", "answer"]);

// slug -> [source file, labels the article quotes from the product]
const NEW = {
  "where-is-the-add-button": ["public/index.html", ['id="addbtn"', 'aria-label="Add an event, a contest or a home"', 'id="morebtn"']],
  "add-an-event-to-your-calendar": ["public/app.js", ["Add to calendar", "Calendar file ready", "calendar.google.com", "BEGIN:VCALENDAR"]],
  "event-video-link": ["public/app.js", ["Watch the video", "data-vid"]],
  "add-your-contest-logo": ["public/organizer.html", ["Contest logo", "Upload a logo", "Replace logo", "Remove logo", "600 KB"]],
  "manage-your-installer-profile": ["public/installer-manage.html", ["Overview", "Homes", "Details", "Activity", "Confirm", "Not ours", "Quote requests", "Profile views", "Phone for quotes", "Areas served", "About your company", "Remove logo", "This isn't your profile", "Sponsor placement"]],
  "find-santa-visits-and-nativities": ["public/seasons.js", ["Santa visits, photos & breakfasts", "Nativity & drive-thru nativity", "Thanksgiving & Christmas Lights"]],
  "socal-lights-iphone-app": ["public/auth.js", ["SoCalLightsApp"]],
  "i-saw-it-lit-tonight": ["public/app.js", ["I saw it lit tonight", "Thanks, noted as lit", "Seen lit on site tonight", "Reported lit tonight"]],
  "share-an-event-or-a-home": ["public/app.js", ["Link copied", "/e/", 'aria-label="Share"']],
  "browse-events-by-city": ["public/app.js", ["Search places"]],
  "what-featured-and-sponsor-labels-mean": ["public/app.js", ["Featured", "Event Partner"]],
  "why-a-winery-or-hotel-event-is-listed": ["public/app.js", ["Something wrong? Tell us"]],
  "what-cancelled-and-postponed-mean": ["public/app.js", ["Cancelled", "Postponed"]],
  "follow-your-drive-with-live-location": ["public/app.js", ["trackUserLocation: true", "geolocate"]],
  "which-pricing-tab-is-mine": ["public/pricing.html", ['data-label="Homeowners"', 'data-label="Event organizers"', 'data-label="Contest organizers"', 'data-label="Installers"', 'id="homeowners"', 'id="events"', 'id="contests"', 'id="banner"']],
};

test("the fifteen new articles are published, short, plain and sorted into a real category", () => {
  assert.equal(Object.keys(NEW).length, 15);
  for (const slug of Object.keys(NEW)) {
    const r = bySlug[slug]; assert.ok(r, slug + " exists");
    assert.equal(r.status, "published", slug); assert.equal(r.updated_by, "seed", slug);
    assert.ok(CATS.has(r.category) && KINDS.has(r.kind), slug);
    assert.ok(r.summary.length > 40 && r.summary.length <= 300, slug + " summary");
    assert.ok(r.title.length <= 70 && r.keywords.split(",").length >= 5, slug);
    const words = r.body.split(/\s+/).length; assert.ok(words >= 60 && words <= 450, `${slug} has ${words} words`);
    assert.doesNotMatch(r.body, /\$\s?\d/, slug + " quotes a price");
    assert.doesNotMatch((r.body + r.summary).replace(/\]\([^)]*\)/g, "]"), /\bhouses?\b/i, slug + " says house; the site says home");
    assert.ok(!/[—–]/.test(r.title + r.summary + r.body), slug + " has a dash used as punctuation");
  }
});

test("each new article quotes only buttons and labels that exist in the product", () => {
  for (const [slug, [file, labels]] of Object.entries(NEW)) {
    const src = read(file);
    for (const s of labels) assert.ok(src.includes(s), `${slug}: "${s}" is not in ${file}`);
  }
  // the quoted wording of the Add page and the account menu
  const app = read("public/app.js"); for (const s of ["Add an event, home or contest", "Your events", "Your profile", "Feature your event"]) assert.ok(app.includes(s) || read("public/chrome.js").includes(s), s);
});

test("the contest logo is on the Details tab, where the article sends people", () => {
  const org = read("public/organizer.html");
  assert.match(org, /<section data-p="details">\$\{logoCard\(\)\}/);
  assert.match(bySlug["add-your-contest-logo"].body, /tap \*\*Details\*\*/);
});

test("the installer dashboard has the four tabs the article lists, and the entry button the article names", () => {
  const src = read("public/installer-manage.html");
  for (const k of ["overview", "homes", "details", "activity"]) assert.ok(src.includes(`k: "${k}"`), k);
  assert.match(read("public/profile.html"), /Manage the \$\{esc\(i\.name\)\} profile/);
  assert.match(bySlug["manage-your-installer-profile"].body, /\*\*Overview\*\*.*\*\*Homes\*\*.*\*\*Details\*\*.*\*\*Activity\*\*/s);
});

test("the Santa and nativity types are Christmas types, and the article says so", () => {
  const s = read("public/seasons.js"), xmas = s.slice(s.indexOf("christmas: {"), s.indexOf("quickDates", s.indexOf("christmas: {")));
  assert.match(xmas, /nativity: "Nativity & drive-thru nativity"/); assert.match(xmas, /santa: "Santa visits, photos & breakfasts"/);
  assert.match(bySlug["find-santa-visits-and-nativities"].body, /only in the Christmas season/);
});

test("the claims about location and privacy match the code", () => {
  const on = read("functions/api/posts/[id]/on.js");
  assert.match(on, /<= 400/, "about a quarter mile");
  assert.match(on, /DELETE FROM lights_on WHERE day < date\('now','-3 days'\)/, "deleted after a few days");
  assert.doesNotMatch(on, /\blat\b[^;]*INSERT|INSERT[^;]*\bla\b/, "the position itself is not stored");
  assert.match(bySlug["i-saw-it-lit-tonight"].body, /about a quarter mile/);
  const app = read("public/app.js");
  assert.match(app, /Date\.now\(\) - listAt > 30000/, "the list refreshes about every 30 seconds");
  assert.match(bySlug["follow-your-drive-with-live-location"].body, /about every 30 seconds/);
});

test("the iPhone app article matches how the app behaves", () => {
  assert.match(read("public/auth.js"), /SoCalLightsApp.*m\.google = false/);
  assert.match(read("public/contest-pass.html"), /bought on our website, in your browser, not inside the app/);
  assert.match(read("public/app.js"), /IN_APP \? "" : row\("button", 'type="button" data-m="support"/);
  const b = bySlug["socal-lights-iphone-app"].body;
  assert.match(b, /search for \*\*SoCal Lights\*\*/); assert.match(b, /Delete my account/); assert.doesNotMatch(b, /Google Play/);
});

test("the new articles are linked from the articles people read next, and the links resolve", () => {
  const linked = (from, to) => assert.match(bySlug[from].body, new RegExp(`\\]\\(/help/${to}\\)`), `${from} -> ${to}`);
  linked("plan-a-night", "add-an-event-to-your-calendar"); linked("plan-a-night", "share-an-event-or-a-home");
  linked("find-lights-near-me", "follow-your-drive-with-live-location"); linked("find-lights-near-me", "find-santa-visits-and-nativities"); linked("find-lights-near-me", "browse-events-by-city");
  linked("edit-or-cancel-your-event", "event-video-link"); linked("edit-or-cancel-your-event", "what-cancelled-and-postponed-mean");
  linked("installer-profiles", "manage-your-installer-profile"); linked("install-the-app", "socal-lights-iphone-app");
  linked("edit-your-contest-and-change-dates", "add-your-contest-logo"); linked("is-it-free", "which-pricing-tab-is-mine"); linked("is-it-free", "what-featured-and-sponsor-labels-mean");
  linked("show-off-your-house", "i-saw-it-lit-tonight"); linked("what-is-socal-lights", "why-a-winery-or-hotel-event-is-listed");
  for (const r of rows) for (const [, slug] of r.body.matchAll(/\]\(\/help\/([a-z0-9-]+)\)/g)) assert.ok(bySlug[slug], `${r.slug} links to missing article ${slug}`);
});

test("help text quotes no price of ours, and the Pricing page is where prices live", () => {
  for (const slug of Object.keys(NEW)) assert.doesNotMatch(bySlug[slug].body, /\$\s?\d|\bUSD\b|\bper (month|season)\b/i, slug);
  assert.match(bySlug["which-pricing-tab-is-mine"].body, /prices are on the Pricing page only/);
});
