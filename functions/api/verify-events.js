// POST /api/verify-events — called every 30 minutes by the Cloudflare cron Worker (workers/mail-cron) with the shared key (ALERT_CRON_KEY).
// People's own events go live as "expected" when the check of their event page could not run or did not pass at submission (the page was slow, or not up yet).
// This asks again: for each published, still-expected event that someone submitted and that has a web page, it runs the same check as the submit form
// (verifyEventPage: the page loads and mentions the event name and its year) and, when it passes, sets the event to confirmed. Nothing is ever downgraded or removed here.
// Only events people submitted are touched; the sweep-found events follow the stricter rules in docs/confirmation-plan.md.
// A page that still fails is asked again after 6 hours, until the event ends. At most 6 events per run, checked in parallel (about 12 outgoing calls at most).
import { json, err } from "../_lib/util.js";
import { verifyEventPage } from "../_lib/events.js";
import { logOp } from "../_lib/oplog.js";

const BATCH = 6;
export async function onRequest({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || key !== env.ALERT_CRON_KEY) return err(401, "Not allowed.");
  if (request.method !== "POST" && request.method !== "GET") return err(405, "Use POST.");
  const { results: due } = await env.DB.prepare(
    `SELECT s.id AS sid, e.id AS eid, e.name, e.url, e.start_date FROM event_submissions s JOIN events e ON e.id = s.event_id
     WHERE s.status = 'published' AND e.status = 'expected' AND e.url != '' AND e.end_date >= date('now') AND (s.checked_at IS NULL OR s.checked_at < datetime('now','-6 hours'))
     ORDER BY s.checked_at IS NOT NULL, s.checked_at LIMIT ?`).bind(BATCH).all();
  let confirmed = 0, failed = 0;
  const done = await Promise.all(due.map(async (r) => ({ r, c: await verifyEventPage(r.url, r.name, r.start_date).catch(() => ({ ok: false, note: "check did not run" })) })));
  for (const { r, c } of done) {
    try {
      if (c.ok) {
        await env.DB.batch([
          env.DB.prepare("UPDATE events SET status = 'confirmed', updated_at = datetime('now') WHERE id = ? AND status = 'expected'").bind(r.eid),
          env.DB.prepare("UPDATE event_submissions SET verified = 1, note = ?, checked_at = datetime('now') WHERE id = ?").bind("confirmed automatically: " + c.note, r.sid),
        ]);
        confirmed++;
      } else {
        await env.DB.prepare("UPDATE event_submissions SET note = ?, checked_at = datetime('now') WHERE id = ?").bind(String(c.note || "").slice(0, 240), r.sid).run();
        failed++;
      }
    } catch (x) { await logOp(env, "verify-events", String((x && x.message) || x)); failed++; }
  }
  return json({ checked: due.length, confirmed, failed }, { headers: { "cache-control": "no-store" } });
}
