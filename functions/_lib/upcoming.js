// A small shared copy of the upcoming events (id, name, city, dates, status, price, hours, photo, type) for pages that only need to list
// "more events in this city" and "nearby cities": every /e/<id> page reads it, so one scan of the events table (kept in the edge cache,
// refreshed in the background) serves all of them instead of one scan per event page. Same pattern as the home page's city list.
import { summarize } from "./cityindex.js";

const FRESH_MS = 1_200_000, KEEP_S = 7200, LEASE_MS = 30_000;
const inflight = new Map();
const COLS = "id, name, city, county, type, start_date, end_date, status, free, price, hours, image, lat, lng";
export const pacificToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

export async function readUpcoming(env, today) {
  const { results } = await env.DB.prepare(`SELECT ${COLS} FROM events WHERE end_date >= ? ORDER BY start_date, name`).bind(today).all();
  return results.map((r) => ({ id: r.id, n: r.name, city: r.city, c: r.county, t: r.type, s: r.start_date, e: r.end_date, st: r.status === "confirmed" ? "c" : "e", free: !!r.free, p: r.price || "", h: r.hours || "", img: r.image || "", lat: r.lat, lng: r.lng }));
}
const copy = (list, builtAt) => new Response(JSON.stringify(list), { headers: { "content-type": "application/json", "cache-control": `public, s-maxage=${KEEP_S}`, "x-built": String(builtAt) } });

export async function upcomingEvents(env, origin, waitUntil = () => {}) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  if (!cache) return readUpcoming(env, pacificToday());
  const key = new Request(origin + "/__upcoming", { method: "GET" });
  let hit = null; try { hit = await cache.match(key); } catch {}
  if (hit) {
    const list = await hit.clone().json();
    if (Date.now() - Number(hit.headers.get("x-built") || 0) > FRESH_MS && !inflight.has(key.url)) {
      const job = (async () => { await cache.put(key, copy(list, Date.now() - FRESH_MS + LEASE_MS)); await cache.put(key, copy(await readUpcoming(env, pacificToday()), Date.now())); })().catch(() => {}).finally(() => inflight.delete(key.url));
      inflight.set(key.url, job); waitUntil(job);
    }
    return list;
  }
  const list = await readUpcoming(env, pacificToday());
  waitUntil(Promise.resolve().then(() => cache.put(key, copy(list, Date.now()))).catch(() => {}));
  return list;
}

// The pieces an event page needs from the shared list: other events in the same city (confirmed first, then soonest) and the nearest cities with a page
export function relatedTo(list, ev, citySlugOf, limit = 6) {
  const slug = citySlugOf(ev.city), same = list.filter((x) => x.id !== ev.id && citySlugOf(x.city) === slug && x.e >= pacificToday());
  const sibs = same.sort((a, b) => (a.st === "c" ? 0 : 1) - (b.st === "c" ? 0 : 1) || (a.s < b.s ? -1 : a.s > b.s ? 1 : 0) || a.n.localeCompare(b.n)).slice(0, limit);
  const cities = summarize(list.filter((x) => x.city).map((x) => ({ city: x.city, c: x.c, lat: x.lat, lng: x.lng, st: x.st })));
  return { sibs, total: same.length, cities };
}
