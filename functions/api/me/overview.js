// GET /api/me/overview — everything for the profile page: drafts, contests you run, your contest entries, and the homes and
// events you submitted (matched by the email you gave on the form).
import { cleanSlug } from "../drafts/index.js";
import { json } from "../../_lib/util.js";
import { requireUser } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results);
  const [drafts, contests, entries, homes, events, installers] = await Promise.all([
    q("SELECT id,kind,title,step,updated_at, json_extract(data, '$.contestSlug') AS slug FROM drafts WHERE user_id = ? ORDER BY updated_at DESC", user.id).then((r) => r.map(cleanSlug)),
    q(`SELECT slug,name,status,announced,entries_close,vote_start,vote_end, CASE WHEN owner_id = ?1 THEN 'owner' ELSE 'staff' END AS role,
         (SELECT COUNT(*) FROM posts p WHERE p.contest_id = contests.id AND p.status = 'pending') AS waiting
       FROM contests WHERE owner_id = ?1 OR id IN (SELECT contest_id FROM contest_staff WHERE email = ?2) ORDER BY created_at DESC`, user.id, String(user.email || "").toLowerCase()),
    q("SELECT p.id,p.title,p.biz,p.status,c.name AS contest,c.slug FROM posts p JOIN contests c ON c.id = p.contest_id WHERE p.user_id = ? ORDER BY p.created_at DESC", user.id),
    q("SELECT id,title,biz,status,city,created_at,descr,where_txt,season,lights_on,visit,parking,accessible,radio,poster_type,web,phone,service_area FROM posts WHERE contest_id IS NULL AND (user_id = ?1 OR lower(contact_email) = lower(?2)) ORDER BY created_at DESC LIMIT 50", user.id, user.email),
    q("SELECT s.id,s.name,s.status,s.city,s.start_date,s.end_date,s.created_at,s.hours,s.blurb,s.venue,s.url,s.free,s.price,s.event_id,e.notice FROM event_submissions s LEFT JOIN events e ON e.id = s.event_id WHERE lower(s.contact_email) = lower(?) ORDER BY s.created_at DESC LIMIT 50", user.email),
    q("SELECT slug, name, web, phone, area FROM installers WHERE owner_email = ?", user.email),
  ]);
  // Who changed what on each home (the installer shares it once they have confirmed)
  if (homes.length) {
    const ids = homes.map((h) => h.id), ch = (await env.DB.prepare(`SELECT post_id, by_name, by_role, field, old, new, at FROM listing_changes WHERE post_id IN (${ids.map(() => "?").join(",")}) ORDER BY at DESC, rowid DESC LIMIT 300`).bind(...ids).all().catch(() => ({ results: [] }))).results;
    const inst = (await env.DB.prepare(`SELECT p.id, i.name, i.slug, p.installer_confirmed AS ok FROM posts p JOIN installers i ON i.id = p.installer_id WHERE p.id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all().catch(() => ({ results: [] }))).results;
    for (const h of homes) { h.changes = ch.filter((c) => c.post_id === h.id).slice(0, 8); const i = inst.find((x) => x.id === h.id); h.inst = i ? { name: i.name, slug: i.slug, ok: !!i.ok } : null; }
  }
  return json({ user: { email: user.email, name: user.name || "" }, drafts, contests, entries, homes, events, installers }, { headers: { "cache-control": "no-store" } });
}
