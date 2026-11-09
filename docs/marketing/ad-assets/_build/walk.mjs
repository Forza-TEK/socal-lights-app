// Records a scripted walkthrough on the LOCAL copy of the app (current origin/main, wrangler pages dev, local demo database) in an iPhone 17 Pro Max
// emulation (440 x 956 CSS px, touch, iOS Safari user agent, captured 1080 px wide). Every step is timed from the narration lengths so the words and the
// taps line up: the tap happens 0.3 s after the narration clip starts. Nothing is hidden, reworded or painted over (only a tap ring is drawn).
// Usage: WORK=<dir> TTS=<narration dir> [COOKIE_ENTER=<demo homeowner cookie>] node walk.mjs <w06|w07|w08|w09>
// Writes <WORK>/<aNN>-source.mp4 and <WORK>/<aNN>-plan.json (cut plan for owner-cut.mjs: segments, cue times, handoff-caption times).
import { createRequire } from "node:module";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HERE = dirname(new URL(import.meta.url).pathname), WORK = process.env.WORK, TTS = process.env.TTS, BASE = "http://localhost:8788";
const W = process.argv[2], SCR = JSON.parse(readFileSync(HERE + "/audio/walk-scripts.json", "utf8"))[W], META = JSON.parse(readFileSync(TTS + "/lines.json", "utf8"));
const ID = { w06: "a06", w07: "a07", w08: "a08", w09: "a09" }[W], HEAD = { w06: "Put your home's lights on the map", w07: "Be on someone's lights route", w08: "Find holiday lights near you tonight", w09: "Plan a family lights drive" }[W];
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1";
const durOf = (say) => META[W + "r"].find((x) => x.text === say).sec;
const dir = WORK + "/" + ID + "-frames"; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const br = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await br.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 1080 / 440, isMobile: true, hasTouch: true, userAgent: UA, colorScheme: "dark", permissions: ["geolocation"], geolocation: { latitude: 33.6162, longitude: -117.8745 } }); // Fashion Island, Newport Beach: a public shopping centre
await ctx.route("**/api/config", (r) => r.fulfill({ json: {} })); // hides the spam-check widget on the local copy, as the tutorials do
await ctx.addInitScript(`(() => { const add = () => { if (!document.head) return setTimeout(add, 20); const s = document.createElement("style"); s.textContent = ".__rip{position:fixed;z-index:2147483646;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:5px solid rgba(255,107,107,.95);background:rgba(255,255,255,.3);pointer-events:none;animation:__r .7s ease-out forwards}@keyframes __r{to{transform:scale(2.8);opacity:0}}"; document.head.appendChild(s); }; add(); window.__tap = (x, y) => { const r = document.createElement("div"); r.className = "__rip"; r.style.left = x + "px"; r.style.top = y + "px"; document.body.appendChild(r); setTimeout(() => r.remove(), 750); }; })();`);
const p = await ctx.newPage();
let T0 = 0; const T = () => Date.now() / 1000 - T0; let tapMark = null;
const tapXY = async (x, y) => { await p.evaluate(([x, y]) => window.__tap(x, y), [x, y]); if (tapMark == null) tapMark = T(); await p.touchscreen.tap(x, y); };
const tap = async (sel, o = {}) => { const l = typeof sel === "string" ? p.locator(sel).first() : sel.first(); await l.waitFor({ state: "visible", timeout: 20000 }); const b = await l.boundingBox(); await tapXY(b.x + b.width / 2, b.y + b.height * (o.fy ?? .5)); await sleep(o.after ?? 500); };
const type = async (sel, text) => { await tap(sel, { after: 150 }); await p.locator(sel).first().fill(""); await p.locator(sel).first().pressSequentially(text, { delay: W === "w06" ? 22 : 45 }); await sleep(250); };
const next = (after = 700) => tap("#nextbtn", { after });
const geoStart = async () => { await p.goto(BASE + "/", { waitUntil: "networkidle" }); await sleep(5500); try { await p.getByText("No thanks").first().click({ timeout: 3000 }); await sleep(600); } catch {} };
const pickHeart = () => p.evaluate(() => { const pb = document.querySelector("#pbody").getBoundingClientRect(), L = [...document.querySelectorAll("article.item")].filter((a) => a.offsetParent !== null).map((a) => a.querySelector(".star")); const i = L.findIndex((s) => s.getAttribute("aria-pressed") !== "true" && s.getBoundingClientRect().top > pb.top + 4 && s.getBoundingClientRect().bottom < Math.min(pb.bottom, innerHeight - 80)); return i; });
const heartNext = async () => { let i = await pickHeart(); for (let t = 0; i < 0 && t < 6; t++) { await p.evaluate(() => document.querySelector("#pbody").scrollBy({ top: 140, behavior: "smooth" })); await sleep(600); i = await pickHeart(); } await tap(p.locator("article.item:visible .star").nth(i)); };
const MK = {}; // times inside the long 'there' step, used to cut out the waiting
const ENTER = process.env.COOKIE_ENTER || "AjmUsqDKzYVPNwj0uA9p-_hofhGpm9AV";
// per scenario: prepare (not recorded) and one action per step id
const SC = {
  w09: { prep: async () => { await geoStart(); await p.click(".maplibregl-ctrl-geolocate"); await sleep(4500); for (let i = 0; i < 3; i++) { await p.click(".maplibregl-ctrl-zoom-out"); await sleep(700); } await sleep(2500); await p.click("#grab"); await sleep(1500); },
    act: { heart1: () => heartNext(), heart2: async () => { await heartNext(); await sleep(500); await heartNext(); }, nav: () => tap('#bnav [data-tab="plan"]', { after: 1500 }),
      route: () => tap('#phead >> text=Route these', { after: 2000 }), pick: () => tap(".mpchg", { after: 1200 }) }, hold: { list: 2.2, sheet: 2.4, apps: 2.0 }, note: "route" },
  w07: { prep: async () => { await geoStart(); }, act: { locate: async () => { await tap(".maplibregl-ctrl-geolocate", { after: 4500 }); await tap(".maplibregl-ctrl-zoom-out", { after: 900 }); await tap(".maplibregl-ctrl-zoom-out", { after: 2500 }); },
      route: () => tap("#rtpill", { after: 2000 }), pick: () => tap(".mpchg", { after: 1200 }) }, hold: { sheet: 2.4, apps: 2.0, open: 1.5, next: 1.5 }, note: "route" },
  w08: { prep: async () => { await geoStart(); }, act: { locate: async () => { await tap(".maplibregl-ctrl-geolocate", { after: 4500 }); await tap(".maplibregl-ctrl-zoom-out", { after: 900 }); await tap(".maplibregl-ctrl-zoom-out", { after: 2500 }); }, pull: () => tap("#grab", { after: 1500 }), weekend: () => tap('[data-quick="weekend"]', { after: 2000 }),
      free: () => tap('[data-quick="cost"]', { after: 2000 }), card: async () => { if (!(await p.locator("article.item:visible").count())) { await tap('[data-quick="cost"]', { after: 1500 }); } if (!(await p.locator("article.item:visible").count())) { await tap('[data-quick="weekend"]', { after: 1500 }); } await tap("article.item", { after: 3000 }); } }, hold: { dir: 2.0, apps: 2.0 }, note: "dir" },
  w06: { prep: async () => { await p.goto(BASE + "/add-house", { waitUntil: "networkidle" }); await sleep(2500); },
    act: {
      signin: async () => { await tap(p.getByText("Sign in", { exact: true }), { after: 1800 }); await tap("#si-email", { after: 300 }); await p.locator("#si-email").pressSequentially("you@example.com", { delay: 25 }); await sleep(400);
        await ctx.addCookies([{ name: "scl_session", value: ENTER, url: BASE }]); await p.goto(BASE + "/add-house", { waitUntil: "networkidle" }); await sleep(1200); }, // the emailed code is not recorded: the demo session cookie stands in for it
      who: async () => { await tap('[data-tile="kind|homeowner"]', { after: 500 }); await next(); },
      name: async () => { await type("#f-biz", "The Sample family"); await next(); },
      season: async () => { await tap('[data-tile="hadPro|no"]', { after: 400 }); await next(450); await tap('[data-tile="season|christmas"]', { after: 400 }); await next(); },
      title: async () => { await type("#f-title", "Sample Family Lights"); await type("#f-desc", "Lights on the roof."); await next(); },
      street: async () => { await p.selectOption("#f-city", "Irvine"); await sleep(250); await type("#f-street", "1 Civic Center Plaza"); await type("#f-zip", "92606"); await next(); },
      photos: async () => { await next(500); await next(700); },
      put: async () => { await tap("#nextbtn", { after: 1500 }); },
      there: async () => { await tap("text=See it on the map", { after: 400 }); MK.see = T(); await p.waitForSelector("#back", { timeout: 15000 }); await sleep(600); await p.goto(BASE + "/", { waitUntil: "networkidle" }); await sleep(3000); try { await p.getByText("No thanks").first().click({ timeout: 2500 }); } catch {}
        await type("#q", "Sample Family"); await p.keyboard.press("Enter"); await sleep(1500); await tap("#grab", { after: 900 }); MK.item = T(); await tap("article.item", { after: 400 }); await p.waitForSelector("#back", { timeout: 15000 }); await sleep(3500); await tap("#grab", { after: 1500 }); },
      card: () => tap("#grab", { after: 1500 }), dirs: async () => { await sleep(800); } }, hold: { there: 1.5, card: 1.0, dirs: 2.0 }, note: "dirs" },
}[W];
await SC.prep();
// screencast
const cdp = await ctx.newCDPSession(p), frames = []; let n = 0;
cdp.on("Page.screencastFrame", (f) => { const i = n++; frames.push({ i, t: f.metadata.timestamp }); writeFileSync(`${dir}/${i}.jpg`, Buffer.from(f.data, "base64")); cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: Math.round(956 * 1080 / 440), everyNthFrame: 1 });
await sleep(500); T0 = Date.now() / 1000;
const rec = []; // per step: start, action time, end
const SKIP = new Set(["photos"]); // recorded but cut out (no narration)
const HAS_APPLE = SCR.steps.some((x) => x.id === "apple");
const STEPS = W === "w06" ? [...SCR.steps.slice(0, 7), { id: "photos", say: "", core: false, silent: true }, ...SCR.steps.slice(7)] : SCR.steps;
for (const s of STEPS) {
  if (s.id === "apple") continue; // the finished route in Apple Maps is spliced in from the owner's real recording below
  const t0 = T(), dur = s.silent ? 1.2 : durOf(s.say), act = SC.act[s.id]; tapMark = null;
  if (act) { await sleep(300); await act(); }
  const hold = (SC.hold && SC.hold[s.id]) ?? (W === "w06" ? 0.35 : 0.9), end = Math.max(t0 + dur + hold, T() + 0.4);
  await sleep(Math.max(0, (end - T()) * 1000));
  rec.push({ id: s.id, say: s.say, core: s.core, silent: !!s.silent, t0, action: tapMark, end: T() });
}
writeFileSync(`${WORK}/${ID}-rec.json`, JSON.stringify({ rec, MK }));
const closingDur = META[W + "r"][META[W + "r"].length - 1].sec;
if (!HAS_APPLE) await sleep((closingDur + 0.6) * 1000);
const total = T(); await cdp.send("Page.stopScreencast"); await br.close();
const start = T0; // screencast frame times are wall-clock seconds, like Date.now() / 1000
const lines = [];
frames.forEach((f, k) => { const t = Math.max(0, f.t - start), nx = k + 1 < frames.length ? Math.max(0, frames[k + 1].t - start) : total; if (nx > t || k === frames.length - 1) lines.push(`file '${dir}/${f.i}.jpg'`, `duration ${Math.max(0.001, nx - t).toFixed(4)}`); });
lines.push(`file '${dir}/${frames[frames.length - 1].i}.jpg'`); writeFileSync(`${WORK}/${ID}-frames.txt`, lines.join("\n"));
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", `${WORK}/${ID}-frames.txt`, "-vf", "fps=30,scale=1080:2346:flags=lanczos", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", `${WORK}/${ID}-${HAS_APPLE ? "local" : "source"}.mp4`]);
// cut plan
const APPLE = { from: 32.2, len: 2.8 }; // clean part of the owner's real iPhone recording: Apple Maps Directions with the route line, stop count and time (before any turn-by-turn street screen)
const recN = rec.filter((r) => !r.silent), real = recN.filter((r) => r.id !== "apple"), coreReal = real.filter((r) => r.core), noteStep = rec.find((r) => r.id === SC.note);
const cue = (r, i) => (r.action != null ? { i, action: +r.action.toFixed(3), what: r.id + " tapped" } : { i, at: +Math.max(r.t0, 0.35).toFixed(3) });
let plan;
if (HAS_APPLE) {
  const lastCore = coreReal[coreReal.length - 1].end, L = APPLE.len, own = resolve(HERE, "../../owner-videos/favorites-owner.mp4");
  const join = (srcName, upto) => execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${WORK}/${ID}-local.mp4`, "-ss", String(APPLE.from), "-t", String(L), "-i", own, "-filter_complex", `[0:v]trim=0:${upto.toFixed(3)},setpts=PTS-STARTPTS,fps=30,setsar=1[a];[1:v]scale=1080:2346,setpts=PTS-STARTPTS,fps=30,setsar=1[b];[a][b]concat=n=2:v=1:a=0[v]`, "-map", "[v]", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", `${WORK}/${srcName}`]);
  join(`${ID}-source-short.mp4`, lastCore); join(`${ID}-source.mp4`, total);
  const nc = coreReal.length;
  plan = { src: `${WORK}/${ID}-source.mp4`, srcH: 2346, head: HEAD, noteFrom: null,
    short: { id: W, src: `${WORK}/${ID}-source-short.mp4`, seg: [[0.3, +(lastCore + L).toFixed(3), 1]], noteFrom: noteStep && noteStep.core ? +(noteStep.action ?? noteStep.t0).toFixed(3) : null, cues: [...coreReal.map((r, i) => cue(r, i)), { i: nc, at: +(lastCore + 0.05).toFixed(3) }, { i: nc + 1, at: +(lastCore + L - 0.05).toFixed(3) }] },
    reel: { id: W + "r", seg: [[0.3, +(total + L).toFixed(3), 1]], noteFrom: noteStep ? +(noteStep.action ?? noteStep.t0).toFixed(3) : null, cues: [...real.map((r, i) => cue(r, i)), { i: real.length, at: +(total + 0.05).toFixed(3) }, { i: real.length + 1, at: +(total + L - 0.05).toFixed(3) }] } };
} else {
  const ivs = (list) => { const out = []; for (const r of list) { const parts = r.id === "there" && MK.item ? [[r.t0, MK.see + 1.5], [MK.item - 0.8, r.end]] : [[r.t0, r.end]]; for (const [a, b] of parts) { const A = Math.max(a, 0.3); if (out.length && A - out[out.length - 1][1] < 0.05) out[out.length - 1][1] = b; else out.push([A, b]); } } return out; };
  const core = coreReal;
  plan = { src: `${WORK}/${ID}-source.mp4`, srcH: 2346, head: HEAD, noteFrom: null,
    short: { id: W, seg: ivs(core).map(([a, b]) => [+a.toFixed(3), +b.toFixed(3), 1]), noteFrom: noteStep && noteStep.core ? +(noteStep.action ?? noteStep.t0).toFixed(3) : null, cues: [...core.map((r, i) => cue(r, i)), { i: core.length, at: +(core[core.length - 1].end - 0.05).toFixed(3) }] },
    reel: { id: W + "r", seg: (() => { const r = ivs(recN); r[r.length - 1][1] = total; return r.map(([a, b]) => [+a.toFixed(3), +b.toFixed(3), 1]); })(), noteFrom: noteStep ? +(noteStep.action ?? noteStep.t0).toFixed(3) : null, cues: [...recN.map((r, i) => cue(r, i)), { i: recN.length, at: +(total - closingDur - 0.45).toFixed(3) }] } };
}
writeFileSync(`${WORK}/${ID}-plan.json`, JSON.stringify(plan, null, 1)); console.log(JSON.stringify({ total, rec: rec.map((r) => [r.id, r.t0 && +r.t0.toFixed(1), r.action && +r.action.toFixed(2)]) }));
rmSync(dir, { recursive: true, force: true });
