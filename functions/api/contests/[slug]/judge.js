// The judges' ballot. Judges sign in with the email they were invited at; they vote separately from the public.
// GET  /api/contests/<slug>/judge  the homes, this judge's picks/scores/recusals, and how far along they are
// POST /api/contests/<slug>/judge  { action: "pick", post_id, category } | { action: "score", post_id, category, score } | { action: "conflict", post_id, on }
import { json, err } from "../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { getContest, windows, cats, judgeOf, modeOf } from "../../../_lib/contests.js";

async function gate(request, env, slug) {
  const user = await getUser(request, env);
  if (!user) return { res: err(401, "Sign in with the email you were invited at.") };
  const c = await getContest(env, slug);
  if (!c || c.status !== "live") return { res: err(404, "This contest isn't available.") };
  const j = await judgeOf(env, c, user);
  if (!j) return { res: err(403, "This email isn't on the judges list for this contest.") };
  if (!j.user_id) await env.DB.prepare("UPDATE judges SET user_id = ? WHERE id = ?").bind(user.id, j.id).run();
  return { c, user, j };
}

export async function onRequestGet({ params, request, env }) {
  const { c, user, j, res } = await gate(request, env, params.slug);
  if (res) return res;
  const { results: posts } = await env.DB.prepare("SELECT id,title,biz,address,city,photos,entry_no,user_id FROM posts WHERE contest_id = ? AND status = 'approved' ORDER BY entry_no").bind(c.id).all();
  const q = (sql) => env.DB.prepare(sql).bind(c.id, j.id).all().then((r) => r.results);
  const [picks, scores, conflicts] = await Promise.all([q("SELECT category, post_id FROM judge_picks WHERE contest_id = ? AND judge_id = ?"), q("SELECT category, post_id, score FROM judge_scores WHERE contest_id = ? AND judge_id = ?"), q("SELECT post_id FROM judge_conflicts WHERE contest_id = ? AND judge_id = ?")]);
  return json({
    contest: { slug: c.slug, name: c.name, org: c.org, categories: cats(c), method: c.judge_method === "score" ? "score" : "pick", mode: modeOf(c), votingOpen: windows(c).votingOpen, announced: !!c.announced, voteStart: c.vote_start, voteEnd: c.vote_end },
    entries: posts.map((p) => ({ id: p.id, name: p.title || p.biz, address: p.address, city: p.city, photos: JSON.parse(p.photos || "[]"), no: p.entry_no, mine: p.user_id === user.id })),
    picks, scores, conflicts: conflicts.map((x) => x.post_id),
  }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, user, j, res } = await gate(request, env, params.slug);
  if (res) return res;
  if (!windows(c).votingOpen) return err(400, "Voting isn't open right now.");
  const b = await request.json().catch(() => ({}));
  const post = await env.DB.prepare("SELECT id, user_id FROM posts WHERE id = ? AND contest_id = ? AND status = 'approved'").bind(String(b.post_id || ""), c.id).first();
  if (!post) return err(404, "That home isn't in this contest.");
  if (post.user_id === user.id) return err(400, "You can't judge your own home.");
  if (b.action === "conflict") {
    if (b.on) await env.DB.prepare("INSERT OR IGNORE INTO judge_conflicts (contest_id,judge_id,post_id) VALUES (?,?,?)").bind(c.id, j.id, post.id).run();
    else await env.DB.prepare("DELETE FROM judge_conflicts WHERE contest_id = ? AND judge_id = ? AND post_id = ?").bind(c.id, j.id, post.id).run();
    return json({ ok: true });
  }
  const category = String(b.category || "");
  if (!cats(c).includes(category)) return err(400, "Choose one of the contest's categories.");
  if (b.action === "pick") {
    if (c.judge_method === "score") return err(400, "This contest uses scores, not picks.");
    await env.DB.prepare("INSERT INTO judge_picks (contest_id,judge_id,category,post_id) VALUES (?,?,?,?) ON CONFLICT(contest_id,judge_id,category) DO UPDATE SET post_id = excluded.post_id, created_at = datetime('now')").bind(c.id, j.id, category, post.id).run();
    return json({ ok: true });
  }
  if (b.action === "score") {
    if (c.judge_method !== "score") return err(400, "This contest uses picks, not scores.");
    const n = parseInt(b.score, 10);
    if (b.score === "" || b.score === null) { await env.DB.prepare("DELETE FROM judge_scores WHERE contest_id = ? AND judge_id = ? AND post_id = ? AND category = ?").bind(c.id, j.id, post.id, category).run(); return json({ ok: true }); }
    if (!(n >= 1 && n <= 10)) return err(400, "Scores run from 1 to 10.");
    await env.DB.prepare("INSERT INTO judge_scores (contest_id,judge_id,post_id,category,score) VALUES (?,?,?,?,?) ON CONFLICT(contest_id,judge_id,post_id,category) DO UPDATE SET score = excluded.score").bind(c.id, j.id, post.id, category, n).run();
    return json({ ok: true });
  }
  return err(400, "Unknown action.");
}
