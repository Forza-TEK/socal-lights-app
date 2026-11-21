// POST /api/admin/event-video { id, action: "approve" | "remove" } — Admin's decision on an event's uploaded video clip (the same step as a home's clip).
//   approve : the clip becomes public (events.video_ok = 1); the event card shows a Watch the video button.
//   remove  : deletes the clip (or the YouTube / Vimeo link) from the event.
import { json, err } from "../../_lib/util.js";
import { clearEventVideo } from "../../_lib/eventvideo.js";

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (!b || typeof b.id !== "string") return err(400, "Choose an event.");
  const ev = await env.DB.prepare("SELECT id, video, video_file FROM events WHERE id = ?").bind(b.id).first();
  if (!ev) return err(404, "That event is gone.");
  if (b.action === "approve") {
    if (!ev.video_file) return err(409, "This event has no uploaded clip waiting.");
    await env.DB.prepare("UPDATE events SET video_ok = 1, updated_at = datetime('now') WHERE id = ?").bind(ev.id).run();
    return json({ ok: true, video: { file: ev.video_file, ok: true } });
  }
  if (b.action === "remove") { await clearEventVideo(env, ev); return json({ ok: true, video: { file: "", ok: false } }); }
  return err(400, "Unknown action.");
}
