-- For the "Your profile" video (LOCAL database only): the demo person's events and homes were just seeded, and the profile opens on whatever was posted in the last 15 minutes.
-- Age them, so the profile opens on Drafts like a normal visit. Never run against the live database.
UPDATE event_submissions SET created_at = datetime('now', '-2 days') WHERE lower(contact_email) = 'jamie@demo.example';
UPDATE posts SET created_at = datetime('now', '-2 days') WHERE user_id = 'u_mine';
