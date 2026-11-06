-- Help Center: automatic renewal of installer Sponsor placements. The new article is INSERT OR IGNORE; the Sponsor article gets one pointer line only while updated_by is still 'seed'
-- (an article edited in Admin > Help Center is never overwritten; its new text is in docs/help-updates.md to paste).
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('automatic-renewal-for-installers', 'Automatic renewal for installer Sponsor placements', 'post', 'howto', 'Optional and off by default: we charge your saved card on the last day of your Sponsor placement, email you 7 days before, and you can cancel any time with the link in any email.', 'Automatic renewal is optional and for installers only. It is **off** unless you turn it on.

## What it does
- On the last day of your Sponsor placement we charge the card you saved with Stripe, at the plan''s price shown on the [Pricing page](/pricing) at that time, and the next season starts the next day.
- We email you 7 days before each charge, with the amount, the date and a link to cancel.
- You get an email when it is turned on and after each charge, and Stripe sends its own receipt.
- We never see your card number. Stripe keeps the card; we keep only Stripe''s ids.

## Turn it on
- On the [Sponsor page](/sponsor), tick **Renew automatically each season** before you pay (it is never ticked for you), or
- In your installer dashboard, under **Sponsor placement**, tick the box and tap **Turn on automatic renewal**. A Stripe page saves your card; nothing is charged that day. You need a running placement.

## Cancel any time
- Use the **Cancel automatic renewal** link in any renewal email. You do not need to sign in.
- Or tap **Turn off automatic renewal** in your dashboard.
- Cancelling before the charge means nothing is charged, and the placement you already paid for keeps running. We also ask Stripe to remove the saved card.

## If a charge fails
We email you a link to pay once or use a different card. We try once more 3 days later. If that fails too, automatic renewal stops and nothing more is charged automatically. You can turn it on again any time.

## Refunds
A refund or a payment dispute of an automatic charge switches that placement off and pauses automatic renewal. Please email info@socallights.app before disputing a charge.

We sell at most one season ahead. Paying never affects a contest, and the map stays free.', 'automatic renewal auto renew subscription cancel card charge installer sponsor banner stop charging reminder', '', 33, 'published', 'seed');
UPDATE help_articles SET body = body || '

## Automatic renewal
Automatic renewal is optional and off unless you turn it on. See [Automatic renewal for installer Sponsor placements](/help/automatic-renewal-for-installers).', updated_at = datetime('now') WHERE slug = 'sponsor-your-installer-company' AND updated_by = 'seed' AND body NOT LIKE '%## Automatic renewal%';
