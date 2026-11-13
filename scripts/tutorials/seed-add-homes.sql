-- For the "Add your city's homes yourself" video only: homes can be added until voting starts, so voting starts after the demo's entries close.
UPDATE contests SET vote_start = '2026-12-11', vote_end = '2026-12-24', voting_open = 0 WHERE id = 'c_demo';
-- The endpoint also refuses once any vote exists, and the demo has seeded votes: clear them for this video.
DELETE FROM votes WHERE contest_id = 'c_demo'; DELETE FROM judge_picks WHERE contest_id = 'c_demo'; DELETE FROM judge_scores WHERE contest_id = 'c_demo';
