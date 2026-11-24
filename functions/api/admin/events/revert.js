// POST /api/admin/events/revert { id, action: "revert", unlink?: true } — put back the listing as it was before the latest organizer takeover ("This is my event", submit-event.js, audit F-03).
// The full previous row is read from event_edit_history (newest one not yet reverted). Only the columns the takeover rewrites (the ones upsertEvent writes) are restored, so a paid placement,
// the owner's photos, the video clip and other bookkeeping on the event are left as they are. The history row is marked reverted (a second click goes one step further back).
// unlink: true also removes the organizer's access (the event_submissions row the takeover created), for vandalism rather than an honest typo. The admin middleware writes the log line
// (area events, action "revert", the event's name and the fields that changed); send action: "revert" so the log says so.
import { json, err } from "../../../_lib/util.js";

// Exactly the columns events.js upsertEvent writes on a takeover.
const REVERT_COLUMNS = ["name", "county", "city", "type", "start_date", "end_date", "status", "free", "price", "hours", "lat", "lng", "blurb", "url", "season", "venue", "address"];

export async function onRequestPost({ request, env, data = {} }) {
  const b = await request.json().catch(() => null);
  const id = b && typeof b.id === "string" ? b.id.trim() : "";
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return err(400, "Choose the event to revert.");
  let h;
  try { h = await env.DB.prepare("SELECT id, row, by_email, submission_id, created_at FROM event_edit_history WHERE event_id = ? AND reverted_at IS NULL ORDER BY id DESC LIMIT 1").bind(id).first(); }
  catch { return err(503, "The edit history is not set up yet. Try again in a minute."); }
  if (!h) return err(404, "There is no saved organizer update to revert for this event.");
  let row; try { row = JSON.parse(h.row); } catch { return err(500, "The saved row could not be read."); }
  if (!row || row.id !== id) return err(500, "The saved row does not belong to this event.");
  const live = await env.DB.prepare("SELECT id FROM events WHERE id = ?").bind(id).first();
  if (!live) return err(404, "That event is not on the map any more. Bring it back from Events > Deleted first.");
  const cols = REVERT_COLUMNS.filter((c) => Object.prototype.hasOwnProperty.call(row, c));
  const who = String((data.admin && data.admin.email) || "").slice(0, 120);
  const stmts = [
    env.DB.prepare(`UPDATE events SET ${cols.map((c) => `${c} = ?`).join(", ")}, updated_at = datetime('now') WHERE id = ?`).bind(...cols.map((c) => row[c] ?? null), id),
    env.DB.prepare("UPDATE event_edit_history SET reverted_at = datetime('now'), reverted_by = ? WHERE id = ?").bind(who, h.id),
  ];
  if (b.unlink === true && h.submission_id) stmts.push(env.DB.prepare("DELETE FROM event_submissions WHERE id = ? AND event_id = ?").bind(h.submission_id, id)); // the row is what made them the manager; without it the listing is unmanaged again
  else if (h.submission_id) stmts.push(env.DB.prepare("UPDATE event_submissions SET note = substr('details reverted by Admin. ' || COALESCE(note, ''), 1, 480) WHERE id = ? AND event_id = ?").bind(h.submission_id, id));
  await env.DB.batch(stmts);
  return json({ ok: true, id, restored: cols.length, unlinked: b.unlink === true && !!h.submission_id, was_changed_by: h.by_email || "", was_changed_at: h.created_at });
}
