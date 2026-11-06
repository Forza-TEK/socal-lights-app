-- Event claims: remember which decision was last emailed to the claimant, so an Admin click is never emailed twice.
-- Add-only. Rows decided before this migration are marked as already handled (nobody gets a late email for an old decision).
ALTER TABLE event_claims ADD COLUMN emailed_status TEXT;   -- approved | declined | NULL (nothing sent yet)
UPDATE event_claims SET emailed_status = status WHERE status IN ('approved', 'declined');
