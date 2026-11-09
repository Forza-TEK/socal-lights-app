// LIVE stills, exactly as the site renders: real phone viewport 430 x 932 css px (iPhone Pro Max), 2.5116x so the width is 1080 px.
// Nothing is hidden, reworded or mocked; real clock, real data. 4:5 = top 537.5 css px of the viewport (after scrolling), 9:16 = top 764 css px.
// The Story versions add an opaque headline bar in the top 540 px (text below the 14% safe line) and one plain call-to-action line above the bottom 20%.
// Usage: node live-stills.mjs <outRoot> [job ...]      outRoot = docs/marketing/ad-assets
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const [root, ...only] = process.argv.slice(2), K = 1080 / 430, SITE = "https://socallights.app";
const JOBS = {
  a02: { dir: "a02-city-page", stem: "a02-city-page-san-diego", url: "/in/san-diego", scrollTo: "What's coming up", head: "List your holiday event for free", cta: "Free to list: socallights.app" },
  a03e: { dir: "a03-contest-screens", stem: "a03-contest-entry-page", url: "/c/holiday-home-lighting-contest-2026-5f5a0", scroll4: 0, scroll9: 0, head: "Run a home lights contest, free", cta: "Start at socallights.app" },
  a05: { dir: "a05-installer-profile", stem: "a05-installer-profile-lights-up-today", url: "/installer/lights-up-today", scroll4: 0, scroll9: 0, head: "A free page for your lighting company", cta: "Start at socallights.app" },
  a10: { dir: "a10-weekend-list", stem: "a10-weekend-list", url: "/", map: true, head: "Holiday lights this weekend", cta: "Free map: socallights.app" },
};
const overlay = (headline, cta) => `(() => { const k = ${K}, f = "'Plus Jakarta Sans',system-ui,sans-serif";
  const m = (top, h, txt, css, pad) => { const d = document.createElement("div"); d.style.cssText = "position:fixed;z-index:2147483000;left:0;right:0;background:#0b0d12;display:flex;align-items:center;justify-content:center;box-sizing:border-box;top:" + top / k + "px;height:" + h / k + "px;padding:" + pad; d.innerHTML = '<div style="text-align:center;font:800 ' + css + 'px/1.1 ' + f + '">' + txt + "</div>"; document.body.appendChild(d); return d; };
  m(0, 540, ${JSON.stringify(headline)}, 64 / k, 250 / k + "px " + 70 / k + "px 0").firstChild.style.color = "#fff";
  m(1370, 110, ${JSON.stringify(cta)}, 46 / k, "0 " + 60 / k + "px").firstChild.style.color = "#ffd166"; })();`;
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const meta = [];
for (const [id, j] of Object.entries(JOBS)) {
  if (only.length && !only.includes(id)) continue;
  for (const mode of ["4x5", "9x16"]) {
    const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: K, colorScheme: "dark", isMobile: true, hasTouch: true });
    await p.goto(SITE + j.url, { waitUntil: "networkidle" }); await p.waitForTimeout(4500);
    if (j.map) { try { await p.getByText("No thanks").first().click({ timeout: 4000, force: true }); await p.waitForTimeout(800); } catch {} await p.click("#grab"); await p.waitForTimeout(1200); await p.getByRole("button", { name: "This weekend" }).click(); await p.waitForTimeout(3000); }
    const sc = mode === "4x5" ? j.scroll4 : j.scroll9; if (sc) await p.evaluate((y) => window.scrollTo(0, y), sc);
    if (j.scrollTo) await p.evaluate((t) => { const e = [...document.querySelectorAll("h2")].find((x) => x.textContent.includes(t)); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 16); }, j.scrollTo);
    if (mode === "9x16") await p.evaluate(overlay(j.head, j.cta));
    await p.waitForTimeout(1200);
    const h = mode === "4x5" ? 537.5 : 764, name = mode === "4x5" ? `${j.stem}-4x5-1080x1350.png` : `a11-story-${j.stem}-9x16.png`;
    const out = (mode === "4x5" ? `${root}/${j.dir}/` : `${root}/a11-story-versions/`) + name;
    await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 430, height: h } }); await p.close();
    console.log(out); meta.push(out + " captured " + new Date().toISOString());
  }
}
await b.close();
writeFileSync(root + "/_build/live-stills-capture-times.txt", meta.join("\n") + "\n");
