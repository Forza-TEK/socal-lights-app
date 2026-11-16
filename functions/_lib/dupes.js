// Near-duplicate check for events: "Tree Lighting at X" and "Tree Lighting Celebration at X" on the same day are one event (audit 2026-11-16, H4).
// The exact checks (same id, same name and date, same address and date, same url and date) stay where they are; this adds the looser one both the
// Grok intake and Admin's Publish use. Same start date is always required. Pure functions plus one query, so they are easy to test.
import { streetParts } from "./addrkey.js";

// Words that say nothing about WHICH event it is.
const FILLER = new Set(["the", "a", "an", "of", "at", "in", "on", "and", "for", "to", "with", "annual", "celebration", "event", "events", "night", "nights", "festival", "official", "grand", "free", "2026", "2027", "holiday", "holidays"]);
const ORDINAL = /^\d+(st|nd|rd|th)$/;
export const nameKey = (name, city = "") => {
  const c = new Set(String(city).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  return [...new Set(String(name || "").toLowerCase().replace(/['’]/g, "").split(/[^a-z0-9]+/).filter((w) => (w.length > 1 || /^\d$/.test(w)) && !FILLER.has(w) && !ORDINAL.test(w) && !c.has(w)))];
};
const jaccard = (a, b) => { if (!a.length || !b.length) return 0; const B = new Set(b), inter = a.filter((x) => B.has(x)).length; return inter / (a.length + b.length - inter); };
const venueKey = (v) => nameKey(v).join(" ");
const sameStreet = (a, b) => { const x = streetParts(a), y = streetParts(b); return !!(x && y && x.num === y.num && x.name === y.name); };

/** True when two event-like rows ({ name, venue, address, city, start_date }) are probably the same event. */
export function nearDuplicate(a, b) {
  if (!a || !b || !a.start_date || a.start_date !== b.start_date) return false;
  const sameCity = String(a.city || "").toLowerCase() === String(b.city || "").toLowerCase();
  const na = nameKey(a.name, a.city), nb = nameKey(b.name, b.city), sim = jaccard(na, nb);
  if (sameCity && sim >= 0.75) return true; // near-identical normalized names in one city
  const place = (venueKey(a.venue) && venueKey(a.venue) === venueKey(b.venue)) || (a.address && b.address && sameStreet(a.address, b.address));
  return !!(sameCity && place && sim >= 0.5); // same place that day, and the names mostly agree (two different shows at one venue stay apart)
}

/** The first event (or intake row) that looks like x, or null. `skipId` is x's own id. */
export async function findNearDuplicate(env, x, skipId = x.id) {
  if (!x.start_date) return null;
  const { results } = await env.DB.prepare(
    `SELECT id, name, venue, address, city, start_date FROM events WHERE start_date = ?1
     UNION SELECT id, name, venue, address, city, start_date FROM intake_events WHERE start_date = ?1 AND status IN ('published','held','unpublished')`
  ).bind(x.start_date).all();
  return results.find((r) => r.id !== skipId && nearDuplicate(x, r)) || null;
}
