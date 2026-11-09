// Live-site screenshot of the map list with the 'This weekend' quick pick. Usage: node a10-weekend.mjs <out.png> [raw]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 768, height: 960 }, deviceScaleFactor: 1.40625, colorScheme: "dark" });
await p.clock.setFixedTime(new Date("2026-11-12T12:00:00-08:00")); // a Thursday: "This weekend" = Nov 14 and 15
await p.goto("https://socallights.app/", { waitUntil: "networkidle" });
await p.waitForTimeout(3000);
await p.addStyleTag({ content: '[class*="chat"],#chat-fab{display:none!important}#panel img{display:none!important}.rtpill,#preview{display:none!important}' });
await p.evaluate(() => { const a = [...document.querySelectorAll("a,button,span,div")].find((e) => e.children.length === 0 && /advertise here/i.test(e.textContent)); let c = a; while (c && c.parentElement && c.parentElement.id !== "phead" && c.parentElement.id !== "panel" && !c.parentElement.matches(".panel")) c = c.parentElement; if (c) c.style.display = "none"; });
const nt = p.getByText("No thanks"); try { await nt.first().click({ timeout: 4000 }); } catch {}
await p.getByRole("button", { name: "This weekend" }).click(); await p.waitForTimeout(2500);
await p.evaluate(() => {
  // hide the location prompt, and any price tag (no prices in ads)
  [...document.querySelectorAll("div,section,aside")].filter((e) => /See what is close to you/.test(e.textContent) && e.textContent.length < 120).forEach((e) => (e.style.display = "none"));
  document.querySelectorAll("#pbody span, #pbody div, #pbody p").forEach((e) => { if (e.children.length === 0 && /\$\d/.test(e.textContent)) e.style.display = "none"; });
  window.scrollTo(0, 0);
});
await p.screenshot({ path: process.argv[2] });
await b.close();
