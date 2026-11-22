// Featured homes: who is on a contest's podium, and who may buy a placement for a home.
// The podium is computed ONLY from the frozen results snapshot (contests.results, written at announcement), never from live votes, so
// paying can never change a result and nothing is eligible before the winners are announced.
import { normEmail } from "./auth.js";

export const PODIUM_PLACES = 3;
export const HOME_PLANS = ["pin", "top"]; // a home has no end date, so no "Full run" plan

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

// A home is "featurable" when it is approved and either a plain showcase home (no contest) or an entry in a contest whose results are announced (the frozen snapshot is
// then final, so paying can never change a result and nothing is sold on an entry while voting is open). Any such home may buy a pin or top of the list; a podium finish
// (winner, 2nd, 3rd) is shown separately by the crown badge and is only returned here as `standing` (null for everyone else).
const COLS = "p.id, p.title, p.city, p.status, p.user_id, p.contact_email, p.featured, p.featured_until, p.contest_id, c.id AS cid, c.slug, c.name AS cname, c.owner_id, c.note, c.results, c.announced, c.status AS cstatus";
const FROM = "posts p LEFT JOIN contests c ON c.id = p.contest_id WHERE p.status = 'approved' AND (p.contest_id IS NULL OR (c.announced = 1 AND c.status = 'live' AND c.results != ''))";

// Contest staff or owner, with the same open-review rule as events (contests.note = '' means Admin has nothing to check).
async function runsContest(env, user, row) {
  if (!row.cid || row.note) return false;
  if (row.owner_id && row.owner_id === user.id) return true;
  return !!(await env.DB.prepare("SELECT 1 FROM contest_staff WHERE contest_id = ? AND lower(email) = lower(?)").bind(row.cid, user.email).first());
}
// Per contest: the podium map and the set of disqualified entry ids (a disqualified home may not buy a placement).
const snapOf = (row, snaps) => {
  if (!snaps.has(row.cid)) { let r = null, dq = new Set(); try { r = JSON.parse(row.results); dq = new Set((r.entries || []).filter((e) => e && e.dq).map((e) => e.id)); } catch {} let pod = new Map(); try { pod = podium(r) || new Map(); } catch {} snaps.set(row.cid, { pod, dq }); }
  return snaps.get(row.cid);
};
const standingOf = (row, snaps) => (row.cid ? snapOf(row, snaps).pod.get(row.id) || null : null);
const disqualified = (row, snaps) => !!row.cid && snapOf(row, snaps).dq.has(row.id);

// What this person may feature: their own approved homes, and organizer-added homes of contests they run that finished on the podium.
// Returns [{ row, role, standing }]; standing is null for a home with no podium finish. Reads only the frozen snapshot.
export async function featurableHomes(env, user) {
  const mine = normEmail(user.email);
  const rows = (await env.DB.prepare(`SELECT ${COLS} FROM ${FROM} AND (p.user_id = ? OR (? != '' AND lower(p.contact_email) = ?) OR (p.contest_id IS NOT NULL AND (p.user_id IS NULL OR p.user_id = ''))) ORDER BY p.created_at DESC LIMIT 3000`).bind(user.id, mine || "", mine || "").all()).results;
  const snaps = new Map(), out = [];
  for (const row of rows) {
    const own = ownsHomeRow(user, row), standing = standingOf(row, snaps);
    if (disqualified(row, snaps)) continue;
    if (own) { out.push({ row, role: "owner", standing }); continue; }
    if (standing && isOrphanHome(row) && (await runsContest(env, user, row))) out.push({ row, role: "organizer", standing });
  }
  return out;
}

// One home, for checkout: { error, status } or { row, standing }. Same answer (404) for a home that is missing, not eligible, or not theirs.
export async function homeForCheckout(env, user, postId) {
  const row = await env.DB.prepare(`SELECT ${COLS} FROM ${FROM} AND p.id = ?`).bind(postId).first();
  const own = !!row && ownsHomeRow(user, row);
  if (!row || (!own && !(isOrphanHome(row) && (await runsContest(env, user, row))))) return { status: 404, error: "We couldn't find that home among yours." };
  const snaps = new Map(), standing = standingOf(row, snaps);
  if (disqualified(row, snaps)) return { status: 403, error: "This entry was disqualified, so it can't be featured." };
  if (!own && !standing) return { status: 403, error: "An organizer can feature a home they added only if it won, or placed 2nd or 3rd." };
  return { row, standing };
}
