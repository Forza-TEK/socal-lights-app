// Records one narrated tutorial video against a LOCAL dev server (never the live site).
// A spec is { id, group, title, sub, next:{title,sub}, phone, cookie, steps:[{say, cap, card, do(page,h), poster}] }.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "playwright");
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
const BASE = process.env.BASE || "http://localhost:8788";
const VOICE = process.env.VOICE, WORK = process.env.WORK || "/tmp/tut", OUT = process.env.OUT || "public/tutorials";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dur = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const OVERLAY = `(() => {
  const st = document.createElement("style"); st.textContent = "#__cur{position:fixed;z-index:2147483647;left:0;top:0;width:22px;height:22px;pointer-events:none;transition:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}#__hl{position:fixed;z-index:2147483640;border:4px solid #e8590c;border-radius:12px;box-shadow:0 0 0 7px rgba(232,89,12,.28);pointer-events:none;animation:__pulse 1s ease-in-out infinite}@keyframes __pulse{50%{box-shadow:0 0 0 12px rgba(232,89,12,.12)}}#__rip{position:fixed;z-index:2147483646;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:3px solid rgba(232,90,10,.9);pointer-events:none;animation:__rip .6s ease-out forwards}@keyframes __rip{to{transform:scale(3.6);opacity:0}}#__mail{position:fixed;inset:0;z-index:2147483643;background:#eef0f3;overflow:auto;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#1f1d1a}#__mail .bar{display:flex;align-items:center;gap:12px;padding:14px 28px;background:#fff;border-bottom:1px solid #dcdfe4;font-size:15px;color:#555}#__mail .bar b{font-size:17px;color:#1f1d1a}#__mail .hd{max-width:760px;margin:0 auto;padding:22px 20px 10px}#__mail .hd h2{margin:0 0 12px;font-size:26px;font-weight:500}#__mail .who{display:flex;gap:12px;align-items:center;font-size:15px}#__mail .av{width:42px;height:42px;border-radius:50%;background:#e0560a;color:#fff;display:grid;place-items:center;font-weight:600}#__mail .who small{display:block;color:#6b6760;font-size:13px}#__mail .body{max-width:760px;margin:0 auto 40px;padding:0 20px;zoom:.86}#__mail .body .plain{background:#fff;border-radius:12px;padding:28px 32px;font:16px/1.7 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}#__mail .body .plain a{color:#1a56d6}#__mail .tag{margin-left:auto;font-size:12px;color:#8a8680}#__cap{position:fixed;z-index:2147483645;left:50%;bottom:__BOT__px;transform:translateX(-50%);max-width:92vw;background:rgba(28,28,34,.94);color:#fff;font:600 22px/1.25 'Plus Jakarta Sans',system-ui,sans-serif;padding:12px 22px;border-radius:12px;text-align:center;pointer-events:none}#__card{position:fixed;inset:0;z-index:2147483644;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px;padding:24px;background:radial-gradient(ellipse at 30% 25%,#fbf1e6 0,#fffaf5 38%,#fff 75%);font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#1f1d1a}#__card img{width:96px;height:96px;border-radius:50%;margin-bottom:12px}#__card .wm{font-weight:600;font-size:26px;margin-bottom:22px}#__card .wm b{color:#e0560a;font-weight:600}#__card .ey{font-size:15px;letter-spacing:.2em;text-transform:uppercase;color:#c8324f;font-weight:500}#__card h1{font-weight:300;font-size:60px;line-height:1.12;margin:10px 0;max-width:1000px}#__perm{position:fixed;z-index:2147483642;left:24px;top:84px;width:360px;background:#fff;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,.28);padding:18px 18px 14px;font:15px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:#202124}#__perm b{display:block;font-size:15px;margin-bottom:4px}#__perm p{margin:0 0 14px;color:#5f6368}#__perm .row{display:flex;gap:8px;justify-content:flex-end}#__perm button{font:600 14px system-ui;padding:9px 18px;border-radius:999px;border:1px solid #dadce0;background:#fff;color:#1a56d6}#__perm .allow{background:#1a56d6;color:#fff;border-color:#1a56d6}#__card .ub{margin:26px 0 8px;display:inline-flex;align-items:center;gap:14px;padding:18px 34px;border-radius:999px;background:#fff;border:2px solid #d9d3c8;box-shadow:0 6px 24px rgba(0,0,0,.08);font-size:46px;font-weight:500;color:#1f1d1a}#__card .ub svg{width:34px;height:34px}#__card ul{list-style:none;margin:18px 0 0;padding:0;text-align:left;font-size:25px;line-height:1.5;color:#3b3935;max-width:760px}#__card li{padding-left:34px;position:relative;margin:8px 0}#__card li:before{content:'';position:absolute;left:0;top:11px;width:16px;height:16px;border-radius:50%;background:#e0560a}#__card p{font-size:23px;color:#6b6760;margin:0;max-width:900px}";
  const add = () => { if (!document.head) return setTimeout(add, 20); document.head.appendChild(st); };
  add();
  const mk = () => { if (!document.body) return setTimeout(mk, 20); if (document.getElementById("__cur")) return; const c = document.createElement("div"); c.id = "__cur"; c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l14 9-6 1.5L8 19z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>'; c.style.left = "-40px"; document.body.appendChild(c); };
  mk();
  const fixUrl = () => { try { const w = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.includes("localhost:")) n.nodeValue = n.nodeValue.replace(/localhost:\\d+/g, "socallights.app"); document.querySelectorAll("input,textarea").forEach((e) => { if (/localhost:\\d+/.test(e.value || "")) e.value = e.value.replace(/localhost:\\d+/g, "socallights.app"); }); } catch (e) {} };
  setInterval(fixUrl, 250);
  // The caption never sits on the pointer: when the pointer comes near it, the caption hops to the other edge of the screen
  let cx = -999, cy = -999, side = "bottom";
  const place = () => { const c = document.getElementById("__cap"); if (!c) return; const r = c.getBoundingClientRect(), m = 70; if (window.__mobplace) { side = cy > innerHeight * 0.5 ? "top" : "bottom"; } else if (cx > r.left - m && cx < r.right + m && cy > r.top - m && cy < r.bottom + m) { side = side === "bottom" ? "top" : "bottom"; } if (side === "top") { c.style.top = "72px"; c.style.bottom = "auto"; } else { c.style.top = "auto"; c.style.bottom = "__BOT__px"; } };
  setInterval(place, 100);
  addEventListener("mousemove", (e) => { cx = e.clientX; cy = e.clientY; const c = document.getElementById("__cur"); if (c) { c.style.left = e.clientX - 3 + "px"; c.style.top = e.clientY - 2 + "px"; } place(); }, true);
  addEventListener("mousedown", (e) => { const r = document.createElement("div"); r.id = "__rip"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px"; document.body.appendChild(r); setTimeout(() => r.remove(), 700); }, true);
})();`;
class Helper {
  constructor(page) { this.page = page; this.x = 200; this.y = 200; }
  async move(sel, opt = {}) { if (MOB && typeof sel === "string") sel = MSEL(sel); if (MOB && typeof sel === "string" && /data-k=/.test(sel) && !(await this.page.locator(sel).count()) && (await this.page.locator("#sh-more").count())) await this.click("#sh-more", { after: 900 }); // phone dashboards keep most sections behind More
    if (MOB && typeof sel === "string" && /^#pbody|^\.panel|data-route|data-nroute/.test(sel) && await this.page.evaluate(() => { const p = document.querySelector(".panel"); return !!p && p.getBoundingClientRect().top > innerHeight * 0.45; })) await this.click('#bnav [data-tab="events"]', { after: 1200 }); // the list sheet is down: raise it
    const loc = typeof sel === "string" ? this.page.locator(sel).first() : sel; await loc.scrollIntoViewIfNeeded().catch(() => {}); if (MOB) await loc.evaluate((el) => { const r = el.getBoundingClientRect(); if (r.bottom > innerHeight - 110 || r.top < 60) el.scrollIntoView({ block: "center" }); }).catch(() => {}); /* phone: keep the target clear of the sticky Next bar */ let b = await loc.boundingBox(); if (MOB && b && b.y > 600 && !/bnav/.test(String(sel)) && (await this.page.locator("#bnav").count())) { await this.click('#bnav [data-tab="events"]', { after: 1200 }); b = await loc.boundingBox(); } if (!b) throw new Error("no box for " + sel);
    await this.page.evaluate((b) => { let r = document.getElementById("__hl"); if (!r) { r = document.createElement("div"); r.id = "__hl"; document.body.appendChild(r); } const g = 6; r.style.left = b.x - g + "px"; r.style.top = b.y - g + "px"; r.style.width = b.width + 2 * g + "px"; r.style.height = b.height + 2 * g + "px"; }, b);
    const tx = b.x + (opt.fx ?? 0.5) * b.width, ty = b.y + (opt.fy ?? 0.5) * b.height; const sx = this.x, sy = this.y, n = Math.hypot(tx - sx, ty - sy) < 6 ? 0 : 38; // already pointing at it: no second glide
    for (let i = 1; i <= n; i++) { const t = i / n, e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; await this.page.mouse.move(sx + (tx - sx) * e, sy + (ty - sy) * e); await sleep(16); }
    this.x = tx; this.y = ty; await sleep(n ? 350 : 80); }
  async showMail(m) { await this.page.evaluate((m) => { let o = document.getElementById("__mail"); if (o) o.remove(); if (!m) return; o = document.createElement("div"); o.id = "__mail"; const inner = m.html ? m.html.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "") : `<div class="plain">${m.text.replaceAll("https://socallights.app", location.origin).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1">$1</a>')}</div>`; o.innerHTML = `<div class="bar"><b>Inbox</b><span class="tag">${m.note || ""}</span></div><div class="hd"><h2>${m.subject}</h2><div class="who"><div class="av">S</div><div><b>SoCal Lights</b> &lt;login@socallights.app&gt;<small>to ${m.to || "me"} &middot; ${m.time || "Today, 9:12 AM"}</small></div></div></div><div class="body">${inner}</div>`; document.body.appendChild(o); }, m); }
  // A printed sheet shown as a sample: a dimmed backdrop and a paper-shaped page holding a picture of the real print layout
  async showSheet(src) { await this.page.evaluate((src) => { let o = document.getElementById("__sheet"); if (o) o.remove(); if (!src) return; if (!document.getElementById("__sheetcss")) { const st = document.createElement("style"); st.id = "__sheetcss"; st.textContent = "#__sheet{position:fixed;inset:0;z-index:2147483640;background:rgba(20,22,27,.74);display:grid;place-items:center}#__sheet .paper{height:86vh;max-width:92vw;aspect-ratio:8.5/11;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden}#__sheet img{display:block;width:100%;height:100%}"; document.head.appendChild(st); } o = document.createElement("div"); o.id = "__sheet"; o.innerHTML = '<div class="paper"><img alt="" src="' + src + '"></div>'; document.body.appendChild(o); }, src); }
  async showPerm(on) { await this.page.evaluate((on) => { let o = document.getElementById("__perm"); if (o) o.remove(); if (!on) return; o = document.createElement("div"); o.id = "__perm"; o.innerHTML = '<b>socallights.app wants to</b><p>Know your location</p><div class="row"><button class="block">Block</button><button class="allow">Allow</button></div>'; document.body.appendChild(o); }, on); }
  async unring() { await this.page.evaluate(() => { const r = document.getElementById("__hl"); if (r) r.remove(); }).catch(() => {}); }
  async click(sel, opt = {}) { await this.move(sel, opt); await sleep(500); await this.page.mouse.down(); await sleep(70); await this.page.mouse.up(); await this.unring(); await sleep(opt.after ?? 1500); }
  async scroll(dy, ms = 1400) { const n = Math.round(ms / 25); for (let i = 0; i < n; i++) { await this.page.mouse.wheel(0, dy / n); await sleep(25); } await sleep(1200); }
  async scrollTo(sel, off = 120) { const y = await this.page.locator(sel).first().evaluate((el, o) => el.getBoundingClientRect().top + scrollY - o, off); const cur = await this.page.evaluate(() => scrollY); await this.scroll(y - cur); }
  async type(sel, text, opt = {}) { await this.click(sel, { after: 300 }); if (opt.fill) await this.page.fill(sel, text); else { if (opt.clear !== false) await this.page.fill(sel, ""); await this.page.type(sel, text, { delay: 85 }); } await sleep(opt.after ?? 900); }
  async hover(sel, ms = 1200) { await this.move(sel); await sleep(ms); await this.unring(); }
}
const MOB = process.env.MOBILE === "1"; // phone version: 9:16 Shorts, 1080 x 1920, the page itself at 360 x 640 and 3x
const MOBCSS = `;window.__mobplace = true;(() => { const st = document.createElement("style"); st.textContent = "#__cur{display:none!important}#__cap{font-size:15px!important;padding:9px 14px!important;max-width:86vw!important;border-radius:10px!important}#__card{padding:18px!important}#__card img{width:72px!important;height:72px!important}#__card .wm{font-size:20px!important;margin-bottom:14px!important}#__card .ey{font-size:11px!important}#__card h1{font-size:30px!important;max-width:300px!important}#__card .ub{font-size:22px!important;padding:12px 18px!important;gap:8px!important;margin:18px 0 6px!important}#__card .ub svg{width:20px!important;height:20px!important}#__card ul{font-size:15px!important;max-width:290px!important}#__card li:before{top:7px!important;width:11px!important;height:11px!important}#__card p{font-size:14px!important;max-width:290px!important}"; const add = () => { if (!document.head) return setTimeout(add, 20); document.head.appendChild(st); }; add(); })();`;
// On a phone the map screen is different: tabs are in the bottom bar and the list is a sheet that has to be raised first
const MSEL = (x) => x.replace(/^#t-plan$/, '#bnav [data-tab="plan"]').replace(/^#t-events$/, '#bnav [data-tab="events"]');
const needsSheet = (s) => /#pbody|\.panel|data-route|data-nroute|#t-plan/.test((s.target || "") + " " + (s.do ? s.do.toString() : "") + " " + (s.post ? s.post.toString() : ""));
const DRY = process.env.DRY === "1"; // dry run: walk every step to check each button and link exists, with no voice and no video
export async function record(spec) {
  const w = `${WORK}/${spec.id}`; mkdirSync(w + "/wav", { recursive: true });
  const say = spec.steps.map((s) => s.say || ""); writeFileSync(w + "/texts.json", JSON.stringify(say));
  // Voice files are cached by text, so re-recording a video only speaks the lines that changed
  const cacheDir = `${WORK}/tts`; mkdirSync(cacheDir, { recursive: true });
  const spoken = (t) => t.replaceAll("SoCal", "So Cal"); // said as two words; captions keep the brand spelling
  const KOKORO = process.env.TTS_ENGINE === "kokoro", engine = KOKORO ? `kokoro-${process.env.KOKORO_VOICE || "af_heart"}-${process.env.KOKORO_SPEED || "1.0"}-` : "hfc_female-" + (process.env.LENGTH_SCALE || "1.0");
  const keyOf = (t) => createHash("sha1").update(engine + "|" + spoken(t)).digest("hex");
  const todo = [...new Set(say.filter((t) => t && !existsSync(`${cacheDir}/${keyOf(t)}.wav`)))];
  if (todo.length && !DRY) { mkdirSync(w + "/wav", { recursive: true }); writeFileSync(w + "/todo.json", JSON.stringify(todo.map(spoken)));
    const r = spawnSync("python3", [new URL("./tts.py", import.meta.url).pathname, VOICE, w + "/todo.json", w + "/wav"], { stdio: "inherit" }); if (r.status) throw new Error("tts failed");
    todo.forEach((t, i) => copyFileSync(`${w}/wav/${i}.wav`, `${cacheDir}/${keyOf(t)}.wav`)); }
  if (!DRY) say.forEach((t, i) => { if (t) copyFileSync(`${cacheDir}/${keyOf(t)}.wav`, `${w}/wav/${i}.wav`); });
  const soft = KOKORO ? "highpass=f=60,loudnorm=I=-17:TP=-2:LRA=9" : "highpass=f=70,lowpass=f=7000,equalizer=f=250:t=q:w=1:g=2.5,equalizer=f=5000:t=q:w=1:g=-2,aecho=0.8:0.4:35:0.1,loudnorm=I=-17:TP=-2:LRA=9";
  const audio = say.map((t, i) => { if (!t) return null; if (DRY) return { f: null, d: 0.3 }; const o = `${w}/wav/s${i}.wav`; execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${w}/wav/${i}.wav`, "-af", soft, "-ar", "44100", o]); return { f: o, d: dur(o) }; });
  const vp = MOB ? { width: 360, height: 640 } : spec.phone ? { width: 390, height: 680 } : { width: 1280, height: 720 };
  const br = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const SC = MOB || spec.phone ? 3 : 2; // device pixels per CSS pixel: desktop frames are 2560x1440, phone frames 1170x2040
  const ctx = await br.newContext({ viewport: vp, deviceScaleFactor: SC, colorScheme: "light", hasTouch: MOB, isMobile: MOB, permissions: ["clipboard-read", "clipboard-write", ...(spec.geo && !spec.lateGeo ? ["geolocation"] : [])], geolocation: spec.geo });
  const until = Date.now() + 864e5;
  await ctx.addInitScript(`try{localStorage.setItem("socal-theme","light");${spec.welcome ? "" : 'localStorage.setItem("socal-welcomed","1");'}localStorage.setItem("socal-theme-until","${until}")}catch(e){}`);
  await ctx.addInitScript(OVERLAY.replaceAll("__BOT__", MOB ? "150" : spec.phone ? "92" : "22") + (MOB ? MOBCSS : ""));
  for (const rt of spec.routes || (spec.route ? [spec.route] : [])) await ctx.route(rt.url, (r) => r.fulfill({ json: rt.json })); // e.g. hide the Turnstile widget locally, or stand in for the mail service
  if (spec.cookie) await ctx.addCookies([{ name: "scl_session", value: spec.cookie, url: BASE }]);
  if (spec.warm) { const wp = await ctx.newPage(); await wp.goto(BASE + "/", { waitUntil: "networkidle" }); await sleep(2500); await wp.reload({ waitUntil: "networkidle" }); await sleep(3000); await wp.close(); } // lets the app's offline cache fill, like a phone that has used the app before
  const page = await ctx.newPage();
  const h = new Helper(page); h.ctx = ctx; const marks = []; let poster = null;
  const card = (c) => page.evaluate((c) => { const o = document.getElementById("__card"); if (o) o.remove(); if (!c) return; const d = document.createElement("div"); d.id = "__card"; d.innerHTML = `<img src="/img/badge-160.webp" alt=""><div class="wm">SoCal <b>Lights</b></div><div class="ey">${c.ey}</div><h1>${c.title}</h1>${c.urlbar ? `<div class="ub"><svg viewBox="0 0 24 24" fill="none" stroke="#6b6760" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>${c.urlbar}</div>` : ""}<p>${c.sub || ""}</p>${c.list ? `<ul>${c.list.map((x) => `<li>${x}</li>`).join("")}</ul>` : ""}`; document.body.appendChild(d); }, c);
  await page.goto(BASE + (spec.start || "/"), { waitUntil: "networkidle" }); await sleep(spec.start === "/" ? 4500 : 600); // the map needs a moment to draw its tiles
  await card(spec.steps[0] && spec.steps[0].card ? { ...spec.steps[0].card, first: true } : null); // the first thing on screen is the title card, never the loading map
  // High-resolution capture: Chrome's screencast at device pixels (Playwright's own recorder only goes to the page size)
  const fdir = w + "/frames"; rmSync(fdir, { recursive: true, force: true }); mkdirSync(fdir, { recursive: true });
  const cdp = await ctx.newCDPSession(page), frames = []; let fi = 0, writing = Promise.resolve();
  cdp.on("Page.screencastFrame", (f) => { const i = fi++; frames.push({ i, t: f.metadata.timestamp }); writeFileSync(`${fdir}/${i}.jpg`, Buffer.from(f.data, "base64")); cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
  if (!DRY) await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: Math.round(vp.width * SC), maxHeight: Math.round(vp.height * SC), everyNthFrame: 1 });
  const t00 = Date.now(), ref = t00 / 1000; var T = () => (Date.now() - t00) / 1000;
  for (let i = 0; i < spec.steps.length; i++) {
    const s = spec.steps[i]; const t0 = T();
    if (process.env.DBG) console.log('step', i, s.cap || (s.card && s.card.title) || '', page.url());
    await card(s.card ? { ...s.card, first: i === 0 } : null);
    if (s.mail !== "keep") await h.showMail(s.mail ? { ...s.mail, html: s.mail.html && s.mail.html.replaceAll("https://socallights.app", BASE) } : null);
    await page.evaluate((c) => { let e = document.getElementById("__cap"); if (!c) { if (e) e.remove(); return; } if (!e) { e = document.createElement("div"); e.id = "__cap"; document.body.appendChild(e); } e.textContent = c; }, s.card ? "" : s.cap || "");
    if (audio[i]) marks.push({ i, t: t0 + 0.4, f: audio[i].f });
    const end = t0 + 0.4 + (audio[i]?.d || 0) + (s.pad ?? 0.5);
    await sleep(900);
    if (s.pre) await s.pre(page, h);
    if (s.do) { try { await s.do(page, h); } catch (e) { await page.screenshot({ path: `${w}/fail-${i}.png` }); throw e; } }
    if (MOB && s.target && s.optional && await page.evaluate(() => { const p = document.querySelector(".panel"); return !!p && p.getBoundingClientRect().top > innerHeight * 0.45; })) { await h.click('#bnav [data-tab="events"]', { after: 1200 }); }
    if (process.env.DBG && s.optional) console.log('optional', i, await page.evaluate(() => { const p = document.querySelector('.panel'); return p ? p.getBoundingClientRect().top + ' / ' + innerHeight : 'nopanel'; }), await page.locator(s.target).count());
    if (s.target && s.optional && !(await page.locator(s.target).count())) { s.target = null; } // an optional tap is skipped when its button is not there
    if (s.target) { try { await h.move(s.target); } catch (e) { await page.screenshot({ path: `${w}/fail-${i}.png` }); throw e; } } // act first (typing, scrolling), then glide to the thing to tap
    { const bad = await page.evaluate(() => [...document.querySelectorAll(".err, [role=alert]")].filter((e) => e.offsetParent && /couldn.t|can.t|didn.t|enter a |should |invalid|wrong|try again|isn.t|not allowed|too many/i.test(e.textContent)).map((e) => e.textContent.trim()).join(" | ")).catch(() => ""); if (bad) { await page.screenshot({ path: `${w}/error-${i}.png` }); throw new Error(`The page showed an error on step ${i} (${s.cap || "card"}): ${bad}`); } } // a recording must never show a failed action
    if (s.poster) poster = T();
    const left = end - T(); if (left > 0) await sleep(left * 1000);
    if (s.target) { await sleep(500); if (s.beforeClick) await s.beforeClick(page, h); await h.click(s.target, { after: 0 }); await page.evaluate(() => { const c = document.getElementById("__cap"); if (c) c.remove(); }).catch(() => {}); await sleep(s.after ?? 1500); } // the caption goes the moment the screen changes, so it never describes the old screen
    if (process.env.SHOTS) await page.screenshot({ path: `${w}/s${String(i).padStart(2, '0')}.png` }).catch(() => {});
    if (s.post) { try { await s.post(page, h); } catch (e) { await page.screenshot({ path: `${w}/fail-post-${i}.png` }); throw e; } }
  }
  const total = T() + 0.3; await sleep(300);
  await cdp.send("Page.stopScreencast").catch(() => {}); await page.close(); await ctx.close(); await br.close();
  if (DRY) { console.log(spec.file, "dry run OK:", spec.steps.length, "steps"); return; }
  // frames -> constant-rate video, each frame shown until the next one arrives
  if (frames.length > 1 && frames[1].t - ref < 1.5) frames.shift(); frames[0].t = ref; // Chrome can hand over one stale frame first (the page before the title card): drop it, so frame one is the card
  // Dead air is fast-forwarded: any stretch with no voice that is longer than 1.5 s plays at 4x (the first 0.8 s and last 0.4 s stay at normal speed, so each click is still seen)
  const spans = marks.map((m) => [m.t, m.t + audio[m.i].d]).sort((a, b) => a[0] - b[0]), cuts = []; let prevEnd = 0;
  for (const [a, b] of [...spans, [total, total]]) { const c0 = prevEnd + 0.8, c1 = a - 0.4; if (c1 - c0 > 1.5) cuts.push([c0, c1]); prevEnd = Math.max(prevEnd, b); }
  const remap = (t) => { let r = 0; for (const [c0, c1] of cuts) { if (t <= c0) break; r += (Math.min(t, c1) - c0) * 0.75; } return t - r; };
  frames.forEach((f) => { f.t = ref + remap(Math.max(0, f.t - ref)); });
  marks.forEach((m) => { m.t0 = m.t; m.t = remap(m.t); });
  const total2 = remap(total);
  if (poster !== null) poster = remap(poster); // the thumbnail time follows the fast-forwarded timeline
  const lines = []; frames.forEach((f, k) => { const t = Math.max(0, f.t - ref), nx = k + 1 < frames.length ? Math.max(0, frames[k + 1].t - ref) : total2; lines.push(`file '${fdir}/${f.i}.jpg'`, `duration ${Math.max(0.001, nx - t).toFixed(4)}`); });
  lines.push(`file '${fdir}/${frames[frames.length - 1].i}.jpg'`); writeFileSync(w + "/frames.txt", lines.join("\n"));
  const webm = null;
  const inputs = marks.flatMap((m) => ["-i", m.f]);
  const fc = marks.map((m, k) => `[${k + 1}:a]adelay=${Math.round(m.t * 1000)}|${Math.round(m.t * 1000)}[a${k}]`).join(";") + (marks.length ? ";" : "") + marks.map((_, k) => `[a${k}]`).join("") + `amix=inputs=${marks.length}:normalize=0[aout]`;
  const vf = MOB ? "scale=1080:1920:flags=lanczos" : spec.phone ? "scale=-2:1380:flags=lanczos,pad=2560:1440:(ow-iw)/2:30:color=#fbf3ea" : "scale=2560:1440:flags=lanczos";
  const mp4 = `${OUT}/${spec.file}${MOB ? "-mobile" : ""}.mp4`;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", w + "/frames.txt", ...inputs, "-filter_complex", fc, "-map", "0:v", "-map", "[aout]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "medium", "-vf", vf + ",fps=30", "-r", "30", "-c:a", "aac", "-b:a", "160k", "-ac", "2", "-ar", "48000", "-t", String(total2), "-movflags", "+faststart", mp4], { stdio: "inherit" });

  // ---- Checks before a video counts as finished: it must open on the title card and the voice must already be speaking ----
  const probe = (args) => spawnSync("ffmpeg", ["-hide_banner", ...args], { encoding: "utf8" }).stderr;
  const vol = /mean_volume: (-?[\d.]+|-inf)/.exec(probe(["-ss", "0.6", "-t", "2.4", "-i", mp4, "-af", "volumedetect", "-vn", "-f", "null", "-"]));
  const first = Buffer.concat(["0", "0.4"].map((at) => spawnSync("ffmpeg", ["-v", "error", "-ss", at, "-i", mp4, "-frames:v", "1", "-vf", "scale=64:36,format=rgb24", "-f", "rawvideo", "-"], { maxBuffer: 1e7 }).stdout)); // frame zero and a moment later must both be the plain title card
  let r = 0, g = 0, b = 0; for (let k = 0; k + 2 < first.length; k += 3) { r += first[k]; g += first[k + 1]; b += first[k + 2]; } const px = first.length / 3 || 1; const avg = [r / px, g / px, b / px];
  const problems = [];
  if (!vol || vol[1] === "-inf" || parseFloat(vol[1]) < -45) problems.push("no voice in the first three seconds");
  const secs = dur(mp4); const maxSecs = spec.maxSeconds || 150; if (secs > maxSecs) problems.push("longer than " + Math.floor(maxSecs / 60) + ":" + String(maxSecs % 60).padStart(2, "0") + " (" + Math.round(secs) + " seconds): split it");
  if (!(avg[0] > 238 && avg[1] > 232 && avg[2] > 225)) problems.push("the first frame is not the plain title card (average colour " + avg.map(Math.round).join(",") + ")");
  if (problems.length) throw new Error("QA FAILED for " + spec.file + ": " + problems.join("; "));

  // Closed captions (WebVTT): each narration line, split by sentence, timed from where its voice starts
  const ts = (x) => { const m = Math.floor(x / 60), sec = x - m * 60; return `00:${String(m).padStart(2, "0")}:${sec.toFixed(3).padStart(6, "0")}`; };
  const cues = []; for (const m of marks) { const text = say[m.i], d = audio[m.i].d, parts = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text], total = parts.reduce((a, x) => a + x.length, 0); let at = m.t; for (const part of parts) { const len = d * part.length / total; cues.push(`${ts(at)} --> ${ts(at + len)}\n${part.trim()}`); at += len; } }
  writeFileSync(`${OUT}/${spec.file}${MOB ? "-mobile" : ""}.vtt`, "WEBVTT\n\n" + cues.join("\n\n") + "\n");
  if (poster !== null) execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(poster), "-i", mp4, "-frames:v", "1", "-q:v", "4", `${OUT}/${spec.file}${MOB ? "-mobile" : ""}.jpg`]);
  const L = dur(mp4); console.log(spec.file, "length", Math.floor(L / 60) + ":" + String(Math.round(L % 60)).padStart(2, "0"));
  writeFileSync(`${w}/script.txt`, say.filter(Boolean).join("\n\n")); rmSync(fdir, { recursive: true, force: true });
}
export { sleep };
