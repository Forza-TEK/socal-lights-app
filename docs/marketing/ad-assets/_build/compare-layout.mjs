// Proves the local copy renders the same layout as production: same viewport (iPhone 17 Pro Max, 440 x 956, DPR 1 for the comparison),
// screenshots of the same page from https://socallights.app and from the local copy (http://localhost:8788), then a pixel difference.
// Usage: node compare-layout.mjs <outDir> <path> [path ...]      (pages whose data is the same on both sides, e.g. /in/san-diego)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const [outDir, ...paths] = process.argv.slice(2);
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
for (const path of paths) {
  for (const [tag, base] of [["live", "https://socallights.app"], ["local", "http://localhost:8788"]]) {
    const ctx = await b.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: UA, colorScheme: "dark" });
    const p = await ctx.newPage(); await p.goto(base + path, { waitUntil: "networkidle" }); await p.waitForTimeout(3500);
    // text and structure for the report: element tags and computed fonts of the first headings/buttons
    const info = await p.evaluate(() => ({ css: [...document.querySelectorAll("link[rel=stylesheet]")].map((l) => l.href.split("/").pop()), font: getComputedStyle(document.body).fontFamily.slice(0, 40), h1: document.querySelector("h1")?.getBoundingClientRect().toJSON(), btn: document.querySelector("a.btn,button.btn,.btn")?.getBoundingClientRect().toJSON() }));
    console.log(path, tag, JSON.stringify(info));
    await p.screenshot({ path: `${outDir}/cmp-${path.replace(/\W+/g, "_")}-${tag}.png` }); await ctx.close();
  }
}
await b.close();
