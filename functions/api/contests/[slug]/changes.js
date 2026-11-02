// GET /api/contests/<slug>/changes — the organizing team sees who changed which setting, and when.
import { json } from "../../../_lib/util.js";
import { getUser } from "../../../_lib/auth.js";
import { ownerOf } from "../../../_lib/contests.js";

export async function onRequestGet({ params, request, env }) {
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const { results } = await env.DB.prepare("SELECT by_name, by_email, field, old, new, at FROM contest_changes WHERE contest_id = ? ORDER BY at DESC, rowid DESC LIMIT 40").bind(c.id).all();
  return json({ changes: results }, { headers: { "cache-control": "no-store" } });
}
