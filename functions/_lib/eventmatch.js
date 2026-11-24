// Possible matches for an event someone is adding: listings already on the map that look like the same event (similar name, or the same street address, on overlapping dates, near the city).
// Used by GET /api/events/match (the add-event form shows them) and by POST /api/submit-event (it only updates a listing that is in this list, so an id cannot be picked at random).
// A listing another organizer already manages is returned with managed:true and can never be taken over from here; one the person already manages comes back with mine:true.
import { CITY } from "../../public/cities.js";
import { normEmail } from "./auth.js";

// Words every event has: they say nothing about which event it is.
const GENERIC = new Set(["the", "and", "for", "with", "from", "your", "our", "annual", "event", "events", "christmas", "holiday", "holidays", "lights", "light", "lighting", "tree", "festival", "tour", "show", "night", "nights", "celebration", "parade", "market", "walk", "drive", "thru", "through", "family", "free", "2026", "2027", "winter", "season", "seasons"]);
export const matchTokens = (s) => [...new Set(String(s || "").toLowerCase().replace(/['’]s\b/g, "").split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !GENERIC.has(w)))];
// "350 W Hillcrest Dr" and "350 Hillcrest" both give "350 hillcrest": the house number and the first word of the street (a direction is skipped).
export const streetKey = (a) => { const m = /^\s*(\d{1,6})\s+(?:(?:n|s|e|w|north|south|east|west)\.?\s+)?([a-z0-9]+)/i.exec(String(a || "")); return m ? m[1] + " " + m[2].toLowerCase() : ""; };
const km = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r, h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

// q: { name, city, start, end, address, today }. user: the signed-in account. Returns up to 5 matches, best first.
export async function findMatches(env, user, q) {
  const c = CITY[q.city], start = q.start, end = q.end || q.start;
  if (!c || !start || !q.name) return [];
  const mine = normEmail(user.email), tq = matchTokens(q.name), sk = streetKey(q.address);
  const rows = (await env.DB.prepare("SELECT id, name, city, venue, address, lat, lng, start_date, end_date, status FROM events WHERE end_date >= ?1 AND end_date >= ?2 AND start_date <= ?3 AND id NOT LIKE 'c-%' AND id NOT LIKE 'hcontest-%'").bind(q.today || start, start, end).all()).results;
  const out = [];
  for (const r of rows) {
    if (r.lat == null || r.lng == null || km(c, [r.lat, r.lng]) > 30) continue;
    const tr = matchTokens(r.name), shared = tq.filter((w) => tr.includes(w)).length, small = Math.min(tq.length, tr.length);
    const sameName = small > 0 && shared >= Math.min(2, small) && shared / small >= 0.66;
    const sameAddr = !!sk && sk === streetKey(r.address);
    if (!sameName && !sameAddr) continue;
    out.push({ r, score: (sameName ? 0.6 * (shared / small) : 0) + (sameAddr ? 0.4 : 0), why: [sameName && "similar name", sameAddr && "same street address"].filter(Boolean) });
  }
  out.sort((a, b) => b.score - a.score);
  const top = out.slice(0, 5); if (!top.length) return [];
  const ids = top.map((x) => x.r.id), ph = ids.map(() => "?").join(",");
  const subs = (await env.DB.prepare(`SELECT event_id, contact_email FROM event_submissions WHERE event_id IN (${ph})`).bind(...ids).all()).results;
  const claims = (await env.DB.prepare(`SELECT event_id, user_id FROM event_claims WHERE status = 'approved' AND event_id IN (${ph})`).bind(...ids).all()).results;
  return top.map(({ r, why }) => {
    const ownedBy = [...subs.filter((s) => s.event_id === r.id).map((s) => ({ me: !!mine && normEmail(s.contact_email) === mine })), ...claims.filter((s) => s.event_id === r.id).map((s) => ({ me: s.user_id === user.id }))];
    return { id: r.id, name: r.name, city: r.city, venue: r.venue || "", address: r.address || "", start: r.start_date, end: r.end_date, status: r.status, why, mine: ownedBy.some((o) => o.me), managed: ownedBy.some((o) => !o.me) && !ownedBy.some((o) => o.me) };
  });
}
