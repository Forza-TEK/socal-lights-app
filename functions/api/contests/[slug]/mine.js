// PATCH /api/contests/<slug>/mine { id, name, desc } and DELETE ?id= — an entrant edits the name and description of their own home, or withdraws it.
// Photos and the address can't change here (they need a fresh review): withdraw and enter again.
import { json, err, clean } from "../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { getContest } from "../../../_lib/contests.js";

async function mine(request, env, slug, id) {
  const user = await getUser(request, env);
  if (!user) return { res: err(401, "Please sign in first.") };
  const c = await getContest(env, slug);
  if (!c) return { res: err(404, "Not found.") };
  if (c.announced) return { res: err(400, "The winners are announced and the results are locked.") };
  const row = await env.DB.prepare("SELECT * FROM posts WHERE id = ? AND contest_id = ? AND user_id = ?").bind(id, c.id, user.id).first();
  if (!row || row.status === "declined") return { res: err(404, "That entry isn't yours.") };
  return { c, row };
}
export async function onRequestPatch({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const b = await request.json().catch(() => ({}));
  const { row, res } = await mine(request, env, params.slug, String(b.id || ""));
  if (res) return res;
  const name = clean(b.name, 80), desc = clean(b.desc, 300);
  if (name.length < 2) return err(400, "Add the name for the entry.");
  await env.DB.prepare("UPDATE posts SET biz = ?, title = ?, descr = ? WHERE id = ?").bind(name, name, desc || `Entry in ${params.slug}`, row.id).run();
  return json({ ok: true });
}
export async function onRequestDelete({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { row, res } = await mine(request, env, params.slug, new URL(request.url).searchParams.get("id") || "");
  if (res) return res;
  await Promise.all(JSON.parse(row.photos || "[]").map((k) => env.PHOTOS.delete(k)));
  await env.DB.batch([env.DB.prepare("UPDATE posts SET status='declined', photos='[]' WHERE id = ?").bind(row.id), env.DB.prepare("DELETE FROM votes WHERE post_id = ?").bind(row.id)]);
  return json({ ok: true });
}
