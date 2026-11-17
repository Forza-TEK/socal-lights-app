// GET /api/photo/p/<postId>/<name> — serves approved photos only.
// GET /api/photo/e/<eventId>/<name> — a photo the owner of an event added (public, like p/).
// GET /api/photo/v/<postId>/<name> — the video clip of a live home, once Admin approved it (Range supported). Before that only the person who posted it can open it.
// GET /api/photo/h/<postId>/<name> — a photo the homeowner hid: only that homeowner and the organizers of the contest can open it (never cached by shared caches).
import { getUser } from "../../_lib/auth.js";
import { isStaff } from "../../_lib/contests.js";
import { EVENT_KEY_RE } from "../../_lib/eventphotos.js";
import { VIDEO_KEY_RE, serveVideo } from "../../_lib/postvideo.js";

export async function onRequestGet({ params, env, request }) {
  const key = (params.path || []).join("/");
  const vid = VIDEO_KEY_RE.exec(key);
  if (vid) {
    const post = await env.DB.prepare("SELECT status, user_id, contact_email, video_file, video_ok FROM posts WHERE id = ?").bind(vid[1]).first();
    if (!post || post.video_file !== key) return new Response("Not found", { status: 404 });
    if (post.status === "approved" && post.video_ok) return serveVideo(env, key, request, "public, max-age=3600");
    const user = await getUser(request, env);
    if (user && (post.user_id === user.id || String(post.contact_email || "").toLowerCase() === String(user.email || "").toLowerCase())) return serveVideo(env, key, request, "private, no-store");
    return new Response("Not found", { status: 404 });
  }
  const hidden = /^h\/([a-z0-9]{8,32})\/\d{1,14}\.(jpg|png|webp)$/.exec(key);
  if (!hidden && !/^p\/[a-z0-9]{8,32}\/\d{1,14}\.(jpg|png|webp)$/.test(key) && !EVENT_KEY_RE.test(key)) return new Response("Not found", { status: 404 });
  if (hidden) {
    const user = await getUser(request, env);
    const post = user && (await env.DB.prepare("SELECT user_id, contest_id FROM posts WHERE id = ?").bind(hidden[1]).first());
    const c = post && post.contest_id ? await env.DB.prepare("SELECT * FROM contests WHERE id = ?").bind(post.contest_id).first() : null;
    if (!post || !(post.user_id === user.id || (c && (await isStaff(env, c, user))))) return new Response("Not found", { status: 404 });
  }
  const obj = await env.PHOTOS.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag);
  h.set("cache-control", hidden ? "private, no-store" : "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers: h });
}
