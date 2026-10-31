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
    q("SELECT slug,name,status,announced,entries_close,vote_start,vote_end FROM contests WHERE owner_id = ? ORDER BY created_at DESC", user.id),
    q("SELECT p.id,p.title,p.biz,p.status,c.name AS contest,c.slug FROM posts p JOIN contests c ON c.id = p.contest_id WHERE p.user_id = ? ORDER BY p.created_at DESC", user.id),
    q("SELECT id,title,biz,status,city,created_at FROM posts WHERE contest_id IS NULL AND lower(contact_email) = lower(?) ORDER BY created_at DESC LIMIT 50", user.email),
    q("SELECT id,name,status,city,start_date,created_at FROM event_submissions WHERE lower(contact_email) = lower(?) ORDER BY created_at DESC LIMIT 50", user.email),
  ]);
  return json({ user: { email: user.email, name: user.name || "" }, drafts, contests, entries, homes, events }, { headers: { "cache-control": "no-store" } });
}
