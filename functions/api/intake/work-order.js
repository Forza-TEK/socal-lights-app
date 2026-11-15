// GET /api/intake/work-order -> the season categories that are thin on the map today (with the searches and places to look) and the rules a row must meet. Key-protected like /api/intake/events.
import { intakeGuard, publishingOn, MAX_ROWS, FIELDS, SHOWS } from "../../_lib/intake.js";
import { reply } from "../../_lib/ads.js";
import { seasonReport } from "../../_lib/gaps.js";
import { SEASONS } from "../../../public/seasons.js";
import { ptToday } from "../../_lib/time.js";

export async function onRequest({ request, env }) {
  const g = await intakeGuard(request, env, "GET");
  if (g.res) return g.res;
  const today = ptToday();
  const { results } = await env.DB.prepare("SELECT id, name AS n, venue AS v, type AS t, season AS sn, end_date AS e FROM events WHERE end_date >= ?").bind(today).all();
  const seasons = seasonReport(results, today).map((s) => ({ ...s, categories: s.categories.filter((c) => c.status !== "OK") })).filter((s) => s.categories.length);
  return reply(200, {
    ok: true, today, publishing: publishingOn(env), max_rows_per_call: MAX_ROWS, fields: FIELDS, shows_must_include: SHOWS,
    seasons: Object.fromEntries(Object.entries(SEASONS).map(([k, v]) => [k, { label: v.label, types: Object.keys(v.types) }])),
    thin_categories: seasons,
  });
}
