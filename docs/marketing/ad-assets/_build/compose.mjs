// Builds the final ad MP4s (9:16 and 4:5) from recordings made by scenarios.mjs.
// The phone screen FILLS the frame (390 css px wide page at 2.77x = 1080 px, no device border). On top: a dark bar with the ad's own
// headline from the first frame, and a timed yellow caption under it. 9:16: the bar sits inside the safe area (headline starts below
// the top 14%); the phone's bottom bar sits in the bottom 20%, where only icons (no key text) are shown.
// Usage: WORK=<dir> node compose.mjs <id> <outDir> <nameStem> [916|45]   (reads <WORK>/<id>-916 and <WORK>/<id>-45)
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const [id, outDir, stem, only] = process.argv.slice(2), WORK = process.env.WORK;
mkdirSync(outDir, { recursive: true });
const FMT = {
  "916": { name: "story-9x16", W: 1080, H: 1920, barY: 250, barH: 290, hy: 272, hsz: 64, cy: 440 },
  "45": { name: "feed-4x5", W: 1080, H: 1350, barY: 0, barH: 260, hy: 26, hsz: 62, cy: 186 },
};
const FONT = `<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800&display=swap" rel="stylesheet">`;
const br = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
async function shot(html, W, H, out) {
  const p = await br.newPage({ viewport: { width: W, height: H } });
  await p.setContent(`<!doctype html><meta charset=utf-8>${FONT}<style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:transparent;font-family:"Plus Jakarta Sans",system-ui,sans-serif}</style>${html}`, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: out, omitBackground: true }); await p.close();
}
for (const k of only ? [only] : ["916", "45"]) {
  const crop = k === "45" && process.env.CROP45 === "1"; // 4:5 cut taken from the 9:16 recording (bottom 1350 rows), when the 4:5 page itself is too short to work in
  const dir = `${WORK}/${id}-${crop ? "916" : k}`, tl = JSON.parse(readFileSync(dir + "/timeline.json", "utf8")), F = FMT[k];
  // Stalls (the software-rendered map is slow, so some taps take seconds) are shortened: no single still frame is held longer than CL
  // seconds (except the last), and the caption times are remapped to match. Anything still over CAP (11.8 s for feed and Story, 15 s for the Reel core) is then sped up evenly.
  const CL = +(process.env.CL || 0.35), CAP = +(process.env.CAP || 11.8), lines = readFileSync(dir + "/frames.txt", "utf8").split("\n"), segs = []; let o = 0, n = 0;
  const out2 = lines.map((l) => { const m = /^duration ([\d.]+)/.exec(l); if (!m) return l; const d = +m[1], nd = Math.min(d, CL); segs.push([o, o + d, n, n + nd]); o += d; n += nd; return "duration " + nd.toFixed(4); });
  const lastSeg = segs[segs.length - 1]; lastSeg[3] += Math.max(0, lastSeg[1] - lastSeg[0] - CL); n += Math.max(0, lastSeg[1] - lastSeg[0] - CL); // keep the full hold on the last frame
  const remap = (t) => { for (const [a, b, na, nb] of segs) if (t <= b) return na + (nb - na) * ((t - a) / Math.max(1e-6, b - a)); return n + Math.max(0, t - o); };
  writeFileSync(dir + "/frames2.txt", out2.join("\n").replace(/duration ([\d.]+)(?![\s\S]*duration)/, (m, d) => "duration " + (lastSeg[3] - lastSeg[2]).toFixed(4)));
  const total2 = remap(tl.total), f = Math.max(1, total2 / CAP);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "frames2.txt", "-vf", `setpts=PTS/${f},fps=30,scale=1080:${crop ? 1920 : F.H}:flags=lanczos${crop ? ",crop=1080:1350:0:570" : ""}`, "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p", "raw.mp4"], { cwd: dir });
  await shot(`<div style="position:absolute;left:0;right:0;top:${F.barY}px;height:${F.barH}px;background:linear-gradient(180deg,rgba(11,13,18,.94),rgba(11,13,18,.9))"></div>
  <div style="position:absolute;left:70px;right:70px;top:${F.hy}px;text-align:center;color:#fff;font-weight:800;font-size:${F.hsz}px;line-height:1.1;letter-spacing:-1px;text-wrap:balance">${tl.headline}</div>`, F.W, F.H, `${dir}/bar-${k}.png`);
  for (let i = 0; i < tl.caps.length; i++)
    await shot(`<div style="position:absolute;left:0;right:0;top:${F.cy}px;text-align:center"><span style="display:inline-block;background:#ffd166;color:#14161b;font-weight:800;font-size:40px;padding:12px 30px;border-radius:99px;max-width:960px;line-height:1.15">${tl.caps[i].text}</span></div>`, F.W, F.H, `${dir}/cap-${k}-${i}.png`);
  const caps = tl.caps.map((c) => ({ ...c, t0: remap(c.t0) / f, t1: remap(c.t1) / f })), dur = Math.min(total2 / f, CAP + 0.2);
  const inputs = ["-i", "raw.mp4", "-loop", "1", "-i", `bar-${k}.png`, ...caps.flatMap((c, i) => ["-loop", "1", "-i", `cap-${k}-${i}.png`]), "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"];
  let fc = `[0:v][1:v]overlay=0:0:shortest=0[b0]`;
  caps.forEach((c, i) => { fc += `;[b${i}][${2 + i}:v]overlay=0:0:enable='between(t,${c.t0.toFixed(2)},${c.t1.toFixed(2)})'[b${i + 1}]`; });
  const out = `${outDir}/${stem}-${process.env.OUTSUFFIX || F.name}.mp4`;
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", fc, "-map", `[b${caps.length}]`, "-map", `${2 + caps.length}:a`, "-t", dur.toFixed(2), "-r", "30", "-c:v", "libx264", "-crf", "23", "-preset", "medium", "-pix_fmt", "yuv420p", "-profile:v", "high", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", out], { cwd: dir, encoding: "utf8" });
  console.log(k, r.status, r.stderr.slice(0, 400), out);
}
await br.close();
