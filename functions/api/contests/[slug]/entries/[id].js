// POST /api/contests/<slug>/entries/<id> { action: "approve" | "decline" } — organizer reviews one entry.
import { json, err } from "../../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../../_lib/auth.js";
import { ownerOf, approveEntry } from "../../../../_lib/contests.js";

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const row = await env.DB.prepare("SELECT * FROM posts WHERE id = ? AND contest_id = ?").bind(params.id, c.id).first();
  if (!row) return err(404, "That entry doesn't exist.");
  const b = await request.json().catch(() => ({}));
  if (b.action === "approve") { await approveEntry(env, row); return json({ ok: true }); }
  if (b.action === "decline") {
    await Promise.all(JSON.parse(row.photos || "[]").map((k) => env.PHOTOS.delete(k)));
    await env.DB.batch([env.DB.prepare("UPDATE posts SET status='declined', photos='[]' WHERE id = ?").bind(row.id), env.DB.prepare("DELETE FROM votes WHERE post_id = ?").bind(row.id)]);
    return json({ ok: true });
  }
  return err(400, "Unknown action.");
}
