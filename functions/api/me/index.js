// DELETE /api/me — delete your account. Removes your sign-ins, drafts, profile picture, contest entries (with their photos) and
// votes, closes contests you run (taking them off the map), and blanks your email on homes and events you posted.
import { json, err } from "../../_lib/util.js";
import { COOKIE, requireUser, sameOrigin, setCookie } from "../../_lib/auth.js";

export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const id = user.id, email = user.email;
  const all = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results);

  const contests = await all("SELECT id, event_id FROM contests WHERE owner_id = ?", id);
  const entries = await all("SELECT photos FROM posts WHERE user_id = ?", id);
  let avatar = ""; try { avatar = ((await env.DB.prepare("SELECT avatar FROM users WHERE id = ?").bind(id).first()) || {}).avatar || ""; } catch {}
  for (const e of entries) for (const k of JSON.parse(e.photos || "[]")) await env.PHOTOS.delete(k).catch(() => {});
  if (avatar) await env.PHOTOS.delete(avatar).catch(() => {});

  const stmts = [
    env.DB.prepare("DELETE FROM votes WHERE user_id = ? OR post_id IN (SELECT id FROM posts WHERE user_id = ?)").bind(id, id),
    env.DB.prepare("DELETE FROM posts WHERE user_id = ?").bind(id),
    env.DB.prepare("UPDATE posts SET contact_email = '' WHERE contest_id IS NULL AND lower(contact_email) = lower(?)").bind(email),
    env.DB.prepare("UPDATE event_submissions SET contact_email = '' WHERE lower(contact_email) = lower(?)").bind(email),
    env.DB.prepare("UPDATE contests SET status = 'closed', owner_id = '', contact_email = '', event_id = NULL WHERE owner_id = ?").bind(id),
    env.DB.prepare("DELETE FROM drafts WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
    env.DB.prepare("DELETE FROM login_codes WHERE email = ?").bind(email),
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id),
  ];
  for (const c of contests) if (c.event_id) stmts.push(env.DB.prepare("DELETE FROM events WHERE id = ?").bind(c.event_id));
  await env.DB.batch(stmts);
  return json({ ok: true }, { headers: { "set-cookie": setCookie(request, COOKIE, "", 0) } });
}
