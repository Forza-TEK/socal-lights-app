// The receipt / "what you bought" email for an Event Partner plan, from the editable template `event_partner_paid` (Admin > Settings > Email templates). Best effort: a failed email never blocks the plan.
import { sendTemplate } from "./mailtpl.js";
import { orgLabel } from "./passes.js";
import { partnerCopy, niceDate } from "../../public/partner-copy.js"; // the plan contents are written once, for the pages and this email
import { PUBLIC_EVENT_PARTNER } from "./partner.js";

// order: the feature_orders row. nf: { org_key, cap, from, to, season } from applyPartnerOrder. cents: what was paid.
export async function sendPartnerPaidEmail(env, order, nf, cents) {
  const to = order && order.email;
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false;
  const list = partnerCopy({ eventPartner: PUBLIC_EVENT_PARTNER }).bullets.map((b) => "- " + b).join("\n");
  try {
    return await sendTemplate(env, "event_partner_paid", to, { org: orgLabel(nf.org_key), cap: String(nf.cap), amount: cents == null ? "" : "$" + (cents / 100).toFixed(2), season: nf.season, end: niceDate(nf.to), list, link: "https://socallights.app/partner" });
  } catch (e) { console.error("partner email", e && e.message); return false; }
}
