// Event Partner wording shared by /pricing, /partner and the confirmation email (functions/_lib/partnermail.js).
// The price and the cap come from the server (/api/config eventPartner; functions/_lib/partner.js is the only place a price is set). Nothing here holds a price.
// Lists every inclusion in full (no shorthand that points at another plan). The badge never claims an endorsement.
export const INFO_EMAIL = "info@socallights.app";
export const dollars = (cents) => "$" + (cents % 100 ? (cents / 100).toFixed(2) : cents / 100);
export const niceDate = (s) => (s ? new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");
export const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const FOR_WHO = "Cities, chambers of commerce, nonprofits and event producers";
export const BADGE_NOTE = "The Event Partner badge only shows that the organization has this plan. It is not an endorsement by SoCal Lights.";
export const FREE_NOTE = "Listing an event on SoCal Lights stays free for everyone.";
export function partnerCopy(cfg) {
  const p = (cfg && cfg.eventPartner) || {}, cap = p.cap || 10;
  return {
    name: p.label || "Event Partner", unit: "per season",
    blurb: `For ${FOR_WHO.toLowerCase()} that run several events in a season.`,
    bullets: [
      `Covers up to ${cap} of your organization's events in one season`,
      "The Featured pin on each covered event: a gold-ringed pin on the map and a \"Featured\" badge in the list and in its details",
      "Featuring opens 30 days before an event starts and runs to its last day, or to the end of the season, whichever comes first",
      "An \"Event Partner\" badge on each covered event's page",
      "Pay once for the season; no subscription",
    ],
    note: `${FREE_NOTE} ${BADGE_NOTE}`,
  };
}
