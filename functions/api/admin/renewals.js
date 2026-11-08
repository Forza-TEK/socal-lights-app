// GET /api/admin/renewals — read-only view of automatic renewals of installer Sponsor placements: upcoming charges, failed charges, lapsed and paused ones.
// Nothing here changes anything and no card data exists to show (only Stripe ids are stored; they are not returned). Charges appear in Orders marked "Auto-renewal".
import { json } from "../../_lib/util.js";
import { INSTALLER_PLANS, ptToday } from "../../_lib/featured.js";

export async function onRequestGet({ env }) {
  const today = ptToday();
  const rows = (await env.DB.prepare(`SELECT r.installer_id, i.name, i.slug, r.plan, r.enabled, r.status, r.next_charge_date, r.notice_sent_for, r.retry_at, r.attempts, r.last_error, r.last_paid_cents, r.consent_text_version, r.consent_at, r.cancelled_at, r.updated_at
    FROM installer_autorenew r LEFT JOIN installers i ON i.id = r.installer_id ORDER BY r.next_charge_date LIMIT 300`).all().catch(() => ({ results: [] }))).results;
  const view = rows.map((r) => ({ ...r, price_cents: (INSTALLER_PLANS[r.plan] || INSTALLER_PLANS.banner).cents, group: r.status === "active" && r.attempts === 0 && r.next_charge_date && r.next_charge_date < today ? "overdue" : r.status === "lapsed" ? "lapsed" : r.status === "paused" ? "paused" : r.status === "cancelled" ? "cancelled" : r.attempts > 0 ? "failed" : "upcoming" }));
  const sum = (g) => view.filter((r) => r.group === g).length;
  return json({ today, counts: { upcoming: sum("upcoming"), overdue: sum("overdue"), failed: sum("failed"), lapsed: sum("lapsed"), paused: sum("paused"), cancelled: sum("cancelled") }, rows: view.filter((r) => r.group !== "cancelled").concat(view.filter((r) => r.group === "cancelled").slice(0, 20)) }, { headers: { "cache-control": "no-store" } });
}
