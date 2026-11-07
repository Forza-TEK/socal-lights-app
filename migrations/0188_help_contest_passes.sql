-- Help Center: contest passes (see scripts/help/updates-contest-passes.mjs). One new article (INSERT OR IGNORE) plus a paragraph on the two create-a-contest articles and one sentence on is-it-free, each only while updated_by is still 'seed' (an article edited in Admin > Help Center is never overwritten; the text is in docs/help-updates.md to paste). No prices are written in the articles: they are on /pricing.
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('contest-passes', 'Contest passes: your first contest is free', 'run', 'answer', 'Your organization''s first contest in every 12-month window is free. To run more in the same window, choose a pass. Entering and voting stay free, and payment never affects a result.', '**Your organization''s first contest in every 12-month window is free.** To run more contests inside the same window, you buy a **contest pass**. The [Pricing page](/pricing) shows what each pass costs.

## What a pass is
A pass sets the total number of contests your organization may run in the window, the free first one included: Up to 5, Up to 10 or Up to 20. For more than 20 contests, write to info@socallights.app. A pass only counts contests. Every contest still has resident entries, voting by the public, judges or both, People''s Choice and Judges'' Choice awards, its own page, link, QR code and poster, and an organizer dashboard. Entering and voting stay free for everyone, and payment never affects any result, vote, judge or ranking.

## Who "your organization" is
- If your sign-in email matches the website you give for the contest (for example, an address at your city''s own website), the organization is that website. Everyone at that organization shares one window.
- Otherwise the organization is you, with your own account.
- Co-organizers and staff do not create separate organizations.

## The 12-month window
- It starts the day your organization''s first contest goes live and ends the day before the same date a year later.
- A contest counts when it goes live. A draft, a contest held for our review, a declined contest and a contest that was never live do not count. A contest that was live and later unpublished still counts.
- When the window ends, your next contest starts a new window and is free again.

## When you choose a pass
1. Start a contest as usual: tap **Add**, then **A contest**, and fill in the screens. Nothing is lost if you have to leave.
2. If the contest would be more than your window allows, the Review screen shows the passes instead of creating it. You see how many contests you have used and the exact dates of your window.
3. Tap **Choose** on a pass and pay on Stripe''s secure page. Your details are kept in your browser, and your contest is created by itself when you come back.
You can also choose a pass ahead of time on the [contest pass page](/contest-pass). To upgrade inside your window, choose a bigger pass and pay only the difference.

## Founding partners
We sometimes give an organization free contests for a period. Then the page says "Founding partner: free through" a date, and no price is shown.

## Refunds
If we cannot apply your pass, you get a full refund. Write to info@socallights.app for help. See the [Terms](/terms#passes) for the details.

See also [Is SoCal Lights free?](/help/is-it-free) and [Create a contest with Quick start](/help/create-a-contest-quick-start).', 'contest pass free first contest 12 month window cost price pay more contests upgrade founding partner organization limit count paywall refund', '', 15, 'published', 'seed');
UPDATE help_articles SET body = body || char(10) || char(10) || '## Your first contest is free
Your organization''s first contest in every 12-month window is free. To run more contests in the same window, the Review screen shows the contest passes when you need one, and your contest is created as soon as you pay. See [Contest passes](/help/contest-passes).', updated_at = datetime('now') WHERE slug IN ('create-a-contest-quick-start', 'create-a-contest-customize') AND updated_by = 'seed' AND body NOT LIKE '%/help/contest-passes%';
UPDATE help_articles SET body = replace(body, 'Entering a contest is free and votes are never sold.', 'Entering a contest is free and votes are never sold. Your organization''s first contest in every 12-month window is free too; to run more in the same window you buy a contest pass (see [Contest passes](/help/contest-passes)).'), updated_at = datetime('now') WHERE slug = 'is-it-free' AND updated_by = 'seed' AND body NOT LIKE '%/help/contest-passes%';
