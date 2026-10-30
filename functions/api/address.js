// GET /api/address?q=27+Via+Alicia — street-address suggestions as you type, from Geoapify (free plan: 3,000 credits a day, no card).
// The key stays on the server (GEOAPIFY_KEY, a Pages secret). Without a key this returns an empty list and the form works as plain text.
// Callers wait for 5+ characters and pause between keystrokes; identical queries are cached for a day, so most lookups cost nothing.
import { json } from "../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const q = (new URL(request.url).searchParams.get("q") || "").trim().replace(/\s+/g, " ").slice(0, 100);
  const headers = { "cache-control": "public, max-age=86400" };
  if (q.length < 5 || !/\d/.test(q) || !env.GEOAPIFY_KEY) return json({ suggestions: [], on: !!env.GEOAPIFY_KEY }, { headers });
  try {
    const u = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
    u.search = new URLSearchParams({ text: q, type: "street", format: "json", limit: "5", lang: "en", filter: "countrycode:us", bias: "rect:-121.5,32.4,-114.0,35.9", apiKey: env.GEOAPIFY_KEY }).toString();
    const r = await fetch(u, { cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!r.ok) return json({ suggestions: [], on: true }, { headers: { "cache-control": "no-store" } });
    const j = await r.json();
    const out = (j.results || []).filter((x) => x.housenumber && x.street && x.state_code === "CA").map((x) => ({ street: `${x.housenumber} ${x.street}`, city: x.city || x.town || "", zip: x.postcode || "", lat: x.lat, lng: x.lon }));
    return json({ suggestions: out.slice(0, 5), on: true }, { headers });
  } catch { return json({ suggestions: [], on: true }, { headers: { "cache-control": "no-store" } }); }
}
