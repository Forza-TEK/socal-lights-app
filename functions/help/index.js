// GET /help — the Help Center: a search box, the seven categories with their articles, and a way to ask a person.
// GET /help?q=words — the same page with the search answered on the server (works without scripts) and the search logged.
import { loadArticles, searchArticles, CATEGORIES, KINDS } from "../_lib/help.js";
import { helpFrame, searchBox, searchScript, articleLink, catTabs, tabScript, askForm, esc } from "../_lib/helpui.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url), origin = url.origin, q = (url.searchParams.get("q") || "").trim().slice(0, 120);
  const list = await loadArticles(env);
  let found = null;
  if (q.length >= 2) {
    found = searchArticles(list, q);
    try { await env.DB.prepare("INSERT INTO help_searches (q, results) VALUES (?, ?)").bind(q.toLowerCase(), found.length).run(); } catch {}
  }
  const counts = {}; for (const a of list) counts[a.category] = (counts[a.category] || 0) + 1;
  const results = found ? (found.length ? `<ul class="hres" style="display:grid">${found.map((a) => `<li><a href="/help/${esc(a.slug)}"><b>${esc(a.title)}</b><span>${esc(a.summary)}</span></a></li>`).join("")}</ul>` : `<div class="hnone" style="margin-top:10px">Nothing found for &ldquo;${esc(q)}&rdquo;. Try fewer or different words, or <a href="#ask">ask us</a> below.</div>`) : "";
  const sections = CATEGORIES.map((c) => {
    const items = list.filter((a) => a.category === c.key);
    return items.length ? `<section class="hsec" id="${c.key}" data-cat="${c.key}"><h2>${esc(c.title)}</h2><p class="catblurb">${esc(c.blurb)}</p><ul class="alist">${items.map(articleLink).join("")}</ul></section>` : "";
  }).join("");
  const body = `<h1>Help Center</h1><p class="lede">Answers for visitors, homeowners, voters, judges and contest organizers. Search, or pick a topic.</p>
${searchBox(q).replace('<ul class="hres" id="hres" aria-live="polite"></ul>', `<ul class="hres" id="hres" aria-live="polite"></ul>${results}`)}
<div class="hlayout">${catTabs(counts)}<div class="hsections">${sections}</div></div>
<div class="hsec"><h2>Prefer to watch?</h2><p style="margin:0 0 12px">Most how-tos have a short video, in a Computer and a Phone version.</p><a class="btn go" style="display:inline-flex;max-width:280px" href="/tutorials">Open the video tutorials</a></div>
<div class="hsec" id="ask-wrap"><h2>Can't find it?</h2>${askForm("help")}</div>${searchScript}${tabScript}`;
  return new Response(helpFrame({ cats: CATEGORIES.filter((c) => counts[c.key]).map((c) => c.key), title: q ? `Search: ${q} | Help Center | SoCal Lights` : "Help Center | SoCal Lights", desc: "Answers and how-to steps for finding holiday lights, entering and voting in neighborhood contests, running a contest, and posting events and homes.", canonical: q ? "" : `${origin}/help`, noindex: !!q, origin, body }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": q ? "no-store" : "public, max-age=60" } });
}
