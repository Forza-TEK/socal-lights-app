// Front-end polish batch (audit 2026-11-11: MAP-05..19, A11-01..21): picture fallbacks, the season in the first HTML, one header with a Map link, skip links, wording.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { isCityEvent, looksLikeLogoUrl, judgePicture, usablePhoto } from "../public/photoguess.js";
import { applyHomeMeta } from "../functions/_lib/homemeta.js";
import { hero, header } from "../functions/_lib/shell.js";

const read = (p) => readFileSync(p, "utf8");

test("MAP-18: city and government events are recognised from their name, venue, link or picture address", () => {
  assert.ok(isCityEvent({ n: "City of Dana Point Turkey Trot" }));
  assert.ok(isCityEvent({ n: "Holiday Parade", v: "Irvine Parks and Recreation" }));
  assert.ok(isCityEvent({ n: "Tree Lighting", u: "https://www.cityofalhambra.org/events" }));
  assert.ok(isCityEvent({ n: "Tree Lighting", img: "https://www.ci.pasadena.ca.us/x/photo.jpg" }));
  assert.ok(isCityEvent({ n: "Lights", u: "https://parks.lacounty.gov/lights" }));
  assert.ok(!isCityEvent({ n: "Pumpkin Patch", v: "Smith Farm", u: "https://smithfarm.com", img: "https://smithfarm.com/a.jpg" }));
});

test("MAP-18: a logo-named picture on a non-city event gives way to the stock photo; a city event keeps it", () => {
  assert.ok(looksLikeLogoUrl("https://x.com/wp-content/uploads/site-logo.png"));
  assert.ok(looksLikeLogoUrl("https://x.com/images/Seal.png?w=300"));
  assert.ok(!looksLikeLogoUrl("https://x.com/uploads/dialogo-lights-show.jpg"));
  assert.ok(!looksLikeLogoUrl("https://logo.example.com/uploads/lights.jpg"), "only the file path counts, not the host");
  assert.equal(usablePhoto({ n: "Farm Fest", img: "https://farm.com/logo.png" }), "");
  assert.equal(usablePhoto({ n: "Farm Fest", img: "https://farm.com/lights.jpg" }), "https://farm.com/lights.jpg");
  assert.equal(usablePhoto({ n: "City of Dana Point Turkey Trot", img: "https://danapoint.org/seal.png" }), "https://danapoint.org/seal.png");
});

test("MAP-18: loaded pictures: blurry or tiny ones fall back; banners and small squares are logo-like; good photos stay", () => {
  assert.equal(judgePicture(200, 150, 320), "lowres");
  assert.equal(judgePicture(299, 400, 0), "lowres");
  assert.equal(judgePicture(320, 213, 320), "ok", "resized to the asked width: the original is at least that big");
  assert.equal(judgePicture(320, 70, 320), "logo", "a wide strip");
  assert.equal(judgePicture(400, 400, 0), "logo", "a small square original");
  assert.equal(judgePicture(320, 320, 320), "ok", "a square photo that the resizer shrank to the asked width");
  assert.equal(judgePicture(1200, 800, 0), "ok");
  assert.equal(judgePicture(0, 0, 0), "ok", "unknown size: leave it");
});

test("MAP-09: the home page HTML carries the current season, its button and the final search wording", () => {
  const html = read("public/index.html");
  const nov = applyHomeMeta(html, "2026-11-11"), oct = applyHomeMeta(html, "2026-10-10");
  assert.match(nov, /<html lang="en" data-theme="light" data-season="christmas">/);
  assert.match(nov, /id="seasonico" aria-hidden="true">🦃<\/span><span id="seasonlbl">Thanksgiving<\/span>/);
  assert.match(nov, /aria-label="Season: Thanksgiving"/);
  assert.match(oct, /data-season="halloween"/); assert.match(oct, /seasonlbl">Halloween</);
  assert.match(html, /placeholder="Search places or city"/);
  assert.ok(!/Search events or a city|Search places or a city/.test(html + read("public/app.js")));
});

test("A11-07 and A11-11: every header has the Map link; every page with a main area gets a skip link; the map has a main landmark", () => {
  assert.match(header(), /class="maplink"/);
  assert.match(read("public/appshell.js"), /class="maplink"/);
  assert.match(read("public/404.html"), /class="maplink"/);
  for (const f of readdirSync("public").filter((n) => n.endsWith(".html"))) {
    const s = read("public/" + f);
    if (!s.includes('<div class="hdr" role="banner">') || /^add-(event|house|contest)\.html$/.test(f) || f === "contest-enter.html") continue; // the add forms keep Save & exit; contest-enter keeps Back
    assert.match(s, /class="maplink"/, f + " header lacks the Map link");
  }
  assert.match(read("public/index.html"), /<main id="map"/);
  const foot = read("public/footer.js");
  assert.match(foot, /MutationObserver/, "a skip link is added once a script-drawn <main> appears (add-event, add-house)");
});

test("A11-16: every page carries the app icon, manifest and theme color", () => {
  for (const f of readdirSync("public").filter((n) => n.endsWith(".html") && n !== "archive.html")) { // archive.html only redirects
    const s = read("public/" + f);
    assert.match(s, /rel="apple-touch-icon"/, f); assert.match(s, /rel="manifest"/, f); assert.match(s, /name="theme-color"/, f);
  }
  assert.match(read("functions/_lib/shell.js"), /rel="apple-touch-icon"[^]*rel="manifest"[^]*name="theme-color"/);
});

test("A11-21: gallery pictures with a visible caption have empty alt text", () => {
  const h = hero([{ img: "/a.jpg", cap: "Lights Up Today" }]);
  assert.match(h, /<img src="[^"]+" alt=""/);
  assert.match(h, /<span class="cap">Lights Up Today<\/span>/);
});

test("A11-10: /past with no finished contests says results appear when a contest ends", async () => {
  const { onRequestGet } = await import("../functions/past/index.js");
  const env = { DB: { prepare: () => ({ all: async () => ({ results: [] }) }) } };
  const res = await onRequestGet({ request: new Request("https://t.test/past"), env, waitUntil() {} });
  const html = await res.text();
  assert.match(html, /Results appear here when a contest ends/);
  assert.ok(!/Results of 0 finished/.test(html));
});

test("A11-04/05/06/12/13: field sizes, borders, placeholders, small text and focus rings", () => {
  const css = read("public/styles.css"), tokens = read("public/tokens.css"), help = read("functions/_lib/helpui.js");
  assert.match(css, /@media \(max-width:700px\)\{\.sortsel,\.phead select\{font-size:16px\}\}/);
  assert.match(help, /\.ask input\{width:100%;font:inherit;font-size:16px;[^}]*var\(--field\)/);
  assert.match(tokens, /::placeholder\{color:var\(--muted\);opacity:1\}/);
  assert.match(help, /\.alist a:focus-visible\{outline:2px solid var\(--focus\)/);
  for (const f of ["public/styles.css", "public/appshell.css"]) assert.ok(!/font-size:1[01](\.5)?px/.test(read(f).replace(/\.caret\{font-size:10px[^}]*\}/g, "").replace(/\.sp-tag\{[^}]*font-size:10px[^}]*\}/g, "")), f + " has text under 12px");
  assert.match(read("public/addflow.css"), /\.in\{[^}]*border:1px solid var\(--field\)/);
});

test("MAP-06/14/19: 44 px targets, a scrolling sponsor strip (MAP-07 reverted by the owner), a dimmed background behind the season menu, whole-row visited tap", () => {
  const css = read("public/styles.css"), banner = read("public/banner.js");
  assert.match(css, /\.maplibregl-ctrl-group button\{width:44px!important;height:44px!important\}/);
  assert.match(css, /body:has\(#seasonmenu\)::after/);
  assert.match(css, /\.grab\{min-height:44px/);
  assert.match(banner, /translate3d\(\$\{-X\}/, "the sponsor strip scrolls again (owner reverted the one-at-a-time strip)"); assert.match(banner, /sp-tag">Sponsor</);
  assert.match(read("public/routes.css"), /\.legl label\{align-self:stretch;min-height:56px\}/);
});

test("MAP-11/16/17: one count wording, no 300-city menu, one word in the route sheet", () => {
  const app = read("public/app.js");
  assert.match(app, /<span class="hin"> in view<\/span>/); assert.ok(!app.includes("in map view</span>"));
  assert.ok(!/Object\.keys\(CITY\)\.sort\(\)\.map\(\(c\) => `<option \$\{c === state\.start/.test(app), "the Start menu no longer lists every city");
  assert.match(app, /askStartCity/);
  assert.ok(!app.includes("Tick a place"));
});

test("owner follow-ups: the search box keeps a usable width, and the app-frame header has no second Map button beside the sidebar", () => {
  const css = read("public/styles.css");
  assert.match(css, /@media \(min-width:1100px\)\{\.searchrow\{flex-wrap:wrap[^}]*\}\.search\{flex:1 1 220px;min-width:220px\}\}/);
  assert.match(css, /\.rtpill>span\{position:absolute/, "the pill keeps its words for screen readers");
  assert.match(read("public/appshell.css"), /@media \(min-width:700px\)\{\.sh-top \.maplink\{display:none\}\}/);
});

test("phone: the collapsed list bounces once when the site opens, never with reduced motion, never over an opened place or a link, and a touch stops it", () => {
  const app = readFileSync("public/app.js", "utf8");
  assert.match(app, /function introBounce\(\)/);
  assert.match(app, /prefers-reduced-motion:reduce\)"\)\.matches\) return;\s*\n\s*bounced = true/, "skipped for reduced motion, and runs once");
  assert.match(app, /if \(!dl\) introBounce\(\)/, "not when the page opened on a link to a place");
  assert.match(app, /panel\.addEventListener\("pointerdown", stop, \{ once: true \}\)/, "a touch cancels it");
});

test("live location: the locate button follows you (tracking, dot, accuracy ring, heading), keeps following through its own first zoom, and refreshes distances only every 30 seconds", () => {
  const app = readFileSync("public/app.js", "utf8");
  assert.match(app, /trackUserLocation: true, showUserLocation: true, showAccuracyCircle: true, showUserHeading: true/);
  assert.match(app, /\{ geolocateSource: true \}/, "the first-fix zoom is tagged as the control's own move, so follow mode is not switched off");
  assert.match(app, /Date\.now\(\) - listAt > 30000/, "the list is refreshed at most every 30 s");
  assert.doesNotMatch(app, /trackUserLocation: false/);
});

test("phone: pulled down past its resting spot the list stretches (up to 70 px) and springs back with a small bounce, unless motion is reduced", () => {
  const app = readFileSync("public/app.js", "utf8");
  assert.match(app, /70 \* \(1 - Math\.exp\(-\(y - py\) \/ 160\)\)/, "growing resistance, capped at 70 px");
  assert.match(app, /if \(over > 2 && next === "peek" && !matchMedia\("\(prefers-reduced-motion:reduce\)"\)\.matches\)/);
});
