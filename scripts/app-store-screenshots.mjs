// Regenerates the six App Store iPhone screenshots from the live site.
// Usage: node scripts/app-store-screenshots.mjs [--only=1,3] [--sizes=1206x2622,1179x2556] [--out=docs/app-store-screenshots] [--site=https://socallights.app]
// Needs Playwright (require('playwright')) with a Chromium build. Does not use the SoCalLightsApp user agent.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || d;
const SITE = arg("site", "https://socallights.app");
const OUT = arg("out", "docs/app-store-screenshots");
const ONLY = arg("only", "1,2,3,4,5,6").split(",").map(Number);
const SIZES = { "1206x2622": [402, 874], "1179x2556": [393, 852] };
const WANT = arg("sizes", Object.keys(SIZES).join(",")).split(",");
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const FAVS = ["disney", "knotts", "coc-irvine-spectrum-ice-rink", "tanaka"]; // four Orange County stops, all businesses/venues
const INSTALLER_ID = "377c55677a574f02"; // Lights Up Today (installer listing, business address)

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

async function settle(p, ms = 2500) { await p.waitForTimeout(ms); }
async function mapReady(p) {
  await p.waitForFunction(() => document.querySelector(".maplibregl-canvas"), null, { timeout: 30000 });
  await p.waitForTimeout(4000);
}
async function clean(p) {
  await p.evaluate(() => { try { localStorage.setItem("socal-welcomed", "1"); } catch {} document.querySelector("#welcome")?.remove(); });
  await p.addStyleTag({ content: "#welcome,.cookie,.cookies,[class*=consent]{display:none!important}.scl-chat-fab{display:none!important}" });
}

async function pickSuggestion(p, text, sel) {
  await p.fill("#q", text);
  await p.waitForSelector("#sugg " + sel, { timeout: 15000 });
  await p.click("#sugg " + sel + " >> nth=0");
  await p.waitForTimeout(1500);
}

for (const size of WANT) {
  const [w, h] = SIZES[size];
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA, locale: "en-US",
    geolocation: { latitude: 34.1478, longitude: -118.1445 }, permissions: ["geolocation"],
  });
  const open = async (hash = "", favs = []) => {
    const p = await ctx.newPage();
    await p.addInitScript((f) => { try { localStorage.setItem("socal-welcomed", "1"); localStorage.setItem("socal-nighthelp", "0"); localStorage.setItem("socal-favs", JSON.stringify(f)); } catch {} }, favs);
    await p.goto(SITE + "/" + hash, { waitUntil: "networkidle" });
    await clean(p);
    return p;
  };
  const shot = async (p, n, name) => { await p.screenshot({ path: `${OUT}/${n}-${name}-${size}.png` }); console.log("saved", n, name, size); await p.close(); };

  if (ONLY.includes(1)) { // map zoomed on Pasadena
    const p = await open();
    await mapReady(p);
    await pickSuggestion(p, "Pasadena", "[data-sc]");
    await mapReady(p);
    await shot(p, 1, "map-neighborhood");
  }
  if (ONLY.includes(2)) { // Disneyland pin card
    const p = await open();
    await mapReady(p);
    await pickSuggestion(p, "Holidays at the Disneyland", '[data-se="disney"]');
    await mapReady(p);
    await p.click("#back"); // leave the full detail: the map keeps the pin selected and shows its card
    await settle(p, 1500);
    await p.click("#grab"); // collapse the list so the map shows
    await settle(p, 2500);
    // tap the selected pin (the map centres on it) like a finger would; try a few heights around the middle of the visible map
    for (const y of [407, 395, 419, 383, 431, 371, 443, 359, 455].map((v) => Math.round(v * h / 874))) {
      await p.touchscreen.tap(Math.round(w / 2), y);
      await settle(p, 1200);
      if (await p.evaluate(() => { const e = document.querySelector("#preview"); return !!e && !e.hidden && e.offsetHeight > 0; })) break;
    }
    await settle(p, 2000);
    await shot(p, 2, "pin-card");
  }
  if (ONLY.includes(3)) { // Places list, panel expanded
    const p = await open();
    await mapReady(p);
    await pickSuggestion(p, "Pasadena", "[data-sc]");
    await mapReady(p);
    await p.click("#grab");
    await settle(p);
    await shot(p, 3, "places-list");
  }
  if (ONLY.includes(4)) { // Filters panel
    const p = await open();
    await mapReady(p);
    await p.click("[data-openfilters]");
    await settle(p);
    await shot(p, 4, "filters");
  }
  if (ONLY.includes(5)) { // Favorites with a 4-stop route
    const p = await open("", FAVS);
    await mapReady(p);
    await p.click('#bnav [data-tab="plan"]');
    await settle(p, 4000);
    await shot(p, 5, "favorites-route");
  }
  if (ONLY.includes(6)) { // installer listing with photos
    const p = await open("#m-" + INSTALLER_ID);
    await mapReady(p);
    await shot(p, 6, "home-photos");
  }
  await ctx.close();
}
await browser.close();
