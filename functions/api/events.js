// GET /api/events — the events for the public map.
// By default events that ended more than ENDED_GRACE_DAYS (3) days ago are left out (the app never shows them; they were 38% of a 1.4 MB download).
// Reachable on request: /api/events?ended=1 (everything, with the same house de-duplication) and /api/events?all=1 (admin editor: everything, nothing hidden).
// The edge copy is served stale-while-revalidate (fresh 2 min, kept 15). The response carries an ETag, so a returning visitor (or the service worker) revalidates with If-None-Match and gets a body-less 304 when nothing changed.
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

// Edge copy: fresh for FRESH_MS, then served stale while one request rebuilds it in the background (up to KEEP_S in all), so visitors rarely wait for the database.
const FRESH_MS = 120_000, KEEP_S = 900;

async function build(env, all, ended) {
  const cutoff = new Date(Date.now() - ENDED_GRACE_DAYS * 86400000).toISOString().slice(0, 10);
  const q = all || ended ? env.DB.prepare("SELECT * FROM events ORDER BY start_date, name") : env.DB.prepare("SELECT * FROM events WHERE end_date >= ? ORDER BY start_date, name").bind(cutoff);
  const { results } = await q.all();
  // A sweep-made event at the same address as an approved house or installer post is replaced by that post (unless the admin chose to keep it)
  let hide = new Set();
  if (!all) try { hide = new Set(pairs(await approvedPosts(env), results).exact.filter((x) => !x.event.keep_listed).map((x) => x.event.id)); } catch {}
  const body = JSON.stringify(results.filter((r) => !hide.has(r.id)).map(rowToEvent));
  return { body, tag: await etagOf(body) };
}
const headersFor = (tag, extra = {}) => ({ "content-type": "application/json; charset=utf-8", "cache-control": CACHE_CONTROL, etag: tag, ...extra });
const storedCopy = ({ body, tag }) => new Response(body, { status: 200, headers: headersFor(tag, { "cache-control": `public, s-maxage=${KEEP_S}`, "x-built": String(Date.now()) }) });

export async function onRequestGet(context) {
  const { request, env } = context, url = new URL(request.url), all = url.searchParams.get("all") === "1", ended = url.searchParams.get("ended") === "1";
  const inm = request.headers.get("if-none-match");
  // The list is the same for everyone and is the biggest download on every visit; the admin editor (?all=1) is never cached
  const cache = !all && typeof caches !== "undefined" ? caches.default : null, key = new Request(url.toString(), { method: "GET" });
  if (cache) {
    const hit = await cache.match(key);
    if (hit) {
      if (Date.now() - Number(hit.headers.get("x-built") || 0) > FRESH_MS) context.waitUntil(build(env, all, ended).then((b) => cache.put(key, storedCopy(b))).catch(() => {}));
      const t = hit.headers.get("etag");
      return t && matches(inm, t) ? notModified(t) : new Response(hit.body, { status: 200, headers: headersFor(t) });
    }
  }
  const b = await build(env, all, ended);
  if (matches(inm, b.tag)) return notModified(b.tag);
  if (cache) context.waitUntil(cache.put(key, storedCopy(b)));
  return new Response(b.body, { status: 200, headers: headersFor(b.tag) });
}
