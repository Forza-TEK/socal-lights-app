# Official rules review (2026-11-01)

**Read this first.** This is a review written by an AI assistant acting in the role of a California contest attorney. It is not legal advice and no attorney has reviewed it. Statute numbers below are from memory and one search; the search found only the 2008 amendments to Business and Professions Code (B&P) 17539.15 and nothing current. Have a California attorney confirm every citation and the final wording before any contest offers a prize.

## Why a free, vote-based contest is lower risk
A lottery needs prize, chance and consideration (a payment or something of value). Entry and voting here are free, so consideration is missing; votes are never sold. Judging is by votes and judges, so it is a contest, not a sweepstakes. B&P 17539.15 (sweepstakes) therefore should not apply, but its habits are cheap to follow, so the rules now carry a NO PURCHASE NECESSARY line in capitals, state when winners are determined, and say prizes cost nothing to claim.

## What the old template lacked, and what changed
The default template in `public/rules.js` now covers each point below. Existing contests keep the rules their organizer saved.

| Gap | Fix in the template |
|---|---|
| No age or eligibility limit | 18 or older; sponsor staff, judges and households can't win |
| No statement of when winners are determined | Determined when voting closes, announced on the page and by email |
| No photo license or ownership warranty | Entrant keeps ownership, allows display on the page and map, and confirms the right to do so; photos must not show identifiable people or children |
| Address is public with no warning | Rule 9 says the street address is shown |
| Judging visits with no safety language | Rule 10: view from the street, no entering private property |
| Prize obligations unclear | Sponsor (not SoCal Lights) provides the prize; no cash value; substitution; winner pays taxes; unclaimed after 14 days may pass on |
| No platform disclaimer | SoCal Lights is the website only, not a sponsor |
| No privacy pointer | Links to the privacy policy |
| No governing law or final-decision clause | California law; Sponsor's decisions final |
| Sponsors and fairness | Prize sponsors don't vote or influence the result |

## Still needs a lawyer or a decision from you
1. **Terms of use for SoCal Lights.** There is no `terms` page. Organizers and entrants should accept platform terms (your role, takedowns, no liability for prizes, indemnity, limitation of liability, governing law). This is the largest gap.
2. **Sponsor identity.** The rules name the organizer but not a mailing address. Many states expect a sponsor name and address in official rules. Add an optional address field to the wizard, or accept the organizer's email as the contact.
3. **Prize tax reporting.** A sponsor giving a winner $600 or more in a year generally issues a Form 1099. That is the organizer's job; say so in the organizer guide.
4. **Children.** The rules say 18 or older and no identifiable children in photos. COPPA and California's rules on minors' data mean you should not let anyone under 13 sign in. Add an age line to the sign-in screen or terms.
5. **Judges' conflict of interest.** Recusal is built in; the rules now forbid judges and their households from winning. A lawyer may want a written conflict declaration.
6. **Sponsor logos and the installer quote slot.** Label sponsors clearly (the page does). FTC endorsement and disclosure rules apply if a sponsor pays you. The quote request requires an opt-in tick box and shares details only with the named installer; have the privacy policy mention it.
7. **Apple and Google.** Apple needs the developer to sponsor contests that appear in an iOS app, and the in-app rules to say Apple is not a sponsor (included). Google Play has similar contest policies. Keep contests web-only in the store apps until reviewed.
8. **Privacy policy.** `public/privacy.html` does not mention contest entries, photos, the public street address, the emailed reminders, or quote requests. Update it, and update the effective date.
9. **Defamation and takedown.** Add a contact for removal requests (a rights-holder or neighbor objecting to a photo).
10. **Registration or bonding.** California requires none for free-entry contests that I know of. New York and Florida registration applies to sweepstakes with large prizes; these are not sweepstakes, but confirm before offering a prize above a few hundred dollars.
