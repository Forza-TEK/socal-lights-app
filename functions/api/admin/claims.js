// /api/admin/claims — people who say an event is theirs. Approving only lets them buy a Featured placement for it (no edit rights).
//   GET  ?status=pending|approved|declined   (pending first)
//   POST /api/admin/claims/:id { action: "approve" | "decline" }  (claims/[id].js)
// The admin middleware (_middleware.js) has already required the Cloudflare Access login and logs the POST to admin_log (area "claims").
import { json } from "../../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const s = new URL(request.url).searchParams.get("status");
  const where = ["pending", "approved", "declined"].includes(s) ? "c.status = ?" : "1 = ?";
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.event_id, c.status, c.method, c.created_at, c.decided_at, c.email AS claimant, e.name, e.city, e.url, e.end_date
     FROM event_claims c LEFT JOIN events e ON e.id = c.event_id WHERE ${where}
     ORDER BY (c.status = 'pending') DESC, c.created_at DESC LIMIT 200`).bind(where === "1 = ?" ? 1 : s).all();
  return json(results, { headers: { "cache-control": "no-store" } });
}
