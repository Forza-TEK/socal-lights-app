// Featured plan wording and the date rules the pages show, shared by /feature, /pricing and the add-event plan step.
// Prices, levels and day limits come from /api/config (functions/_lib/featured.js, the only place they are set); the server enforces every rule again.
// Each plan lists everything it includes in full. Never write "Everything in ..." or "Everything above".
export const PLAN_KEYS = ["pin", "top", "season"]; // "season" is the stored plan key; people see it as "Full run"
const NAME = { pin: "Featured pin", top: "Top of the list", season: "Full run" };

// Name, price unit and bullets for a plan. who: "event" or "home".
export function planCopy(k, PL, who = "event") {
  const p = PL[k] || {}, home = who === "home", thing = home ? "home" : "event", cap = p.maxDays || p.days || 30;
  const bullets = ["A gold-ringed pin on the map", `A "Featured" badge on your ${thing} in the list and its details`];
  if (k !== "pin") bullets.push(`Your ${thing} is listed first when people browse your area`);
  bullets.push(home ? `Runs for ${p.days || 30} days from today` : `Runs from today until your event's last day, up to ${cap} days`);
  return { name: NAME[k], unit: home ? `${p.days || 30} days` : `up to ${cap} days`, sub: k === "season" ? "For events that run 31 days or more" : "", bullets };
}

// One plain sentence per plan, shown on both /pricing and /feature so the cards read the same.
export function planBlurb(k, PL, who = "event") {
  const thing = who === "home" ? "home" : "event", p = PL[k] || {};
  return { pin: `A gold-ringed pin on the map and a Featured badge on your ${thing}.`, top: `The pin and badge, plus your ${thing} is listed first when people browse your area.`, season: `The same as Top of the list, for events that run 31 days or more, for up to ${p.maxDays || 90} days.` }[k] || "";
}

export const ptToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
export const plusDays = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const nice = (s) => new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const span = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400_000) + 1;

// Can this event or home buy plan k today, and what should its card say? x: { start, end, home }. open: days before the start that featuring opens.
export function planStatus(k, x, PL, open = 30, today = ptToday()) {
  const p = PL[k];
  if (!p || !x) return { ok: true, note: "" };
  const cap = p.maxDays || p.days || 30;
  if (x.home) return k === "season" ? { ok: false, note: "Not available for homes: a home is featured for 30 days." } : { ok: true, note: `Runs until ${nice(plusDays(today, cap))}` };
  if (x.start && x.start > plusDays(today, open)) return { ok: false, note: `Featuring opens ${open} days before your event: come back on ${nice(plusDays(x.start, -open))}.` };
  if (x.end && x.end < today) return { ok: false, note: "This event has ended." };
  if (p.minLength && x.start && x.end && span(x.start, x.end) < p.minLength) return { ok: false, note: `Full run is for events that run ${p.minLength} days or more. This one runs ${span(x.start, x.end)}.` };
  if (p.minDays && x.end && x.end < plusDays(today, p.minDays)) return { ok: false, note: `Not available: this event ends ${nice(x.end)}, with less than ${p.minDays} days left.` };
  if (!x.end) return { ok: true, note: "" };
  const lim = plusDays(today, cap), until = x.end < lim ? x.end : lim;
  return { ok: true, note: `Runs until ${nice(until)}${until === x.end ? ", your event's last day" : `, ${cap} days from today`}` };
}
