// GET /api/archive — finished contests (winners announced), each as it was frozen when the winners were announced.
// Grouped on the page by "Season | Year" (for example "Christmas | 2026").
import { json } from "../_lib/util.js";
import { SEASONS } from "../../public/seasons.js";

const yearOf = (c) => { const y = +c.entries_close.slice(0, 4), m = +c.entries_close.slice(5, 7); return c.season === "newyear" && m >= 12 ? y + 1 : y; };

export async function onRequestGet({ env }) {
  let rows = [];
  try { rows = (await env.DB.prepare("SELECT slug,name,org,city,county,season,entries_close,results FROM contests WHERE announced = 1 AND status = 'live' AND results != '' ORDER BY entries_close DESC LIMIT 300").all()).results; } catch {}
  const out = rows.map((c) => {
    const snap = JSON.parse(c.results), byId = Object.fromEntries(snap.entries.map((e) => [e.id, e]));
    const s = SEASONS[c.season] || {};
    return { slug: c.slug, name: c.name, org: c.org, city: c.city, county: c.county, season: c.season, label: `${s.short || s.label || c.season} | ${yearOf(c)}`, at: snap.at,
      awards: (snap.awards || []).filter((a) => a.ids.length).map((a) => ({ category: a.category, label: a.label, prize: a.prize || "", winners: a.ids.map((id) => byId[id]).filter(Boolean).map((e) => ({ name: e.name, address: e.address, city: e.city, photo: (e.photos || [])[0] || "" })) })) };
  });
  return json(out, { headers: { "cache-control": "public, max-age=300" } });
}
