// GET /api/intake/work-order -> the season categories that are thin on the map today (with the searches and places to look) and the rules a row must meet. Key-protected like /api/intake/events.
import { intakeGuard, publishingOn, MAX_ROWS, FIELDS, SHOWS } from "../../_lib/intake.js";
import { reply } from "../../_lib/ads.js";
import { seasonReport } from "../../_lib/gaps.js";
import { SEASONS } from "../../../public/seasons.js";
import { ptToday } from "../../_lib/time.js";
import { CITY } from "../../../public/cities.js";

export async function onRequest({ request, env }) {
  const g = await intakeGuard(request, env, "GET");
  if (g.res) return g.res;
  const today = ptToday();
  const { results } = await env.DB.prepare("SELECT id, name AS n, venue AS v, type AS t, season AS sn, end_date AS e FROM events WHERE end_date >= ?").bind(today).all();
  const counts = Object.fromEntries((await env.DB.prepare("SELECT city, COUNT(*) AS n FROM events WHERE end_date >= ? GROUP BY city").bind(today).all()).results.map((r) => [r.city, r.n]));
  const cities = Object.keys(CITY).map((c) => ({ city: c, upcoming: counts[c] || 0 })).sort((a, b) => a.upcoming - b.upcoming || a.city.localeCompare(b.city));
  const seasons = seasonReport(results, today).map((s) => ({ ...s, categories: s.categories.filter((c) => c.status !== "OK") })).filter((s) => s.categories.length);
  return reply(200, {
    ok: true, today, publishing: publishingOn(env), max_rows_per_call: MAX_ROWS, fields: FIELDS, shows_must_include: SHOWS,
    seasons: Object.fromEntries(Object.entries(SEASONS).map(([k, v]) => [k, { label: v.label, types: Object.keys(v.types) }])),
    thin_categories: seasons,
    cities_without_events: cities.filter((c) => !c.upcoming).map((c) => c.city), cities_fewest_events: cities.filter((c) => c.upcoming).slice(0, 25),
  });
}
