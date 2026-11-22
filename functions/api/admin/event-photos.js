// Admin adds, removes and reorders the photos of any event (the up-to-4 owner photos, shown before the picture found on the event's web page), e.g. one an organizer emailed.
//   POST multipart  fields: id, photos (one or more image files)   -> { ok, photos: [keys] }
//   POST JSON       { id, action: "remove" | "cover", key }        -> { ok, photos: [keys] }
// Same files, same limits and same storage as the organizer's own upload (functions/_lib/eventphotos.js); behind the Access login like all of /api/admin.
import { json, err } from "../../_lib/util.js";
import { addEventPhotos, removeEventPhoto, coverEventPhoto } from "../../_lib/eventphotos.js";

export async function onRequestPost({ request, env }) {
  const multipart = /multipart\/form-data/i.test(request.headers.get("content-type") || "");
  let id, files = [], b = {};
  if (multipart) {
    let form; try { form = await request.formData(); } catch { return err(400, "The photos couldn't be read. Please try again."); }
    id = String(form.get("id") || ""); files = form.getAll("photos").filter((f) => f && typeof f === "object" && f.size > 0);
  } else { b = await request.json().catch(() => ({})); id = String(b.id || ""); }
  const ev = await env.DB.prepare("SELECT id, owner_photos FROM events WHERE id = ?").bind(id).first();
  if (!ev) return err(404, "That event is gone.");
  const r = multipart ? await addEventPhotos(env, ev, files) : b.action === "remove" ? await removeEventPhoto(env, ev, String(b.key || "")) : b.action === "cover" ? await coverEventPhoto(env, ev, String(b.key || "")) : { error: "Unknown action.", status: 400 };
  if (r.error) return err(r.status || 400, r.error);
  return json({ ok: true, photos: r.photos });
}
