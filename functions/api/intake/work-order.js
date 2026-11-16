// GET /api/intake/work-order -> the season categories that are thin on the map today (with the searches and places to look) and the rules a row must meet. Key-protected like /api/intake/events.
import { intakeGuard, publishingOn, MAX_ROWS, FIELDS, SHOWS } from "../../_lib/intake.js";
import { reply, adsError } from "../../_lib/ads.js";
import { seasonReport } from "../../_lib/gaps.js";
import { SEASONS } from "../../../public/seasons.js";
import { ptToday } from "../../_lib/time.js";
import { CITY } from "../../../public/cities.js";

export const DEFAULT_LIST = 200, MAX_LIST = 500, MAX_SKIP_DAYS = 365;
/** Reads an optional whole-number query parameter; returns { v } or { err }. */
function intParam(sp, name, def, min, max) {
  if (!sp.has(name)) return { v: def };
  const raw = sp.get(name);
  if (!/^\d{1,6}$/.test(raw) || +raw < min || +raw > max) return { err: `${name} must be a whole number from ${min} to ${max}` };
  return { v: +raw };
}

export async function onRequest({ request, env }) {
  const g = await intakeGuard(request, env, "GET");
  if (g.res) return g.res;
  const sp = new URL(request.url).searchParams;
  const lim = intParam(sp, "limit", DEFAULT_LIST, 1, MAX_LIST), off = intParam(sp, "offset", 0, 0, 100000), skip = intParam(sp, "skip_attempted_days", 0, 0, MAX_SKIP_DAYS);
  const bad = lim.err || off.err || skip.err;
  if (bad) return adsError(400, `${bad}. Optional parameters: limit (1 to ${MAX_LIST}, default ${DEFAULT_LIST}), offset (0 or more, default 0), skip_attempted_days (0 to ${MAX_SKIP_DAYS}; leaves out events you tried in that many days with an unchanged or skipped result).`);
  const today = ptToday();
  const { results } = await env.DB.prepare("SELECT id, name AS n, venue AS v, type AS t, season AS sn, end_date AS e FROM events WHERE end_date >= ?").bind(today).all();
  const counts = Object.fromEntries((await env.DB.prepare("SELECT city, COUNT(*) AS n FROM events WHERE end_date >= ? GROUP BY city").bind(today).all()).results.map((r) => [r.city, r.n]));
  const cities = Object.keys(CITY).map((c) => ({ city: c, upcoming: counts[c] || 0 })).sort((a, b) => a.upcoming - b.upcoming || a.city.localeCompare(b.city));
  // events already on the map that Grok can confirm or give a photo, soonest first (use POST /api/intake/updates): organizer-managed, contest and paid events are left out because their changes wait for the owner
  const mine = "id NOT LIKE 'u-%' AND id NOT LIKE 'hcontest-%' AND id NOT LIKE 'h-%' AND id NOT IN (SELECT event_id FROM event_submissions WHERE event_id IS NOT NULL)";
  // each list is paged (limit/offset, soonest first); every row carries last_attempt (ISO time of Grok's last update call for it, or null) and last_attempt_result (changed, unchanged or skipped, or null)
  const cutoff = skip.v ? new Date(Date.now() - skip.v * 86400_000).toISOString().slice(0, 19) + "Z" : "";
  const list = async (cols, where) => {
    const run = async (withAttempts) => {
      const j = withAttempts ? "LEFT JOIN intake_attempts a ON a.event_id = events.id" : "", c = withAttempts ? ", a.last_attempt, a.result AS last_attempt_result" : "";
      const w = `${where}` + (withAttempts && cutoff ? " AND NOT COALESCE(a.last_attempt >= ? AND a.result IN ('unchanged','skipped'), 0)" : ""), bind = [today, ...(withAttempts && cutoff ? [cutoff] : [])];
      const rows = (await env.DB.prepare(`SELECT ${cols}${c} FROM events ${j} WHERE ${w} ORDER BY start_date, events.id LIMIT ? OFFSET ?`).bind(...bind, lim.v, off.v).all()).results;
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM events ${j} WHERE ${w}`).bind(...bind).first()).n;
      return { rows: rows.map((r) => ({ ...r, last_attempt: r.last_attempt || null, last_attempt_result: r.last_attempt_result || null })), total };
    };
    try { return await run(true); } catch { return await run(false); } // no attempts table yet: same lists, no history
  };
  const confirm = await list("events.id, name, city, start_date, end_date, url", `status = 'expected' AND end_date >= ? AND ${mine}`);
  const photo = await list("events.id, name, city, start_date, url", `(image IS NULL OR image = '') AND (owner_photos IS NULL OR owner_photos = '' OR owner_photos = '[]') AND end_date >= ? AND url != '' AND ${mine}`);
  const seasons = seasonReport(results, today).map((s) => ({ ...s, categories: s.categories.filter((c) => c.status !== "OK") })).filter((s) => s.categories.length);
  return reply(200, {
    ok: true, today, publishing: publishingOn(env), max_rows_per_call: MAX_ROWS, fields: FIELDS, shows_must_include: SHOWS,
    seasons: Object.fromEntries(Object.entries(SEASONS).map(([k, v]) => [k, { label: v.label, types: Object.keys(v.types) }])),
    events_to_confirm: confirm.rows, events_without_photo: photo.rows,
    paging: { limit: lim.v, offset: off.v, skip_attempted_days: skip.v, events_to_confirm_total: confirm.total, events_without_photo_total: photo.total },
    thin_categories: seasons,
    cities_without_events: cities.filter((c) => !c.upcoming).map((c) => c.city), cities_fewest_events: cities.filter((c) => c.upcoming).slice(0, 25),
  });
}
