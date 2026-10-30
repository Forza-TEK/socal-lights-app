// POST /api/contests/<slug>/vote { post_id, category } — one vote per person in each category. Every home is in every
// category; voting again in a category moves that vote.
import { json, err, newId } from "../../../_lib/util.js";
import { requireUser, sameOrigin } from "../../../_lib/auth.js";
import { getContest, windows, cats, hasPublic, judgeOf } from "../../../_lib/contests.js";

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
  const had = await env.DB.prepare("SELECT post_id FROM votes WHERE contest_id = ? AND user_id = ? AND category = ?").bind(c.id, user.id, category).first();
  // The unique key (contest, person, category) is the real guarantee: even two simultaneous requests can't make two rows.
  await env.DB.prepare("INSERT INTO votes (id,contest_id,user_id,post_id,category) VALUES (?,?,?,?,?) ON CONFLICT(contest_id,user_id,category) DO UPDATE SET post_id = excluded.post_id, created_at = datetime('now')")
    .bind(newId(), c.id, user.id, post.id, category).run();
  return json({ ok: true, moved: !!had && had.post_id !== post.id, same: !!had && had.post_id === post.id, name: post.title || post.biz });
}
