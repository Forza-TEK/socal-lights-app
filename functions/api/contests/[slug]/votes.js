// GET  /api/contests/<slug>/votes                       organizer only: every vote with who cast it, plus fraud flags.
// POST /api/contests/<slug>/votes { vote_id, voided }   void (or restore) one vote. A voided vote stops counting right away. Locked once winners are announced.
import { json, err } from "../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { ownerOf } from "../../../_lib/contests.js";

const ms = (s) => Date.parse(String(s).replace(" ", "T") + "Z");

// The vote-speed rule (documented in docs/contests.md, "Vote-speed flag"). A voter is flagged only when they cast at least FAST_MIN_VOTES votes and the votes
// were on average less than FAST_MAX_GAP_SECONDS apart (first vote to last, divided by the number of gaps). Looking at a home and tapping Vote takes a person
// a few seconds at the very least, so a whole ballot at under 3 seconds a vote is a script or a very careless tapper. An honest voter who goes through four
// categories in 20 seconds is not flagged. (The earlier rule, "every category within 60 seconds", flagged nearly every real voter: the ballot moves on by itself
// after each vote.) It is a prompt to look, not proof.
export const FAST_MIN_VOTES = 3, FAST_MAX_GAP_SECONDS = 3;
// times: one voter's vote times in ms. Returns the plain-language reason, or "" when the pattern is normal.
export function fastVoteReason(times) {
  if (times.length < FAST_MIN_VOTES) return "";
  const span = (Math.max(...times) - Math.min(...times)) / 1000, gap = span / (times.length - 1);
  if (gap >= FAST_MAX_GAP_SECONDS) return "";
  const secs = Math.round(span);
  return `Cast ${times.length} votes in ${secs === 0 ? "under a second" : secs === 1 ? "1 second" : secs + " seconds"}. People usually take longer than that to look at the homes.`;
}

export async function onRequestGet({ params, request, env }) {
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const { results } = await env.DB.prepare(
    `SELECT v.id, v.category, v.voided, v.created_at, u.id AS uid, u.email, p.title, p.biz, p.entry_no
     FROM votes v JOIN users u ON u.id = v.user_id JOIN posts p ON p.id = v.post_id WHERE v.contest_id = ? ORDER BY v.created_at DESC LIMIT 1000`).bind(c.id).all();
  const by = {};
  for (const v of results) (by[v.uid] ||= []).push(ms(v.created_at));
  const fast = new Map(Object.entries(by).map(([u, t]) => [u, fastVoteReason(t)]).filter(([, r]) => r));
  return json({ locked: !!c.announced, votes: results.map((v) => ({ id: v.id, email: v.email, category: v.category, entry: v.title || v.biz, no: v.entry_no, at: v.created_at, voided: !!v.voided, flags: fast.has(v.uid) ? [fast.get(v.uid)] : [] })) }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  if (c.announced) return err(400, "The winners are announced and the results are locked.");
  const b = await request.json().catch(() => ({}));
  const r = await env.DB.prepare("UPDATE votes SET voided = ? WHERE id = ? AND contest_id = ?").bind(b.voided ? 1 : 0, String(b.vote_id || ""), c.id).run();
  if (!r.meta.changes) return err(404, "That vote doesn't exist.");
  return json({ ok: true });
}
