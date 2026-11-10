-- Fix for 0215: an article's Video field holds the video's FILE name (run-quick, find-night), not its Tutorials id, because the Help page builds /tutorials/<video>.mp4 from it.
-- 0215 set the ids, which pointed at files that do not exist. Only the wrong values 0215 wrote are changed, and only on articles nobody edited in Admin (updated_by = 'seed').
UPDATE help_articles SET video = 'post-partner', updated_at = datetime('now') WHERE slug = 'event-partner-plan' AND updated_by = 'seed' AND video = 'event-partner';
UPDATE help_articles SET video = 'run-founder', updated_at = datetime('now') WHERE slug = 'founder-city-badge' AND updated_by = 'seed' AND video = 'founder-city-badge';
UPDATE help_articles SET video = 'run-passes', updated_at = datetime('now') WHERE slug = 'contest-passes' AND updated_by = 'seed' AND video = 'contest-passes';
