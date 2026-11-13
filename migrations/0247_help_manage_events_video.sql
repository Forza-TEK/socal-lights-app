-- Link the new "Manage your events" video (file post-manage-events) to the three Help articles about managing an event.
-- The Help page builds /tutorials/<video>.mp4 from the FILE name. Only articles nobody edited in Admin (updated_by = 'seed') with no video yet are changed.
UPDATE help_articles SET video = 'post-manage-events', updated_at = datetime('now') WHERE slug IN ('your-events', 'add-photos-to-your-event', 'edit-or-cancel-your-event') AND updated_by = 'seed' AND (video IS NULL OR video = '');
