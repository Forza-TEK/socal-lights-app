// Finished contests as they were frozen when the winners were announced (contests.results). Shared by /api/archive (the Past results tab)
// and the server-written pages /past and /past/<slug>, so they always show the same thing.
import { SEASONS } from "../../public/seasons.js";

export const yearOf = (c) => { const y = +c.entries_close.slice(0, 4), m = +c.entries_close.slice(5, 7); return c.season === "newyear" && m >= 12 ? y + 1 : y; };
export const contestLabel = (c) => { const s = SEASONS[c.season] || {}; return `${s.short || s.label || c.season} | ${yearOf(c)}`; };

// What every page shows for a home whose entrant deleted their account (deleteAccount scrubs the snapshot entry and sets removed: true)
export const REMOVED_TEXT = "Entry removed at the entrant's request";
export const isRemoved = (e) => !!e && (e.removed === true || !String(e.name || "").trim());
export const publicEntry = (e) => (isRemoved(e) ? { ...e, name: REMOVED_TEXT, biz: "", address: "", city: "", lat: null, lng: null, photos: [], removed: true } : e);

export const ARCHIVE_COLS = "slug,name,org,city,county,season,entries_close,mode,judge_method,results";
// announced and still public (an announced contest stays 'live' even after its organizer deletes their account)
export const ARCHIVE_WHERE = "announced = 1 AND status = 'live' AND results != ''";

export function shapeContest(c) {
  const snap = JSON.parse(c.results);
  snap.entries = snap.entries.map(publicEntry);
  const byId = Object.fromEntries(snap.entries.map((e) => [e.id, e]));
  const awards = snap.awards || [], cats = snap.categories || [];
  const entries = snap.entries.map((e) => ({ no: e.no, name: e.name, address: e.address, city: e.city, photo: (e.photos || [])[0] || "", dq: !!e.dq, removed: !!e.removed,
    results: cats.map((k) => ({ category: k, votes: e.votes ? e.votes[k] ?? 0 : null, judges: e.jv ? (e.jv[k] && typeof e.jv[k] === "object" ? { avg: e.jv[k].avg, n: e.jv[k].n } : e.jv[k] ?? null) : null })),
    won: awards.filter((a) => a.ids.includes(e.id)).map((a) => ({ category: a.category, label: a.label, prize: a.prize || "" })) }))
    .sort((a, b) => b.won.length - a.won.length || b.results.reduce((n, r) => n + (r.votes || 0), 0) - a.results.reduce((n, r) => n + (r.votes || 0), 0) || (a.no || 0) - (b.no || 0));
  return { slug: c.slug, name: c.name, org: c.org, city: c.city, county: c.county, season: c.season, label: contestLabel(c), at: snap.at, mode: c.mode || "public", method: c.judge_method === "score" ? "score" : "pick", categories: cats, entries,
    awards: awards.filter((a) => a.ids.length).map((a) => ({ category: a.category, label: a.label, prize: a.prize || "", winners: a.ids.map((id) => byId[id]).filter(Boolean).map((e) => ({ name: e.name, address: e.address, city: e.city, photo: (e.photos || [])[0] || "" })) })) };
}
