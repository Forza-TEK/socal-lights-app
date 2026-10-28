# Monetization

Three revenue features, all controlled from one file: `public/site-config.js` (public links only, no secrets).

## 1. Donate button
The coffee-cup button in the top bar opens a "Keep SoCal Lights free" box. The donate button shows when `donateUrl` is set
(currently Cash App: `https://cash.app/$RelaxationMeditation`). Change `donateUrl` / `donateLabel` to switch to another service.

## 2. Affiliate links (off until configured)
- **Shop for the season:** set `amazonTag` to the Amazon Associates tracking id (e.g. `socallights-20`). The support box then shows season-specific
  shop shortcuts (`shop` in the same file; edit the labels and search words freely). Links use `rel="sponsored"`.
- **Ticket links:** add entries to `ticketAffiliates`, e.g. `{ "eventbrite.com": { param: "aff", value: "socallights" } }`. Event-info links
  on matching hosts then carry the tracking parameter.
- A disclosure line ("we may earn a small commission") appears automatically whenever either is configured.
- To get started: apply to Amazon Associates (needs 3 qualifying sales in 180 days to stay active) and to ticket programs such as Eventbrite, Ticketmaster (via Impact), Groupon (via Impact). Each has its own approval.

## 3. Feature your event
- Page: `/feature.html` (plans: Featured pin $29/30 days, Top of the list $59/30 days, Whole season $99). Edit the copy and prices in that file.
- Payment: put a Stripe Payment Link, Cash App or PayPal link in `featurePay.pin|top|season`. Until set, each plan button opens a pre-filled email to `contactEmail`.
- Database: migration `0062_featured_events.sql` adds `featured` (0/1) and `featured_until` (YYYY-MM-DD, optional) to `events`.
  Featured events get a gold "Featured" badge, sort to the top of the list, and show a bigger gold-ringed pin. The API exposes it as `f`.
- To turn a placement on after payment, add a new migration (never edit an old one):

  ```sql
  UPDATE events SET featured=1, featured_until='2026-12-15', updated_at=datetime('now') WHERE id='the-event-id';
  ```
  Placement ends by itself after `featured_until`. Scheduled upkeep and sweep upserts never touch these two columns.
- Featured must stay honest: the event still has to be real, public and verified, and the badge is always shown.
