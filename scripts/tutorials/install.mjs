// Puts finished videos on the Tutorials page: copies <file>.mp4 and <file>.jpg into public/tutorials/ and fills url, poster and length
// for the matching video in public/tutorials.json (each video keeps its own slot in its group).
// Usage: node scripts/tutorials/install.mjs <outDir> [id id ...]   (no ids = every video that has a file in outDir)
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
const FILE = { map: "find-map", night: "find-night", email: "find-email", app: "find-app", contests: "find-contests", "pro-filter": "find-pro",
  enter: "enter", "edit-entry": "edit-entry", profile: "profile", vote: "vote", judge: "judge",
  quick: "run-quick", custom: "run-custom", share: "run-share", approve: "run-approve", edit: "run-edit", voting: "run-voting", team: "run-team", announce: "run-announce", activity: "run-activity",
  sponsors: "sponsors-add", installer: "sponsors-installer", "installer-profile": "sponsors-profile", "add-event": "post-event", showcase: "post-house",
  "add-homes": "run-add-homes", unpublish: "run-unpublish", claim: "post-claim", feature: "post-feature", sponsor: "sponsors-sponsor", "sponsor-invite": "sponsors-invite", "contest-passes": "run-passes" };
import { mkdirSync } from "node:fs"; mkdirSync("public/tutorials", { recursive: true });
const out = process.argv[2], only = process.argv.slice(3), J = "public/tutorials.json", d = JSON.parse(readFileSync(J, "utf8")); let n = 0;
for (const g of d.groups) for (const v of g.videos) {
  const f = FILE[v.id]; if (!f || (only.length && !only.includes(v.id)) || !existsSync(`${out}/${f}.mp4`)) continue;
  copyFileSync(`${out}/${f}.mp4`, `public/tutorials/${f}.mp4`); if (existsSync(`${out}/${f}.jpg`)) copyFileSync(`${out}/${f}.jpg`, `public/tutorials/${f}.jpg`);
  if (existsSync(`${out}/${f}.vtt`)) { copyFileSync(`${out}/${f}.vtt`, `public/tutorials/${f}.vtt`); v.captions = `/tutorials/${f}.vtt`; }
  if (!existsSync(`public/tutorials/${f}.jpg`)) { const d = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `public/tutorials/${f}.mp4`]).toString()); execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "0", "-i", `public/tutorials/${f}.mp4`, "-frames:v", "1", "-vf", "scale=1280:-1", "-q:v", "4", `public/tutorials/${f}.jpg`]); }
  const secs = Math.round(parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `public/tutorials/${f}.mp4`]).toString()));
  v.url = `/tutorials/${f}.mp4`; v.poster = `/tutorials/${f}.jpg`; v.length = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`; n++;
}
writeFileSync(J, JSON.stringify(d, null, 2) + "\n"); console.log("installed", n);
