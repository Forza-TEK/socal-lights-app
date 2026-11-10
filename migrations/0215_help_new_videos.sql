-- Help Center: link the two new tutorial videos to their articles (Event Partner, Founder city badge). Only fills an empty Video field, and only on articles nobody edited in Admin (updated_by = 'seed').
UPDATE help_articles SET video = 'event-partner', updated_at = datetime('now') WHERE slug = 'event-partner-plan' AND updated_by = 'seed' AND COALESCE(video, '') = '';
UPDATE help_articles SET video = 'founder-city-badge', updated_at = datetime('now') WHERE slug = 'founder-city-badge' AND updated_by = 'seed' AND COALESCE(video, '') = '';
-- The Contest passes article had no video; link the Contest passes video (it was re-recorded for the new pricing).
UPDATE help_articles SET video = 'contest-passes', updated_at = datetime('now') WHERE slug = 'contest-passes' AND updated_by = 'seed' AND COALESCE(video, '') = '';
