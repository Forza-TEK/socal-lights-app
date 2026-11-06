# Event organizer funnel: audit (2026-11-06) and what changed

Scope: the path from "I want my event Featured" to "it is on the map", for a first-time organizer. Checked in headless Chromium (Playwright) against local `wrangler pages dev` with `DEV_AUTH`, at 390 and 1280 px, light and dark, with seeded events (live, starts later than 30 days, ended, waiting for review, declined, claim waiting, someone else's). Checkout was answered by a stub: no Stripe call was made. Items marked (code) were read from the code, not walked in a browser.

## Before: friction points

| # | Where | Evidence | Effect |
|---|---|---|---|
| 1 | `/pricing` Choose, signed out | Lands on `/feature?plan=top`: a long page that repeats the plan cards and a "Pick a plan" section above a disabled "Sign in to continue" button (screenshot `before-390-light-2-feature-out`). The button stays disabled until an event is also chosen. | Choosing a plan on Pricing and then being asked to choose a plan again. First action required is searching a list of every event on the map. |
| 2 | Signed out: finding the event | The only way in is a name search over all ~1,250 public events (`/api/events` is about 620 KB, loaded on every visit). "Candy" returns 8 other people's events. | The organizer cannot tell which result is "mine" until after sign-in. |
| 3 | After sign-in | Sign-in does not show their events first. Event and plan survive only if the event is public; a pending submission (`sub:`) is dropped from the return link. | State lost for events waiting for review. |
| 4 | "Your events" list | Ineligible rows only say "Ended / Declined / Waiting for approval". An event that starts more than 30 days away looks selectable ("Feature this"); only after the click do all three plans turn grey with a note (`before-390-light-3-feature-in`). | Dead end with no date to come back. |
| 5 | Plan cards | Not eligible plans are greyed with a note, but the bullets are a one-line blurb ("The same as Top of the list, ..."). Dates and total were never stated before paying; "Runs until" appeared only as small grey text on each card. | The organizer cannot see exactly what and until when they pay for. |
| 6 | Claiming | A not-yet-owned event shows a claim box only after pick, then `location.reload()`. A claim waiting for approval shows in the list as "Waiting for approval" with no explanation of what happens or when. | Unclear wait. |
| 7 | Someone who does not own the event | `/feature?event=<id>` of another person's event restores the choice, then silently shows the claim box (code); checkout would answer 403 "Claim this event first". | Confusing error if reached by link. |
| 8 | Unapproved events | Existing rule (kept): payment for a pending submission is held and applied on approval; decline marks the order "refund due". The page said "Waiting for review; you can pay now", but the confirmation did not say what happens if it is declined. | Fear of paying for a listing that may be rejected. |
| 9 | add-event plan step | Plan tiles show bullets and a one-line "Runs until" note, no total, and the sentence about Stripe was vague. The cancel link from Stripe for a pending submission returned to `/feature` with the event forgotten (code). If checkout failed the page said "feature your event from here" with nothing chosen. | State lost, extra clicks. |
| 10 | Pricing section | The "Choose" buttons were not counted anywhere; "checkout started" was a browser click (can be run up). | No funnel numbers. |
| 11 | After paying | Stripe returned to `/feature?paid=1`: the whole picker page again with a one-line banner: "refresh the map in a few minutes". No event name, no end date, no list of next steps. | The buyer is unsure it worked. |
| 12 | Email | Only Stripe's card receipt (from Stripe, sender not recognizable). Nothing from SoCal Lights. (code: no mail in `stripe-webhook.js`) | No confirmation, no help or renew info. |
| 13 | Admin > Orders | Shows plan as the stored key ("season"), no event dates, and a pending event only as "waiting for approval". Refund, dispute and unapplied handling is good and unchanged. | Small gaps only. |

Click counts before (signed out, from Pricing to the Stripe page, event is theirs): Choose, type and pick in search (2), Sign in, send code, enter code, [page reloads] Continue to payment = 7. Signed in with several events: Choose, pick event, Continue = 3 (4 when arriving at `/feature` without a plan). One eligible event: still 3.

## After: one funnel

Choose (Pricing) -> sign in (emailed code or Google; plan kept in the URL and in session storage) -> **Which event?** (their events with status and dates; ineligible rows say why and the date featuring opens; "Add a new event" and "Claim an existing listing") -> **Confirm and pay** (full bullet list, event, exact start and end dates, total, review note for unapproved events, other plans as links) -> Stripe -> a success view with what happens next -> confirmation email.

- With exactly one eligible event it is chosen for them: Choose, Pay = **2 clicks** (measured). With several: Choose, pick, Pay = **3**. Signed out: Choose, Sign in, send code, enter code, pick, Pay = **6** (measured; 4 of those are sign-in).
- `/feature` direct or from an email: signs in, event list, plan preselected to Top of the list (change it with one link).
- add-event: the plan chosen on Pricing or the Feature page (`/add-event?plan=top`) is preselected; the review step shows each plan's full list, exact dates and total; Add my event goes straight to Stripe. Cancel and failure return to `/feature` with the event (or submission) and plan chosen.
- A plan that does not fit the chosen event (Full run on a short event) is replaced by the one that fits, with a plain sentence saying so.
- Success view: name, plan, when it appears, the badge, receipts, where to see it, help, how to renew or upgrade; it polls for the placement for about 15 seconds.
- Email `feature_paid` (editable in Admin > Settings > Email templates): sent once when the order is first paid. For an event waiting for review it says it is held and refunded in full if not listed, and a second one is sent when approval switches it on.
- Admin > Orders: plan name, the event's dates, and "payment held; it switches on when you approve the event" for pending submissions. No manual steps (unchanged: Apply now, Mark refunded).
- Counters (admin "How people use the site"): `fn:event-feature-choose` and `fn:event-feature-pick` (browser, via `/api/visit`), `fn:event-feature-checkout` (server, after Stripe answers) and `fn:event-feature-paid` (server, when the order is first recorded). Numbers only, same table.

## Not changed on purpose

Pricing, the 30-day opening rule, ownership rules, refund and dispute handling, and the rule that payment never touches a contest result. Held payment for unapproved events is the existing behavior (an auto-published event is live immediately; only a busy day or a failed check puts it in review).

## Left open

- The Terms still say nothing about paid placements (attorney item, unchanged).
- A real $10 test is still needed (see `docs/CHECKLIST.md`).
- Claim approval does not email the organizer yet; the page tells them to come back.
