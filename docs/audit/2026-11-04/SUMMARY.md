# Whole-app audit: ranked gaps and fix order

_CEO, 2026-11-04. Seven read-only specialist audits of the merged app (reports in this folder). Counts: security 1 High, 5 Medium; privacy 5 High, 9 Medium; payments 4 High; data and operations 4 High; SEO and measurement 4 High; UX and performance 3 High; contests and engineering 5 High. Most findings are latent: the live database is nearly empty (5 users, 6 homes, 1 contest, 0 orders, 0 votes). Items marked FIXED are already live._

## Fixed already
| Item | Where |
|---|---|
| Stored script injection on `/installer/<slug>` (and hardening of help pages) | PR 307, verified live |
| Open redirect after Google sign-in (tab character) | PR 307, verified live |

## Tier 1: fix now (small, safe, no owner input)
| # | Gap | Report | Why first |
|---|---|---|---|
| 1 (FIXED on branch, not merged) | Fake "City of X" contests go live at once and can buy Featured; nothing alerts admin | contests C1 | Impersonation plus paid promotion |
| 2 (FIXED on branch, not merged) | Any account can send 50 invites per call from the site's email; user text becomes links in branded email | contests C2, security S-05, S-06 | Phishing from our domain; can exhaust the shared email quota and lock out sign-in |
| 3 (FIXED on branch, not merged) | Results are not fully locked after announcement (organizer can decline an entry and delete its photos and votes) | contests C3 | Breaks the promise that results are frozen |
| 4 (FIXED on branch, not merged) | No security headers on Function responses (nosniff, referrer, permissions, frame) | security S-02 | Cheap hardening |
| 5 (FIXED on branch, not merged) | Unknown URLs return 200 with the map (soft 404s) | ux F1 | Search engines can index junk |
| 6 (FIXED on branch, not merged) | Event structured data marks 659 "expected" events as scheduled; city titles too long; sitemap lastmod faked; empty `/past` listed | seo F1, F6 | Structured-data policy risk |
| 7 | Privacy policy states things the code contradicts (location "not sent", "no ads / not shared with advertisers", IP deleted "in a day or two", quote-lead consent) | privacy P-01 to P-04 | False statements |
| 8 | Account deletion leaves personal data in judges, leads, claims, listing changes, alert subscriptions, installer owner email, staff rows | privacy P-05 | Deletion promise |

## Tier 2: next (medium effort)
| # | Gap | Report |
|---|---|---|
| 9 | Emails have no postal address and no unsubscribe header (**needs the owner's mailing address**) | privacy |
| 10 | Declined paid submission: order stays paid forever, no refund prompt; no admin orders and refunds view; overlapping orders and refunds interact badly; unpublishing drops a paid placement | payments P2 to P8 |
| 11 | No automated tests for payment, claim, voting or deletion code; `main` has no merge gate | payments P1, contests C4 |
| 12 | No backup of the database or photos; no restore runbook; live DB cannot be rebuilt from migrations | data F1, F2 |
| 13 | No alerting or uptime monitoring; failed emails marked as sent | contests C5 |
| 14 | `/api/events` is 1.36 MB raw / 300 KB gzip, includes 769 ended events, no ETag; 7 seconds on a throttled phone | data F3, ux F2 |
| 15 | City pages are thin (134 of 266 under 3 events) and link nowhere; homepage has no crawlable content | seo F2, F3 |
| 16 | Installer profile takeover paths and unlisted email redirection; admin changes lack same-origin check; email-code attempts counted non-atomically; preview deployments share production data | security S-04 and others |
| 17 | Funnel counters missing (event open, add completed, sign-in, subscribe) and the "real humans" estimate is unreliable | seo F4, F5 |
| 18 | Accessibility basics (invalid `aria-expanded`, contrast, missing `<main>`, heading order); offline page only works from the map | ux |

## Tier 3: later
Per-event pages with share previews (seo F8); 429 MB tutorials folder and a 13.5 MB video on help pages; routine runs that find nothing leave no trace; dead links from one source (`socalhauntlist.com`, 93 events); wording consistency (house, home, display); Terms gaps (refunds, licence, takedown, DMCA); `og:url` and card tags; documentation drift.

## Needs the owner
1. **Mailing address** for email footers (CAN-SPAM).
2. **Android upload key:** the helper workflow ran on Nov 1 and published the key as a one-day artifact in a public repo (gone now). If the app is already submitted to Play, request an upload key reset in Play Console.
3. **Cloudflare dashboard** (not readable with our token): confirm D1 Time Travel retention, add an uptime monitor, decide whether preview deployments should use a separate database.
4. **Attorney and CPA** items in `docs/monetization/legal-redlines.md` and `finance-operations.md`, and the Terms additions.
5. The **$10 test purchase** (the webhook has never received a real paid event).

## Fix order the CEO is following
Batch A (Tier 1 items 1 to 6) now; Batch B (privacy text and deletion, items 7 to 8, then 9 once the address arrives); Batch C (payments hardening and tests, 10 to 11); Batch D (backups, alerting, performance, items 12 to 14); Batch E (SEO and measurement, 15 to 17); then Phase 3 (featured homes for podium finishers) once Batches A to C are in.
