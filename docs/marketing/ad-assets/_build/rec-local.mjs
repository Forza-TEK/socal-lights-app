// Records the REAL add-a-home form of the LOCAL copy of the app (current origin/main, wrangler pages dev, local demo database) in an iPhone 17 Pro Max
// emulation: 440 x 956 CSS px, touch, iOS Safari user agent, captured at 1080 px wide. Signed in with the local demo homeowner cookie. Nothing is hidden,
// reworded or covered (only a thin tap ripple is drawn). Sample values: a public building (Irvine City Hall, from scripts/tutorials/mockgeo.mjs) and a made-up family name.
// The flow stops on the review screen: "Put it on the map" is NEVER pressed, nothing is submitted.
// Usage: WORK=<dir> COOKIE=<demo homeowner session> node rec-local.mjs   -> <WORK>/a06-source.mp4 and a06-actions.json (tap times in seconds)
import { createRequire } from "node:module";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://localhost:8788", WORK = process.env.WORK, dir = WORK + "/a06-frames";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1";
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const br = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctx = await br.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 1080 / 440, isMobile: true, hasTouch: true, userAgent: UA, colorScheme: "dark" });
await ctx.addCookies([{ name: "scl_session", value: process.env.COOKIE, url: BASE }]);
await ctx.route("**/api/config", (r) => r.fulfill({ json: {} })); // hides the spam-check widget on the local copy, as the tutorials do
await ctx.addInitScript(`(() => { const add = () => { if (!document.head) return setTimeout(add, 20); const s = document.createElement("style"); s.textContent = ".__rip{position:fixed;z-index:2147483646;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:4px solid rgba(255,107,107,.95);background:rgba(255,255,255,.25);pointer-events:none;animation:__r .55s ease-out forwards}@keyframes __r{to{transform:scale(2.6);opacity:0}}"; document.head.appendChild(s); }; add(); window.__tap = (x, y) => { const r = document.createElement("div"); r.className = "__rip"; r.style.left = x + "px"; r.style.top = y + "px"; document.body.appendChild(r); setTimeout(() => r.remove(), 600); }; })();`);
const p = await ctx.newPage();
await p.goto(BASE + "/add-house", { waitUntil: "networkidle" }); await sleep(2500);
const cdp = await ctx.newCDPSession(p), frames = []; let n = 0;
cdp.on("Page.screencastFrame", (f) => { const i = n++; frames.push({ i, t: f.metadata.timestamp }); writeFileSync(`${dir}/${i}.jpg`, Buffer.from(f.data, "base64")); cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: Math.round(956 * 1080 / 440), everyNthFrame: 1 });
await sleep(500);
const t0 = Date.now() / 1000, T = () => Date.now() / 1000 - t0, act = {};
const tap = async (sel, name, after = 450) => { const l = p.locator(sel).first(); const b = await l.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2; await p.evaluate(([x, y]) => window.__tap(x, y), [x, y]); if (name) act[name] = +T().toFixed(3); await p.touchscreen.tap(x, y); await sleep(after); };
const type = async (sel, text, name) => { await tap(sel, name, 150); await p.locator(sel).first().fill(""); await p.locator(sel).first().pressSequentially(text, { delay: 40 }); await sleep(300); };
await sleep(900);
await tap('[data-tile="kind|homeowner"]', "homeowner", 500);
await tap("#nextbtn", "next1", 700);
await type("#f-biz", "The Sample family", "name"); await tap("#nextbtn", "next2", 700);
await tap('[data-tile="hadPro|no"]', "pro", 350); await tap("#nextbtn", "next3", 700);
await tap('[data-tile="season|christmas"]', "season", 350); await tap("#nextbtn", "next4", 700);
await type("#f-title", "Sample Family Lights", "title"); await type("#f-desc", "Lights on the roof and the trees.", "desc"); await tap("#nextbtn", "next5", 700);
await p.selectOption("#f-city", "Irvine"); await sleep(250);
await type("#f-street", "1 Civic Center Plaza", "street"); await type("#f-zip", "92606", "zip"); await tap("#nextbtn", "next6", 700);
await tap("#nextbtn", "next7", 700);   // lights-on and visiting options: left empty (all optional)
await tap("#nextbtn", "next8", 700);   // photos: skipped (optional)
act.review = +T().toFixed(3); await sleep(2500);
const total = T(); await cdp.send("Page.stopScreencast"); await br.close();
const f0 = frames.findIndex((f) => f.t >= t0 - 0.05), fr = frames.slice(Math.max(0, f0 - 1)), lines = [];
fr.forEach((f, k) => { const t = Math.max(0, f.t - t0), nx = k + 1 < fr.length ? Math.max(0, fr[k + 1].t - t0) : total; lines.push(`file '${dir}/${f.i}.jpg'`, `duration ${Math.max(0.001, nx - t).toFixed(4)}`); });
lines.push(`file '${dir}/${fr[fr.length - 1].i}.jpg'`); writeFileSync(WORK + "/a06-frames.txt", lines.join("\n"));
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", WORK + "/a06-frames.txt", "-vf", "fps=30,scale=1080:2346:flags=lanczos", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", WORK + "/a06-source.mp4"]);
writeFileSync(WORK + "/a06-actions.json", JSON.stringify({ total, ...act }, null, 1)); console.log(JSON.stringify({ total, ...act }));
rmSync(dir, { recursive: true, force: true });
