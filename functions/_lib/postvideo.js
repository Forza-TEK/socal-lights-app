// One video on a home or a contest entry (a row in posts): either a YouTube or Vimeo link, or a short clip the person uploaded.
//   link : posts.video (the clean watch address), public at once, played from the privacy-friendly player addresses (public/video.js).
//   clip : posts.video_file = "v/<postId>/<name>" in the PHOTOS bucket. Public only once Admin approves it (posts.video_ok = 1), and only while the home is live.
// A clip is checked by its first bytes (MP4/MOV or WebM), is at most MAX_VIDEO_BYTES, and replaces any earlier video. The browser checks the length (about a minute) before it uploads.
import { parseVideo } from "../../public/video.js";

export const MAX_VIDEO_BYTES = 40 * 1024 * 1024;
export const VIDEO_KEY_RE = /^v\/([a-z0-9]{8,32})\/(\d{1,14})\.(mp4|mov|webm)$/;
export const VIDEO_TYPES = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" };

// What the file really is, from its first bytes: { ext, type } or null.
export function sniffVideo(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { ext: "webm", type: VIDEO_TYPES.webm };
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) { // "ftyp"
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    return brand === "qt  " ? { ext: "mov", type: VIDEO_TYPES.mov } : { ext: "mp4", type: VIDEO_TYPES.mp4 };
  }
  return null;
}

export const videoUrl = (key) => (key ? "/api/photo/" + key : "");
// The public fields for a post: the link, or the approved clip while the home is live. (A clip that is waiting or off is never in the public list.)
export function publicVideo(r) {
  if (r.status && r.status !== "approved") return {};
  const link = r.video ? parseVideo(r.video) : null;
  if (link) return { vid: link.watch };
  if (r.video_file && r.video_ok) return { vf: videoUrl(r.video_file) };
  return {};
}

// Saves a link (or clears everything with an empty one). Returns { video } or { error, status }.
export async function setVideoLink(env, row, raw) {
  const text = String(raw || "").trim();
  if (!text) return clearVideo(env, row);
  const v = parseVideo(text);
  if (!v) return { error: "Paste a YouTube or Vimeo link.", status: 400 };
  if (row.video_file) await env.PHOTOS.delete(row.video_file);
  await env.DB.prepare("UPDATE posts SET video = ?, video_file = '', video_ok = 0 WHERE id = ?").bind(v.watch, row.id).run();
  return { video: { link: v.watch, file: "", ok: false } };
}

// Saves an uploaded clip (the raw bytes). It waits for approval. Returns { video } or { error, status }.
export async function setVideoFile(env, row, buf) {
  if (!buf.byteLength) return { error: "Choose a video.", status: 400 };
  if (buf.byteLength > MAX_VIDEO_BYTES) return { error: `That video is too large. Use one under ${Math.round(MAX_VIDEO_BYTES / 1048576)} MB (about a minute from a phone).`, status: 413 };
  const kind = sniffVideo(buf);
  if (!kind) return { error: "Videos must be MP4, MOV or WebM.", status: 400 };
  const key = `v/${row.id}/${Date.now()}.${kind.ext}`; // a new name every time: videos are cached by their address
  await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: kind.type } });
  if (row.video_file) await env.PHOTOS.delete(row.video_file);
  await env.DB.prepare("UPDATE posts SET video = '', video_file = ?, video_ok = 0 WHERE id = ?").bind(key, row.id).run();
  return { video: { link: "", file: key, ok: false } };
}

export async function clearVideo(env, row) {
  if (row.video_file) await env.PHOTOS.delete(row.video_file);
  await env.DB.prepare("UPDATE posts SET video = '', video_file = '', video_ok = 0 WHERE id = ?").bind(row.id).run();
  return { video: { link: "", file: "", ok: false } };
}

// Streams a stored clip with Range support (phones need it to play and seek). cache: the Cache-Control to send.
export async function serveVideo(env, key, request, cache) {
  const range = request.headers.get("range");
  const obj = await env.PHOTOS.get(key, range ? { range: request.headers } : undefined);
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag); h.set("accept-ranges", "bytes"); h.set("cache-control", cache); h.set("x-content-type-options", "nosniff");
  if (range && obj.range) {
    const start = obj.range.offset ?? 0, end = obj.range.length != null ? start + obj.range.length - 1 : obj.size - 1;
    h.set("content-range", `bytes ${start}-${end}/${obj.size}`); h.set("content-length", String(end - start + 1));
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set("content-length", String(obj.size));
  return new Response(obj.body, { headers: h });
}
