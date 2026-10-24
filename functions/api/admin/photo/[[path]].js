// GET /api/admin/photo/<key> — lets the admin preview pending photos before approving.
export async function onRequestGet({ params, env }) {
  const key = (params.path || []).join("/");
  if (!/^(p|pending)\/[a-z0-9]{8,32}\/\d{1,2}\.(jpg|png|webp)$/.test(key)) return new Response("Not found", { status: 404 });
  const obj = await env.PHOTOS.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("cache-control", "private, max-age=300");
  return new Response(obj.body, { headers: h });
}
