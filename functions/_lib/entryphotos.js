// Photos and the sign-in link for homes an organizer added herself (they carry posts.photo_token).
//   The organizer adds and removes photos from the dashboard. The homeowner opens /photos/<token>, signs in, links the home to their account (posts.user_id, contact_email),
//   and can then edit it, add and delete their own photos, and HIDE (not delete) the photos the organizer uploaded.
// Photos are stored as p/<postId>/<name> (live at once). <name> is a millisecond timestamp plus the extension (checked to be new on that home), so a removed photo's address is never reused (photos are cached for a year).
// A hidden photo is moved to h/<postId>/<name>: that path is not on the public photo route, only the homeowner and the organizers can open it.
// posts.photos = the visible keys, posts.photos_hidden = names of hidden photos, posts.photos_org = names of the photos the organizer uploaded.
import { todayPT } from "./contests.js";

export const MAX_PHOTOS = 8;   // visible and hidden together
export const MAX_BYTES = 6 * 1024 * 1024;
export const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
export const NAME_RE = /^\d{1,14}\.(jpg|png|webp)$/;
export const KEY_RE = /^p\/[a-z0-9]{8,32}\/\d{1,14}\.(jpg|png|webp)$/;

export function sniff(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: "webp", type: "image/webp" };
  return null;
}
export const newPhotoToken = () => { const b = crypto.getRandomValues(new Uint8Array(24)); return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
export const photoLink = (origin, token) => `${origin}/photos/${token}`;

// Photos can be changed from the day the home is added until voting closes: the vote end date has passed, winners are announced, or the contest is not live any more.
export function photosOpen(c, today = todayPT()) { return c.status === "live" && !c.announced && today <= c.vote_end; }
// A homeowner can link the home to their account until the winners are announced.
export const claimOpen = (c) => c.status === "live" && !c.announced;

const arr = (s) => { try { const a = JSON.parse(s || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };
export const nameOf = (key) => String(key).split("/").pop();
const pKey = (id, name) => `p/${id}/${name}`, hKey = (id, name) => `h/${id}/${name}`;
const stateOf = (row) => ({ vis: arr(row.photos).map(nameOf), hid: arr(row.photos_hidden), org: arr(row.photos_org) });
const save = (env, row, s) => env.DB.prepare("UPDATE posts SET photos = ?, photos_hidden = ?, photos_org = ? WHERE id = ?")
  .bind(JSON.stringify(s.vis.map((n) => pKey(row.id, n))), JSON.stringify(s.hid), JSON.stringify(s.org.filter((n) => s.vis.includes(n) || s.hid.includes(n))), row.id).run();

// What the homeowner and the organizer see: every photo with its address, whether it is hidden and whether the organizer uploaded it.
export function photoList(row) {
  const s = stateOf(row);
  return [...s.vis.map((n) => ({ name: n, url: "/api/photo/" + pKey(row.id, n), hidden: false, city: s.org.includes(n) })), ...s.hid.map((n) => ({ name: n, url: "/api/photo/" + hKey(row.id, n), hidden: true, city: s.org.includes(n) }))];
}

// Saves the files as new photos. by: "org" (the organizer: they become city photos the homeowner can only hide) or "owner". Returns { row } with the new state, or { error, status }.
export async function addPhotos(env, row, files, by) {
  const s = stateOf(row), total = s.vis.length + s.hid.length;
  if (!files.length) return { error: "Choose at least one photo.", status: 400 };
  if (total + files.length > MAX_PHOTOS) return { error: total >= MAX_PHOTOS ? `This home already has ${MAX_PHOTOS} photos. Remove one to add another.` : `A home can have up to ${MAX_PHOTOS} photos. This one has room for ${MAX_PHOTOS - total} more.`, status: 400 };
  const stored = [], used = new Set([...s.vis, ...s.hid]);
  let t = Date.now(); // milliseconds: a name is never reused on the same home, even by two uploads in the same moment
  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > MAX_BYTES) throw new Error("A photo is too large. Use photos under 6 MB.");
      const buf = await f.arrayBuffer(), kind = sniff(buf);
      if (!kind) throw new Error("Photos must be JPG, PNG or WebP.");
      let name = `${t}.${kind.ext}`; while (used.has(name)) name = `${++t}.${kind.ext}`;
      used.add(name); t++;
      await env.PHOTOS.put(pKey(row.id, name), buf, { httpMetadata: { contentType: kind.type } });
      stored.push(name);
    }
  } catch (e) {
    await Promise.all(stored.map((n) => env.PHOTOS.delete(pKey(row.id, n))));
    return { error: e.message || "A photo couldn't be saved.", status: 400 };
  }
  s.vis.push(...stored); if (by === "org") s.org.push(...stored);
  await save(env, row, s);
  return { row: { ...row, photos: JSON.stringify(s.vis.map((n) => pKey(row.id, n))), photos_hidden: JSON.stringify(s.hid), photos_org: JSON.stringify(s.org) } };
}

// Deletes one photo (visible or hidden). by "owner" cannot delete a photo the organizer uploaded (it can only be hidden); by "org" can delete any.
export async function removePhoto(env, row, name, by) {
  const s = stateOf(row);
  if (!NAME_RE.test(String(name))) return { error: "That photo isn't on this home.", status: 404 };
  const hidden = s.hid.includes(name);
  if (!hidden && !s.vis.includes(name)) return { error: "That photo isn't on this home.", status: 404 };
  if (by === "owner" && s.org.includes(name)) return { error: "Photos the organizer added can't be deleted, but you can hide them.", status: 403 };
  s.vis = s.vis.filter((n) => n !== name); s.hid = s.hid.filter((n) => n !== name); s.org = s.org.filter((n) => n !== name);
  await save(env, row, s);
  await env.PHOTOS.delete(hidden ? hKey(row.id, name) : pKey(row.id, name));
  return { row: { ...row, photos: JSON.stringify(s.vis.map((n) => pKey(row.id, n))), photos_hidden: JSON.stringify(s.hid), photos_org: JSON.stringify(s.org) } };
}

// The homeowner hides (or shows again) a photo the organizer uploaded. Hiding moves the file off the public route; showing moves it back.
export async function setHidden(env, row, name, hide) {
  const s = stateOf(row);
  if (!NAME_RE.test(String(name)) || !s.org.includes(name)) return { error: "That isn't a photo the organizer added.", status: 404 };
  const from = hide ? s.vis : s.hid, to = hide ? s.hid : s.vis;
  if (!from.includes(name)) return { error: hide ? "That photo is already hidden." : "That photo isn't hidden.", status: 400 };
  const a = hide ? pKey(row.id, name) : hKey(row.id, name), b = hide ? hKey(row.id, name) : pKey(row.id, name);
  const obj = await env.PHOTOS.get(a);
  if (!obj) return { error: "That photo can't be found.", status: 404 };
  await env.PHOTOS.put(b, obj.body, { httpMetadata: obj.httpMetadata });
  const nv = from.filter((n) => n !== name); to.push(name);
  if (hide) { s.vis = nv; s.hid = to; } else { s.hid = nv; s.vis = to; }
  await save(env, row, s);
  await env.PHOTOS.delete(a);
  return { row: { ...row, photos: JSON.stringify(s.vis.map((n) => pKey(row.id, n))), photos_hidden: JSON.stringify(s.hid), photos_org: JSON.stringify(s.org) } };
}
