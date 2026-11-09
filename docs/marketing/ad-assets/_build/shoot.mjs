// Generic screenshot helper. Usage: node shoot.mjs <url> <out.png> <w> <h> <scale> [css-file] [js-file]
// css-file is injected before the shot (hides the sponsor bar, chat button, adds labels); js-file is evaluated in the page.
// Phone view for ads: w=390 h=844 sc=2.76923 and CLIPY=<css y> (4:5 crop of 390 x 487.5 css px = 1080x1350).
// Env: COOKIE = scl_session value (local demo users only), SCROLL = scrollTo y before the shot, FULL=1 full page.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const [url, out, w, h, sc, css, js] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +sc, colorScheme: "dark", isMobile: true, hasTouch: true });
if (process.env.COOKIE) await p.context().addCookies([{ name: "scl_session", value: process.env.COOKIE, url: new URL(url).origin }]);
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
if (css) await p.addStyleTag({ content: readFileSync(css, "utf8") });
if (js) await p.evaluate(readFileSync(js, "utf8"));
if (process.env.SCROLL) await p.evaluate((y) => window.scrollTo(0, y), +process.env.SCROLL);
await p.waitForTimeout(1500);
await p.screenshot({ path: out, fullPage: process.env.FULL === "1", ...(process.env.CLIPY ? { clip: { x: 0, y: +process.env.CLIPY, width: +w, height: +(process.env.CLIPH || 487.5) } } : {}) });
await b.close();
