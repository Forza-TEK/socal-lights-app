// Builds the JSON for the live "Help and Tutorials progress" dashboard.
// Usage: node scripts/tutorials/dash-state.mjs > $S/dash-state.json   (then written to the artifact's state/all document)
// Inputs in $S: audit.json (hand-kept: per video and per article state and note), articles.json (the live Help Center article list).
// States: live = up to date, stale = needs an update, working = being updated now, recorded = re-recorded, waiting for review, unchecked = not looked at yet.
import { readFileSync, existsSync } from "node:fs";
const S = process.env.S || "/tmp/claude-0/-home-user-socal-lights-app/a6006ced-60e4-514a-904a-06730a07b2af/scratchpad";
const rdj = (f, d) => (existsSync(`${S}/${f}`) ? JSON.parse(readFileSync(`${S}/${f}`, "utf8")) : d);
const audit = rdj("audit.json", { videos: {}, articles: {} }), arts = rdj("articles.json", { categories: [], articles: [] });
const tut = JSON.parse(readFileSync("public/tutorials.json", "utf8")); const videos = []; let gi = 0;
for (const g of tut.groups) { gi++; let oi = 0; for (const v of g.videos) { oi++;
  const a = (audit.videos || {})[v.id] || {};
  videos.push({ id: v.id, title: v.title, group: g.title, groupOrder: gi, order: oi, desktop: a.desktop || a.state || "unchecked", phone: a.phone || a.state || "unchecked", note: a.note || "" }); } }
const catTitle = { find: "Find and plan", enter: "Enter a home", vote: "Vote and judge", run: "Run a contest", sponsors: "Sponsors and installers", post: "Post events and homes", account: "Account, privacy and safety" };
const articles = arts.articles.map((x) => { const a = (audit.articles || {})[x.slug] || {}; return { slug: x.slug, title: x.title, group: catTitle[x.cat] || x.cat, groupOrder: Math.max(1, arts.categories.indexOf(x.cat) + 1), order: x.order, state: a.state || "unchecked", note: a.note || "" }; });
console.log(JSON.stringify({ videos, articles, updatedAt: new Date().toISOString(), note: process.env.NOTE || audit.note || "" }));
