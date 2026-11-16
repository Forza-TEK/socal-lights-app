// Live numbers for Admin > Progress, counted from the database each time: the map, season coverage against the working targets, and what Grok has done.
import { seasonReport } from "./gaps.js";
import { ptToday } from "./time.js";

const slot = (ms = Date.now()) => new Date(Math.floor(ms / 1800000) * 1800000).toISOString().slice(0, 16); // UTC, rounded down to the half hour

export async function collectProgress(env, today = ptToday()) {
  const evs = (await env.DB.prepare("SELECT id, name AS n, venue AS v, type AS t, season AS sn, county AS c, status AS st, end_date AS e, (image IS NOT NULL AND image != '') AS img, (owner_photos IS NOT NULL AND owner_photos NOT IN ('', '[]')) AS own FROM events WHERE end_date >= ?").bind(today).all()).results;
  const county = {}; let confirmed = 0, photo = 0, grok = 0;
  for (const e of evs) { const k = (county[e.c] ||= { confirmed: 0, expected: 0 }); k[e.st === "confirmed" ? "confirmed" : "expected"]++; if (e.st === "confirmed") confirmed++; if (e.img || e.own) photo++; if (String(e.id).startsWith("grok-")) grok++; }
  const seasons = seasonReport(evs, today).map((s) => ({ season: s.season, label: s.label, upcoming: s.upcoming, categories: s.categories.map((c) => ({ id: c.id, label: c.label, count: c.count, min: c.min, status: c.status })) }));
  const cats = seasons.flatMap((s) => s.categories.map((c) => ({ ...c, seasonLabel: s.label })));
  const [byStatus, upd, att] = (await env.DB.batch([
    env.DB.prepare("SELECT status, COUNT(*) AS n FROM intake_events GROUP BY status"),
    env.DB.prepare("SELECT status, kind, COUNT(*) AS n, SUM(received_at > datetime('now','-1 day')) AS d1, SUM(received_at > datetime('now','-7 days')) AS d7 FROM intake_updates GROUP BY status, kind"),
    env.DB.prepare("SELECT COUNT(*) AS n, SUM(last_attempt > datetime('now','-1 day')) AS d1 FROM intake_attempts"),
  ])).map((r) => r.results);
  const intake = Object.fromEntries(byStatus.map((r) => [r.status, r.n]));
  const applied = upd.filter((r) => r.status === "applied");
  const updates = { applied: applied.reduce((s, r) => s + r.n, 0), applied_24h: applied.reduce((s, r) => s + (r.d1 || 0), 0), applied_7d: applied.reduce((s, r) => s + (r.d7 || 0), 0), held: upd.filter((r) => r.status === "held").reduce((s, r) => s + r.n, 0), by_kind: Object.fromEntries(Object.entries(applied.reduce((m, r) => ((m[r.kind] = (m[r.kind] || 0) + r.n), m), {}))), tried_24h: (att[0] && att[0].d1) || 0, tried_total: (att[0] && att[0].n) || 0 };
  return {
    today, upcoming: evs.length, confirmed, expected: evs.length - confirmed, with_photo: photo, from_grok: grok,
    counties: Object.entries(county).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.confirmed + b.expected - (a.confirmed + a.expected)),
    seasons, cats_ok: cats.filter((c) => c.count >= c.min).length, cats_total: cats.length, cats: cats.sort((a, b) => a.count / a.min - b.count / b.min),
    intake: { published: intake.published || 0, held: intake.held || 0, rejected: intake.rejected || 0, unpublished: intake.unpublished || 0 }, updates,
  };
}

/** Writes this half hour's row (at most one per slot). Returns the slot written. */
export async function logProgress(env, p) {
  const at = slot();
  await env.DB.prepare("INSERT OR REPLACE INTO progress_log (at, upcoming, confirmed, with_photo, from_grok, cats_ok, cats_total, updates_applied, intake_published) VALUES (?,?,?,?,?,?,?,?,?)")
    .bind(at, p.upcoming, p.confirmed, p.with_photo, p.from_grok, p.cats_ok, p.cats_total, p.updates.applied, p.intake.published).run();
  await env.DB.prepare("DELETE FROM progress_log WHERE at < ?").bind(new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 16)).run(); // keep 60 days
  return at;
}
export const loadHistory = async (env) => (await env.DB.prepare("SELECT * FROM progress_log WHERE at >= ? ORDER BY at").bind(new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 16)).all()).results;
