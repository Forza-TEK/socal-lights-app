// Judges' progress, used by the organizer dashboard and the "announce anyway?" check.
// Pick judging: one pick in every category. Score judging: a score for every home in every category (their own home and recused homes excluded).
import { cats } from "./contests.js";

export async function judgeProgress(env, c, r) {
  const categories = cats(c), score = c.judge_method === "score";
  const { results: judges } = await env.DB.prepare("SELECT id, email, user_id, token FROM judges WHERE contest_id = ? ORDER BY created_at").bind(c.id).all();
  const conf = (await env.DB.prepare("SELECT judge_id, post_id FROM judge_conflicts WHERE contest_id = ?").bind(c.id).all()).results;
  const picks = (await env.DB.prepare("SELECT judge_id, COUNT(*) AS n FROM judge_picks WHERE contest_id = ? GROUP BY judge_id").bind(c.id).all()).results;
  const scores = (await env.DB.prepare("SELECT judge_id, post_id, category FROM judge_scores WHERE contest_id = ?").bind(c.id).all()).results;
  return judges.map((j) => {
    const skip = new Set(conf.filter((x) => x.judge_id === j.id).map((x) => x.post_id));
    const mineIds = new Set(r.posts.filter((p) => j.user_id && p.user_id === j.user_id).map((p) => p.id));
    const homes = r.posts.filter((p) => !skip.has(p.id) && !mineIds.has(p.id));
    if (score) { const total = homes.length * categories.length, done = scores.filter((x) => x.judge_id === j.id && homes.some((p) => p.id === x.post_id)).length; return { id: j.id, email: j.email, token: j.token, joined: !!j.user_id, done, total }; }
    return { id: j.id, email: j.email, token: j.token, joined: !!j.user_id, done: (picks.find((x) => x.judge_id === j.id) || { n: 0 }).n, total: categories.length };
  });
}
