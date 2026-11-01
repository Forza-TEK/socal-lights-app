// GET /api/events — all events, for the public map.
import { json, rowToEvent } from "../_lib/util.js";
import { pairs, approvedPosts } from "../_lib/addrkey.js";

export async function onRequestGet(context) {
  const { request, env } = context, all = new URL(request.url).searchParams.get("all") === "1";
  // Kept at the edge for 2 minutes: the list is the same for everyone and is the biggest download on every visit
  const cache = !all && typeof caches !== "undefined" ? caches.default : null, key = new Request(new URL(request.url).toString(), { method: "GET" });
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }
  const { results } = await env.DB.prepare("SELECT * FROM events ORDER BY start_date, name").all();
  // A sweep-made event at the same address as an approved house or installer post is replaced by that post (unless the admin chose to keep it)
  let hide = new Set();
  if (!all) try { hide = new Set(pairs(await approvedPosts(env), results).exact.filter((x) => !x.event.keep_listed).map((x) => x.event.id)); } catch {}
  const res = json(results.filter((r) => !hide.has(r.id)).map(rowToEvent), { headers: { "cache-control": "public, max-age=60, s-maxage=120" } });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
