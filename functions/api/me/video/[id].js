// /api/me/video/<postId> — add, replace or remove the one video on a home or a contest entry the signed-in person posted.
//   PUT  (raw video bytes, Content-Type video/*) : an uploaded clip. It waits for Admin's approval before anyone else can watch it.
//   POST { action: "link", url }                 : a YouTube or Vimeo link (public at once). An empty url removes the video.
//   POST { action: "remove" }                    : removes the video (link or clip).
// Contest entries can change their video until voting closes, like their photos (functions/_lib/entryphotos.js photosOpen).
import { json, err } from "../../../_lib/util.js";
import { requireUser, sameOrigin, normEmail } from "../../../_lib/auth.js";
import { checkThrottle, hashKey } from "../../../_lib/throttle.js";
import { photosOpen } from "../../../_lib/entryphotos.js";
import { setVideoFile, setVideoLink, clearVideo } from "../../../_lib/postvideo.js";

async function mine(env, user, id) {
  const row = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first();
  if (!row || !(row.user_id === user.id || normEmail(row.contact_email) === user.email)) return { res: err(404, "That listing isn't yours.") };
  if (row.contest_id) {
    const c = await env.DB.prepare("SELECT * FROM contests WHERE id = ?").bind(row.contest_id).first();
    if (!c || !photosOpen(c)) return { res: err(403, "This contest no longer takes changes to entries.") };
  }
  return { row };
}
const out = (row, v) => json({ ok: true, video: { link: v.video.link, file: v.video.file, ok: v.video.ok, waiting: !!v.video.file && !v.video.ok } });

export async function onRequestPut({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const a = await mine(env, user, params.id);
  if (a.res) return a.res;
  const slow = await checkThrottle(env, [{ kind: "post-video", key: await hashKey(env, "u", user.id), max: 12, windowHours: 24, msg: "That is a lot of video changes for one day. Try again tomorrow." }]);
  if (slow) return err(429, slow);
  const len = Number(request.headers.get("content-length") || 0);
  if (len > 45 * 1024 * 1024) return err(413, "That video is too large. Use one under 40 MB (about a minute from a phone).");
  const r = await setVideoFile(env, a.row, await request.arrayBuffer());
  if (r.error) return err(r.status, r.error);
  return out(a.row, r);
}

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const a = await mine(env, user, params.id);
  if (a.res) return a.res;
  const b = await request.json().catch(() => ({}));
  if (b.action === "link") { const r = await setVideoLink(env, a.row, b.url); if (r.error) return err(r.status, r.error); return out(a.row, r); }
  if (b.action === "remove") return out(a.row, await clearVideo(env, a.row));
  return err(400, "Unknown action.");
}
