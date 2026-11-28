// GET /api/photo/p/<postId>/<name> — serves approved photos only.
// GET /api/photo/e/<eventId>/<name> — a photo the owner of an event added (public, like p/).
// GET /api/photo/v/<postId>/<name> — the video clip of a live home, once Admin approved it (Range supported). Before that only the person who posted it can open it.
// GET /api/photo/ev/<eventId>/<name> — the video clip of an event, once Admin approved it (Range supported). Before that only the person who added the event can open it.
// GET /api/photo/pending/<postId>/<name> — a photo of a home that is in review, declined or taken down: only the person who posted it (or the organizers of its contest) can open it, never cached by shared caches.
// GET /api/photo/h/<postId>/<name> — a photo the homeowner hid: only that homeowner and the organizers of the contest can open it (never cached by shared caches).
import { getUser } from "../../_lib/auth.js";
import { isStaff } from "../../_lib/contests.js";
import { EVENT_KEY_RE } from "../../_lib/eventphotos.js";
import { VIDEO_KEY_RE, serveVideo } from "../../_lib/postvideo.js";
import { EVENT_VIDEO_KEY_RE } from "../../_lib/eventvideo.js";

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
  const evv = EVENT_VIDEO_KEY_RE.exec(key);
  if (evv) {
    // Found by the clip's own key, not by the event id inside it: two listings can be merged (migration 0285 + 0286), and the clip then belongs to the surviving event.
    const ev = await env.DB.prepare("SELECT id, video_file, video_ok FROM events WHERE video_file = ?").bind(key).first();
    if (!ev) return new Response("Not found", { status: 404 });
    if (ev.video_ok) return serveVideo(env, key, request, "public, max-age=3600");
    const user = await getUser(request, env);
    const mine = user && (await env.DB.prepare("SELECT 1 AS x FROM event_submissions WHERE event_id = ? AND lower(contact_email) = ?").bind(ev.id, String(user.email || "").toLowerCase()).first());
    if (mine) return serveVideo(env, key, request, "private, no-store");
    return new Response("Not found", { status: 404 });
  }
  const hidden = /^(?:h|pending)\/([a-z0-9]{8,32})\/\d{1,14}\.(jpg|png|webp)$/.exec(key);
  if (!hidden && !/^p\/[a-z0-9]{8,32}\/\d{1,14}\.(jpg|png|webp)$/.test(key) && !EVENT_KEY_RE.test(key)) return new Response("Not found", { status: 404 });
  if (hidden) {
    const user = await getUser(request, env);
    const post = user && (await env.DB.prepare("SELECT user_id, contact_email, contest_id FROM posts WHERE id = ?").bind(hidden[1]).first());
    const c = post && post.contest_id ? await env.DB.prepare("SELECT * FROM contests WHERE id = ?").bind(post.contest_id).first() : null;
    const poster = post && (post.user_id === user.id || (key.startsWith("pending/") && post.contact_email && String(post.contact_email).toLowerCase() === String(user.email || "").toLowerCase()));
    if (!post || !(poster || (c && (await isStaff(env, c, user))))) return new Response("Not found", { status: 404 });
  }
  const obj = await env.PHOTOS.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag);
  h.set("cache-control", hidden ? "private, no-store" : "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers: h });
}
