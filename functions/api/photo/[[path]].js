// GET /api/photo/p/<postId>/<n>.<ext> — serves approved photos only.
export async function onRequestGet({ params, env }) {
  const key = (params.path || []).join("/");
  if (!/^p\/[a-z0-9]{8,32}\/\d{1,2}\.(jpg|png|webp)$/.test(key)) return new Response("Not found", { status: 404 });
  const obj = await env.PHOTOS.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag);
  h.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers: h });
}
