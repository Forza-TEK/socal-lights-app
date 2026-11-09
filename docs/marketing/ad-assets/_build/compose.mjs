// Builds the final ad MP4s (9:16 and 4:5) from a recording made by adrec.mjs / scenarios.mjs.
// Usage: WORK=<dir> node compose.mjs <id> <outDir> <nameStem> [916|45]
// Layout: headline (the ad's own headline) from the first frame, a timed caption under it, the phone screen in a rounded frame.
// 9:16 keeps the text and the phone inside the safe area (14% side/top margins, nothing important in the bottom 20%).
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const [id, outDir, stem, only] = process.argv.slice(2), WORK = process.env.WORK, dir = `${WORK}/${id}`;
const tl = JSON.parse(readFileSync(dir + "/timeline.json", "utf8"));
mkdirSync(outDir, { recursive: true });
const FMT = {
  "916": { name: "9x16-1080x1920", W: 1080, H: 1920, hy: 285, hsz: 66, cy: 462, py: 545 },
  "45": { name: "4x5-1080x1350", W: 1080, H: 1350, hy: 52, hsz: 66, cy: 218, py: 300 },
};
const PW = 570, PH = 980; // phone window (360x620 page scaled 1.58)
const FONT = `<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800&display=swap" rel="stylesheet">`;
const br = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
async function shot(html, W, H, out, transparent) {
  const p = await br.newPage({ viewport: { width: W, height: H } });
  await p.setContent(`<!doctype html><meta charset=utf-8>${FONT}<style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;font-family:"Plus Jakarta Sans",system-ui,sans-serif}</style>${html}`, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: out, omitBackground: !!transparent }); await p.close();
}
// 1) raw phone video at constant 30 fps
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "frames.txt", "-vf", "fps=30,scale=570:980:flags=lanczos", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "raw.mp4"], { cwd: dir });
for (const k of only ? [only] : ["916", "45"]) {
  const F = FMT[k], px = (F.W - PW) / 2;
  const bg = `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#1a1f33,#0b0d12 70%)"></div>
  <div style="position:absolute;left:100px;right:100px;top:${F.hy}px;text-align:center;color:#fff;font-weight:800;font-size:${F.hsz}px;line-height:1.1;letter-spacing:-1px;text-wrap:balance">${tl.headline}</div>
  <div style="position:absolute;left:${px - 8}px;top:${F.py - 8}px;width:${PW + 16}px;height:${PH + 16}px;border-radius:50px;background:#2b3145;box-shadow:0 12px 40px rgba(0,0,0,.6)"></div>`;
  await shot(bg, F.W, F.H, `${dir}/bg-${k}.png`);
  await shot(`<div style="width:${PW}px;height:${PH}px;border-radius:42px;background:#fff"></div>`, PW, PH, `${dir}/mask-${k}.png`);
  const caps = [];
  for (let i = 0; i < tl.caps.length; i++) {
    await shot(`<div style="position:absolute;left:0;right:0;top:${F.cy}px;text-align:center"><span style="display:inline-block;background:#ffd166;color:#14161b;font-weight:800;font-size:38px;padding:12px 30px;border-radius:99px;max-width:860px;line-height:1.15">${tl.caps[i].text}</span></div>`, F.W, F.H, `${dir}/cap-${k}-${i}.png`, true);
    caps.push(tl.caps[i]);
  }
  const dur = Math.min(tl.total, 12);
  const inputs = ["-loop", "1", "-i", `bg-${k}.png`, "-i", "raw.mp4", "-loop", "1", "-i", `mask-${k}.png`, ...caps.flatMap((c, i) => ["-loop", "1", "-i", `cap-${k}-${i}.png`]), "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"];
  let fc = `[1:v]scale=${PW}:${PH}:flags=lanczos,format=rgba[v];[2:v]scale=${PW}:${PH},format=gray[m];[v][m]alphamerge[vr];[0:v][vr]overlay=${px}:${F.py}:shortest=0[b0]`;
  caps.forEach((c, i) => { fc += `;[b${i}][${3 + i}:v]overlay=0:0:enable='between(t,${c.t0.toFixed(2)},${c.t1.toFixed(2)})'[b${i + 1}]`; });
  const out = `${outDir}/${stem}-${F.name}.mp4`.replace(/^(?!\/)/, process.cwd() + "/");
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", fc, "-map", `[b${caps.length}]`, "-map", `${3 + caps.length}:a`, "-t", dur.toFixed(2), "-r", "30", "-c:v", "libx264", "-crf", "23", "-preset", "medium", "-pix_fmt", "yuv420p", "-profile:v", "high", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", out], { cwd: dir, encoding: "utf8" });
  console.log(k, r.status, r.stderr.slice(0, 400), out);
}
await br.close();
