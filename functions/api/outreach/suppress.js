// POST /api/outreach/suppress { email, reason: reply|unsubscribe|bounce|complaint|manual, source: string up to 40 }
// Adds the address to the shared do-not-contact list as a one-way hash. Idempotent. Answers { ok: true, email_hash_prefix }.
import { outreachGuard, outreachReply, addSuppression, outreachHashes, cleanEmail, validEmail, REASONS } from "../../_lib/outreach.js";
import { logOp } from "../../_lib/oplog.js";

export async function onRequest({ request, env }) {
  const g = await outreachGuard(request, env);
  if (g.res) return g.res;
  if (request.method !== "POST") return outreachReply(405, { hold: true, error: "Use POST." });
  const b = (await request.json().catch(() => null)) || {};
  const email = cleanEmail(b.email), source = typeof b.source === "string" ? b.source.trim() : "";
  if (!validEmail(email) || !REASONS.includes(b.reason) || source.length > 40) return outreachReply(400, { hold: true, error: `Send { "email", "reason": ${REASONS.join("|")}, "source": up to 40 characters }.` });
  try { await addSuppression(env, email, b.reason, source); }
  catch (e) { await logOp(env, "outreach", "suppress failed (" + String(e && e.message).slice(0, 80) + ")"); return outreachReply(503, { hold: true, error: "Could not save. Hold all sends and retry." }); }
  await logOp(env, "outreach", `suppress reason=${b.reason}`);
  return outreachReply(200, { ok: true, suppressed: true, email_hash_prefix: (await outreachHashes(env, email)).h.slice(0, 8) });
}
