-- For the "Your installer dashboard" video only: demo page views and two demo quote requests (invented names, example.com addresses).
INSERT OR REPLACE INTO installer_hits (installer_id, day, n) SELECT id, date('now', '-1 day'), 9 FROM installers WHERE slug = 'bright-nights-lighting';
INSERT OR REPLACE INTO installer_hits (installer_id, day, n) SELECT id, date('now', '-2 day'), 14 FROM installers WHERE slug = 'bright-nights-lighting';
INSERT OR REPLACE INTO installer_hits (installer_id, day, n) SELECT id, date('now', '-3 day'), 6 FROM installers WHERE slug = 'bright-nights-lighting';
INSERT OR REPLACE INTO installer_hits (installer_id, day, n) SELECT id, date('now', '-4 day'), 11 FROM installers WHERE slug = 'bright-nights-lighting';
INSERT OR REPLACE INTO installer_hits (installer_id, day, n) SELECT id, date('now', '-5 day'), 4 FROM installers WHERE slug = 'bright-nights-lighting';
INSERT OR IGNORE INTO installer_leads (id, installer_id, user_id, name, email, phone, note, created_at) SELECT 'dash_lead1', id, '', 'Dana Rivera', 'dana@demo.example', '(949) 555-0101', 'Roof and two trees, front yard, for next December.', datetime('now', '-2 day') FROM installers WHERE slug = 'bright-nights-lighting';
INSERT OR IGNORE INTO installer_leads (id, installer_id, user_id, name, email, phone, note, created_at) SELECT 'dash_lead2', id, '', 'Sam Lee', 'sam@demo.example', '', 'Do you also take lights down in January?', datetime('now', '-1 day') FROM installers WHERE slug = 'bright-nights-lighting';
