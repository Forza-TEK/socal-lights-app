# Creation audit (2026-11-16): decisions for the owner

Each item below was fixed with the safest minimal behavior (hold for review rather than publish, or tell the person) because the right rule is a product choice. The options and a recommendation are listed so the owner can change the rule. Nothing here changes a price.

## 1. A home whose address cannot be found (M2)

- Now: a new home (not a contest entry) goes into review instead of live when the pin could not be found (it would sit at the city center), when the street has no house number, or when any free-text field (street, other tips, lights-on, radio, service area, installer name or website) contains a review word. The answer carries `located` and `held` ("address", "text" or "busy"), and the add page says why it is waiting. The form also asks for a house number.
- Options: (a) keep as built; (b) publish at the city center and tell the person (the old behavior plus a message); (c) refuse with "we cannot find that address, check it" and let the person fix it on the same screen.
- Recommendation: (a) now. If review volume turns out to be high, move to (c): geocoding failures are mostly typos, and (c) fixes them at the source.
- Events: an event is held only when BOTH its address was not found AND its web page did not match (a parade listed by two cross streets cannot be geocoded but usually has a page). An event with an unfound address alone still goes live and the page says the pin is in the middle of the city and how to fix it.

## 2. A company named by a homeowner (M1)

- Now: a homeowner who names the installer of their lights can only link to a company that already has a public profile. A new name creates a hidden profile (status "pending", not on any public page, not in the sitemap, not linked from the home card) that Admin can switch on from Admin > Installers (the existing Show action). Review words in the name create no profile at all. The mail to a profile's contact is capped at 5 a day per profile. Deleting the home removes a hidden profile that nothing else uses. An installer's own post creates their profile as before, hidden only when their text trips the review words.
- Options: (a) as built; (b) never create a profile from a homeowner's text (only link to existing ones); (c) create it public as before.
- Recommendation: (a). It keeps the "installer gets a lead" path without publishing a stranger's text.

## 3. "This is my home" statement (M4)

- Now: the homeowner path asks for a tick on the address step: "This is my home, or I have its owner's permission to show the address on the map." The server refuses a home without it and stores the time (`posts.address_consent_at`, migration 0267). Contest entries have their own form and are unchanged.
- Not built: an option to show only the street name without the number. That changes the map pin, the card and the removal flow, and needs an owner decision on whether privacy-minded homeowners should be allowed to hide the number.
- Recommendation: build the hide-number option only if /remove-home requests start to be about address privacy rather than about posts by other people.

## 4. A changed event web page (M3)

- Now: an organizer who edits a live event's web address to a page that does not mention the event and its year sees the event drop from Confirmed to Expected, with a note for Admin ("new web page did not match the event"). The event is not unpublished and nothing is queued in a new list.
- Options: (a) as built; (b) also put it back into the "Submitted events" review queue with its map pin kept; (c) leave Confirmed (the old behavior).
- Recommendation: (a), and (b) if Admin wants a worklist.

## 5. Deleting an account (L1)

- Now: the button opens a box that asks for the word "delete", can be cancelled, is announced to screen readers, and says that a paid placement still running is flagged for a refund review. The server still deletes on a plain signed-in DELETE (the mobile app uses the same call and Apple's rule 5.1.1(v) needs deletion to stay simple).
- Option: also require an emailed code. Recommended only if account deletion is abused; it adds a sign-in step for a rare, serious action.

## 6. Sign-in codes (M9) and mail to the address typed (L2)

- Now: a code is tied to the browser that asked for it (a short-lived cookie). Wrong guesses from any other browser no longer use up the real person's five tries; they are limited to 10 an hour per address and 30 an hour per network. A new request replaces the older code. The limit of 4 codes per address per hour was kept (the App Store reviewer login relies on it).
- Receipts and the "we received your entry" mail go to the address the person typed to sign in (kept as `users.login_email`), not the alias-stripped account address. The account itself is still keyed by the stripped address so one person with `+tags` or Gmail dots stays one account. Other mail (newsletter, contest and installer mail) still uses the account address; moving those is a larger change.
- Option: let people choose a different mail address in Your profile. Not built.

## 7. Two unsubscribe pages (L4)

- Now: the two pages say exactly which list they control and link to each other; the invalid-link state points to Your profile (Account, Monthly update) and the mailbox. Both write to the shared do-not-contact list, so the future monthly sender must check `newsletter_optins.unsubscribed_at`, `email_prefs.optout` and the suppression list (documented in `docs/monetization/grok-outreach-api.md`).
- Not built: "enter your email and we send you a link". Anyone could trigger mail to any address, so it needs its own throttle and Turnstile.
- Recommendation: build it only if people report lost links; the mailto line is the fallback.
