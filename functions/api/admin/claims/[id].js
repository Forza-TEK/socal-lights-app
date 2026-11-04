// POST /api/admin/claims/:id { action: "approve" | "decline" } — approving only lets the person buy Featured for the event (no edit rights).
// The admin middleware already required the Access login and logs this to admin_log (area "claims").
import { json, err } from "../../../_lib/util.js";

export async function onRequestPost({ request, env, params }) {
  const b = await request.json().catch(() => ({}));
  if (b.action !== "approve" && b.action !== "decline") return err(400, "Unknown action.");
  const c = await env.DB.prepare("SELECT id FROM event_claims WHERE id = ?").bind(params.id).first();
  if (!c) return err(404, "That claim no longer exists.");
  const ok = b.action === "approve";
  await env.DB.prepare("UPDATE event_claims SET status = ?, method = CASE WHEN ? THEN 'admin' ELSE method END, decided_at = datetime('now') WHERE id = ?")
    .bind(ok ? "approved" : "declined", ok ? 1 : 0, c.id).run();
  return json({ ok: true });
}
