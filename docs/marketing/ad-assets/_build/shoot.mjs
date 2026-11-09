// Generic live-site screenshot helper. Usage: node shoot.mjs <url> <out.png> <w> <h> <scale> [css-file] [js-file]
// css-file is injected before the shot (used to hide sponsor bars, chat button and private cards); js-file is evaluated in the page.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const [url, out, w, h, sc, css, js] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +sc, colorScheme: "dark", isMobile: true, hasTouch: true });
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
if (css) await p.addStyleTag({ content: readFileSync(css, "utf8") });
if (js) await p.evaluate(readFileSync(js, "utf8"));
await p.waitForTimeout(1500);
await p.screenshot({ path: out });
await b.close();
