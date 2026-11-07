// POST /api/outreach/check { emails: [up to 50], domains?: [up to 50] }
// Verdict only, no personal data. For each address, in order: { i, email_hash_prefix, status, reasons[] }, status one of
//   clear | registered | listing | review | suppressed.   Send acquisition mail ONLY when status is "clear".
// Any lookup failure answers 503 { hold: true }: hold every send. See docs/monetization/grok-outreach-api.md.
import { outreachGuard, outreachReply, checkEmails, countsLine, MAX_EMAILS } from "../../_lib/outreach.js";
import { logOp } from "../../_lib/oplog.js";

export async function onRequest({ request, env }) {
  const g = await outreachGuard(request, env);
  if (g.res) return g.res;
  if (request.method !== "POST") return outreachReply(405, { hold: true, error: "Use POST." });
  const b = await request.json().catch(() => null);
  const emails = b && b.emails, domains = b && b.domains === undefined ? [] : b && b.domains;
  if (!Array.isArray(emails) || !emails.length || emails.length > MAX_EMAILS || !emails.every((e) => typeof e === "string" && e.length <= 320)) return outreachReply(400, { hold: true, error: `Send { "emails": [1 to ${MAX_EMAILS} strings] }.` });
  if (!Array.isArray(domains) || domains.length > MAX_EMAILS || !domains.every((d) => typeof d === "string" && d.length <= 253)) return outreachReply(400, { hold: true, error: `"domains" must be a list of at most ${MAX_EMAILS} strings.` });
  let r;
  try { r = await checkEmails(env, emails, domains); }
  catch (e) { await logOp(env, "outreach", `check failed n=${emails.length} (${String(e && e.message).slice(0, 80)})`); return outreachReply(503, { hold: true, error: "The check could not be completed. Hold all sends." }); }
  await logOp(env, "outreach", countsLine("check", r.results));
  return outreachReply(200, {
    ok: true,
    results: r.results.map((x, i) => ({ i, email_hash_prefix: x.hash_prefix, status: x.status, reasons: x.reasons })),
    ...(domains.length ? { domains: r.domains } : {}),
  });
}
