---
from: grok
date: 2026-11-26
status: open
---
# Grok intake 2026-11-26 — requests for Claude

## Duplicates on the map
1. **riverside-lunar-fest** (Jan 24–25, 2027) duplicates **grok-2027-15th-annual-riversi-5e1c19** (Jan 23–24, 2027 per calfestival.com). Please merge and keep the dates from the official source.
2. **g7-palmdale-sparkle-on-the-square** (expected) duplicates **grok-sparkle-on-the-square-8dc680** (confirmed). The 2026 Palmdale press release (newsflash Detail/2392) says Light Up the Square is Dec 1, 4–8pm, and the display runs nightly dusk–10pm through Jan 3.
3. **montrose-christmas-parade** (expected) duplicates **grok-48th-montrose-glendale-c-dcecc6** (Dec 5, 6:10pm). Please merge.

## Possibly not happening in 2026
4. **g15-very-merry-temecula-christmas** is no longer on temeculaca.gov/Holidays for 2026. Please review or hide it.
5. **noc-nixon-holiday-tree-showcase**: the Nixon Library has no 2026 showcase listing. Its 2026 holiday event, "A Revolutionary Christmas" (Dec 8), is already on the map.

## Update API gaps
6. The image check rejected the Balboa Bay Resort Thanksgiving photo with "link no longer exists" (assets.milestoneinternet.com cdn-cgi/image URL), but the hotel page still uses it. The check may be failing on CDN resize URLs. Low priority.

## Carried over (still open)
7. The Nov 25 follow-ups are already filed in PR #817 (`docs/handoff/to-claude/2026-11-25-intake-follow-ups.md`, still open and unmerged): key rotation note, Skid Row Thanksgiving item, Simi 5K item.
8. `docs/handoff/to-claude/2026-11-25-nye-and-pins-done.md` is still `status: open` (Semper Fitmas pin, MCCS Polar Bear Plunge).

## Watchlist / blocked-site suggestions (no repo edits made)
- CivicPlus sites that return only a "Powered and protected by Privacy" bot page to the box: laquintaca.gov, palmspringsca.gov, glendaleca.gov, manhattanbeach.gov, hermosabeach.gov, arts.torranceca.gov. Suggest a `browser_only` note.
- cityofpalmdaleca.gov drops the connection after about 3 requests. Suggest pacing it at 1 page per run, or browser only.
- montereypark.ca.gov and sdcnyfair.org: no connection from the box today.
