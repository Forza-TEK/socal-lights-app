// Dead-man's switch for the scheduled jobs. GitHub's cron is best effort (the "every 15 minutes" uptime check has run every 6 to 8 hours), so each job
// reports in here and the site itself notices when one has gone quiet: the Admin home banner, the admin digest, /api/health (public, one flag) and
// /api/heartbeat (key-protected) all use staleJobs(). Table: job_heartbeats (migration 0182). No secrets, no personal data.
//
// A job is "stale" when its last report is older than `staleH` hours (about three expected runs, or more where GitHub is known to be late), and
// "failed" when its last report said it failed. The seed rows in the migration start every clock when the table is created.

export const JOBS = {
  uptime: { label: "Uptime check", every: "15 minutes", staleH: 6 },
  "usage-check": { label: "Cloudflare usage check", every: "30 minutes", staleH: 1 },
  "mail-outbox": { label: "Send queued emails", every: "5 minutes", staleH: 1 },
  "deploy-watch": { label: "Deploy watch", every: "10 minutes", staleH: 1 },
  digest: { label: "Admin digest", every: "8 hours", staleH: 15 },
  backup: { label: "Nightly backup", every: "day", staleH: 30 },
  "sponsor-renewals": { label: "Sponsor renewals", every: "day", staleH: 30 },
  "stripe-reconcile": { label: "Stripe reconcile", every: "day", staleH: 30 },
  alerts: { label: "Weekly lights email", every: "week", staleH: 192 },
  "contest-reminders": { label: "Contest reminders", every: "day", staleH: 30 },
  "verify-events": { label: "Event page re-check", every: "30 minutes", staleH: 2 },
};

const sqlMs = (s) => Date.parse(String(s || "").replace(" ", "T") + "Z");
export const nowSql = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");

// Records that a job ran. status is "ok" or "fail". Never throws (a heartbeat must not break the job that sends it).
export async function recordHeartbeat(env, job, status = "ok", detail = "") {
  if (!JOBS[job]) return false;
  const ok = status !== "fail";
  try {
    await env.DB.prepare(`INSERT INTO job_heartbeats (job, last_at, last_ok_at, last_status, detail, runs) VALUES (?1, datetime('now'), CASE WHEN ?2 = 'ok' THEN datetime('now') END, ?2, ?3, 1)
      ON CONFLICT(job) DO UPDATE SET last_at = datetime('now'), last_ok_at = CASE WHEN ?2 = 'ok' THEN datetime('now') ELSE last_ok_at END, last_status = ?2, detail = ?3, runs = runs + 1`)
      .bind(job, ok ? "ok" : "fail", String(detail || "").replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]").slice(0, 200)).run();
    return true;
  } catch { return false; }
}

// Pure: rows from job_heartbeats -> one entry per known job with its age and verdict. `rows` may be missing a job (never reported = stale).
export function evaluate(rows, nowMs = Date.now()) {
  const by = new Map((rows || []).map((r) => [r.job, r]));
  return Object.entries(JOBS).map(([job, j]) => {
    const r = by.get(job), at = r ? sqlMs(r.last_at) : NaN, hours = Number.isFinite(at) ? Math.max(0, (nowMs - at) / 3600_000) : null;
    const stale = hours === null || hours > j.staleH, failed = !!r && r.last_status === "fail";
    const ago = hours === null ? "never" : hours < 1 ? `${Math.max(1, Math.round(hours * 60))} minutes ago` : hours < 48 ? `${Math.round(hours * 10) / 10} hours ago` : `${Math.round(hours / 24)} days ago`;
    const line = stale ? `${j.label}: last ran ${ago} (expected every ${j.every}, flagged after ${j.staleH >= 48 ? Math.round(j.staleH / 24) + " days" : j.staleH + " hours"})` : failed ? `${j.label}: the last run FAILED (${ago})${r.detail ? ": " + r.detail : ""}` : `${j.label}: ran ${ago}`;
    return { job, label: j.label, every: j.every, staleH: j.staleH, hours: hours === null ? null : Math.round(hours * 10) / 10, last: r ? r.last_at : null, lastOk: r ? r.last_ok_at : null, status: r ? r.last_status : "none", stale, failed, problem: stale || failed, line };
  });
}

// Reads the table (one small SELECT) and evaluates it. On a database error returns { error } so callers can say "could not read" instead of guessing.
export async function jobStatus(env, nowMs = Date.now()) {
  try {
    const rows = (await env.DB.prepare("SELECT job, last_at, last_ok_at, last_status, detail FROM job_heartbeats").all()).results;
    return { jobs: evaluate(rows, nowMs) };
  } catch (e) { return { jobs: [], error: String((e && e.message) || e).slice(0, 120) }; }
}

export const problemJobs = (st) => st.jobs.filter((j) => j.problem);
