// GET /api/installers/<slug>/logo — the company's logo. POST (owner, raw image body) replaces it; DELETE removes it.
import { json, err } from "../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";

function sniff(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return { ext: "webp", type: "image/webp" };
  return null;
}
export async function onRequestGet({ params, env }) {
  const inst = await env.DB.prepare("SELECT logo FROM installers WHERE slug = ? AND status = 'active'").bind(params.slug).first();
  const obj = inst && inst.logo && (await env.PHOTOS.get(inst.logo));
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers(); obj.writeHttpMetadata(h); h.set("cache-control", "public, max-age=3600");
  return new Response(obj.body, { headers: h });
}
async function owner(request, env, slug) {
  const user = await getUser(request, env);
  if (!user) return { res: err(401, "Please sign in first.") };
  const inst = await env.DB.prepare("SELECT * FROM installers WHERE slug = ?").bind(slug).first();
  if (!inst || inst.owner_email !== user.email) return { res: err(404, "That profile isn't yours.") };
  return { inst };
}
export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { inst, res } = await owner(request, env, params.slug);
  if (res) return res;
  const buf = await request.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > 600 * 1024) return err(400, "Use an image under 600 KB.");
  const t = sniff(buf);
  if (!t) return err(400, "The logo must be a JPG, PNG or WebP image.");
  const key = `installer/${inst.id}/logo-${Date.now().toString(36)}.${t.ext}`;
  await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: t.type } });
  if (inst.logo) await env.PHOTOS.delete(inst.logo);
  await env.DB.prepare("UPDATE installers SET logo = ? WHERE id = ?").bind(key, inst.id).run();
  return json({ ok: true });
}
export async function onRequestDelete({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { inst, res } = await owner(request, env, params.slug);
  if (res) return res;
  if (inst.logo) await env.PHOTOS.delete(inst.logo);
  await env.DB.prepare("UPDATE installers SET logo = '' WHERE id = ?").bind(inst.id).run();
  return json({ ok: true });
}
