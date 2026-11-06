// Installer Sponsor plan wording, shared by /pricing and /sponsor. Prices, the season dates and the proration come from /api/config and /api/me/sponsor
// (functions/_lib/featured.js and sponsor.js are the only places they are set); nothing here holds a price. Every plan lists what it includes in full:
// never write "Everything in ..." or "Everything above".
export const SPONSOR_KEYS = ["banner", "banner_top"];

const BANNER = [
  "Your company name, linked to your website (or to your email if you have no website), in the labelled \"Sponsor\" banner at the top of the list on the map",
  "Your phone number in that banner, tap to call",
  "Shown whenever your areas served are in the map view (everywhere if you list none)",
  "Always labelled \"Sponsor\", so nobody is misled",
  "How many times you were shown and tapped, in your dashboard",
];
const TOP = [
  "Your company card at the top of the list, right behind the Featured events, labelled \"Sponsor\", for installers whose areas are in the map view",
  "How many times the card was shown and tapped, in your dashboard",
];

export function sponsorCopy(k) {
  return k === "banner_top"
    ? { name: "Banner and top of the list", unit: "per season", bullets: [...BANNER, ...TOP], blurb: "Your name and phone in the labelled Sponsor banner at the top of the map list, and your company card at the top of the list behind the Featured events." }
    : { name: "Banner", unit: "per season", bullets: BANNER, blurb: "Your name (linked to your website or email) and phone number in the labelled Sponsor banner at the top of the list on the map, whenever your service area is in the map view." };
}

export const money = (cents) => "$" + (cents % 100 ? (cents / 100).toFixed(2) : cents / 100);
export const niceDate = (ymd) => new Date(ymd + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// The rule in plain words. s = config.installerSeason, cfg = /api/config.
export function seasonRule(cfg) {
  const s = cfg.installerSeason || {}, n = cfg.installerFullPriceDays || 14, floor = money(cfg.installerMinCents || 1000);
  const rule = `A season runs from the day you pay to the last day of the season on the map. With ${n} or more days left you pay the full price; with fewer days left you pay a share of it for the days remaining (never less than ${floor}). The placement always ends on the season's last day.`;
  const now = s.season ? (s.prorated
    ? `Right now: only ${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"} are left in the ${s.season} season (it ends ${niceDate(s.to)}), so a new placement costs ${money(s.cents.banner)} for the Banner or ${money(s.cents.banner_top)} for Banner and top of the list, instead of ${money(cfg.installerPlans.banner.cents)} or ${money(cfg.installerPlans.banner_top.cents)}.`
    : `Right now: a new placement runs to ${niceDate(s.to)}, the end of the ${s.season} season.`) : "";
  return { rule, now };
}
