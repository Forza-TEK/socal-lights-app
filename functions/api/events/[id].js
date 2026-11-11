// GET /api/events/<id> — one event with every field (the list at /api/events leaves out the blurb and link; the map's detail view loads them from here).
// Any event is returned, including one that ended (a share link keeps working) or that the list hides behind an approved house. Unknown id: 404.
// ETag with 304 on If-None-Match, a short browser cache (60 s) and a short edge copy (2 min).
import { rowToEvent, etagOf, etagMatches } from "../../_lib/util.js";
import { contestHomes } from "../../_lib/contesthomes.js";

const CACHE_CONTROL = "public, max-age=60, s-maxage=120";
const JSON_TYPE = "application/json; charset=utf-8";
const notFound = () => new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: { "content-type": JSON_TYPE, "cache-control": "no-store" } });
const notModified = (tag) => new Response(null, { status: 304, headers: { etag: tag, "cache-control": CACHE_CONTROL } });

export async function onRequestGet(context) {
  const { request, env, params } = context, id = String(params.id || "");
  const inm = request.headers.get("if-none-match");
  const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request(new URL(request.url).origin + "/api/events/" + encodeURIComponent(id), { method: "GET" });
  if (cache) {
    const hit = await cache.match(key), t = hit && hit.headers.get("etag");
    if (hit && t) return etagMatches(inm, t) ? notModified(t) : new Response(hit.body, { status: 200, headers: { "content-type": JSON_TYPE, "cache-control": CACHE_CONTROL, etag: t } });
  }
  const row = id && id.length <= 200 ? await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(id).first() : null;
  if (!row) return notFound();
  let ch = null; try { ch = await contestHomes(env, id); } catch {} // a contest's entered homes (first 12 + total); other events have none
  const body = JSON.stringify(ch ? { ...rowToEvent(row), ch } : rowToEvent(row)), tag = await etagOf(body);
  if (etagMatches(inm, tag)) return notModified(tag);
  const res = new Response(body, { status: 200, headers: { "content-type": JSON_TYPE, "cache-control": CACHE_CONTROL, etag: tag } });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
