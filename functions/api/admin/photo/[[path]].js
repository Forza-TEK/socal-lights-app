// GET /api/admin/photo/<key> — lets the admin preview pending photos, and uploaded video clips (Range supported), before approving.
import { VIDEO_KEY_RE, serveVideo } from "../../../_lib/postvideo.js";
export async function onRequestGet({ params, env, request }) {
  const key = (params.path || []).join("/");
  if (VIDEO_KEY_RE.test(key)) return serveVideo(env, key, request, "private, no-store");
  if (!/^(p|pending)\/[a-z0-9]{8,32}\/\d{1,14}\.(jpg|png|webp)$/.test(key)) return new Response("Not found", { status: 404 });
  const obj = await env.PHOTOS.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("cache-control", "private, max-age=300");
  return new Response(obj.body, { headers: h });
}
