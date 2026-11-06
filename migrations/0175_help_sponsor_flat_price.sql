-- Help Center: the Sponsor article now says the plan price is the same whenever you start in a season (no proration) and that an upgrade costs the difference between the two plans.
-- Changed only while updated_by is still 'seed', so an article edited in Admin > Help Center is never overwritten (the new text is in docs/help-updates.md to paste).
UPDATE help_articles SET body = 'Installers can show their company in a labeled **Sponsor** banner at the top of the list on the map. It is optional and paid; your free installer profile stays free.

## What you can buy
**Banner, $50 per season**
- Your company name, linked to your website (or to your email if you have no website), in the labeled "Sponsor" banner at the top of the list on the map
- Your phone number in that banner, tap to call
- Shown whenever your areas served are in the map view (everywhere if you list none)
- How many times you were shown and tapped, in your dashboard

**Banner and top of the list, $75 per season**
- Your company name and phone number in the labeled "Sponsor" banner, as above
- Your company card at the top of the list, right behind the Featured events, labeled "Sponsor"
- How many times the banner and the card were shown and tapped, in your dashboard

## How to buy
1. Open the [Pricing page](/pricing#banner) and tap **Choose** on a plan, or go to [socallights.app/sponsor](/sponsor).
2. Sign in. If you do not have an installer profile yet, tap **Create your free profile first**; if you are already on the map, find your company and tap **Claim this profile**.
3. Choose your company. It needs a phone number or a website (the page tells you what is missing and links to your profile). Areas served are recommended.
4. Choose a plan and check the dates and price.
5. Tap **Continue to payment** and pay on Stripe''s secure page. Your placement turns on within a few minutes.

## How long it lasts and what it costs
A season runs from the day you pay to the last day of the season on the map (the Christmas lights season runs from Nov 3 to Jan 6, and the next season runs from Jan 7 to Jan 31). The price is the same whenever you start, so check the end date before you pay: the page shows the exact start date, end date, number of days and price. We do not refund or credit for timing.

## Renew or upgrade
- **Renew:** buy the same plan again while it runs. The new season starts the day after the current one ends, at the plan''s price. Time is only added, and we sell at most one season ahead.
- **Upgrade:** to add the top of the list to a banner that already runs to the end of the season, choose Banner and top of the list. You pay the difference between the two plans'' prices (the page shows it).
- Your dashboard (Overview) shows your dates and numbers, with a **Renew or upgrade** button.

## Refunds
If we cannot put your placement on, you get a full refund. A refund switches the placement off, and so does a payment dispute, so please email info@socallights.app before disputing a charge.

Paying never affects a contest, and the map stays free. See [Is SoCal Lights free?](/help/is-it-free).', updated_at = datetime('now') WHERE slug = 'sponsor-your-installer-company' AND updated_by = 'seed';
UPDATE help_articles SET body = 'Using SoCal Lights is free. The map, search, routes and voting stay free for everyone. Entering a contest is free and votes are never sold.

## Two optional paid extras
Paid placements are optional, always labeled, and never change a contest result.

- **Featured** has a gold badge and a bigger gold-ringed pin on the map. **Events** can be featured by their organizer: **Featured pin** $10, **Top of the list** $15, or **Full run** $25 for events that run 31 days or more. The placement starts when you pay and ends on your event''s last day, up to 30 days (up to 90 days for Full run). **Homes** can be featured only by the owner of a home that finished winner, 2nd or 3rd place in a contest, after the winners are announced: Featured pin $10 or Top of the list $15, for 30 days.
- **Sponsor** is for installers. A free installer profile stays free. An installer can pay for the **Banner** ($50 per season) or **Banner and top of the list** ($75 per season), always labeled "Sponsor". The price is the same whenever you start in a season.
- **Paying never affects a contest.** It cannot change who wins or any contest result.

See [Feature an event or a home](/help/feature-an-event-or-home), [Sponsor your installer company](/help/sponsor-your-installer-company) and the [Pricing page](/pricing).

If you would like to help keep it free, there is a **Keep SoCal Lights Free** row in the three-dots menu.', updated_at = datetime('now') WHERE slug = 'is-it-free' AND updated_by = 'seed';
