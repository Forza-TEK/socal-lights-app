// Contest pass wording shared by /pricing, the contest wizard, /contest-pass and the confirmation email (functions/_lib/passmail.js).
// Prices, caps and the window rule come from the server (/api/config contestPasses; functions/_lib/passes.js is the only place a price is set). Nothing here holds a price.
// Each pass lists its contents in full. Never write "Everything in ..." or "Everything above".
export const PASS_KEYS = ["pass_5", "pass_10", "pass_20"];
export const INFO_EMAIL = "info@socallights.app";
export const dollars = (cents) => "$" + (cents % 100 ? (cents / 100).toFixed(2) : cents / 100);
export const niceDate = (s) => (s ? new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");
export const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// What every contest includes, whatever the pass.
export const CONTEST_CONTENTS = [
  "Resident entries with photos, approved by you",
  "Voting by the public, by judges you invite, or both",
  "People's Choice and Judges' Choice awards",
  "Your own contest page, link, QR code and printable poster",
  "An organizer dashboard: approve entries, announce winners, export the results",
];
export const FAIR = "Entering and voting stay free for everyone. Payment never affects any result, vote, judge or ranking.";
export const WINDOW_RULE = "Your 12-month window starts the day your first contest goes live. A contest counts when it goes live: drafts, contests held for review and contests that were never live do not count. When the window ends, your next contest starts a new window and is free again.";

// Name, unit and the full bullet list of a pass. `free` is how many contests are free (cfg.contestPasses.free), cap the pass's total.
export function passCopy(k, cfg) {
  const c = (cfg && cfg.contestPasses) || {}, p = (c.plans || {})[k] || {}, free = c.free || 1, cap = p.cap || 0;
  return {
    name: p.label || k, unit: "per 12-month window",
    bullets: [`${cap} contests in your 12-month window in total: your free first contest plus ${cap - free} more`, ...CONTEST_CONTENTS, ...(k === PASS_KEYS[PASS_KEYS.length - 1] ? [`More than ${cap} contests: write to ${INFO_EMAIL}`] : ["Upgrade any time inside the window and pay only the difference"]), FAIR],
  };
}
export function freeCopy(cfg) {
  const free = ((cfg && cfg.contestPasses) || {}).free || 1;
  return { name: "Free", unit: "1 contest per 12 months", bullets: [`${free} contest in every 12-month window, for each organization`, ...CONTEST_CONTENTS, FAIR] };
}
export const moreCopy = () => ({ name: "More than 20 contests", bullets: ["For cities and organizations that run more than 20 contests in a 12-month window", "We set it up with you: write to " + INFO_EMAIL] });
export const contactHref = (subject = "Contest passes: more than 20 contests") => `mailto:${INFO_EMAIL}?subject=${encodeURIComponent(subject)}`;

// The pass picker shown when a contest would go over the allowance (the 402 answer of POST /api/contests, or GET /api/contest-pass/entitlement).
// v: the entitlement view. Choose buttons carry data-pass. Prices shown are what THIS organization pays (the difference when it already holds a pass).
export function pickerHtml(v, cfg) {
  if (!v) return "";
  const used = `${v.used} of ${v.unlimited ? "unlimited" : v.cap} contest${v.cap === 1 ? "" : "s"} used`;
  const win = v.active ? `Your 12-month window runs ${niceDate(v.windowStart)} to ${niceDate(v.windowEnd)}. ${used} so far.` : "Your next contest starts a new 12-month window and is free.";
  if (v.comp && v.canCreate) return `<div class="pp"><p class="pp-comp"><b>Founding partner: ${v.comp.unlimited ? "free through " : "your free contest is available through "}${esc(niceDate(v.comp.until))}.</b></p><p class="pp-win">${esc(win)}</p></div>`;
  const cards = (v.offers || []).map((o) => { const c = passCopy(o.key, cfg); return `<div class="pp-card"><h3>${esc(c.name)}</h3><p class="pp-price"><b>${dollars(o.pay)}</b> <small>${o.upgrade ? "to upgrade (the difference from what you already have)" : c.unit}</small></p><p class="pp-inc">Includes:</p><ul>${c.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul><button class="btn pp-choose" type="button" data-pass="${esc(o.key)}" aria-label="Choose ${esc(c.name)}, ${dollars(o.pay)}">Choose</button></div>`; }).join("");
  const more = v.contact || !(v.offers || []).length ? `<div class="pp-card"><h3>${esc(moreCopy().name)}</h3><ul>${moreCopy().bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul><a class="btn out pp-choose" href="${esc(contactHref())}" data-pass-contact>Contact us</a></div>` : "";
  return `<div class="pp"><p class="pp-win">${esc(win)}</p><p class="pp-org">Organization: <b>${esc(v.org)}</b></p><div class="pp-grid">${cards}${more}</div><p class="pp-note">${esc(WINDOW_RULE)} ${esc(FAIR)}</p></div>`;
}

// One number (no person) for the funnel counters; skipped for automated browsers.
export function beacon(k) { try { if (!navigator.webdriver) navigator.sendBeacon("/api/visit", new Blob([JSON.stringify({ k })], { type: "application/json" })); } catch {} }
