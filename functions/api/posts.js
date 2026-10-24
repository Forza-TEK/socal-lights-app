// GET /api/posts — approved showcased houses, for the public map.
import { json, rowToPost } from "../_lib/util.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM posts WHERE status = 'approved' ORDER BY approved_at DESC LIMIT 500"
  ).all();
  return json(results.map((r) => rowToPost(r)), { headers: { "cache-control": "public, max-age=60" } });
}
