// POST /api/contests/<slug>/vote { post_id, category } — one vote per person in each category. Every home is in every
// category; voting again in a category moves that vote.
import { json, err, newId, verifyTurnstile } from "../../../_lib/util.js";
import { requireUser, sameOrigin } from "../../../_lib/auth.js";
import { getContest, windows, cats, hasPublic, judgeOf, needsFirstVoteCheck } from "../../../_lib/contests.js";
import { voteThrottle } from "../../../_lib/throttle.js";

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const c = await getContest(env, params.slug);
  if (!c || c.status !== "live") return err(404, "This contest isn't available.");
  if (!windows(c).votingOpen) return err(400, "Voting isn't open right now.");
  if (!hasPublic(c)) return err(400, "Voting in this contest is by invited judges only.");
  if (await judgeOf(env, c, user)) return err(400, "You're a judge in this contest, so you vote on the Judges' ballot, not the public vote.");
  const b = await request.json().catch(() => ({}));
  const category = String(b.category || "");
  if (!cats(c).includes(category)) return err(400, "Choose one of the contest's categories.");
  const post = await env.DB.prepare("SELECT id,user_id,title,biz FROM posts WHERE id = ? AND contest_id = ? AND status = 'approved'").bind(String(b.post_id || ""), c.id).first();
  if (!post) return err(404, "That home isn't in this contest.");
  if (post.user_id === user.id) return err(400, "You can't vote for your own home.");
  // First vote of this account in this contest, in a contest with a prize or run by a city: an "I am human" check (Turnstile). Later votes (any category) need none.
  // "First" is "this account has no vote row in the contest yet" (voided votes keep their row), so nothing new is stored. No token or a failed one is refused before anything is written.
  if (needsFirstVoteCheck(c) && !(await env.DB.prepare("SELECT 1 AS x FROM votes WHERE contest_id = ? AND user_id = ? LIMIT 1").bind(c.id, user.id).first())) {
    const token = String(b["cf-turnstile-response"] || "");
    if (!(await verifyTurnstile(env, token, request.headers.get("CF-Connecting-IP") || ""))) return json({ error: token ? "That check did not pass. Please try again." : "Please complete the quick \"I am human\" check to cast your first vote.", needs_check: true }, { status: 400 });
  }
  const slow = await voteThrottle(env, request); // after the checks above, so a request that was refused anyway does not use up the allowance
  if (slow) return err(429, slow);
  const had = await env.DB.prepare("SELECT post_id FROM votes WHERE contest_id = ? AND user_id = ? AND category = ?").bind(c.id, user.id, category).first();
  // The unique key (contest, person, category) is the real guarantee: even two simultaneous requests can't make two rows.
  await env.DB.prepare("INSERT INTO votes (id,contest_id,user_id,post_id,category) VALUES (?,?,?,?,?) ON CONFLICT(contest_id,user_id,category) DO UPDATE SET post_id = excluded.post_id, created_at = datetime('now')")
    .bind(newId(), c.id, user.id, post.id, category).run();
  return json({ ok: true, moved: !!had && had.post_id !== post.id, same: !!had && had.post_id === post.id, name: post.title || post.biz });
}

// DELETE { category } — take your own vote back while voting is open. A vote the organizer voided stays voided (it keeps its row).
export async function onRequestDelete({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const c = await getContest(env, params.slug);
  if (!c || c.status !== "live") return err(404, "This contest isn't available.");
  if (!windows(c).votingOpen) return err(400, "Voting isn't open right now, so votes can't be changed.");
  const b = await request.json().catch(() => ({})), category = String(b.category || "");
  if (!cats(c).includes(category)) return err(400, "Choose one of the contest's categories.");
  await env.DB.prepare("DELETE FROM votes WHERE contest_id = ? AND user_id = ? AND category = ? AND COALESCE(voided, 0) = 0").bind(c.id, user.id, category).run();
  return json({ ok: true });
}
