// POST /api/outreach/event { email, event: sent|reply|bounce|complaint|unsubscribe, step: 0|1|2, segment: installer|contest|event_host }
// Stores one result row (hash, event, step, segment, Pacific date) for reporting. A reply, bounce, complaint or unsubscribe ALSO adds the address to the do-not-contact list.
import { outreachGuard, outreachReply, suppressionStatements, outreachHashes, cleanEmail, validEmail, EVENTS, SEGMENTS } from "../../_lib/outreach.js";
import { logOp } from "../../_lib/oplog.js";
import { ptToday } from "../../_lib/time.js";

export async function onRequest({ request, env }) {
  const g = await outreachGuard(request, env);
  if (g.res) return g.res;
  if (request.method !== "POST") return outreachReply(405, { hold: true, error: "Use POST." });
  const b = (await request.json().catch(() => null)) || {};
  const email = cleanEmail(b.email);
  if (!validEmail(email) || !EVENTS.includes(b.event) || ![0, 1, 2].includes(b.step) || !SEGMENTS.includes(b.segment)) return outreachReply(400, { hold: true, error: `Send { "email", "event": ${EVENTS.join("|")}, "step": 0|1|2, "segment": ${SEGMENTS.join("|")} }.` });
  try {
    const { h, n } = await outreachHashes(env, email);
    const stmts = [env.DB.prepare("INSERT INTO outreach_events (email_hash, alias_hash, event, step, segment, day) VALUES (?,?,?,?,?,?)").bind(h, n === h ? "" : n, b.event, b.step, b.segment, ptToday())];
    if (b.event !== "sent") stmts.push(...(await suppressionStatements(env, email, b.event, "outreach")));
    await env.DB.batch(stmts);
    await logOp(env, "outreach", `event ${b.event} step=${b.step} segment=${b.segment}`);
    return outreachReply(200, { ok: true, suppressed: b.event !== "sent", email_hash_prefix: h.slice(0, 8) });
  } catch (e) { await logOp(env, "outreach", "event failed (" + String(e && e.message).slice(0, 80) + ")"); return outreachReply(503, { hold: true, error: "Could not save. Hold all sends and retry." }); }
}
