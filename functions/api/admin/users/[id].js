// GET  /api/admin/users/:id — one person: profile, what they posted, contests they run, votes cast.
// POST /api/admin/users/:id { action } — signout | suspend | unsuspend | rename { name } | note { note } | delete { confirm: <their email> }
import { json, err } from "../../../_lib/util.js";
import { deleteAccount } from "../../../_lib/account.js";

const one = (env, id) => env.DB.prepare("SELECT id, email, name, street, city, zip, created_at, last_login, status, suspended_at, admin_note, (google_sub IS NOT NULL) AS google FROM users WHERE id = ?").bind(id).first();

export async function onRequestGet({ params, env }) {
  const user = await one(env, params.id);
  if (!user) return err(404, "No such account.");
  const all = (sql) => env.DB.prepare(sql).bind(params.id).all().then((r) => r.results);
  const [posts, contests, votes, sessions, history] = await Promise.all([
    all("SELECT id, title, biz, city, season, status, contest_id, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"),
    all("SELECT id, slug, name, city, status, announced FROM contests WHERE owner_id = ? ORDER BY created_at DESC"),
    env.DB.prepare("SELECT COUNT(*) AS n FROM votes WHERE user_id = ?").bind(params.id).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND expires_at > datetime('now')").bind(params.id).first(),
    env.DB.prepare("SELECT at, admin, action FROM admin_log WHERE area = 'users' AND target_id = ? ORDER BY id DESC LIMIT 10").bind(params.id).all().then((r) => r.results),
  ]);
  return json({ user, posts, contests, votes: votes.n, sessions: sessions.n, history });
}

export async function onRequestPost({ params, request, env, data }) {
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "Bad request.");
  const user = await one(env, params.id);
  if (!user) return err(404, "No such account.");
  const id = params.id;
  switch (b.action) {
    case "signout":
      await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
      return json({ ok: true });
    case "suspend":
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET status = 'suspended', suspended_at = datetime('now') WHERE id = ?").bind(id),
        env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
      ]);
      return json({ ok: true });
    case "unsuspend":
      await env.DB.prepare("UPDATE users SET status = 'active', suspended_at = NULL WHERE id = ?").bind(id).run();
      return json({ ok: true });
    case "rename": {
      const name = String(b.name ?? "").trim().slice(0, 80);
      await env.DB.prepare("UPDATE users SET name = ? WHERE id = ?").bind(name, id).run();
      return json({ ok: true, name });
    }
    case "note": {
      const note = String(b.note ?? "").trim().slice(0, 1000);
      await env.DB.prepare("UPDATE users SET admin_note = ? WHERE id = ?").bind(note, id).run();
      return json({ ok: true, note });
    }
    case "delete":
      if (String(b.confirm || "").trim().toLowerCase() !== user.email.toLowerCase()) return err(400, "Type the person's email exactly to delete the account.");
      await deleteAccount(env, id, user.email);
      return json({ ok: true });
    default:
      return err(400, "Unknown action.");
  }
}
