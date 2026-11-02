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
  const st = document.createElement("style"); st.textContent = "#__cur{position:fixed;z-index:2147483647;left:0;top:0;width:22px;height:22px;pointer-events:none;transition:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}#__hl{position:fixed;z-index:2147483640;border:4px solid #e8590c;border-radius:12px;box-shadow:0 0 0 7px rgba(232,89,12,.28);pointer-events:none;animation:__pulse 1s ease-in-out infinite}@keyframes __pulse{50%{box-shadow:0 0 0 12px rgba(232,89,12,.12)}}#__rip{position:fixed;z-index:2147483646;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:3px solid rgba(232,90,10,.9);pointer-events:none;animation:__rip .6s ease-out forwards}@keyframes __rip{to{transform:scale(3.6);opacity:0}}#__mail{position:fixed;inset:0;z-index:2147483643;background:#eef0f3;overflow:auto;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#1f1d1a}#__mail .bar{display:flex;align-items:center;gap:12px;padding:14px 28px;background:#fff;border-bottom:1px solid #dcdfe4;font-size:15px;color:#555}#__mail .bar b{font-size:17px;color:#1f1d1a}#__mail .hd{max-width:760px;margin:0 auto;padding:22px 20px 10px}#__mail .hd h2{margin:0 0 12px;font-size:26px;font-weight:500}#__mail .who{display:flex;gap:12px;align-items:center;font-size:15px}#__mail .av{width:42px;height:42px;border-radius:50%;background:#e0560a;color:#fff;display:grid;place-items:center;font-weight:600}#__mail .who small{display:block;color:#6b6760;font-size:13px}#__mail .body{max-width:760px;margin:0 auto 40px;padding:0 20px;zoom:.86}#__mail .body .plain{background:#fff;border-radius:12px;padding:28px 32px;font:16px/1.7 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}#__mail .body .plain a{color:#1a56d6}#__mail .tag{margin-left:auto;font-size:12px;color:#8a8680}#__cap{position:fixed;z-index:2147483645;left:50%;bottom:__BOT__px;transform:translateX(-50%);max-width:92vw;background:rgba(28,28,34,.94);color:#fff;font:600 22px/1.25 'Plus Jakarta Sans',system-ui,sans-serif;padding:12px 22px;border-radius:12px;text-align:center;pointer-events:none}#__card{position:fixed;inset:0;z-index:2147483644;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px;padding:24px;background:radial-gradient(ellipse at 30% 25%,#fbf1e6 0,#fffaf5 38%,#fff 75%);font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#1f1d1a}#__card img{width:96px;height:96px;border-radius:50%;margin-bottom:12px}#__card .wm{font-weight:600;font-size:26px;margin-bottom:22px}#__card .wm b{color:#e0560a;font-weight:600}#__card .ey{font-size:15px;letter-spacing:.2em;text-transform:uppercase;color:#c8324f;font-weight:500}#__card h1{font-weight:300;font-size:60px;line-height:1.12;margin:10px 0;max-width:1000px}#__card p{font-size:23px;color:#6b6760;margin:0;max-width:900px}";
  const add = () => { if (!document.head) return setTimeout(add, 20); document.head.appendChild(st); };
  add();
  const mk = () => { if (!document.body) return setTimeout(mk, 20); if (document.getElementById("__cur")) return; const c = document.createElement("div"); c.id = "__cur"; c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l14 9-6 1.5L8 19z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>'; c.style.left = "-40px"; document.body.appendChild(c); };
  mk();
  const fixUrl = () => { try { const w = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.nodeValue.includes("localhost:8788")) n.nodeValue = n.nodeValue.replace(/localhost:8788/g, "socallights.app"); } catch (e) {} };
  setInterval(fixUrl, 250);
  // The caption never sits on the pointer: when the pointer comes near it, the caption hops to the other edge of the screen
  let cx = -999, cy = -999, side = "bottom";
  const place = () => { const c = document.getElementById("__cap"); if (!c) return; const r = c.getBoundingClientRect(), m = 70; if (cx > r.left - m && cx < r.right + m && cy > r.top - m && cy < r.bottom + m) { side = side === "bottom" ? "top" : "bottom"; } if (side === "top") { c.style.top = "72px"; c.style.bottom = "auto"; } else { c.style.top = "auto"; c.style.bottom = "__BOT__px"; } };
  setInterval(place, 100);
  addEventListener("mousemove", (e) => { cx = e.clientX; cy = e.clientY; const c = document.getElementById("__cur"); if (c) { c.style.left = e.clientX - 3 + "px"; c.style.top = e.clientY - 2 + "px"; } place(); }, true);
  addEventListener("mousedown", (e) => { const r = document.createElement("div"); r.id = "__rip"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px"; document.body.appendChild(r); setTimeout(() => r.remove(), 700); }, true);
})();`;
class Helper {
  constructor(page) { this.page = page; this.x = 200; this.y = 200; }
  async move(sel, opt = {}) { const loc = typeof sel === "string" ? this.page.locator(sel).first() : sel; await loc.scrollIntoViewIfNeeded().catch(() => {}); const b = await loc.boundingBox(); if (!b) throw new Error("no box for " + sel);
    await this.page.evaluate((b) => { let r = document.getElementById("__hl"); if (!r) { r = document.createElement("div"); r.id = "__hl"; document.body.appendChild(r); } const g = 6; r.style.left = b.x - g + "px"; r.style.top = b.y - g + "px"; r.style.width = b.width + 2 * g + "px"; r.style.height = b.height + 2 * g + "px"; }, b);
    const tx = b.x + (opt.fx ?? 0.5) * b.width, ty = b.y + (opt.fy ?? 0.5) * b.height, n = 38; const sx = this.x, sy = this.y;
    for (let i = 1; i <= n; i++) { const t = i / n, e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; await this.page.mouse.move(sx + (tx - sx) * e, sy + (ty - sy) * e); await sleep(16); }
    this.x = tx; this.y = ty; await sleep(350); }
  async showMail(m) { await this.page.evaluate((m) => { let o = document.getElementById("__mail"); if (o) o.remove(); if (!m) return; o = document.createElement("div"); o.id = "__mail"; const inner = m.html ? m.html.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "") : `<div class="plain">${m.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1">$1</a>')}</div>`; o.innerHTML = `<div class="bar"><b>Inbox</b><span class="tag">${m.note || ""}</span></div><div class="hd"><h2>${m.subject}</h2><div class="who"><div class="av">S</div><div><b>SoCal Lights</b> &lt;login@socallights.app&gt;<small>to ${m.to || "me"} &middot; ${m.time || "Today, 9:12 AM"}</small></div></div></div><div class="body">${inner}</div>`; document.body.appendChild(o); }, m); }
  async unring() { await this.page.evaluate(() => { const r = document.getElementById("__hl"); if (r) r.remove(); }).catch(() => {}); }
  async click(sel, opt = {}) { await this.move(sel, opt); await sleep(500); await this.page.mouse.down(); await sleep(70); await this.page.mouse.up(); await this.unring(); await sleep(opt.after ?? 1500); }
  async scroll(dy, ms = 1400) { const n = Math.round(ms / 25); for (let i = 0; i < n; i++) { await this.page.mouse.wheel(0, dy / n); await sleep(25); } await sleep(1200); }
  async scrollTo(sel, off = 120) { const y = await this.page.locator(sel).first().evaluate((el, o) => el.getBoundingClientRect().top + scrollY - o, off); const cur = await this.page.evaluate(() => scrollY); await this.scroll(y - cur); }
  async type(sel, text, opt = {}) { await this.click(sel, { after: 300 }); if (opt.fill) await this.page.fill(sel, text); else { if (opt.clear !== false) await this.page.fill(sel, ""); await this.page.type(sel, text, { delay: 85 }); } await sleep(opt.after ?? 900); }
  async hover(sel, ms = 1200) { await this.move(sel); await sleep(ms); await this.unring(); }
}
export async function record(spec) {
  const w = `${WORK}/${spec.id}`; mkdirSync(w + "/wav", { recursive: true });
  const say = spec.steps.map((s) => s.say || ""); writeFileSync(w + "/texts.json", JSON.stringify(say));
  // Voice files are cached by text, so re-recording a video only speaks the lines that changed
  const cacheDir = `${WORK}/tts`; mkdirSync(cacheDir, { recursive: true });
  const keyOf = (t) => createHash("sha1").update("hfc_female-1.18|" + t).digest("hex");
  const todo = [...new Set(say.filter((t) => t && !existsSync(`${cacheDir}/${keyOf(t)}.wav`)))];
  if (todo.length) { mkdirSync(w + "/wav", { recursive: true }); writeFileSync(w + "/todo.json", JSON.stringify(todo));
    const r = spawnSync("python3", [new URL("./tts.py", import.meta.url).pathname, VOICE, w + "/todo.json", w + "/wav"], { stdio: "inherit" }); if (r.status) throw new Error("tts failed");
    todo.forEach((t, i) => copyFileSync(`${w}/wav/${i}.wav`, `${cacheDir}/${keyOf(t)}.wav`)); }
  say.forEach((t, i) => { if (t) copyFileSync(`${cacheDir}/${keyOf(t)}.wav`, `${w}/wav/${i}.wav`); });
  const soft = "highpass=f=70,lowpass=f=7000,equalizer=f=250:t=q:w=1:g=2.5,equalizer=f=5000:t=q:w=1:g=-2,aecho=0.8:0.4:35:0.1,loudnorm=I=-17:TP=-2:LRA=9";
  const audio = say.map((t, i) => { if (!t) return null; const o = `${w}/wav/s${i}.wav`; execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${w}/wav/${i}.wav`, "-af", soft, "-ar", "44100", o]); return { f: o, d: dur(o) }; });
  const vp = spec.phone ? { width: 390, height: 680 } : { width: 1280, height: 720 };
  const br = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const SC = spec.phone ? 3 : 1.5; // device pixels per CSS pixel: desktop frames are 1920x1080, phone frames 1170x2040
  const ctx = await br.newContext({ viewport: vp, deviceScaleFactor: SC, colorScheme: "light", hasTouch: false, isMobile: false, permissions: ["clipboard-read", "clipboard-write", ...(spec.geo ? ["geolocation"] : [])], geolocation: spec.geo });
  const until = Date.now() + 864e5;
  await ctx.addInitScript(`try{localStorage.setItem("socal-theme","light");localStorage.setItem("socal-welcomed","1");localStorage.setItem("socal-theme-until","${until}")}catch(e){}`);
  await ctx.addInitScript(OVERLAY.replaceAll("__BOT__", spec.phone ? "92" : "22"));
  for (const rt of spec.routes || (spec.route ? [spec.route] : [])) await ctx.route(rt.url, (r) => r.fulfill({ json: rt.json })); // e.g. hide the Turnstile widget locally, or stand in for the mail service
  if (spec.cookie) await ctx.addCookies([{ name: "scl_session", value: spec.cookie, url: BASE }]);
  const page = await ctx.newPage();
  // High-resolution capture: Chrome's screencast at device pixels (Playwright's own recorder only goes to the page size)
  const fdir = w + "/frames"; rmSync(fdir, { recursive: true, force: true }); mkdirSync(fdir, { recursive: true });
  const cdp = await ctx.newCDPSession(page), frames = []; let fi = 0, writing = Promise.resolve();
  cdp.on("Page.screencastFrame", (f) => { const i = fi++; frames.push({ i, t: f.metadata.timestamp }); writeFileSync(`${fdir}/${i}.jpg`, Buffer.from(f.data, "base64")); cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: Math.round(vp.width * SC), maxHeight: Math.round(vp.height * SC), everyNthFrame: 1 });
  const t00 = Date.now(), ref = t00 / 1000; const T = () => (Date.now() - t00) / 1000;
  const h = new Helper(page); h.ctx = ctx; const marks = []; let poster = null;
  const card = (c) => page.evaluate((c) => { const o = document.getElementById("__card"); if (o) o.remove(); if (!c) return; const d = document.createElement("div"); d.id = "__card"; d.innerHTML = `<img src="/img/badge-160.webp" alt=""><div class="wm">SoCal <b>Lights</b></div><div class="ey">${c.ey}</div><h1>${c.title}</h1><p>${c.sub || ""}</p>`; document.body.appendChild(d); }, c);
  await page.goto(BASE + (spec.start || "/"), { waitUntil: "networkidle" }); await sleep(spec.start === "/" ? 4500 : 600); // the map needs a moment to draw its tiles
  for (let i = 0; i < spec.steps.length; i++) {
    const s = spec.steps[i]; const t0 = T();
    await card(s.card || null);
    if (s.mail !== "keep") await h.showMail(s.mail ? { ...s.mail, html: s.mail.html && s.mail.html.replaceAll("https://socallights.app", BASE) } : null);
    await page.evaluate((c) => { let e = document.getElementById("__cap"); if (!c) { if (e) e.remove(); return; } if (!e) { e = document.createElement("div"); e.id = "__cap"; document.body.appendChild(e); } e.textContent = c; }, s.card ? "" : s.cap || "");
    if (audio[i]) marks.push({ i, t: t0 + 0.4, f: audio[i].f });
    const end = t0 + 0.4 + (audio[i]?.d || 0) + (s.pad ?? 0.9);
    await sleep(900);
    if (s.do) { try { await s.do(page, h); } catch (e) { await page.screenshot({ path: `${w}/fail-${i}.png` }); throw e; } }
    if (s.poster) poster = T();
    const left = end - T(); if (left > 0) await sleep(left * 1000);
    if (s.post) { try { await s.post(page, h); } catch (e) { await page.screenshot({ path: `${w}/fail-post-${i}.png` }); throw e; } }
  }
  const total = T() + 0.3; await sleep(300);
  await cdp.send("Page.stopScreencast").catch(() => {}); await page.close(); await ctx.close(); await br.close();
  // frames -> constant-rate video, each frame shown until the next one arrives
  const lines = []; frames.forEach((f, k) => { const t = Math.max(0, f.t - ref), nx = k + 1 < frames.length ? Math.max(0, frames[k + 1].t - ref) : total; lines.push(`file '${fdir}/${f.i}.jpg'`, `duration ${Math.max(0.001, nx - t).toFixed(4)}`); });
  lines.push(`file '${fdir}/${frames[frames.length - 1].i}.jpg'`); writeFileSync(w + "/frames.txt", lines.join("\n"));
  const webm = null;
  const inputs = marks.flatMap((m) => ["-i", m.f]);
  const fc = marks.map((m, k) => `[${k + 1}:a]adelay=${Math.round(m.t * 1000)}|${Math.round(m.t * 1000)}[a${k}]`).join(";") + (marks.length ? ";" : "") + marks.map((_, k) => `[a${k}]`).join("") + `amix=inputs=${marks.length}:normalize=0[aout]`;
  const vf = spec.phone ? "scale=-2:1040:flags=lanczos,pad=1920:1080:(ow-iw)/2:20:color=#fbf3ea" : "scale=1920:1080:flags=lanczos";
  const mp4 = `${OUT}/${spec.file}.mp4`;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", w + "/frames.txt", ...inputs, "-filter_complex", fc, "-map", "0:v", "-map", "[aout]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "25", "-preset", "medium", "-vf", vf + ",fps=30", "-r", "30", "-c:a", "aac", "-b:a", "128k", "-t", String(total), "-movflags", "+faststart", mp4], { stdio: "inherit" });
  if (poster !== null) execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(poster), "-i", mp4, "-frames:v", "1", "-q:v", "4", `${OUT}/${spec.file}.jpg`]);
  const L = dur(mp4); console.log(spec.file, "length", Math.floor(L / 60) + ":" + String(Math.round(L % 60)).padStart(2, "0"));
  writeFileSync(`${w}/script.txt`, say.filter(Boolean).join("\n\n")); rmSync(fdir, { recursive: true, force: true });
}
export { sleep };
