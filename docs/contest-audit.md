# Contest audit (2026-11-01)

Method: read every contest page and API (`add-contest`, `contest`, `contest-enter`, `organizer`, `judge`, `archive`, `profile`, `functions/api/contests/*`) plus `docs/contests.md`, `voting-standards.md` and `contest-business-model.md`. This is a code and flow review, not a browser walk-through; sign-in and email delivery have never run live (secrets). There are no live contests yet (`/api/contests` returns `[]`).

## What is already strong
Verified accounts, DB-enforced one vote per category, own-home block, hidden counts by default, vote void/audit tools, frozen results, judges with recusal, official rules text with required acceptance, CSV export, QR poster.

## Gaps (things an organizer or entrant needs that don't exist)
1. **No way to edit a contest after creating it.** The wizard's last screen says "You can change any of this later", but the organizer dashboard only has pause/start/counts. Dates, name, description, categories, prize and rules are locked. A typo or a changed deadline means starting over. *Highest priority.*
2. **Entrants are never told what happened.** No email when an entry is approved, declined (with a reason) or flagged. With manual approval, a neighbor submits and then hears nothing. The organizer also gets no email when a new entry needs approval, so the "Waiting for you" count is only seen if they open the dashboard.
3. **Entrants can't edit or withdraw an entry.** Wrong photo, typo in the address, or a family that wants out: only the organizer or an email can fix it.
4. **No decline reason and no undo.** Declining is one tap with no message to the entrant.
5. **Voters get no reminder and no "I voted" confirmation by email,** and nobody is told voting opens or is closing. This is the biggest driver of turnout in real contests.
6. **No way to print the poster.** The poster is an on-screen box with a QR. Organizers need a print-ready flyer (PDF/print stylesheet), a yard-sign size and a "vote for your favorite" version for use after entries close.
7. **A live contest on the map doesn't lead to the contest.** The map event (`c-<slug>`) exists, but nothing in `app.js` links to `/c/<slug>`, so a visitor can't tap from the pin to "Enter my home" or "Vote". Confirmed by search.
8. **Single owner account.** No co-organizer (a chamber or HOA board has several people). Lose access to one email and the contest is orphaned.
9. **No sponsor or prize artwork.** Sponsor is one text line; the business plan sells logo and tier slots.
10. **No "Get a quote"/installer slot,** which the business model depends on.
11. **No stats for organizers beyond three totals.** No daily votes chart, voters by source (`?src=qr` is captured but never shown), page views.
12. **Rules only exist in English** (Spanish deferred by decision).

## Overlaps and duplicated controls
1. **"Pause voting", "Close entries" and the dates all control the same thing.** The panel is clear, but "Start voting now" plus "Pause voting" plus date fields is three ways to state one thing. Suggestion: show one line, "Voting: Opens Nov 20 · Closes Dec 24", with a single Change button.
2. **Two vote views on the organizer page:** "Review votes" table and "Results so far" bars both list votes. Merge into one Results card with a "Review individual votes" disclosure.
3. **Contest page lists every home once per category.** With 4 categories and 30 homes the page is 120 rows long. Suggestion: one gallery of homes with a category tab or a ballot sheet ("Your ballot: 2 of 4 chosen") instead of repeating the full list.
4. **"Homes" gallery (judges-only mode) and the category lists** show the same homes with different layouts.
5. **Entry flow asks for name and a separate "Name on the entry"** after sign-in (the account name pre-fills; fine) but the address step repeats the city that the contest already fixes. Pre-lock the city to the contest city and let people change it only through "Other".
6. **Top-bar "Back" link vs "See it on the map"** on the contest page both leave the contest, one to the hub and one to the map.
7. **Contest wizard asks about categories, mode, judges, method, approval, counts, fairness, prize, rules on separate screens** (13 screens). Most contests need defaults only. Suggestion: "Quick start" (defaults, 4 screens) vs "Customize".

## UX details
- Vote button labels switch between "Vote", "Move my vote here" and "Your vote ✓". Add a single sticky progress bar ("You've voted in 2 of 4") that scrolls with the page.
- No thank-you or share prompt after voting ("Tell your neighbors"). Add a share button using the Web Share API.
- Voting needs sign-in at the moment of the first tap, which loses people. Allow browsing without sign-in (already true), and after sign-in return to the same category row (currently reloads the page and drops scroll position).
- Photos in the contest page have no larger view; add a tap-to-enlarge and the display description (entered in the entry form but not shown anywhere on the contest page).
- Organizer entries table has 7 columns and breaks down on phones; use stacked cards under 640px. Organizers are likely on phones at a street corner.
- "Announce winners" uses a two-tap confirm; good. Add a preview ("Winners would be: …") before locking.
- Tie handling is only mentioned in help text. Show it on the results card.
- No empty state on the organizer page for a brand-new contest that says "Next: share the link". Add a three-step checklist (Share link, Approve entries, Announce).
- Accessibility: category sections use `aria-labelledby` (good); vote buttons carry full labels (good); the status pills rely on color plus text (good). Missing: focus return after a vote reloads the list.

## Recommended build order
1. Edit contest (dates, name, description, categories before the first vote, prize, rules until entries exist).
2. Emails: new entry to organizer, approved/declined to entrant, voting opens/closing to entrants and past voters.
3. Contest page: one gallery plus a ballot, sticky "voted in N of M".
4. Organizer dashboard: onboarding checklist, merge votes/results, phone layout.
5. Print poster and yard sign.
6. Entrant edit/withdraw.
7. Co-organizers.
8. Sponsor logos and the installer quote slot (per the business plan).
