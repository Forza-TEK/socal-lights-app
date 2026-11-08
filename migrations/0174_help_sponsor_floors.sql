-- Help Center: the Sponsor article now says the minimum price per plan ($10 Banner, $25 Banner and top of the list) and the $15 upgrade minimum.
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
A season runs from the day you pay to the last day of the season on the map (the Thanksgiving & Christmas season ends Dec 26). The first 14 days of a season cost the full price. After that the price falls a little every day, with the days left (never less than $10 for the Banner or $25 for Banner and top of the list). The page shows the exact price and a sentence such as "the season is 40% over, so this costs $X instead of $50" before you pay. The placement always ends on the season''s last day.

## Renew or upgrade
- **Renew:** buy the same plan again while it runs. The new season starts the day after the current one ends, at the full price of that season. Time is only added, and we sell at most one season ahead.
- **Upgrade:** to add the top of the list to a banner that already runs to the end of the season, choose Banner and top of the list. You pay the difference between the two plans'' prices that day (at least $15).
- Your dashboard (Overview) shows your dates and numbers, with a **Renew or upgrade** button.

## Refunds
If we cannot put your placement on, you get a full refund. A refund switches the placement off, and so does a payment dispute, so please email info@socallights.app before disputing a charge.

Paying never affects a contest, and the map stays free. See [Is SoCal Lights free?](/help/is-it-free).', updated_at = datetime('now') WHERE slug = 'sponsor-your-installer-company' AND updated_by = 'seed';
