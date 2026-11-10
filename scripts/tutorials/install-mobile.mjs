// Puts finished phone (9:16 Shorts) videos on the Tutorials page: copies <file>-mobile.mp4/.vtt/.jpg into public/tutorials/
// and fills v.mobile = { url, poster, captions, length } for the matching video in public/tutorials.json.
// Usage: node scripts/tutorials/install-mobile.mjs <outDir> [id id ...]
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
const FILE = { map: "find-map", night: "find-night", email: "find-email", app: "find-app", contests: "find-contests", "pro-filter": "find-pro",
  enter: "enter", "edit-entry": "edit-entry", profile: "profile", vote: "vote", judge: "judge",
  quick: "run-quick", custom: "run-custom", share: "run-share", approve: "run-approve", edit: "run-edit", voting: "run-voting", team: "run-team", announce: "run-announce", activity: "run-activity",
  sponsors: "sponsors-add", installer: "sponsors-installer", "installer-profile": "sponsors-profile", "add-event": "post-event", showcase: "post-house",
  "add-homes": "run-add-homes", unpublish: "run-unpublish", claim: "post-claim", feature: "post-feature", sponsor: "sponsors-sponsor", "sponsor-invite": "sponsors-invite", "contest-passes": "run-passes", "event-partner": "post-partner", "founder-city-badge": "run-founder", "contest-pass-app": "run-pass-app" };
mkdirSync("public/tutorials", { recursive: true });
const out = process.argv[2], only = process.argv.slice(3), J = "public/tutorials.json", d = JSON.parse(readFileSync(J, "utf8")); let n = 0;
for (const g of d.groups) for (const v of g.videos) {
  const f = FILE[v.id]; if (!f || (only.length && !only.includes(v.id)) || !existsSync(`${out}/${f}-mobile.mp4`)) continue;
  const m = `${f}-mobile`;
  copyFileSync(`${out}/${m}.mp4`, `public/tutorials/${m}.mp4`);
  if (existsSync(`${out}/${m}.jpg`)) copyFileSync(`${out}/${m}.jpg`, `public/tutorials/${m}.jpg`);
  else execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "8", "-i", `public/tutorials/${m}.mp4`, "-frames:v", "1", "-q:v", "4", `public/tutorials/${m}.jpg`]);
  if (existsSync(`${out}/${m}.vtt`)) copyFileSync(`${out}/${m}.vtt`, `public/tutorials/${m}.vtt`);
  const secs = Math.round(parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `public/tutorials/${m}.mp4`]).toString()));
  v.mobile = { url: `/tutorials/${m}.mp4`, poster: `/tutorials/${m}.jpg`, captions: `/tutorials/${m}.vtt`, length: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` }; n++;
}
writeFileSync(J, JSON.stringify(d, null, 2) + "\n"); console.log("installed phone versions:", n);
