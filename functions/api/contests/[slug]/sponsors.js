// POST /api/contests/<slug>/sponsors (multipart: name, tier, url, logo?) and DELETE ?id= — the organizer manages sponsors. GET ?id= serves a sponsor's logo.
import { json, err, clean, webUrl, newId } from "../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { ownerOf, getContest } from "../../../_lib/contests.js";
import { teamChanged } from "../../../_lib/changes.js";

const TIERS = ["presenting", "gold", "silver", "prize"];
function sniff(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return { ext: "webp", type: "image/webp" };
  return null;
}
export async function onRequestGet({ params, request, env }) {
  const c = await getContest(env, params.slug);
  const row = c && (await env.DB.prepare("SELECT logo FROM contest_sponsors WHERE id = ? AND contest_id = ?").bind(new URL(request.url).searchParams.get("id") || "", c.id).first());
  const obj = row && row.logo && (await env.PHOTOS.get(row.logo));
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers(); obj.writeHttpMetadata(h); h.set("cache-control", "public, max-age=86400");
  return new Response(obj.body, { headers: h });
}
export async function onRequestPost({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res, user } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const form = await request.formData().catch(() => null);
  if (!form) return err(400, "The form couldn't be read.");
  const name = clean(form.get("name"), 80), tier = TIERS.includes(form.get("tier")) ? form.get("tier") : "prize", rawUrl = clean(form.get("url"), 200), url = rawUrl ? webUrl(rawUrl) : "";
  if (name.length < 2) return err(400, "Enter the sponsor's name.");
  if (rawUrl && !url) return err(400, "Enter a valid website address, like example.com.");
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM contest_sponsors WHERE contest_id = ?").bind(c.id).first();
  if (n >= 12) return err(400, "That's the most sponsors a contest can show.");
  const id = newId(); let logo = "";
  const f = form.get("logo");
  if (f && typeof f === "object" && f.size) {
    if (f.size > 600 * 1024) return err(400, "That logo is too large. Use an image under 600 KB.");
    const buf = await f.arrayBuffer(), t = sniff(buf);
    if (!t) return err(400, "Logos must be a JPG, PNG or WebP image.");
    logo = `sponsor/${c.id}/${id}.${t.ext}`;
    await env.PHOTOS.put(logo, buf, { httpMetadata: { contentType: t.type } });
  }
  await env.DB.prepare("INSERT INTO contest_sponsors (id, contest_id, name, tier, url, logo) VALUES (?,?,?,?,?,?)").bind(id, c.id, name, tier, url || "", logo).run();
  await teamChanged(env, c, user, [{ label: "Sponsors", old: "", new: `Added ${name} (${tier})` }], waitUntil);
  return json({ ok: true, id });
}
export async function onRequestDelete({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res, user } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const id = new URL(request.url).searchParams.get("id") || "";
  const row = await env.DB.prepare("SELECT logo, name FROM contest_sponsors WHERE id = ? AND contest_id = ?").bind(id, c.id).first();
  if (row && row.logo) await env.PHOTOS.delete(row.logo);
  await env.DB.prepare("DELETE FROM contest_sponsors WHERE id = ? AND contest_id = ?").bind(id, c.id).run();
  if (row) await teamChanged(env, c, user, [{ label: "Sponsors", old: row.name, new: "Removed" }], waitUntil);
  return json({ ok: true });
}
