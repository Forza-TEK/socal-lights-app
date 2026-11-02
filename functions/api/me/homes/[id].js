// POST /api/me/homes/<id> { action: "edit" | "pause" | "resume" } — the person who posted a home display manages it.
//   edit   : title, desc, where, season, lights_on, visit, parking, accessible, radio (installers: web, phone, area too)
//   pause  : "Taken down for the season". The home leaves the map and its photos go back to the private folder.
//   resume : puts it back on the map.
import { json, err, clean, webUrl } from "../../../_lib/util.js";
import { requireUser, sameOrigin, normEmail } from "../../../_lib/auth.js";
import { SEASONS } from "../../../../public/seasons.js";
import { movePhotos } from "../../../_lib/posts.js";

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const row = await env.DB.prepare("SELECT * FROM posts WHERE id = ? AND contest_id IS NULL").bind(params.id).first();
  if (!row || (row.user_id !== user.id && normEmail(row.contact_email) !== user.email)) return err(404, "That listing isn't yours.");
  const b = await request.json().catch(() => ({}));

  if (b.action === "pause") {
    if (row.status !== "approved") return err(400, "That listing isn't on the map right now.");
    const photos = await movePhotos(env, row, "p/", "pending/");
    await env.DB.prepare("UPDATE posts SET status='paused', approved_at=NULL, photos=? WHERE id=?").bind(JSON.stringify(photos), row.id).run();
    return json({ ok: true });
  }
  if (b.action === "resume") {
    if (row.status !== "paused") return err(400, "That listing isn't taken down.");
    const photos = await movePhotos(env, row, "pending/", "p/");
    await env.DB.prepare("UPDATE posts SET status='approved', approved_at=datetime('now'), photos=? WHERE id=?").bind(JSON.stringify(photos), row.id).run();
    return json({ ok: true });
  }
  if (b.action === "edit") {
    const title = clean(b.title ?? row.title, 90), desc = clean(b.desc ?? row.descr, 1200);
    if (title.length < 3) return err(400, "Give the display a name.");
    if (desc.length < 10) return err(400, "Add a sentence or two about it.");
    const pro = row.poster_type === "installer";
    const webRaw = pro ? clean(b.web ?? row.web, 200) : "", web = webRaw ? webUrl(webRaw) : "";
    if (pro && webRaw && !web) return err(400, "That website address doesn't look right.");
    const season = SEASONS[b.season] ? b.season : row.season;
    const visit = ["drive", "walk", "both", ""].includes(b.visit) ? b.visit : row.visit;
    const parking = ["free", "street", "none", ""].includes(b.parking) ? b.parking : row.parking;
    await env.DB.prepare("UPDATE posts SET title=?, descr=?, where_txt=?, season=?, lights_on=?, visit=?, parking=?, accessible=?, radio=?, web=?, phone=?, service_area=? WHERE id=?")
      .bind(title, desc, clean(b.where ?? row.where_txt, 120), season, clean(b.lights_on ?? row.lights_on, 60), visit, parking, b.accessible === undefined ? row.accessible : b.accessible ? 1 : 0, clean(b.radio ?? row.radio, 40),
        pro ? web || "" : row.web, pro ? clean(b.phone ?? row.phone, 80) : row.phone, pro ? clean(b.area ?? row.service_area, 120) : row.service_area, row.id).run();
    return json({ ok: true });
  }
  return err(400, "Unknown action.");
}
