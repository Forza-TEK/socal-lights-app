// Builds the JSON for the live "Tutorial Video Progress" dashboard from the recorder's files.
// Usage: node scripts/tutorials/dash-state.mjs > $S/dash-state.json   (then written to the artifact's state/all document)
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
const S = process.env.S || "/tmp/claude-0/-home-user-socal-lights-app/a6006ced-60e4-514a-904a-06730a07b2af/scratchpad";
const rd = (f) => (existsSync(`${S}/${f}`) ? readFileSync(`${S}/${f}`, "utf8").split("\n").map((x) => x.trim()).filter(Boolean) : []);
const done = new Set(rd("voice.done")), doneM = new Set(rd("voice-m.done")), live = new Set(rd("live-voice.txt")), liveM = new Set(rd("live-voice-m.txt").length ? rd("live-voice-m.txt") : rd("live-voice.txt"));
const status = rd("voice-status.txt");
const running = execSync("ps -eo args | grep 'videos2.mjs' | grep -v grep || true").toString().split("\n").map((l) => (l.match(/videos2\.mjs (\S+)/) || [])[1]).filter(Boolean);
const lastFail = {}; for (const l of status) { const m = l.match(/FAILED (\S+) \((desktop|phone)/); if (m) lastFail[m[1] + m[2]] = true; const d = l.match(/done (\S+)( \(phone\))?/); if (d) delete lastFail[d[1] + (d[2] ? "phone" : "desktop")]; }
const tut = JSON.parse(readFileSync("public/tutorials.json", "utf8")); const videos = []; let gi = 0;
for (const g of tut.groups) { gi++; let oi = 0; for (const v of g.videos) { oi++;
  const id = v.id, isRun = running.includes(id);
  const st = (kind) => { const d = kind === "desktop" ? done : doneM, lv = kind === "desktop" ? live : liveM;
    if (lv.has(id)) return "live"; if (d.has(id)) return "recorded";
    if (isRun && ((kind === "desktop" && !done.has(id)) || (kind === "phone" && done.has(id) && !doneM.has(id)))) return "recording";
    if (lastFail[id + kind]) return "failed"; return "todo"; };
  videos.push({ id, title: v.title, group: g.title, groupOrder: gi, order: oi, desktop: st("desktop"), phone: st("phone") }); } }
const now = new Date().toISOString();
const n = (k, s) => videos.filter((v) => v[k] === s).length;
console.log(JSON.stringify({ videos, updatedAt: now, note: process.env.NOTE || "" }));
