# Creation audit (2026-11-16): contest findings left for the second pass

Another session is changing `functions/api/contests/*`, the contest wizard's server logic and the contest entry API (payments and contest audit). These five findings sit in that code, so they were not touched in the creation PRs. Do them after those PRs merge, from fresh line numbers (the ones below are from `origin/main` at b8068cdb plus the creation PRs; search for the quoted code if a line moved).

Source: the audit report "Audit 2: creation flows and accounts" (H2, H3, M7, M8, L9). H3 is the same defect as "Run it again reopening declined contests" in the payments audit; fix them together.

## H2. Official-sounding contest hold only runs on create

- Where: `functions/api/contests/index.js:55` (the only `officialSounding` call) against `functions/api/contests/[slug].js:152-182` (`editContest`, no check).
- What happens: a contest created as "Holiday Lights Contest" with a free-mail address goes live; editing it to org "City of Covina" and name "City of Covina Official Holiday Contest" leaves it live, on the map, and the safeguards that read `contests.note` (sponsor and payment-link checks) are not re-run. No `needsReview` check on name, org, descr or rules at create or edit.
- Fix: in `editContest`, recompute `trustOf(user.email, c.site)` and `officialSounding(name, org)`. If it newly trips (it was not flagged before), set `status = 'pending'`, call `unlistFromMap(env, c, "edited to an official-sounding name")`, write the review note (same text as create, `contests.note`), and `tell(... "contest_review" ...)` the admin (copy the call at `contests/index.js:79`). Apply `needsReview(name, org, descr, rules)` from `functions/_lib/moderation.js` at create (`index.js`, near line 55) and edit: at create hold it (`live = false`, note "review words"), at edit hold the same way. Test: create, edit to an official name, assert pending, off the map, note set, admin mail sent; and that an owner whose name was already official-sounding is not re-held on every edit.
- Effort: S to M.

## H3. Contest clone runs before the status check

- Where: `functions/api/contests/[slug].js:67-68` (`if (b.action === "edit") ...; if (b.action === "clone") return cloneContest(...)`, both before the `c.status !== "live"` checks at `:72` and `:85`) and `cloneContest` at `:119-136` (the copy gets `status` from `c.status === "pending" ? "pending" : "live"` and `note` is in the skipped columns).
- What happens: a contest Admin declined (or a creator-unpublished one) can be cloned as a live contest with the review note cleared. It still needs a pass, but the moderation decision is lost and the 3-a-day creation cap in `contests/index.js` does not apply to clones.
- Fix: refuse clone unless `c.status` is `live` (or the creator's own unpublished state: `status = 'declined' AND unpublished_by = 'owner'`); never clone an Admin-declined one (return 400 "This contest was taken down. Write to info@socallights.app."). Copy `note` and the `officialSounding` hold into the copy (a copy of a held contest stays held). Count a clone toward the same per-account daily cap as a new contest. Test: clone of live works; clone of Admin-declined is 400 and creates nothing; clone of a held contest is held; the 4th clone in a day is 429.
- Effort: S.

## M7. Wizard silently drops judges after 15 and categories after 8

- Where, server: `functions/api/contests/index.js:33` (`.slice(0, 8)` on categories) and `:45` (`.slice(0, 15)` on judges); the same 8 in `[slug].js:165` (`editContest`). Where, wizard: `public/add-contest.html` the `addcat` handler (about line 152, no cap), the category step (line 103-104, "Add" button) and the judges step (lines 107-109, a textarea of 1500 characters that says only "Paste one email per line").
- What happens: a 9th category or 16th judge is accepted, counted on the review screen, and dropped by the API with no message.
- Fix: server: return `400` ("Use at most 8 categories." / "Invite at most 15 judges.") instead of truncating, in create and edit. Wizard: disable Add at 8 categories and show "n of 8 categories"; under the judges box show "n of 15 judges" (use `parseJudges(x.judges).length`) and make the step's `check` fail above 15. Test both sides.
- Effort: S.

## M8. Contest entry form accepts any city, zero photos and duplicate addresses

- Where: `public/contest-enter.html:44` ("My home is in a different city") and `functions/api/submit.js` contest branch: the entry limit at `:98-100`, `autoApprove` at `:101`, photos at `:102-103`, the insert after the geocode (no comparison with `contest.city`, no minimum photos, no duplicate-address check).
- What happens: the form wants a photo, but a direct POST without photos creates the entry; an address in another city or county is accepted (the 30 km rule only covers homes an organizer adds); the same address can be entered repeatedly (only the 5-per-account cap applies); with `approval: "auto"` it is public at once.
- Fix: for `contest`: require at least one photo (400 "Add at least one photo of your home."); when `city !== contest.city` keep the entry but force `autoApprove = false` and tell the organizer in the `entry_new` mail that the city differs; reject an entry whose street and ZIP match another non-declined entry in the same contest ("This address is already entered in this contest."). In `contest-enter.html` warn when the city differs from the contest's. Test each.
- Note for the person doing it: the creation PRs changed `submit.js` only for `!contest` paths (homes), plus the same-origin check at the top; the contest branch is as it was. Contest entries do not carry the "this is my home" statement (M4) and are not held for an unfound address (M2); decide whether they should, since an organizer reviews manual entries and auto-approved ones go live at once.
- Effort: S to M.

## L9. Contest creation has no Turnstile, and a held contest skips the pass

- Where: `functions/api/contests/index.js:23-79` (`onRequestPost`; the admin mail at `:79`), and `cloneContest` in `[slug].js`.
- What happens: `POST /api/contests` needs only a session. An official-sounding contest is stored `pending` without a pass check, up to 3 a day per account, and each one emails the admin, so a script with free accounts can flood the admin inbox and queue.
- Fix: Turnstile on the wizard's review screen like the home form (token in the body, `verifyTurnstile` in the handler, `add-house.html` shows the pattern with `ts.need()` and `ts.mount()`); at most one pending contest per account at a time (count `status = 'pending'` rows for `owner_id`, return 429 "You already have a contest waiting for review."); throttle the admin notification (`checkThrottle`, one `contest_review` mail per account per hour).
- Effort: S.
