// GET /api/admin/submissions?status=pending|published|declined — events people submitted through "Add your event".
import { json } from "../../../_lib/util.js";
import { eventCovers } from "../../../_lib/cover.js";

export async function onRequestGet({ request, env }) {
  const status = new URL(request.url).searchParams.get("status");
  const st = ["pending", "published", "declined"].includes(status) ? status : "pending";
  const { results } = await env.DB.prepare("SELECT s.*, (SELECT status FROM events WHERE id = s.event_id) AS event_status, (SELECT group_concat(plan) FROM feature_orders WHERE event_id = 'sub:' || s.id) AS paid_plans FROM event_submissions s WHERE s.status = ? ORDER BY s.created_at DESC LIMIT 200").bind(st).all();
  const cov = await eventCovers(env, results.map((r) => r.event_id));
  return json(results.map((r) => ({ ...r, cover: cov[r.event_id] || "" })));
}
