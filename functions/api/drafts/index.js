// GET  /api/drafts                          your saved add-form drafts (no answers, just the list).
// POST /api/drafts { id?, kind, title, data, step }  save a draft (new, or update yours by id). Signed in only.
import { json, err, clean, newId } from "../../_lib/util.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";

const KINDS = ["event", "house", "contest"], MAX_DRAFTS = 10, MAX_BYTES = 30_000;

export async function onRequestGet({ request, env }) {
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const { results } = await env.DB.prepare("SELECT id,kind,title,step,updated_at FROM drafts WHERE user_id = ? ORDER BY updated_at DESC").bind(user.id).all();
  return json(results, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const b = await request.json().catch(() => null);
  if (!b || !KINDS.includes(b.kind) || typeof b.data !== "object" || !b.data) return err(400, "That draft couldn't be saved.");
  const data = JSON.stringify(b.data);
  if (data.length > MAX_BYTES) return err(400, "That draft is too large to save.");
  const title = clean(b.title, 90) || "Untitled", step = Math.max(0, Math.min(50, parseInt(b.step, 10) || 0));
  if (b.id) {
    const r = await env.DB.prepare("UPDATE drafts SET title = ?, data = ?, step = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?").bind(title, data, step, String(b.id), user.id).run();
    if (r.meta.changes) return json({ ok: true, id: String(b.id) });
  }
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM drafts WHERE user_id = ?").bind(user.id).first();
  if (n >= MAX_DRAFTS) return err(400, "You have 10 saved drafts. Delete one on your profile to save another.");
  const id = newId();
  await env.DB.prepare("INSERT INTO drafts (id,user_id,kind,title,data,step) VALUES (?,?,?,?,?,?)").bind(id, user.id, b.kind, title, data, step).run();
  return json({ ok: true, id });
}
