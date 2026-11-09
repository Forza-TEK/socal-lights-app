// Renders the app's own entry poster (public/printables.js) for the LOCAL demo contest as a 1080x1350 PNG, labelled Example.
// The QR is regenerated to point at https://socallights.app/contests (a real public page), not at the local server.
// Usage: BASE=http://localhost:8788 COOKIE=<u_org session> node a04-poster.mjs <out.png> [poster|sign]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const BASE = process.env.BASE || "http://localhost:8788", SLUG = "maple-street-holiday-lights-2026", kind = process.argv[3] || "poster";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1, colorScheme: "dark" });
await ctx.addCookies([{ name: "scl_session", value: process.env.COOKIE, url: BASE }]);
const p = await ctx.newPage();
await p.goto(`${BASE}/c/${SLUG}/manage`, { waitUntil: "networkidle" });
await p.waitForSelector(".pzprev .pz", { timeout: 20000 });
await p.evaluate((kind) => {
  const pz = [...document.querySelectorAll(".pzprev .pz")].find((x) => x.classList.contains("pz-" + kind));
  const q = qrcode(0, "M"); q.addData("https://socallights.app/contests?src=qr"); q.make();
  pz.querySelector(".pz-qrin").innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  const u = pz.querySelector(".pz-url"); if (u) u.textContent = "socallights.app/contests";
  const html = pz.outerHTML;
  document.body.innerHTML = `<div id="stage" style="position:fixed;inset:0;background:#0b0d12;display:flex;flex-direction:column;align-items:center;font-family:'Plus Jakarta Sans',system-ui,sans-serif">
    <div style="margin-top:24px;background:#ffd166;color:#14161b;font-weight:800;font-size:34px;padding:10px 34px;border-radius:99px">Example poster</div>
    <div style="width:880px;margin-top:22px;box-shadow:0 10px 40px rgba(0,0,0,.6)">${html}</div></div>`;
  document.body.style.margin = "0"; document.body.style.overflow = "hidden";
}, kind);
await p.waitForTimeout(800);
await p.screenshot({ path: process.argv[2] });
await b.close();
