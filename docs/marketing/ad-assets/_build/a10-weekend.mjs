// a10: live-site screenshot, TRUE PHONE VIEW (390 css px wide, mobile layout, 2.769x = 1080 px wide), 4:5 crop (1080x1350),
// map list with the 'This weekend' quick pick. Public events only: photos, price tags and street-number home cards are hidden.
// Usage: node a10-weekend.mjs <out.png>
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1080 / 390, colorScheme: "dark", isMobile: true, hasTouch: true });
await p.clock.setFixedTime(new Date("2026-11-12T12:00:00-08:00")); // a Thursday: "This weekend" = Nov 14 and 15
await p.goto("https://socallights.app/", { waitUntil: "networkidle" });
await p.waitForTimeout(3500);
await p.addStyleTag({ content: '[class*=scl-chat]{display:none!important}.tile img,.evimg{display:none!important}#sponsor{display:none!important}.tile{background-image:none!important;height:36px!important;min-height:0!important}.tile .when{top:6px!important}.rtpill{display:none!important}' });
const nt = p.getByText("No thanks"); try { await nt.first().click({ timeout: 3000 }); } catch {}
await p.click("#grab"); await p.waitForTimeout(1200);
await p.getByRole("button", { name: "This weekend" }).click(); await p.waitForTimeout(2500);
await p.evaluate(() => {
  document.querySelectorAll("article.item").forEach((a) => { const h = a.querySelector("h3"); if (h && /^\s*\d/.test(h.textContent)) a.style.display = "none"; });
  [...document.querySelectorAll("div,section,aside")].filter((e) => /See what is close to you/.test(e.textContent) && e.textContent.length < 140).forEach((e) => (e.style.display = "none"));
  document.querySelectorAll("#pbody span, #pbody div, #pbody p").forEach((e) => { if (e.children.length === 0 && /\$\d/.test(e.textContent)) e.style.display = "none"; });
  const pb = document.querySelector("#pbody"); if (pb) pb.scrollTop = 0;
});
await p.waitForTimeout(800);
await p.screenshot({ path: process.argv[2], clip: { x: 0, y: +(process.env.CLIPY || 0), width: 390, height: +(process.env.CLIPH || 487.5) } });
await b.close();
