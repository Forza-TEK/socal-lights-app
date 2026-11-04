# Spec and gap review: Featured page that knows who is signed in

_CEO, 2026-11-04. Request (owner): on the Featured page, know who is logged in and list that person's events, houses and contests so they do not have to search; otherwise make them log in. Verified against the code and the live database today._

## What already exists
- Sign-in (Google or emailed code) and `/api/me/overview`, which already returns for the signed-in person: contests they own or staff, their contest entries, their homes (by `user_id` or `contact_email`), events they submitted through `/add-event` (`event_submissions` matched on `contact_email`, joined to `events` through `event_id`), drafts, and their installer profile.
- Checkout already accepts a published event id or a pending submission (`sub:<id>`), refuses ended events, and extends a running placement.
- A live contest has a map event row (`contests.event_id` = `c-<slug>`), so a contest is featured by featuring that event row.

## Gaps, ranked
| # | Gap | Evidence | What to do |
|---|---|---|---|
| 1 | **Most events have no owner.** The 2,013 events came from our sweeps; `events` has no owner column; `event_submissions` has 0 rows. An organizer of a swept event (the main Featured customer) would sign in and see an empty list. | D1, 2026-11-04 | Keep the search as a fallback ("Find another event") and build a **claim flow** (email at the event link's website domain claims it at once, like contests and installers; otherwise admin approves). Without it the feature helps almost nobody yet. |
| 2 | **Houses cannot be featured.** Featured is `events.featured` only. Homes (`posts`) have no featured field, price, map treatment, label or expiry. | schema | Decision: leave houses out for now and say so on the page (recommended; the strategy defers a home boost until about 100 homes), or build "Featured home" (migration, map and list treatment, label, webhook, expiry, legal check). |
| 3 | **Contests**: only live, not-yet-ended contests have a usable map row; owner versus staff access is undecided. | `contests`, `contest_staff` | List live contests the person owns (staff optional). Hide ended or announced contests. Feature target is `contests.event_id`. |
| 4 | **Login gate changes the funnel and the existing entry links.** `/pricing` "Choose" buttons, the post-submit step of `/add-event` and any outreach link carry `?plan=&event=`. A Google sign-in redirect would drop them. | `/feature` has no return-to state | Preserve `plan` and `event` through sign-in (return-to, as the contest wizard keeps its draft). Show plans and a read-only search logged out; require sign-in only at "Continue to payment". |
| 5 | **UI-only gating is not a gate.** `/api/feature/checkout` accepts any `event_id` today. | `functions/api/feature/checkout.js` | Enforce on the server: require a session, require that the event belongs to the person (submitted, claimed, or contest they run) or that they pass the "any event" rule below. |
| 6 | **Email matching is too strict.** Accounts normalize email (lowercase, no `+tag`, no Gmail dots); `event_submissions.contact_email` and `posts.contact_email` are raw, and the overview compares with `lower()` only. `a.b+x@gmail.com` will not match `ab@gmail.com`. | `functions/_lib/auth.js` `normEmail` | Compare normalized emails (also fixes the Profile lists). |
| 7 | **Status handling for each row.** Pending submission (supported through `sub:`), declined, ended (checkout refuses), cancelled or postponed notice, already featured (show level and "until DATE", offer extend or upgrade), expired placement. | `featured.js`, `stripe-webhook.js` | Show a state per row; disable what cannot be bought; explain why. |
| 8 | **New data endpoint needed.** The overview has no `featured`, `featured_until`, `end_date` or map id per item. | `overview.js` | Add `GET /api/me/featurable` scoped to the session, same-origin only, no data about other people. |
| 9 | **Orders are not tied to an account.** `feature_orders` has no `user_id`. | migration 0155 | Add `user_id` (add-only migration); use the account email as the receipt email and remove the email box. |
| 10 | **Paying for someone else's event.** A city or sponsor paying for an organizer's event, and the 5 free comps, do not fit a strict owner-only rule. | outreach plan | Decide: owner-only, or "any event" through the search fallback while signed in. Comps stay a database change. |
| 11 | **Privacy policy and terms** do not say that orders are linked to an account. | `public/privacy.html` | One sentence; ask the attorney with the other redlines. |
| 12 | **Funnel risk.** About 20-50 human visits a day and 5 accounts: a forced sign-in at payment will cost some buyers. | `data-2026-11-04.md` | Track `click:feature-checkout-start` against new sign-ins; keep email-code sign-in (fast). |
| 13 | **Testing.** Local sign-in needs `DEV_AUTH=1`; a real Google sign-in can only be tested by the owner. | `docs/contests.md` | Playwright flows: signed out, no items, one event, pending, already featured, ended, contest; then the owner's live check. |
| 14 | **Native app.** Paid placement stays hidden there. | existing guard | No change. |

## Proposed build
**Phase 1 (one build, no claim flow):** signed-in view with "Your events" (submitted by you), "Your contests" (live, owned), a "Find another event" search, and a note that featured homes are not available yet; sign-in required at payment with plan and event preserved; server-side check; normalized email matching; `user_id` on orders; account email for the receipt. Add-only migration.
**Phase 2:** claim flow for swept events (the real organizer path).
**Phase 3 (only if wanted):** Featured home.

## Decisions needed from the owner
1. Houses: leave out for now (recommended), or build Featured homes?
2. May a signed-in person pay to feature an event they do not own (through search), or owner-only?
3. May contest staff pay, or only the contest owner?
4. Build the claim flow (phase 2) right after phase 1?

---
## Owner decisions (2026-11-04) and resulting design

1. Houses: out of Phase 1; Phase 3 is **Featured homes for podium finishers only** (winner, 2nd and 3rd place of an announced contest).
2. **Owners and staff can pay; nobody else.** Ownership is enforced on the server in checkout. An event is "yours" if you submitted it, have an approved claim on it, or it is the map row of a contest you own or staff.
3. Contest staff and owners can both pay for their contest's listing.
4. Build the claim flow (Phase 2), now part of the same release as Phase 1 because swept events have no owner.

### Claim flow (Phase 2)
- `event_claims` table; `POST /api/me/claims`; admin approve or decline in a small "Event claims" section.
- Auto-approved when the claimant's email domain (not free-mail) equals, or is a parent of, the host of the event's own web page and that host is not an aggregator, social or ticketing site (Eventbrite, Facebook, Ticketmaster, Fever and similar). Everything else waits for the admin.
- A claim only unlocks buying Featured for that event. It gives no edit rights.
- Limits: 5 pending and 10 claims a day per person.

### Featured homes, podium only (Phase 3)
- **Eligibility.** A home may be featured only if it finished 1st, 2nd or 3rd in some category and award (People's Choice or Judges' Choice) of a contest that is announced and live, is not disqualified, and has at least one vote or score in that award. The buyer must be the home's owner (`posts.user_id`, or the normalized `contact_email`).
- **Podium rule (new; the contest engine only stores winners).** Computed from the frozen results snapshot (`contests.results`, written at announcement): for each category and award, rank the entries by votes (public) or by judge picks or average score (judges), highest first, excluding disqualified entries and zero scores. Places use competition ranking: tied entries share a place, and the next place is skipped (two firsts, then 3rd). Anyone with place 1, 2 or 3 is on the podium. Because it reads the locked snapshot, payment can never change a result, and nothing is eligible before the winners are announced.
- **Data.** `posts.featured` (0, 1, 2) and `posts.featured_until`; `feature_orders` gets a target type so a payment can apply to an event or a home. Same expiry rule (Pacific date), same refund and dispute revocation.
- **Plans.** Same price list: pin ($10, 30 days) and top of the list ($15, 30 days). No "whole season" plan for homes (a home has no end date).
- **Display.** Gold ring and the Featured label on the home's map pin, card and details; listed first among homes. Always labelled, per the legal brief.
- **Contest integrity guard.** No contest, ballot, vote, results or export query may read `posts.featured` or sort by it; a test asserts this.
- **Why podium only.** It ties paid promotion to earned results that are already public and locked, so the boost never competes with the contest itself.
