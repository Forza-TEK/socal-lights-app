// Phone screen recorder for the ad videos. Chrome screencast at device pixels (360x700 page at 2x = 720x1400 frames),
// an in-page finger/tap highlight, timed captions. Writes <work>/<id>/frames/*.jpg, frames.txt (ffconcat) and timeline.json.
// Compose with compose.mjs. Live site by default (read-only); BASE=http://localhost:8788 for the local demo server.
import { createRequire } from "node:module";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Hide third-party event photos (the live list hot-links organizers' photos, some with people), the paid sponsor bar, the assistant button,
// and any card whose title starts with a street number (private homes the sweeps found). Adds the finger and tap ripple.
const INIT = `(() => {
  const css = ".tile img,.evimg{display:none!important}#sponsor{display:none!important}[class*=scl-chat]{display:none!important}" +
  "#__f{position:fixed;z-index:2147483647;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.35);border:3px solid rgba(255,255,255,.95);box-shadow:0 2px 10px rgba(0,0,0,.5);pointer-events:none;transition:transform .12s,background .12s}" +
  "#__f.dn{transform:scale(.7);background:rgba(255,107,107,.6)}" +
  ".__rip{position:fixed;z-index:2147483646;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:4px solid #ff6b6b;pointer-events:none;animation:__r .6s ease-out forwards}@keyframes __r{to{transform:scale(4);opacity:0}}";
  const add = () => { if (!document.head || !document.body) return setTimeout(add, 20);
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const f = document.createElement("div"); f.id = "__f"; f.style.display = "none"; document.body.appendChild(f); };
  add();
  const sweep = () => {
    document.querySelectorAll("article.item").forEach((a) => { const h = a.querySelector("h3"); if (h && /^\\s*\\d/.test(h.textContent)) a.style.display = "none"; });
    document.querySelectorAll("div,section,aside").forEach((e) => { const t = e.textContent.trim(); if (/^Plan your drive in/.test(t) && t.length < 260 && !e.querySelector("#pbody")) e.style.display = "none"; });
    document.querySelectorAll("button,a").forEach((b) => { if (/ask socal lights/i.test(b.getAttribute("aria-label") || "")) b.style.display = "none"; });
  };
  setInterval(sweep, 300);
  new MutationObserver(sweep).observe(document, { childList: true, subtree: true, characterData: true });
  window.__glide = (x, y, ms) => new Promise((res) => { const f = document.getElementById("__f"); f.style.display = "block";
    const sx = parseFloat(f.dataset.x ?? x), sy = parseFloat(f.dataset.y ?? y + 120), t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const cx = sx + (x - sx) * e, cy = sy + (y - sy) * e; f.style.left = cx + "px"; f.style.top = cy + "px"; f.dataset.x = cx; f.dataset.y = cy; if (k < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step); });
  window.__tap = (x, y) => { const f = document.getElementById("__f"); f.classList.add("dn"); const r = document.createElement("div"); r.className = "__rip"; r.style.left = x + "px"; r.style.top = y + "px"; document.body.appendChild(r); setTimeout(() => { r.remove(); f.classList.remove("dn"); }, 600); };
})();`;

export async function record(id, opts, run) {
  const BASE = process.env.BASE || "https://socallights.app", WORK = process.env.WORK, dir = `${WORK}/${id}`;
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir + "/frames", { recursive: true });
  const br = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const ctx = await br.newContext({ viewport: { width: 390, height: opts.vh }, deviceScaleFactor: 1080 / 390, colorScheme: "dark", isMobile: true, hasTouch: true,
    permissions: ["geolocation"], geolocation: opts.geo || { latitude: 33.6162, longitude: -117.8745 } }); // Fashion Island, Newport Beach: a public shopping centre, not a person's position
  if (opts.clock) await ctx.clock.setFixedTime(new Date(opts.clock));
  if (opts.cookie) await ctx.addCookies([{ name: "scl_session", value: opts.cookie, url: BASE }]);
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  for (const r of opts.routes || []) await ctx.route(r.url, (x) => x.fulfill({ json: r.json }));
  await page.goto(BASE + (opts.start || "/"), { waitUntil: "networkidle" });
  await sleep(opts.settle ?? 4000);
  if (opts.prep) await opts.prep(page);
  const cdp = await ctx.newCDPSession(page), frames = []; let n = 0;
  cdp.on("Page.screencastFrame", (f) => { const i = n++; frames.push({ i, t: f.metadata.timestamp }); writeFileSync(`${dir}/frames/${i}.jpg`, Buffer.from(f.data, "base64")); cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1080, maxHeight: Math.round(opts.vh * 1080 / 390), everyNthFrame: 1 });
  await sleep(300);
  const start = Date.now() / 1000, caps = []; let cur = null;
  const T = () => Date.now() / 1000 - start;
  const cap = (text) => { if (cur) cur.t1 = T(); cur = text ? { t0: T(), text } : null; if (cur) caps.push(cur); };
  const h = {
    cap, T, page,
    async glideTo(x, y, ms = 650) { await page.evaluate(([x, y, ms]) => window.__glide(x, y, ms), [x, y, ms]); },
    async tap(sel, o = {}) {
      const tt = Date.now(); const lg = (m) => process.env.DBG && console.log(m, Date.now() - tt);
      const loc = typeof sel === "string" ? page.locator(sel).first() : sel; if (o.scroll) await loc.scrollIntoViewIfNeeded().catch(() => {});
      lg('scrolled'); const b = await loc.boundingBox(), x = b.x + b.width * (o.fx ?? .5), y = b.y + b.height * (o.fy ?? .5);
      lg('bbox'); await h.glideTo(x, y, o.ms ?? 650); lg('glided'); await sleep(o.pre ?? 150);
      await page.evaluate(([x, y]) => window.__tap(x, y), [x, y]); await page.touchscreen.tap(x, y); lg('tapped'); await sleep(o.after ?? 900);
    },
    async type(sel, text, o = {}) { await h.tap(sel, { after: 150 }); await page.locator(sel).first().pressSequentially(text, { delay: o.delay ?? 45 }); await sleep(o.after ?? 400); },
    async wait(ms) { await sleep(ms); },
  };
  await run(h);
  const total = T(); if (cur) cur.t1 = total;
  await cdp.send("Page.stopScreencast"); await br.close();
  // ffconcat list: every frame shown until the next one, times relative to the start mark
  const f0 = frames.findIndex((f) => f.t >= start - 0.05); const fr = frames.slice(Math.max(0, f0 - 1));
  const lines = []; fr.forEach((f, k) => { const t = Math.max(0, f.t - start), nx = k + 1 < fr.length ? Math.max(0, fr[k + 1].t - start) : total; lines.push(`file 'frames/${f.i}.jpg'`, `duration ${Math.max(0.001, nx - t).toFixed(4)}`); });
  lines.push(`file 'frames/${fr[fr.length - 1].i}.jpg'`);
  writeFileSync(`${dir}/frames.txt`, lines.join("\n")); writeFileSync(`${dir}/timeline.json`, JSON.stringify({ total, caps, headline: opts.headline }, null, 1));
  console.log(id, "frames", frames.length, "total", total.toFixed(1), "s");
}
