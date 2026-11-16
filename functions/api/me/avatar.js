// Profile picture. The browser shrinks the photo to a 256px square JPEG first; we only accept small images.
// GET    /api/me/avatar   your picture (signed in only)
// POST   /api/me/avatar   body = the image (image/jpeg, png or webp, at most 300 KB)
// DELETE /api/me/avatar   remove it
import { err, json } from "../../_lib/util.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";
import { sniffImage } from "../../_lib/imgsniff.js";
import { checkThrottle, hashKey } from "../../_lib/throttle.js";

const MAX = 300_000, TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function onRequestGet({ request, env }) {
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const row = await env.DB.prepare("SELECT avatar FROM users WHERE id = ?").bind(user.id).first();
  if (!row || !row.avatar) return err(404, "No picture.");
  const obj = await env.PHOTOS.get(row.avatar);
  if (!obj) return err(404, "No picture.");
  return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType || "image/jpeg", "cache-control": "private, max-age=3600" } });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const type = (request.headers.get("content-type") || "").split(";")[0].trim();
  if (!TYPES.includes(type)) return err(400, "Use a JPG, PNG or WebP photo.");
  const buf = await request.arrayBuffer();
  if (buf.byteLength < 100 || buf.byteLength > MAX) return err(400, "That photo is too large. Try a smaller one.");
  // L10: judge the picture by its bytes, not by the type the browser declared, and cap the changes (10 a day per account)
  const real = sniffImage(buf);
  if (!real) return err(400, "Use a JPG, PNG or WebP photo.");
  const slow = await checkThrottle(env, [{ kind: "avatar", key: await hashKey(env, "u", user.id), max: 10, windowHours: 24, msg: "That is a lot of profile picture changes for one day. Please try again tomorrow." }]);
  if (slow) return err(429, slow);
  const key = `avatars/${user.id}-${Date.now().toString(36)}`;
  await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: real.type } });
  const old = await env.DB.prepare("SELECT avatar FROM users WHERE id = ?").bind(user.id).first();
  await env.DB.prepare("UPDATE users SET avatar = ? WHERE id = ?").bind(key, user.id).run();
  if (old && old.avatar) await env.PHOTOS.delete(old.avatar);
  return json({ ok: true, avatar: `/api/me/avatar?v=${key.split("-").pop()}` });
}

export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const old = await env.DB.prepare("SELECT avatar FROM users WHERE id = ?").bind(user.id).first();
  await env.DB.prepare("UPDATE users SET avatar = '' WHERE id = ?").bind(user.id).run();
  if (old && old.avatar) await env.PHOTOS.delete(old.avatar);
  return json({ ok: true });
}
