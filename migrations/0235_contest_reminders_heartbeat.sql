-- The contest reminder job now reports to the heartbeat (it runs on the Cloudflare clock, workers/mail-cron). Start its clock now so it is not flagged before its first run.
INSERT OR IGNORE INTO job_heartbeats (job) VALUES ('contest-reminders');
