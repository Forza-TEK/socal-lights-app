// The receipt / "what happens next" email for a paid event Featured order, from the editable template `feature_paid` (Admin > Settings > Email templates).
// Best effort: a failed email never blocks the payment or the placement.
import { sendTemplate } from "./mailtpl.js";
import { PLANS, EVENT_PLANS } from "./featured.js";
import { eventTierCopy } from "../../public/feature-plans.js"; // the plan contents are written once, for the pages and this email

const SITE = "https://socallights.app";
const nice = (s) => (s ? new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");

// order: a feature_orders row. name: the event's name. until: the placement's last day (ymd) or "". waiting: true while the event waits for review.
// eventId: the public event id ("" while waiting).
export async function sendFeaturePaidEmail(env, { order, name, until, waiting, eventId, fallbackEmail = "" }) {
  const to = (order && order.email) || fallbackEmail;
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false;
  const tier = EVENT_PLANS[order.plan], p = tier || PLANS[order.plan] || {};
  // What the plan includes, in the same words as the pricing page (without the "Runs ..." line: the email states the exact last day itself).
  const list = tier ? eventTierCopy(order.plan).bullets.slice(0, -1).map((b) => "- " + b).join("\n") : `- A gold-ringed pin and a Featured badge on the map.${order.plan === "pin" ? "" : "\n- Your event is listed first when people browse your area."}`;
  try {
    return await sendTemplate(env, "feature_paid", to, {
      name: name || "your event", plan: p.label || order.plan, amount: order.amount == null ? "" : "$" + (order.amount / 100).toFixed(2),
      until: until ? nice(until) : "your event's last day", list,
      waiting: waiting ? "yes" : "", link: eventId ? `${SITE}/#e-${eventId}` : `${SITE}/profile#events`,
    });
  } catch (e) { console.error("feature email", e && e.message); return false; }
}
