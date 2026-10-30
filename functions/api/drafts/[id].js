// GET    /api/drafts/<id>  one of your drafts, with its answers.
// DELETE /api/drafts/<id>  delete it.
import { json, err } from "../../_lib/util.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";

export async function onRequestGet({ params, request, env }) {
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const d = await env.DB.prepare("SELECT id,kind,title,data,step FROM drafts WHERE id = ? AND user_id = ?").bind(params.id, user.id).first();
  if (!d) return err(404, "That draft doesn't exist.");
  return json({ id: d.id, kind: d.kind, title: d.title, step: d.step, data: JSON.parse(d.data) }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestDelete({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  await env.DB.prepare("DELETE FROM drafts WHERE id = ? AND user_id = ?").bind(params.id, user.id).run();
  return json({ ok: true });
}
