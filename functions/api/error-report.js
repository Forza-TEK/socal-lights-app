// GET /api/error-report?hours=24 — what went wrong on the live site, as plain data, so nobody has to screenshot the Admin dashboard.
// Key-protected (x-alert-key = ALERT_CRON_KEY, 401 otherwise), read-only. Same rules as the dashboard's errors card: normal activity, notices the site sent and browser noise are left out.
// Called by .github/scripts/error-issue.sh (workflow error-watch.yml), which keeps one GitHub issue "Site errors" up to date; Claude's hourly routine reads that issue.
import { json, err, sameKey } from "../_lib/util.js";
import { INFO_LOG_SQL, NOISE_LOG_SQL } from "../_lib/oplog.js";
import { ALERT_KINDS, OP_LABEL } from "../_lib/adminhealth.js";

export async function onRequestGet({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || !sameKey(key, env.ALERT_CRON_KEY)) return err(401, "Not allowed.");
  const hours = Math.max(1, Math.min(168, Math.floor(Number(new URL(request.url).searchParams.get("hours")) || 24)));
  const since = new Date(Date.now() - hours * 3600000).toISOString().slice(0, 19).replace("T", " ");
  let rows;
  try { rows = (await env.DB.prepare("SELECT kind, detail, created_at FROM ops_log WHERE created_at > ? AND NOT " + INFO_LOG_SQL + " AND NOT " + NOISE_LOG_SQL + " ORDER BY id DESC LIMIT 500").bind(since).all()).results; }
  catch { return err(500, "The error log could not be read."); }
  const by = new Map();
  for (const r of rows) {
    if (ALERT_KINDS[r.kind]) continue; // a notice the site sent, not an error
    const g = by.get(r.kind) || { kind: r.kind, label: OP_LABEL[r.kind] || r.kind, n: 0, last: r.created_at, examples: [] };
    g.n++; const d = String(r.detail || "").replace(/\s+/g, " ").slice(0, 200); if (d && !g.examples.includes(d) && g.examples.length < 5) g.examples.push(d);
    by.set(r.kind, g);
  }
  const errors = [...by.values()].sort((a, b) => b.n - a.n);
  return json({ ok: true, window_hours: hours, total: errors.reduce((n, g) => n + g.n, 0), errors }, { headers: { "cache-control": "no-store" } });
}
