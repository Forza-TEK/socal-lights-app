// Shared rules for the home pages (/h/<post id>): which photos may be shown, which posts are kept out of search, and which are hidden like on the map.
// A page shows only what GET /api/posts (the public map) already shows for a home; see functions/h/[id].js.
import { pairs } from "./addrkey.js";
import { logOp } from "./oplog.js";

// Photo keys a visitor may be shown: the visible ones only (p/<post id>/<n>.jpg). A hidden photo (h/...) never matches.
export const PHOTO_KEY = /^p\/[a-z0-9]{8,32}\/\d{1,14}\.(?:jpg|png|webp)$/;
export const publicPhotoKeys = (raw) => { try { const v = JSON.parse(raw || "[]"); return Array.isArray(v) ? v.filter((k) => typeof k === "string" && PHOTO_KEY.test(k)) : []; } catch { return []; } };
export const photoPath = (key) => "/api/photo/" + key.split("/").map(encodeURIComponent).join("/");

// Search engines may list a page when it is a showcase home (not a contest entry) and its street address, if it shows one, came with the poster's
// statement that it is their home or that they have the owner's permission (address_consent_at). Older homes, added before that statement, stay out of search
// but still open from a link, showing exactly what they show on the map.
export const homeIndexable = (r) => !r.contest_id && !((r.address || r.street) && !r.address_consent_at);

// Ids of these posts that the map hides because Admin chose the sweep record for the same address (same rule as /api/posts).
export async function sweepHidden(env, rows) {
  try {
    const list = rows.filter((r) => !r.contest_id && (r.address || r.street));
    if (!list.length) return new Set();
    const chosen = (await env.DB.prepare("SELECT id, city, address FROM events WHERE keep_listed = 2 AND address != ''").all()).results;
    return chosen.length ? new Set(pairs(list, chosen).exact.map((x) => x.post.id)) : new Set();
  } catch (e) { await logOp(env, "home-page", "hidden-by-sweep lookup failed: " + (e && e.message)); return new Set(); }
}
