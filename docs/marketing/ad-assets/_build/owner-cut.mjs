// Cuts the owner's REAL iPhone recordings into ads: whole frame visible (nothing cropped), blurred background, headline and captions in the
// background area only, narration (Kokoro af_heart) placed on measured on-screen action times, original festive music ducked under the voice.
// Usage: WORK=<dir> TTS=<ttsDir> node owner-cut.mjs <vid> <placement> [--music <file>]     vid = a07|a08|a09, placement = feed|story|reel
// Re-mix every video with another music bed: sh remix-all.sh <music file>   (needs WORK and TTS set)
// Outputs go to docs/marketing/ad-assets/<folder>/<stem>-<placement>-<4x5|9x16>.mp4 and a sync table JSON next to it in $WORK.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const HERE = dirname(new URL(import.meta.url).pathname), ROOT = resolve(HERE, ".."), WORK = process.env.WORK, TTS = process.env.TTS;
const NOTE = "Your phone switches to the map app you choose: Apple Maps, Google Maps or Waze.";
const LINES = JSON.parse(readFileSync(TTS + "/lines.json", "utf8"));
const OWN = ROOT + "/../owner-videos/";
// action = source time of the on-screen action the words describe (measured from the recording); at = source time for lines with no action
const V = {
  a06: { folder: "a06-add-home-video", stem: "a06-add-home", src: process.env.WORK + "/a06-source.mp4", srcH: 2346, head: "Put your home's lights on the map", noteFrom: null,
    short: { id: "a06", seg: [[0.6, 3.0, 1], [11.4, 13.0, 1.25], [16.4, 18.0, 1.25], [41.8, 44.4, 1], [47.0, 48.8, 1], [49.3, 50.7, 1]], cues: [{ i: 0, at: 0.65 }, { i: 1, action: 2.846, what: "name field tapped, form filling starts" }, { i: 2, action: 43.3, what: "app flies to the new home's pin at street level" }, { i: 3, at: 49.4 }] },
    reel: { id: "a06r", seg: [[0.6, 3.6, 1], [11.4, 13.4, 1.25], [16.4, 18.4, 1.25], [41.8, 44.6, 1], [47.0, 50.6, 1]], cues: [{ i: 0, at: 0.65 }, { i: 1, action: 2.846, what: "name field tapped, form filling starts" }, { i: 2, at: 11.6 }, { i: 3, action: 43.3, what: "app flies to the new home's pin at street level" }, { i: 4, at: 50.0 }] } },
  a08: { folder: "a08-find-location-video", stem: "a08-find-location", src: OWN + "favorites-owner.mp4", head: "Find holiday lights near you tonight", noteFrom: 12.0,
    short: { id: "a08", seg: [[0.4, 2.8, 0.8], [2.8, 5.4, 1.25], [5.4, 6.0, 1], [6.0, 11.6, 1.25], [11.6, 12.8, 1]], cues: [{ i: 0, at: 0.5 }, { i: 1, action: 2.4, what: "Find my location tapped (permission prompt appears)" }, { i: 2, action: 5.6, what: "map zooms to the user, nearby dots fill" }, { i: 3, action: 12.0, what: "place card opens" }] },
    reel: { id: "a08r", seg: [[0.4, 2.8, 0.8], [2.8, 5.4, 1.25], [5.4, 6.0, 1], [6.0, 11.6, 1.25], [11.6, 16.0, 1]], cues: [{ i: 0, at: 0.5 }, { i: 1, action: 2.4, what: "Find my location tapped (permission prompt appears)" }, { i: 2, action: 5.6, what: "map zooms to the user, nearby dots fill" }, { i: 3, action: 12.0, what: "place card opens" }, { i: 4, at: 14.2 }] } },
  a09: { folder: "a09-favorites-video", stem: "a09-favorites", src: OWN + "find-lights-owner.mp4", head: "Plan a family lights drive", noteFrom: 46.3,
    short: { id: "a09", seg: [[11.5, 13.8, 1], [43.5, 46.0, 1.25], [46.0, 49.4, 1], [49.4, 53.9, 1.25]], cues: [{ i: 0, at: 11.5 }, { i: 1, action: 12.9, what: "heart tapped on a place card" }, { i: 2, action: 46.4, what: "Route these tapped, Your favorites panel opens" }, { i: 3, at: 51.0 }] },
    reel: { id: "a09r", seg: [[11.0, 14.0, 1], [16.0, 17.9, 1], [43.5, 46.0, 1.25], [46.0, 49.4, 1], [49.4, 53.9, 1.25]], cues: [{ i: 0, at: 11.1 }, { i: 1, action: 12.9, what: "heart tapped on a place card" }, { i: 2, action: 46.4, what: "Route these tapped, Your favorites panel opens" }, { i: 3, action: 49.8, what: "Apple Maps opens with the stops" }, { i: 4, at: 52.2 }] } },
  a07: { folder: "a07-route-video", stem: "a07-route", src: OWN + "favorites-owner.mp4", head: "Be on someone's lights route", noteFrom: 31.0,
    short: { id: "a07", seg: [[24.8, 26.6, 1], [26.6, 31.0, 1.25], [31.0, 36.6, 1]], cues: [{ i: 0, action: 25.9, what: "Route these tapped, panel opens" }, { i: 1, action: 31.4, what: "Open in Apple Maps tapped, Apple Maps opens" }, { i: 2, at: 35.3 }] },
    reel: { id: "a07r", seg: [[24.0, 26.6, 1], [26.6, 31.0, 1], [31.0, 36.6, 1]], cues: [{ i: 0, action: 25.9, what: "Route these tapped, panel opens" }, { i: 1, action: 31.4, what: "Open in Apple Maps tapped, Apple Maps opens" }, { i: 2, at: 28.6 }, { i: 3, at: 35.3 }] } },
};
// walkthrough plans written by walk.mjs replace the older cuts
for (const [k, f, st] of [["a06", "a06-add-home-video", "a06-add-home"], ["a07", "a07-route-video", "a07-route"], ["a08", "a08-find-location-video", "a08-find-location"], ["a09", "a09-favorites-video", "a09-favorites"]]) { try { V[k] = { folder: f, stem: st, ...JSON.parse(readFileSync(`${WORK}/${k}-plan.json`, "utf8")) }; } catch {} }
const [vid, place] = process.argv.slice(2), v = V[vid], reel = place === "reel", sp = reel ? v.reel : v.short;
const FMT = place === "feed" ? { W: 1080, H: 1350, PH: 1150, y: 200, h: { y: 8, s: 42 }, c: { y: 64, s: 32 }, n: { y: 120, s: 27 }, tag: "4x5" }
  : { W: 1080, H: 1920, PH: 1460, y: 460, h: { y: 272, s: 46 }, c: { y: 334, s: 32 }, n: { y: 392, s: 26 }, tag: "9x16" };
FMT.PW = Math.round((1080 * FMT.PH / (v.srcH || 2314)) / 2) * 2;
const LEAD = 0.1, mkdir = (d) => mkdirSync(d, { recursive: true }), D = `${WORK}/${vid}-${place}`; mkdir(D);
// source time -> output time
let acc = 0; const segs = sp.seg.map(([s, e, k]) => { const o = acc; acc += (e - s) / k; return { s, e, k, o }; });
const out = (t) => { const g = segs.find((x) => t >= x.s - 1e-6 && t <= x.e + 1e-6); if (!g) throw new Error("time not in cut: " + t); return g.o + (t - g.s) / g.k; };
const lines = LINES[sp.id]; const clips = []; let prevEnd = 0;
for (const c of sp.cues) {
  const len = lines[c.i].sec; let st = c.action != null ? out(c.action) - LEAD : out(c.at);
  if (st < 0.08) st = 0.08; if (st < prevEnd + 0.25) st = prevEnd + 0.05; // no overlap
  clips.push({ i: c.i, text: lines[c.i].text, wav: `${TTS}/${sp.id}-${c.i}.wav`, start: st, dur: len, end: st + len, action: c.action != null ? out(c.action) : null, what: c.what || "(no on-screen cue)" });
  prevEnd = st + len;
}
const lastEnd = Math.max(...clips.map((c) => c.end)); let core = Math.max(acc, lastEnd + 0.7);
const q30 = (x) => Math.ceil(x * 30 - 1e-6) / 30; core = q30(core); const endCard = reel ? 3 : 0, total = core + endCard, hold = core - acc;
if (!reel && total > 38) throw new Error(`feed/story cut too long: ${total}`);
if (reel && (total < 24 || total > 48)) throw new Error(`reel length ${total}`);
const sync = clips.map((c) => ({ cue: c.text, narration_start_s: +c.start.toFixed(3), action_s: c.action == null ? null : +c.action.toFixed(3), what: c.what, offset_ms: c.action == null ? null : Math.round((c.action - c.start) * 1000), pass: c.action == null ? "n/a" : (c.action - c.start) * 1000 >= -100 && (c.action - c.start) * 1000 <= 400 }));
// overlay layers (PNG) -------------------------------------------------------------------------------------------------------------
const FONT = `<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800&display=swap" rel="stylesheet">`;
const br = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
async function layer(html, file) {
  const p = await br.newPage({ viewport: { width: FMT.W, height: FMT.H } });
  await p.setContent(`<!doctype html><meta charset=utf-8>${FONT}<style>html,body{margin:0;width:${FMT.W}px;height:${FMT.H}px;overflow:hidden;background:transparent;font-family:"Plus Jakarta Sans",system-ui,sans-serif}.t{position:absolute;left:50px;right:50px;text-align:center;color:#fff;font-weight:800;line-height:1.12;text-wrap:balance}</style>${html}`, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250); await p.screenshot({ path: file, omitBackground: true }); await p.close();
}
const pill = (t) => `<div class="t" style="top:${FMT.c.y}px;font-size:${t.length > 44 ? Math.round(FMT.c.s * 0.8) : FMT.c.s}px;white-space:nowrap"><span style="display:inline-block;background:#ffd166;color:#14161b;padding:${FMT.c.s * .18}px ${FMT.c.s * .7}px;border-radius:99px;font-weight:800">${t}</span></div>`;
await layer(`<div class="t" style="top:${FMT.h.y}px;font-size:${FMT.h.s}px">${v.head}</div>`, D + "/head.png");
for (const c of clips) await layer(pill(c.text), `${D}/cap${c.i}.png`);
await layer(`<div class="t" style="top:${FMT.n.y}px;font-size:${FMT.n.s}px;font-weight:500;color:#e8ecf4">${NOTE}</div>`, D + "/note.png");
if (reel) { const logo = readFileSync(HERE + "/logo-512.png").toString("base64");
  await layer(`<div style="position:absolute;inset:0;background:linear-gradient(180deg,#1a1f33,#0b0d12 75%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;color:#fff"><img src="data:image/png;base64,${logo}" style="width:340px;height:340px"><div style="font-size:76px;font-weight:800">SoCal <b style="color:#ff6b6b">Lights</b></div><div style="font-size:68px;font-weight:800;color:#ffd166">socallights.app</div></div>`, D + "/end.png"); }
await br.close();
// video ----------------------------------------------------------------------------------------------------------------------------
const filt = [];
segs.forEach((g, k) => filt.push(`[0:v]trim=start=${g.s}:end=${g.e},setpts=(PTS-STARTPTS)/${g.k},fps=30[s${k}]`));
filt.push(`${segs.map((_, k) => `[s${k}]`).join("")}concat=n=${segs.length}:v=1:a=0,tpad=stop_mode=clone:stop_duration=${hold.toFixed(3)},setsar=1,split=2[a][b]`);
filt.push(`[a]scale=${FMT.W}:${FMT.H}:force_original_aspect_ratio=increase,crop=${FMT.W}:${FMT.H},boxblur=40:6,eq=brightness=-0.32:saturation=0.8[bg]`);
filt.push(`[b]scale=${FMT.PW}:${FMT.PH}:flags=lanczos[fg]`);
filt.push(`[bg][fg]overlay=${(FMT.W - FMT.PW) / 2}:${FMT.y}[v0]`);
let last = "v0", n = 1;
const inputs = ["-i", sp.src || v.src, "-loop", "1", "-i", D + "/head.png"]; // input 1 = headline
filt.push(`[${last}][1:v]overlay=0:0[v${n}]`); last = `v${n++}`;
let idx = 2;
for (const c of clips) { inputs.push("-loop", "1", "-i", `${D}/cap${c.i}.png`); filt.push(`[${last}][${idx}:v]overlay=0:0:enable='between(t,${(c.start - 0.05).toFixed(3)},${(c.end + 0.25).toFixed(3)})'[v${n}]`); last = `v${n++}`; idx++; }
inputs.push("-loop", "1", "-i", D + "/note.png");
const nf = sp.noteFrom !== undefined ? sp.noteFrom : v.noteFrom, noteStart = nf == null ? null : out(nf); if (noteStart != null) { filt.push(`[${last}][${idx}:v]overlay=0:0:enable='gte(t,${noteStart.toFixed(3)})'[v${n}]`); last = `v${n++}`; idx++; } else idx++;
let vmap = last;
if (reel) { inputs.push("-loop", "1", "-i", D + "/end.png");
  filt.push(`[${last}]trim=duration=${core.toFixed(3)},setpts=PTS-STARTPTS,fps=30[main]`, `[${idx}:v]scale=${FMT.W}:${FMT.H},setsar=1,fps=30,trim=duration=${endCard},setpts=PTS-STARTPTS[endc]`, `[main][endc]concat=n=2:v=1:a=0[vo]`); vmap = "vo"; }
else filt.push(`[${last}]trim=duration=${core.toFixed(3)},setpts=PTS-STARTPTS[vo]`), (vmap = "vo");
const vid0 = `${D}/video.mp4`;
let r = spawnSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", filt.join(";"), "-map", `[${vmap}]`, "-r", "30", "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-profile:v", "high", "-an", vid0], { encoding: "utf8" });
if (r.status) throw new Error(r.stderr.slice(0, 800));
// audio ----------------------------------------------------------------------------------------------------------------------------
// the music bed is ONE swappable file: pass --music <file> (wav, mp3 or m4a, any length of 12 s or more) to re-mix with the same ducking and loudness
const mi = process.argv.indexOf("--music"), MUSIC = mi > 0 ? resolve(process.argv[mi + 1]) : HERE + "/audio/candidates/A-bright-bells-pop.mp3";
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", MUSIC, "-ar", "48000", "-ac", "2", `${WORK}/music-${process.pid}.wav`]);
writeFileSync(D + "/spec.json", JSON.stringify({ total: total, report: D + "/duck.json", clips: clips.map((c) => ({ wav: c.wav, start: c.start, dur: c.dur })) }));
execFileSync("python3", ["-I", HERE + "/audio/mix.py", D + "/spec.json", D + "/mix.wav", `${WORK}/music-${process.pid}.wav`]);
const m1 = spawnSync("ffmpeg", ["-hide_banner", "-i", D + "/mix.wav", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const j = JSON.parse(m1.slice(m1.lastIndexOf("{"), m1.lastIndexOf("}") + 1));
const ln = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
mkdir(`${ROOT}/${v.folder}`);
const final = `${ROOT}/${v.folder}/${v.stem}-${place}-${FMT.tag}.mp4`;
r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", vid0, "-i", D + "/mix.wav", "-af", `${ln},aresample=48000`, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", total.toFixed(3), "-movflags", "+faststart", final], { encoding: "utf8" });
if (r.status) throw new Error(r.stderr.slice(0, 800));
writeFileSync(`${WORK}/${vid}-${place}-sync.json`, JSON.stringify({ final, total, core, hold, sync, note_from_s: noteStart }, null, 1));
console.log(final, "total", total.toFixed(2), JSON.stringify(sync.map((s) => [s.cue.slice(0, 18), s.offset_ms, s.pass])));
