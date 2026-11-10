-- Santa Photos at The Shops at Mission Viejo had no photo of its own, so the card showed the stock photo for its type.
-- The event's own page (simon.com) shows this Santa photo; hotlinked (500x500, 230 KB). Guarded so a newer edit is never overwritten.
UPDATE events SET image='https://assets.simon.com/rscimages/rscmain/W_562519.jpg', updated_at=datetime('now') WHERE id='soc-shops-mv-santa' AND (image IS NULL OR image='');
