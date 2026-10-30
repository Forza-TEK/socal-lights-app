// GET /api/contests/<slug>/photo/pending/<postId>/<n>.<ext> — the organizer previews photos of entries that aren't approved yet.
import { getUser } from "../../../../_lib/auth.js";
import { ownerOf } from "../../../../_lib/contests.js";

export async function onRequestGet({ params, request, env }) {
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const key = (params.path || []).join("/");
  const m = key.match(/^pending\/([a-z0-9]{8,32})\/\d{1,2}\.(jpg|png|webp)$/);
  if (!m) return new Response("Not found", { status: 404 });
  const post = await env.DB.prepare("SELECT id FROM posts WHERE id = ? AND contest_id = ?").bind(m[1], c.id).first();
  const obj = post && (await env.PHOTOS.get(key));
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers(); obj.writeHttpMetadata(h); h.set("cache-control", "private, max-age=300");
  return new Response(obj.body, { headers: h });
}
