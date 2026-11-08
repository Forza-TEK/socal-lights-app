// POST /api/outreach/check { emails: [up to 50], domains?: [up to 50], verify?: true }
// Verdict only, no personal data. For each address, in order: { i, email_hash_prefix, status, reasons[], sequence, deliverability? }, status one of
//   clear | registered | listing | review | suppressed.   Send acquisition mail ONLY when status is "clear", sequence.due is true (for sequence.next_step) and, when verify was asked, deliverability is ok or unknown.
//   sequence: { next_step: 0|1|2|null, due, due_on: 'YYYY-MM-DD'|null, reason }, computed from the 'sent' events Grok reported (original, follow-up 1 on day 4, follow-up 2 on day 10, then finished).
//   verify:true adds deliverability: ok | invalid_syntax | no_mail_server | disposable | unknown (free DNS check, at most 20 new domains per call; it does not prove a mailbox exists).
// Any lookup failure answers 503 { hold: true }: hold every send. See docs/monetization/grok-outreach-api.md.
import { outreachGuard, outreachReply, checkEmails, countsLine, cleanEmail, validEmail, FREE_MAIL, MAX_EMAILS } from "../../_lib/outreach.js";
import { strictSyntax, isDisposable, cachedDomains, lookupDomains, MAX_NEW_DOMAINS } from "../../_lib/deliverability.js";
import { logOp } from "../../_lib/oplog.js";

const domainOf = (e) => e.slice(e.lastIndexOf("@") + 1);
const BAD = ["invalid_syntax", "no_mail_server", "disposable"];

export async function onRequest({ request, env }) {
  const g = await outreachGuard(request, env);
  if (g.res) return g.res;
  if (request.method !== "POST") return outreachReply(405, { hold: true, error: "Use POST." });
  const b = await request.json().catch(() => null);
  const emails = b && b.emails, domains = b && b.domains === undefined ? [] : b && b.domains;
  if (!Array.isArray(emails) || !emails.length || emails.length > MAX_EMAILS || !emails.every((e) => typeof e === "string" && e.length <= 320)) return outreachReply(400, { hold: true, error: `Send { "emails": [1 to ${MAX_EMAILS} strings] }.` });
  if (!Array.isArray(domains) || domains.length > MAX_EMAILS || !domains.every((d) => typeof d === "string" && d.length <= 253)) return outreachReply(400, { hold: true, error: `"domains" must be a list of at most ${MAX_EMAILS} strings.` });
  if (b.verify !== undefined && typeof b.verify !== "boolean") return outreachReply(400, { hold: true, error: '"verify" must be true or false.' });
  let r;
  try { r = await checkEmails(env, emails, domains); }
  catch (e) { await logOp(env, "outreach", `check failed n=${emails.length} (${String(e && e.message).slice(0, 80)})`); return outreachReply(503, { hold: true, error: "The check could not be completed. Hold all sends." }); }

  // deliverability pre-check (optional)
  let deliv = null, dnsFetches = 0;
  if (b.verify === true) {
    const list = emails.map(cleanEmail);
    deliv = list.map((e, i) => {
      if (!validEmail(e) || !strictSyntax(e)) return "invalid_syntax";
      const d = domainOf(e);
      if (isDisposable(d)) return "disposable";
      if (r.results[i].invalid) return r.results[i].invalid; // Grok already reported it undeliverable
      return FREE_MAIL.has(d) ? "ok" : null; // null: needs a DNS answer
    });
    const need = [...new Set(list.filter((_, i) => deliv[i] === null).map(domainOf))];
    const cache = await cachedDomains(env, need);
    const fresh = need.filter((d) => !cache.has(d));
    if (fresh.length > MAX_NEW_DOMAINS) return outreachReply(400, { hold: true, error: `With verify, at most ${MAX_NEW_DOMAINS} new domains per call (this batch has ${fresh.length}). Send a smaller batch, or send the same addresses again later: answers are cached for 24 hours.` });
    const looked = fresh.length ? await lookupDomains(env, fresh) : { verdicts: new Map(), fetches: 0 };
    dnsFetches = looked.fetches;
    list.forEach((e, i) => { if (deliv[i] === null) { const d = domainOf(e); deliv[i] = cache.get(d) || looked.verdicts.get(d) || "unknown"; } });
  }
  await logOp(env, "outreach", countsLine("check", r.results));
  return outreachReply(200, {
    ok: true,
    results: r.results.map((x, i) => {
      const bad = BAD.includes(x.invalid) ? x.invalid : deliv && BAD.includes(deliv[i]) ? deliv[i] : "";
      const sequence = bad && x.sequence.next_step !== null ? { next_step: null, due: false, due_on: null, reason: "undeliverable_" + bad } : x.sequence;
      return { i, email_hash_prefix: x.hash_prefix, status: x.status, reasons: x.reasons, sequence, ...(deliv ? { deliverability: deliv[i] } : {}) };
    }),
    ...(domains.length ? { domains: r.domains } : {}),
    ...(deliv ? { verify: { dns_lookups: dnsFetches } } : {}),
  });
}
