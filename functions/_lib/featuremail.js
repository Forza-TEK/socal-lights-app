// The receipt / "what happens next" email for a paid event Featured order, from the editable template `feature_paid` (Admin > Settings > Email templates).
// Best effort: a failed email never blocks the payment or the placement.
import { sendTemplate } from "./mailtpl.js";
import { PLANS } from "./featured.js";

const SITE = "https://socallights.app";
const nice = (s) => (s ? new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");

// order: a feature_orders row. name: the event's name. until: the placement's last day (ymd) or "". waiting: true while the event waits for review.
// eventId: the public event id ("" while waiting).
export async function sendFeaturePaidEmail(env, { order, name, until, waiting, eventId, fallbackEmail = "" }) {
  const to = (order && order.email) || fallbackEmail;
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false;
  const p = PLANS[order.plan] || {};
  try {
    return await sendTemplate(env, "feature_paid", to, {
      name: name || "your event", plan: p.label || order.plan, amount: order.amount == null ? "" : "$" + (order.amount / 100).toFixed(2),
      until: until ? nice(until) : "your event's last day",
      waiting: waiting ? "yes" : "", link: eventId ? `${SITE}/#e-${eventId}` : `${SITE}/profile#events`,
    });
  } catch (e) { console.error("feature email", e && e.message); return false; }
}
