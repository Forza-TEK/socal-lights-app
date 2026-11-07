// Outreach safety net: what the owner's outreach agent (Grok) may ask the app, and the shared "do not contact" list.
//
// Least privilege: Grok never sees the database or any personal data. check() answers one status word per address. Prospect addresses are stored ONLY as
// one-way hashes: SHA-256 of (the lowercased, trimmed address + "|" + a secret salt). The salt is OUTREACH_SALT, else THROTTLE_SALT, else a constant. Pick the salt BEFORE the
// first use and never change it: a new salt makes every stored hash unmatchable (docs/monetization/grok-outreach-api.md).
//
// Statuses (strongest first): suppressed > registered > listing > review > clear. Anything but "clear" means: do NOT send acquisition mail.
import { sha256, normEmail } from "./auth.js";
import { ptToday } from "./time.js";
import { clean } from "./util.js";

export const SEGMENTS = ["installer", "contest", "event_host"];
export const REASONS = ["reply", "unsubscribe", "bounce", "complaint", "manual"];
export const EVENTS = ["sent", "reply", "bounce", "complaint", "unsubscribe"];
export const MAX_EMAILS = 50, RATE_PER_MIN = 60;

const cleanEmail = (e) => String(e == null ? "" : e).trim().toLowerCase();
const saltOf = (env) => (env && (env.OUTREACH_SALT || env.THROTTLE_SALT)) || "scl-outreach";
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;

// Both hashes of one address: h = the exact lowercased spelling, n = the same-person spelling (no +tag, no Gmail dots). They are equal for most addresses.
export async function outreachHashes(env, email) {
  const l = cleanEmail(email), n = normEmail(l) || l, salt = saltOf(env);
  const h = await sha256(l + "|" + salt);
  return { h, n: n === l ? h : await sha256(n + "|" + salt) };
}

// Free and shared mail providers: a matching domain says nothing about a business, so it never triggers a "review".
export const FREE_MAIL = new Set(["gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "rocketmail.com", "yahoo.co.uk", "outlook.com", "hotmail.com", "live.com", "msn.com", "aol.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "pm.me", "comcast.net", "att.net", "sbcglobal.net", "bellsouth.net", "verizon.net", "cox.net", "earthlink.net", "charter.net", "frontier.com", "mail.com", "gmx.com", "gmx.net", "zoho.com", "fastmail.com", "hey.com", "duck.com", "yandex.com", "qq.com", "163.com", "mailinator.com", "guerrillamail.com", "yopmail.com", "tempmail.com"]);
// Addresses on these sites are pages, not companies, so a registered listing that links to one proves nothing about an email at the same domain.
const PLATFORM_SITES = new Set(["facebook.com", "instagram.com", "eventbrite.com", "linktr.ee", "linkedin.com", "youtube.com", "tiktok.com", "twitter.com", "x.com", "google.com", "squarespace.com", "wixsite.com", "wordpress.com", "weebly.com", "godaddysites.com"]);
const domainOf = (e) => e.slice(e.lastIndexOf("@") + 1);
const hostOf = (w) => { try { return new URL(/^[a-z][a-z0-9+.-]*:/i.test(w) ? w : "https://" + w).hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, ""); } catch { return ""; } };
const okDomain = (d) => /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$/.test(d) && d.includes(".");
export const cleanDomain = (d) => { const s = String(d == null ? "" : d).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0].replace(/\.$/, ""); return okDomain(s) ? s : ""; };

// Where an address can already be in the app. Every column is compared in lowercase. kind decides the status; reason is a table label (never personal data).
const EXACT = [
  ["registered", "account", "users", "email", ""],
  ["suppressed", "app_unsubscribe", "email_prefs", "email", "optout = 1"],
  ["suppressed", "removal_request", "removal_requests", "email", ""],
  ["suppressed", "newsletter_unsubscribe", "newsletter_optins", "email", "unsubscribed_at IS NOT NULL"],
  ["listing", "event_submission", "event_submissions", "contact_email", ""],
  ["listing", "home_or_installer_post", "posts", "contact_email", ""],
  ["listing", "installer_profile", "installers", "owner_email", ""],
  ["listing", "installer_profile", "installers", "email", ""],
  ["listing", "contest_organizer", "contests", "contact_email", ""],
  ["listing", "contest_installer", "contests", "installer_email", ""],
  ["listing", "event_claim", "event_claims", "email", ""],
  ["listing", "quote_request", "contest_leads", "email", ""],
  ["listing", "quote_request", "installer_leads", "email", ""],
  ["listing", "contest_pass_inquiry", "contest_pass_leads", "email", ""],
  ["listing", "contest_staff", "contest_staff", "email", ""],
  ["listing", "contest_judge", "judges", "email", ""],
  ["listing", "contest_sponsor", "contest_sponsors", "email", ""],
  ["listing", "weekly_alert_signup", "alert_subs", "email", ""],
  ["listing", "order", "feature_orders", "email", ""],
  ["listing", "home_consent", "home_consents", "email", ""],
  ["listing", "newsletter_optin", "newsletter_optins", "email", "unsubscribed_at IS NULL"],
];
// Website columns of registered installers, organizers and hosts: a prospect whose email is at that site is probably the same business on another address.
const SITES = [["installers", "web", "installer_website", ""], ["contests", "installer_url", "contest_website", ""], ["posts", "web", "listing_website", ""], ["event_submissions", "url", "event_website", ""]];

const RANK = { clear: 0, review: 1, listing: 2, registered: 3, suppressed: 4 };
const slices = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const qs = (n) => Array(n).fill("?").join(",");

// Looks up addresses (and, optionally, plain domains) and returns one verdict per address, in order: { hash_prefix, status, reasons[] } (+ domains: [{ domain, status, reasons }]).
// At most 50 addresses per database round trip: every table is one statement of at most 90 bound parameters, and ALL statements of a slice go in ONE D1 batch (one outgoing call).
// Throws on ANY failure: the caller must answer "hold".
export async function checkEmails(env, emails, domains = []) {
  const out = [], domOut = [];
  const list = emails.map(cleanEmail);
  const doms = [...new Set(domains.map(cleanDomain).filter(Boolean))];
  const first = slices(list, MAX_EMAILS);
  for (let si = 0; si < Math.max(first.length, doms.length ? 1 : 0); si++) {
    const part = first[si] || [];
    const r = await checkSlice(env, part, si === 0 ? doms : []);
    out.push(...r.rows); domOut.push(...r.domains);
  }
  return { results: out, domains: domOut };
}

async function checkSlice(env, part, extraDomains) {
  const info = part.map((e) => ({ e, ok: validEmail(e), n: validEmail(e) ? normEmail(e) || e : e }));
  const cands = [...new Set(info.filter((x) => x.ok).flatMap((x) => [x.e, x.n]))];
  const hashes = await Promise.all(info.map((x) => (x.ok ? outreachHashes(env, x.e) : { h: "", n: "" })));
  const hashSet = [...new Set(hashes.flatMap((x) => [x.h, x.n]).filter(Boolean))];
  const emailDomains = new Set(info.filter((x) => x.ok).map((x) => domainOf(x.e)).filter((d) => okDomain(d) && !FREE_MAIL.has(d)));
  const domList = [...new Set([...emailDomains, ...extraDomains.filter((d) => !FREE_MAIL.has(d))])];
  const siteDoms = domList.filter((d) => !PLATFORM_SITES.has(d));

  const stmts = []; // { tag, sql, args }
  const add = (tag, sql, args) => stmts.push({ tag, stmt: env.DB.prepare(sql).bind(...args) });
  for (const chunk of slices(cands, 90)) {
    EXACT.forEach(([, , table, col, extra], i) => add("x" + i, `SELECT DISTINCT lower(${col}) AS e FROM ${table} WHERE lower(${col}) IN (${qs(chunk.length)})${extra ? " AND " + extra : ""}`, chunk));
  }
  for (const chunk of slices(hashSet, 90)) add("sup", `SELECT email_hash FROM outreach_suppressions WHERE email_hash IN (${qs(chunk.length)})`, chunk);
  for (const chunk of slices(domList, 90)) add("udom", `SELECT DISTINCT d FROM (SELECT lower(substr(email, instr(email, '@') + 1)) AS d FROM users) WHERE d IN (${qs(chunk.length)})`, chunk);
  for (const chunk of slices(siteDoms, 45)) SITES.forEach(([table, col], i) => add("s" + i, `SELECT lower(${col}) AS w FROM ${table} WHERE ${col} != '' AND (${chunk.map(() => `lower(${col}) LIKE ?`).join(" OR ")}) LIMIT 400`, chunk.map((d) => "%" + d.replace(/[%_]/g, "") + "%")));

  const res = stmts.length ? await env.DB.batch(stmts.map((s) => s.stmt)) : [];
  if (!Array.isArray(res) || res.length !== stmts.length) throw new Error("outreach lookup returned an unexpected shape");
  const hit = EXACT.map(() => new Set()), supSet = new Set(), userDoms = new Set(), siteHosts = SITES.map(() => new Set());
  stmts.forEach((s, k) => {
    const rows = res[k] && res[k].results;
    if (!Array.isArray(rows)) throw new Error("outreach lookup returned no rows array");
    if (s.tag === "sup") rows.forEach((r) => supSet.add(r.email_hash));
    else if (s.tag === "udom") rows.forEach((r) => userDoms.add(r.d));
    else if (s.tag[0] === "x") rows.forEach((r) => hit[+s.tag.slice(1)].add(r.e));
    else rows.forEach((r) => { const h = hostOf(r.w); if (h) siteHosts[+s.tag.slice(1)].add(h); });
  });
  // a site column can hold a deeper host (shop.acme.com for acme.com): that is the same company
  const siteMatch = (d) => SITES.map((_, i) => ([...siteHosts[i]].some((h) => h === d || h.endsWith("." + d)) ? i : -1)).filter((i) => i >= 0);
  const verdict = (domain) => {
    const reasons = [];
    if (userDoms.has(domain)) reasons.push("same_domain_as_account");
    for (const i of siteMatch(domain)) reasons.push("same_domain_as_" + SITES[i][2]);
    return reasons;
  };

  const rows = info.map((x, idx) => {
    const hash_prefix = x.ok ? hashes[idx].h.slice(0, 8) : "";
    if (!x.ok) return { hash_prefix, status: "review", reasons: ["invalid_address"] };
    let status = "clear"; const reasons = [];
    const bump = (s, r) => { if (!reasons.includes(r)) reasons.push(r); if (RANK[s] > RANK[status]) status = s; };
    EXACT.forEach(([kind, reason], i) => { if (hit[i].has(x.e) || hit[i].has(x.n)) bump(kind, reason); });
    if (supSet.has(hashes[idx].h) || supSet.has(hashes[idx].n)) bump("suppressed", "suppression_list");
    const d = domainOf(x.e);
    if (!FREE_MAIL.has(d)) for (const r of verdict(d)) bump("review", r);
    return { hash_prefix, status, reasons };
  });
  const domains = extraDomains.map((d) => {
    if (FREE_MAIL.has(d)) return { domain: d, status: "clear", reasons: ["free_mail_domain_not_checked"] };
    const reasons = verdict(d);
    return { domain: d, status: reasons.length ? "review" : "clear", reasons };
  });
  return { rows, domains };
}

// Statements that add an address to the do-not-contact list (idempotent: the first reason, source and date stay). Two rows when the address has a same-person spelling.
export async function suppressionStatements(env, email, reason, source) {
  const { h, n } = await outreachHashes(env, email), day = ptToday(), src = clean(source, 40);
  const ins = (hash, alias) => env.DB.prepare("INSERT OR IGNORE INTO outreach_suppressions (email_hash, reason, source, first_seen, alias) VALUES (?,?,?,?,?)").bind(hash, reason, src, day, alias);
  return n === h ? [ins(h, 0)] : [ins(h, 0), ins(n, 1)];
}
export async function addSuppression(env, email, reason, source) {
  const e = cleanEmail(email); if (!validEmail(e)) return false;
  await env.DB.batch(await suppressionStatements(env, e, reason, source));
  return true;
}
// Used by the app's own unsubscribe flows: must never break the unsubscribe the person just asked for.
export async function suppressFromApp(env, email, reason = "unsubscribe", source = "app") {
  try { return await addSuppression(env, email, reason, source); } catch { return false; }
}

// ---- the key and the rate limit ----
async function sameSecret(a, b) {
  const [x, y] = await Promise.all([sha256(String(a)), sha256(String(b))]); // equal length digests, compared without stopping at the first difference
  let d = 0; for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}
const reply = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
export { reply as outreachReply };

// Returns { res } (a Response to send back as is) or { keyId } when the call may go on.
//   no secret set (or a too short one): 503 {hold:true}; no / wrong Authorization: 401; more than 60 calls this minute: 429 {hold:true}; the rate-limit write failed: 503 {hold:true}.
export async function outreachGuard(request, env) {
  const secret = env.OUTREACH_API_KEY;
  if (!secret || String(secret).length < 16) return { res: reply(503, { hold: true, error: "Outreach checks are not set up. Hold all sends." }) };
  const m = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get("authorization") || "");
  if (!m || !(await sameSecret(m[1], secret))) return { res: reply(401, { error: "Not allowed." }) };
  const keyId = (await sha256("k|" + secret)).slice(0, 8), minute = Math.floor(Date.now() / 60000);
  try {
    const r = await env.DB.batch([
      env.DB.prepare("INSERT INTO outreach_rate (bucket, n) VALUES (?, 1) ON CONFLICT(bucket) DO UPDATE SET n = n + 1").bind(`${keyId}:${minute}`),
      env.DB.prepare("SELECT n FROM outreach_rate WHERE bucket = ?").bind(`${keyId}:${minute}`),
      env.DB.prepare("DELETE FROM outreach_rate WHERE CAST(substr(bucket, 10) AS INTEGER) < ?").bind(minute - 5),
    ]);
    const n = r[1].results[0].n;
    if (n > RATE_PER_MIN) return { res: reply(429, { hold: true, error: `At most ${RATE_PER_MIN} requests a minute. Wait and retry; hold sends meanwhile.` }, { "retry-after": "30" }) };
  } catch { return { res: reply(503, { hold: true, error: "Could not check the rate limit. Hold all sends." }) }; }
  return { keyId };
}

// A mail log line for the call: counts only, never an address (logOp also masks anything that looks like one).
export const countsLine = (what, rows) => {
  const c = { registered: 0, listing: 0, review: 0, suppressed: 0, clear: 0 };
  for (const r of rows) c[r.status]++;
  return `${what} n=${rows.length} registered=${c.registered} listing=${c.listing} review=${c.review} suppressed=${c.suppressed} clear=${c.clear}`;
};
export { cleanEmail };
