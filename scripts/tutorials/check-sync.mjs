#!/usr/bin/env node
// Audio/video sync check for every published tutorial video (public/tutorials.json), computer and phone.
// Usage: node scripts/tutorials/check-sync.mjs [id ...] [--json] [--tol=150] [--cue=400] [--gap=8] [--dir=public/tutorials]
// Fails (exit 1) when, for any video:
//   - video and audio stream durations differ by more than the tolerance (default 150 ms),
//   - either stream starts later than the tolerance after 0, or the two start times differ by more than it,
//   - the video is not constant frame rate, or frames x 1/fps is off the stream duration by more than it,
//   - the audio is missing, or the container duration is off the longer stream by more than it,
//   - the captions end more than the tolerance after the audio, or cues overlap or run backwards,
//   - a caption cue starts more than --cue ms (default 400) from a detected voice onset (captions off from the audio),
//   - there is a silent stretch longer than --gap seconds (default 8),
//   - the audio is cut off (it still has sound in its last 50 ms).
// Report per video: start times (ms), duration drift (ms), max caption-to-voice offset (ms), longest silence, pass or fail.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || "").split("=")[1] ?? d;
const TOL = Number(opt("tol", 150)) / 1000, DIR = opt("dir", "public/tutorials"), JSON_OUT = args.includes("--json");
const MAX_GAP = Number(opt("gap", 8)), CUE_TOL = Number(opt("cue", 400)) / 1000;
const ids = args.filter((a) => !a.startsWith("--"));

const probe = (f) => JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,start_time,duration,nb_frames,r_frame_rate,avg_frame_rate:format=duration,start_time", "-of", "json", f]).toString());
const toSec = (s) => { const m = /^(?:(\d+):)?(\d+):(\d+)[.,](\d+)$/.exec(s.trim()); return m ? (+(m[1] || 0)) * 3600 + +m[2] * 60 + +m[3] + +("0." + m[4]) : NaN; };
function vtt(f) {
  const cues = [], t = readFileSync(f, "utf8").replace(/\r/g, "");
  for (const b of t.split(/\n\n+/)) { const m = /(\S+)\s+-->\s+(\S+)/.exec(b); if (m) cues.push({ a: toSec(m[1]), b: toSec(m[2]), text: b.split("\n").slice(1).join(" ") }); }
  return cues;
}
// voice intervals from silencedetect on the audio track
function voice(f, total) {
  const r = spawnSync("ffmpeg", ["-v", "info", "-i", f, "-vn", "-af", "silencedetect=noise=-40dB:d=0.12", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 });
  const sil = []; let cur = null;
  for (const l of r.stderr.split("\n")) { let m; if ((m = /silence_start: (-?[\d.]+)/.exec(l))) cur = Math.max(0, +m[1]); else if ((m = /silence_end: ([\d.]+)/.exec(l)) && cur !== null) { sil.push([cur, +m[1]]); cur = null; } }
  if (cur !== null) sil.push([cur, total]);
  const sp = []; let p = 0; for (const [a, b] of sil) { if (a - p > 0.05) sp.push([p, a]); p = b; } if (total - p > 0.05) sp.push([p, total]);
  return { sil, sp };
}
function tailPeak(f, total) { // loudest sample in the last 50 ms of the audio, in dB
  const r = spawnSync("ffmpeg", ["-v", "info", "-ss", String(Math.max(0, total - 0.05)), "-i", f, "-vn", "-af", "astats=metadata=0", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 24 });
  const m = /Overall[\s\S]*?Peak level dB:\s*(-?[\d.]+|-inf)/.exec(r.stderr);
  return m ? (m[1] === "-inf" ? -99 : parseFloat(m[1])) : -99;
}

// A narrated "tap ..." must be followed by a visible change within 4 s (otherwise the picture never shows what the words promise).
function tapChecks(file, cues) {
  const W = 64, H = 36, r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-an", "-vf", `fps=4,scale=${W}:${H},format=gray`, "-f", "rawvideo", "-"], { maxBuffer: 1 << 28 });
  const buf = r.stdout, n = Math.floor(buf.length / (W * H)), fr = (k) => buf.subarray(k * W * H, (k + 1) * W * H);
  const diff = (a, b) => { let t = 0; for (let i = 0; i < a.length; i++) t += Math.abs(a[i] - b[i]); return t / a.length; };
  const out = [];
  for (const c of cues) {
    if (!/\b(tap|open)\b/i.test(c.text) || c.text.length > 90 || /^(?:If|When|Once|Do you|You can|Want|Need|Say)/.test(c.text)) continue;
    const k0 = Math.max(0, Math.round((c.b - 0.3) * 4)); if (k0 >= n - 1) continue;
    let mx = 0; for (let k = k0 + 1; k <= Math.min(n - 1, k0 + 18); k++) mx = Math.max(mx, diff(fr(k0), fr(k)));
    if (mx < 0.6) out.push({ at: +c.a.toFixed(1), text: c.text.slice(0, 60), change: +mx.toFixed(2) });
  }
  return out;
}

function check(file, cap) {
  const res = { file, issues: [] };
  const p = probe(file), v = p.streams.find((s) => s.codec_type === "video"), a = p.streams.find((s) => s.codec_type === "audio");
  if (!v) { res.issues.push("no video stream"); return res; }
  if (!a) { res.issues.push("no audio stream"); return res; }
  const vd = +v.duration, ad = +a.duration, fd = +p.format.duration, vs = +v.start_time, as = +a.start_time;
  res.videoStartMs = Math.round(vs * 1000); res.audioStartMs = Math.round(as * 1000);
  res.video = +vd.toFixed(3); res.audio = +ad.toFixed(3); res.container = +fd.toFixed(3);
  res.durationDriftMs = Math.round((vd - ad) * 1000);
  res.startOffsetMs = Math.round((as - vs) * 1000);
  const [fn, fdn] = v.avg_frame_rate.split("/").map(Number), [rn, rdn] = v.r_frame_rate.split("/").map(Number);
  res.fps = +(fn / fdn).toFixed(3);
  res.cfr = Math.abs(fn / fdn - rn / rdn) < 0.01;
  res.frameDriftMs = v.nb_frames ? Math.round((+v.nb_frames / (rn / rdn) - vd) * 1000) : 0;
  if (Math.abs(vd - ad) > TOL) res.issues.push(`stream durations differ by ${Math.round((vd - ad) * 1000)} ms (video ${vd.toFixed(2)} s, audio ${ad.toFixed(2)} s)`);
  if (Math.abs(vs) > TOL || Math.abs(as) > TOL) res.issues.push(`start offset video ${res.videoStartMs} ms, audio ${res.audioStartMs} ms`);
  if (Math.abs(as - vs) > TOL) res.issues.push(`audio starts ${res.startOffsetMs} ms after video`);
  if (!res.cfr) res.issues.push("variable frame rate");
  if (Math.abs(res.frameDriftMs) > TOL * 1000) res.issues.push(`frame count x rate is ${res.frameDriftMs} ms off the stream duration`);
  if (Math.abs(fd - Math.max(vd, ad)) > TOL) res.issues.push("container duration differs from the longer stream");
  const { sil, sp } = voice(file, ad);
  res.longestSilence = +Math.max(0, ...sil.map(([x, y]) => y - x)).toFixed(2);
  res.tailPeakDb = tailPeak(file, ad);
  if (res.tailPeakDb > -30) res.issues.push(`audio cut off: sound in the last 50 ms (${res.tailPeakDb} dB)`);
  for (const [x, y] of sil) if (y - x > MAX_GAP) res.issues.push(`silent stretch of ${(y - x).toFixed(1)} s at ${x.toFixed(1)} s`);
  if (cap && existsSync(cap)) {
    const cues = vtt(cap);
    res.cues = cues.length;
    const last = cues.length ? cues[cues.length - 1].b : 0;
    res.captionEndMs = Math.round(last * 1000);
    if (last - Math.max(ad, vd) > TOL) res.issues.push(`captions end ${Math.round((last - ad) * 1000)} ms after the audio`);
    cues.forEach((c, i) => { if (!(c.b > c.a)) res.issues.push(`cue ${i + 1} ends before it starts`); if (i && c.a < cues[i - 1].a) res.issues.push(`cue ${i + 1} out of order`); if (i && c.a < cues[i - 1].b - 0.05) res.issues.push(`cue ${i + 1} overlaps the previous one by ${Math.round((cues[i - 1].b - c.a) * 1000)} ms`); });
    // caption start vs nearest voice onset
    const onsets = sp.map((s) => s[0]); let worst = 0, worstAt = 0;
    for (const c of cues) { const d = Math.min(...onsets.map((o) => Math.abs(o - c.a))); if (d > worst) { worst = d; worstAt = c.a; } }
    res.noChange = tapChecks(file, cues); for (const t of res.noChange) res.issues.push(`no visible change after "${t.text}" (cue at ${t.at} s)`);
    res.maxCueOffsetMs = Math.round(worst * 1000); res.maxCueOffsetAt = +worstAt.toFixed(1);
    if (worst > CUE_TOL) res.issues.push(`a caption starts ${Math.round(worst * 1000)} ms from the nearest voice onset (at ${worstAt.toFixed(1)} s)`);
  } else res.issues.push("no captions file");
  return res;
}

const tj = JSON.parse(readFileSync("public/tutorials.json", "utf8")), out = [];
for (const g of tj.groups) for (const v of g.videos) {
  if (ids.length && !ids.includes(v.id)) continue;
  if (!v.url) continue;
  const jobs = [["computer", v.url, v.captions]]; if (v.mobile?.url) jobs.push(["phone", v.mobile.url, v.mobile.captions]);
  for (const [kind, url, cap] of jobs) {
    const file = join(DIR, url.split("/").pop()), capf = cap ? join(DIR, cap.split("/").pop()) : null;
    const r = existsSync(file) ? check(file, capf) : { file, issues: ["file missing"] };
    r.id = v.id; r.kind = kind; r.pass = r.issues.length === 0; out.push(r);
    if (!JSON_OUT) console.log(`${r.pass ? "PASS" : "FAIL"} ${v.id.padEnd(15)} ${kind.padEnd(8)} v ${r.video}s a ${r.audio}s  start v/a ${r.videoStartMs}/${r.audioStartMs} ms  drift ${r.durationDriftMs} ms  cue offset max ${r.maxCueOffsetMs ?? "-"} ms  longest silence ${r.longestSilence}s${r.issues.length ? "\n     - " + r.issues.join("\n     - ") : ""}`);
  }
}
if (JSON_OUT) console.log(JSON.stringify(out, null, 1));
const bad = out.filter((r) => !r.pass);
console.error(`\n${out.length - bad.length} of ${out.length} pass (tolerance ${TOL * 1000} ms)`);
process.exit(bad.length ? 1 : 0);
