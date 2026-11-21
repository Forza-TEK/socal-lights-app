// One uploaded video clip on an event (events.video_file, a key "ev/<eventId>/<time>.<ext>" in the PHOTOS bucket). Same rules as a home's clip (postvideo.js):
// 40 MB, MP4 / MOV / WebM, public only once Admin approves it (events.video_ok = 1); the organizer can watch it meanwhile. A YouTube or Vimeo link (events.video) and a clip replace each other.
import { MAX_VIDEO_BYTES, sniffVideo, videoUrl } from "./postvideo.js";
import { parseVideo } from "../../public/video.js";

export const EVENT_VIDEO_KEY_RE = /^ev\/([a-z0-9-]{3,40})\/(\d{1,14})\.(mp4|mov|webm)$/;
// The public field: the approved clip's address (the card shows a Watch button), or nothing.
export const publicEventClip = (r) => (r.video_file && r.video_ok ? videoUrl(r.video_file) : "");

export async function setEventClip(env, ev, buf) {
  if (!buf.byteLength) return { error: "Choose a video.", status: 400 };
  if (buf.byteLength > MAX_VIDEO_BYTES) return { error: `That video is too large. Use one under ${Math.round(MAX_VIDEO_BYTES / 1048576)} MB (about a minute from a phone).`, status: 413 };
  const kind = sniffVideo(buf);
  if (!kind) return { error: "Videos must be MP4, MOV or WebM.", status: 400 };
  const key = `ev/${ev.id}/${Date.now()}.${kind.ext}`; // a new name every time: videos are cached by their address
  await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: kind.type } });
  if (ev.video_file) await env.PHOTOS.delete(ev.video_file);
  await env.DB.prepare("UPDATE events SET video = '', video_file = ?, video_ok = 0, updated_at = datetime('now') WHERE id = ?").bind(key, ev.id).run();
  return { video: { link: "", file: key, ok: false } };
}
export async function setEventLink(env, ev, raw) {
  const text = String(raw || "").trim();
  if (!text) return clearEventVideo(env, ev);
  const v = parseVideo(text);
  if (!v) return { error: "Paste a YouTube or Vimeo link.", status: 400 };
  if (ev.video_file) await env.PHOTOS.delete(ev.video_file);
  await env.DB.prepare("UPDATE events SET video = ?, video_file = '', video_ok = 0, updated_at = datetime('now') WHERE id = ?").bind(v.watch, ev.id).run();
  return { video: { link: v.watch, file: "", ok: false } };
}
export async function clearEventVideo(env, ev) {
  if (ev.video_file) await env.PHOTOS.delete(ev.video_file);
  await env.DB.prepare("UPDATE events SET video = '', video_file = '', video_ok = 0, updated_at = datetime('now') WHERE id = ?").bind(ev.id).run();
  return { video: { link: "", file: "", ok: false } };
}
