# Installer banner

A thin strip labelled "Sponsor" on the map: company name (links to the website, or to a mailto link if there is no website) | phone (tap to call).
Always at the top of the list panel (phone portrait, landscape, tablet and desktop), above the Places tabs. It is hidden when the list is minimized.
Height 24px (the smallest comfortable tap target; WCAG 2.2 minimum). The first brief was one third of the search field (17px); the owner chose 24px.

## Who shows
`installers.banner_until` (YYYY-MM-DD). Set in Admin > Installers > Profile > "Map banner". Empty = not on the banner. The profile must be active and have a phone or website.
Sold, not a free pilot (the owner drives visitors with Facebook and Instagram ads). Installers now buy it themselves at `/sponsor` (see "Payments" below). An admin can still set the dates by hand.

## Which installers show for the current map view
`/api/banner` returns every installer on the banner (same for everyone, cached). `public/banner.js` picks the ones to show:
- The map view's cities (by centre) and counties (from the places in view, plus the nearest city to the centre) are matched to the installer's "Areas served" list ("Orange County, Irvine").
- An installer with no areas listed, or "Southern California"/"All", shows everywhere.
- It is a scrolling marquee: each matching installer is its own pill, followed by one dashed "Installers: advertise here" pill (links to /pricing#banner), which is also all that shows when nobody matches. The pause button sits next to the Sponsor label (right end on a portrait phone).
- It pauses on hover and focus and has a pause button. With reduced motion on, it starts paused and the play button starts it.
- The starting installer changes each visit so nobody is always first. A "shown" is counted when the pill is actually on screen.

## Numbers
`banner_stats` (daily): times shown (once per installer per page visit), company-link taps, phone taps. Totals only, nothing personal. Shown to admins (installer profile, last 30 days) and to the installer in their dashboard.

## Not built yet
A per-county cap, an "Advertise here" placeholder when the banner is empty, a monthly report email.

## Prices on the pricing page (owner, 2026-11-06)
- Free: profile card (page at /installer/<slug>, linked from the homes they installed).
- $50 per season: the Sponsor banner. Set by an admin with the "Show on the banner until" date.
- $75 per season: banner plus the company card at the top of the list behind Featured events. The list card is built (migration 0170): `installers.top_until`, set in Admin > Installers > Profile > "Top of the list until" (set the banner date too: the $75 tier includes the banner). It shows up to two labelled "Sponsor" cards at the top of the list, right behind the Featured places, for installers whose areas are in the map view (same matching as the banner). Numbers (shown, taps) are in `banner_stats` (`lst_*`) and appear in Admin and the installer's dashboard.
- Sold at `/sponsor` (below). Email info@socallights.app is only for questions.

## Payments (built 2026-11-06)
Funnel: `/pricing#banner` has a **Choose** button on each paid tier (`/sponsor?plan=banner|banner_top`; the free tier's button goes to `/add-house?kind=installer`). `/sponsor` steps: sign in (the plan choice survives the sign-in), choose the installer profile, choose the plan, check the exact dates and price, Stripe Checkout. Back from Stripe: `/sponsor?paid=1` or `?cancelled=1`. The installer dashboard (`/installer/<slug>/manage`) has a Sponsor placement card with status, dates, numbers and Renew or upgrade.
- **Prices:** `INSTALLER_PLANS` in `functions/_lib/featured.js` (the only place; `/api/config` serves them as `installerPlans`). No page holds a price (a test checks `public/`).
- **Who can buy:** the signed-in owner of the profile (`installers.owner_email`, same rule as the dashboard, helper `ownsInstaller`). No profile: the page offers "Create your free profile first" and a search with Claim this profile. The profile must be active with a phone or a website (blocking, with a link to fix it); no areas listed is advice only.
- **Season rule** (`functions/_lib/sponsor.js`, tested in `tests/sponsor-rules.test.mjs`): a placement runs from the day it starts to the last day of the season on the map that day falls in (windows in `public/seasons.js`; Thanksgiving & Christmas Lights ends Dec 26; New Year's runs Dec 27 to Jan 31).
- **Price (owner decision 2026-11-06, option C):** the first 14 days of a season (Pacific date; day 1 is the season's first day) cost the full price. After day 14 the price is `full x days left / (season days - 13)` (days left counts the start day), rounded to a whole dollar, never below $10 (same floor for both plans), and never the full price after day 14. Day 14 is exactly full and day 15 just below it, so there is no cliff. A season shorter than 14 days is prorated over the whole season; an unknown season start is the full price. The placement always ends on the season's last day. The helper is `installerPrice()` in `functions/_lib/featured.js`; the quote, checkout and webhook amount check all use it. Example: Christmas season (Nov 3 to Dec 26, 54 days): Nov 3 to Nov 16 $50 / $75; Nov 17 $49 / $73; Nov 24 $40 / $60; Dec 1 $32 / $48; Dec 10 $21 / $31; Dec 19 $10 / $15 (the banner reaches the floor); Dec 22 $10 / $10 (both at the floor) to Dec 26. The amount charged is stored on the order; the webhook checks the paid amount against the same calculation and flags a mismatch like Featured does (`[auto] amount mismatch`).
- **Renewal:** buying the same plan while it runs starts the day after it ends (the first day of the next season, full price) and runs to that season's end. Time is only added, never shortened. At most one season ahead is sold (the horizon is the end of the season after the one a purchase today reaches); beyond that checkout answers 400 "already booked through ...".
- **Upgrade:** Banner to Banner and top of the list, when the banner already runs to the end of the season the top card would reach, costs the **difference between the two plans' prices today** (never below $10). The top card starts today and runs to the season end; the banner stays as it is. If the banner would end sooner, it is the full price of the new plan for the days left, and the banner is extended to match. The page says this plainly.
- **Webhook** (`functions/api/stripe-webhook.js`, `applyInstallerOrder` / `revokeInstaller` in `sponsor.js`): orders are `feature_orders` rows with `target='installer'`, `event_id` = installer id, plan `banner` or `banner_top` (migration 0171 adds `applied_top_until`, `applied_from`, `prev_banner_until`, `prev_top_until`). Same dedupe, retry (an unknown profile answers 500 so Stripe retries), refund, partial refund (held), dispute, dispute won and refund-first handling as Featured. A refund or lost dispute switches the placement off, putting back what an admin had set by hand and keeping time other paid orders still cover; a longer date an admin set by hand afterwards is left on and the order gets a "placement differs" note.
- **Admin:** Orders shows the installer's name, plan, amount and dates. Admin > Installers refuses a banner or top date earlier than a paid order that is still running (refund the order first). Merging profiles moves the paid orders and keeps the later dates.
- **Emails:** Stripe's own receipt (receipt_email), a service email to the buyer (`sponsor_paid`, no unsubscribe or postal line: it is transactional) and a note to the team (`sponsor_admin`). Both are editable in Admin > Email templates.
- **Counters** (`site_hits`, no personal data; shown in Admin > Dashboard "How people use the site" and the digest): `fn:pricing-choose`, `fn:sponsor-shown`, `fn:sponsor-picked` (browser), `fn:sponsor-checkout`, `fn:sponsor-paid` (server).
- **Rules that stay:** paid placements are always labelled "Sponsor"; payment never touches a contest (a test checks); the map stays free; web only (hidden in the app, 403 for the app's user agent).
