// POST /api/deploy-check?sha=<main's latest commit>&at=<its commit time, ISO> — called every 10 minutes by the Cloudflare cron Worker (workers/mail-cron) with the shared key
// (ALERT_CRON_KEY). Read-only Cloudflare Pages deploy-stall check, the same rule as the admin digest and scripts/deploy-watch.mjs (functions/_lib/deploys.js): a deployment "active" for
// 8+ minutes (builds run one at a time, so a hung preview blocks production), a failed newest production build, or production not on main's latest commit 20+ minutes after it was made.
// The Worker passes main's head (it asks GitHub's public API; this site calls no host but Cloudflare). When something is stalled the owner is emailed, at most once every 3 hours.
// Answers { state: ok | stalled | not_configured | unknown, problems: [text], notified }. Uses the Pages secrets CF_PAGES_TOKEN (or CF_ANALYTICS_TOKEN) and CF_ACCOUNT_ID.
import { json, err } from "../_lib/util.js";
import { checkDeploys } from "../_lib/deploys.js";
import { logOp } from "../_lib/oplog.js";
import { sendTemplate } from "../_lib/mailtpl.js";

export async function onRequest({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || key !== env.ALERT_CRON_KEY) return err(401, "Not allowed.");
  if (request.method !== "POST" && request.method !== "GET") return err(405, "Use POST.");
  const u = new URL(request.url), sha = (u.searchParams.get("sha") || "").slice(0, 40), at = u.searchParams.get("at") || "";
  const head = /^[0-9a-f]{7,40}$/i.test(sha) && !Number.isNaN(Date.parse(at)) ? { sha, at } : null;
  const r = await checkDeploys({ token: env.CF_PAGES_TOKEN || env.CF_ANALYTICS_TOKEN, accountId: env.CF_ACCOUNT_ID, head });
  let notified = false;
  if (r.state === "stalled") {
    try {
      // one email per 3 hours while it lasts; the note that it was sent is written only after the email really went out, so a failed send is tried again on the next check
      const recent = await env.DB.prepare("SELECT id FROM ops_log WHERE kind = 'deploy-stalled' AND created_at > datetime('now','-180 minutes') LIMIT 1").first();
      if (!recent && (await sendTemplate(env, "deploy_alert", env.ADMIN_NOTIFY_EMAIL || "rey@forza-tek.com", { lines: r.problems.map((p) => "- " + p.text).join("\n") }))) { await logOp(env, "deploy-stalled", r.problems.map((p) => p.kind).join(", ")); notified = true; }
    } catch {}
  }
  return json({ state: r.state, problems: (r.problems || []).map((p) => p.text), why: r.why || "", notified }, { headers: { "cache-control": "no-store" } });
}
