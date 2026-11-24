// Emails to the buyer of a paid Featured placement (an event or a home): "ends in 3 days" and "has ended" (audit F-14). Called once a day by the Worker clock
// (POST /api/placement-notices). A refund already has its own mail (notifyRefunded in ordermail.js).
// Once per order and kind: `once` (ordermail.js) claims feature_orders.ending_notice_at / ended_notice_at before sending, releases the claim when the mail service failed so the next run retries,
// and marks the column 'skipped' (never sent again) when the buyer has no usable address or the address is on the do-not-contact list for a bounce, a complaint or a deleted account (canMailService).
// Only orders that are still 'paid' and applied count; refunded, held, disputed and refund-due orders are left alone. Kill switch: PLACEMENT_NOTICES=0.
import { once } from "./ordermail.js";
import { ptToday } from "./featured.js";
import { shiftDay } from "./time.js";
import { niceYmd } from "./money.js";

const SITE = "https://socallights.app";
const link = (o) => `${SITE}/feature?${o.target === "home" ? "home" : "event"}=${encodeURIComponent(o.event_id || "")}`;
const KIND = "COALESCE(target, 'event') IN ('event', 'home') AND status = 'paid' AND applied = 1 AND applied_until IS NOT NULL";

export async function sweepPlacementNotices(env, { limit = 25, today = ptToday() } = {}) {
  if (String(env.PLACEMENT_NOTICES) === "0") return { ending: 0, ended: 0, off: true };
  const q = async (sql, ...a) => { try { return (await env.DB.prepare(sql).bind(...a).all()).results; } catch { return []; } };
  const out = { ending: 0, ended: 0 };
  // ends within 3 days (not the day the order was paid: a one-day plan must not say "ends soon" right after the receipt)
  for (const o of await q(`SELECT * FROM feature_orders WHERE ${KIND} AND applied_until >= ? AND applied_until <= ? AND ending_notice_at IS NULL AND ended_notice_at IS NULL AND created_at < datetime('now', '-1 day') ORDER BY applied_until LIMIT ?`, today, shiftDay(today, 3), limit)) {
    const days = Math.max(0, Math.round((Date.parse(o.applied_until + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 86400000));
    if (await once(env, o, "ending_notice_at", "placement_ending", { ends: niceYmd(o.applied_until), days: String(days), link: link(o) })) out.ending++;
  }
  // ended in the last week (older ones were marked by the migration or are not worth a late mail)
  for (const o of await q(`SELECT * FROM feature_orders WHERE ${KIND} AND applied_until < ? AND applied_until >= ? AND ended_notice_at IS NULL ORDER BY applied_until LIMIT ?`, today, shiftDay(today, -7), limit)) {
    if (await once(env, o, "ended_notice_at", "placement_ended", { ends: niceYmd(o.applied_until), link: link(o) })) out.ended++;
  }
  return out;
}
