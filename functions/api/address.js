// GET /api/address?q=27+Via+Alicia — street-address suggestions as you type, from Geoapify (free plan: 3,000 credits a day, no card).
// The key stays on the server (GEOAPIFY_KEY, a Pages secret). Without a key this returns an empty list and the form works as plain text.
// Callers wait for 5+ characters and pause between keystrokes; identical queries are cached for a day, so most lookups cost nothing.
import { json } from "../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const sp = new URL(request.url).searchParams, q = (sp.get("q") || "").trim().replace(/\s+/g, " ").slice(0, 100);
  const near = (sp.get("near") || "").split(",").map(Number); // "lat,lng" of the chosen city: results closest to it come first
  const hasNear = near.length === 2 && near.every(Number.isFinite) && near[0] > 32 && near[0] < 36 && near[1] > -122 && near[1] < -114;
  const headers = { "cache-control": "public, max-age=86400" };
  if (q.length < 5 || !/\d/.test(q) || !env.GEOAPIFY_KEY) return json({ suggestions: [], on: !!env.GEOAPIFY_KEY }, { headers });
  try {
    const u = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
    // A hard rectangle around Southern California (a bias alone lets "100 Main St" in other states crowd out the local ones)
    u.search = new URLSearchParams({ text: q, format: "json", limit: "8", lang: "en", filter: "rect:-121.5,32.4,-114.0,35.9", ...(hasNear ? { bias: `proximity:${near[1]},${near[0]}` } : {}), apiKey: env.GEOAPIFY_KEY }).toString();
    const r = await fetch(u, { cf: { cacheTtl: 86400, cacheEverything: true, cacheTtlByStatus: { "200-299": 86400, "400-599": 0 } } });
    if (!r.ok) return json({ suggestions: [], on: true }, { headers: { "cache-control": "no-store" } });
    const j = await r.json();
    const out = (j.results || []).filter((x) => x.housenumber && x.street && (!x.country_code || x.country_code === "us") && (!x.state_code || x.state_code === "CA")).map((x) => ({ street: `${x.housenumber} ${x.street}`, city: x.city || x.town || x.village || x.suburb || (String(x.formatted || "").split(",")[1] || "").trim(), zip: x.postcode || "", lat: x.lat, lng: x.lon }));
    return json({ suggestions: out.slice(0, 5), on: true }, { headers: out.length ? headers : { "cache-control": "no-store" } }); // never keep an empty answer
  } catch { return json({ suggestions: [], on: true }, { headers: { "cache-control": "no-store" } }); }
}
