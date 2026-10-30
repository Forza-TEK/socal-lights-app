// GET /api/admin/contests?status=pending|live|declined — contests created through "Add a contest".
import { json } from "../../../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const s = new URL(request.url).searchParams.get("status");
  const st = ["pending", "live", "closed", "declined"].includes(s) ? s : "pending";
  const { results } = await env.DB.prepare("SELECT c.*, u.email AS owner_email, (SELECT COUNT(*) FROM posts p WHERE p.contest_id = c.id) AS entries FROM contests c LEFT JOIN users u ON u.id = c.owner_id WHERE c.status = ? ORDER BY c.created_at DESC LIMIT 200").bind(st).all();
  return json(results);
}
