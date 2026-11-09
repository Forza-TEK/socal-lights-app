// Event Partner: which organization a signed-in person speaks for, and applying the plan to one of its events (rules in partner.js).
//   ORGANIZATION: the website the person types (optional) is matched against their email domain exactly like a contest organizer's (passkey.js): "d:eastvaleca.gov" when they match,
//   else the person's own account "u:email". With no website typed, the email's own domain is used, so staff at a city address land on the city's key without typing anything.
import { orgKeyFor } from "./passkey.js";
import { normEmail } from "./auth.js";
import { ownsEvent } from "./ownership.js";
import { eventQuote, applyEventTier } from "./featured.js";
import { partnerState, offerFor, partnerQuote } from "./partner.js";
import { orgLabel } from "./passes.js";
import { ptToday } from "./time.js";

export async function partnerKey(env, user, site) {
  const dom = String(user.email || "").split("@")[1] || "";
  return orgKeyFor(env, user.email, site ? String(site) : dom);
}

// The view the page needs: the standing, the price (none under a comp or a plan), the covered events with their dates.
export async function partnerView(env, user, site, today = ptToday()) {
  const key = await partnerKey(env, user, site), ent = await partnerState(env, key, today);
  const events = (await env.DB.prepare("SELECT p.event_id AS id, e.name, e.city, p.applied_from AS from_day, p.applied_until AS until FROM event_partner_events p LEFT JOIN events e ON e.id = p.event_id WHERE p.org_key = ? AND p.season_start = ? AND p.status = 'active' ORDER BY p.created_at").bind(key, ent.season.start).all()).results;
  const q = partnerQuote(ent, today);
  return { org: orgLabel(key), verified: key.startsWith("d:"), season: ent.season, covered: ent.covered, hasPlan: ent.hasPlan, comp: ent.comp ? { until: ent.comp.until, unlimited: ent.comp.unlimited } : null,
    used: ent.used, cap: ent.cap, unlimited: ent.unlimited, remaining: ent.remaining, canApply: ent.canApply, offer: offerFor(ent), buyProblem: q.problem, events, user_key: key };
}

// Applies the plan to one live event the person runs. Returns { ok: true, ... } or { error, status }.
export async function applyPartnerToEvent(env, user, eventId, site, today = ptToday()) {
  const key = await partnerKey(env, user, site), ent = await partnerState(env, key, today);
  if (!ent.covered) return { status: 402, error: "Your organization does not have an Event Partner plan for this season yet." };
  if (!ent.canApply) return { status: 409, error: `All ${ent.cap} events of this plan are used for the ${ent.season.label} season. Write to info@socallights.app if you need more.` };
  const ev = await env.DB.prepare("SELECT id, name, start_date, end_date, featured, featured_until, banner_until, notice, status FROM events WHERE id = ?").bind(eventId).first();
  if (!ev) return { status: 404, error: "We couldn't find that event." };
  if (!(await ownsEvent(env, user, ev.id, ""))) return { status: 403, error: "Claim this event first. Only its organizer can use the plan on it." };
  if (ev.notice === "cancelled" || ev.notice === "postponed") return { status: 400, error: `This event is marked ${ev.notice}, so it cannot be featured.` };
  if (ev.status === "expected") { // projected dates the organizer cannot correct: same hold as the Featured checkout, unless they submitted it themselves
    const subs = (await env.DB.prepare("SELECT contact_email FROM event_submissions WHERE event_id = ? LIMIT 20").bind(ev.id).all()).results;
    if (!subs.some((s) => normEmail(s.contact_email) === normEmail(user.email))) return { status: 400, error: "The dates for this listing are still projected, not confirmed, so it can't be featured yet. Email info@socallights.app with a link to your event page." };
  }
  const prior = await env.DB.prepare("SELECT status FROM event_partner_events WHERE event_id = ? AND season_start = ?").bind(ev.id, ent.season.start).first();
  if (prior && prior.status === "active") return { status: 409, error: "This event is already covered by an Event Partner plan this season." };
  const q = eventQuote(ev, "ev_pin", today); // the same window rules as the Featured pin: opens 30 days before, runs to the event's last day or the season's last day
  if (q.problem) return { status: 400, error: q.problem.startsWith("Nothing to add") ? "This event already has the Featured pin for its whole run, so it does not need one of your events." : q.problem };
  const nf = applyEventTier(ev, "ev_pin", today, q.to);
  const source = ent.hasPlan ? (await env.DB.prepare("SELECT session_id FROM event_partner_plans WHERE org_key = ? AND season_start = ? AND status = 'active' ORDER BY created_at LIMIT 1").bind(key, ent.season.start).first()).session_id : "";
  const verified = key.startsWith("d:") ? 1 : 0;
  await env.DB.batch([
    // a released or revoked row for this event and season is replaced
    env.DB.prepare("DELETE FROM event_partner_events WHERE event_id = ? AND season_start = ? AND status != 'active'").bind(ev.id, ent.season.start),
    env.DB.prepare("INSERT INTO event_partner_events (event_id, season_start, org_key, source_session, applied_from, applied_until, applied_featured, status, user_id) VALUES (?,?,?,?,?,?,?, 'active', ?)").bind(ev.id, ent.season.start, key, source, today, q.to, nf.featured, user.id),
    env.DB.prepare("UPDATE events SET featured=?, featured_until=?, banner_until=?, partner_until=?, partner_verified=?, updated_at=datetime('now') WHERE id=?").bind(nf.featured, nf.featured_until, nf.banner_until, q.to, verified, ev.id),
  ]);
  return { ok: true, event: ev.name, from: today, to: q.to, used: ent.used + 1, cap: ent.cap, remaining: ent.unlimited ? null : ent.cap - ent.used - 1 };
}
