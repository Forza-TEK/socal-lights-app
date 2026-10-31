// GET /api/admin/log?area=&offset=  — what the admin tools were used for, newest first (50 a page).
import { json } from "../../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), area = ["users", "posts", "events", "contests", "submissions"].includes(u.searchParams.get("area")) ? u.searchParams.get("area") : "";
  const offset = Math.max(0, parseInt(u.searchParams.get("offset") || "0", 10) || 0), PAGE = 50;
  const W = area ? " WHERE area = ?" : "", b = area ? [area] : [];
  const { n: total } = await env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_log${W}`).bind(...b).first();
  const { results } = await env.DB.prepare(`SELECT id, at, admin, area, action, target_id, label FROM admin_log${W} ORDER BY id DESC LIMIT ${PAGE} OFFSET ${offset}`).bind(...b).all();
  return json({ entries: results, total, offset, page: PAGE });
}
