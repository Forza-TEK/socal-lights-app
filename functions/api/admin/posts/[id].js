// POST   /api/admin/posts/<id>  {action: "approve" | "decline" | "edit"}
// POST   /api/admin/posts/<id>  {action: "photo_remove" | "photo_move", key, to}  or multipart "photos" files: manage the house's photos (first = cover)
// DELETE /api/admin/posts/<id>  removes the post and its photos
import { phoneField, line, normText, normName, normStreet, normZip } from "../../../_lib/fields.js";
import { json, err, clean, safeUrl, geocodeAddress, nearestCounty } from "../../../_lib/util.js";
import { CITY } from "../../../../public/cities.js";
import { SEASONS } from "../../../../public/seasons.js";

const MAX_PHOTOS = 8, MAX_BYTES = 6 * 1024 * 1024;
function sniff(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: "webp", type: "image/webp" };
  return null;
}
async function getPost(env, id) {
  return env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first();
}
async function deletePhotos(env, keys) {
  await Promise.all(keys.map((k) => env.PHOTOS.delete(k)));
}

export async function onRequestPost({ params, request, env }) {
  const row = await getPost(env, params.id);
  if (!row) return err(404, "That post no longer exists.");
  const keys = JSON.parse(row.photos || "[]");
  const save = (list) => env.DB.prepare("UPDATE posts SET photos=? WHERE id=?").bind(JSON.stringify(list), row.id).run();

  // Add photos (multipart). Live houses keep them in the public folder, waiting ones in the private pending folder.
  if ((request.headers.get("content-type") || "").includes("multipart/form-data")) {
    let form; try { form = await request.formData(); } catch { return err(400, "The photos couldn't be read. Try again."); }
    const files = form.getAll("photos").filter((f) => f && typeof f === "object" && f.size > 0);
    if (!files.length) return err(400, "Choose at least one photo.");
    if (keys.length + files.length > MAX_PHOTOS) return err(400, `A house can have ${MAX_PHOTOS} photos. It has ${keys.length}; remove one first.`);
    const dir = row.status === "approved" ? "p" : "pending", added = [];
    // Photo files are numbered (1.jpg, 2.png ...), which is what the photo routes accept. Use the next number up so a cached older photo is never reused.
    const nums = keys.map((k) => Number((k.match(/\/(\d+)\.\w+$/) || [])[1]) || 0);
    const nextNum = () => { let n = Math.max(0, ...nums) + 1; if (n > 99) { n = 1; while (nums.includes(n)) n++; } nums.push(n); return n; };
    try {
      for (const f of files) {
        if (f.size > MAX_BYTES) throw new Error("A photo is too large. Use photos under 6 MB.");
        const buf = await f.arrayBuffer(), kind = sniff(buf);
        if (!kind) throw new Error("Photos must be JPG, PNG or WebP.");
        const key = `${dir}/${row.id}/${nextNum()}.${kind.ext}`;
        await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: kind.type } });
        added.push(key);
      }
    } catch (e) { await deletePhotos(env, added); return err(400, e.message || "A photo couldn't be saved."); }
    const list = [...keys, ...added]; await save(list);
    return json({ ok: true, photos: list });
  }

  const body = await request.json().catch(() => ({}));

  if (body.action === "photo_remove") {
    if (!keys.includes(body.key)) return err(404, "That photo is already gone.");
    await deletePhotos(env, [body.key]);
    const list = keys.filter((k) => k !== body.key); await save(list);
    return json({ ok: true, photos: list });
  }
  if (body.action === "photo_move") {
    const i = keys.indexOf(body.key), to = Math.max(0, Math.min(keys.length - 1, Number(body.to) || 0));
    if (i < 0) return err(404, "That photo is already gone.");
    const list = keys.slice(); list.splice(i, 1); list.splice(to, 0, body.key); await save(list);
    return json({ ok: true, photos: list });
  }

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

  if (body.action === "unpublish") {
    // Takes a live home off the site without deleting anything; it waits in "Waiting for review" and can be published again
    // The photos go back to the private pending/ folder too, so the public photo address stops working
    const moved = [];
    for (const k of keys) {
      if (!k.startsWith("p/")) { moved.push(k); continue; }
      const obj = await env.PHOTOS.get(k);
      if (!obj) continue;
      const nk = k.replace(/^p\//, "pending/");
      await env.PHOTOS.put(nk, obj.body, { httpMetadata: obj.httpMetadata });
      moved.push(nk);
    }
    await env.DB.prepare("UPDATE posts SET status='pending', approved_at=NULL, photos=? WHERE id=?").bind(JSON.stringify(moved), row.id).run();
    await deletePhotos(env, keys.filter((k) => k.startsWith("p/")));
    return json({ ok: true });
  }

  if (body.action === "decline") {
    await deletePhotos(env, keys);
    await env.DB.prepare("UPDATE posts SET status='declined', photos='[]' WHERE id=?").bind(row.id).run();
    return json({ ok: true });
  }

  if (body.action === "edit") {
    const city = CITY[body.city] ? body.city : row.city;
    const kind = body.kind === "installer" ? "installer" : body.kind === "homeowner" ? "homeowner" : row.poster_type || "homeowner";
    const street = normStreet(clean(body.street ?? row.street, 120)), zip = normZip(clean(body.zip ?? row.zip, 12)) || clean(body.zip ?? row.zip, 10);
    if (zip && !/^\d{5}$/.test(zip)) return err(400, "The ZIP code needs 5 digits.");
    const ph = phoneField(body.phone ?? row.phone); if (ph.error) return err(400, ph.error);
    const address = body.street !== undefined ? (street ? `${street}, ${city}, CA${zip ? " " + zip : ""}` : "") : clean(body.address ?? row.address, 160);
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
    await env.DB.prepare("UPDATE posts SET biz=?, title=?, city=?, county=?, lat=?, lng=?, web=?, phone=?, where_txt=?, descr=?, address=?, show_address=?, season=?, poster_type=?, street=?, zip=?, service_area=? WHERE id=?")
      .bind(normName(clean(body.biz ?? row.biz, 80)), normName(clean(body.title ?? row.title, 90)), city, county, lat, lng,
        safeUrl(body.web ?? row.web), ph.value, line(body.where ?? row.where_txt, 120),
        normText(clean(body.desc ?? row.descr, 1200)), address, address ? 1 : 0, season, kind, street, zip, line(body.area ?? row.service_area, 240), row.id).run();
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
