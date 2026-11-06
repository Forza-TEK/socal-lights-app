-- Last-run heartbeats for the scheduled jobs (GitHub workflows). GitHub's cron is best effort, so the site records when each job
-- last reported in and flags a job that has gone quiet (Admin home banner, digest, /api/health, /api/heartbeat).
-- The seed rows start every job's clock at the moment this migration is applied, so a job is never "stale" before it has had a fair chance to run.
-- `state` is a small JSON note a job keeps for itself (the Stripe reconcile keeps its paging cursor here). No personal data.
CREATE TABLE IF NOT EXISTS job_heartbeats (
  job TEXT PRIMARY KEY,
  last_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_ok_at TEXT,
  last_status TEXT NOT NULL DEFAULT 'seed',
  detail TEXT NOT NULL DEFAULT '',
  runs INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO job_heartbeats (job) VALUES ('uptime'), ('backup'), ('digest'), ('alerts'), ('mail-outbox'), ('sponsor-renewals'), ('usage-check'), ('deploy-watch'), ('stripe-reconcile');
