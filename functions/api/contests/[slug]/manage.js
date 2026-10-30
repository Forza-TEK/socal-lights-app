// GET /api/contests/<slug>/manage — organizer only: every entry, including waiting and declined ones, with contact details.
import { json } from "../../../_lib/util.js";
import { getUser } from "../../../_lib/auth.js";
import { ownerOf } from "../../../_lib/contests.js";

export async function onRequestGet({ params, request, env }) {
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const { results } = await env.DB.prepare(
    `SELECT p.id,p.status,p.title,p.biz,p.address,p.photos,p.entry_no,p.created_at,u.email AS contact,
            (SELECT COUNT(*) FROM votes v WHERE v.post_id = p.id) AS votes
     FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.contest_id = ? ORDER BY p.entry_no`).bind(c.id).all();
  return json({ entries: results.map((r) => ({ ...r, photos: JSON.parse(r.photos || "[]") })) }, { headers: { "cache-control": "no-store" } });
}
