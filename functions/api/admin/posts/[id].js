// POST   /api/admin/posts/<id>  {action: "approve" | "decline"}
// DELETE /api/admin/posts/<id>  removes the post and its photos
import { json, err, clean, safeUrl } from "../../../_lib/util.js";
import { CITY } from "../../../../public/cities.js";

async function getPost(env, id) {
  return env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first();
}
async function deletePhotos(env, keys) {
  await Promise.all(keys.map((k) => env.PHOTOS.delete(k)));
}

export async function onRequestPost({ params, request, env }) {
  const row = await getPost(env, params.id);
  if (!row) return err(404, "That post no longer exists.");
  const body = await request.json().catch(() => ({}));
  const keys = JSON.parse(row.photos || "[]");

  if (body.action === "approve") {
    // Move photos from pending/ to p/ so the public photo route can serve them
    const moved = [];
    for (const k of keys) {
      if (k.startsWith("p/")) { moved.push(k); continue; }
      const obj = await env.PHOTOS.get(k);
      if (!obj) continue;
      const nk = k.replace(/^pending\//, "p/");
      await env.PHOTOS.put(nk, obj.body, { httpMetadata: obj.httpMetadata });
      moved.push(nk);
    }
    await env.DB.prepare("UPDATE posts SET status='approved', photos=?, approved_at=datetime('now') WHERE id=?")
      .bind(JSON.stringify(moved), row.id).run();
    await deletePhotos(env, keys.filter((k) => k.startsWith("pending/")));
    return json({ ok: true });
  }

  if (body.action === "decline") {
    await deletePhotos(env, keys);
    await env.DB.prepare("UPDATE posts SET status='declined', photos='[]' WHERE id=?").bind(row.id).run();
    return json({ ok: true });
  }

  if (body.action === "edit") {
    const city = CITY[body.city] ? body.city : row.city;
    const [lat, lng] = CITY[city];
    await env.DB.prepare("UPDATE posts SET biz=?, title=?, city=?, lat=?, lng=?, web=?, phone=?, where_txt=?, descr=? WHERE id=?")
      .bind(clean(body.biz ?? row.biz, 80), clean(body.title ?? row.title, 90), city, lat, lng,
        safeUrl(body.web ?? row.web), clean(body.phone ?? row.phone, 80), clean(body.where ?? row.where_txt, 120),
        clean(body.desc ?? row.descr, 1200), row.id).run();
    return json({ ok: true });
  }

  return err(400, "Unknown action.");
}

export async function onRequestDelete({ params, env }) {
  const row = await getPost(env, params.id);
  if (!row) return json({ ok: true });
  await deletePhotos(env, JSON.parse(row.photos || "[]"));
  await env.DB.prepare("DELETE FROM posts WHERE id=?").bind(row.id).run();
  return json({ ok: true });
}
