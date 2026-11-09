// Contest pass wording shared by /pricing, the contest wizard, /contest-pass and the confirmation email (functions/_lib/passmail.js).
// Prices, caps and the window rule come from the server (/api/config contestPasses; functions/_lib/passes.js is the only place a price is set). Nothing here holds a price.
// Each pass lists its contents in full. Never write "Everything in ..." or "Everything above".
export const PASS_KEYS = ["pass_1", "pass_5", "pass_20"]; // the passes on offer, in order (pass_10 is retired)
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
export const WINDOW_RULE = "Your 12-month window starts the day you buy your pass, or the day your first contest goes live if that comes first. A contest counts when it goes live: drafts, contests held for review and contests that were never live do not count. When the window ends, your next contest needs a new pass.";

// How many contests a pass covers, in words. cap 1 is a single contest.
export const capLine = (cap) => (cap === 1 ? "1 contest in your 12-month window" : `Up to ${cap} contests in your 12-month window in total`);
// Name, unit and the full bullet list of a pass. cap is the pass's total.
export function passCopy(k, cfg) {
  const c = (cfg && cfg.contestPasses) || {}, p = (c.plans || {})[k] || {}, cap = p.cap || 0;
  return {
    name: p.label || k, unit: cap === 1 ? "one contest" : "per 12-month window",
    bullets: [capLine(cap), ...CONTEST_CONTENTS, ...(k === PASS_KEYS[PASS_KEYS.length - 1] ? [`More than ${cap} contests: write to ${INFO_EMAIL}`] : ["Upgrade any time inside the window and pay only the difference"]), FAIR],
  };
}
export const moreCopy = () => ({ name: "More than 20 contests", bullets: ["For cities and organizations that run more than 20 contests in a 12-month window", "We set it up with you: write to " + INFO_EMAIL] });
export const contactHref = (subject = "Contest passes: more than 20 contests") => `mailto:${INFO_EMAIL}?subject=${encodeURIComponent(subject)}`;

// The pass picker shown when a contest would go over the allowance (the 402 answer of POST /api/contests, or GET /api/contest-pass/entitlement).
// v: the entitlement view. Choose buttons carry data-pass. Prices shown are what THIS organization pays (the difference when it already holds a pass).
export function pickerHtml(v, cfg) {
  if (!v) return "";
  const used = `${v.used} of ${v.unlimited ? "unlimited" : v.cap} contest${v.cap === 1 ? "" : "s"} used`;
  const win = v.active ? `Your 12-month window runs ${niceDate(v.windowStart)} to ${niceDate(v.windowEnd)}. ${used} so far.` : "You have no pass running. Choose one to start your contest.";
  if (v.comp && v.canCreate) return `<div class="pp"><p class="pp-comp"><b>Founding partner: ${v.comp.unlimited ? "free through " : "your free contest is available through "}${esc(niceDate(v.comp.until))}.</b></p><p class="pp-win">${esc(win)}</p></div>`;
  const cards = (v.offers || []).map((o) => { const c = passCopy(o.key, cfg); return `<div class="pp-card"><h3>${esc(c.name)}</h3><p class="pp-price"><b>${dollars(o.pay)}</b> <small>${o.upgrade ? "to upgrade (the difference from what you already have)" : c.unit}</small></p><p class="pp-inc">Includes:</p><ul>${c.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul><button class="btn pp-choose" type="button" data-pass="${esc(o.key)}" aria-label="Choose ${esc(c.name)}, ${dollars(o.pay)}">Choose</button></div>`; }).join("");
  const more = v.contact || !(v.offers || []).length ? `<div class="pp-card"><h3>${esc(moreCopy().name)}</h3><ul>${moreCopy().bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul><a class="btn out pp-choose" href="${esc(contactHref())}" data-pass-contact>Contact us</a></div>` : "";
  return `<div class="pp"><p class="pp-win">${esc(win)}</p><p class="pp-org">Organization: <b>${esc(v.org)}</b></p><div class="pp-grid">${cards}${more}</div><p class="pp-note">${esc(WINDOW_RULE)} ${esc(FAIR)}</p></div>`;
}

// ---- Inside the store apps (Capacitor wrappers whose browser string has "SoCalLightsApp"): no payment and no price. Apple and Google want in-app purchase for digital goods
// (docs/app-store.md), so the app never shows a pass price or opens Stripe. The organizer continues on socallights.app in the system browser, buys the pass there, and comes back.
export const IN_APP = typeof navigator !== "undefined" && /SoCalLightsApp/.test(navigator.userAgent);
export const passPageUrl = (site) => "https://socallights.app/contest-pass" + (site ? "?site=" + encodeURIComponent(site) : "");
// Opens a page in the system browser: the Capacitor Browser plugin when the app has it, otherwise a new window.
export function openWeb(url) { try { const B = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser; if (B && B.open) { B.open({ url }); return; } } catch {} window.open(url, "_blank", "noopener"); }
// What the app shows instead of the pass picker. No price, no Choose button, no checkout. v: the entitlement view; email: the signed-in account; site: the contest website typed in the wizard.
export function appPassHtml(v, email, site) {
  const who = email ? `Sign in there with the same email, <b>${esc(email)}</b>, so the pass goes to your organization.` : "Sign in there with the same email you use here, so the pass goes to your organization.";
  return `<div class="pp pp-app"><p><b>Running this contest needs a contest pass.</b> Passes are bought on our website, in your browser, not inside the app.</p><ol><li>Tap <b>Continue on socallights.app</b>. ${who}</li><li>Choose a pass there.</li><li>Come back to the app and tap <b>I have my pass</b>. Your contest details are kept here, and your contest is created.</li></ol><p><a class="btn" href="${esc(passPageUrl(site))}" data-pass-web target="_blank" rel="noopener">Continue on socallights.app</a> <button class="btn out" type="button" data-pass-check>I have my pass</button></p><p class="pp-org">Organization: <b>${esc((v && v.org) || "")}</b></p><p class="pp-note">${esc(FAIR)}</p></div>`;
}

// One number (no person) for the funnel counters; skipped for automated browsers.
export function beacon(k) { try { if (!navigator.webdriver) navigator.sendBeacon("/api/visit", new Blob([JSON.stringify({ k })], { type: "application/json" })); } catch {} }
