# Installer banner

A thin strip labelled "Sponsor" on the map: company name (links to the website, or to a mailto link if there is no website) | phone (tap to call).
Desktop: its own line under the logo, search and buttons. Phone: right above the list, so it moves with the list.
Height 24px (the owner's brief was one third of the search field, about 17px; 24px is the smallest comfortable tap target).

## Who shows
`installers.banner_until` (YYYY-MM-DD). Set in Admin > Installers > Profile > "Map banner". Empty = not on the banner. The profile must be active and have a phone or website.
Sold, not a free pilot (the owner drives visitors with Facebook and Instagram ads). Payments are not built (see `docs/monetization/strategy.md`, Stage 3: Installer Partner).

## Which installers show for the current map view
`/api/banner` returns every installer on the banner (same for everyone, cached). `public/banner.js` picks the ones to show:
- The map view's cities (by centre) and counties (from the places in view, plus the nearest city to the centre) are matched to the installer's "Areas served" list ("Orange County, Irvine").
- An installer with no areas listed, or "Southern California"/"All", shows everywhere.
- It is a scrolling marquee: each matching installer is its own pill, followed by dashed "Installers: advertise here" pills (link to /pricing#banner). The empty pills also show when nobody matches.
- It pauses on hover and focus and has a pause button. With reduced motion it does not scroll by itself (it can be swiped).
- The starting installer changes each visit so nobody is always first. A "shown" is counted when the pill is actually on screen.

## Numbers
`banner_stats` (daily): times shown (once per installer per page visit), company-link taps, phone taps. Totals only, nothing personal. Shown to admins (installer profile, last 30 days) and to the installer in their dashboard.

## Not built yet
Payment, a self-serve booking page, a per-county cap, an "Advertise here" placeholder when the banner is empty, a monthly report email.
