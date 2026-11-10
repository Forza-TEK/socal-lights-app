// POST   /api/contests/<slug>/entries/<id>/photos   (multipart: photos) — the organizer (or a co-organizer) adds photos to a home she added herself.
// DELETE /api/contests/<slug>/entries/<id>/photos?key=p/<id>/<n>.jpg — removes one photo.
// Homes the residents entered themselves are not changed here (their owners have accounts). Allowed until voting closes (see photosOpen), including while voting is open.
import { json, err } from "../../../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../../../_lib/auth.js";
import { ownerOf } from "../../../../../_lib/contests.js";
import { addPhotos, removePhoto, photosOpen } from "../../../../../_lib/entryphotos.js";
import { checkThrottle, hashKey } from "../../../../../_lib/throttle.js";

const NO_STORE = { headers: { "cache-control": "no-store" } };
async function gate({ params, request, env }) {
  if (!sameOrigin(request)) return { res: err(403, "Not allowed.") };
  const { c, user, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return { res };
  const row = await env.DB.prepare("SELECT id, photos, user_id, status FROM posts WHERE id = ? AND contest_id = ?").bind(params.id, c.id).first();
  if (!row) return { res: err(404, "That entry doesn't exist.") };
  if (row.user_id !== "" || row.status !== "approved") return { res: err(400, "You can add photos here only to homes you added yourself.") };
  if (!photosOpen(c)) return { res: err(409, c.announced ? "Results are locked." : "Voting has closed, so photos can't be changed any more.") };
  return { c, user, row };
}

export async function onRequestPost(ctx) {
  const g = await gate(ctx); if (g.res) return g.res;
  const slow = await checkThrottle(ctx.env, [{ kind: "ep-org", key: await hashKey(ctx.env, "u", g.user.id), max: 80, windowHours: 1, msg: "That is a lot of uploads in an hour. Please try again a little later." }]);
  if (slow) return err(429, slow);
  let form; try { form = await ctx.request.formData(); } catch { return err(400, "The photos couldn't be read. Please try again."); }
  const files = form.getAll("photos").filter((f) => f && typeof f === "object" && f.size > 0);
  const r = await addPhotos(ctx.env, g.row, files);
  return r.error ? err(r.status, r.error) : json({ ok: true, photos: r.photos }, NO_STORE);
}

export async function onRequestDelete(ctx) {
  const g = await gate(ctx); if (g.res) return g.res;
  const r = await removePhoto(ctx.env, g.row, new URL(ctx.request.url).searchParams.get("key") || "");
  return r.error ? err(r.status, r.error) : json({ ok: true, photos: r.photos }, NO_STORE);
}
