// Reels cut (9:16, 12 to 20 s): the Story cut (hook and headline from the first frame, burned-in captions), its last frame held for
// 1.5 s, then a plain end card "socallights.app" (3 s). No price, no claims. Silent AAC track, no music.
// Usage: node reel.mjs <story-9x16.mp4> <out-reel-9x16.mp4> <endcard.png>   (renders the end card PNG if it does not exist yet)
import { createRequire } from "node:module";
import { existsSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const [story, out, card] = process.argv.slice(2), HERE = dirname(new URL(import.meta.url).pathname);
if (!existsSync(card)) {
  const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.setContent(`<!doctype html><meta charset=utf-8><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800&display=swap" rel="stylesheet">
  <style>html,body{margin:0;width:1080px;height:1920px;background:linear-gradient(180deg,#1a1f33,#0b0d12 75%);font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px}
  img{width:340px;height:340px}.n{font-size:76px;font-weight:800;letter-spacing:-1px}.n b{color:#ff6b6b}.u{font-size:68px;font-weight:800;color:#ffd166}</style>
  <img src="file://${resolve(HERE, "logo-512.png")}"><div class="n">SoCal <b>Lights</b></div><div class="u">socallights.app</div>`, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: card }); await b.close();
}
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", story, "-loop", "1", "-t", "3", "-i", card, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
  "-filter_complex", "[0:v]tpad=stop_mode=clone:stop_duration=1.5,fps=30,format=yuv420p[a];[1:v]scale=1080:1920,fps=30,format=yuv420p[b];[a][b]concat=n=2:v=1:a=0[v]",
  "-map", "[v]", "-map", "2:a", "-shortest", "-r", "30", "-c:v", "libx264", "-crf", "23", "-pix_fmt", "yuv420p", "-profile:v", "high", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", out]);
console.log("reel", out);
