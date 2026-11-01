// GET /api/contests/<slug>/stats — organizer: page visits by source and votes per day.
import { json } from "../../../_lib/util.js";
import { getUser } from "../../../_lib/auth.js";
import { ownerOf } from "../../../_lib/contests.js";

export async function onRequestGet({ params, request, env }) {
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results);
  const [hits, votes, voters, leads] = await Promise.all([
    q("SELECT day, src, n FROM contest_hits WHERE contest_id = ? ORDER BY day", c.id),
    q("SELECT substr(created_at,1,10) AS day, COUNT(*) AS n FROM votes WHERE contest_id = ? GROUP BY day ORDER BY day", c.id),
    q("SELECT COUNT(DISTINCT user_id) AS n FROM votes WHERE contest_id = ?", c.id),
    q("SELECT name, email, phone, note, created_at FROM contest_leads WHERE contest_id = ? ORDER BY created_at DESC LIMIT 100", c.id),
  ]);
  const total = (f) => hits.filter(f).reduce((s, h) => s + h.n, 0);
  return json({ views: total(() => true), qr: total((h) => h.src === "qr"), shares: total((h) => h.src === "share"), votesByDay: votes, voters: voters[0].n, leads }, { headers: { "cache-control": "no-store" } });
}
