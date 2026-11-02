-- One wording for "we don't know the price": event prices said "Not listed" (21 events), "Price not listed" (204),
-- "Check site" (27) and "Check listing" (94). Now "Price not listed" and "Check listing".
UPDATE events SET price = 'Price not listed', updated_at = datetime('now') WHERE price = 'Not listed';
UPDATE events SET price = 'Check listing', updated_at = datetime('now') WHERE price = 'Check site';
