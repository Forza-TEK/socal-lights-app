// The cover photo of events, for the small picture on list rows (Admin lists): the organizer's own first photo, else the picture found on the event's web page. ids -> { id: url }.
import { ownerKeys } from "./eventphotos.js";
export async function eventCovers(env, ids) {
  const list = [...new Set(ids.filter(Boolean))].slice(0, 400), out = {};
  if (!list.length) return out;
  const { results } = await env.DB.prepare(`SELECT id, image, owner_photos FROM events WHERE id IN (${list.map(() => "?").join(",")})`).bind(...list).all();
  for (const r of results) { const own = ownerKeys(r.owner_photos); out[r.id] = own.length ? "/api/photo/" + own[0] : r.image || ""; }
  return out;
}
