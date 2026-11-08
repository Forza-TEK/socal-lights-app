// POST /api/outreach/event { email, event: sent|reply|bounce|complaint|unsubscribe, step: 0|1|2, segment: installer|contest|event_host, sent_at?: "YYYY-MM-DD" }
// Stores one result row (hash, event, step, segment, Pacific date) for reporting. A reply, bounce, complaint or unsubscribe ALSO adds the address to the do-not-contact list.
// sent_at (only with event "sent"; not in the future, within the last 120 days) backfills an email sent before this API existed. One 'sent' row per address and step then:
//   the EARLIEST date is kept, so a backfill never pushes a step later and a repeat is harmless.
// POST /api/outreach/event { email, event: "invalid", reason: invalid_syntax|no_mail_server|disposable }: remembers (as a hash) that the address cannot receive mail so later checks say so. Does NOT suppress.
import { outreachGuard, outreachReply, suppressionStatements, outreachHashes, cleanEmail, validEmail, EVENTS, SEGMENTS, INVALID_REASONS } from "../../_lib/outreach.js";
import { logOp } from "../../_lib/oplog.js";
import { ptToday, shiftDay } from "../../_lib/time.js";

const BACKFILL_DAYS = 120;
const realDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00Z")) && new Date(s + "T12:00:00Z").toISOString().slice(0, 10) === s;

export async function onRequest({ request, env }) {
  const g = await outreachGuard(request, env);
  if (g.res) return g.res;
  if (request.method !== "POST") return outreachReply(405, { hold: true, error: "Use POST." });
  const b = (await request.json().catch(() => null)) || {};
  const email = cleanEmail(b.email), today = ptToday();
  const shape = `Send { "email", "event": ${EVENTS.join("|")}|invalid, "step": 0|1|2, "segment": ${SEGMENTS.join("|")}, "sent_at": "YYYY-MM-DD" (optional, only with sent), "reason": ${INVALID_REASONS.join("|")} (only with invalid) }.`;
  if (!validEmail(email)) return outreachReply(400, { hold: true, error: shape });
  try {
    if (b.event === "invalid") {
      if (!INVALID_REASONS.includes(b.reason) || b.sent_at !== undefined) return outreachReply(400, { hold: true, error: shape });
      const { h } = await outreachHashes(env, email);
      await env.DB.prepare("INSERT OR IGNORE INTO outreach_invalid (email_hash, reason, first_seen) VALUES (?,?,?)").bind(h, b.reason, today).run();
      await logOp(env, "outreach", `event invalid reason=${b.reason}`);
      return outreachReply(200, { ok: true, suppressed: false, invalid: true, email_hash_prefix: h.slice(0, 8) });
    }
    if (!EVENTS.includes(b.event) || ![0, 1, 2].includes(b.step) || !SEGMENTS.includes(b.segment) || b.reason !== undefined) return outreachReply(400, { hold: true, error: shape });
    let day = today;
    if (b.sent_at !== undefined) {
      if (b.event !== "sent" || !realDate(b.sent_at) || b.sent_at > today || b.sent_at < shiftDay(today, -BACKFILL_DAYS)) return outreachReply(400, { hold: true, error: `"sent_at" is only for event "sent": a real date YYYY-MM-DD, not in the future, within the last ${BACKFILL_DAYS} days.` });
      day = b.sent_at;
    }
    const { h, n } = await outreachHashes(env, email);
    if (b.event === "sent" && b.sent_at !== undefined) {
      const have = await env.DB.prepare("SELECT id, day FROM outreach_events WHERE event = 'sent' AND step = ? AND (email_hash IN (?,?) OR alias_hash IN (?,?)) ORDER BY day, id LIMIT 1").bind(b.step, h, n, h, n).first();
      if (have) {
        const earlier = day < have.day;
        if (earlier) await env.DB.prepare("UPDATE outreach_events SET day = ? WHERE id = ?").bind(day, have.id).run();
        await logOp(env, "outreach", `event sent step=${b.step} segment=${b.segment} backfill ${earlier ? "moved earlier" : "kept"}`);
        return outreachReply(200, { ok: true, suppressed: false, duplicate: true, day: earlier ? day : have.day, email_hash_prefix: h.slice(0, 8) });
      }
    }
    const stmts = [env.DB.prepare("INSERT INTO outreach_events (email_hash, alias_hash, event, step, segment, day) VALUES (?,?,?,?,?,?)").bind(h, n === h ? "" : n, b.event, b.step, b.segment, day)];
    if (b.event !== "sent") stmts.push(...(await suppressionStatements(env, email, b.event, "outreach")));
    await env.DB.batch(stmts);
    await logOp(env, "outreach", `event ${b.event} step=${b.step} segment=${b.segment}${b.sent_at !== undefined ? " backfill" : ""}`);
    return outreachReply(200, { ok: true, suppressed: b.event !== "sent", email_hash_prefix: h.slice(0, 8) });
  } catch (e) { await logOp(env, "outreach", "event failed (" + String(e && e.message).slice(0, 80) + ")"); return outreachReply(503, { hold: true, error: "Could not save. Hold all sends and retry." }); }
}
