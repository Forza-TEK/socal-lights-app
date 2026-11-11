import { isQuotaError } from "./cflimits.js";

// A small error log for things nobody would otherwise notice: a failed email, a Stripe webhook that threw.
// logOp never throws and never blocks the request. The admin digest (functions/api/admin-digest.js) reports what was logged since its last email.
// Keep `detail` technical and free of personal data (no email addresses, names or message text).
// A message that says a Cloudflare or Resend quota is used up ("exceeded", "rows read", "daily limit", "Too many subrequests"...) is filed
// under kind "limit" (the original kind goes in front of the detail), so Admin > Usage, the Admin home banner and the digest can say "limit hit at <time>".
// Repeats within ten minutes are dropped. (When D1 itself is over its quota this insert fails too: the console line and Cloudflare analytics still show it.)
export async function logOp(env, kind, detail = "") {
  try {
    if (kind !== "limit" && isQuotaError(detail)) { detail = `${kind}: ${detail}`; kind = "limit"; }
    if (kind === "limit") {
      console.error("[ops] limit", String(detail).slice(0, 200));
      const recent = await env.DB.prepare("SELECT id FROM ops_log WHERE kind = 'limit' AND created_at > datetime('now','-10 minutes') LIMIT 1").first();
      if (recent) return;
    }
    console.error("[ops]", kind, String(detail).slice(0, 200));
    await env.DB.prepare("INSERT INTO ops_log (kind, detail) VALUES (?, ?)").bind(String(kind).slice(0, 40), String(detail).replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]").slice(0, 300)).run();
  } catch {}
}

// Like logOp, but the same kind and detail is filed only once per `minutes` (default one hour). For things a stranger or a loop can repeat, such as a bad webhook signature. Returns true when filed.
export async function logOpOnce(env, kind, detail = "", minutes = 60) {
  try {
    const d = String(detail).replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]").slice(0, 300);
    const dup = await env.DB.prepare("SELECT id FROM ops_log WHERE kind = ? AND detail = ? AND created_at > datetime('now', ?) LIMIT 1").bind(String(kind).slice(0, 40), d, `-${Math.max(1, Math.floor(minutes))} minutes`).first();
    if (dup) return false;
  } catch {}
  await logOp(env, kind, detail);
  return true;
}

// Lines in ops_log that record normal activity or a note for review, NOT a failure: every outreach and ad-report call that worked (they are logged so Admin can show what Grok sent),
// and the host of a sponsor payment link (an abuse-review note). They stay in the log, but the dashboard's "Errors" count and the digest's "problems" leave them out.
// A line that says "failed" or "invalid" is still a problem.
export const INFO_LOG_SQL = "((kind IN ('outreach','ads') AND detail NOT LIKE '%fail%' AND detail NOT LIKE '%invalid%') OR kind = 'sponsor-pay-link')";

// Grouped summary since a timestamp ("YYYY-MM-DD HH:MM:SS", UTC): [{ kind, n, last, example }], newest group first.
export async function opsSince(env, since) {
  try {
    const rows = (await env.DB.prepare("SELECT kind, detail, created_at FROM ops_log WHERE created_at > ? AND NOT " + INFO_LOG_SQL + " ORDER BY id DESC LIMIT 500").bind(since).all()).results;
    const by = new Map();
    for (const r of rows) { const g = by.get(r.kind) || { kind: r.kind, n: 0, last: r.created_at, example: r.detail }; g.n++; by.set(r.kind, g); }
    return [...by.values()];
  } catch { return []; }
}

export async function pruneOps(env) { try { await env.DB.prepare("DELETE FROM ops_log WHERE created_at < datetime('now','-30 days')").run(); } catch {} }

// For catch blocks around D1 or fetch calls: files the error as a "limit" when it is a quota error. Returns true when it was one. Never throws.
export async function noteQuotaError(env, e, where = "") {
  const msg = e && e.message ? e.message : String(e || "");
  if (!isQuotaError(msg)) return false;
  await logOp(env, "limit", `${where ? where + ": " : ""}${msg}`);
  return true;
}
