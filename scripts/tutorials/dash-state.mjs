// Builds the JSON for the live "Help and Tutorials progress" dashboard.
// Usage: node scripts/tutorials/dash-state.mjs > $S/dash-state.json   (then written to the artifact's state/all document)
// Inputs in $S: audit.json (hand-kept: per video and per article state and note), articles.json (the live Help Center article list).
// States: live = up to date, stale = needs an update, working = being updated now, recorded = re-recorded, waiting for review, unchecked = not looked at yet.
import { readFileSync, existsSync } from "node:fs";
const S = process.env.S || "/tmp/claude-0/-home-user-socal-lights-app/a6006ced-60e4-514a-904a-06730a07b2af/scratchpad";
const rdj = (f, d) => (existsSync(`${S}/${f}`) ? JSON.parse(readFileSync(`${S}/${f}`, "utf8")) : d);
const audit = rdj("audit.json", { videos: {}, articles: {} }), arts = rdj("articles.json", { categories: [], articles: [] });
const rd = (f) => (existsSync(`${S}/${f}`) ? readFileSync(`${S}/${f}`, "utf8").split("\n").map((x) => x.trim()).filter(Boolean) : []);
const done = new Set(rd("voice.done")), doneM = new Set(rd("voice-m.done")), liveD = new Set(rd("redo-live.txt"));
const running = []; try { const ps = (await import("node:child_process")).execSync("ps -eo args | grep 'videos2.mjs' | grep -v grep || true").toString().split("\n"); for (const l of ps) { const m = l.match(/videos2\.mjs (\S+)/); if (m) running.push(m[1]); } } catch {}
const tut = JSON.parse(readFileSync("public/tutorials.json", "utf8")); const videos = []; let gi = 0;
for (const g of tut.groups) { gi++; let oi = 0; for (const v of g.videos) { oi++;
  const a = (audit.videos || {})[v.id] || {};
  const base = (k) => a[k] || a.state || "unchecked", st = (k, d) => (liveD.has(v.id) ? "live" : d.has(v.id) ? "recorded" : running.includes(v.id) && !(k === "phone" && !done.has(v.id)) && !(k === "desktop" && done.has(v.id)) ? "recording" : base(k));
  videos.push({ id: v.id, title: v.title, group: g.title, groupOrder: gi, order: oi, desktop: st("desktop", done), phone: st("phone", doneM), note: liveD.has(v.id) ? "Re-recorded against today's app" : a.note || "" }); } }
const catTitle = { find: "Find and plan", enter: "Enter a home", vote: "Vote and judge", run: "Run a contest", sponsors: "Sponsors and installers", post: "Post events and homes", account: "Account, privacy and safety" };
const articles = arts.articles.map((x) => { const a = (audit.articles || {})[x.slug] || {}; return { slug: x.slug, title: x.title, group: catTitle[x.cat] || x.cat, groupOrder: Math.max(1, arts.categories.indexOf(x.cat) + 1), order: x.order, state: a.state || "unchecked", note: a.note || "" }; });
console.log(JSON.stringify({ videos, articles, updatedAt: new Date().toISOString(), note: process.env.NOTE || audit.note || "" }));
