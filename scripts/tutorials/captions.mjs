// Caption timing from the finished audio. The recorder knows exactly where each narration segment starts, but a segment can hold
// several sentences, and their cue times used to be guessed from character counts (up to a second out). retimeVtt() listens to the
// audio track of the rendered video (silence detection), finds where each sentence really starts (a voice onset after a pause), and
// moves every cue to it. Cue ends follow the voice. Used by record.mjs after rendering, and by retime-captions.mjs on published files.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const toSec = (s) => { const m = /^(?:(\d+):)?(\d+):(\d+)[.,](\d+)$/.exec(s.trim()); return (+(m[1] || 0)) * 3600 + +m[2] * 60 + +m[3] + +("0." + m[4]); };
const ts = (x) => { x = Math.max(0, x); const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = x - h * 3600 - m * 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`; };

export function readVtt(f) {
  const cues = [];
  for (const b of readFileSync(f, "utf8").replace(/\r/g, "").split(/\n\n+/)) { const m = /(\S+)\s+-->\s+(\S+)\n([\s\S]*)/.exec(b.trim()); if (m) cues.push({ a: toSec(m[1]), b: toSec(m[2]), text: m[3].trim() }); }
  return cues;
}
export function writeVtt(f, cues) { writeFileSync(f, "WEBVTT\n\n" + cues.map((c) => `${ts(c.a)} --> ${ts(c.b)}\n${c.text}`).join("\n\n") + "\n"); }

// voice runs of the audio track: [{ on, off, pauseBefore }]
export function voiceRuns(media, total) {
  const r = spawnSync("ffmpeg", ["-v", "info", "-i", media, "-vn", "-af", "silencedetect=noise=-40dB:d=0.08", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 });
  const sil = []; let cur = null;
  for (const l of r.stderr.split("\n")) { let m; if ((m = /silence_start: (-?[\d.]+)/.exec(l))) cur = Math.max(0, +m[1]); else if ((m = /silence_end: ([\d.]+)/.exec(l)) && cur !== null) { sil.push([cur, +m[1]]); cur = null; } }
  if (cur !== null) sil.push([cur, total]);
  const runs = []; let p = 0, pb = 99;
  for (const [a, b] of sil) { if (a - p > 0.05) runs.push({ on: p, off: a, pauseBefore: pb }); p = b; pb = b - a; }
  if (total - p > 0.05) runs.push({ on: p, off: total, pauseBefore: pb });
  return runs;
}

// monotonic assignment of cues to voice onsets; longer pauses are preferred (sentence ends) over commas
export function retime(cues, runs, { window = 1.8, keepPenalty = 0.7 } = {}) {
  const n = cues.length, m = runs.length, INF = 1e9;
  const cost = (i, j) => { const d = Math.abs(runs[j].on - cues[i].a); return d > window ? INF : d - 0.8 * Math.min(runs[j].pauseBefore, 0.6); };
  // dp[i][j] = best cost with cue i assigned to run j (or j = -1: kept); track last used run index
  const best = Array.from({ length: n + 1 }, () => new Map()); best[0].set(-1, { c: 0, prev: null });
  for (let i = 0; i < n; i++) for (const [last, st] of best[i]) {
    const keepKey = last; // keeping an original time does not consume a run
    const kc = st.c + keepPenalty; if (!best[i + 1].has(keepKey) || best[i + 1].get(keepKey).c > kc) best[i + 1].set(keepKey, { c: kc, prev: [last, -2] });
    for (let j = last + 1; j < m; j++) { if (runs[j].on - cues[i].a > window) break; const c = cost(i, j); if (c >= INF) continue; const nc = st.c + c; if (!best[i + 1].has(j) || best[i + 1].get(j).c > nc) best[i + 1].set(j, { c: nc, prev: [last, j] }); }
  }
  let key = null, bc = INF; for (const [k, st] of best[n]) if (st.c < bc) { bc = st.c; key = k; }
  const pick = new Array(n).fill(-1);
  for (let i = n; i > 0; i--) { const st = best[i].get(key); pick[i - 1] = st.prev[1] === -2 ? -1 : st.prev[1]; key = st.prev[0]; }
  const out = cues.map((c, i) => ({ ...c, a: pick[i] >= 0 ? Math.max(0, runs[pick[i]].on - 0.02) : c.a, snapped: pick[i] >= 0 }));
  for (let i = 1; i < n; i++) if (out[i].a < out[i - 1].a + 0.2) out[i].a = out[i - 1].a + 0.2;
  const offs = runs.map((r) => r.off);
  for (let i = 0; i < n; i++) {
    const nxt = i + 1 < n ? out[i + 1].a : Infinity;
    const before = offs.filter((o) => o > out[i].a + 0.3 && o <= nxt - 0.02);
    const last = before.length ? before[before.length - 1] : out[i].a + (cues[i].b - cues[i].a);
    out[i].b = nxt - last < 0.9 ? nxt : last + 0.15; // continuous speech: the cue runs until the next one starts
    if (out[i].b <= out[i].a) out[i].b = out[i].a + 0.5;
  }
  return out;
}

// speaking rate sanity check: characters per second of each cue; anything far outside normal speech means the cue is mistimed
export function rateOutliers(cues) { return cues.filter((c) => { const r = c.text.length / (c.b - c.a); return c.text.length > 25 && (r < 6 || r > 28); }).map((c) => ({ at: +c.a.toFixed(1), rate: +(c.text.length / (c.b - c.a)).toFixed(1), text: c.text.slice(0, 50) })); }

export function retimeVtt(media, vttFile, total) {
  const cues = readVtt(vttFile), runs = voiceRuns(media, total), out = retime(cues, runs);
  writeVtt(vttFile, out);
  return { cues: out.length, snapped: out.filter((c) => c.snapped).length, shifts: out.map((c, i) => Math.abs(c.a - cues[i].a)), outliers: rateOutliers(out) };
}
