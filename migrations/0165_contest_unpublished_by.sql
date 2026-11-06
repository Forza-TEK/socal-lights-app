-- When the creator unpublishes their own contest it uses the same "declined" state Admin's Unpublish uses.
-- unpublished_by = 'owner' marks that the creator did it, so only the creator can put it back (Admin approving clears it).
ALTER TABLE contests ADD COLUMN unpublished_by TEXT NOT NULL DEFAULT '';
