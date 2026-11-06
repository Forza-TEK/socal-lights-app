import { applyInstallerOrder, revokeInstaller } from "./sponsor.js";
// Featured plans: price, level and how long they last. Prices are in cents and exist only here (/api/config serves them).
// Events: the window follows the event. Placement starts at payment and ends on the event's last day (end_date as stored when paid), capped at
//   days (pin, top: 30) or maxDays (season: 90) from payment. Featuring opens OPEN_DAYS before the event starts.
// Homes have no end date: pin and top run `days` days from payment, and "season" is never sold for a home.
// The plan key "season" is kept so orders already paid keep working; users see it as "Full run": events 31+ days long (minLength) with at least minDays left.
export const OPEN_DAYS = 30;
export const LEGACY_SEASON_CENTS = 2000; // the old "Whole season" price: a paid or in-flight order at this amount is grandfathered (no 90-day cap, no amount-mismatch flag)
export const PLANS = {
  pin: { label: "Featured pin", cents: 1000, level: 1, days: 30 },
  top: { label: "Top of the list", cents: 1500, level: 2, days: 30 },
  season: { label: "Full run", cents: 2500, level: 2, days: 0, maxDays: 90, minLength: 31, minDays: 7 },
};

// Installer placements (Sponsor banner, and banner + top of the list card). Prices in cents; they exist only here (/api/config serves them).
// Rules (season length, stacking, renewal, upgrade) are in sponsor.js. The stored plan keys are "banner" and "banner_top", on feature_orders rows with target = 'installer'.
export const INSTALLER_PLANS = {
  banner: { label: "Banner", cents: 5000, top: false },
  banner_top: { label: "Banner and top of the list", cents: 7500, top: true },
};
// PRICE (owner decision): no proration. A plan costs its price above whenever it is bought during a season, and the placement runs until the season's last day.
// An upgrade (Banner -> Banner and top while the banner already runs to the season end) costs the difference between the two plans' prices; see sponsor.js.
export const PUBLIC_INSTALLER_PLANS = Object.fromEntries(Object.entries(INSTALLER_PLANS).map(([k, p]) => [k, { label: p.label, cents: p.cents, top: p.top }]));

// What the browser may know about plans (served by /api/config). Prices exist only in PLANS above.
export const PUBLIC_PLANS = Object.fromEntries(Object.entries(PLANS).map(([k, p]) => [k, { label: p.label, cents: p.cents, days: p.days, level: p.level, minDays: p.minDays || 0, minLength: p.minLength || 0, maxDays: p.maxDays || p.days }]));

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
export const ptToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date(Date.now()));
// Order notes that begin with this mark are "needs a look" for the owner (Admin > Orders). Writing a note of your own there clears them.
export const AUTO = "[auto] ";
export const setOrderNote = (db, sessionId, text) => db.prepare("UPDATE feature_orders SET note = ? WHERE session_id = ?").bind(String(text).slice(0, 500), sessionId).run();

// Applies one paid, unapplied order to a live event. Both statements only act while the order is still unapplied, so a concurrent
// retry cannot extend the placement twice. Returns the new placement, or null when the event does not exist.
// A home order (order.target = 'home') applies to the posts row the same way; only 30-day plans exist for homes.
export const isHomeOrder = (o) => !!o && o.target === "home";
export const isInstallerOrder = (o) => !!o && o.target === "installer";
export async function applyOrder(db, order, targetId, today = ptToday()) {
  if (isInstallerOrder(order)) return applyInstallerOrder(db, order, today); // an installer id, not an event: banner_until / top_until (sponsor.js)
  const home = isHomeOrder(order);
  if (home && !PLANS[order.plan].days) return null; // never happens through checkout; a hand-made order for a home cannot use the Full run plan
  const ev = await db.prepare(home ? "SELECT id, featured, featured_until FROM posts WHERE id = ?" : "SELECT id, end_date, featured, featured_until FROM events WHERE id = ?").bind(targetId).first();
  if (!ev) return null;
  const nf = applyPlan(ev, order.plan, today, { home, legacy: order.plan === "season" && order.amount === LEGACY_SEASON_CENTS });
  await db.batch([
    db.prepare(home ? "UPDATE posts SET featured=?, featured_until=? WHERE id=? AND EXISTS (SELECT 1 FROM feature_orders WHERE session_id=? AND applied=0)" : "UPDATE events SET featured=?, featured_until=?, updated_at=datetime('now') WHERE id=? AND EXISTS (SELECT 1 FROM feature_orders WHERE session_id=? AND applied=0)").bind(nf.featured, nf.featured_until, targetId, order.session_id),
    db.prepare("UPDATE feature_orders SET event_id=?, applied=1, applied_featured=?, applied_until=? WHERE session_id=? AND applied=0").bind(targetId, nf.featured, nf.featured_until, order.session_id),
  ]);
  return nf;
}

// An event's still-running placement, rebuilt from its valid orders (paid, applied, not refunded or disputed, not yet over):
// the highest level and the latest end date. A hand-set placement that runs longer than every order is never touched.
// Used when an order is revoked (revokePlan) and when an unpublished event comes back (restorePlacement).
async function validOrders(db, eventId, today, exceptSession = "") {
  const all = (await db.prepare("SELECT session_id, status, applied_featured AS f, applied_until AS u FROM feature_orders WHERE event_id = ? AND applied = 1").bind(eventId).all()).results;
  return { all, valid: all.filter((o) => o.session_id !== exceptSession && o.status === "paid" && o.u && o.u >= today) };
}
const maxOf = (rows, k) => rows.reduce((m, o) => (o[k] != null && (m == null || o[k] > m) ? o[k] : m), null);

// Puts back the placement a republished event is still owed (the unpublish deleted the row; the orders remain). Never lowers anything.
export async function restorePlacement(db, eventId, today = ptToday()) {
  const { valid } = await validOrders(db, eventId, today);
  if (!valid.length) return null;
  const ev = await db.prepare("SELECT featured, featured_until FROM events WHERE id = ?").bind(eventId).first();
  if (!ev) return null;
  const level = Math.max(ev.featured || 0, maxOf(valid, "f") || 0), until = ev.featured && !ev.featured_until ? null : (ev.featured_until && ev.featured_until > maxOf(valid, "u") ? ev.featured_until : maxOf(valid, "u"));
  if (level === ev.featured && until === ev.featured_until) return null;
  await db.prepare("UPDATE events SET featured=?, featured_until=?, updated_at=datetime('now') WHERE id=?").bind(level, until, eventId).run();
  return { featured: level, featured_until: until };
}

// Switches off what an order applied (refund / lost dispute) without wiping time other orders paid for or a hand-set placement.
// Recomputes from the event's remaining valid orders. Returns true when the placement was dealt with cleanly, false when a human has
// to look (the event still holds something these orders do not explain).
async function recomputeAfterRevoke(db, order, today) {
  const { all, valid } = await validOrders(db, order.event_id, today, order.session_id);
  const tbl = isHomeOrder(order) ? "posts" : "events"; // posts has no updated_at
  const ev = await db.prepare(`SELECT featured, featured_until FROM ${tbl} WHERE id = ?`).bind(order.event_id).first();
  if (!ev || !ev.featured) return true; // nothing is featured any more
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

// Records the order's new status and removes the placement it applied (once per order). Returns true ("manual") when the placement
// could not be removed cleanly; the reason is also written to the order's note so Admin > Orders shows it.
export async function revokePlan(db, order, status) {
  let manual = false;
  if (order.applied && order.event_id && !order.event_id.startsWith("sub:") && !order.refunded_at) manual = !(await (isInstallerOrder(order) ? revokeInstaller(db, order, ptToday()) : recomputeAfterRevoke(db, order, ptToday())));
  await db.prepare("UPDATE feature_orders SET status=?, refunded_at=COALESCE(refunded_at, datetime('now')), note=CASE WHEN ? THEN ? ELSE note END WHERE session_id=?")
    .bind(status, manual ? 1 : 0, AUTO + `manual: placement differs. The ${status} order did not own the current placement (comped, extended or changed by hand), so it was left on. Check it in Admin > ${isInstallerOrder(order) ? "Installers" : "Events"}.`, order.session_id).run();
  return manual;
}
