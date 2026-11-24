// POST /api/admin/events/restore { ids: [...] } — undo an Admin delete (one event or a bulk delete) from the tombstones in deleted_events.
// Puts the whole stored row back (photo, video, paid placement fields included), lifts the tombstone, and turns any "refund due" the delete caused back into "paid".
// A duplicate removed by "Merge duplicate events" (events/merge.js) carries a merge_undo note: its restore also gives the surviving event back the fields the merge changed (only the ones nobody has edited since)
// and points the moved submission rows back at the restored event.
import { json, err } from "../../../_lib/util.js";

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  const ids = b && Array.isArray(b.ids) ? [...new Set(b.ids.map((x) => String(x)).filter((x) => /^[a-z0-9-]{1,40}$/.test(x)))].slice(0, 200) : [];
  if (!ids.length) return err(400, "Choose the events to bring back.");
  const cols = new Set((await env.DB.prepare("PRAGMA table_info(events)").all()).results.map((c) => c.name));
  const restored = [], skipped = [];
  for (const id of ids) {
    const t = await env.DB.prepare("SELECT row, merge_undo FROM deleted_events WHERE id = ?").bind(id).first().catch(() => env.DB.prepare("SELECT row FROM deleted_events WHERE id = ?").bind(id).first()); // before migration 0292 there is no merge_undo column
    if (!t) { skipped.push(id); continue; }
    let row; try { row = JSON.parse(t.row); } catch { skipped.push(id); continue; }
    const keys = Object.keys(row).filter((k) => cols.has(k) && /^[a-z_]+$/.test(k));
    if (!keys.includes("id") || row.id !== id) { skipped.push(id); continue; }
    const stmts = [env.DB.prepare(`INSERT OR REPLACE INTO events (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`).bind(...keys.map((k) => row[k] ?? null))];
    stmts.push(...(await mergeUndo(env, id, t.merge_undo, cols)));
    stmts.push(env.DB.prepare("DELETE FROM deleted_events WHERE id = ?").bind(id));
    await env.DB.batch(stmts);
    await env.DB.prepare("UPDATE feature_orders SET status = 'paid', note = NULL WHERE event_id = ? AND status = 'refund_due' AND note LIKE '[auto] The event was deleted while%'").bind(id).run();
    restored.push(id);
  }
  return json({ ok: true, restored, skipped });
}

// The statements that undo a merge on the surviving event: each field goes back only while it still holds the value the merge wrote; each moved row goes back only while it still points at the survivor.
async function mergeUndo(env, id, note, cols) {
  let u; try { u = note ? JSON.parse(note) : null; } catch { u = null; }
  if (!u || typeof u.merged_into !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(u.merged_into)) return [];
  const keep = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(u.merged_into).first();
  const out = [];
  if (keep) {
    const back = Object.keys(u.before || {}).filter((c) => cols.has(c) && /^[a-z_]+$/.test(c) && String(keep[c] ?? "") === String((u.after || {})[c] ?? ""));
    if (back.length) out.push(env.DB.prepare(`UPDATE events SET ${back.map((c) => `${c} = ?`).join(", ")}, updated_at = datetime('now') WHERE id = ?`).bind(...back.map((c) => u.before[c] ?? null), u.merged_into));
    for (const [k, rows] of Object.entries(u.moved || {})) {
      const [t, c] = k.split(".");
      if (!["event_submissions", "event_edit_history", "intake_updates", "posts"].includes(t) || !["event_id", "claim_event_id"].includes(c) || !Array.isArray(rows)) continue;
      for (let i = 0; i < rows.length; i += 50) { const part = rows.slice(i, i + 50).map(Number).filter(Number.isFinite); if (part.length) out.push(env.DB.prepare(`UPDATE ${t} SET ${c} = ? WHERE ${c} = ? AND rowid IN (${part.map(() => "?").join(",")})`).bind(id, u.merged_into, ...part)); }
    }
  }
  return out;
}
