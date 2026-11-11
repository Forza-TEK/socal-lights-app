import { applyPassOrder, revokePass, isPassOrder } from "./passes.js";
import { applyPartnerOrder, revokePartner, isPartnerOrder, EVENT_PARTNER, PUBLIC_EVENT_PARTNER } from "./partner.js";
import { applyInstallerOrder, revokeInstaller, seasonOf } from "./sponsor.js";
import { ptToday } from "./time.js";
// PRICING (owner decision 2026-11-06). Every price is a constant in this file and nowhere else (/api/config serves them to the pages).
//
// EVENT ORGANIZERS: listing is free. Paid tiers are ADDITIVE components, each COMPONENT_CENTS: the Featured pin (always included in any paid tier), the banner and the top of the list.
//   ev_pin = pin | ev_banner = pin + banner | ev_top = pin + top of the list | ev_all = pin + banner + top of the list.
//   Component meaning: pin = events.featured level 1 (gold-ringed pin and Featured badge); top = level 2 (listed first when people browse the area); banner = the event is a pill
//   in the labeled strip at the top of the map list (events.banner_until; the pill reads "Featured").
//   WINDOW (flat price, no proration, the installers' philosophy): starts at payment and ends on the event's last day (end_date as stored), capped at the last day of the sponsor season that
//   contains the payment day (seasonOf in sponsor.js; Christmas lights ends Jan 6). Buying opens OPEN_DAYS before the event starts. The quote (dates and price) is locked at checkout (eventQuote).
//   UPGRADES cost COMPONENT_CENTS per component the event does not already hold for the whole window; a purchase that adds nothing new is refused (400).
// The OLD event keys pin / top / season (PLANS below) are never offered for events any more. They stay so orders already paid or in flight keep working (amount checks, refunds, restore).
// HOMES keep their own 30-day plans, unchanged: PLANS.pin $10 and PLANS.top $15, podium finishers of an announced contest only (HOME_PLANS in podium.js).
// EVENT PARTNER ($149 a season, up to 10 events, the Featured pin on each): its price and cap are in partner.js (a small module imported here) and re-exported below.
export { EVENT_PARTNER, PUBLIC_EVENT_PARTNER };
export const OPEN_DAYS = 30;
export const LEGACY_SEASON_CENTS = 2000; // the old "Whole season" price: a paid or in-flight order at this amount is grandfathered (no 90-day cap, no amount-mismatch flag)
export const PLANS = {
  pin: { label: "Featured pin", cents: 1000, level: 1, days: 30 },
  top: { label: "Top of the list", cents: 1500, level: 2, days: 30 },
  season: { label: "Full run", cents: 2500, level: 2, days: 0, maxDays: 90, minLength: 31, minDays: 7 },
};
export const HOME_PLAN_KEYS = ["pin", "top"]; // what a home can buy (podium.js HOME_PLANS)
export const COMPONENT_CENTS = { pin: 2500, banner: 2500, top: 2500 };
const evPlan = (label, banner, top) => ({ label, banner, top, level: top ? 2 : 1, cents: COMPONENT_CENTS.pin + (banner ? COMPONENT_CENTS.banner : 0) + (top ? COMPONENT_CENTS.top : 0) });
export const EVENT_PLANS = {
  ev_pin: evPlan("Featured pin", false, false),
  ev_banner: evPlan("Banner + Featured pin", true, false),
  ev_top: evPlan("Top of the list + Featured pin", false, true),
  ev_all: evPlan("Top of the list + Banner + Featured pin", true, true),
};
export const EVENT_PLAN_KEYS = Object.keys(EVENT_PLANS);
export const isEventTier = (plan) => !!EVENT_PLANS[plan];
// The components a plan contains, in display order.
export const componentsOf = (p) => ["pin", ...(p.banner ? ["banner"] : []), ...(p.top ? ["top"] : [])];

// Installer placements. Prices in cents; they exist only here (/api/config serves them).
// banner = the labeled Sponsor strip; top = the company card at the top of the list. Three products: banner ($50), top ($50, WITHOUT the banner) and banner_top ($75, both).
// Rules (season length, stacking, renewal, upgrade) are in sponsor.js. The stored plan keys are "banner", "top" and "banner_top", on feature_orders rows with target = 'installer'.
export const INSTALLER_PLANS = {
  banner: { label: "Banner", cents: 5000, banner: true, top: false },
  top: { label: "Top of the list", cents: 5000, banner: false, top: true },
  banner_top: { label: "Banner and top of the list", cents: 7500, banner: true, top: true },
};
// PRICE (owner decision): no proration. A plan costs its price above whenever it is bought during a season, and the placement runs until the season's last day.
// An upgrade (Banner -> both, or Top -> both, while the held one already runs to the season end) costs the difference between the target's price and the held tier's price; see sponsor.js.
export const PUBLIC_INSTALLER_PLANS = Object.fromEntries(Object.entries(INSTALLER_PLANS).map(([k, p]) => [k, { label: p.label, cents: p.cents, banner: p.banner, top: p.top }]));
export const PUBLIC_EVENT_PLANS = Object.fromEntries(Object.entries(EVENT_PLANS).map(([k, p]) => [k, { label: p.label, cents: p.cents, level: p.level, banner: p.banner, top: p.top, components: componentsOf(p) }]));
export const PUBLIC_COMPONENT_CENTS = { ...COMPONENT_CENTS };

// What the browser may know about plans (served by /api/config). Prices exist only in PLANS above.
// Only the home plans are public: the old event keys are not offered any more (EVENT_PLANS are served as eventPlans).
export const PUBLIC_PLANS = Object.fromEntries(Object.entries(PLANS).filter(([k]) => HOME_PLAN_KEYS.includes(k)).map(([k, p]) => [k, { label: p.label, cents: p.cents, days: p.days, level: p.level, minDays: p.minDays || 0, minLength: p.minLength || 0, maxDays: p.maxDays || p.days }]));

export const addDays = (ymd, n) => new Date(Date.parse(ymd + "T00:00:00Z") + n * 86400_000).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400_000);

// Why an event cannot buy this plan today, or "" when it can. ev: { start_date, end_date }. Checked by checkout (and mirrored in the pages).
export function eventPlanProblem(ev, plan, today) {
  const p = PLANS[plan];
  if (ev.start_date && ev.start_date > addDays(today, OPEN_DAYS)) return `Featuring opens ${OPEN_DAYS} days before your event: come back on ${addDays(ev.start_date, -OPEN_DAYS)}.`;
  if (p.minLength && ev.start_date && daysBetween(ev.start_date, ev.end_date) + 1 < p.minLength) return `The ${p.label} plan is for events that run ${p.minLength} days or more. This one runs ${daysBetween(ev.start_date, ev.end_date) + 1}. The featured pin or top of the list fits better.`;
  if (p.minDays && ev.end_date < addDays(today, p.minDays)) return `This event ends on ${ev.end_date}, too soon for the ${p.label} plan (it needs at least ${p.minDays} days left). The featured pin or top of the list is a better fit.`;
  return "";
}

// New featured/featured_until for a target after a paid plan. Extending a running placement never shortens it; the level never goes down.
// Event: until = min(end_date, today + cap), at least today. Buying again therefore adds time only while the cap (not the event's last day) is what limits it.
// opts.home: a home (no end date): days from payment, added on top of a running placement. opts.legacy: an old $20 whole-season order: until the event's last day, no cap.
export function applyPlan(ev, plan, today, opts = {}) {
  const p = PLANS[plan];
  const running = ev.featured && (!ev.featured_until || ev.featured_until >= today);
  const level = Math.max(p.level, running ? ev.featured : 0);
  let until;
  if (opts.home) until = addDays(running && ev.featured_until && ev.featured_until > today ? ev.featured_until : today, p.days);
  else {
    const cap = opts.legacy ? ev.end_date : addDays(today, p.days || p.maxDays);
    until = ev.end_date < cap ? ev.end_date : cap;
    if (until < today) until = today; // an event that ended in the meantime: through today only
    if (running && ev.featured_until && ev.featured_until > until) until = ev.featured_until; // never shorten
  }
  return { featured: level, featured_until: until };
}

// ---- The new event tiers (EVENT_PLANS) ----
// Which components an event holds right now, and until when ("" = not held; FOREVER = a hand-set placement with no end date). ev: { featured, featured_until, banner_until }.
export const FOREVER = "9999-12-31";
export function heldComponents(ev, today) {
  const running = !!ev.featured && (!ev.featured_until || ev.featured_until >= today), until = running ? ev.featured_until || FOREVER : "";
  return { pin: running ? until : "", top: running && ev.featured >= 2 ? until : "", banner: ev.banner_until && ev.banner_until >= today ? ev.banner_until : "" };
}
const COMP_WORD = { pin: "the Featured pin", banner: "the banner", top: "top of the list" };
// What an event pays and gets for a tier bought today. ev: { start_date, end_date, featured, featured_until, banner_until }.
// Returns { plan, label, from, to, season, capped ("event" | "season"), days, cents, components, added (the components this purchase adds), problem ("" when it can be bought) }.
// The price is COMPONENT_CENTS for each component the event does not already hold for the whole window; flat, no proration.
export function eventQuote(ev, plan, today) {
  const p = EVENT_PLANS[plan];
  if (!p) return { plan, problem: "Choose a plan." };
  const season = seasonOf(today), to = ev.end_date && ev.end_date < season.end ? ev.end_date : season.end, capped = to === ev.end_date ? "event" : "season";
  const comps = componentsOf(p), held = heldComponents(ev, today), added = comps.filter((c) => !(held[c] && held[c] >= to));
  const q = { plan, label: p.label, from: today, to, season: season.label, season_end: season.end, capped, days: daysBetween(today, to) + 1, components: comps, added, cents: added.reduce((n, c) => n + COMPONENT_CENTS[c], 0), problem: "" };
  if (ev.start_date && ev.start_date > addDays(today, OPEN_DAYS)) q.problem = `Featuring opens ${OPEN_DAYS} days before your event: come back on ${addDays(ev.start_date, -OPEN_DAYS)}.`;
  else if (ev.end_date && ev.end_date < today) q.problem = "That event has already ended.";
  else if (!added.length) {
    const list = comps.map((c) => COMP_WORD[c]);
    q.problem = `Nothing to add: this event already has ${list.length > 1 ? list.slice(0, -1).join(", ") + " and " + list[list.length - 1] : list[0]} through ${to}, as far as this plan reaches (your event's last day or the end of the ${season.label} season, whichever comes first).`;
  }
  return q;
}

// The placement an event reads after a paid tier. Never shorter than before, the level never goes down. `to` is the quoted last day, already capped by the caller.
export function applyEventTier(ev, plan, today, to) {
  const p = EVENT_PLANS[plan], running = !!ev.featured && (!ev.featured_until || ev.featured_until >= today), end = to < today ? today : to;
  const level = Math.max(p.level, running ? ev.featured : 0);
  let until = end;
  if (running && !ev.featured_until) until = null; // a hand-set placement with no end date keeps it
  else if (running && ev.featured_until > until) until = ev.featured_until;
  const bu = ev.banner_until && ev.banner_until >= today ? ev.banner_until : "";
  return { featured: level, featured_until: until, banner_until: p.banner ? (bu > end ? bu : end) : ev.banner_until || null };
}
// The last day a tier order is applied to: the quoted day, never past the event's last day (the organizer may have shortened it), never before today.
export const tierEnd = (order, endDate, today) => { const q = order.quote_to || "", to = q && q < endDate ? q : endDate; return to < today ? today : to; };

// Verifies a Stripe webhook signature header ("t=...,v1=...") over the raw body with the endpoint's signing secret.
export async function verifyStripeSignature(raw, header, secret, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => { const i = kv.indexOf("="); return [kv.slice(0, i).trim(), kv.slice(i + 1)]; }));
  const t = Number(parts.t);
  const sigs = header.split(",").filter((kv) => kv.trim().startsWith("v1=")).map((kv) => kv.trim().slice(3));
  if (!t || !sigs.length || Math.abs(nowSec - t) > toleranceSec) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  const eq = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
  return sigs.some((s) => eq(s, hex));
}

// The Pacific calendar date (YYYY-MM-DD), real time zone rules (daylight saving included). One helper for everything that is sold or shown by date; uses Date.now() so tests can freeze it.
export { ptToday }; // lives in time.js; re-exported so existing imports keep working
// Order notes that begin with this mark are "needs a look" for the owner (Admin > Orders). Writing a note of your own there clears them.
export const AUTO = "[auto] ";
export const setOrderNote = (db, sessionId, text) => db.prepare("UPDATE feature_orders SET note = ? WHERE session_id = ?").bind(String(text).slice(0, 500), sessionId).run();

// Applies one paid, unapplied order to a live event. Both statements only act while the order is still unapplied, so a concurrent
// retry cannot extend the placement twice. Returns the new placement, or null when the event does not exist.
// A home order (order.target = 'home') applies to the posts row the same way; only 30-day plans exist for homes.
export const isHomeOrder = (o) => !!o && o.target === "home";
export const isInstallerOrder = (o) => !!o && o.target === "installer";
export async function applyOrder(db, order, targetId, today = ptToday()) {
  if (isPartnerOrder(order)) return applyPartnerOrder(db, order); // an Event Partner plan: an organization key, not an event (partner.js)
  if (isPassOrder(order)) return applyPassOrder(db, order); // a contest pass: an organization key, not an event (passes.js)
  if (isInstallerOrder(order)) return applyInstallerOrder(db, order, today); // an installer id, not an event: banner_until / top_until (sponsor.js)
  const home = isHomeOrder(order);
  if (!home && isEventTier(order.plan)) return applyTierOrder(db, order, targetId, today);
  if (!PLANS[order.plan] || (home && !PLANS[order.plan].days)) return null; // never happens through checkout; a hand-made order for a home cannot use the Full run plan
  const ev = await db.prepare(home ? "SELECT id, featured, featured_until FROM posts WHERE id = ?" : "SELECT id, end_date, featured, featured_until FROM events WHERE id = ?").bind(targetId).first();
  if (!ev) return null;
  const nf = applyPlan(ev, order.plan, today, { home, legacy: order.plan === "season" && order.amount === LEGACY_SEASON_CENTS });
  await db.batch([
    db.prepare(home ? "UPDATE posts SET featured=?, featured_until=? WHERE id=? AND EXISTS (SELECT 1 FROM feature_orders WHERE session_id=? AND applied=0)" : "UPDATE events SET featured=?, featured_until=?, updated_at=datetime('now') WHERE id=? AND EXISTS (SELECT 1 FROM feature_orders WHERE session_id=? AND applied=0)").bind(nf.featured, nf.featured_until, targetId, order.session_id),
    db.prepare("UPDATE feature_orders SET event_id=?, applied=1, applied_featured=?, applied_until=? WHERE session_id=? AND applied=0").bind(targetId, nf.featured, nf.featured_until, order.session_id),
  ]);
  return nf;
}
// An order for one of the new event tiers: pin level, top level and the banner date, all to the quoted last day.
async function applyTierOrder(db, order, targetId, today) {
  const ev = await db.prepare("SELECT id, end_date, featured, featured_until, banner_until FROM events WHERE id = ?").bind(targetId).first();
  if (!ev) return null;
  const nf = applyEventTier(ev, order.plan, today, tierEnd(order, ev.end_date, today)), banner = EVENT_PLANS[order.plan].banner;
  await db.batch([
    db.prepare("UPDATE events SET featured=?, featured_until=?, banner_until=?, updated_at=datetime('now') WHERE id=? AND EXISTS (SELECT 1 FROM feature_orders WHERE session_id=? AND applied=0)").bind(nf.featured, nf.featured_until, nf.banner_until, targetId, order.session_id),
    db.prepare("UPDATE feature_orders SET event_id=?, applied=1, applied_featured=?, applied_until=?, applied_banner_until=?, applied_from=? WHERE session_id=? AND applied=0").bind(targetId, nf.featured, nf.featured_until, banner ? nf.banner_until : null, today, order.session_id),
  ]);
  return nf;
}

// An event's still-running placement, rebuilt from its valid orders (paid, applied, not refunded or disputed, not yet over):
// the highest level and the latest end date. A hand-set placement that runs longer than every order is never touched.
// Used when an order is revoked (revokePlan) and when an unpublished event comes back (restorePlacement).
async function validOrders(db, eventId, today, exceptSession = "") {
  const all = (await db.prepare("SELECT session_id, status, applied_featured AS f, applied_until AS u, applied_banner_until AS b FROM feature_orders WHERE event_id = ? AND applied = 1").bind(eventId).all()).results;
  return { all, valid: all.filter((o) => o.session_id !== exceptSession && o.status === "paid" && ((o.u && o.u >= today) || (o.b && o.b >= today))) };
}
const maxOf = (rows, k) => rows.reduce((m, o) => (o[k] != null && (m == null || o[k] > m) ? o[k] : m), null);

// Puts back the placement a republished event is still owed (the unpublish deleted the row; the orders remain). Never lowers anything.
// Pin and top level come from the orders' applied_featured / applied_until, the banner from applied_banner_until.
export async function restorePlacement(db, eventId, today = ptToday()) {
  const { valid } = await validOrders(db, eventId, today);
  if (!valid.length) return null;
  const ev = await db.prepare("SELECT featured, featured_until, banner_until FROM events WHERE id = ?").bind(eventId).first();
  if (!ev) return null;
  const fv = valid.filter((o) => o.u && o.u >= today), bv = valid.filter((o) => o.b && o.b >= today);
  let level = ev.featured, until = ev.featured_until, banner = ev.banner_until ?? null;
  if (fv.length) { level = Math.max(ev.featured || 0, maxOf(fv, "f") || 0); until = ev.featured && !ev.featured_until ? null : (ev.featured_until && ev.featured_until > maxOf(fv, "u") ? ev.featured_until : maxOf(fv, "u")); }
  if (bv.length) { const rb = maxOf(bv, "b"); banner = banner && banner > rb ? banner : rb; }
  if (level === ev.featured && until === ev.featured_until && banner === (ev.banner_until ?? null)) return null;
  await db.prepare("UPDATE events SET featured=?, featured_until=?, banner_until=?, updated_at=datetime('now') WHERE id=?").bind(level, until, banner, eventId).run();
  return { featured: level, featured_until: until, banner_until: banner };
}

// Switches off what an order applied (refund / lost dispute) without wiping time other orders paid for or a hand-set placement.
// Recomputes from the event's remaining valid orders. Returns true when the placement was dealt with cleanly, false when a human has
// to look (the event still holds something these orders do not explain). The pin/top level and the banner date are handled separately, then combined.
async function recomputeAfterRevoke(db, order, today) {
  const { all, valid } = await validOrders(db, order.event_id, today, order.session_id);
  const tbl = isHomeOrder(order) ? "posts" : "events"; // posts has no updated_at and no banner
  const ev = await db.prepare(`SELECT featured, featured_until${tbl === "events" ? ", banner_until" : ""} FROM ${tbl} WHERE id = ?`).bind(order.event_id).first();
  if (!ev) return true;
  const a = await recomputeFeatured(db, order, ev, tbl, all, valid.filter((o) => o.u && o.u >= today));
  const b = tbl === "events" && order.applied_banner_until ? await recomputeBanner(db, order, ev, all, valid) : true;
  return a && b;
}
async function recomputeFeatured(db, order, ev, tbl, all, valid) {
  if (!ev.featured) return true; // nothing is featured any more
  const swap = (featured, until) => db.prepare(`UPDATE ${tbl} SET featured=?, featured_until=?${tbl === "events" ? ", updated_at=datetime('now')" : ""} WHERE id=? AND featured=? AND featured_until IS ?`)
    .bind(featured, until, order.event_id, ev.featured, ev.featured_until ?? null).run().then((r) => !!(r.meta && r.meta.changes));
  if (!valid.length) { // no other order explains a placement: off only if it is exactly what this order wrote
    if (ev.featured !== order.applied_featured || (ev.featured_until ?? null) !== (order.applied_until ?? null)) return false;
    return swap(0, null);
  }
  const rl = maxOf(valid, "f"), ru = maxOf(valid, "u"), allU = maxOf(all, "u"), allL = maxOf(all, "f");
  if (!ev.featured_until || ev.featured_until > allU) return false; // a hand-applied extension or comp runs longer than every order: keep it
  const level = Math.min(ev.featured, Math.max(rl, ev.featured > allL ? ev.featured : 0)), until = ru < ev.featured_until ? ru : ev.featured_until;
  return swap(level, until);
}
// The banner date: back to what the remaining valid orders cover, off when none does. A date longer than every order (set by hand) is left on and flagged.
async function recomputeBanner(db, order, ev, all, valid) {
  const cur = ev.banner_until || "";
  if (!cur) return true;
  const allB = maxOf(all.filter((o) => o.b), "b") || "", rb = maxOf(valid.filter((o) => o.b), "b") || "";
  if (cur > allB) return false; // runs longer than every order: set by hand, left on
  if (!rb && cur !== order.applied_banner_until) return false; // not what this order wrote and no other order explains it
  const next = rb && rb < cur ? rb : rb ? cur : null;
  if ((next || "") === cur) return true;
  return db.prepare("UPDATE events SET banner_until=?, updated_at=datetime('now') WHERE id=? AND banner_until=?").bind(next, order.event_id, cur).run().then((r) => !!(r.meta && r.meta.changes));
}

// The least an admin may hand-set for an event: the latest dates and the highest level that paid orders still running cover (it would cut off a paying customer).
export async function eventFloor(db, eventId, today = ptToday()) {
  const { valid } = await validOrders(db, eventId, today);
  const fv = valid.filter((o) => o.u && o.u >= today);
  return { featured: maxOf(fv, "f") || 0, featured_until: maxOf(fv, "u") || "", banner_until: maxOf(valid.filter((o) => o.b && o.b >= today), "b") || "" };
}

// Records the order's new status and removes the placement it applied (once per order). Returns true ("manual") when the placement
// could not be removed cleanly; the reason is also written to the order's note so Admin > Orders shows it.
export async function revokePlan(db, order, status) {
  let manual = false;
  if (order.applied && order.event_id && !order.event_id.startsWith("sub:") && !order.refunded_at) manual = !(await (isPartnerOrder(order) ? revokePartner(db, order, ptToday(), recomputeAfterRevoke) : isPassOrder(order) ? revokePass(db, order, ptToday()) : isInstallerOrder(order) ? revokeInstaller(db, order, ptToday()) : recomputeAfterRevoke(db, order, ptToday())));
  const why = isPartnerOrder(order)
    ? AUTO + `manual: placement differs. The ${status} Event Partner plan was revoked, but a Featured placement it applied to an event is also explained by something else (another order or Admin), so it was left on. Check it in Admin > Event Partners.`
    : isPassOrder(order)
    ? AUTO + `manual: placement differs. The ${status} contest pass was left on because the extra contests it paid for are already live. Decide in Admin > Contests > Contest passes (grant a comp, or leave it).`
    : AUTO + `manual: placement differs. The ${status} order did not own the current placement (comped, extended or changed by hand), so it was left on. Check it in Admin > ${isInstallerOrder(order) ? "Installers" : "Events"}.`;
  await db.prepare("UPDATE feature_orders SET status=?, refunded_at=COALESCE(refunded_at, datetime('now')), note=CASE WHEN ? THEN ? ELSE note END WHERE session_id=?")
    .bind(status, manual ? 1 : 0, why, order.session_id).run();
  return manual;
}
