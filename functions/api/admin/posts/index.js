// GET /api/admin/posts?status=pending|approved|declined
import { json, rowToPost } from "../../../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const status = new URL(request.url).searchParams.get("status") || "pending";
  if (!["pending", "approved", "declined"].includes(status)) return json([]);
  const { results } = await env.DB.prepare("SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC LIMIT 500").bind(status).all();
  return json(results.map((r) => rowToPost(r, true)));
}
