-- 2026-11-16 contest second pass (H2). Additive only.
-- contests.pending_edit: JSON of a rename/text edit held for Admin ({"name","org","descr","rules"}). The contest stays live under its old text; Admin's "Looks fine" applies it.
ALTER TABLE contests ADD COLUMN pending_edit TEXT NOT NULL DEFAULT '';
