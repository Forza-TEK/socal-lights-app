// Photos the owner of an event adds (Your events > Edit): at most 4, JPG, PNG or WebP (checked by their first bytes, not the file name), under 6 MB each (the browser shrinks them first).
// Stored in R2 as e/<event id>/<name> (public, cached for a year), listed in events.owner_photos. <name> is a millisecond timestamp plus the extension and is never reused on the same
// event, because photos are cached for a year. The picture found on the event's web page (events.image / events.images) is untouched: the owner's photos are shown first, and
// when they are all removed that picture comes back. Same rules as a home's photos (homephotos.js).
// Kept free of imports on purpose: util.js (which almost everything loads) reads these helpers, so importing contests code here could make a loop.
const MAX_BYTES = 6 * 1024 * 1024;
function sniff(bytes) { // the same check as entryphotos.js: the first bytes decide the type, never the file name
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: "webp", type: "image/webp" };
  return null;
}

export const MAX_EVENT_PHOTOS = 4;
export const EVENT_KEY_RE = /^e\/[A-Za-z0-9_-]{4,64}\/\d{1,14}\.(jpg|png|webp)$/;
export const SITE_ORIGIN = "https://socallights.app";
export const ownerKeys = (v) => { try { const a = JSON.parse(v || "[]"); return Array.isArray(a) ? a.filter((k) => typeof k === "string" && EVENT_KEY_RE.test(k)).slice(0, MAX_EVENT_PHOTOS) : []; } catch { return []; } };
// The photos as web addresses (absolute, so the event page, the share picture and the structured data can use them like any other photo address).
export const ownerUrls = (keys) => keys.map((k) => `${SITE_ORIGIN}/api/photo/${k}`);
const save = (env, id, keys) => env.DB.prepare("UPDATE events SET owner_photos = ?, updated_at = datetime('now') WHERE id = ?").bind(keys.length ? JSON.stringify(keys) : null, id).run();

// ev: the events row ({ id, owner_photos }). files: File objects. Returns { photos: [keys] } or { error, status }.
export async function addEventPhotos(env, ev, files) {
  const keys = ownerKeys(ev.owner_photos);
  if (!files.length) return { error: "Choose at least one photo.", status: 400 };
  if (keys.length + files.length > MAX_EVENT_PHOTOS) return { error: keys.length >= MAX_EVENT_PHOTOS ? `This event already has ${MAX_EVENT_PHOTOS} photos. Remove one to add another.` : `An event can have up to ${MAX_EVENT_PHOTOS} photos. You can add ${MAX_EVENT_PHOTOS - keys.length} more.`, status: 400 };
  const used = new Set(keys.map((k) => k.split("/").pop())), stored = [];
  let t = Date.now();
  try {
    for (const f of files) {
      if (f.size > MAX_BYTES) throw new Error("A photo is too large. Use photos under 6 MB.");
      const buf = await f.arrayBuffer(), kind = sniff(buf);
      if (!kind) throw new Error("Photos must be JPG, PNG or WebP.");
      let name = `${t}.${kind.ext}`; while (used.has(name)) name = `${++t}.${kind.ext}`;
      used.add(name); t++;
      const key = `e/${ev.id}/${name}`;
      await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: kind.type } });
      stored.push(key);
    }
  } catch (e) {
    await Promise.all(stored.map((k) => env.PHOTOS.delete(k)));
    return { error: e.message || "A photo couldn't be saved.", status: 400 };
  }
  const next = [...keys, ...stored];
  await save(env, ev.id, next);
  return { photos: next };
}
export async function removeEventPhoto(env, ev, key) {
  const keys = ownerKeys(ev.owner_photos);
  if (!keys.includes(key)) return { error: "That photo isn't on this event.", status: 404 };
  const next = keys.filter((k) => k !== key);
  await save(env, ev.id, next);
  await env.PHOTOS.delete(key);
  return { photos: next };
}
export async function coverEventPhoto(env, ev, key) {
  const keys = ownerKeys(ev.owner_photos);
  if (!keys.includes(key)) return { error: "That photo isn't on this event.", status: 404 };
  const next = [key, ...keys.filter((k) => k !== key)];
  await save(env, ev.id, next);
  return { photos: next };
}
