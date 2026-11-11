// Adding and removing photos on a home the signed-in person posted (the profile's edit sheet). Same rules as a new submission (functions/api/submit.js):
// at most 8 photos, JPG, PNG or WebP (checked by their first bytes, not the file name), under 6 MB each (the browser shrinks them first).
// A live home keeps its photos under p/<id>/ (public); a taken-down or in-review home keeps them under pending/<id>/ (private), so they are never public by accident.
import { MAX_PHOTOS, MAX_BYTES, sniff } from "./entryphotos.js";

const arr = (s) => { try { const a = JSON.parse(s || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };
export const photoPrefix = (row) => (row.status === "approved" ? "p/" : "pending/");
const save = (env, id, keys) => env.DB.prepare("UPDATE posts SET photos = ? WHERE id = ?").bind(JSON.stringify(keys), id).run();

// files: File objects. Returns { photos: [keys] } or { error, status }.
export async function addHomePhotos(env, row, files) {
  const keys = arr(row.photos);
  if (!files.length) return { error: "Choose at least one photo.", status: 400 };
  if (keys.length + files.length > MAX_PHOTOS) return { error: keys.length >= MAX_PHOTOS ? `This home already has ${MAX_PHOTOS} photos. Remove one to add another.` : `A home can have up to ${MAX_PHOTOS} photos. This one has room for ${MAX_PHOTOS - keys.length} more.`, status: 400 };
  const used = new Set(keys.map((k) => k.split("/").pop())), stored = [], pre = photoPrefix(row);
  let t = Date.now(); // a name is never reused on the same home (photos are cached for a year)
  try {
    for (const f of files) {
      if (f.size > MAX_BYTES) throw new Error("A photo is too large. Use photos under 6 MB.");
      const buf = await f.arrayBuffer(), kind = sniff(buf);
      if (!kind) throw new Error("Photos must be JPG, PNG or WebP.");
      let name = `${t}.${kind.ext}`; while (used.has(name)) name = `${++t}.${kind.ext}`;
      used.add(name); t++;
      const key = `${pre}${row.id}/${name}`;
      await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: kind.type } });
      stored.push(key);
    }
  } catch (e) {
    await Promise.all(stored.map((k) => env.PHOTOS.delete(k)));
    return { error: e.message || "A photo couldn't be saved.", status: 400 };
  }
  const next = [...keys, ...stored];
  await save(env, row.id, next);
  return { photos: next };
}

export async function removeHomePhoto(env, row, key) {
  const keys = arr(row.photos);
  if (!keys.includes(key)) return { error: "That photo isn't on this home.", status: 404 };
  const next = keys.filter((k) => k !== key);
  await save(env, row.id, next);
  await env.PHOTOS.delete(key);
  return { photos: next };
}

// Make one photo the cover (the first one).
export async function coverHomePhoto(env, row, key) {
  const keys = arr(row.photos);
  if (!keys.includes(key)) return { error: "That photo isn't on this home.", status: 404 };
  const next = [key, ...keys.filter((k) => k !== key)];
  await save(env, row.id, next);
  return { photos: next };
}
