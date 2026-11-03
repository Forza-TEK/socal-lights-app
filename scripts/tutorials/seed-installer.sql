-- makes the demo contest's dates valid for saving settings (voting starts after entries close)
UPDATE contests SET entries_close = '2026-10-27' WHERE id = 'c_demo';
