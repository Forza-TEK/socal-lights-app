// Cloudflare cron Worker (see wrangler.toml). Every 5 minutes: call the site's mail drain until the queue is empty or stops making progress, then report to the heartbeat
// so Admin and Better Stack can tell "ran" from "stopped". The site does the real work (functions/api/mail/drain.js); this only keeps time.
const BASE = "https://socal-lights.pages.dev"; // the pages.dev address: socallights.app puts a bot check in front of automated callers
const MAX_CALLS = 8; // each call sends up to 40 messages; a Worker may make 50 outgoing calls, and one more is kept for the heartbeat

const post = (env, path) => fetch(BASE + path, { method: "POST", headers: { "x-alert-key": env.ALERT_CRON_KEY || "" } });

export async function run(env) {
  let status = "ok";
  try {
    for (let i = 0; i < MAX_CALLS; i++) {
      const r = await post(env, "/api/mail/drain"), j = await r.json().catch(() => ({}));
      if (!r.ok || typeof j.remaining !== "number") { status = "fail"; break; }
      if (!j.progress || j.remaining === 0) break; // empty, or nothing more can be sent right now (retries wait their turn)
    }
  } catch { status = "fail"; }
  try { await post(env, `/api/heartbeat?job=mail-outbox&status=${status}`); } catch {}
  return status;
}

export default {
  scheduled(event, env, ctx) { ctx.waitUntil(run(env)); },
  fetch() { return new Response("Not found", { status: 404 }); },
};
