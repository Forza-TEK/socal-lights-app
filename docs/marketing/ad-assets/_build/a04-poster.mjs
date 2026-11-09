// a04: the app's OWN entry poster (public/printables.js, as drawn on the organizer dashboard "Share it" card) for the LOCAL demo contest
// (current origin/main, wrangler pages dev, local demo database, demo organizer cookie). The poster element is photographed as rendered, with no banner.
// Only two things differ from the app output: the QR code encodes https://socallights.app/contests?src=qr (the local contest does not exist on the live site)
// and the printed address line below the QR says socallights.app/contests to match it.
// The poster is placed whole (nothing cropped) on a blurred, darkened copy of itself with the ad headline above it.
// Usage: BASE=http://localhost:8788 COOKIE=<demo organizer session> node a04-poster.mjs <adAssetsDir>
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const BASE = process.env.BASE || "http://localhost:8788", SLUG = "maple-street-holiday-lights-2026", root = process.argv[2];
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA, colorScheme: "dark" });
await ctx.addCookies([{ name: "scl_session", value: process.env.COOKIE, url: BASE }]);
const p = await ctx.newPage();
await p.goto(`${BASE}/c/${SLUG}/manage`, { waitUntil: "networkidle" }); await p.waitForSelector(".pzprev .pz", { timeout: 20000 });
await p.evaluate(() => {
  const pz = document.querySelector(".pzprev .pz-poster"); const q = qrcode(0, "M"); q.addData("https://socallights.app/contests?src=qr"); q.make();
  pz.querySelector(".pz-qrin").innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  const u = pz.querySelector(".pz-url"); if (u) u.textContent = "socallights.app/contests";
  pz.scrollIntoView({ block: "center" });
  document.querySelectorAll("body *").forEach((e) => { const ps = getComputedStyle(e).position; if ((ps === "fixed" || ps === "sticky") && !pz.contains(e)) e.style.visibility = "hidden"; }); // page chrome that would float over the poster in the photo
});
await p.waitForTimeout(800);
const png = "/tmp/_poster.png"; await p.locator(".pzprev .pz-poster").screenshot({ path: png });
const data = "data:image/png;base64," + readFileSync(png).toString("base64");
const FMT = { "4x5": { W: 1080, H: 1350, PH: 1130, y: 205, h: { y: 14, s: 46 }, c: { y: 100, s: 36 }, out: `${root}/a04-qr-poster/a04-qr-poster-4x5-1080x1350.png` },
              "9x16": { W: 1080, H: 1920, PH: 1330, y: 520, h: { y: 258, s: 46 }, c: { y: 392, s: 36 }, out: `${root}/a11-story-versions/a11-story-a04-qr-poster-9x16.png` } };
for (const F of Object.values(FMT)) {
  F.PW = Math.round(F.PH * 8.5 / 11 / 2) * 2;
  const q = await b.newPage({ viewport: { width: F.W, height: F.H }, deviceScaleFactor: 1 });
  await q.setContent(`<!doctype html><meta charset=utf-8><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800&display=swap" rel="stylesheet"><style>html,body{margin:0;width:${F.W}px;height:${F.H}px;overflow:hidden;background:#0b0d12;font-family:"Plus Jakarta Sans",system-ui,sans-serif}
    .bg{position:absolute;inset:-60px;background:url(${data}) center/cover;filter:blur(40px) brightness(.5) saturate(.9)}
    .fg{position:absolute;left:${(F.W - F.PW) / 2}px;top:${F.y}px;width:${F.PW}px;height:${F.PH}px;box-shadow:0 10px 40px rgba(0,0,0,.6)}
    .t{position:absolute;left:50px;right:50px;text-align:center;color:#fff;font-weight:800;line-height:1.1;text-wrap:balance}</style>
    <div class=bg></div><img class=fg src="${data}"><div class=t style="top:${F.h.y}px;font-size:${F.h.s}px">Judges, awards and a QR poster</div>
    <div class=t style="top:${F.c.y}px;font-size:${F.c.s}px"><span style="background:#ffd166;color:#14161b;padding:6px 26px;border-radius:99px;display:inline-block">Start at socallights.app</span></div>`, { waitUntil: "networkidle" });
  await q.evaluate(() => document.fonts.ready); await q.waitForTimeout(400); await q.screenshot({ path: F.out }); await q.close(); console.log(F.out);
}
await b.close();
