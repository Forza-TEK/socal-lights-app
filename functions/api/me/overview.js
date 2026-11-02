// GET /api/me/overview — everything for the profile page: drafts, contests you run, your contest entries, and the homes and
// events you submitted (matched by the email you gave on the form).
import { cleanSlug } from "../drafts/index.js";
import { json } from "../../_lib/util.js";
import { requireUser } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results);
  const [drafts, contests, entries, homes, events] = await Promise.all([
    q("SELECT id,kind,title,step,updated_at, json_extract(data, '$.contestSlug') AS slug FROM drafts WHERE user_id = ? ORDER BY updated_at DESC", user.id).then((r) => r.map(cleanSlug)),
    q(`SELECT slug,name,status,announced,entries_close,vote_start,vote_end, CASE WHEN owner_id = ?1 THEN 'owner' ELSE 'staff' END AS role,
         (SELECT COUNT(*) FROM posts p WHERE p.contest_id = contests.id AND p.status = 'pending') AS waiting
       FROM contests WHERE owner_id = ?1 OR id IN (SELECT contest_id FROM contest_staff WHERE email = ?2) ORDER BY created_at DESC`, user.id, String(user.email || "").toLowerCase()),
    q("SELECT p.id,p.title,p.biz,p.status,c.name AS contest,c.slug FROM posts p JOIN contests c ON c.id = p.contest_id WHERE p.user_id = ? ORDER BY p.created_at DESC", user.id),
    q("SELECT id,title,biz,status,city,created_at,descr,where_txt,season,lights_on,visit,parking,accessible,radio,poster_type,web,phone,service_area FROM posts WHERE contest_id IS NULL AND (user_id = ?1 OR lower(contact_email) = lower(?2)) ORDER BY created_at DESC LIMIT 50", user.id, user.email),
    q("SELECT s.id,s.name,s.status,s.city,s.start_date,s.end_date,s.created_at,s.hours,s.blurb,s.venue,s.url,s.free,s.price,s.event_id,e.notice FROM event_submissions s LEFT JOIN events e ON e.id = s.event_id WHERE lower(s.contact_email) = lower(?) ORDER BY s.created_at DESC LIMIT 50", user.email),
  ]);
  return json({ user: { email: user.email, name: user.name || "" }, drafts, contests, entries, homes, events }, { headers: { "cache-control": "no-store" } });
}
