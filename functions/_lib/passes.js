// CONTEST PASSES. The only place a pass price is set; /api/config serves it, the pages and the email read it from there.
// Owner decision 2026-11-09 (after meeting the City of Eastvale): organizers pay from the first contest. This replaces the decision of 2026-11-07 (1 free contest per 12 months,
// the old passes, since replaced). PR "contest-pricing-2026-11": nothing here is live until it is merged; the go-live date is the owner's.
//
// RULES
//   FREE_CONTESTS is 0: every NEW contest needs a pass (or an Admin comp). Single contest $149 (pass_1), up to 5 contests $299 (pass_5), up to 20 contests $499 (pass_20).
//   More than 20: contact us (no checkout). A cap counts TOTAL contests in the window. pass_10 ($75, "Up to 10") is retired: it is no longer offered, and is kept only so a pass
//   already bought under it (none were sold, as far as is known) still counts in its window.
//   Upgrading inside the window costs the price difference ($150 from $149 to $299, $200 from $299 to $499, $350 from $149 to $499).
//   Contest COUNT only: no entry caps, no feature differences. Entering and voting stay free. Payment never affects any result, vote, judge or ranking.
//   WINDOW: 12 months. It starts the day the organization's first contest goes live OR the day it buys a pass, whichever comes first (Pacific date), and ends the day before the same
//   date a year later. When it has ended, the next contest needs a new pass. A pass belongs to the window it was bought in.
//   COUNTING: a contest counts when it goes live (contests.live_at is set: live or announced). Drafts, held-for-review, declined and unpublished-before-ever-live do not count;
//   a contest that was live and later unpublished still counts.
//   CONTESTS BEFORE PRICING (PAID_FROM): contests that went live before PAID_FROM were run under the old rule (an earlier rule, now replaced). They are never counted and
//   never need a pass; they do not shrink a new window. An organization that already used its free contest is therefore treated like a new one: its next contest needs a pass and the
//   pass starts a new 12-month window. Contests already live or announced are not touched at all.
//   COMPS (Admin): allowed = total contests per window (-1 = unlimited) until a date, granted to an organization key by hand. Organizers see "Founding partner: free through <date>", never a price.
//   REFUND / DISPUTE: before the contests were used the pass is revoked; after they were used it stays and the order is flagged for Admin (revokePass).
// This file is imported by featured.js, so it must not import contests.js (see passkey.js for the organization key).
import { ptToday, shiftDay } from "./time.js";

export const FREE_CONTESTS = 0;
// FREE DOMAINS (owner decision 2026-11-10): organizations whose organization key is one of these domains (or a subdomain), or whose key is an account email at one of them, run contests
// free and without a limit: no pass, no price. It works like an unlimited comp that never ends, so every pass rule and page treats it as "covered". A lookalike such as
// notforza-tek.com or forza-tek.com.evil.com is NOT free (the match is on whole labels). To add a domain, add it here and ship it (tests/free-domains.test.mjs).
export const FREE_DOMAINS = ["zerae.com", "forza-tek.com"];
export const FREE_UNTIL = "2099-12-31";
export function freeDomain(orgKey) {
  const k = String(orgKey || "").toLowerCase();
  const host = k.startsWith("d:") ? k.slice(2) : k.startsWith("u:") ? k.slice(k.lastIndexOf("@") + 1) : "";
  return !!host && FREE_DOMAINS.some((d) => host === d || host.endsWith("." + d));
}
// The first day contests are paid. Set it to the go-live date before merging: a contest that went live on an earlier day was run under the old free rule and is never counted.
export const PAID_FROM = "2026-11-09";
export const WINDOW_MONTHS = 12;
export const CONTACT_ABOVE = 20; // more than this many contests in a window: contact us, no checkout
export const CONTEST_PASSES = {
  pass_1: { label: "Single contest", cap: 1, cents: 14900 },
  pass_5: { label: "Up to 5 contests", cap: 5, cents: 29900 },
  pass_20: { label: "Up to 20 contests", cap: 20, cents: 49900 },
};
// Retired: never offered, only honored for an order already paid (applyPassOrder, revokePass, windows). It is not in CONTEST_PASSES, so nothing can buy it.
export const LEGACY_PASSES = { pass_10: { label: "Up to 10 contests", cap: 10, cents: 7500 } };
export const PASS_KEYS = Object.keys(CONTEST_PASSES);
export const passOf = (k) => CONTEST_PASSES[k] || LEGACY_PASSES[k];
export const isPassPlan = (p) => !!CONTEST_PASSES[p];
export const PUBLIC_CONTEST_PASSES = { free: FREE_CONTESTS, windowMonths: WINDOW_MONTHS, contactAbove: CONTACT_ABOVE, plans: Object.fromEntries(Object.entries(CONTEST_PASSES).map(([k, p]) => [k, { label: p.label, cap: p.cap, cents: p.cents }])) };
export const isPassOrder = (o) => !!o && o.target === "contest_pass";

// The last day of a window that starts on `start`: the same date a year later, minus one day (a Feb 29 start ends on Feb 28).
export function windowEnd(start) { const d = new Date(start + "T12:00:00Z"); d.setUTCFullYear(d.getUTCFullYear() + WINDOW_MONTHS / 12); return shiftDay(d.toISOString().slice(0, 10), -1); }

// The current window from the dates (YYYY-MM-DD, any order) on which this organization's contests went live. A contest that goes live after the window ended starts a new window.
// `starts` are days on which a pass was bought: like a first contest they start a window (a pass bought before any contest), but they are not contests and are not counted.
// Dates before `since` (PAID_FROM) are contests run under the old free rule and are ignored.
export function windowFromDates(dates, today = ptToday(), starts = [], since = PAID_FROM) {
  const wins = [], items = [...dates].filter((d) => d && d >= since).map((d) => [d, 1]).concat([...starts].filter(Boolean).map((d) => [d, 0])).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : b[1] - a[1]));
  for (const [d, n] of items) { if (!wins.length || d > wins[wins.length - 1].end) wins.push({ start: d, end: windowEnd(d), used: 0 }); wins[wins.length - 1].used += n; }
  const last = wins[wins.length - 1];
  return last && last.end >= today ? { ...last, active: true } : { start: "", end: "", used: 0, active: false };
}

// w: windowFromDates(); passes: active passes of this window [{ cap, cents }]; comps: running comps [{ allowed, valid_until, note }].
export function entitlementOf(w, passes = [], comps = []) {
  const passCap = Math.max(0, ...passes.map((p) => p.cap)), passCents = Math.max(0, ...passes.map((p) => p.cents));
  const rank = (c) => (c.allowed < 0 ? Infinity : c.allowed), comp = comps.reduce((b, c) => (!b || rank(c) > rank(b) ? c : b), null);
  const cap = Math.max(FREE_CONTESTS, passCap, comp ? rank(comp) : 0), used = w.active ? w.used : 0;
  return { active: w.active, windowStart: w.start, windowEnd: w.end, used, cap: cap === Infinity ? null : cap, unlimited: cap === Infinity, passCap, passCents, comp: comp ? { until: comp.valid_until, unlimited: comp.allowed < 0, allowed: comp.allowed, note: comp.note || "" } : null, canCreate: cap === Infinity || used < cap };
}

// The passes an organization could buy now, priced as the difference from the pass it already holds (a comp is not a pass: it never lowers a price).
export function offersFor(ent) {
  const have = ent.unlimited ? Infinity : ent.cap;
  return PASS_KEYS.map((k) => ({ key: k, ...CONTEST_PASSES[k], pay: Math.max(0, CONTEST_PASSES[k].cents - ent.passCents), upgrade: ent.passCents > 0 })).filter((o) => o.cap > have);
}
// What one pass costs this organization now, and the window it covers; problem = "" when it can be bought.
export function passQuote(ent, plan, today = ptToday()) {
  const p = CONTEST_PASSES[plan];
  if (!p) return { plan, problem: "Choose a pass." };
  // No window running: the pass starts one today (12 months). Otherwise it covers the window that is running.
  const from = ent.active ? ent.windowStart : today, to = ent.active ? ent.windowEnd : windowEnd(today);
  const q = { plan, label: p.label, cap: p.cap, cents: ent.passCents > 0 ? p.cents - ent.passCents : p.cents, price: p.cents, from, to, upgrade: ent.passCents > 0, problem: "" };
  if (ent.unlimited || p.cap <= ent.cap) q.problem = `Your organization already has room for ${ent.unlimited ? "any number of" : "up to " + ent.cap} contests in this window.`;
  return q;
}

export const orgLabel = (key) => (String(key).startsWith("d:") ? String(key).slice(2) : String(key).startsWith("u:") ? "Your account (" + String(key).slice(2) + ")" : String(key));

// ---- database ----
// One organization's current window, passes and comps.
export async function orgState(env, key, today = ptToday()) {
  const dates = (await env.DB.prepare("SELECT live_at FROM contests WHERE org_key = ? AND live_at != ''").bind(key).all()).results.map((r) => r.live_at);
  // A pass bought before any contest started the window on the day it was bought (window_start), so those days start windows too.
  const bought = (await env.DB.prepare("SELECT window_start FROM contest_passes WHERE org_key = ? AND status = 'active' AND window_end >= ?").bind(key, today).all()).results.map((r) => r.window_start);
  const w = windowFromDates(dates, today, bought);
  const passes = w.active ? (await env.DB.prepare("SELECT cap, cents FROM contest_passes WHERE org_key = ? AND window_start = ? AND status = 'active'").bind(key, w.start).all()).results : [];
  const comps = (await env.DB.prepare("SELECT allowed, valid_until, note FROM contest_comps WHERE org_key = ? AND revoked = 0 AND valid_until >= ?").bind(key, today).all()).results;
  if (freeDomain(key)) comps.push({ allowed: -1, valid_until: FREE_UNTIL, note: "Free for this organization" });
  return entitlementOf(w, passes, comps);
}

// What the pages need: the entitlement, the offers and the exact window dates. No prices are offered to an organization covered by a comp.
export function entitlementView(key, ent) {
  const covered = !!ent.comp && ent.canCreate;
  return { org: orgLabel(key), key, active: ent.active, used: ent.used, cap: ent.cap, unlimited: ent.unlimited, windowStart: ent.windowStart, windowEnd: ent.windowEnd, free: FREE_CONTESTS, canCreate: ent.canCreate,
    comp: ent.comp ? { until: ent.comp.until, unlimited: ent.comp.unlimited } : null, offers: covered ? [] : offersFor(ent), contactAbove: CONTACT_ABOVE, contact: ent.cap === null ? false : ent.cap >= CONTACT_ABOVE, holdsPass: ent.passCap > 0 };
}

// ---- orders (feature_orders rows with target = 'contest_pass'; event_id holds the organization key; quote_from / quote_to the window) ----
// Records the pass for the order's window and marks the order applied. Both statements act only while the order is unapplied, so a replay changes nothing.
export async function applyPassOrder(db, order) {
  const p = passOf(order.plan);
  if (!p || !order.quote_from || !order.quote_to) return null;
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO contest_passes (session_id, org_key, cap, window_start, window_end, cents, status, user_id) SELECT ?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7 WHERE EXISTS (SELECT 1 FROM feature_orders WHERE session_id = ?1 AND applied = 0)")
      .bind(order.session_id, order.event_id, p.cap, order.quote_from, order.quote_to, p.cents, order.user_id || null),
    db.prepare("UPDATE feature_orders SET applied = 1, applied_from = ?, applied_until = ? WHERE session_id = ? AND applied = 0").bind(order.quote_from, order.quote_to, order.session_id),
  ]);
  return { org_key: order.event_id, cap: p.cap, from: order.quote_from, to: order.quote_to };
}

// A refunded or lost-dispute pass. Before the extra contests were used it is revoked. After they were used it stays on (the contests are live) and the order is flagged for Admin:
// returns true when handled cleanly, false when a person has to look.
export async function revokePass(db, order, today = ptToday()) {
  const row = await db.prepare("SELECT org_key, cap, window_start, window_end, status FROM contest_passes WHERE session_id = ?").bind(order.session_id).first();
  if (!row || row.status !== "active") return true;
  const others = (await db.prepare("SELECT cap FROM contest_passes WHERE org_key = ? AND window_start = ? AND status = 'active' AND session_id != ?").bind(row.org_key, row.window_start, order.session_id).all()).results;
  const comps = (await db.prepare("SELECT allowed FROM contest_comps WHERE org_key = ? AND revoked = 0 AND valid_until >= ?").bind(row.org_key, today).all()).results;
  const rank = (a) => (a < 0 ? Infinity : a), remaining = Math.max(FREE_CONTESTS, ...others.map((o) => o.cap), ...comps.map((c) => rank(c.allowed)), freeDomain(row.org_key) ? Infinity : 0);
  const { n } = await db.prepare("SELECT COUNT(*) AS n FROM contests WHERE org_key = ? AND live_at >= ? AND live_at <= ?").bind(row.org_key, row.window_start, row.window_end).first();
  if (n > remaining) return false;
  await db.prepare("UPDATE contest_passes SET status = 'revoked' WHERE session_id = ? AND status = 'active'").bind(order.session_id).run();
  return true;
}

// "" when what the buyer was quoted still fits: the window is the same and the organization does not already hold this much (a second tab, a duplicate session).
export async function quoteProblem(env, order, today = ptToday()) {
  const ent = await orgState(env, order.event_id, today), p = passOf(order.plan);
  if (!p) return "that pass does not exist";
  // No window was running when the buyer was quoted: the pass starts one. It still fits if no window started since and the quoted window has not ended.
  if (!ent.active) return order.quote_to >= today ? "" : `the 12-month window changed (quoted ${order.quote_from} to ${order.quote_to})`;
  if (ent.windowStart !== order.quote_from) return `the 12-month window changed (quoted ${order.quote_from} to ${order.quote_to})`;
  if (ent.unlimited || p.cap <= ent.cap) return `the organization already has room for ${ent.unlimited ? "any number of" : "up to " + ent.cap} contests in this window`;
  return "";
}
