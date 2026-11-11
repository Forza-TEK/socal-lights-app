// /api/contests/<slug>/logo — the contest's own logo (shown on its page and on homes that have no photo).
//   GET     the logo image. Public while the contest is live; the organizer team can always see it. Versioned by the ?v= in the URL the contest page gives out, so it caches well.
//   POST    multipart "logo" (JPG, PNG or WebP, under 600 KB): organizer or co-organizer. Replaces the old logo.
//   DELETE  removes the logo (the pages go back to the drawn icon).
import { json, err } from "../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { ownerOf, getContest, isStaff } from "../../../_lib/contests.js";
import { teamChanged } from "../../../_lib/changes.js";
import { r2Delete } from "../../../_lib/dbchunk.js";
import { LOGO_MAX, sniffImage } from "../../../_lib/sponsors.js";

export const logoUrl = (c) => (c.logo ? `/api/contests/${encodeURIComponent(c.slug)}/logo?v=${(c.logo.match(/\/(\d+)\.\w+$/) || [])[1] || "1"}` : "");

export async function onRequestGet({ params, request, env }) {
  const c = await getContest(env, params.slug);
  if (!c || !c.logo) return new Response("Not found", { status: 404 });
  const pub = c.status === "live";
  if (!pub) { const user = await getUser(request, env); if (!user || !(await isStaff(env, c, user))) return new Response("Not found", { status: 404 }); }
  const obj = await env.PHOTOS.get(c.logo);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, { headers: { "content-type": (obj.httpMetadata && obj.httpMetadata.contentType) || "image/png", "cache-control": pub ? "public, max-age=86400" : "private, no-store", "x-content-type-options": "nosniff" } });
}

export async function onRequestPost({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, user, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  let form; try { form = await request.formData(); } catch { return err(400, "That logo couldn't be read. Try again."); }
  const f = form.get("logo");
  if (!f || typeof f !== "object" || !f.size) return err(400, "Choose a logo image.");
  if (f.size > LOGO_MAX) return err(400, "That logo is too large. Use an image under 600 KB.");
  const buf = await f.arrayBuffer(), t = sniffImage(buf);
  if (!t) return err(400, "A logo must be a JPG, PNG or WebP image.");
  const key = `contestlogo/${c.id}/${Date.now()}.${t.ext}`;
  await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: t.type } });
  await env.DB.prepare("UPDATE contests SET logo = ? WHERE id = ?").bind(key, c.id).run();
  if (c.logo) await r2Delete(env, [c.logo], "logo");
  await teamChanged(env, c, user, [{ label: "Logo", old: c.logo ? "Had a logo" : "No logo", new: "Uploaded a new logo" }], waitUntil);
  return json({ ok: true, logo: logoUrl({ ...c, logo: key }) }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestDelete({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, user, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  if (c.logo) {
    await env.DB.prepare("UPDATE contests SET logo = '' WHERE id = ?").bind(c.id).run();
    await r2Delete(env, [c.logo], "logo");
    await teamChanged(env, c, user, [{ label: "Logo", old: "Had a logo", new: "Removed the logo" }], waitUntil);
  }
  return json({ ok: true, logo: "" }, { headers: { "cache-control": "no-store" } });
}
