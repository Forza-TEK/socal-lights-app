// POST /api/admin/contests/<id> { action: "approve" | "decline" } — the site owner reviews a contest.
import { json, err } from "../../../_lib/util.js";
import { listOnMap, unlistFromMap } from "../../../_lib/contests.js";

export async function onRequestPost({ params, request, env }) {
  const c = await env.DB.prepare("SELECT * FROM contests WHERE id = ?").bind(params.id).first();
  if (!c) return err(404, "That contest no longer exists.");
  const b = await request.json().catch(() => ({}));
  if (b.action === "approve") {
    await env.DB.prepare("UPDATE contests SET status='live', note='', updated_at=datetime('now') WHERE id=?").bind(c.id).run();
    await listOnMap(env, { ...c, status: "live" });
    return json({ ok: true });
  }
  if (b.action === "decline") {
    await env.DB.prepare("UPDATE contests SET status='declined', updated_at=datetime('now') WHERE id=?").bind(c.id).run();
    await unlistFromMap(env, c);
    return json({ ok: true });
  }
  return err(400, "Unknown action.");
}
