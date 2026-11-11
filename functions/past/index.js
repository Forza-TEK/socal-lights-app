// GET /past — every finished contest (winners announced) grouped by "Season | Year", each linking to its permanent results page /past/<slug>.
import { esc, header, page } from "../_lib/shell.js";
import { ARCHIVE_COLS, ARCHIVE_WHERE, contestLabel } from "../_lib/archive.js";

export async function onRequestGet(context) {
  const { request, env } = context, origin = new URL(request.url).origin;
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request(request.url, { method: "GET" });
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  let rows = [];
  try { rows = (await env.DB.prepare(`SELECT ${ARCHIVE_COLS} FROM contests WHERE ${ARCHIVE_WHERE} ORDER BY entries_close DESC LIMIT 300`).all()).results; } catch {}
  const groups = new Map();
  for (const c of rows) { const l = contestLabel(c); (groups.get(l) || groups.set(l, []).get(l)).push(c); }
  const title = "Past home decorating contest results | SoCal Lights";
  const desc = rows.length
    ? `Results of ${rows.length} finished home decorating contest${rows.length === 1 ? "" : "s"} across Southern California: the winners and every home that entered, by season and year.`
    : "Results appear here when a contest ends: the winners and every home that entered, by season and year.";
  const sections = [...groups].map(([label, cs]) => `<h2>${esc(label)}</h2><div class="list">${cs.map((c) => { const n = JSON.parse(c.results).entries.length; return `<a class="ev" href="/past/${esc(c.slug)}" style="grid-template-columns:minmax(0,1fr)"><div><h3>${esc(c.name)}</h3><p>${esc(c.org)} · ${esc(c.city)}</p><p>${n} home${n === 1 ? "" : "s"} entered</p></div></a>`; }).join("")}</div>`).join("");
  const ld = { "@context": "https://schema.org", "@type": "ItemList", name: "Past home decorating contest results", numberOfItems: rows.length, itemListElement: rows.slice(0, 100).map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, url: `${origin}/past/${c.slug}` })) };
  const body = `${header("Open the map")}<main><h1>Past contest results</h1><p class="sub">${esc(desc)}</p>${rows.length ? sections : `<div class="note"><p>No contest has announced its winners yet.</p></div>`}<div class="foot"><a href="/contests">Contests</a><a href="/">All of Southern California</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></main>`;
  const html = page({ title, desc, canonical: `${origin}/past`, ld, body, origin, wide: true });
  const res = new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=3600" } });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
