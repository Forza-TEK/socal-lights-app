// 2026-11-16 audit (iPhone app, performance, accessibility, SEO), the web-side fixes that apply to the site and the app at once.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { onRequest as middleware, isPagesDevHost } from "../functions/_middleware.js";
import { CSP_REPORT_ONLY } from "../functions/_lib/secheaders.js";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const git = (...a) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 }).trim();

test("safe area: one shared rule for every page except the map; sticky bars and the app frame add the inset themselves", () => {
  const t = read("public/tokens.css");
  assert.match(t, /--sat:env\(safe-area-inset-top,0px\)/);
  assert.match(t, /body:where\(:not\(:has\(>#map\)\)\)\{padding-top:var\(--sat\);/, "the rule is scoped away from the map page (its body holds <main id=\"map\">)");
  const a = read("public/appshell.css");
  assert.match(a, /\.sh-top\{position:sticky;top:0;[^}]*padding:calc\(14px \+ var\(--sat\)\)/, "Profile, Help and Tutorials top bar");
  assert.match(a, /\.sh-side\{position:sticky;[^}]*padding:calc\(18px \+ var\(--sat\)\)/);
  assert.match(read("public/offline.html"), /padding:calc\(24px \+ env\(safe-area-inset-top,0px\)\)/);
  assert.match(read("public/contest.css"), /\.ballot\{position:sticky;top:env\(safe-area-inset-top,0px\)/, "a sticky strip must stop below the status bar");
  for (const f of ["add", "add-event", "add-house", "profile", "pricing", "contests", "privacy", "terms", "feature", "404"]) assert.match(read(`public/${f}.html`), /\/tokens\.css\?v=/, f);
  assert.match(read("functions/_lib/shell.js"), /\/tokens\.css\?v=/, "city, event and installer pages");
});

test("the map page keeps its touch handling: pinch guard intact, nothing new above the map, map styles untouched", () => {
  const css = read("public/styles.css"), html = read("public/index.html");
  assert.match(css, /\.searchrow\{pointer-events:none\}\.searchrow>\*\{pointer-events:auto\}/, "the 2026-11-14 pinch fix");
  assert.match(read("tests/css-tokens.test.mjs"), /searchrow\\\{pointer-events:none/, "and its own guard test still exists");
  assert.ok(!/(^|[^.\w-])body\{[^}]*padding-top/.test(css), "styles.css (map) adds no body padding");
  assert.match(html, /<main id="map"[^>]*><\/main>/);
  const pre = html.slice(html.indexOf("<body>"), html.indexOf('<main id="map"')).replace(/<script[\s\S]*?<\/script>/g, "");
  assert.ok(!/position:fixed[^"']*(left:0|inset:0)/.test(pre), "no full-width fixed overlay before the map in the markup");
  const searchrow = [...css.matchAll(/(^|\n)\s*\.searchrow\s*\{([^}]*)\}/g)].map((m) => m[2]).join(";");
  assert.ok(!/position:fixed[^;]*;[^]*(width:100%|inset:0)/.test(searchrow) || /pointer-events:none/.test(searchrow), "the search row is not a full-width box that takes touches");
  let base = ""; try { base = git("show", "origin/main:public/styles.css"); } catch {}
  if (base) {
    const pick = (s) => s.split("\n").filter((l) => /\.searchrow|#map\b|\.topbar|\.maplibregl-ctrl|\.panel\{/.test(l)).join("\n");
    // the zoom buttons may add the top safe area (the notch / Dynamic Island in the app) to their offset; nothing else about these rules may change
    const plain = (t) => t.replace(/(\.maplibregl-ctrl-top-right\{top:)calc\(env\(safe-area-inset-top,0px\) \+ (\d+px)\)/g, "$1$2");
    assert.equal(plain(pick(css)), pick(base), "rules for the search row, map, top bar and panel are unchanged since origin/main");
  }
});

test("in the app: no Google wording, no price pages, no Advertise here; the website keeps them", () => {
  const f = read("public/footer.js");
  assert.match(f, /classList\.add\("in-app"\)/);
  assert.match(f, /pricing\|sponsor\|sponsor-invite\|partner\|feature\|contest-pass/);
  assert.match(f, /web-only/);
  assert.match(read("public/tokens.css"), /html\.in-app \.g-or,html\.in-app \.web-only\{display:none!important\}/);
  for (const p of ["add-event", "add-house", "add-contest"]) assert.match(read(`public/${p}.html`), /Sign in with <span class="g-or">Google or <\/span>an emailed code\./, p);
  assert.match(read("public/feature.html"), /\$\{inApp \? "" : "Google or "\}an emailed 6-digit code/);
  assert.match(read("public/banner.js"), /EMPTY = \/SoCalLightsApp\/\.test\(navigator\.userAgent\) \? ""/);
  assert.match(read("public/chat.js"), /SoCalLightsApp[^]*"\/pricing"/);
  for (const p of ["contest-pass", "feature", "sponsor", "partner"]) assert.match(read(`functions/api/${p}/checkout.js`), /SoCalLightsApp/, "the server still refuses checkout from the app");
});

test("Help: the install articles say something true inside the app (checked in the page, because the page is cached for everyone)", () => {
  const src = read("functions/help/[slug].js");
  assert.match(src, /a\.slug === "install-the-app" \|\| a\.slug === "no-add-to-home-screen"/);
  assert.match(src, /SoCalLightsApp[^]*You are already using the app/);
  assert.match(src, /"cache-control": "public, max-age=60"/, "one cached page for everyone, so the check cannot be on the server");
});

test("SEO: canonical, og and twitter tags on /privacy /terms /feature /add-event /add", () => {
  for (const [p, path] of [["privacy", "/privacy"], ["terms", "/terms"], ["feature", "/feature"], ["add-event", "/add-event"], ["add", "/add"]]) {
    const h = read(`public/${p}.html`);
    assert.ok(h.includes(`<link rel="canonical" href="https://socallights.app${path}">`), p + " canonical");
    for (const k of ['property="og:title"', 'property="og:description"', 'property="og:url"', 'property="og:image"', 'name="twitter:card"', 'name="twitter:image"']) assert.ok(h.includes(k), p + " " + k);
    assert.equal((h.match(/rel="canonical"/g) || []).length, 1, p + " one canonical");
  }
});

test("the pages.dev address is noindex, for static files (_headers) and Function responses (middleware); socallights.app is not", async () => {
  const h = read("public/_headers");
  assert.match(h, /https:\/\/:project\.pages\.dev\/\*\n  X-Robots-Tag: noindex/);
  assert.match(h, /https:\/\/:version\.:project\.pages\.dev\/\*\n  X-Robots-Tag: noindex/);
  assert.equal(isPagesDevHost(new Request("https://socal-lights.pages.dev/")), true);
  assert.equal(isPagesDevHost(new Request("https://socallights.app/")), false);
  const ok = async () => new Response("x");
  assert.equal((await middleware({ request: new Request("https://socal-lights.pages.dev/in/irvine"), next: ok, env: {} })).headers.get("X-Robots-Tag"), "noindex");
  assert.equal((await middleware({ request: new Request("https://socallights.app/in/irvine"), next: ok, env: {} })).headers.get("X-Robots-Tag"), null);
});

test("CSP stays report-only but no longer lists the Cloudflare beacon as a violation; the path to enforcement is written down", () => {
  assert.match(CSP_REPORT_ONLY, /script-src [^;]*https:\/\/static\.cloudflareinsights\.com/);
  assert.match(CSP_REPORT_ONLY, /connect-src [^;]*https:\/\/cloudflareinsights\.com/);
  assert.doesNotMatch(read("public/_headers"), /^\s*Content-Security-Policy:/m);
  assert.match(read("docs/runbooks/csp.md"), /enforc/i);
});

test("HEAD works on /sitemap.xml and /api/events; the tutorial video is small and cached for a week", () => {
  assert.match(read("functions/sitemap.xml.js"), /export async function onRequestHead/);
  assert.match(read("functions/api/events.js"), /export async function onRequestHead/);
  assert.ok(statSync(new URL("../public/tutorials/find-map.mp4", import.meta.url)).size < 8e6, "find-map.mp4 was 16 MB");
  assert.match(read("public/_headers"), /\/tutorials\/\*\.mp4\n  Cache-Control: public, max-age=604800/);
});

test("the search field has a visible focus ring (audit M12: already in place; pinned here)", () => {
  assert.match(read("public/styles.css"), /\.search:focus-within\{outline:2\.5px solid var\(--focus\)/);
});
