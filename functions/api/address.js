// GET /api/address?q=27+Via+Alicia — street-address suggestions as you type, from Geoapify (free plan: 3,000 credits a day, no card).
// The key stays on the server (GEOAPIFY_KEY, a Pages secret). Without a key this returns an empty list and the form works as plain text.
// Callers wait for 5+ characters and pause between keystrokes; identical queries are cached for a day, so most lookups cost nothing.
import { json } from "../_lib/util.js";
import { CITY } from "../../public/cities.js";

// kind=area: cities and counties for "Areas served" (same dropdown as street addresses). Local names first, then Geoapify cities/counties when a key is set.
const COUNTY = ["Los Angeles County", "Orange County", "Riverside County", "San Bernardino County", "San Diego County", "Santa Barbara County", "Ventura County"];
async function areas(q, env) {
  const w = q.toLowerCase(), out = [], seen = new Set(), add = (label, kind) => { const k = label.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push({ label, kind }); } };
  const names = [...COUNTY.map((c) => [c, "county"]), ...Object.keys(CITY).map((c) => [c, "city"])];
  for (const [n, k] of names) if (n.toLowerCase().startsWith(w)) add(n, k);
  for (const [n, k] of names) if (n.toLowerCase().includes(w)) add(n, k);
  if (env.GEOAPIFY_KEY && out.length < 8 && q.length >= 3) {
    const one = async (type) => { try { const u = new URL("https://api.geoapify.com/v1/geocode/autocomplete"); u.search = new URLSearchParams({ text: q, type, format: "json", limit: "5", lang: "en", filter: "rect:-121.5,32.4,-114.0,35.9", apiKey: env.GEOAPIFY_KEY }); const r = await fetch(u, { cf: { cacheTtl: 86400, cacheEverything: true } }); const j = r.ok ? await r.json() : {}; return (j.results || []).filter((x) => (!x.country_code || x.country_code === "us") && (!x.state_code || x.state_code === "CA") && (!x.result_type || x.result_type === type)); } catch { return []; } };
    const [cities, counties] = await Promise.all([one("city"), one("county")]);
    const has = (n) => n.toLowerCase().includes(w); // the service also returns fuzzy matches; keep only names that contain what was typed
    for (const x of counties) { const n = (x.county || x.name || "").replace(/\s+County$/i, ""); if (n && has(n)) add(n + " County", "county"); }
    for (const x of cities) { const n = x.city || x.name; if (n && has(n)) add(n, "city"); }
  }
  return out.slice(0, 8);
}

export async function onRequestGet({ request, env }) {
  const sp = new URL(request.url).searchParams, q = (sp.get("q") || "").trim().replace(/\s+/g, " ").slice(0, 100);
  if (sp.get("kind") === "area") { const a = q.length >= 2 ? await areas(q, env) : []; return json({ suggestions: a, on: !!env.GEOAPIFY_KEY }, { headers: { "cache-control": "public, max-age=3600" } }); }
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
