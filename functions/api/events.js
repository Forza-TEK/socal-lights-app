// GET /api/events — the events for the public map.
// By default events that ended more than ENDED_GRACE_DAYS (3) days ago are left out (the app never shows them; they were 38% of a 1.4 MB download).
// Reachable on request: /api/events?ended=1 (everything, with the same house de-duplication) and /api/events?all=1 (admin editor: everything, nothing hidden).
// The response carries an ETag, so a returning visitor (or the service worker) revalidates with If-None-Match and gets a body-less 304 when nothing changed.
import { json, rowToEvent } from "../_lib/util.js";
import { pairs, approvedPosts } from "../_lib/addrkey.js";

export const ENDED_GRACE_DAYS = 3; // covers a device clock a day off and a share link to an event that just finished (the app hides ended events anyway)
const CACHE_CONTROL = "public, max-age=60, s-maxage=120";

async function etagOf(text) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text)));
  return 'W/"' + Array.from(d.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("") + '"';
}
// If-None-Match may list several tags; a weak comparison is what HTTP asks for here
const matches = (header, tag) => !!header && (header.trim() === "*" || header.split(",").some((t) => t.trim().replace(/^W\//, "") === tag.replace(/^W\//, "")));
const notModified = (tag) => new Response(null, { status: 304, headers: { etag: tag, "cache-control": CACHE_CONTROL } });

export async function onRequestGet(context) {
  const { request, env } = context, url = new URL(request.url), all = url.searchParams.get("all") === "1", ended = url.searchParams.get("ended") === "1";
  const inm = request.headers.get("if-none-match");
  // Kept at the edge for 2 minutes: the list is the same for everyone and is the biggest download on every visit
  const cache = !all && typeof caches !== "undefined" ? caches.default : null, key = new Request(url.toString(), { method: "GET" });
  if (cache) { const hit = await cache.match(key); if (hit) { const t = hit.headers.get("etag"); return t && matches(inm, t) ? notModified(t) : hit; } }
  const cutoff = new Date(Date.now() - ENDED_GRACE_DAYS * 86400000).toISOString().slice(0, 10);
  const q = all || ended ? env.DB.prepare("SELECT * FROM events ORDER BY start_date, name") : env.DB.prepare("SELECT * FROM events WHERE end_date >= ? ORDER BY start_date, name").bind(cutoff);
  const { results } = await q.all();
  // A sweep-made event at the same address as an approved house or installer post is replaced by that post (unless the admin chose to keep it)
  let hide = new Set();
  if (!all) try { hide = new Set(pairs(await approvedPosts(env), results).exact.filter((x) => !x.event.keep_listed).map((x) => x.event.id)); } catch {}
  const body = JSON.stringify(results.filter((r) => !hide.has(r.id)).map(rowToEvent));
  const tag = await etagOf(body);
  if (matches(inm, tag)) return notModified(tag);
  const res = new Response(body, { status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": CACHE_CONTROL, etag: tag } });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
