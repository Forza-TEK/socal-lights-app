// /api/heartbeat — the dead-man's switch for scheduled jobs (see functions/_lib/heartbeat.js). Key-protected (x-alert-key = ALERT_CRON_KEY, 401 otherwise).
//   POST ?job=<name>&status=ok|fail[&detail=text]   a workflow reports that it ran (uptime and backup do; the jobs that call the site record themselves)
//   GET                                              every job: last run, hours ago, stale / failed, plus the deploy check state
// Answers { ok, stale: [...lines], jobs: [...] }. Never writes anything but its own row.
import { json, err } from "../_lib/util.js";
import { JOBS, recordHeartbeat, jobStatus, problemJobs } from "../_lib/heartbeat.js";

export async function onRequest({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || key !== env.ALERT_CRON_KEY) return err(401, "Not allowed.");
  const url = new URL(request.url);
  if (request.method === "POST") {
    const job = url.searchParams.get("job") || "";
    if (!JOBS[job]) return err(400, "Unknown job.");
    const status = url.searchParams.get("status") === "fail" ? "fail" : "ok";
    if (!(await recordHeartbeat(env, job, status, url.searchParams.get("detail") || ""))) return err(500, "Could not record.");
  } else if (request.method !== "GET") return err(405, "Use GET or POST.");
  const st = await jobStatus(env);
  return json({ ok: !st.error, error: st.error || undefined, stale: problemJobs(st).map((j) => j.line), jobs: st.jobs }, { headers: { "cache-control": "no-store" } });
}
