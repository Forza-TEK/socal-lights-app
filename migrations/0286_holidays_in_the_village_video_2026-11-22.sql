-- Follow-up to 0285. The organizer's own listing carried their Santa video (an uploaded clip, ev/u-holidays-in-the-village--4afd74/1795347712908.mov, 24 MB) and 0285 deleted that
-- row without moving the clip. The file is still in the photo bucket; this attaches it to the surviving sweep row and shows it (Rey watched it, so it counts as approved).
-- The photo route now finds a clip by its own key, so the old id inside the key no longer matters.
-- validate: allow-destructive (one row, guarded by id; the WHERE is on the next line)
UPDATE events SET video_file='ev/u-holidays-in-the-village--4afd74/1795347712908.mov', video_ok=1, updated_at=datetime('now')
 WHERE id='thousand-oaks-holidays-in-the-village' AND COALESCE(video_file,'')='' AND COALESCE(video,'')='';
