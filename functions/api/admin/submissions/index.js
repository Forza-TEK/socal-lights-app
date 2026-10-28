// GET /api/admin/submissions?status=pending|published|declined — events people submitted through "Add your event".
import { json } from "../../../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const status = new URL(request.url).searchParams.get("status");
  const st = ["pending", "published", "declined"].includes(status) ? status : "pending";
  const { results } = await env.DB.prepare("SELECT s.*, (SELECT group_concat(plan) FROM feature_orders WHERE event_id = 'sub:' || s.id) AS paid_plans FROM event_submissions s WHERE s.status = ? ORDER BY s.created_at DESC LIMIT 200").bind(st).all();
  return json(results);
}
