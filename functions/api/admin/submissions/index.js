// GET /api/admin/submissions?status=pending|published|declined — events people submitted through "Add your event".
import { json } from "../../../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const status = new URL(request.url).searchParams.get("status");
  const st = ["pending", "published", "declined"].includes(status) ? status : "pending";
  const { results } = await env.DB.prepare("SELECT * FROM event_submissions WHERE status = ? ORDER BY created_at DESC LIMIT 200").bind(st).all();
  return json(results);
}
