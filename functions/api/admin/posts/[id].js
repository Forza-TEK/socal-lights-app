// POST   /api/admin/posts/<id>  {action: "approve" | "decline" | "edit"}
// DELETE /api/admin/posts/<id>  removes the post and its photos
import { json, err, clean, safeUrl, geocodeAddress, nearestCounty } from "../../../_lib/util.js";
import { CITY } from "../../../../public/cities.js";
import { SEASONS } from "../../../../public/seasons.js";

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
    const address = clean(body.address ?? row.address, 160);
    const season = SEASONS[body.season] ? body.season : row.season;
    // Move the pin when the address or city changed (or the post has no exact pin yet); otherwise keep it where it is
    let { lat, lng, county } = row;
    if (address !== (row.address || "") || city !== row.city) {
      let pt = address ? await geocodeAddress(address, city, CITY[city]) : null;
      if (!pt && city !== row.city) pt = CITY[city];
      if (pt) {
        [lat, lng] = pt;
        const { results: evs } = await env.DB.prepare("SELECT lat, lng, county FROM events").all();
        county = nearestCounty(lat, lng, evs);
      } else if (address) return err(400, "Couldn't find that address. Check the street and city, or fix the pin another way.");
    }
    await env.DB.prepare("UPDATE posts SET biz=?, title=?, city=?, county=?, lat=?, lng=?, web=?, phone=?, where_txt=?, descr=?, address=?, show_address=?, season=? WHERE id=?")
      .bind(clean(body.biz ?? row.biz, 80), clean(body.title ?? row.title, 90), city, county, lat, lng,
        safeUrl(body.web ?? row.web), clean(body.phone ?? row.phone, 80), clean(body.where ?? row.where_txt, 120),
        clean(body.desc ?? row.descr, 1200), address, address ? 1 : 0, season, row.id).run();
    return json({ ok: true, lat, lng });
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
