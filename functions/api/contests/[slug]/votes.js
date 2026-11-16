// GET  /api/contests/<slug>/votes[?offset=&limit=&flagged=1]  organizer only: the votes with who cast them (newest first, a page at a time) and the fraud flags, which are worked out over
//      ALL of the contest's votes in SQL, never over the page (audit H4). Returns total, voided, flaggedVotes, flaggedVoters so the page can say "showing N of M".
// POST /api/contests/<slug>/votes { vote_id, voided, reason? }   void (or restore) one vote. A voided vote stops counting right away. Locked once winners are announced. Every change is
//      written to the contest's change log (who, which category and home, an anonymous voter code, the reason) (audit H3).
import { json, err } from "../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { ownerOf } from "../../../_lib/contests.js";
import { logContest } from "../../../_lib/changes.js";
import { sha256 } from "../../../_lib/auth.js";
import { clean } from "../../../_lib/util.js";

const ms = (s) => Date.parse(String(s).replace(" ", "T") + "Z");

// The vote-speed rule (documented in docs/contests.md, "Vote-speed flag"). A voter is flagged only when they cast at least FAST_MIN_VOTES votes and the votes
// were on average less than FAST_MAX_GAP_SECONDS apart (first vote to last, divided by the number of gaps). Looking at a home and tapping Vote takes a person
// a few seconds at the very least, so a whole ballot at under 3 seconds a vote is a script or a very careless tapper. An honest voter who goes through four
// categories in 20 seconds is not flagged. (The earlier rule, "every category within 60 seconds", flagged nearly every real voter: the ballot moves on by itself
// after each vote.) It is a prompt to look, not proof.
export const FAST_MIN_VOTES = 3, FAST_MAX_GAP_SECONDS = 3;
// times: one voter's vote times in ms. Returns the plain-language reason, or "" when the pattern is normal.
export function fastVoteReason(times) { return times.length < FAST_MIN_VOTES ? "" : fastReason(times.length, (Math.max(...times) - Math.min(...times)) / 1000); }
// n votes cast over span seconds (first to last)
export function fastReason(n, span) {
  if (n < FAST_MIN_VOTES) return "";
  const gap = span / (n - 1);
  if (gap >= FAST_MAX_GAP_SECONDS) return "";
  const secs = Math.round(span);
  return `Cast ${n} votes in ${secs === 0 ? "under a second" : secs === 1 ? "1 second" : secs + " seconds"}. People usually take longer than that to look at the homes.`;
}

// The same rule in SQL, over every vote of the contest (votes.created_at has whole seconds): voters with FAST_MIN_VOTES or more votes whose average gap is under FAST_MAX_GAP_SECONDS.
const FAST_SQL = `SELECT user_id FROM votes WHERE contest_id = ?1 GROUP BY user_id HAVING COUNT(*) >= ${FAST_MIN_VOTES} AND (MAX(CAST(strftime('%s', created_at) AS INTEGER)) - MIN(CAST(strftime('%s', created_at) AS INTEGER))) * 1.0 / (COUNT(*) - 1) < ${FAST_MAX_GAP_SECONDS}`;
const PAGE = 300;

export async function onRequestGet({ params, request, env }) {
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const u = new URL(request.url), offset = Math.max(0, parseInt(u.searchParams.get("offset"), 10) || 0), limit = Math.min(500, Math.max(1, parseInt(u.searchParams.get("limit"), 10) || PAGE)), onlyFlagged = u.searchParams.get("flagged") === "1";
  const totals = await env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(voided), 0) AS voided FROM votes WHERE contest_id = ?").bind(c.id).first();
  const fastRows = (await env.DB.prepare(`SELECT user_id, COUNT(*) AS n, SUM(CASE WHEN voided = 0 THEN 1 ELSE 0 END) AS open, MAX(CAST(strftime('%s', created_at) AS INTEGER)) - MIN(CAST(strftime('%s', created_at) AS INTEGER)) AS span FROM votes WHERE contest_id = ?1 AND user_id IN (${FAST_SQL}) GROUP BY user_id LIMIT 2000`).bind(c.id).all()).results;
  const fast = new Map(fastRows.map((r) => [r.user_id, fastReason(r.n, r.span)]));
  const open = fastRows.filter((r) => r.open > 0);
  const { results } = await env.DB.prepare(
    `SELECT v.id, v.category, v.voided, v.created_at, u.id AS uid, u.email, p.title, p.biz, p.entry_no
     FROM votes v JOIN users u ON u.id = v.user_id JOIN posts p ON p.id = v.post_id WHERE v.contest_id = ?1${onlyFlagged ? ` AND v.user_id IN (${FAST_SQL})` : ""} ORDER BY v.created_at DESC, v.id LIMIT ?2 OFFSET ?3`).bind(c.id, limit, offset).all();
  return json({ locked: !!c.announced, total: totals.n, voided: totals.voided, flaggedVotes: open.reduce((n, r) => n + r.open, 0), flaggedVoters: open.length, offset, limit, filtered: onlyFlagged, matching: onlyFlagged ? fastRows.reduce((n, r) => n + r.n, 0) : totals.n, votes: results.map((v) => ({ id: v.id, email: v.email, category: v.category, entry: v.title || v.biz, no: v.entry_no, at: v.created_at, voided: !!v.voided, flags: fast.get(v.uid) ? [fast.get(v.uid)] : [] })) }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res, user } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  if (c.announced) return err(400, "The winners are announced and the results are locked.");
  const b = await request.json().catch(() => ({}));
  const v = await env.DB.prepare("SELECT v.id, v.user_id, v.category, v.voided, p.title, p.biz, p.entry_no FROM votes v JOIN posts p ON p.id = v.post_id WHERE v.id = ? AND v.contest_id = ?").bind(String(b.vote_id || ""), c.id).first();
  if (!v) return err(404, "That vote doesn't exist.");
  const to = b.voided ? 1 : 0, reason = clean(b.reason, 140);
  const r = await env.DB.prepare("UPDATE votes SET voided = ? WHERE id = ? AND contest_id = ? AND voided != ?").bind(to, v.id, c.id, to).run();
  if (r.meta.changes) {
    // Audit H3: the change log records every void and restore. The voter is only a short code (the same voter always gets the same code in this contest), never the email.
    const code = (await sha256(`${c.id}:${v.user_id}`)).slice(0, 8), what = `${v.category} vote for ${v.title || v.biz || "entry " + v.entry_no}, voter ${code}${reason ? `, reason: ${reason}` : ""}`;
    await logContest(env, c.id, { email: user.email, name: user.name || user.email }, [{ label: to ? "Vote voided" : "Vote restored", old: to ? "Counted" : "Voided", new: (to ? "Voided: " : "Counted again: ") + what }]);
  }
  return json({ ok: true });
}
