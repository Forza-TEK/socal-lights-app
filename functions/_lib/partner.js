// EVENT PARTNER plan (owner decision 2026-11-09). The only place its price and cap are set; featured.js re-exports them and /api/config serves them.
//
// RULES
//   Listing an event stays FREE. An organization (city, chamber, nonprofit, event producer) pays EVENT_PARTNER.cents once per SEASON (the sponsor seasons in sponsor.js; Christmas lights ends Jan 6)
//   and may apply the plan to up to EVENT_PARTNER.cap of its events in that season. Each covered event gets the Featured pin (level 1, as ev_pin) under the existing rules: featuring opens
//   OPEN_DAYS (30) days before the event starts, it runs from the day it is applied to the event's last day or the season's last day, whichever comes first (eventQuote in featured.js),
//   and an event that already holds the pin for that whole window is refused (it would waste one of the 10). Covered events also show an "Event Partner" badge (events.partner_until).
//   The badge says nothing about endorsement. It is called verified only when the organization key is a website domain matched by the buyer's email (trustOf, via passkey.js: key "d:...").
//   COMPS (Admin): an organization key covered at no price until a date (founder cities, this year only). allowed = events per season (-1 unlimited). An organization under a comp never sees a price.
//   REFUND / DISPUTE: the plan is revoked and the placements it applied are taken back like any order's (revokePartner), or flagged for Admin when they differ.
// This file must not import featured.js (featured.js imports it); the apply flow that needs eventQuote is in partnerapply.js.
import { seasonOf } from "./sponsor.js";
import { ptToday } from "./time.js";

export const EVENT_PARTNER = { label: "Event Partner", cents: 14900, cap: 10 };
export const PARTNER_PLAN = "partner"; // the plan key on feature_orders rows with target = 'event_partner' (event_id holds the organization key)
export const PUBLIC_EVENT_PARTNER = { label: EVENT_PARTNER.label, cents: EVENT_PARTNER.cents, cap: EVENT_PARTNER.cap };
export const isPartnerOrder = (o) => !!o && o.target === "event_partner";

const rank = (a) => (a < 0 ? Infinity : a);
// season: seasonOf(today); plans: active plans of this season [{ cap }]; comps: running comps [{ allowed, valid_until, note }]; used: covered events this season.
export function partnerEntitlement(season, plans = [], comps = [], used = 0) {
  const planCap = plans.length ? Math.max(...plans.map((p) => p.cap)) : 0;
  const comp = comps.reduce((b, c) => (!b || rank(c.allowed) > rank(b.allowed) ? c : b), null);
  const cap = Math.max(planCap, comp ? rank(comp.allowed) : 0);
  return {
    season: { key: season.key, label: season.label, start: season.start, end: season.end }, hasPlan: planCap > 0,
    comp: comp ? { until: comp.valid_until, allowed: comp.allowed, unlimited: comp.allowed < 0, note: comp.note || "" } : null,
    covered: cap > 0, unlimited: cap === Infinity, cap: cap === Infinity ? null : cap, used, remaining: cap === Infinity ? null : Math.max(0, cap - used), canApply: cap === Infinity || used < cap,
  };
}
// What buying costs this organization today. problem = "" when it can be bought. A comp or a plan already held means nothing to buy.
export function partnerQuote(ent, today = ptToday()) {
  const q = { plan: PARTNER_PLAN, label: EVENT_PARTNER.label, cap: EVENT_PARTNER.cap, cents: EVENT_PARTNER.cents, from: today, to: ent.season.end, season: ent.season.label, problem: "" };
  if (ent.comp) q.problem = "Your organization is covered as a Founding partner, so there is nothing to buy.";
  else if (ent.hasPlan) q.problem = `Your organization already has an Event Partner plan for the ${ent.season.label} season.`;
  return q;
}
// The price an organization is shown: nothing when it is covered (a comp or a plan).
export const offerFor = (ent) => (ent.covered ? null : { cents: EVENT_PARTNER.cents, cap: EVENT_PARTNER.cap });

// ---- database ----
export async function partnerState(env, key, today = ptToday()) {
  const season = seasonOf(today);
  const [plans, comps, u] = await Promise.all([
    env.DB.prepare("SELECT cap FROM event_partner_plans WHERE org_key = ? AND season_start = ? AND status = 'active'").bind(key, season.start).all(),
    env.DB.prepare("SELECT allowed, valid_until, note FROM event_partner_comps WHERE org_key = ? AND revoked = 0 AND valid_until >= ?").bind(key, today).all(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM event_partner_events WHERE org_key = ? AND season_start = ? AND status = 'active'").bind(key, season.start).first(),
  ]);
  return partnerEntitlement(season, plans.results, comps.results, u.n);
}

// ---- orders (feature_orders rows with target = 'event_partner', plan 'partner'; event_id = organization key; quote_from / quote_to = purchase day / season end) ----
export async function applyPartnerOrder(db, order) {
  if (order.plan !== PARTNER_PLAN || !order.quote_from || !order.quote_to) return null;
  const s = seasonOf(order.quote_from);
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO event_partner_plans (session_id, org_key, season_key, season_start, season_end, cap, cents, status, user_id) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, 'active', ?8 WHERE EXISTS (SELECT 1 FROM feature_orders WHERE session_id = ?1 AND applied = 0)")
      .bind(order.session_id, order.event_id, s.key, s.start, order.quote_to, EVENT_PARTNER.cap, EVENT_PARTNER.cents, order.user_id || null),
    db.prepare("UPDATE feature_orders SET applied = 1, applied_from = ?, applied_until = ? WHERE session_id = ? AND applied = 0").bind(order.quote_from, order.quote_to, order.session_id),
  ]);
  return { org_key: order.event_id, cap: EVENT_PARTNER.cap, from: order.quote_from, to: order.quote_to, season: s.label };
}

// "" when what the buyer was quoted still fits (same season, no plan or comp already held: a second tab, a duplicate session).
export async function partnerQuoteProblem(env, order, today = ptToday()) {
  const ent = await partnerState(env, order.event_id, today);
  if (ent.season.end !== order.quote_to) return `the season changed (quoted ${order.quote_from} to ${order.quote_to})`;
  if (ent.hasPlan) return "the organization already has an Event Partner plan for this season";
  if (ent.comp) return "the organization is covered by a comp";
  return "";
}

// A refunded or lost-dispute plan: it is revoked, and the placements it applied are taken back through `recompute` (featured.js recomputeAfterRevoke, so a placement another paid order
// or Admin also explains stays). Returns true when everything was dealt with cleanly, false when a person has to look.
export async function revokePartner(db, order, today, recompute) {
  const plan = await db.prepare("SELECT status FROM event_partner_plans WHERE session_id = ?").bind(order.session_id).first();
  if (!plan || plan.status !== "active") return true;
  await db.prepare("UPDATE event_partner_plans SET status = 'revoked' WHERE session_id = ?").bind(order.session_id).run();
  const rows = (await db.prepare("SELECT event_id, applied_until, applied_featured FROM event_partner_events WHERE source_session = ? AND status = 'active'").bind(order.session_id).all()).results;
  let clean = true;
  for (const r of rows) {
    if (r.applied_until >= today) clean = (await recompute(db, { event_id: r.event_id, session_id: "partner:" + order.session_id, applied_featured: r.applied_featured, applied_until: r.applied_until, applied_banner_until: null }, today)) && clean;
    await db.batch([
      db.prepare("UPDATE event_partner_events SET status = 'revoked' WHERE event_id = ? AND source_session = ?").bind(r.event_id, order.session_id),
      db.prepare("UPDATE events SET partner_until = NULL, partner_verified = 0 WHERE id = ?").bind(r.event_id),
    ]);
  }
  return clean;
}
