// GET /api/me/overview — everything for the profile page: drafts, contests you run, your contest entries, and the homes and
// events you submitted (matched by the email you gave on the form).
import { ptToday } from "../../_lib/time.js";
import { cleanSlug } from "../drafts/index.js";
import { json } from "../../_lib/util.js";
import { requireUser } from "../../_lib/auth.js";
import { ownerKeys } from "../../_lib/eventphotos.js";

export async function onRequestGet({ request, env }) {
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results);
  const [drafts, contests, entries, homes, events, installers] = await Promise.all([
    q("SELECT id,kind,title,step,updated_at, json_extract(data, '$.contestSlug') AS slug FROM drafts WHERE user_id = ? ORDER BY updated_at DESC", user.id).then((r) => r.map(cleanSlug)),
    q(`SELECT slug,name,status,announced,entries_close,vote_start,vote_end, CASE WHEN owner_id = ?1 THEN 'owner' ELSE 'staff' END AS role,
         (SELECT COUNT(*) FROM posts p WHERE p.contest_id = contests.id AND p.status = 'pending') AS waiting
       FROM contests WHERE owner_id = ?1 OR id IN (SELECT contest_id FROM contest_staff WHERE email = ?2) ORDER BY created_at DESC`, user.id, String(user.email || "").toLowerCase()),
    q("SELECT p.id,p.title,p.biz,p.status,c.name AS contest,c.slug,p.photos,(p.review_note = 'withdrawn') AS withdrawn,c.vote_end,c.announced,CASE WHEN p.photo_token IS NOT NULL THEN '/photos/' || p.photo_token ELSE '' END AS manage, (SELECT CASE WHEN r.note LIKE '[restore]%' THEN 'restore' ELSE 'remove' END || '|' || r.status FROM removal_requests r WHERE r.ref = 'h-' || p.id ORDER BY r.created_at DESC LIMIT 1) AS req FROM posts p JOIN contests c ON c.id = p.contest_id WHERE p.user_id = ?1 OR (p.photo_token IS NOT NULL AND COALESCE(p.user_id,'') = '' AND p.contact_email != '' AND lower(p.contact_email) = lower(?2)) ORDER BY p.created_at DESC", user.id, user.email),
    q("SELECT id,title,biz,status,city,street,zip,photos,video,video_file,video_ok,created_at,descr,where_txt,season,lights_on,visit,parking,accessible,radio,poster_type,web,phone,service_area FROM posts WHERE contest_id IS NULL AND (user_id = ?1 OR lower(contact_email) = lower(?2)) ORDER BY created_at DESC LIMIT 50", user.id, user.email),
    q("SELECT s.id,s.name,s.status,s.city,s.address,s.season,s.type,s.start_date,s.end_date,s.created_at,s.hours,s.blurb,s.venue,s.url,s.free,s.price,s.event_id,e.notice,e.owner_photos,e.image,e.video,e.video_file,e.video_ok FROM event_submissions s LEFT JOIN events e ON e.id = s.event_id WHERE lower(s.contact_email) = lower(?) ORDER BY s.created_at DESC LIMIT 50", user.email),
    q("SELECT slug, name, web, phone, area FROM installers WHERE owner_email = ?", user.email),
  ]);
  // Entry drafts: say which contest, and whether it can still take entries (a draft for a closed or deleted contest would dead-end)
  const slugs = [...new Set(drafts.map((d) => d.slug).filter(Boolean))];
  if (slugs.length) {
    const cs = (await env.DB.prepare(`SELECT slug,name,entries_close,announced,status FROM contests WHERE slug IN (${slugs.map(() => "?").join(",")})`).bind(...slugs).all().catch(() => ({ results: [] }))).results, today = ptToday();
    for (const d of drafts) if (d.slug) { const c = cs.find((x) => x.slug === d.slug); d.cname = c ? c.name : ""; d.dead = !c ? "gone" : c.announced || (c.entries_close && c.entries_close < today) || c.status !== "live" ? "closed" : ""; }
  }
  // Who changed what on each home (the installer shares it once they have confirmed)
  if (homes.length) {
    const ids = homes.map((h) => h.id), ch = (await env.DB.prepare(`SELECT post_id, by_name, by_role, field, old, new, at FROM listing_changes WHERE post_id IN (${ids.map(() => "?").join(",")}) ORDER BY at DESC, rowid DESC LIMIT 300`).bind(...ids).all().catch(() => ({ results: [] }))).results;
    const inst = (await env.DB.prepare(`SELECT p.id, i.name, i.slug, p.installer_confirmed AS ok FROM posts p JOIN installers i ON i.id = p.installer_id WHERE p.id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all().catch(() => ({ results: [] }))).results;
    for (const h of homes) { try { h.photos = JSON.parse(h.photos || "[]"); } catch { h.photos = []; } h.changes = ch.filter((c) => c.post_id === h.id).slice(0, 8); const i = inst.find((x) => x.id === h.id); h.inst = i ? { name: i.name, slug: i.slug, ok: !!i.ok } : null; }
  }
  for (const e of entries) { const [k, st] = String(e.req || "|").split("|"); e.req = k ? { kind: k, status: st } : null; try { e.photos = JSON.parse(e.photos || "[]"); } catch { e.photos = []; } } // the cover photo shown on the list row
  for (const e of events) { e.photos = ownerKeys(e.owner_photos); delete e.owner_photos; } // the owner's own event photos (up to 4)
  return json({ user: { email: user.email, name: user.name || "" }, drafts, contests, entries, homes, events, installers }, { headers: { "cache-control": "no-store" } });
}
