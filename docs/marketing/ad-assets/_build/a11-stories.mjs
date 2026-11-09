// a11: 9:16 Story versions (1080x1920) of the still images. TRUE PHONE VIEW: a 390 x 693 css px page at 2.77x fills the frame.
// A dark headline bar (the ad's own headline) sits inside the safe area (starts at 250 px = 13%, text below 14%); a plain-text call to
// action sits at about y 1380 to 1480 px, above the bottom 20% (starts at 1536 px). No button shapes (no fake UI).
// Usage: BASE_LOCAL=http://localhost:8788 node a11-stories.mjs <outDir> [a02|a03e|a03r|a04|a05|a10]
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const LOCAL = process.env.BASE_LOCAL || "http://localhost:8788", HERE = new URL(".", import.meta.url).pathname;
const [outDir, only] = process.argv.slice(2);
const K = 1080 / 390;
const COOKIES = { u_org: process.env.COOKIE_ORG || "0zw1MnVsKHpPq9ycYlhpMUpmYuQrRiIQ" };
const HIDE = '[class*=scl-chat]{display:none!important}.tile img,.evimg{display:none!important}#sponsor{display:none!important}.tile{background-image:none!important;height:36px!important;min-height:0!important}.tile .when{top:6px!important}.rtpill{display:none!important}';
// overlay: headline bar (top, inside the safe area) and a plain call-to-action line above the bottom 20%
const overlay = (headline, cta) => `(() => { const k = ${K};
  const bar = document.createElement("div"); bar.style.cssText = "position:fixed;z-index:2147483000;left:0;right:0;top:" + 250 / k + "px;height:" + 290 / k + "px;background:rgba(11,13,18,.93);display:flex;align-items:center;justify-content:center;padding:0 " + 70 / k + "px;box-sizing:border-box";
  bar.innerHTML = '<div style="color:#fff;font:800 ' + 64 / k + 'px/1.1 \\'Plus Jakarta Sans\\',system-ui,sans-serif;letter-spacing:-.4px;text-align:center;text-wrap:balance">' + ${JSON.stringify(headline)} + "</div>"; document.body.appendChild(bar);
  const c = document.createElement("div"); c.style.cssText = "position:fixed;z-index:2147483000;left:0;right:0;top:" + 1370 / k + "px;height:" + 110 / k + "px;background:rgba(11,13,18,.93);display:flex;align-items:center;justify-content:center;padding:0 " + 60 / k + "px;box-sizing:border-box";
  c.innerHTML = '<div style="color:#ffd166;font:800 ' + 46 / k + 'px/1.1 \\'Plus Jakarta Sans\\',system-ui,sans-serif;text-align:center">' + ${JSON.stringify(cta)} + "</div>"; document.body.appendChild(c); const ex = document.getElementById("exlabel"); if (ex) ex.style.top = (545 / k) + "px"; })();`;
const J = {
  a02: { url: "https://socallights.app/in/newport-beach", css: "a02.css", js: "a02.js", head: "List your holiday event for free", cta: "Public events, by city: socallights.app", file: "a11-story-a02-city-page-9x16.png" },
  a03e: { url: LOCAL + "/c/maple-street-holiday-lights-2026", css: "a03.css", js: "a03.js", head: "Run a home lights contest, free", cta: "Example contest. Start at socallights.app", file: "a11-story-a03-contest-entry-9x16.png", announced: 0 },
  a03r: { url: LOCAL + "/c/maple-street-holiday-lights-2026", css: "a03.css", js: "a03.js", head: "Put your contest homes on a map", cta: "Example contest. Start at socallights.app", file: "a11-story-a03-contest-results-9x16.png", scroll: 430, announced: 1 },
  a05: { url: LOCAL + "/installer/bright-nights-lighting", css: "a03.css", js: "a05.js", head: "A free page for your lighting company", cta: "Example profile. Start at socallights.app", file: "a11-story-a05-installer-profile-9x16.png", scroll: 200 },
  a10: { url: "https://socallights.app/", head: "Holiday lights this weekend", cta: "Free map: socallights.app", file: "a11-story-a10-weekend-list-9x16.png", weekend: true },
};
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const [k, j] of Object.entries(J)) {
  if (only && only !== k) continue;
  const p = await b.newPage({ viewport: { width: 390, height: 693 }, deviceScaleFactor: K, colorScheme: "dark", isMobile: true, hasTouch: true });
  if (j.weekend) await p.clock.setFixedTime(new Date("2026-11-12T12:00:00-08:00"));
  await p.goto(j.url, { waitUntil: "networkidle" }); await p.waitForTimeout(3000);
  if (j.css) await p.addStyleTag({ content: readFileSync(HERE + j.css, "utf8") });
  if (j.js) await p.evaluate(readFileSync(HERE + j.js, "utf8"));
  if (j.weekend) {
    await p.addStyleTag({ content: HIDE });
    try { await p.getByText("No thanks").first().click({ timeout: 3000 }); } catch {}
    await p.click("#grab"); await p.waitForTimeout(1200);
    await p.getByRole("button", { name: "This weekend" }).click(); await p.waitForTimeout(2500);
    await p.evaluate(() => { document.querySelectorAll("article.item").forEach((a) => { const h = a.querySelector("h3"); if (h && /^\s*\d/.test(h.textContent)) a.style.display = "none"; }); [...document.querySelectorAll("div,section,aside")].filter((e) => /See what is close to you/.test(e.textContent) && e.textContent.length < 140).forEach((e) => (e.style.display = "none")); document.querySelectorAll("#pbody span,#pbody div,#pbody p").forEach((e) => { if (e.children.length === 0 && /\$\d/.test(e.textContent)) e.style.display = "none"; }); });
  }
  if (j.scroll) await p.evaluate((y) => window.scrollTo(0, y), j.scroll);
  await p.evaluate(overlay(j.head, j.cta)); await p.waitForTimeout(800);
  await p.screenshot({ path: `${outDir}/${j.file}` }); await p.close();
  console.log(k, j.file);
}
await b.close();
