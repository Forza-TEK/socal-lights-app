// One place that knows which cities exist, which of them are worth indexing, and which are near each other.
// Used by the city pages (/in/<city>), the city hub (/in), the sitemap and the server-rendered city list on the home page.
export const slugOf = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// A city page is only offered to search engines when it has something to say: 3 or more upcoming events, or at least one confirmed event.
// Smaller pages stay reachable (people still land on them from the map) but are noindex and left out of the sitemap.
export const MIN_EVENTS = 3;
export const isIndexable = (c) => !!c && (c.n >= MIN_EVENTS || c.confirmed >= 1);

// events: [{ city, c (county), lat, lng, st ("c" confirmed / "e" expected) }] -> [{ city, slug, county, n, confirmed, lat, lng, indexable }]
export function summarize(events) {
  const m = new Map();
  for (const e of events) {
    const slug = slugOf(e.city); if (!slug) continue;
    let c = m.get(slug); if (!c) m.set(slug, c = { city: e.city, slug, county: e.c, n: 0, confirmed: 0, sl: 0, sg: 0, k: 0 });
    c.n++; if (e.st === "c") c.confirmed++;
    if (Number.isFinite(e.lat) && Number.isFinite(e.lng) && e.lat && e.lng) { c.sl += e.lat; c.sg += e.lng; c.k++; }
  }
  return [...m.values()].map((c) => ({ city: c.city, slug: c.slug, county: c.county, n: c.n, confirmed: c.confirmed, lat: c.k ? c.sl / c.k : null, lng: c.k ? c.sg / c.k : null, indexable: isIndexable(c) }));
}

// Lightweight read for pages that only need the list of cities (no event text)
export async function loadCities(env, today) {
  const { results } = await env.DB.prepare("SELECT city, county, lat, lng, status FROM events WHERE end_date >= ? AND city <> ''").bind(today).all();
  return summarize(results.map((r) => ({ city: r.city, c: r.county, lat: r.lat, lng: r.lng, st: r.status === "confirmed" ? "c" : "e" })));
}

export function miles(a, b) {
  const R = 3958.8, rad = (d) => (d * Math.PI) / 180, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// The nearest other cities that have an indexable page, closest first
export function nearby(cities, slug, limit = 6) {
  const me = cities.find((c) => c.slug === slug);
  if (!me || me.lat == null) return [];
  return cities.filter((c) => c.slug !== slug && c.indexable && c.lat != null).map((c) => ({ ...c, mi: miles(me, c) })).sort((a, b) => a.mi - b.mi).slice(0, limit);
}

export const pluralEvents = (n) => `${n} upcoming event${n === 1 ? "" : "s"}`;
