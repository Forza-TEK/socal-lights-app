-- Admin tools (audit F-19, F-30). Schema only: no existing row is changed.
-- events.checked_at / check_note: the last time an Admin pressed "Re-check this event's page" and what it found (UTC, like updated_at). NULL = never re-checked. Nothing downgrades an event automatically.
ALTER TABLE events ADD COLUMN checked_at TEXT;
ALTER TABLE events ADD COLUMN check_note TEXT NOT NULL DEFAULT '';
-- deleted_events.merge_undo: when the deleted row was the duplicate in "Merge duplicate events", a JSON note of what the merge changed on the surviving event and which
-- submission rows it moved, so Undo (events/restore) puts those back too. Empty for an ordinary delete.
ALTER TABLE deleted_events ADD COLUMN merge_undo TEXT NOT NULL DEFAULT '';
