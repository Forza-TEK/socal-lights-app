-- Grok's browser-pass fixes (docs/handoff/to-claude/2026-11-16-browser-pass-fixes.md).
-- BCV Winterfest: the official 2026 page (bcvparks.com/winterfest) says "Noble Creek Community Center hosts Winterfest on December 5, 2026, with free activities, hayrides, and performances from 12-8 PM", address 390 W Oak Valley Parkway, Beaumont 92223.
-- The street address and pin were already right; the venue name, hours and source page change (the old link was a 2024 news article).
UPDATE events SET venue='Noble Creek Community Center', hours='Sat Dec 5, noon–8pm', url='https://www.bcvparks.com/winterfest', updated_at=datetime('now') WHERE id='g15-bcv-winterfest';
-- New Year's Eve at OC Winter Fest: ocwinterfest.com is a parked domain now (redirects to hugedomains.com); the real site is winterfestoc.com (OC Fair & Event Center, 88 Fair Dr, season Nov 27, 2026 to Jan 3, 2027).
-- It does not list a New Year's Eve night yet, so the event stays "expected".
UPDATE events SET url='https://winterfestoc.com/', updated_at=datetime('now') WHERE id='oc-winter-fest-nye' AND url='https://ocwinterfest.com/';
