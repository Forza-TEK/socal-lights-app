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

// The rule in plain words. A plan costs the same whenever it is bought during a season, and runs until the season's last day (the number of days is always shown).
export const dayWord = (n) => `${n} day${n === 1 ? "" : "s"}`;
export function runsText(q) { return `Runs from ${niceDate(q.from)} until ${niceDate(q.to)}, the end of the ${q.season} season (${dayWord(q.days)}, counting the first day). The price is the same whenever you start.`; }
export function seasonRule(cfg) {
  const s = cfg.installerSeason || {};
  const rule = "A season runs from the day you pay to the last day of the season on the map. The price is the same whenever you start, and the placement always ends on the season's last day, so check the end date before you pay. We do not refund or credit for timing.";
  const now = s.season ? `Right now a new placement runs from today until ${niceDate(s.to)}, the end of the ${s.season} season (${dayWord(s.days)}, counting today).` : "";
  return { rule, now };
}
