// Home page text by season (audit seo H2), ?ref= codes (seo M5) and the front-end rules that cannot be seen from a node test (checked in the source).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { onRequestPost as visit, REF_CODE, MAX_REFS_PER_DAY } from "../functions/api/visit.js";
import { HOME_META, homeMeta, applyHomeMeta } from "../functions/_lib/homemeta.js";
import { dayKey } from "../functions/_lib/funnel.js";
import { newEnv } from "./_pay.mjs";

const read = (p) => readFileSync(p, "utf8");

test("home meta: every season fits the search-result limits, and index.html carries the Christmas wording as its default", () => {
  for (const [k, m] of Object.entries(HOME_META)) { assert.ok(m.title.length <= 60, `${k} title ${m.title.length}`); assert.ok(m.desc.length <= 155, `${k} desc ${m.desc.length}`); assert.match(m.title, /\| SoCal Lights$/); }
  assert.equal(homeMeta("2026-11-06"), HOME_META.christmas); assert.equal(homeMeta("2026-10-10"), HOME_META.halloween); assert.equal(homeMeta("2027-07-01"), HOME_META.summer);
  const html = read("public/index.html"), c = HOME_META.christmas, amp = (s) => s.replace(/&/g, "&amp;");
  assert.ok(html.includes(`<title>${amp(c.title)}</title>`)); assert.ok(html.includes(`<meta name="description" content="${c.desc}">`));
  assert.ok(html.includes(`<meta property="og:title" content="${amp(c.title)}">`)); assert.ok(html.includes(`<meta property="og:description" content="${c.desc}">`));
  assert.ok(!html.includes("SearchAction"), "no search action that nothing implements");
  const oct = applyHomeMeta(html, "2026-10-10");
  assert.ok(oct.includes(`<title>${amp(HOME_META.halloween.title)}</title>`) && oct.includes(HOME_META.halloween.desc) && !oct.includes(c.desc));
});

const post = (env, body) => visit({ request: new Request("https://x.test/api/visit", { method: "POST", body: JSON.stringify(body) }), env });
const n = (raw, page) => (raw.prepare("SELECT n FROM site_hits WHERE day = ? AND page = ?").get(dayKey(), page) || {}).n || 0;
test("?ref= codes: any short code is counted, at most 30 different ones a day, anything else ignored", async () => {
  assert.ok(REF_CODE.test("ref:fb-ig-nov") && !REF_CODE.test("ref:FB") && !REF_CODE.test("ref:" + "a".repeat(21)) && !REF_CODE.test("ref:a b"));
  const { env, raw } = newEnv();
  await post(env, { k: "ref:fb-ig-nov" }); await post(env, { k: "ref:fb-ig-nov" }); await post(env, { k: "ref:inst" });
  assert.equal(n(raw, "ref:fb-ig-nov"), 2); assert.equal(n(raw, "ref:inst"), 1);
  for (let i = 0; i < 60; i++) await post(env, { k: "ref:code" + i });
  assert.equal(raw.prepare("SELECT COUNT(*) AS c FROM site_hits WHERE day = ? AND page LIKE 'ref:%'").get(dayKey()).c, MAX_REFS_PER_DAY);
  await post(env, { k: "ref:fb-ig-nov" }); assert.equal(n(raw, "ref:fb-ig-nov"), 3, "a code already counted keeps counting");
  await post(env, { k: "ref:BAD CODE" }); await post(env, { k: "ref:" }); await post(env, { k: "ref:" + "x".repeat(40) });
  assert.equal(raw.prepare("SELECT COUNT(*) AS c FROM site_hits WHERE day = ? AND page LIKE 'ref:%'").get(dayKey()).c, MAX_REFS_PER_DAY);
  assert.match(read("public/hit.js"), /\[a-z0-9-\]\{1,20\}/);
});

test("map page: no third-party map host, library is our own versioned file that the service worker keeps, data requests start from the head", () => {
  const html = read("public/index.html"), sw = read("public/sw.js"), app = read("public/app.js");
  assert.ok(!/unpkg\.com/.test(html)); assert.ok(!/<script src="\/vendor/.test(html), "the library is not a blocking tag");
  assert.ok(existsSync("public/vendor/maplibre-gl-4.7.1.js") && existsSync("public/vendor/maplibre-gl-4.7.1.css"));
  assert.ok(sw.includes("/vendor/maplibre-gl-4.7.1.js") && sw.includes("/vendor/maplibre-gl-4.7.1.css") && /const V = "scl-6"/.test(sw));
  assert.ok(app.includes('const MAPLIB = "/vendor/maplibre-gl-4.7.1"') && app.includes("loadMapLib();"));
  assert.ok(!/rel="preload" href="\/api\//.test(html), "no fetch preloads (they are not shared with a page the service worker controls)");
  assert.ok(html.includes("window.__pre=") && app.includes("window.__pre"));
  assert.ok(/map = new maplibregl\.Map/.test(app) && !/const map = new maplibregl/.test(app));
});

test("front-end rules: focus ring on search, reduced-motion sponsor strip, 24px targets, welcome never over details, live description, filters focus", () => {
  const css = read("public/styles.css"), app = read("public/app.js");
  assert.match(css, /\.search:focus-within\{outline:2\.5px solid var\(--focus\)/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.sp-win\{overflow-x:auto[^}]*\}[^@]*\.sp-track\.go\{animation:none/);
  assert.match(css, /\.panel:has\(>\.sponsor\) #back\{top:62px\}/);
  assert.match(css, /body\.detail-open #welcome\{display:none\}/);
  assert.match(app, /function dismissWelcome\(\)/); assert.match(app, /state\.detail \|\| \/\^#\[ehm\]-\/\.test\(location\.hash\)/);
  assert.match(app, /<div class="dlive" aria-live="polite">/);
  assert.match(app, /f\.focus\(\{ preventScroll: true \}\)/); assert.match(app, /e\.key !== "Tab"/); assert.match(app, /querySelector\("\[data-openfilters\]"\)/);
  assert.match(app, /const secure = \(u\)/); assert.match(app, /lbEl\.innerHTML[^\n]*secure\(q\.src\)/);
});

test("theme: every page's head script follows the device's dark setting as well as the clock, and keeps the manual override", () => {
  const pages = readdirSync("public").filter((f) => f.endsWith(".html")).map((f) => "public/" + f).concat("functions/_lib/shell.js", "public/admin/index.html");
  for (const f of pages) {
    const s = read(f); if (!s.includes("socal-theme")) continue;
    assert.ok(s.includes('matchMedia("(prefers-color-scheme: dark)").matches'), f + " follows the device setting");
    assert.ok(s.includes('localStorage.getItem("socal-theme")') && s.includes("socal-theme-until"), f + " keeps the manual choice");
  }
  assert.match(read("public/app.js"), /darkMQ\.addEventListener\("change"/);
});

test("list cards: small copies (320 wide), only the first two load at once, sizes declared", () => {
  const app = read("public/app.js");
  assert.ok(app.includes("photoImg(ph, i < 2, 320, 120)")); assert.ok(app.includes("photoImg({ src: photoUrl(ph[0]) }, i < 2, 320, 120)"));
  assert.match(app, /\(THUMBS && \/\^\\\/\(img\\\/events\|api\\\/photo\)\\\//);
  assert.match(app, /width="\$\{w\}" height="\$\{h\}"/);
});

test("index.html asks for every module app.js imports up front (modulepreload), with the same ?v= as the import lines", () => {
  const app = read("public/app.js"), html = read("public/index.html");
  const imported = [...app.matchAll(/^import [^\n]*?from "(\/[a-z-]+\.js\?v=[0-9a-z]+)"|^import "(\/[a-z-]+\.js\?v=[0-9a-z]+)"/gm)].map((m) => m[1] || m[2]);
  assert.ok(imported.length >= 8);
  for (const u of imported) assert.ok(html.includes(`<link rel="modulepreload" href="${u}">`), "missing modulepreload for " + u);
});
