# SoCal Lights: project checklist and expert recommendations

_Last updated 2026-11-04 (CEO session). `[x]` done and verified, `[ ]` open. Detail lives in `docs/monetization/` (strategy, reports, outreach) and `docs/audit/2026-11-04/` (seven audits and the ranked gap list)._

## 1. Done and verified live
- [x] Monetization strategy v2 from real data (Stripe, Cloudflare, database): prove first, earn small, build later (`monetization/strategy.md`)
- [x] Featured payments hardened: retry-safe webhook, refunds and disputes, one price source, receipts, native-app guard (PR 291)
- [x] Prices $10 pin / $15 top of the list / $20 whole season; public Pricing page linked from the Add hub, footers and the Featured page (PR 303)
- [x] Featured expiry uses the Pacific date: a 30-day placement lasts 30 days (PR 304)
- [x] Signed-in Featured page, owner-only checkout, event claim flow with Admin "Event claims" tab (PR 305)
- [x] Contest history kept: indexable `/past` pages, organizer deletion no longer wipes results, deleted entrants scrubbed (PR 306)
- [x] Security fixes: stored script injection on installer pages, sign-in open redirect (PR 307)
- [x] Whole-app audit by seven specialists; ranked gap list (PR 308)
- [x] Batch A fixes: fake-contest gate, invite caps and email escaping, locked results, security headers, real 404s, safer city-page SEO (PR 309)
- [x] Privacy-light counters (taps, `?ref=` campaign landings) and the privacy sentence that discloses them (PR 296, 300, 301)
- [x] Stripe webhook registered with the six events the code handles; Stripe, Cloudflare and database read access working
- [x] Separate preview environment: database `socal-lights-preview` and bucket `socal-lights-photos-preview`, same 180 migrations, no personal data; Pages preview points at them, production untouched
- [x] Admin protection verified (Access policy "Site owner only" on both hosts, admin pages and `/api/admin`)
- [x] Mailing address stored as a Pages secret (not in the public repo)
- [x] Android key workflow deleted (it published the key in a public repo); safe signing steps in `docs/android-signing.md`
- [x] Free uptime check on GitHub (every 15 minutes, emails on failure; tests the app through pages.dev because the zone answers cloud addresses with 403)

## 2. Needs you (owner)
**Urgent: outreach and your mailbox (`monetization/email-outreach-analysis.md`)**
- [ ] **Slow the Grok sending now.** Microsoft warned the mailbox on Oct 31 ("Suspicious email sending patterns detected ... will be restricted if this activity continues") about 45 minutes after a burst of 42 emails in about 160 seconds. A restriction would also stop your real business mail from forza-tek.com. Until a separate sending domain exists: at most 15 a day, one every 2 to 6 minutes, never in bursts.
- [ ] **Do not let the agents send until the postal address is filled in.** 121 earlier first-touch emails had no address and no opt-out; only the 5 sent on Nov 4 have an opt-out line. Give the agents `monetization/grok-email-playbook.md`.
- [ ] Set up a **separate sending domain or subdomain and mailbox** for cold outreach, kept apart from forza-tek.com and from the site's `login@` mail (the analysis has a warm-up schedule).
- [x] Eastvale Zoom invitation sent (Nov 4). **Two meetings:** Covina **Thu Nov 5, 3:30 PM**, Eastvale **Mon Nov 9, 2:00 PM**. Kits: `monetization/city-contest-meeting-kit.md` (shared), `covina-meeting.md`, `eastvale-meeting.md`. Test the sign-in code with each city's email system first (city mail gateways may quarantine it).
- [ ] Add the do-not-contact list (Mission Viejo and the other organizations written to the CEO's list) to the agents so no organization gets two emails.
**Today**
- [ ] **$10 test purchase**, then refund it: Add an event, Feature, sign in, pay the $10 pin. Tell the CEO session; it verifies the charge, the placement, the webhook delivery and the refund. This is the only real test of the payment path.
- [ ] **Redeploy once** (Workers and Pages, socal-lights, Deployments, latest, Retry deployment) so the mailing-address secret loads; it also loads on the next merge.
- [ ] **Remove the five temporary write permissions** from the `Claude read-only` token (D1 Edit, Pages Edit, R2 Edit, DNS Edit, Zone Settings Edit) unless you want the CEO session to do more Cloudflare changes.
- [x] DMARC record added and verified live (`p=none`, monitor only; DKIM and SPF line up). After 2 to 4 weeks of clean reports, move to `quarantine`.
- [x] Minimum TLS version set to 1.2 (confirmed through the API; the site answers over TLS 1.2 and 1.3). Do not buy Advanced Certificate Manager: Universal SSL (free) is all that is needed.
- [ ] Stripe, Settings, Business, Customer emails: **Successful payments** on (cannot be read by API).
**Covina follow-ups (demo held Nov 5; they loved the routes)**
- [ ] Delete the live demo contest "Holiday Home Lighting Contest 2026" (organization "Mission Viejo", created during the call) in Admin, Contests, so it does not appear on the public map under a city's name.
- [ ] Refresh and upload the tutorial videos you promised, then tell Covina.
- [ ] Check in with Covina's Director in a week; offer a judge-setup session. The CEO session is building **organizer-added homes** (paste a list of addresses) because the city will enter its registered homes itself.
- [ ] Tell the Grok agents when organizer entry is live, so the playbook line can be switched on.

**This week**
- [ ] **Protect `main` in GitHub so nothing merges without passing tests:** repository Settings, Branches (or Rules, then Rulesets), add a rule for `main`, tick "Require status checks to pass", search for and add **Tests**, save. The workflow cannot set this itself.
- [ ] Stripe dashboard: look at Radar fraud rules and confirm the "Successful payments" receipt toggle (audit items; the API cannot read them)
- [ ] Send the three Outlook drafts (Mom's LA, Mission Viejo MVAC, Pasadena Now) and paste Draft A2 into Enjoy Orange County's form
- [ ] Book the **CPA hour** (brief: `monetization/finance-operations.md`) and the **attorney** review (`monetization/legal-redlines.md`)
- [ ] Apply to the **Fever** affiliate program (Impact); read Eventbrite's live terms first (`monetization/affiliate-plan.md`)
- [ ] Search Console: request indexing for the ten top city pages; send fresh Indexing and Performance screenshots in 2 to 3 days
- [ ] **Fix the Grok outreach email template (found 2026-11-04 in the Sent mail):** the installer emails (11 sent since Oct 30, 1 bounce, 0 replies, 0 homes added) have no postal address and no opt-out line (CAN-SPAM), and link to the home page. Add a footer with the business mailing address and "Don't want these? Reply no thanks and I won't write again"; link to `https://socallights.app/add-house?ref=inst` so landings are counted; keep a do-not-contact list. Rules: `monetization/grok-outreach-guide.md`.
- [ ] Info mailbox: `info@socallights.app` forwards to `rey@forza-tek.com` (confirmed); DMARC reports will arrive there daily; add a mail rule to file them
**Before the first Google Play upload**
- [ ] Make a new Android upload key locally and replace the four GitHub secrets (`docs/android-signing.md`); use Play App Signing
**Cloudflare, optional**
- [ ] Add notification policies (failed Pages deployment, D1 alerts) and confirm D1 Time Travel retention
- [ ] Turn on a second uptime view (an external free monitor) if you want alerts besides GitHub email

## 3. Team backlog (CEO runs; order from the audit)
- [x] **Batch B, privacy (PR 315):** privacy statements made true, account deletion complete, IPs pruned after 48 hours, postal address and unsubscribe in marketing emails (verified on a real email). Still for the attorney: Terms additions, installer licensing text, DMCA, prize wording.
- [x] **Batch C, payments (PR 318):** 70 automated tests run by a new `Tests` workflow on every pull request; Admin > Orders tab (refund due, disputed, held, unapplied, placement differs); correct refunds on stacked orders; refunds that arrive early; amount check; digest alerts; checkout caps; stricter claim matching; Amazon Shop hidden in the app; Season plan needs 7 days. Not exercised against real Stripe.
- [ ] **Batch D, operations:** nightly database backup to a private bucket (never a public-repo artifact), restore runbook; error alerting; `/api/events` slimmed (drop ended events, ETag); offline page
- [ ] **Batch E, SEO and measurement:** richer city pages and internal links, per-event share pages, funnel counters, bot-resistant visitor estimate
- [ ] **Phase 3:** Featured homes for podium finishers (winner, 2nd, 3rd of announced contests; podium computed from the frozen results; design in `monetization/feature-account-spec.md`)
- [ ] Accessibility basics; `/c/<unknown>` 404; Content-Security-Policy (needs a long test)
- [ ] Backfill the privacy scrub for entrants who deleted accounts before it shipped (none yet)

## 4. Decision gates (from the strategy; counts from our own tables)
| Unlock | When |
|---|---|
| Audience claims in any message | 30 days of `site_hits` averaging 50 humans a day |
| Contest Pro | 3 contests with 20+ entries and 100+ votes each |
| Installer paid tier | 3+ installers, 25+ homes, 20 installer clicks a week, a first real lead |
| "Presented by" sponsors | 1,000 real visits a day for 14 days |
| Stop-loss (owner decision) | At most $100 spent before the first sale; stop paid-feature work if no paid order by 2027-01-31 after 10 organizer conversations |
Baseline 2026-11-04: 6 homes, 1 installer profile, 1 live contest, 5 accounts, 0 votes, $0 revenue.

## 5. Key dates
Nov 26 Thanksgiving; Dec 11 Mission Viejo winners release (send MVAC first); Dec 25; Jan 31 stop-loss check; about Apr 19 2027 Amazon Associates first-sales deadline (confirm the exact date in the dashboard).

## 6. Recommendations from the experts
**CEO.** This season is proof, not revenue (Finance estimates $0 to $300). Sell by hand to a handful of real organizers; get the payment path proven with one real purchase; do not build installer or contest products until the gates above are met. Keep the free map free: no paid votes, no entry fees, payment never touches contest results.
**Finance.** Keep Featured at $10 / $15 / $20; hand-sell Contest Pro at about $99 only to an existing organizer; installer pricing stays a founder-sold pilot (about $299 a season) after five installer conversations. Fixed costs are $0 this season. One CPA hour before the first dollar: entity and a dedicated bank account, whether listing placement is taxable, seller's permit, affiliate income reporting. Refund policy as drafted in `finance-operations.md` (owner decision on the 7-day and 3-day rules).
**Digital monetization.** One shared price source and one checkout path (done). Next: orders view, refund handling for declined paid submissions, and tests. Sell Featured to organizers of ticketed events (73 upcoming links to Eventbrite or Fever); apply to Fever first; expect $0 to $5 a month from affiliates.
**Product and marketing.** Growth before monetization: city pages, local press, parks departments, neighborhood groups, the weekly email. The event database is the moat. First sends: Mission Viejo MVAC, Mom's LA, Enjoy Orange County. The Grok campaign is about supply (homes and contests); say "free for now", never "free forever", quote no traffic.
**Legal (not a lawyer; attorney review pending).** Free entry and free voting appear to fall outside California's contest provisions; paid votes would not. Label paid placements clearly (the FTC does not list "Featured" as clearly understood: consider "Sponsored"). Prize wording must state the approximate value. Installer listings need an opinion on licensing language. Fix the privacy statements before the attorney sees them.
**Security.** Fixed: script injection and open redirect. Next: installer-profile takeover paths, same-origin check on admin actions, atomic email-code attempts, Content-Security-Policy, unpkg integrity for the map library. No secrets in the repo; keep keys out of workflow artifacts in this public repository.
**Data and operations.** Back up the database nightly to a private bucket; the live database cannot be rebuilt from migrations. Reduce `/api/events` (38% of rows have ended; 300 KB compressed). Replace dead links from one source (`socalhauntlist.com`, 93 events). Make routine runs leave a trace even when they find nothing. Confirm the 19 unconfirmed events starting within 14 days.
**UX and accessibility.** Real 404s (done); card headings and landmarks; contrast on the Live tab; explain why "Route these" is disabled; one word for houses, homes and displays.
**SEO and measurement.** Structured data only for confirmed events (done); richer, interlinked city pages; per-event share pages; counters for each funnel step (event opened, add completed, sign-in, subscribe); a reliable human-visitor estimate.
**Contests and engineering.** Results are now locked after announcement; vote core is sound. Add alerts on failed email sends and webhook errors; tests for payment, claims, voting and deletion; branch protection on `main`.
