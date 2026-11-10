// GET /api/contests/<slug>/manage — organizer only: every entry, including waiting and declined ones, with contact details.
import { json } from "../../../_lib/util.js";
import { getUser } from "../../../_lib/auth.js";
import { ownerOf } from "../../../_lib/contests.js";
import { photoLink, photosOpen } from "../../../_lib/entryphotos.js";

export async function onRequestGet({ params, request, env }) {
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const { results } = await env.DB.prepare(
    `SELECT p.id,p.status,p.title,p.biz,p.address,p.photos,p.entry_no,p.created_at,p.dq,u.email AS contact,(p.user_id = '') AS byOrganizer,p.photo_token,
            (SELECT COUNT(*) FROM votes v WHERE v.post_id = p.id AND v.voided = 0) AS votes
     FROM posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.contest_id = ? ORDER BY p.entry_no`).bind(c.id).all();
  const origin = new URL(request.url).origin, open = photosOpen(c);
  return json({ photosOpen: open, entries: results.map(({ photo_token, ...r }) => ({ ...r, byOrganizer: !!r.byOrganizer, photos: JSON.parse(r.photos || "[]"), photoLink: r.byOrganizer && photo_token ? photoLink(origin, photo_token) : "" })) }, { headers: { "cache-control": "no-store" } });
}
