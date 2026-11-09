// Renders an HTML file to a PNG with the installed Chrome. Usage: node render-html.mjs <in.html> <out.png> <width> <height> [scale]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
import { resolve } from "node:path";
const [inp, out, w, h, sc] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(sc || 1) });
await p.goto("file://" + resolve(inp), { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);
await p.screenshot({ path: out });
await b.close();
