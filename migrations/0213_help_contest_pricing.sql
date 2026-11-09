-- Help Center: new contest pricing, organizers pay from the first contest (see scripts/help/updates-contest-pricing.mjs). Edits the contest-passes article and the sentences that said the first contest is free, each only while updated_by is still 'seed' (an article edited in Admin > Help Center is never overwritten; the text is in docs/help-updates.md to paste). Add-only: it does not touch an earlier migration. No prices are written in the articles: they are on /pricing.
UPDATE help_articles SET title = 'Contest passes: what running a contest costs', summary = 'Organizers choose a contest pass before a contest goes live: a single contest, up to 5 or up to 20 in a 12-month window. Entering and voting stay free, and payment never affects a result.', body = '**Running a contest needs a contest pass.** The organizer chooses a pass before the contest goes live. Residents enter and vote for free. The [Pricing page](/pricing) shows what each pass costs.

## What a pass is
A pass sets the total number of contests your organization may run in a 12-month window: a single contest, up to 5 contests or up to 20 contests. For more than 20 contests, write to info@socallights.app. A pass only counts contests. Every contest still has resident entries, voting by the public, judges or both, People''s Choice and Judges'' Choice awards, its own page, link, QR code and poster, and an organizer dashboard. Entering and voting stay free for everyone, and payment never affects any result, vote, judge or ranking.

## Who "your organization" is
- If your sign-in email matches the website you give for the contest (for example, an address at your city''s own website), the organization is that website. Everyone at that organization shares one window.
- Otherwise the organization is you, with your own account.
- Co-organizers and staff do not create separate organizations.

## The 12-month window
- It starts the day you buy your pass, or the day your organization''s first contest goes live if that comes first. It ends the day before the same date a year later.
- A contest counts when it goes live. A draft, a contest held for our review, a declined contest and a contest that was never live do not count. A contest that was live and later unpublished still counts.
- When the window ends, your next contest needs a new pass.
- Contests that were already live or announced before contest passes began are not affected: they are not counted and they do not need a pass.

## When you choose a pass
1. Start a contest as usual: tap **Add**, then **A contest**, and fill in the screens. Nothing is lost if you have to leave.
2. On the Review screen, if your organization has no pass with room for the contest, you see the passes instead of the contest being created.
3. Tap **Choose** on a pass and pay on Stripe''s secure page. Your details are kept in your browser, and your contest is created by itself when you come back.
You can also choose a pass ahead of time on the [contest pass page](/contest-pass). To upgrade inside your window, choose a bigger pass and pay only the difference.

## Founding partners
We sometimes give an organization contests for a period. Then the page says "Founding partner: free through" a date, and no price is shown.

## Refunds
If we cannot apply your pass, you get a full refund. Write to info@socallights.app for help. See the [Terms](/terms#passes) for the details.

See also [Is SoCal Lights free?](/help/is-it-free) and [Create a contest with Quick start](/help/create-a-contest-quick-start).', keywords = 'contest pass cost price pay single contest up to 5 up to 20 12 month window upgrade founding partner organization limit count paywall refund how much does a contest cost', updated_at = datetime('now') WHERE slug = 'contest-passes' AND updated_by = 'seed';
UPDATE help_articles SET body = replace(body, '## Your first contest is free
Your organization''s first contest in every 12-month window is free. To run more contests in the same window, the Review screen shows the contest passes when you need one, and your contest is created as soon as you pay. See [Contest passes](/help/contest-passes).', '## Choosing a contest pass
Running a contest needs a contest pass. The Review screen shows the passes when your organization needs one, and your contest is created as soon as you pay. Residents enter and vote for free. See [Contest passes](/help/contest-passes).'), updated_at = datetime('now') WHERE slug = 'create-a-contest-quick-start' AND updated_by = 'seed' AND body LIKE '%## Your first contest is free
Your organ%';
UPDATE help_articles SET body = replace(body, '## Your first contest is free
Your organization''s first contest in every 12-month window is free. To run more contests in the same window, the Review screen shows the contest passes when you need one, and your contest is created as soon as you pay. See [Contest passes](/help/contest-passes).', '## Choosing a contest pass
Running a contest needs a contest pass. The Review screen shows the passes when your organization needs one, and your contest is created as soon as you pay. Residents enter and vote for free. See [Contest passes](/help/contest-passes).'), updated_at = datetime('now') WHERE slug = 'create-a-contest-customize' AND updated_by = 'seed' AND body LIKE '%## Your first contest is free
Your organ%';
UPDATE help_articles SET body = replace(body, 'Your organization''s first contest in every 12-month window is free as well. To run more contests in the same window you buy a contest pass: Up to 5, Up to 10 or Up to 20 contests in total, counting the free one. See [Contest passes](/help/contest-passes).', 'Organizers who run a contest buy a contest pass: a single contest, up to 5 or up to 20 in a 12-month window. Residents still enter and vote for free. See [Contest passes](/help/contest-passes).'), updated_at = datetime('now') WHERE slug = 'is-it-free' AND updated_by = 'seed' AND body LIKE '%Your organization''s first contest in eve%';
UPDATE help_articles SET body = replace(body, '- **Contest passes** are for organizers who run more than one contest in 12 months.', '- **Contest passes** are how organizers pay for running a contest.'), updated_at = datetime('now') WHERE slug = 'is-it-free' AND updated_by = 'seed' AND body LIKE '%- **Contest passes** are for organizers %';
UPDATE help_articles SET body = replace(body, 'Using SoCal Lights is free. The map, search, routes and voting stay free for everyone.', 'Using SoCal Lights is free for residents and visitors. The map, search, routes and voting stay free for everyone.'), updated_at = datetime('now') WHERE slug = 'is-it-free' AND updated_by = 'seed' AND body LIKE '%Using SoCal Lights is free. The map, sea%';
UPDATE help_articles SET body = replace(body, 'so a second contest in the same window may need a [contest pass](/help/contest-passes).', 'so your [contest pass](/help/contest-passes) needs room for it, and a new pass is needed once the window has ended.'), updated_at = datetime('now') WHERE slug = 'edit-your-contest-and-change-dates' AND updated_by = 'seed' AND body LIKE '%so a second contest in the same window m%';
