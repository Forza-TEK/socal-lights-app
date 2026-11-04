// Help Center helpers: the categories, how article text becomes a page, and search over the articles.
// Articles live in the help_articles table and are edited in Admin > Help.
import { esc } from "./shell.js";

// Same names and keys as the Tutorials page groups, so people learn one map. "account" has no tutorial group.
export const CATEGORIES = [
  { key: "find", title: "Find and plan", blurb: "Location, seasons, filters, routes, the weekly email, installing the app" },
  { key: "enter", title: "Enter a home", blurb: "Enter a contest, edit or withdraw your entry, your profile and badges" },
  { key: "vote", title: "Vote and judge", blurb: "Vote for your favorite homes, or score them as a judge" },
  { key: "run", title: "Run a contest", blurb: "Create, share, approve entries, change dates, voting, your team, winners" },
  { key: "sponsors", title: "Sponsors and installers", blurb: "Add sponsors, quote requests, installer profiles" },
  { key: "post", title: "Post events and homes", blurb: "Add an event, or show off your own house" },
  { key: "account", title: "Account, privacy and safety", blurb: "Signing in, your data, deleting your account, reporting a problem" },
];
export const KINDS = { howto: "How to", fix: "Fix a problem", answer: "Answer" };
export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

const COLS = "slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by, updated_at";
export async function loadArticles(env, { drafts = false } = {}) {
  try {
    const { results } = await env.DB.prepare(`SELECT ${COLS} FROM help_articles ${drafts ? "" : "WHERE status = 'published'"} ORDER BY sort, title`).all();
    return results;
  } catch { return []; }
}

// ---------- Article text -> HTML ----------
// Blank line = new paragraph. "- " = bullet list. "1. " = numbered steps. "## " = small heading.
// **bold** and [link text](/path or https://...) work inside a line. Everything else is shown as typed.
const inline = (s) => esc(s)
  .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
  .replace(/\[([^\]]+)\]\((\/[^\s)]*|https:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, (m, t, u) => `<a href="${u}"${u.startsWith("http") ? ' rel="noopener" target="_blank"' : ""}>${t}</a>`);
export function renderBody(text) {
  const out = []; let kind = "", items = [];
  const flush = () => { if (!items.length) return; out.push(kind === "ul" ? `<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>` : kind === "ol" ? `<ol>${items.map((x) => `<li>${x}</li>`).join("")}</ol>` : `<p>${items.join("<br>")}</p>`); kind = ""; items = []; };
  for (const raw of String(text || "").replace(/\r/g, "").split("\n")) {
    const l = raw.trim();
    if (!l) { flush(); continue; }
    const t = /^## /.test(l) ? "h" : /^- /.test(l) ? "ul" : /^\d+\.\s/.test(l) ? "ol" : "p";
    if (t === "h") { flush(); out.push(`<h2>${inline(l.slice(3))}</h2>`); continue; }
    if (t !== kind) flush();
    kind = t; items.push(inline(t === "ul" ? l.slice(2) : t === "ol" ? l.replace(/^\d+\.\s/, "") : l));
  }
  flush();
  return out.join("");
}
export const plainText = (text) => String(text || "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^(## |- |\d+\.\s)/gm, "").replace(/\s+/g, " ").trim();

// ---------- Search ----------
const STOP = new Set("a an and are as at be but by can do does for from get got has have how i if in into is it its me my of on or our so that the their them then there this to up us was we what when where which who why will with you your".split(" "));
const stem = (w) => w.replace(/(ing|ed|es|s|e)$/, (m) => (w.length - m.length >= 3 ? "" : m));
export const tokens = (q) => [...new Set(String(q || "").toLowerCase().replace(/[^a-z0-9\s']/g, " ").split(/\s+/).map((w) => w.replace(/'s$/, "")).filter((w) => w.length > 1 && !STOP.has(w)).map(stem))];
// Every word must appear somewhere in the article; title, keywords and the one-line answer count for more than the body.
export function searchArticles(list, q, limit = 8) {
  const t = tokens(q); if (!t.length) return [];
  const scored = [];
  for (const a of list) {
    const parts = { title: tokens(a.title).join(" "), kw: a.keywords.toLowerCase(), sum: tokens(a.summary).join(" "), body: tokens(plainText(a.body)).join(" ") };
    let score = 0, hit = 0;
    for (const w of t) {
      const s = (parts.title.includes(w) ? 6 : 0) + (parts.kw.includes(w) ? 5 : 0) + (parts.sum.includes(w) ? 3 : 0) + (parts.body.includes(w) ? 1 : 0);
      if (s) hit++; score += s;
    }
    if (hit === t.length) scored.push({ a, score });
  }
  scored.sort((x, y) => y.score - x.score || x.a.sort - y.a.sort);
  return scored.slice(0, limit).map((x) => x.a);
}
export const brief = (a) => ({ slug: a.slug, title: a.title, summary: a.summary, category: a.category, kind: a.kind });

// A short one-way fingerprint (so one person cannot vote many times a day). Nothing here can be turned back into an address.
export async function fingerprint(request, extra = "") {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown", day = new Date().toISOString().slice(0, 10);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${day}|${extra}`));
  return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
