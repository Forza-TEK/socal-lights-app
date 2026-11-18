-- The Shop tab was removed from the map (website and apps), so its Help Center article goes too.
DELETE FROM help_articles WHERE slug = 'what-is-the-shop-tab';
