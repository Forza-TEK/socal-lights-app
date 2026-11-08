-- Help article title: the button is called "Route these" everywhere (there is no "Open route" button). Only changes the article if nobody edited it in Admin (updated_by = 'seed').
UPDATE help_articles SET title = 'Drive a route: Route these and Visit the homes', updated_at = datetime('now') WHERE slug = 'drive-a-route' AND updated_by = 'seed';
