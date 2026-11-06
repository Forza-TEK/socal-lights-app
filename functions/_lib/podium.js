// Featured homes: who is on a contest's podium, and who may buy a placement for a home.
// The podium is computed ONLY from the frozen results snapshot (contests.results, written at announcement), never from live votes, so
// paying can never change a result and nothing is eligible before the winners are announced.
import { normEmail } from "./auth.js";

export const PODIUM_PLACES = 3;
export const HOME_PLANS = ["pin", "top"]; // a home has no end date, so no "whole season" plan

// Competition ranking ("1224"): entries with the same value share a place and the next place is skipped (two firsts, then 3rd).
// Returns [{ id, place }] for every entry with a value above zero.
export function rankValues(items) {
  const rows = items.filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  let place = 0, prev = null;
  return rows.map((x, i) => { if (x.value !== prev) { place = i + 1; prev = x.value; } return { id: x.id, place }; });
}

const judgeValue = (v) => (v && typeof v === "object" ? Number(v.avg) || 0 : Number(v) || 0);

// Every award in the snapshot with its places. Public awards rank by votes; judges' awards by picks or average score.
// Disqualified entries and zero scores are left out. Returns [{ category, kind, label, ranks: [{id, place}] }].
export function snapshotRanks(snap) {
  if (!snap || !Array.isArray(snap.entries)) return [];
  const out = [], entries = snap.entries.filter((e) => e && !e.dq);
  for (const category of snap.categories || []) {
    if (entries.some((e) => e.votes)) out.push({ category, kind: "public", label: "People's Choice", ranks: rankValues(entries.filter((e) => e.votes).map((e) => ({ id: e.id, value: Number(e.votes[category]) || 0 }))) });
    if (entries.some((e) => e.jv)) out.push({ category, kind: "judge", label: "Judges' Choice", ranks: rankValues(entries.filter((e) => e.jv).map((e) => ({ id: e.id, value: judgeValue(e.jv[category]) }))) });
  }
  return out;
}

// postId -> the home's best podium finish { place, category, kind, label }. Only places 1 to 3.
export function podium(snap) {
  const best = new Map();
  for (const a of snapshotRanks(snap)) for (const r of a.ranks) {
    if (r.place > PODIUM_PLACES) continue;
    const cur = best.get(r.id);
    if (!cur || r.place < cur.place) best.set(r.id, { place: r.place, category: a.category, kind: a.kind, label: a.label });
  }
  return best;
}
export const placeWord = (n) => (n === 1 ? "Winner" : n === 2 ? "2nd place" : "3rd place");

// The home's owner: its account (posts.user_id) or the normalized email on the form. A home an organizer added has neither, so contest
// staff (below) may buy for it; they may not buy for a home somebody else owns.
export function ownsHomeRow(user, row) {
  if (row.user_id && row.user_id === user.id) return true;
  const mine = normEmail(user.email);
  return !!mine && !!row.contact_email && normEmail(row.contact_email) === mine;
}
export const isOrphanHome = (row) => !row.user_id && !String(row.contact_email || "").trim();

const COLS = "p.id, p.title, p.city, p.status, p.user_id, p.contact_email, p.featured, p.featured_until, p.contest_id, c.id AS cid, c.slug, c.name AS cname, c.owner_id, c.note, c.results";
const FROM = "posts p JOIN contests c ON c.id = p.contest_id WHERE p.status = 'approved' AND c.announced = 1 AND c.status = 'live' AND c.results != ''";

// Contest staff or owner, with the same open-review rule as events (contests.note = '' means Admin has nothing to check).
async function runsContest(env, user, row) {
  if (row.note) return false;
  if (row.owner_id && row.owner_id === user.id) return true;
  return !!(await env.DB.prepare("SELECT 1 FROM contest_staff WHERE contest_id = ? AND lower(email) = lower(?)").bind(row.cid, user.email).first());
}

// What this person may feature: homes of theirs (or organizer-added homes of contests they run) on the podium of an announced contest.
// Returns [{ row, role, standing }]. Reads only the frozen snapshot.
export async function featurableHomes(env, user) {
  const rows = (await env.DB.prepare(`SELECT ${COLS} FROM ${FROM} ORDER BY c.entries_close DESC LIMIT 3000`).all()).results;
  const snaps = new Map(), out = [];
  for (const row of rows) {
    const own = ownsHomeRow(user, row);
    if (!own && !(isOrphanHome(row) && (await runsContest(env, user, row)))) continue;
    if (!snaps.has(row.cid)) { let s = null; try { s = podium(JSON.parse(row.results)); } catch {} snaps.set(row.cid, s || new Map()); }
    const standing = snaps.get(row.cid).get(row.id);
    if (standing) out.push({ row, role: own ? "owner" : "organizer", standing });
  }
  return out;
}

// One home, for checkout: { error, status } or { row, standing }. Same answer (404) for a home that is missing, not announced, or not theirs.
export async function homeForCheckout(env, user, postId) {
  const row = await env.DB.prepare(`SELECT ${COLS} FROM ${FROM} AND p.id = ?`).bind(postId).first();
  const own = !!row && ownsHomeRow(user, row);
  if (!row || (!own && !(isOrphanHome(row) && (await runsContest(env, user, row))))) return { status: 404, error: "We couldn't find that home among yours." };
  let standing = null; try { standing = podium(JSON.parse(row.results)).get(row.id) || null; } catch {}
  if (!standing) return { status: 403, error: "Featured is only for the winner, 2nd and 3rd place of an announced contest." };
  return { row, standing };
}
