// GET /api/me/featurable — what the signed-in person can put a Featured placement on: the events they submitted (matched by the
// email on the form, normalized), the contests they own or help run (their map listing), and their homes that finished 1st, 2nd or 3rd in
// an announced contest (podium read from the frozen results). Only ever their own items.
import { json, err } from "../../_lib/util.js";
import { requireUser, sameOrigin, normEmail } from "../../_lib/auth.js";
import { OPEN_DAYS, addDays } from "../../_lib/featured.js";
import { featurableHomes, placeWord } from "../../_lib/podium.js";
import { ptToday } from "../../_lib/time.js";

const today = () => ptToday(); // Pacific-ish, same as checkout
// Same rule as featuredLevel() in _lib/util.js
// The day featuring opens for an event that starts more than OPEN_DAYS from today (else null): shown so the organizer knows when to come back.
const opens = (start, t) => (start && start > addDays(t, OPEN_DAYS) ? addDays(start, -OPEN_DAYS) : null);
const level = (f, until, t) => (!f || (until && until < t) ? 0 : f >= 2 ? 2 : 1);

export async function onRequestGet({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Bad origin.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const t = today(), mine = normEmail(user.email), h = { headers: { "cache-control": "no-store" } };

  const subs = (await env.DB.prepare(
    `SELECT s.id, s.name, s.city, s.start_date, s.end_date, s.status, s.contact_email, s.event_id,
            e.id AS eid, e.name AS ename, e.city AS ecity, e.start_date AS estart, e.end_date AS eend, e.notice, e.featured, e.featured_until
     FROM event_submissions s LEFT JOIN events e ON e.id = s.event_id ORDER BY s.created_at DESC LIMIT 500`).all()).results
    .filter((s) => mine && normEmail(s.contact_email) === mine).slice(0, 200);
  const events = [], seen = new Set();
  for (const s of subs) {
    const live = !!s.eid;
    const id = live ? s.eid : "sub:" + s.id;
    if (seen.has(id)) continue; seen.add(id);
    const end = live ? s.eend : s.end_date;
    const f = live ? level(s.featured, s.featured_until, t) : 0;
    const state = live ? (s.notice === "cancelled" || s.notice === "postponed" ? s.notice : end < t ? "ended" : "live")
      : s.status === "declined" ? "declined" : end < t ? "ended" : "pending";
    events.push({ kind: "event", id, name: live ? s.ename : s.name, city: live ? s.ecity : s.city, start: live ? s.estart : s.start_date, end, state, opens: state === "live" || state === "pending" ? opens(live ? s.estart : s.start_date, t) : null, featured: f, until: f ? s.featured_until || null : null });
  }

  // Claims: approved ones are buyable; pending ones are listed so the person sees where they stand. (A claim gives no edit rights.)
  const cl = (await env.DB.prepare(
    `SELECT c.status, e.id, e.name, e.city, e.start_date, e.end_date, e.notice, e.featured, e.featured_until
     FROM event_claims c JOIN events e ON e.id = c.event_id WHERE c.user_id = ? AND c.status IN ('approved','pending') ORDER BY c.created_at DESC LIMIT 100`).bind(user.id).all()).results;
  for (const c of cl) {
    if (seen.has(c.id)) continue; seen.add(c.id);
    const f = level(c.featured, c.featured_until, t);
    const state = c.status === "pending" ? "claim-pending" : c.notice === "cancelled" || c.notice === "postponed" ? c.notice : c.end_date < t ? "ended" : "live";
    events.push({ kind: "event", id: c.id, name: c.name, city: c.city, start: c.start_date, end: c.end_date, state, opens: state === "live" ? opens(c.start_date, t) : null, source: "claimed", featured: f, until: f ? c.featured_until || null : null });
  }

  const cs = (await env.DB.prepare(
    `SELECT c.slug, c.name, c.event_id AS id, CASE WHEN c.owner_id = ?1 THEN 'owner' ELSE 'staff' END AS role,
            e.start_date AS start, e.end_date AS end, e.featured, e.featured_until, c.note
     FROM contests c JOIN events e ON e.id = c.event_id
     WHERE c.status = 'live' AND c.announced = 0 AND e.end_date >= ?3
       AND (c.owner_id = ?1 OR c.id IN (SELECT contest_id FROM contest_staff WHERE lower(email) = lower(?2)))
     ORDER BY c.created_at DESC LIMIT 50`).bind(user.id, user.email, t).all()).results;
  const contests = cs.map((c) => { const f = level(c.featured, c.featured_until, t); return { kind: "contest", state: c.note ? "review" : "live", ...(c.note ? { message: "Waiting for a quick check before it can be featured" } : {}), slug: c.slug, name: c.name, id: c.id, start: c.start, end: c.end, opens: opens(c.start, t), featured: f, until: f ? c.featured_until || null : null, role: c.role }; });

  // Homes on a podium. A failure here must never hide the events and contests.
  let homes = [];
  try {
    homes = (await featurableHomes(env, user)).map(({ row, role, standing }) => { const f = level(row.featured, row.featured_until, t);
      return { kind: "home", state: "live", id: row.id, name: row.title, city: row.city, contest: row.cname, slug: row.slug, place: standing.place, placeText: placeWord(standing.place), category: standing.category, award: standing.label, role, featured: f, until: f ? row.featured_until || null : null }; })
      .sort((a, b) => a.place - b.place);
  } catch (e) { console.error("featurable homes", e && e.message); }
  return json({ events, contests, homes }, h);
}
