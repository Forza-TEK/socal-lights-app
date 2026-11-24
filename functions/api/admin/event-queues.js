// GET /api/admin/event-queues -> { today, nophoto: [event id, soonest first], stale: [event id, soonest first] | null, checked: { <id>: [checked_at, note] } }
// The two work queues on Admin > Events (audit F-21 and F-19). Read-only; behind requireAdmin like all of /api/admin.
//   nophoto: events still to come (or running) with no linked picture, no gallery pictures and no owner photos: the map falls back to a stock photo for these.
//   stale:   upcoming CONFIRMED events that have a web page and were never re-checked, or not in the last 30 days (events/recheck.js). null before migration 0292 has created the column.
//   checked: when and what the last re-check found, for the events that have one (newest 300).
import { json } from "../../_lib/util.js";
import { ptToday } from "../../_lib/featured.js";

export async function onRequestGet({ env }) {
  const today = ptToday();
  const ids = async (sql, ...b) => { try { return (await env.DB.prepare(sql).bind(...b).all()).results.map((r) => r.id); } catch { return null; } };
  const nophoto = (await ids("SELECT id FROM events WHERE end_date >= ?1 AND COALESCE(image, '') = '' AND COALESCE(images, '') IN ('', '[]') AND COALESCE(owner_photos, '') IN ('', '[]') ORDER BY start_date, name", today)) || [];
  const stale = await ids("SELECT id FROM events WHERE status = 'confirmed' AND end_date >= ?1 AND COALESCE(url, '') != '' AND (checked_at IS NULL OR checked_at < datetime('now', '-30 days')) ORDER BY start_date, name", today);
  let checked = {};
  try { checked = Object.fromEntries((await env.DB.prepare("SELECT id, checked_at, check_note FROM events WHERE checked_at IS NOT NULL ORDER BY checked_at DESC LIMIT 300").all()).results.map((r) => [r.id, [r.checked_at, r.check_note || ""]])); } catch { /* before migration 0292 */ }
  return json({ today, nophoto, stale, checked }, { headers: { "cache-control": "no-store" } });
}
