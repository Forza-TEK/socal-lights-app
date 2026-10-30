# Monetization analysis (2026-10-30)

Not financial advice. Figures come from web searches and vendor or review pages that often disagree; confirm on each vendor's own page. We have no traffic numbers, so this lists what to measure, not forecasts.

## What the app earns from today (`docs/monetization.md`)
| Stream | State | Notes |
|---|---|---|
| Tip jar (Cash App) | Live | Hidden in the native apps. Low, unpredictable. |
| Amazon Associates (shop tab) | Live, tag `socallightsap-20` | Needs 3 qualifying sales in 180 days. Sources put home-improvement at about 3% (verify in the Associates dashboard). |
| Ticket affiliates | Plumbing only | Only 22 of 1,302 events link to a ticket seller. Fever is reported at 6-10%, Ticketmaster 1-5%; sources conflict. |
| Feature your event ($5 / $10 / $15) | Cash App live; Stripe automatic once keys are set | The most promising direct revenue. Hidden in native apps. |
| Display ads | Not used | Raptive reportedly lowered its minimum to 25k views a month in Oct 2025; Mediavine and Ezoic bars are higher and sources conflict. |

## What is missing
1. **Installers** are the best-fit paying customer and are not charged. Homeowners pay roughly $168-$675 per install (Thumbtack and Angi pricing pages), so one booked job is worth far more than a $5 listing. No source gave per-lead prices; ask installers what they pay today.
2. **Contest organizers** (cities, HOAs, chambers) have no paid tier. Contest software sells at about $29-$99 a month (Woobox, ShortStack, Gleam, Votigo; review-site figures). Real contests are run by cities and chambers with local business sponsors giving gift cards.
3. **Sponsors** have no inventory: a sponsor line on contests, a "presented by" on a city page, a sponsored prize.
4. **Seasonality**: demand runs Halloween to New Year, so plans should be per season, not per month.

## Recommended order
1. Turn on Stripe for Featured (`docs/stripe-setup.md`). Highest return for the least work.
2. Installer listing, per season: Featured pin plus a "Get a quote" button and a verified-installer badge. Price against one booked job, not one click.
3. Contest packages per season: free basic (current) and a paid Pro (branding, sponsor logos and prize on the contest page, export, extra judges, emailed results). Entry and voting stay free for the public; never sell votes (`docs/voting-standards.md`).
4. Local sponsor slots: an organizer attaches a sponsor name and logo to a contest or prize. Charge per contest or take a share.
5. Keep affiliate links but expect little. Add them where intent is high.
6. Display ads last. They hurt a map-first product and the traffic bar may not be met.

## Rules to respect
- Apple: digital upgrades bought in an iOS app generally need In-App Purchase, so keep paid features web-only and hidden in the native apps (as now). The US storefront allows external links since 2025, but reviewers are inconsistent; check the current guideline first.
- Label paid placements and affiliate links.
- Payment must never change who wins a contest.

## Measure first
Add privacy-friendly counts of weekly visitors in season, event detail opens, outbound clicks (ticket, shop, installer), contest entries and votes, and Feature checkout starts. Set prices after one season of numbers.
