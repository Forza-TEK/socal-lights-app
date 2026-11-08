// Free deliverability pre-check for the outreach API (POST /api/outreach/check with verify:true). No third party except Cloudflare's public DNS-over-HTTPS resolver,
// which receives ONLY a domain name (never the part before the @). It catches typos, dead domains and throwaway addresses. It does NOT prove a mailbox exists:
// there is no SMTP probing. Real bounces are still reported by Grok through /api/outreach/event.
//
// deliverability: ok | invalid_syntax | no_mail_server | disposable | unknown.   A lookup that times out or fails is "unknown", never "no_mail_server".
export const MAX_NEW_DOMAINS = 20;   // distinct domains not in the cache, per call
const FETCH_BUDGET = 38;              // outgoing DNS fetches per call (Free plan: 50 subrequests per request, and the check itself uses about 8)
const CONCURRENCY = 5, TIMEOUT_MS = 2000, TTL_MS = 24 * 3600_000;
const DOH = "https://cloudflare-dns.com/dns-query";

// A modest list of well-known throwaway-mail services. A subdomain of one of these counts too.
export const DISPOSABLE = new Set(["mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com", "sharklasers.com", "grr.la", "yopmail.com", "yopmail.net", "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmail.net", "10minutemail.com", "10minutemail.net", "20minutemail.com", "throwawaymail.com", "trashmail.com", "trashmail.net", "trash-mail.com", "getnada.com", "nada.email", "maildrop.cc", "dispostable.com", "fakeinbox.com", "mailnesia.com", "mintemail.com", "mytemp.email", "mohmal.com", "emailondeck.com", "spamgourmet.com", "spam4.me", "tempinbox.com", "tempr.email", "discard.email", "mailcatch.com", "moakt.com", "burnermail.io", "inboxkitten.com", "harakirimail.com", "mailforspam.com", "jetable.org", "spambox.us", "tmail.ws", "tmpmail.org", "tmpmail.net", "mail7.io", "emailfake.com", "fakemail.net", "luxusmail.org"]);

const LOCAL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
// Strict syntax on an already lowercased and trimmed address: exactly one @, no spaces, local part up to 64 characters, a real dotted domain (letters, digits, hyphens), total up to 254.
export function strictSyntax(e) {
  if (typeof e !== "string" || !e || e.length > 254) return false;
  const at = e.indexOf("@");
  if (at < 1 || at !== e.lastIndexOf("@")) return false;
  const local = e.slice(0, at), domain = e.slice(at + 1);
  if (local.length > 64 || !LOCAL_RE.test(local) || domain.length > 253) return false;
  const labels = domain.split(".");
  if (labels.length < 2 || !labels.every((l) => LABEL_RE.test(l))) return false;
  return /^([a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(labels[labels.length - 1]);
}
export const isDisposable = (d) => { for (const x of DISPOSABLE) if (d === x || d.endsWith("." + x)) return true; return false; };

const withTimeout = (p, ms, ac) => new Promise((res, rej) => { const t = setTimeout(() => { ac.abort(); rej(new Error("timeout")); }, ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });
// One DoH question. Throws on a timeout, a failed fetch, an HTTP error or the call budget running out (the caller turns any throw into "unknown").
async function ask(domain, type, ctx) {
  if (ctx.left <= 0) throw new Error("budget");
  ctx.left--;
  const ac = new AbortController();
  const r = await withTimeout(fetch(`${DOH}?name=${encodeURIComponent(domain)}&type=${type}`, { headers: { accept: "application/dns-json" }, signal: ac.signal }), ctx.timeout, ac);
  if (!r.ok) throw new Error("http " + r.status);
  const j = await withTimeout(r.json(), ctx.timeout, ac);
  if (!j || typeof j.Status !== "number") throw new Error("bad answer");
  return j;
}
const has = (j, t) => Array.isArray(j.Answer) && j.Answer.some((a) => a && a.type === t);

// ok: has an MX (or, with none, an A or AAAA record, RFC 5321 section 5.1). no_mail_server: the name does not exist (NXDOMAIN), has a null MX ("0 ."), or has no MX, A or AAAA. unknown: anything unclear.
export async function lookupDomain(domain, ctx) {
  try {
    const mx = await ask(domain, "MX", ctx);
    if (mx.Status === 3) return "no_mail_server";
    if (mx.Status !== 0) return "unknown";
    if (has(mx, 15)) {
      const real = mx.Answer.filter((a) => a && a.type === 15 && !/^\s*\d+\s+\.?\s*$/.test(String(a.data)));
      return real.length ? "ok" : "no_mail_server"; // only a null MX (RFC 7505): the domain says it takes no mail
    }
    const a = await ask(domain, "A", ctx);
    if (a.Status === 0 && has(a, 1)) return "ok";
    if (a.Status !== 0 && a.Status !== 3) return "unknown";
    const aaaa = await ask(domain, "AAAA", ctx);
    if (aaaa.Status === 0 && has(aaaa, 28)) return "ok";
    return aaaa.Status === 0 || aaaa.Status === 3 ? "no_mail_server" : "unknown";
  } catch { return "unknown"; }
}

// Cached verdicts for domains (24 hours). A failed read behaves like an empty cache.
export async function cachedDomains(env, domains) {
  const out = new Map();
  if (!domains.length) return out;
  try {
    const cutoff = Date.now() - TTL_MS;
    const rows = (await env.DB.prepare(`SELECT domain, result FROM outreach_dns_cache WHERE checked_at > ? AND domain IN (${domains.map(() => "?").join(",")})`).bind(cutoff, ...domains).all()).results;
    for (const r of rows) out.set(r.domain, r.result);
  } catch { /* empty cache */ }
  return out;
}

// Looks up the given (uncached) domains with limited concurrency; writes definitive answers to the cache in one batch. Returns Map domain -> verdict and the number of DNS fetches made.
export async function lookupDomains(env, domains) {
  const ms = Number(env && env.OUTREACH_DNS_TIMEOUT_MS), ctx = { left: FETCH_BUDGET, timeout: ms > 0 && ms < TIMEOUT_MS ? ms : TIMEOUT_MS };
  const out = new Map(), queue = [...domains];
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => { for (let d; (d = queue.shift()); ) out.set(d, await lookupDomain(d, ctx)); }));
  const now = Date.now(), keep = [...out].filter(([, v]) => v === "ok" || v === "no_mail_server");
  try {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM outreach_dns_cache WHERE checked_at < ?").bind(now - 2 * TTL_MS),
      ...keep.map(([d, v]) => env.DB.prepare("INSERT INTO outreach_dns_cache (domain, result, checked_at) VALUES (?,?,?) ON CONFLICT(domain) DO UPDATE SET result = excluded.result, checked_at = excluded.checked_at").bind(d, v, now)),
    ]);
  } catch { /* the answer is still good; it just is not cached */ }
  return { verdicts: out, fetches: FETCH_BUDGET - ctx.left };
}
