-- Why an Admin declined an event submission (the person is emailed it too; this lets their profile show it later). Additive, empty by default.
ALTER TABLE event_submissions ADD COLUMN decline_reason TEXT NOT NULL DEFAULT '';
