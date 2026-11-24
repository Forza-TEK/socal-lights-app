-- Why a new home was held for review (audit F-01 / F-04): "same address as another home" or "the address matches two places". Shown to Admin on the house. Schema only: no existing data is touched.
ALTER TABLE posts ADD COLUMN review_note TEXT NOT NULL DEFAULT '';
