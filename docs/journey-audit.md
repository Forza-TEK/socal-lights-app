# Journey audit (run before calling any UI or function audit "done")

Why this exists: page-by-page and code-path audits missed dead ends the owner found by tapping through the app (a contest-entry "Manage your home" page with no way back and no way to remove the home). Audits looked at each page with the main-flow test data; they never walked from every entry point, as every kind of user, on every record state.

## The method
1. **Inventory every record a user can own** (display, event, draft, contest entry, organizer-added home, contest, installer profile, account, photo, vote). For each, fill the CRUD table: can the owner view / edit / delete-or-withdraw it, from the profile row AND from the record's own page? A missing cell needs an explained alternative on screen (a request flow, an "ask the organizer" line) or a fix.
2. **Seed every state**: self-added vs organizer-added, pending / approved / declined, voting open / closed / announced, signed-in owner / other account / signed-out, token-link pages.
3. **Walk from each entry point** (profile row buttons, emails, token links, admin act-as) to the page it lands on, and check on that page: a breadcrumb or back link, a way to the map, no state that shows a form but hides every action.
4. **Phone width first**, light and dark, screenshot each landing page and read it.
5. Report findings as a list; fix; add a test that pins the exit and the removal path.

## Current CRUD table (2026-11-26)
| Record | Edit | Delete / withdraw | Notes |
|---|---|---|---|
| Display (post, no contest) | profile + /h page | profile More > Delete | |
| Event | profile Edit | profile More > Delete | |
| Contest entry, self-added | contest page | contest page Withdraw | |
| Contest entry, organizer-added | /photos/<token> | /photos/<token> "Remove this home" (voting open); after close, removal request | fixed 2026-11-26 |
| Contest | organizer page | organizer / Admin | |
