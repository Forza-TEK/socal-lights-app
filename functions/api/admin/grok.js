// Admin > From Grok (behind requireAdmin through functions/api/admin/_middleware.js).
// GET  /api/admin/grok            -> { configured, publishing, counts, rows: [recent intake rows] }
// POST /api/admin/grok { action: "unpublish" | "publish", id }   one click: take a Grok event off the map (the row stays, so Grok cannot add it again), or put a held / unpublished one on it.
import { json, err } from "../../_lib/util.js";
import { eventStatement, publishingOn, ID_PREFIX } from "../../_lib/intake.js";

export async function onRequestGet({ env }) {
  const rows = (await env.DB.prepare("SELECT id, status, reason, name, city, county, season, type, start_date, end_date, hours, price, url, venue, address, evidence, seen, received_at, acted_at FROM intake_events ORDER BY received_at DESC, id LIMIT 300").all()).results;
  const counts = {}; for (const r of (await env.DB.prepare("SELECT status, COUNT(*) AS n FROM intake_events GROUP BY status").all()).results) counts[r.status] = r.n;
  return json({ configured: !!(env.GROK_INTAKE_KEY && String(env.GROK_INTAKE_KEY).length >= 16), publishing: publishingOn(env), counts, rows }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || typeof b.id !== "string" || !b.id.startsWith(ID_PREFIX)) return err(400, "Choose a Grok event.");
  const row = await env.DB.prepare("SELECT * FROM intake_events WHERE id = ?").bind(b.id).first();
  if (!row) return err(404, "That row is gone.");
  if (b.action === "unpublish") {
    if (row.status !== "published") return err(409, "That event is not published.");
    await env.DB.batch([
      env.DB.prepare("DELETE FROM events WHERE id = ? AND id LIKE 'grok-%'").bind(row.id),
      env.DB.prepare("UPDATE intake_events SET status = 'unpublished', acted_at = datetime('now') WHERE id = ?").bind(row.id),
    ]);
    return json({ ok: true, status: "unpublished" });
  }
  if (b.action === "publish") {
    if (!["held", "unpublished"].includes(row.status)) return err(409, "Only a held or unpublished row can be published.");
    await env.DB.batch([eventStatement(env, row), env.DB.prepare("UPDATE intake_events SET status = 'published', acted_at = datetime('now') WHERE id = ?").bind(row.id)]);
    return json({ ok: true, status: "published" });
  }
  return err(400, "Unknown action.");
}
