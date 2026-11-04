# Monetization

Three revenue features, all controlled from one file: `public/site-config.js` (public links only, no secrets).

## 1. Donate button
The coffee-cup button in the top bar opens a "Keep SoCal Lights free" box. The donate button shows when `donateUrl` is set
(currently Cash App: `https://cash.app/$RelaxationMeditation`). Change `donateUrl` / `donateLabel` to switch to another service.

## 2. Affiliate links (off until configured)
- **Shop for the season:** set `amazonTag` to the Amazon Associates tracking id (e.g. `socallights-20`). The support box then shows season-specific
  shop shortcuts (`shop` in the same file; edit the labels and search words freely). Links use `rel="sponsored"`.
- **Ticket links:** add entries to `ticketAffiliates`, keyed by the host of the event link. A rule is either `{ param, value }` (adds a tracking
  parameter) or `{ template: "https://…?u={url}" }` (wraps the link in the network's deep link, which is what Impact/CJ give you). Only event-info links
  on matching hosts change. As of 2026-10-28 just 22 of 1,302 events link straight to a ticket seller (19 Eventbrite, 3 Fever); the rest link to organizers, venues and city pages, so expect modest returns.
- A disclosure line ("we may earn a small commission") appears automatically whenever either is configured.
- To get started: apply to Amazon Associates (needs 3 qualifying sales in 180 days to stay active) and to ticket programs such as Eventbrite, Ticketmaster (via Impact), Groupon (via Impact). Each has its own approval.

## 3. Feature your event
**Automatic (Stripe):** see `docs/stripe-setup.md`. Once the two Stripe secrets are set, visitors pick their event and pay on `/feature`, and the placement turns on by itself. The manual SQL below is only for comping a placement by hand.

- Page: `/feature` (plans: Featured pin $10 / 30 days, Top of the list $15 / 30 days, Whole season $20; raised from $5 / $10 / $15 on 2026-11-04). Prices are defined only in `functions/_lib/featured.js`
  (`PLANS`) and reach the pages through `/api/config`; the HTML holds wording only. Linked from the ⋯ menu as "Promote your event" (hidden in the store apps).
- Payment: Stripe only. The Cash App payment links (`featurePay`) were removed; if Stripe isn't switched on, `/feature` shows an email-us message to `contactEmail`.
  Refunds and disputes switch the placement off automatically (see `docs/stripe-setup.md`).
- Database: migration `0062_featured_events.sql` adds `featured` (0/1) and `featured_until` (YYYY-MM-DD, optional) to `events`.
  Featured events get a gold "Featured" badge, sort to the top of the list, and show a bigger gold-ringed pin. The API exposes it as `f`.
- To turn a placement on after payment, add a new migration (never edit an old one):

  ```sql
  UPDATE events SET featured=1, featured_until='2026-12-15', updated_at=datetime('now') WHERE id='the-event-id';
  ```
  Placement ends by itself after `featured_until`. Scheduled upkeep and sweep upserts never touch these two columns.
- Featured must stay honest: the event still has to be real, public and verified, and the badge is always shown.
- History: built 2026-10-28, removed briefly the same day, then restored with Cash App payments; Cash App links replaced by Stripe-only checkout 2026-11-04.

## 4. Add your event (free, public)
`/add-event` lets organizers add events themselves; page-verified events publish automatically, others go to the admin "Submitted events" tab. Details in `docs/stripe-setup.md`.
