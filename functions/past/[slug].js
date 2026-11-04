// GET /past/<slug> — the permanent results page of one finished contest: the winners and then every home that entered, with its results.
// Built from the frozen snapshot written when the winners were announced; shows only what the Past results tab (/api/archive) already shows.
import { esc, header, page } from "../_lib/shell.js";
import { ARCHIVE_COLS, ARCHIVE_WHERE, shapeContest } from "../_lib/archive.js";

const PHOTO = /^p\/[a-z0-9]{8,32}\/\d{1,2}\.(jpg|png|webp)$/;
const img = (k, alt, size) => (PHOTO.test(k || "") ? `<img src="/api/photo/${esc(k)}" alt="${esc(alt)}" loading="lazy" width="${size}" height="${size}">` : "");
const CROWN = "&#128081; ";

export async function onRequestGet(context) {
  const { request, env, params } = context, origin = new URL(request.url).origin;
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request(request.url, { method: "GET" });
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  let row = null;
  try { row = await env.DB.prepare(`SELECT ${ARCHIVE_COLS} FROM contests WHERE slug = ? AND ${ARCHIVE_WHERE}`).bind(params.slug).first(); } catch {}
  if (!row) return new Response("No finished contest found at that address.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const c = shapeContest(row), n = c.entries.length;
  const title = `${c.name}: results (${c.label.replace(" | ", " ")}) | SoCal Lights`;
  const desc = `Results of ${c.name} (${c.org}, ${c.city}), locked ${c.at}: the winners and all ${n} home${n === 1 ? "" : "s"} that entered, with their votes and awards.`;
  const ld = { "@context": "https://schema.org", "@type": "ItemList", name: `${c.name}: homes that entered`, numberOfItems: n, itemListElement: c.entries.map((e, i) => ({ "@type": "ListItem", position: i + 1, name: e.name })) };

  const line = (e, r) => {
    const parts = [];
    if (c.mode !== "judges") parts.push(`${r.votes ?? 0} vote${r.votes === 1 ? "" : "s"}`);
    if (c.mode !== "public") parts.push(c.method === "score" ? (r.judges && r.judges.n ? `judges ${Number(r.judges.avg).toFixed(1)} avg (${r.judges.n})` : "no scores") : `${r.judges || 0} judge pick${r.judges === 1 ? "" : "s"}`);
    const w = e.won.filter((x) => x.category === r.category);
    return `<p>${w.length ? CROWN : ""}<b>${esc(r.category)}</b>: ${esc(parts.join(" · "))}${w.length ? " · " + w.map((x) => esc(x.label)).join(", ") : ""}</p>`;
  };
  const winners = c.awards.map((a) => a.winners.map((w) => `<div class="ev"><div class="ph">${img(w.photo, `${w.name} lights`, 120)}</div><div><h3>${CROWN}${esc(w.name)}</h3><p>${esc(a.category)}: ${esc(a.label)}</p><p>${esc(w.address || w.city || "")}</p>${a.prize ? `<p>Prize: ${esc(a.prize)}</p>` : ""}</div></div>`).join("")).join("");
  const homes = c.entries.map((e) => `<div class="ev"><div class="ph">${img(e.photo, `${e.name} lights`, 120)}</div><div><h3>${e.won.length ? CROWN : ""}${esc(e.name)}</h3><p>${esc(e.address || e.city || "")}${e.dq ? " · Disqualified" : ""}</p>${e.results.map((r) => line(e, r)).join("")}</div></div>`).join("");

  const body = `${header("Open the map")}<main><div class="tags"><span class="tag ice">${esc(c.label)}</span><span class="tag">Results locked ${esc(c.at)}</span></div><h1>${esc(c.name)}: results</h1><p class="sub">${esc(c.org)} · ${esc(c.city)}</p>
${c.awards.length ? `<h2>Winners</h2><div class="list">${winners}</div>` : ""}<h2>All homes that entered</h2>${n ? `<div class="list">${homes}</div>` : `<div class="note"><p>No homes entered.</p></div>`}
<div class="foot"><a href="/past">All past results</a><a href="/contests">Contests</a><a href="/">All of Southern California</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></main>`;
  const html = page({ title, desc, canonical: `${origin}/past/${params.slug}`, ld, body, origin });
  const res = new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=3600" } });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
