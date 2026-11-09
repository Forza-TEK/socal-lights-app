// LIVE stills from https://socallights.app in a simulated iPhone 17 Pro Max, as Edge DevTools device mode does it:
// viewport 440 x 956 CSS px, deviceScaleFactor 3 (1320 x 2868 px), isMobile, hasTouch, iPhone 17 Pro Max user agent (Playwright preset), portrait.
// Real screens only: nothing hidden, reworded, mocked or faked (no fake status bar or Safari chrome); real clock and data.
// The whole captured frame is placed inside the ad canvas (nothing cropped): 4:5 feed 1080x1350 and 9:16 Story 1080x1920, blurred copy of the
// same screen as background, headline and call-to-action text on the background only (Story: below the top 14% safe line, nothing in the bottom 20% except the screen itself).
// Usage: node live-stills.mjs <adAssetsDir> [job ...]
import { createRequire } from "node:module";
import { writeFileSync, readFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const [root, ...only] = process.argv.slice(2), SITE = process.env.SITE || "https://socallights.app";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1"; // Playwright preset "iPhone 17 Pro Max" (viewport set to the full 440 x 956 screen)
const JOBS = {
  a03d: { dir: "a03-contest-screens", stem: "a03-contest-entry-page", url: "/c/maple-street-holiday-lights-2026", head: "Run a home lights contest", cta: "Start at socallights.app", story: "a11-story-a03-contest-entry-page-9x16.png" },
  a02: { dir: "a02-city-page", stem: "a02-city-page-los-angeles", url: "/in/los-angeles", scrollTo: "What's coming up", head: "List your holiday event for free", cta: "Free to list: socallights.app" },
  a03e: { dir: "a03-contest-screens", stem: "a03-contest-entry-page", url: "/c/holiday-home-lighting-contest-2026-5f5a0", head: "Run a home lights contest, free", cta: "Start at socallights.app" },
  a05: { dir: "a05-installer-profile", stem: "a05-installer-profile-lights-up-today", url: "/installer/lights-up-today", head: "A free page for your lighting company", cta: "Start at socallights.app" },
  a10: { dir: "a10-weekend-list", stem: "a10-weekend-list", url: "/", map: true, head: "Holiday lights this weekend", cta: "Free map: socallights.app" },
};
const FMT = { "4x5": { W: 1080, H: 1350, PH: 1150, y: 200, h: { y: 14, s: 46 }, c: { y: 96, s: 36 }, name: "4x5-1080x1350" },
              "9x16": { W: 1080, H: 1920, PH: 1416, y: 504, h: { y: 258, s: 46 }, c: { y: 392, s: 36 }, name: "9x16" } };
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const log = [];
for (const [id, j] of Object.entries(JOBS)) {
  if (only.length && !only.includes(id)) continue;
  const ctx = await b.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA, colorScheme: "dark" });
  const p = await ctx.newPage();
  await p.goto(SITE + j.url, { waitUntil: "networkidle" }); await p.waitForTimeout(5000);
  if (j.map) { try { await p.getByText("No thanks").first().click({ timeout: 4000, force: true }); await p.waitForTimeout(800); } catch {} await p.click("#grab"); await p.waitForTimeout(1200); await p.getByRole("button", { name: "This weekend" }).click(); await p.waitForTimeout(3500); }
  if (j.scrollTo) await p.evaluate((t) => { const e = [...document.querySelectorAll("h2")].find((x) => x.textContent.includes(t)); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 16); }, j.scrollTo);
  if (j.scroll) await p.evaluate((y) => window.scrollTo(0, y), j.scroll);
  await p.waitForTimeout(1200);
  await p.waitForTimeout(4000);
  const shot = `/tmp/_live-${id}.png`; await p.screenshot({ path: shot }); log.push(`${id} ${SITE + j.url} captured ${new Date().toISOString()} (1320x2868 source)`);
  const data = "data:image/png;base64," + readFileSync(shot).toString("base64");
  for (const [mode, F] of Object.entries(FMT)) {
    F.PW = Math.round((1080 * F.PH / 2314) / 2) * 2; F.PW = Math.round(F.PH * 1320 / 2868 / 2) * 2;
    const q = await b.newPage({ viewport: { width: F.W, height: F.H }, deviceScaleFactor: 1 });
    await q.setContent(`<!doctype html><meta charset=utf-8><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800&display=swap" rel="stylesheet"><style>html,body{margin:0;width:${F.W}px;height:${F.H}px;overflow:hidden;background:#0b0d12;font-family:"Plus Jakarta Sans",system-ui,sans-serif}
      .bg{position:absolute;inset:-60px;background:url(${data}) center/cover;filter:blur(40px) brightness(.55) saturate(.8)}
      .fg{position:absolute;left:${(F.W - F.PW) / 2}px;top:${F.y}px;width:${F.PW}px;height:${F.PH}px}
      .t{position:absolute;left:50px;right:50px;text-align:center;color:#fff;font-weight:800;line-height:1.1;text-wrap:balance}</style>
      <div class=bg></div><img class=fg src="${data}">
      <div class=t style="top:${F.h.y}px;font-size:${F.h.s}px">${j.head}</div>
      <div class=t style="top:${F.c.y}px;font-size:${F.c.s}px"><span style="background:#ffd166;color:#14161b;padding:6px 26px;border-radius:99px;display:inline-block">${j.cta}</span></div>`, { waitUntil: "networkidle" });
    await q.evaluate(() => document.fonts.ready); await q.waitForTimeout(400);
    const out = mode === "4x5" ? `${root}/${j.dir}/${j.stem}-4x5-1080x1350.png` : `${root}/a11-story-versions/${j.story || "a11-story-" + j.stem + "-9x16.png"}`;
    await q.screenshot({ path: out }); await q.close(); console.log(out);
  }
  await ctx.close();
}
await b.close();
writeFileSync(root + "/_build/live-stills-capture-times.txt", log.join("\n") + "\n");
