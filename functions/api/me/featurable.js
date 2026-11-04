// GET /api/me/featurable — what the signed-in person can put a Featured placement on: the events they submitted (matched by the
// email on the form, normalized) and the contests they own or help run (their map listing). Only ever their own items.
import { json, err } from "../../_lib/util.js";
import { requireUser, sameOrigin, normEmail } from "../../_lib/auth.js";

const today = () => new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10); // Pacific-ish, same as checkout
// Same rule as featuredLevel() in _lib/util.js
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
    const state = live ? (s.notice === "cancelled" || s.notice === "postponed" ? s.notice === "cancelled" ? "cancelled" : "postponed" : end < t ? "ended" : "live")
      : s.status === "declined" ? "declined" : end < t ? "ended" : "pending";
    events.push({ kind: "event", id, name: live ? s.ename : s.name, city: live ? s.ecity : s.city, start: live ? s.estart : s.start_date, end, state, featured: f, until: f ? s.featured_until || null : null });
  }

  const cs = (await env.DB.prepare(
    `SELECT c.slug, c.name, c.event_id AS id, CASE WHEN c.owner_id = ?1 THEN 'owner' ELSE 'staff' END AS role,
            e.end_date AS end, e.featured, e.featured_until
     FROM contests c JOIN events e ON e.id = c.event_id
     WHERE c.status = 'live' AND c.announced = 0 AND e.end_date >= ?3
       AND (c.owner_id = ?1 OR c.id IN (SELECT contest_id FROM contest_staff WHERE lower(email) = lower(?2)))
     ORDER BY c.created_at DESC LIMIT 50`).bind(user.id, user.email, t).all()).results;
  const contests = cs.map((c) => { const f = level(c.featured, c.featured_until, t); return { kind: "contest", slug: c.slug, name: c.name, id: c.id, end: c.end, featured: f, until: f ? c.featured_until || null : null, role: c.role }; });
  return json({ events, contests }, h);
}
