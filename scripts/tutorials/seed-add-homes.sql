-- For the "Add your city's homes yourself" video only: homes can be added until voting starts, so voting starts after the demo's entries close.
UPDATE contests SET vote_start = '2026-12-11', vote_end = '2026-12-24', voting_open = 0 WHERE id = 'c_demo';
