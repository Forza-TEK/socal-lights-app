// Photos for homes an organizer added herself (user_id = ''): the organizer adds them from the dashboard, or the homeowner adds them through a private link.
// Photos are stored as p/<postId>/<n>.<jpg|png|webp> (live at once, like every approved entry). The number is a timestamp so a removed photo's address is never
// reused (photos are cached for a year). Rules shared by both routes: JPG, PNG or WebP only (checked by content, not by name), under 6 MB, at most 8 per home.
import { todayPT } from "./contests.js";

export const MAX_PHOTOS = 8;
export const MAX_BYTES = 6 * 1024 * 1024;
export const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
export const KEY_RE = /^p\/[a-z0-9]{8,32}\/\d{1,10}\.(jpg|png|webp)$/;

export function sniff(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: "webp", type: "image/webp" };
  return null;
}
export const newPhotoToken = () => { const b = crypto.getRandomValues(new Uint8Array(24)); return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
export const photoLink = (origin, token) => `${origin}/photos/${token}`;

// The homeowner's link (and the organizer's uploads) work from the day the home is added until voting closes: the vote end date has passed, winners are announced, or the contest is no longer live.
export function photosOpen(c, today = todayPT()) { return c.status === "live" && !c.announced && today <= c.vote_end; }

const keysOf = (row) => { try { const k = JSON.parse(row.photos || "[]"); return Array.isArray(k) ? k : []; } catch { return []; } };

// Saves the files as new photos on the home. Returns { photos } (all keys now on the home) or { error, status }.
export async function addPhotos(env, row, files) {
  const have = keysOf(row);
  if (!files.length) return { error: "Choose at least one photo.", status: 400 };
  if (have.length + files.length > MAX_PHOTOS) return { error: have.length >= MAX_PHOTOS ? `This home already has ${MAX_PHOTOS} photos. Remove one to add another.` : `A home can have up to ${MAX_PHOTOS} photos. This one has room for ${MAX_PHOTOS - have.length} more.`, status: 400 };
  const stored = [], t = Math.floor(Date.now() / 1000);
  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > MAX_BYTES) throw new Error("A photo is too large. Use photos under 6 MB.");
      const buf = await f.arrayBuffer(), kind = sniff(buf);
      if (!kind) throw new Error("Photos must be JPG, PNG or WebP.");
      const key = `p/${row.id}/${t + i}.${kind.ext}`;
      await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: kind.type } });
      stored.push(key);
    }
  } catch (e) {
    await Promise.all(stored.map((k) => env.PHOTOS.delete(k)));
    return { error: e.message || "A photo couldn't be saved.", status: 400 };
  }
  const all = [...have, ...stored];
  await env.DB.prepare("UPDATE posts SET photos = ? WHERE id = ?").bind(JSON.stringify(all), row.id).run();
  return { photos: all };
}

export async function removePhoto(env, row, key) {
  const have = keysOf(row);
  if (!KEY_RE.test(key) || !key.startsWith(`p/${row.id}/`) || !have.includes(key)) return { error: "That photo isn't on this home.", status: 404 };
  const left = have.filter((k) => k !== key);
  await env.DB.prepare("UPDATE posts SET photos = ? WHERE id = ?").bind(JSON.stringify(left), row.id).run();
  await env.PHOTOS.delete(key);
  return { photos: left };
}
