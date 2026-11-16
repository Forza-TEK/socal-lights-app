// POST /api/admin/events/restore { ids: [...] } — undo an Admin delete (one event or a bulk delete) from the tombstones in deleted_events.
// Puts the whole stored row back (photo, video, paid placement fields included), lifts the tombstone, and turns any "refund due" the delete caused back into "paid".
import { json, err } from "../../../_lib/util.js";

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  const ids = b && Array.isArray(b.ids) ? [...new Set(b.ids.map((x) => String(x)).filter((x) => /^[a-z0-9-]{1,40}$/.test(x)))].slice(0, 200) : [];
  if (!ids.length) return err(400, "Choose the events to bring back.");
  const cols = new Set((await env.DB.prepare("PRAGMA table_info(events)").all()).results.map((c) => c.name));
  const restored = [], skipped = [];
  for (const id of ids) {
    const t = await env.DB.prepare("SELECT row FROM deleted_events WHERE id = ?").bind(id).first();
    if (!t) { skipped.push(id); continue; }
    let row; try { row = JSON.parse(t.row); } catch { skipped.push(id); continue; }
    const keys = Object.keys(row).filter((k) => cols.has(k) && /^[a-z_]+$/.test(k));
    if (!keys.includes("id") || row.id !== id) { skipped.push(id); continue; }
    await env.DB.batch([
      env.DB.prepare(`INSERT OR REPLACE INTO events (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`).bind(...keys.map((k) => row[k] ?? null)),
      env.DB.prepare("DELETE FROM deleted_events WHERE id = ?").bind(id),
    ]);
    await env.DB.prepare("UPDATE feature_orders SET status = 'paid', note = NULL WHERE event_id = ? AND status = 'refund_due' AND note LIKE '[auto] The event was deleted while%'").bind(id).run();
    restored.push(id);
  }
  return json({ ok: true, restored, skipped });
}
