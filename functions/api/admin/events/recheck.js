// POST /api/admin/events/recheck { id, action: "recheck" } — "Re-check this event's page" in the event editor (audit F-19).
// Fetches the event's web page politely (our own bot name, robots.txt first, Web Bot Auth when configured: functions/_lib/botfetch.js) and reports whether the page still mentions the event name
// and the event's year, plus a heads-up when it uses a word like cancelled or postponed. The result is stored on the event (checked_at, check_note; migration 0292) and the Admin log records it.
// NOTHING is downgraded, unpublished or edited by this: it only writes those two columns. A page that could not be read (blocked, slow, robots.txt) stores the note but not checked_at,
// so the event stays on the "Not re-checked in 30 days" list. One event, one page, one click: there is no batch and no schedule.
import { json, err } from "../../../_lib/util.js";
import { politeFetch } from "../../../_lib/botfetch.js";
import { verifyEventPage } from "../../../_lib/events.js";

export const noteFor = (c, year) => {
  if (!c.seen) return String(c.note || "The page could not be checked.").slice(0, 300);
  return `Page read. Event name: ${c.seen.name ? "found" : "NOT found"}. ${year}: ${c.seen.year ? "found" : "NOT found"}.${c.seen.cancel ? " The page uses a word like cancelled, postponed or rescheduled: read it." : ""}`;
};

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  const id = b && typeof b.id === "string" ? b.id.trim() : "";
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return err(400, "Choose the event to re-check.");
  const e = await env.DB.prepare("SELECT id, name, url, start_date FROM events WHERE id = ?").bind(id).first();
  if (!e) return err(404, "That event is not on the map.");
  if (!e.url) return err(400, "This event has no web page to check. Add the event's website first.");
  let c;
  try { c = await verifyEventPage(e.url, e.name, e.start_date, politeFetch(env)); } catch { c = { ok: false, note: "The check did not run. Try again in a minute." }; }
  const year = e.start_date.slice(0, 4), note = noteFor(c, year), read = !!c.seen;
  try {
    if (read) await env.DB.prepare("UPDATE events SET checked_at = datetime('now'), check_note = ? WHERE id = ?").bind(note, id).run();
    else await env.DB.prepare("UPDATE events SET check_note = ? WHERE id = ?").bind(note, id).run();
  } catch { return err(503, "The re-check result could not be saved yet (the database update is still rolling out). Try again in a minute."); }
  const row = await env.DB.prepare("SELECT checked_at FROM events WHERE id = ?").bind(id).first();
  return json({ ok: true, read, still_mentions_name: read ? c.seen.name : null, still_mentions_year: read ? c.seen.year : null, year, cancel_words: read ? c.seen.cancel : null, blocked: !!c.blocked, note, checked_at: row && row.checked_at || null, url: e.url }, { headers: { "cache-control": "no-store" } });
}
