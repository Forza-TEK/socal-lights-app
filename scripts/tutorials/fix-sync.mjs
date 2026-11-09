#!/usr/bin/env node
// Repairs sync on already-rendered videos without re-recording: the video stream is copied untouched.
//   1. audio is padded with silence (or trimmed) to exactly the video duration, both streams start at 0, so the two stream
//      durations match (the recorder used to leave the audio about 1.9 s short: the silent end card);
//   2. the .vtt cue times are re-derived from the audio (captions.mjs), instead of being guessed from character counts.
// Usage: node scripts/tutorials/fix-sync.mjs [--dir=public/tutorials] [--captions-only|--audio-only] [id ...]
import { readFileSync, existsSync, renameSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { retimeVtt } from "./captions.mjs";

const args = process.argv.slice(2), opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || "").split("=")[1] ?? d;
const DIR = opt("dir", "public/tutorials"), ids = args.filter((a) => !a.startsWith("--"));
const AUDIO = !args.includes("--captions-only"), CAPS = !args.includes("--audio-only");
const dur = (f, s) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-select_streams", s, "-show_entries", "stream=duration", "-of", "csv=p=0", f]).toString());
const tj = JSON.parse(readFileSync("public/tutorials.json", "utf8"));
for (const g of tj.groups) for (const v of g.videos) {
  if (ids.length && !ids.includes(v.id)) continue;
  const jobs = [v.url && [v.url, v.captions], v.mobile?.url && [v.mobile.url, v.mobile.captions]].filter(Boolean);
  for (const [url, cap] of jobs) {
    const f = join(DIR, url.split("/").pop()), vd = dur(f, "v:0"), ad = dur(f, "a:0");
    if (AUDIO && Math.abs(vd - ad) > 0.02) {
      const tmp = f + ".fix.mp4";
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", f, "-map", "0:v", "-map", "0:a", "-c:v", "copy", "-af", "aresample=48000:async=1,apad", "-c:a", "aac", "-b:a", "160k", "-ac", "2", "-ar", "48000", "-t", String(vd), "-movflags", "+faststart", tmp]);
      renameSync(tmp, f);
    }
    let note = "";
    if (CAPS && cap && existsSync(join(DIR, cap.split("/").pop()))) {
      const r = retimeVtt(f, join(DIR, cap.split("/").pop()), dur(f, "a:0")), mx = Math.max(...r.shifts), avg = r.shifts.reduce((a, b) => a + b, 0) / r.shifts.length;
      note = `captions: ${r.snapped}/${r.cues} snapped, moved avg ${(avg * 1000) | 0} ms max ${(mx * 1000) | 0} ms, ${r.outliers.length} rate outliers${r.outliers.length ? " " + JSON.stringify(r.outliers.slice(0, 3)) : ""}`;
    }
    console.log(`${v.id} ${f.endsWith("mobile.mp4") ? "phone" : "computer"}: video ${vd.toFixed(2)} audio ${ad.toFixed(2)} -> ${dur(f, "a:0").toFixed(2)}  ${note}`);
  }
}
