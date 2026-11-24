// Archiving of long-ended events (audit F-25). /api/events already hides an event 3 days after its last day (ENDED_GRACE_DAYS); this keeps the public "everything" list
// (/api/events?ended=1) from growing for ever: an event that ended more than ARCHIVE_AFTER_DAYS ago gets archived_at set and ?ended=1 skips it.
// Rows are never deleted, and an event with a paid order, a submitter (organizer), an approved or pending claim, a contest or owner photos is left alone, so everything a person
// can still reach (their profile, a receipt link, Admin) keeps working. Admin (?all=1), the event page and GET /api/events/<id> read archived rows as before.
import { ptToday } from "./time.js";

export const ARCHIVE_AFTER_DAYS = 60;
const BATCH = 500;

export const cutoffFor = (today, days = ARCHIVE_AFTER_DAYS) => new Date(new Date(today + "T12:00:00Z").getTime() - days * 86400_000).toISOString().slice(0, 10);

// Which events are due (oldest first). Same conditions for the dry run and the real run.
const DUE = `FROM events e WHERE e.archived_at IS NULL AND e.end_date < ?1 AND e.id NOT LIKE 'c-%'
  AND NOT EXISTS (SELECT 1 FROM feature_orders o WHERE o.event_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM event_submissions s WHERE s.event_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM event_claims c WHERE c.event_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM contests k WHERE k.event_id = e.id)
  AND (e.owner_photos IS NULL OR e.owner_photos = '' OR e.owner_photos = '[]')`;

export async function archiveEnded(env, { today = ptToday(), days = ARCHIVE_AFTER_DAYS, dryRun = false } = {}) {
  const cutoff = cutoffFor(today, days);
  const due = (await env.DB.prepare(`SELECT e.id, e.status ${DUE} ORDER BY e.end_date LIMIT ${BATCH}`).bind(cutoff).all()).results;
  const unresolved = due.filter((r) => r.status === "expected").length; // ended without ever being confirmed
  if (dryRun || !due.length) return { archived: 0, due: due.length, unresolved, cutoff, dryRun: !!dryRun };
  const ids = due.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 90) { // D1 allows 100 bound parameters per statement
    const part = ids.slice(i, i + 90);
    await env.DB.prepare(`UPDATE events SET archived_at = datetime('now') WHERE archived_at IS NULL AND id IN (${part.map(() => "?").join(",")})`).bind(...part).run();
  }
  return { archived: ids.length, due: ids.length, unresolved, cutoff, dryRun: false };
}
