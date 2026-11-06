-- Help Center: installer Sponsor placements. Inserts the new article only if it is not there (INSERT OR IGNORE); changes is-it-free only while updated_by is still 'seed',
-- so an article edited in Admin > Help Center is never overwritten (its new text is in docs/help-updates.md to paste).
UPDATE help_articles SET summary = 'Yes. Finding lights, routes, voting and entering a home are free, and votes are never sold. Featured and Sponsor are the optional paid extras.', body = 'Using SoCal Lights is free. The map, search, routes and voting stay free for everyone. Entering a contest is free and votes are never sold.

## Two optional paid extras
Paid placements are optional, always labeled, and never change a contest result.

- **Featured** has a gold badge and a bigger gold-ringed pin on the map. **Events** can be featured by their organizer: **Featured pin** $10, **Top of the list** $15, or **Full run** $25 for events that run 31 days or more. The placement starts when you pay and ends on your event''s last day, up to 30 days (up to 90 days for Full run). **Homes** can be featured only by the owner of a home that finished winner, 2nd or 3rd place in a contest, after the winners are announced: Featured pin $10 or Top of the list $15, for 30 days.
- **Sponsor** is for installers. A free installer profile stays free. An installer can pay for the **Banner** ($50 per season) or **Banner and top of the list** ($75 per season), always labeled "Sponsor". Late in a season the price is prorated for the days left.
- **Paying never affects a contest.** It cannot change who wins or any contest result.

See [Feature an event or a home](/help/feature-an-event-or-home), [Sponsor your installer company](/help/sponsor-your-installer-company) and the [Pricing page](/pricing).

If you would like to help keep it free, there is a **Keep SoCal Lights Free** row in the three-dots menu.', keywords = 'free cost price pay charge fee money tip cash app featured sponsor installer paid winner podium buy full run $10 $15 $25 $50 $75', updated_at = datetime('now') WHERE slug = 'is-it-free' AND updated_by = 'seed';
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('sponsor-your-installer-company', 'Sponsor your installer company', 'post', 'howto', 'Installers can pay for a labeled Sponsor banner ($50 per season) or the banner plus the top of the list ($75). Choose on Pricing, pick your company, check the dates, pay on Stripe.', 'Installers can show their company in a labeled **Sponsor** banner at the top of the list on the map. It is optional and paid; your free installer profile stays free.

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
A season runs from the day you pay to the last day of the season on the map (the Thanksgiving & Christmas season ends Dec 26). With 14 or more days left you pay the full price. With fewer days left you pay a share of it for the days remaining (never less than $10); the page shows the exact price before you pay. The placement always ends on the season''s last day.

## Renew or upgrade
- **Renew:** buy the same plan again while it runs. The new season starts the day after the current one ends. Time is only added, and we sell at most one season ahead.
- **Upgrade:** to add the top of the list to a running banner, choose Banner and top of the list. It is sold at its own price for the days left; there is no credit for the banner you already paid for.
- Your dashboard (Overview) shows your dates and numbers, with a **Renew or upgrade** button.

## Refunds
If we cannot put your placement on, you get a full refund. A refund switches the placement off, and so does a payment dispute, so please email info@socallights.app before disputing a charge.

Paying never affects a contest, and the map stays free. See [Is SoCal Lights free?](/help/is-it-free).', 'installer sponsor banner top of the list pay buy price season $50 $75 prorated renew upgrade advertise company', '', 32, 'published', 'seed');
