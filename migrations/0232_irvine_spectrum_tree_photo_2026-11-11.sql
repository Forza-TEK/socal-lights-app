-- Irvine Spectrum Nightly Tree Lighting had no photo of its own (its page, irvinespectrumcenter.com, turns away automated visits, so no sweep could read its picture).
-- The Irvine Company, which owns the center, lists the same event on holiday.irvinecompanyretail.com with this photo (the nightly tree lighting with the Giant Wheel, 1275x850, about 0.5 MB).
-- Only filled when the event still has no photo. The credit line shows the event's own site and links to its page.
UPDATE events SET image='https://holiday.irvinecompanyretail.com/wp-content/uploads/2024/09/EventListings__ISC_NightlyTreeLighting.jpg', updated_at=datetime('now') WHERE id='irvine-spectrum-nightly-tree' AND (image IS NULL OR image='');
