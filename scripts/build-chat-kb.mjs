#!/usr/bin/env node
// Builds functions/_lib/chatkb-data.js: the public knowledge the AI assistant can retrieve besides Help Center articles and live data (docs/ai-assistant.md).
// Sources, all public: docs/ai-assistant-kb.md (curated, public-safe), public/tutorials.json and the caption files of the tutorial videos, the Terms and Privacy Policy,
// and the copy of the public pages listed in PAGES. Nothing internal (docs/contests.md, runbooks, status) is read. Prices and dates are NOT trusted from here: the assistant strips
// dollar figures and dates from every retrieved chunk, and prices come only from the code exports.
//   node scripts/build-chat-kb.mjs          write the file
//   node scripts/build-chat-kb.mjs --check  exit 1 if the file is out of date (tests/chat.test.mjs runs the same check)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { redactFraudDetail } from "../functions/_lib/chatguard.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "functions/_lib/chatkb-data.js");
const read = (f) => readFileSync(path.join(ROOT, f), "utf8");
const MAX = 800;

const PAGES = [
  ["public/pricing.html", "/pricing"], ["public/feature.html", "/feature"], ["public/sponsor.html", "/sponsor"], ["public/contest-pass.html", "/contest-pass"],
  ["public/add.html", "/add"], ["public/add-event.html", "/add-event"], ["public/add-house.html", "/add-house"], ["public/add-contest.html", "/add-contest"],
  ["public/remove-home.html", "/remove-home"], ["public/prefs.html", "/prefs"], ["public/cancel-renewal.html", "/cancel-renewal"], ["public/installer-manage.html", "/installer-manage"],
  ["public/profile.html", "/profile"], ["public/organizer.html", "/organizer"], ["public/terms.html", "/terms"], ["public/privacy.html", "/privacy"],
];
const ENT = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ", "&rsquo;": "'", "&lsquo;": "'", "&ldquo;": '"', "&rdquo;": '"', "&ndash;": "-", "&mdash;": "-", "&middot;": "-" };
const decode = (s) => s.replace(/&(?:amp|lt|gt|quot|#39|nbsp|rsquo|lsquo|ldquo|rdquo|ndash|mdash|middot);/g, (m) => ENT[m]).replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n));
const strip = (h) => decode(h.replace(/<br\s*\/?>/gi, " ").replace(/<\/(p|li|div|tr|h\d)>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

// split text into pieces of at most MAX characters at sentence ends
function pieces(text) {
  const out = []; let cur = "";
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    if (cur && (cur + " " + s).length > MAX) { out.push(cur); cur = s; } else cur = cur ? cur + " " + s : s;
  }
  if (cur) out.push(cur);
  return out.flatMap((p) => (p.length > MAX * 1.5 ? p.match(new RegExp(`.{1,${MAX}}`, "g")) : [p]));
}
const add = (list, title, url, text) => {
  const t = redactFraudDetail(text.replace(/\s+/g, " ").trim()); if (t.length < 40) return;
  const ps = pieces(t); ps.forEach((p, i) => list.push({ title: ps.length > 1 ? `${title} (${i + 1} of ${ps.length})` : title, url, text: p }));
};

function fromHtml(file, url, list) {
  let h = read(file).replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, "");
  h = h.replace(/<(header|nav|footer)\b[\s\S]*?<\/\1>/gi, "").replace(/<div class="hdr"[\s\S]*?<\/div>\s*<\/div>/i, "");
  const pageTitle = strip((h.match(/<title>([\s\S]*?)<\/title>/i) || [, ""])[1]).replace(/\s*[|–-]\s*SoCal Lights.*$/i, "") || url;
  const body = (h.match(/<body[\s\S]*<\/body>/i) || [h])[0];
  const parts = body.split(/(?=<h[1-3]\b)/i);
  for (const part of parts) {
    const m = part.match(/^<h([1-3])\b([^>]*)>([\s\S]*?)<\/h\1>/i);
    const id = m && (m[2].match(/\bid="([^"]+)"/) || [])[1];
    const title = m ? strip(m[3]) : pageTitle;
    add(list, `${pageTitle}: ${title}`.replace(`${pageTitle}: ${pageTitle}`, pageTitle), url + (id ? "#" + id : ""), strip(m ? part.slice(m[0].length) : part));
  }
}

function fromCuratedDoc(list) {
  const t = read("docs/ai-assistant-kb.md").replace(/<!--[\s\S]*?-->/g, "");
  for (const sec of t.split(/^## /m).slice(1)) {
    const lines = sec.split("\n"), title = lines[0].trim(), u = (lines[1] || "").match(/^url:\s*(\S+)/);
    add(list, title, u ? u[1] : "/help", lines.slice(u ? 2 : 1).join(" "));
  }
}
function vtt(file) {
  if (!existsSync(path.join(ROOT, "public", file.replace(/^\//, "")))) return "";
  return read("public/" + file.replace(/^\//, "")).split("\n").filter((l) => l && !/^WEBVTT|-->|^\d+$|^NOTE/.test(l)).join(" ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
function fromTutorials(list) {
  const j = JSON.parse(read("public/tutorials.json"));
  for (const g of j.groups) for (const v of g.videos) {
    const script = v.captions ? vtt(v.captions) : "";
    add(list, `Video tutorial: ${v.title}`, `/tutorials#${v.id}`, `${v.title}. ${v.desc} ${script}`);
  }
}

export function build() {
  const list = [];
  fromCuratedDoc(list); fromTutorials(list);
  for (const [f, u] of PAGES) if (existsSync(path.join(ROOT, f))) fromHtml(f, u, list);
  const seen = new Set();
  const uniq = list.filter((c) => { const k = c.title + "|" + c.text.slice(0, 80); if (seen.has(k)) return false; seen.add(k); return true; });
  return `// GENERATED by scripts/build-chat-kb.mjs from public pages, tutorials and docs/ai-assistant-kb.md. Do not edit by hand: change the source, then run \`node scripts/build-chat-kb.mjs\`.\n// ${uniq.length} chunks. Public text only; the assistant strips dollar figures and dates from it before use.\nexport const KB_CHUNKS = ${JSON.stringify(uniq)};\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = build();
  if (process.argv.includes("--check")) {
    const have = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
    if (have !== out) { console.error("functions/_lib/chatkb-data.js is out of date. Run: node scripts/build-chat-kb.mjs"); process.exit(1); }
    console.log("chatkb-data.js is up to date");
  } else { writeFileSync(OUT, out); console.log(`wrote ${OUT} (${out.length} bytes)`); }
}
