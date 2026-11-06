# Whole-app audit, 2026-11-07: ranked findings and fix order

_CEO summary of seven read-only specialist audits (reports in this folder): security, privacy-legal, payments, operations, seo-growth, ux-a11y-perf, engineering. The owner is on the Cloudflare **free plan**. Counts: security 0 critical/0 high/7 medium; privacy-legal 3 high/9 medium; payments 3 high/9 medium; operations 5 high/9 medium; SEO 6 high/8 medium; UX 1 high/7 medium; engineering 3 high/12 medium. Nothing was found to be actively exploited, and live revenue is $0, so most items are latent._

## Already fixed during the audit
| Item | Where |
|---|---|
| Backup workflow printed a signed 1-hour download link to the whole DB export into the public Actions log (operations H2) | PR 388 |

## Tier 0: owner actions that unblock safe selling (do first)
1. **$10 test purchase** (event, then installer $50) and check Stripe > Developers > Webhooks > delivery log and Cloudflare > Security > Events for `/api/stripe-webhook`; add a WAF skip rule for the webhook if challenged (payments H1).
2. **Confirm `MAIL_POSTAL_ADDRESS` is set** in Cloudflare Pages secrets; without it no marketing email carries a postal address (privacy PL-03).
3. **Preview deployments use the production DB and R2, with no Turnstile** (operations H4): turn off non-production previews (Workers & Pages > socal-lights > Settings > Builds & deployments) or give them their own bindings.
4. **Free plan:** connect the usage panel (token + account id, see docs/runbooks/cloudflare-limits.md when merged); check the next scheduled backup (10:17 UTC) really runs by itself.
5. Send the attorney `docs/monetization/legal-redlines.md` and the question lists in privacy-legal.md and payments.md.

## Tier 1: in progress tonight (agents)
| # | Gap | Source |
|---|---|---|
| 1 | Home page `/` does 2 full scans per hit (4,618 rows; D1 reads 3.3M of 5M/day) | operations H5 |
| 2 | `/api/events`: any query string bypasses the cache; `?all=1` is public (1.3 MB, uncached) | security N-01, engineering M1 |
| 3 | Sign-in code attempt race (60 parallel guesses got 26 checked, limit 5), no per-IP limit | security S-07 |
| 4 | Visit counter drops new page names after ~45 event pages/day | seo H4 |
| 5 | Free-plan per-request limits: results emails (200 sequential sends), organizer-added entries geocoding, posts IN(200) vs 100 bound params, map boot all-or-nothing | operations, engineering M2 |
| 6 | Sponsor banners switch off ~8 h early (UTC vs Pacific); sponsor window/price not locked at checkout; $75 overcharge cases; renewal price bug | payments H2, M1, M2 |
| 7 | Installer auto-renewal with ARL-compliant copy, consent record, reminders and cancel path ("no subscription" appears in ~12 places) | payments H3, privacy PL-02 |
| 8 | Admin usage panel for free-plan limits with alerts | owner request |

## Tier 2: next
| # | Gap | Source |
|---|---|---|
| 9 | Paid placements vanish without a refund flag on self-service paths (account deletion, delete home, creator unpublish, admin contest decline/delete) | engineering H1 |
| 10 | Private-home addresses: 158 "Private home" listings, no remove-my-home control, no stored consent for organizer-added homes, policy silent | privacy PL-01 |
| 11 | Installer takeover (post as an installer under an existing name, claim by domain); fake "City of X Official" contests live instantly | security S-04, N-02 |
| 12 | Monitoring: GitHub cron unreliable (uptime ~every 6-8 h; backup not yet scheduled), stuck Pages deploys undetected; add an external monitor and a dead-man's switch | operations H1, H3, engineering H2 |
| 13 | Stripe vs D1 reconcile report; log bad webhook signatures; dispute readiness | payments H1, M5 |
| 14 | Account deletion leaves admin_log labels, contest_changes emails, unconfirmed alert subs | privacy PL-04 |
| 15 | CSP (report-only first) and HSTS; email caps on quote/alert emails | security S-02, N-03, S-10 |
| 16 | Phone performance: Lighthouse mobile 36-38 on `/` (unresized photos, MapLibre from unpkg) | ux, seo H5 |
| 17 | SEO: event pages are islands (link to `/e/<id>`), homepage title brand-only, no subscribe/share on landing pages, ad/source attribution | seo H1, H2, H6 |
| 18 | UX: search box has no focus ring; location prompt covers Back; Filters dialog focus; http photo URLs (mixed content); description fill-in not announced | ux |
| 19 | One Pacific "today" helper (14 copies of UTC-8) | engineering M3 |
| 20 | Tests for sign-in, Admin Access JWT, submit paths, contest announce, front end; stand-in D1 fidelity | engineering |
| 21 | Tutorials out of date: feature (re-record), map/night/pro-filter/app (banner strip, description), all 25 predate the cream restyle | ux |

## Tier 3: later
Season cliff (91% of events end by Jan 6; city pages 404 with no upcoming events: year-round design, county hubs, opportunity pages); California hardcodes to a regions table before national expansion; CCPA rights section, DMCA/content licence/affiliate clause, accessibility statement, contractor-licence line, EXIF stripping; wording "house/display" to "home" (full list in ux report); repo hygiene (215 branches, 661 MB pack, LICENSE, rollback runbook); doc drift (CLAUDE.md "branch work, not live yet", $299/$5 pricing in old docs); duplicate migration numbers check.

## Questions only the owner can answer
Cloudflare plan confirmed as Free (so the 100k requests/day and 5M rows/day caps apply); whether to relabel "Featured" as "Sponsored"; Finance's refund window; whether the map's default season should also run to Jan 6.
