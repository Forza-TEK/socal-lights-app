// /api/me/homes/<id> — the people who share a home listing manage it together.
//   POST { action: "edit" | "pause" | "resume" }
//     edit   : title, desc, where, season, lights_on, visit, parking, accessible, radio (installer listings: web, phone, area too)
//     pause  : "Taken down for the season" (the homeowner only)
//     resume : puts it back on the map (the homeowner only)
//   GET     : the recent changes (who changed which field, and when)
// Who can open it: the person who posted it, and the installer's profile owner once the installer has confirmed they installed it
// (or when the listing is the installer's own). Each side is emailed what the other changed.
import { json, err, clean, webUrl } from "../../../_lib/util.js";
import { requireUser, sameOrigin, normEmail } from "../../../_lib/auth.js";
import { SEASONS } from "../../../../public/seasons.js";
import { movePhotos } from "../../../_lib/posts.js";
import { diff, logHome, lines, notify, HOME_FIELDS } from "../../../_lib/changes.js";

// Which side of the listing is this person on? Returns { row, inst, role: "homeowner" | "installer" } or { res }.
export async function access(env, user, id) {
  const row = await env.DB.prepare("SELECT * FROM posts WHERE id = ? AND contest_id IS NULL").bind(id).first();
  if (!row) return { res: err(404, "That listing isn't yours.") };
  const inst = row.installer_id ? await env.DB.prepare("SELECT * FROM installers WHERE id = ?").bind(row.installer_id).first() : null;
  const posted = row.user_id === user.id || normEmail(row.contact_email) === user.email;
  if (posted) return { row, inst, role: row.poster_type === "installer" ? "installer" : "homeowner" };
  if (inst && inst.owner_email === user.email && (row.installer_confirmed || row.poster_type === "installer")) return { row, inst, role: "installer" };
  return { res: err(404, "That listing isn't yours.") };
}

// Everyone who shares this listing gets told about a change, including the person who made it (as a receipt).
function everyone(row, inst, actor) {
  const list = [row.contact_email, actor.email];
  if (inst && inst.owner_email && (row.installer_confirmed || row.poster_type === "installer")) list.push(inst.owner_email);
  const seen = new Set(); return list.filter((e) => { const k = e && normEmail(e); if (!k || seen.has(k)) return false; seen.add(k); return true; });
}
const where = (row, inst, role) => `https://socallights.app/${role === "installer" && inst ? "installer/" + inst.slug + "/manage" : "profile#displays"}`;

export async function onRequestGet({ params, request, env }) {
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const a = await access(env, user, params.id);
  if (a.res) return a.res;
  const { results } = await env.DB.prepare("SELECT by_name, by_email, by_role, field, old, new, at FROM listing_changes WHERE post_id = ? ORDER BY at DESC, rowid DESC LIMIT 30").bind(a.row.id).all();
  return json({ changes: results }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const a = await access(env, user, params.id);
  if (a.res) return a.res;
  const { row, inst, role } = a;
  const b = await request.json().catch(() => ({}));
  const mine = row.user_id === user.id || normEmail(row.contact_email) === user.email;

  if (b.action === "pause" || b.action === "resume") {
    if (!mine) return err(403, "Only the person who posted this can take it down or put it back.");
    if (b.action === "pause") {
      if (row.status !== "approved") return err(400, "That listing isn't on the map right now.");
      const photos = await movePhotos(env, row, "p/", "pending/");
      await env.DB.prepare("UPDATE posts SET status='paused', approved_at=NULL, photos=? WHERE id=?").bind(JSON.stringify(photos), row.id).run();
    } else {
      if (row.status !== "paused") return err(400, "That listing isn't taken down.");
      const photos = await movePhotos(env, row, "pending/", "p/");
      await env.DB.prepare("UPDATE posts SET status='approved', approved_at=datetime('now'), photos=? WHERE id=?").bind(JSON.stringify(photos), row.id).run();
    }
    const who = { email: user.email, name: user.name || row.biz || user.email, role };
    const ch = [{ label: "Listing", old: b.action === "pause" ? "On the map" : "Taken down for the season", new: b.action === "pause" ? "Taken down for the season" : "Back on the map" }];
    await logHome(env, row.id, who, ch);
    const job = notify(env, everyone(row, inst, who), `${who.name} ${b.action === "pause" ? "took down" : "put back"} "${row.title}" on SoCal Lights`, `${who.name} ${b.action === "pause" ? "took this listing down for the season" : "put this listing back on the map"}: "${row.title}".\n\nSee the listing and the full list of changes: ${where(row, inst, "homeowner")}`);
    if (waitUntil) waitUntil(job);
    return json({ ok: true });
  }
  if (b.action === "edit") {
    const title = clean(b.title ?? row.title, 90), desc = clean(b.desc ?? row.descr, 1200);
    if (title.length < 3) return err(400, "Give the display a name.");
    if (desc.length < 10) return err(400, "Add a sentence or two about it.");
    const pro = row.poster_type === "installer";
    const webRaw = pro ? clean(b.web ?? row.web, 200) : "", web = webRaw ? webUrl(webRaw) : "";
    if (pro && webRaw && !web) return err(400, "That website address doesn't look right.");
    const next = {
      title, descr: desc, where_txt: clean(b.where ?? row.where_txt, 120), season: SEASONS[b.season] ? b.season : row.season,
      lights_on: clean(b.lights_on ?? row.lights_on, 60), visit: ["drive", "walk", "both", ""].includes(b.visit) ? b.visit : row.visit,
      parking: ["free", "street", "none", ""].includes(b.parking) ? b.parking : row.parking, accessible: b.accessible === undefined ? row.accessible : b.accessible ? 1 : 0,
      radio: clean(b.radio ?? row.radio, 40), web: pro ? web || "" : row.web, phone: pro ? clean(b.phone ?? row.phone, 80) : row.phone, service_area: pro ? clean(b.area ?? row.service_area, 120) : row.service_area,
    };
    const changes = diff(row, next, HOME_FIELDS);
    if (!changes.length) return json({ ok: true, changed: 0 });
    await env.DB.prepare("UPDATE posts SET title=?, descr=?, where_txt=?, season=?, lights_on=?, visit=?, parking=?, accessible=?, radio=?, web=?, phone=?, service_area=? WHERE id=?")
      .bind(next.title, next.descr, next.where_txt, next.season, next.lights_on, next.visit, next.parking, next.accessible, next.radio, next.web, next.phone, next.service_area, row.id).run();
    const who = { email: user.email, name: (role === "installer" && inst ? inst.name : user.name || row.biz) || user.email, role };
    await logHome(env, row.id, who, changes);
    // Everyone who shares the listing is told, including the person who made the change
    const job = notify(env, everyone(row, inst, who), `${who.name} updated "${next.title}" on SoCal Lights`, `${who.name} changed these on "${next.title}":\n\n${lines(changes)}\n\nSee the listing and the full list of changes: ${where(row, inst, "homeowner")}\n(If you are the installer, open your manage page: ${inst ? "https://socallights.app/installer/" + inst.slug + "/manage" : "n/a"}.)`);
    if (waitUntil) waitUntil(job);
    return json({ ok: true, changed: changes.length });
  }
  return err(400, "Unknown action.");
}
