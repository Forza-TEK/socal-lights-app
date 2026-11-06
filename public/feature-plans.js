// Featured plan wording and the date rules the pages show, shared by /feature, /pricing and the add-event plan step (and the confirmation email).
// Prices, levels and the quotes (dates and what an upgrade costs) come from the server (/api/config, /api/me/featurable, /api/feature/quote; functions/_lib/featured.js is the only
// place a price is set); nothing here holds a price. The server enforces every rule again. Each plan lists everything it includes in full. Never write "Everything in ..." or "Everything above".

// ---- Event organizers: four paid tiers made of components (pin always, banner, top of the list) ----
export const EVENT_KEYS = ["ev_pin", "ev_banner", "ev_top", "ev_all"];
export const PLAN_KEYS = EVENT_KEYS; // what the plan pickers list for an event
const TIER_NAME = { ev_pin: "Featured pin", ev_banner: "Banner + Featured pin", ev_top: "Top of the list + Featured pin", ev_all: "Top of the list + Banner + Featured pin" };
const PIN = ["A gold-ringed pin on the map", `A "Featured" badge on your event in the list and in its details`];
const BANNER = [
  `Your event as a pill labelled "Featured" in the strip at the top of the map list, with its name, city and dates; tap it to open your event`,
  "The pill shows whenever your event is in the map view",
  "How many times your banner was shown and tapped, on your Feature page",
];
const TOP = ["Your event is listed first when people browse your area"];
export const RUNS = "Runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first";

// Name, price unit and the full bullet list of an event tier. No prices in the wording.
export function eventTierCopy(k) {
  const p = { ev_pin: [...PIN], ev_banner: [...PIN, ...BANNER], ev_top: [...PIN, ...TOP], ev_all: [...PIN, ...BANNER, ...TOP] }[k] || [];
  return { name: TIER_NAME[k] || k, unit: "per season", bullets: [...p, RUNS] };
}
export function eventTierBlurb(k) {
  return {
    ev_pin: `A gold-ringed pin on the map and a "Featured" badge on your event.`,
    ev_banner: `The pin and badge, plus your event as a "Featured" pill in the strip at the top of the map list.`,
    ev_top: `The pin and badge, plus your event is listed first when people browse your area.`,
    ev_all: `The pin and badge, the "Featured" pill in the strip at the top of the map list, and your event listed first when people browse your area.`,
  }[k] || "";
}
export const COMPONENT_WORD = { pin: "the Featured pin", banner: "the banner", top: "top of the list" };

// The rule in plain words, with exact dates. cfg: /api/config (installerSeason = the season a purchase today falls in).
export function eventRule(cfg, money) {
  const s = (cfg && cfg.installerSeason) || {}, c = (cfg && cfg.eventComponentCents) || {};
  const rule = `A placement runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first. The price is the same whenever you start. Buying opens ${(cfg && cfg.featureOpenDays) || 30} days before your event starts.`;
  const now = s.season ? ` Right now the ${s.season} season ends on ${niceDate(s.to)}.` : "";
  const up = c.pin ? ` Each part is ${money(c.pin)}: add the banner or top of the list to a placement you already have and you pay ${money(c.banner || c.pin)} for each part you add.` : "";
  return { rule, now, up };
}

// ---- Homes: the old 30-day plans, unchanged (a home that finished 1st, 2nd or 3rd in an announced contest) ----
const NAME = { pin: "Featured pin", top: "Top of the list" };
// Name, price unit and bullets for a HOME plan (k: "pin" or "top"). PL: /api/config featurePlans.
export function planCopy(k, PL, who = "home") {
  const p = PL[k] || {}, thing = who === "home" ? "home" : "event";
  const bullets = ["A gold-ringed pin on the map", `A "Featured" badge on your ${thing} in the list and its details`];
  if (k !== "pin") bullets.push(`Your ${thing} is listed first when people browse your area`);
  bullets.push(`Runs for ${p.days || 30} days from today`);
  return { name: NAME[k], unit: `${p.days || 30} days`, sub: "", bullets };
}
export function planBlurb(k, PL, who = "home") {
  const thing = who === "home" ? "home" : "event";
  return { pin: `A gold-ringed pin on the map and a Featured badge on your ${thing}.`, top: `The pin and badge, plus your ${thing} is listed first when people browse your area.` }[k] || "";
}

export const ptToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
export const plusDays = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const niceDate = (s) => new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const nice = niceDate;

// Home plans: can this home buy plan k, and what should its card say?
export function planStatus(k, x, PL, open = 30, today = ptToday()) {
  const p = PL[k];
  if (!p || !x) return { ok: true, note: "" };
  const cap = p.days || 30;
  return { ok: true, note: `Runs until ${nice(plusDays(today, cap))}` };
}
// The exact dates a home plan gives a home bought today.
export function planWindow(k, x, PL, today = ptToday()) {
  const p = PL[k] || {}, cap = p.days || 30, until = plusDays(today, cap);
  return { from: today, until, days: cap, capped: true };
}

// Can this event be featured at all today? x: { state }, quotes: the server's per-plan quotes for this event. Returns { ok, plans: [keys it can buy], reason }.
const WHY = { ended: "This event has ended.", declined: "We could not list this event, so it cannot be featured.", cancelled: "This event is cancelled.", postponed: "This event is postponed. Come back when it has new dates.", "claim-pending": "Your claim is waiting for approval. Once it is approved you can feature it.", review: "Waiting for a quick check before it can be featured." };
export function eventEligibility(x, quotes) {
  if (WHY[x.state]) return { ok: false, plans: [], reason: WHY[x.state] };
  const q = quotes || {}, plans = EVENT_KEYS.filter((k) => q[k] && !q[k].problem);
  if (plans.length) return { ok: true, plans, reason: "" };
  const first = EVENT_KEYS.map((k) => q[k] && q[k].problem).find(Boolean);
  return { ok: false, plans: [], reason: first || "This event cannot be featured right now." };
}
// One line about what a quote means: what it adds (and so what is charged), and the exact end date.
export function quoteLine(q, money) {
  const adds = q.added || [], all = q.components || [];
  return { adds: adds.map((c) => COMPONENT_WORD[c]), price: money(q.cents), ends: niceDate(q.to), endsBy: q.capped === "event" ? "your event's last day" : `the end of the ${q.season} season`, partial: all.length ? adds.length < all.length : false };
}
