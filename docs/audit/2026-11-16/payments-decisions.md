# Payments audit 2026-11-16: decisions for the owner

The audit (contests, payments, pricing, partners, emails) had 25 findings. Everything that could be fixed without a product or legal decision was fixed in three PRs (see `docs/status.md`). These are the parts that need a decision. No price, Terms or Privacy wording was changed.

## 1. Organizers see each voter's email (H3, rest of it)
- **What the code does:** the organizer and co-organizers see the voter's email next to every vote. The Privacy page says so ("a contest's organizers ... can review each vote with the voter's email address"), so the code and the page agree.
- **Fixed:** every void and restore is now in the change log (anonymous voter code, category, home, reason, who), co-organizers can read it, and the results page says how many votes were removed.
- **Options:** (a) keep emails visible (current); (b) show a masked address (`j***@gmail.com`) and reveal the full one only on click, with a log line; (c) never show it, only the voter code.
- **Recommendation:** (b). It still lets an organizer judge "looks fake" and leaves a trail. It needs one sentence in the Privacy page changed by your lawyer, so it was not done.

## 2. Terms acceptance and statement descriptor on the Stripe payment page (M5)
- **Fixed:** the payment page for passes, Event Partner, Featured placements and installer Sponsor now shows the one-line refund rule (the same sentence as Pricing and the receipt) with the link to the Terms.
- **Not done:** `consent_collection[terms_of_service]=required` makes Stripe refuse the session unless the Terms URL is set in the Stripe dashboard (Settings > Public details), and a statement descriptor suffix is a brand choice.
- **Recommendation:** set the Terms URL in Stripe, then ask for a one-line change to turn consent on for the pass and Event Partner checkouts only ($149 and up, discretionary refunds). Suffix: `SOCALLIGHTS`. Also tick the two open boxes in `docs/CHECKLIST.md` line 111 (Radar rules, Stripe receipt emails).

## 3. Event Partner bought late in a season (M6)
- **Fixed:** the payment page, the plan page and the Checkout description now say how many days are left in the season, and that the price is for the whole season.
- **Options:** (a) warning only (current); (b) block the purchase when fewer than 14 days are left; (c) sell the next season instead (as the installer Sponsor placement does).
- **Recommendation:** (c) from 14 days before the season ends, because a buyer on Jan 5 pays $149 for 2 days. It changes what is sold, so it needs your yes.

## 4. How fast refunds are made (M4)
- **Fixed:** the "payment not applied" email no longer says a refund is already on its way; it says "we will refund ... to the payment method you used" and that the bank time starts once we issue it. The digest and its subject now flag a refund still due after 3 days.
- **Needs you:** whether to promise a number of business days. Refunds are made by hand in Stripe, so any number is a promise you must keep.
- **Recommendation:** "within 3 business days", matching the 3-day digest alert.

## 5. Stronger vote resistance (M8)
- **Today:** one verified email per voter, 40 votes a minute per connection, 18 blocked throwaway domains, and now accurate fraud flags over all votes with a logged void (H3, H4).
- **Not done:** a challenge on the first vote, or a per-network daily cap. Both change who can vote (shared Wi-Fi at a school or event night would trip a cap) and a per-network count has to be stored as a hash and deleted within two days to keep the Privacy promise.
- **Options:** (a) Turnstile on the first vote of each account; (b) a daily cap per contest per network hash (suggest 100 votes) shown to the organizer as a flag, not a block; (c) flag accounts created within a minute of their first vote.
- **Recommendation:** (a) for any contest with a prize or run by a city, (b) as a flag only.

## 6. Admin edit of the contact email (M10)
- **Fixed:** name, organizer, city and dates cannot change after winners are announced; city and date order are checked.
- **Decision:** the contact email only says where notices go. It does not change which account runs the contest (`owner_id`); the answer now says so. Do you want Admin to be able to hand a contest to another account? Recommendation: no, have the creator add a co-organizer instead.

## 7. A city that used its free contest (M11)
- **Finding says:** the page shows only the $299 pass, not $149.
- **What is true:** a pass raises the total number of contests in the window to its cap, it does not add to a comp. A $149 single contest on top of a used one-contest comp would give no extra contest, so the code correctly hides it.
- **Fixed:** the digest now lists a founding comp that ends within 30 days with no contest created (Eastvale and Covina end 2026-12-31).
- **Options:** (a) leave it ($299 for up to 5); (b) when a comp is used up, let a $149 pass count only contests after the comp ones; (c) extend the comp by hand in Admin for the two founder cities.
- **Recommendation:** (c) for founder cities, (a) for everyone else.

## 8. "Stripe emails your card receipt separately" (L8)
- **Not changed:** it is true only if Stripe > Settings > Emails > "Successful payments" is on in live mode.
- **Action for you:** check that toggle. If it is off, either switch it on (preferred) or ask for the sentence to be removed from the receipts.

## 9. Passes bought on an email domain (H1, note)
- A pass bought with no website now belongs to the buyer's email domain when it is an organization's own domain (`d:covinaca.gov`, never a free-mail or shared agency domain). Anyone signed in at that domain then shares it, which is how a pass bought with a matching website already worked.
- A person who bought a pass for themselves (`u:` key) keeps it and stays an individual.

## Already fixed before this audit
- M12: the Featured checkout already refuses events marked cancelled or postponed, and the digest already lists placements still running on one ("placement still running on a cancelled or postponed event"). Nothing more was needed.
