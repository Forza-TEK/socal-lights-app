// POST /api/admin/claims/:id { action: "approve" | "decline" } — approving only lets the person buy Featured for the event (no edit rights).
// The admin middleware already required the Access login and logs this to admin_log (area "claims").
// The person is emailed the decision once (templates claim_approved / claim_declined). A repeat click, or a claim that was already
// approved on its own (email matched the event's website), sends nothing. A failed email is logged and never blocks the decision;
// it is not marked as sent, so a later click can send it.
import { json, err } from "../../../_lib/util.js";
import { sendClaimDecisionEmail } from "../../../_lib/claimmail.js";
import { logOp } from "../../../_lib/oplog.js";

export async function onRequestPost({ request, env, params }) {
  const b = await request.json().catch(() => ({}));
  if (b.action !== "approve" && b.action !== "decline") return err(400, "Unknown action.");
  const c = await env.DB.prepare("SELECT id, event_id, email, status, method FROM event_claims WHERE id = ?").bind(params.id).first();
  if (!c) return err(404, "That claim no longer exists.");
  const ok = b.action === "approve", status = ok ? "approved" : "declined";
  await env.DB.prepare("UPDATE event_claims SET status = ?, method = CASE WHEN ? THEN 'admin' ELSE method END, decided_at = datetime('now') WHERE id = ?")
    .bind(status, ok ? 1 : 0, c.id).run();

  let emailed = false;
  try {
    if (!(ok && c.status === "approved" && c.method === "domain")) { // an automatic approval was never meant to send one
      // Reserve the send first (so two quick clicks cannot both email), then give the reservation back if the email fails.
      const r = await env.DB.prepare("UPDATE event_claims SET emailed_status = ? WHERE id = ? AND COALESCE(emailed_status, '') <> ?").bind(status, c.id, status).run();
      if (r.meta && r.meta.changes) {
        const ev = await env.DB.prepare("SELECT name FROM events WHERE id = ?").bind(c.event_id).first();
        emailed = await sendClaimDecisionEmail(env, { approved: ok, email: c.email, eventId: c.event_id, name: ev && ev.name });
        if (!emailed) await env.DB.prepare("UPDATE event_claims SET emailed_status = NULL WHERE id = ? AND emailed_status = ?").bind(c.id, status).run();
      }
    }
  } catch (e) { await logOp(env, "email", `claim decision email: ${e && e.message}`); }
  return json({ ok: true, emailed });
}
