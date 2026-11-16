// GET /api/admin/log?area=&offset=  — what the admin tools were used for, newest first (50 a page).
import { json } from "../../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), area = ["users", "posts", "events", "contests", "submissions", "installers", "reports", "normalize"].includes(u.searchParams.get("area")) ? u.searchParams.get("area") : "";
  const offset = Math.max(0, parseInt(u.searchParams.get("offset") || "0", 10) || 0), PAGE = 50;
  const W = area ? " WHERE area = ?" : "", b = area ? [area] : [];
  const { n: total } = await env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_log${W}`).bind(...b).first();
  const cols = (d) => `SELECT id, at, admin, area, action, target_id, label${d ? ", detail" : ""} FROM admin_log${W} ORDER BY id DESC LIMIT ${PAGE} OFFSET ${offset}`;
  const { results } = await env.DB.prepare(cols(true)).bind(...b).all().catch(() => env.DB.prepare(cols(false)).bind(...b).all()); // before migration 0267 there is no detail column
  return json({ entries: results, total, offset, page: PAGE });
}
