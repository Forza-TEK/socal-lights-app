// PUT  /api/admin/event-video?id=<event id> (raw video bytes) — Admin uploads a clip for any event; it is approved at once.
// POST /api/admin/event-video { id, action: "approve" | "remove" } — Admin's decision on an event's uploaded video clip (the same step as a home's clip).
//   approve : the clip becomes public (events.video_ok = 1); the event card shows a Watch the video button.
//   remove  : deletes the clip (or the YouTube / Vimeo link) from the event.
import { json, err } from "../../_lib/util.js";
import { clearEventVideo, setEventClip } from "../../_lib/eventvideo.js";
import { tell } from "../../_lib/notify.js";

// The person is told about an uploaded clip's approval or removal (F-26): best effort, never blocks the action (tell() catches and logs).
const tellOwner = async (env, waitUntil, ev, tpl) => {
  try {
    const s = await env.DB.prepare("SELECT contact_email FROM event_submissions WHERE event_id = ? ORDER BY created_at LIMIT 1").bind(ev.id).first();
    if (s) tell(env, waitUntil, s.contact_email, tpl, { name: ev.name || "your event", link: "https://socallights.app/profile#events" });
  } catch {}
};

export async function onRequestPost({ request, env, waitUntil }) {
  const b = await request.json().catch(() => null);
  if (!b || typeof b.id !== "string") return err(400, "Choose an event.");
  const ev = await env.DB.prepare("SELECT id, name, video, video_file, video_ok FROM events WHERE id = ?").bind(b.id).first();
  if (!ev) return err(404, "That event is gone.");
  if (b.action === "approve") {
    if (!ev.video_file) return err(409, "This event has no uploaded clip waiting.");
    await env.DB.prepare("UPDATE events SET video_ok = 1, updated_at = datetime('now') WHERE id = ?").bind(ev.id).run();
    if (!ev.video_ok) await tellOwner(env, waitUntil, ev, "video_live"); // only the first approval, not a repeat tap
    return json({ ok: true, video: { file: ev.video_file, ok: true } });
  }
  if (b.action === "remove") { await clearEventVideo(env, ev); if (ev.video_file) await tellOwner(env, waitUntil, ev, "video_removed"); return json({ ok: true, video: { file: "", ok: false } }); }
  return err(400, "Unknown action.");
}

export async function onRequestPut({ request, env }) {
  const id = new URL(request.url).searchParams.get("id") || "";
  const ev = await env.DB.prepare("SELECT id, video_file FROM events WHERE id = ?").bind(id).first();
  if (!ev) return err(404, "That event is gone.");
  if (Number(request.headers.get("content-length") || 0) > 45 * 1024 * 1024) return err(413, "That video is too large. Use one under 40 MB.");
  const r = await setEventClip(env, ev, await request.arrayBuffer());
  if (r.error) return err(r.status, r.error);
  await env.DB.prepare("UPDATE events SET video_ok = 1 WHERE id = ?").bind(id).run(); // Admin's own upload needs no approval
  return json({ ok: true, video: { file: r.video.file, ok: true } });
}
