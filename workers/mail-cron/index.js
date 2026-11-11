// Cloudflare cron Worker (see wrangler.toml): the clock for every scheduled job that only needs to call the site. GitHub's scheduler runs jobs hours late or skips them; this one is on time.
// Each job calls its endpoint on the site (the real work happens there), decides ok or fail the way the old GitHub workflow did, and reports to the heartbeat
// (POST /api/heartbeat?job=...) so Admin, /api/health and Better Stack can tell "ran" from "stopped".
const BASE = "https://socal-lights.pages.dev"; // the pages.dev address: socallights.app puts a bot check in front of automated callers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = (env, path, ms = 40000) => fetch(BASE + path, { method: "POST", headers: { "x-alert-key": env.ALERT_CRON_KEY || "" }, signal: AbortSignal.timeout(ms) });
const body = async (r) => { try { return await r.json(); } catch { return {}; } };

// Each job returns "ok" or "fail". A Worker may make 50 outgoing calls per run: every loop below stays well under that, with one call kept for the heartbeat.
export const JOBS = {
  // Send queued emails (contest results, voting reminders): drain until empty or no more progress (a retry waits its turn).
  "mail-outbox": async (env) => {
    for (let i = 0; i < 8; i++) {
      const r = await call(env, "/api/mail/drain"), j = await body(r);
      if (!r.ok || typeof j.remaining !== "number") return "fail";
      if (!j.progress || j.remaining === 0) break;
    }
    return "ok";
  },
  // Cloudflare usage check: the site works out the level and emails the owner at 90% or more (at most every 6 hours).
  "usage-check": async (env) => {
    const r = await call(env, "/api/usage-check?notify=1"), j = await body(r);
    return r.ok && ["ok", "watch", "warning", "limit"].includes(j.level) ? "ok" : "fail";
  },
  // Compare Stripe with the orders: repeat until the site says it is done (up to 12 calls).
  "stripe-reconcile": async (env) => {
    for (let i = 0; i < 12; i++) {
      const r = await call(env, "/api/stripe-reconcile"), j = await body(r);
      if (!r.ok || j.status === "error") return "fail";
      if (j.done === true) return "ok";
    }
    return "fail";
  },
  // Automatic renewals of installer Sponsor placements (safe to run more than once a day: reminders once, charges keyed by installer and season).
  "sponsor-renewals": async (env) => {
    const r = await call(env, "/api/sponsor/renewals"), j = await body(r);
    return r.ok && j.ok !== false ? "ok" : "fail";
  },
  // Contest reminders (voting opens, voting closes soon): each is queued once per contest.
  "contest-reminders": async (env) => {
    const r = await call(env, "/api/contest-remind"), j = await body(r);
    return r.ok && "contests" in j ? "ok" : "fail";
  },
  // Weekly lights email: send in batches until the list is done (up to 30 batches, a short pause between). A batch where every email failed is a mail-service problem: stop and report fail.
  alerts: async (env) => {
    for (let i = 0; i < 30; i++) {
      const r = await call(env, "/api/alerts/send"), j = await body(r);
      if (!r.ok || typeof j.remaining !== "number") return "fail";
      if (j.sent === 0 && j.failed >= 1) return "fail";
      if (j.remaining === 0) return "ok";
      await sleep(2000);
    }
    return "fail";
  },
};

// Which jobs each cron trigger runs (UTC; the same moments as the old GitHub schedules). Keep in step with wrangler.toml.
export const CRONS = {
  "*/5 * * * *": ["mail-outbox"],
  "7,37 * * * *": ["usage-check"],
  "47 14 * * *": ["stripe-reconcile"],
  "17 15 * * *": ["sponsor-renewals"],
  "15 17 * * *": ["contest-reminders"],
  "30 17 * * 4": ["alerts"],
};

export async function runJob(env, name) {
  let status = "ok";
  try { status = await JOBS[name](env); } catch { status = "fail"; }
  try { await call(env, `/api/heartbeat?job=${encodeURIComponent(name)}&status=${status}`, 20000); } catch {}
  return status;
}
export const run = (env) => runJob(env, "mail-outbox"); // kept for the first version of this Worker's tests

export default {
  scheduled(event, env, ctx) { ctx.waitUntil(Promise.all((CRONS[event.cron] || []).map((name) => runJob(env, name)))); },
  fetch() { return new Response("Not found", { status: 404 }); },
};
