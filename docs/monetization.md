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

## 3. Feature your event (removed 2026-10-28, parked for later)
Paid "Featured" placement was built and then taken out of the site at the owner's request. The `/feature` page, the Featured badge,
list sorting and gold map pin, and the `f` field in `/api/events` are gone. The two database columns `featured` (0/1) and
`featured_until` (migration `0062_featured_events.sql`) remain, unused and harmless; dropping them is not worth the risk on the live database.
To bring it back, restore the pieces from git history (PR "Monetization: tip button, affiliate plumbing, Feature your event").
Planned prices were $29 / 30 days (pin), $59 / 30 days (top of list), $99 / season.
