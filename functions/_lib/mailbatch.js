// Sending many emails without breaking Cloudflare's free-plan limits.
//
// Limits (docs/runbooks/cloudflare-limits.md): one request may make at most 50 subrequests, and every fetch() and every D1 or R2 call counts (a D1 batch() is one).
// The old way (sendTemplate in a loop) cost 3 to 5 subrequests per recipient, so a list of about 15 people already hit the cap and the rest silently got nothing.
// Here a list costs a handful of subrequests in total:
//   - renderMany: one settings read per template and one prefs read per 90 recipients (D1 allows 100 bound parameters per query);
//   - sendMessages: Resend's batch endpoint (POST /emails/batch, up to 100 messages per call);
//   - the outbox (table mail_outbox): big lists are queued, the first chunk is sent right away, and drainMail (called by the hourly workflow through POST /api/mail/drain)
//     sends the rest. A failed message is retried with a delay; after MAX_ATTEMPTS it is marked failed and logged to ops_log. Nothing is dropped silently.
import { byId, renderTemplate, isMarketing, unsubHeaders } from "./mailtpl.js";
import { logOp } from "./oplog.js";

const SITE = "https://socallights.app";
export const BATCH_MAX = 100;     // Resend: up to 100 messages per /emails/batch call
export const PARAM_MAX = 90;      // D1: 100 bound parameters per query; stay under it
export const DRAIN_CHUNK = 40;    // messages claimed per drain: rendering 100 emails costs about 9 ms of CPU and the free plan allows 10 ms per request, so a drain handles 40 (about 4 ms)
export const MAX_ATTEMPTS = 8;
const SPLIT_BUDGET = 12;          // extra Resend calls one drain may spend finding the one bad address in a refused batch
const clean = (e) => String(e || "").trim().toLowerCase();
export const slices = (a, n) => { const out = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; };
const newToken = () => [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(16).padStart(2, "0")).join("");

// { token, optout } for many addresses with a few queries (same rows as prefsFor makes one by one). Missing rows are created. Never throws: mail still goes out without a link.
export async function prefsMany(env, emails) {
  const map = new Map();
  const list = [...new Set(emails.map(clean).filter(Boolean))];
  const read = async (part) => {
    const { results } = await env.DB.prepare(`SELECT email, token, optout FROM email_prefs WHERE email IN (${part.map(() => "?").join(",")})`).bind(...part).all();
    for (const r of results) map.set(r.email, { token: r.token, optout: r.optout });
  };
  try {
    for (const part of slices(list, PARAM_MAX)) await read(part);
    const missing = list.filter((e) => !map.has(e));
    for (const part of slices(missing, BATCH_MAX)) await env.DB.batch(part.map((e) => env.DB.prepare("INSERT OR IGNORE INTO email_prefs (email, token) VALUES (?, ?)").bind(e, newToken())));
    for (const part of slices(missing, PARAM_MAX)) await read(part);
  } catch (e) { await logOp(env, "mail", "prefs lookup failed: " + (e && e.message)); }
  return map;
}

// Turns [{ id, to, vars }] into ready messages. Returns one entry per item: { skipped: true } (unsubscribed on purpose) or { msg: { to, subject, text, html, headers, tag } }.
export async function renderMany(env, items) {
  const saved = new Map();
  for (const id of new Set(items.map((i) => i.id))) {
    let s = null; try { s = await env.DB.prepare("SELECT subject, body FROM email_templates WHERE id = ?").bind(id).first(); } catch {}
    const t = byId(id); saved.set(id, s || (t ? { subject: t.subject, body: t.text } : null));
  }
  const prefs = await prefsMany(env, items.filter((i) => { const t = byId(i.id); return t && t.unsub === "link"; }).map((i) => i.to));
  const out = [];
  for (const i of items) {
    const t = byId(i.id);
    if (!i.to || !t) { out.push({ skipped: true, why: t ? "no address" : "unknown template" }); continue; }
    let unsubUrl, oneClick = "";
    if (t.unsub === "link") {
      const p = prefs.get(clean(i.to));
      if (p && p.optout) { out.push({ skipped: true, why: "unsubscribed" }); continue; }
      if (p) { unsubUrl = `${SITE}/unsubscribe?t=${p.token}`; oneClick = `${SITE}/api/unsub?t=${p.token}`; }
    } else if (t.unsub === "alerts" && i.vars && i.vars.unsub_url) oneClick = String(i.vars.unsub_url);
    try {
      const m = await renderTemplate(env, i.id, i.vars || {}, saved.get(i.id), unsubUrl || SITE + "/unsubscribe");
      out.push({ msg: { to: i.to, subject: m.subject, text: m.text, html: m.html, tag: i.id, headers: isMarketing(t) ? unsubHeaders(oneClick) : undefined } });
    } catch (e) { out.push({ skipped: true, why: "render failed", error: String(e && e.message).slice(0, 100) }); }
  }
  return out;
}

async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 40); }

// One call to Resend's batch endpoint (1 to 100 messages). Returns { results: [{ ok, retry, error }], stop } in message order. `stop` means "do not send more this run" (quota or rate limit).
async function postBatch(env, msgs, key) {
  const from = env.MAIL_FROM || "SoCal Lights <login@socallights.app>";
  try {
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) },
      body: JSON.stringify(msgs.map((m) => ({ from, to: [m.to], subject: m.subject, text: m.text, ...(m.html ? { html: m.html } : {}), ...(m.headers ? { headers: m.headers } : {}) }))),
    });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      const bad = new Map((Array.isArray(j.errors) ? j.errors : []).map((e) => [e.index, e.message]));
      return { results: msgs.map((_, i) => bad.has(i) ? { ok: false, retry: false, error: "refused: " + String(bad.get(i)).slice(0, 100) } : { ok: true }), stop: false };
    }
    const body = (await r.text().catch(() => "")).slice(0, 160);
    const quota = r.status === 429;
    return { results: msgs.map(() => ({ ok: false, retry: quota || r.status >= 500 || r.status === 409, quota, error: `mail service answered ${r.status} ${body}` })), stop: quota };
  } catch (e) {
    return { results: msgs.map(() => ({ ok: false, retry: true, error: "could not reach the mail service (" + String(e && e.message).slice(0, 80) + ")" })), stop: false };
  }
}

// Sends ready messages through the batch endpoint. A refused batch (bad address) is split in halves so one bad address does not block the rest (bounded by SPLIT_BUDGET calls).
// Returns { ok, retry, error }[] in message order. Failures are logged to ops_log (kind "email") with counts only.
export async function sendMessages(env, msgs, opts = {}) {
  const results = new Array(msgs.length);
  if (!msgs.length) return results;
  if (!env.RESEND_API_KEY) {
    const dev = env.DEV_AUTH === "1";
    if (dev) for (const m of msgs) console.log("[dev mail] to=" + m.to + " subject=" + m.subject);
    else await logOp(env, "email", `${opts.tag || "mail"}: RESEND_API_KEY is not set (${msgs.length} messages not sent)`);
    return msgs.map(() => ({ ok: false, retry: false, error: "no mail key" }));
  }
  let budget = SPLIT_BUDGET, stopped = false;
  const run = async (lo, hi) => {
    if (stopped) { for (let i = lo; i < hi; i++) results[i] = { ok: false, retry: true, quota: true, error: "paused: mail quota or rate limit" }; return; }
    const part = msgs.slice(lo, hi);
    const key = opts.idemKey ? await sha(opts.idemKey + ":" + lo + ":" + hi) : "";
    const r = await postBatch(env, part, key);
    if (r.stop) stopped = true;
    const refused = !r.results[0].ok && !r.results[0].retry && !r.stop;
    if (refused && part.length > 1 && budget > 0) { budget--; const mid = lo + Math.ceil(part.length / 2); await run(lo, mid); await run(mid, hi); return; }
    r.results.forEach((x, i) => { results[lo + i] = x; });
  };
  for (let lo = 0; lo < msgs.length; lo += BATCH_MAX) await run(lo, Math.min(msgs.length, lo + BATCH_MAX));
  const failed = results.filter((x) => !x.ok);
  if (failed.length) await logOp(env, "email", `${opts.tag || "mail"}: ${failed.length} of ${msgs.length} not sent: ${failed[0].error}`);
  return results;
}

// Render and send a small list right now (invitations, judge reminders, team notices). Returns one boolean per item (true = handed to the mail service). Skipped (unsubscribed) is false, as sendTemplate did.
export async function sendNow(env, items, tag = "mail") {
  const rendered = await renderMany(env, items);
  const idx = []; rendered.forEach((r, i) => { if (r.msg) idx.push(i); });
  const res = await sendMessages(env, idx.map((i) => rendered[i].msg), { tag });
  const ok = items.map(() => false); idx.forEach((i, k) => { ok[i] = !!(res[k] && res[k].ok); });
  return ok;
}

// ---- Outbox ----
// Queue [{ id, to, vars, dedupe? }]. `dedupe` makes a repeat of the same call harmless (same key = queued once). Returns the number of new rows. Throws if the queue could not be written (the caller logs and decides).
export async function enqueueMail(env, items) {
  let n = 0;
  for (const part of slices(items.filter((i) => i.to), BATCH_MAX)) {
    const res = await env.DB.batch(part.map((i) => env.DB.prepare("INSERT OR IGNORE INTO mail_outbox (template, to_email, vars, dedupe) VALUES (?, ?, ?, ?)").bind(i.id, String(i.to).trim(), JSON.stringify(i.vars || {}), i.dedupe || null)));
    n += Array.isArray(res) && res.length ? res.reduce((a, r) => a + ((r && r.meta && r.meta.changes) || 0), 0) : part.length;
  }
  return n;
}

const later = (min) => `datetime('now','+${min} minutes')`;
// Claim up to `limit` due messages, send them, record the outcome. Safe to run twice at once (the claim is one UPDATE ... RETURNING that also pushes next_at 15 minutes ahead).
// Returns { claimed, sent, skipped, retrying, failed, paused }.
export async function drainMail(env, { limit = DRAIN_CHUNK } = {}) {
  const out = { claimed: 0, sent: 0, skipped: 0, retrying: 0, failed: 0, paused: false };
  let rows = [];
  try {
    rows = (await env.DB.prepare(`UPDATE mail_outbox SET attempts = attempts + 1, next_at = ${later(15)} WHERE id IN (SELECT id FROM mail_outbox WHERE status = 'queued' AND next_at <= datetime('now') ORDER BY id LIMIT ?) RETURNING id, template, to_email, vars, attempts`).bind(Math.min(limit, BATCH_MAX)).all()).results || [];
  } catch (e) { await logOp(env, "mail", "outbox claim failed: " + (e && e.message)); return out; }
  out.claimed = rows.length;
  if (!rows.length) return out;
  const items = rows.map((r) => { let vars = {}; try { vars = JSON.parse(r.vars || "{}"); } catch {} return { id: r.template, to: r.to_email, vars }; });
  const rendered = await renderMany(env, items);
  const idx = []; rendered.forEach((r, i) => { if (r.msg) idx.push(i); });
  const res = await sendMessages(env, idx.map((i) => rendered[i].msg), { tag: "outbox", idemKey: rows.map((r) => r.id + "." + r.attempts).join(",") });
  const stmts = [], failedBy = new Map();
  rows.forEach((r, i) => {
    const k = idx.indexOf(i);
    if (k < 0) { out.skipped++; stmts.push(env.DB.prepare("UPDATE mail_outbox SET status = 'skipped', last_error = ?, vars = '{}' WHERE id = ?").bind(rendered[i].why || "skipped", r.id)); return; }
    const x = res[k];
    if (x.ok) { out.sent++; stmts.push(env.DB.prepare("UPDATE mail_outbox SET status = 'sent', sent_at = datetime('now'), last_error = '', vars = '{}' WHERE id = ?").bind(r.id)); return; }
    if (x.quota) out.paused = true;
    const final = !x.retry || (!x.quota && r.attempts >= MAX_ATTEMPTS);
    if (final) { out.failed++; failedBy.set(r.template, (failedBy.get(r.template) || 0) + 1); stmts.push(env.DB.prepare("UPDATE mail_outbox SET status = 'failed', last_error = ?, vars = '{}' WHERE id = ?").bind(String(x.error).slice(0, 200), r.id)); return; }
    out.retrying++;
    // quota or rate limit does not use up an attempt; it waits 3 hours. Other failures back off 10 minutes, then 2 hours.
    const wait = x.quota ? 180 : r.attempts < 3 ? 10 : 120;
    stmts.push(env.DB.prepare(`UPDATE mail_outbox SET ${x.quota ? "attempts = attempts - 1, " : ""}next_at = ${later(wait)}, last_error = ? WHERE id = ?`).bind(String(x.error).slice(0, 200), r.id));
  });
  try { for (const part of slices(stmts, BATCH_MAX)) await env.DB.batch(part); }
  catch (e) { await logOp(env, "mail", "outbox could not record results (messages may be sent again after 15 minutes): " + (e && e.message)); }
  for (const [t, n] of failedBy) await logOp(env, "email", `outbox: ${n} "${t}" message(s) failed for good (permanent refusal or ${MAX_ATTEMPTS} tries)`);
  return out;
}

// Housekeeping: sent and skipped rows go after 3 days, failed after 30, and anything still queued after 5 days is marked failed (so a dead mail key cannot pile up forever).
export async function pruneOutbox(env) {
  try {
    const exp = await env.DB.prepare("UPDATE mail_outbox SET status = 'failed', last_error = 'expired after 5 days', vars = '{}' WHERE status = 'queued' AND created_at < datetime('now','-5 days')").run();
    if (exp.meta && exp.meta.changes) await logOp(env, "email", `outbox: ${exp.meta.changes} message(s) expired unsent after 5 days`);
    await env.DB.prepare("DELETE FROM mail_outbox WHERE (status IN ('sent','skipped') AND created_at < datetime('now','-3 days')) OR (status = 'failed' AND created_at < datetime('now','-30 days'))").run();
  } catch (e) { await logOp(env, "mail", "outbox cleanup failed: " + (e && e.message)); }
}

export async function outboxRemaining(env) {
  try { return ((await env.DB.prepare("SELECT COUNT(*) AS n FROM mail_outbox WHERE status = 'queued'").first()) || {}).n || 0; } catch { return 0; }
}
