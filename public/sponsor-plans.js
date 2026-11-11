// Installer Sponsor plan wording, shared by /pricing and /sponsor. Prices, the season dates and the proration come from /api/config and /api/me/sponsor
// (functions/_lib/featured.js and sponsor.js are the only places they are set); nothing here holds a price. Every plan lists what it includes in full:
// never write "Everything in ..." or "Everything above".
export const SPONSOR_KEYS = ["banner", "top", "banner_top"]; // banner = the strip, top = the company card at the top of the list (no banner), banner_top = both

const BANNER = [
  "Your company name, linked to your website (or to your email if you have no website), in the labeled \"Sponsor\" banner at the top of the list on the map",
  "Your phone number in that banner, tap to call",
  "Shown whenever your areas served are in the map view (everywhere if you list none)",
  "Always labeled \"Sponsor\", so nobody is misled",
  "How many times you were shown and tapped, in your dashboard",
];
const TOP = [
  "Your company card at the top of the list, right behind the Featured events, labeled \"Sponsor\", for installers whose areas are in the map view",
  "Your company name, a short description, and buttons to call, visit your website (or email) and open your profile, on that card",
  "How many times the card was shown and tapped, in your dashboard",
];
// Both together: every line of each, listed once (the labelling and the dashboard counts apply to both).
const BOTH = [BANNER[0], BANNER[1], BANNER[2], TOP[0], TOP[1], "Always labeled \"Sponsor\", so nobody is misled", "How many times the banner and the card were shown and tapped, in your dashboard"];

export function sponsorCopy(k) {
  if (k === "banner_top") return { name: "Banner and top of the list", unit: "per season", bullets: BOTH, blurb: "Your name and phone in the labeled Sponsor banner at the top of the map list, and your company card at the top of the list behind the Featured events." };
  if (k === "top") return { name: "Top of the list", unit: "per season", bullets: [...TOP, "Always labeled \"Sponsor\", so nobody is misled", "Not in the banner strip: for the banner as well, choose Banner and top of the list"], blurb: "Your company card at the top of the map list, behind the Featured events, labeled Sponsor. Without the banner." };
  return { name: "Banner", unit: "per season", bullets: BANNER, blurb: "Your name (linked to your website or email) and phone number in the labeled Sponsor banner at the top of the list on the map, whenever your service area is in the map view." };
}

export const money = (cents) => "$" + (cents % 100 ? (cents / 100).toFixed(2) : cents / 100);
export const niceDate = (ymd) => new Date(ymd + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// The rule in plain words. A plan costs the same whenever it is bought during a season, and runs until the season's last day (the number of days is always shown).
export const dayWord = (n) => `${n} day${n === 1 ? "" : "s"}`;
export function runsText(q) { return `Runs from ${niceDate(q.from)} until ${niceDate(q.to)}, the end of the ${q.season} season (${dayWord(q.days)}, counting the first day). The price is the same whenever you start.`; }
export function seasonRule(cfg) {
  const s = cfg.installerSeason || {};
  const rule = "A placement runs from the moment you pay to the last day of the season on the map (Christmas lights: Jan 6). The price is the same whenever you start, and the placement always ends on the season's last day, so check the end date before you pay. We do not refund or credit for timing.";
  const now = s.season ? `Right now a new placement runs from today until ${niceDate(s.to)}, the end of the ${s.season} season (${dayWord(s.days)}, counting today).` : "";
  return { rule, now };
}

// The wording next to the (unticked-by-default) automatic renewal box. cfg = /api/config; the text and its version are set once in functions/_lib/renewal.js and stored with the buyer's consent.
export const renewalText = (cfg, cents) => ((cfg.installerRenewal && cfg.installerRenewal.text) || "").replace("{price}", money(cents));
