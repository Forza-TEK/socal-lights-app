# SoCal Lights: project checklist and expert recommendations

_Last updated 2026-11-06 (lighter event list). `[x]` done and verified, `[ ]` open. Detail lives in `docs/monetization/` (strategy, reports, outreach) and `docs/audit/2026-11-04/` (seven audits and the ranked gap list)._

## Owner steps after the 2026-11-07 audit fixes
- [ ] Check Admin > Reports once a day: "Remove my home" requests promise an answer within two business days; also set `ADMIN_NOTIFY_EMAIL` if the team address is not rey@forza-tek.com
- [ ] Open a test "Remove my home" request from a private browser on a sweep home and approve it in Admin (use a copy of a real listing id only if you really want it deleted)
- [ ] Attorney: wording of the organizer consent sentence (`CONSENT_TEXT` in `functions/_lib/homes.js`) and the privacy policy paragraph about team-listed homes
- [ ] Optional: `THROTTLE_SALT` Pages secret (any random string) to salt the abuse-limit hashes

## 1. Done and verified live
- [x] One server Pacific "today" helper (`functions/_lib/time.js`) and tests for sign-in, Admin Access JWT, submit paths, contests, migration validator, smoke import of every function (audit 2026-11-07 items 19 and 20; `docs/testing.md`). Open: tests for `app.js`, the many untested `api/me`, `api/admin` routes, fix the R2 orphan photos bug in `submit.js`
- [x] Cloudflare free-plan usage panel (Admin > Cloudflare usage), digest section, 30-minute GitHub issue check and runtime `limit` logging (2026-11-06; `runbooks/cloudflare-limits.md`)
- [x] Monetization strategy v2 from real data (Stripe, Cloudflare, database): prove first, earn small, build later (`monetization/strategy.md`)
- [x] Event organizer Featured funnel (2026-11-06): one flow Choose -> sign in -> which event -> confirm (dates, total) -> Stripe -> success view + `feature_paid` email; funnel counters `fn:event-feature-*`; audit in `docs/event-funnel-audit.md`
- [x] Featured payments hardened: retry-safe webhook, refunds and disputes, one price source, receipts, native-app guard (PR 291)
- [x] Prices $10 pin / $15 top of the list / $25 Full run (was $20 whole season until 2026-11-06; see "Featured event pricing" below); public Pricing page linked from the Add hub, footers and the Featured page (PR 303)
- [x] Featured expiry uses the Pacific date: a 30-day placement lasts 30 days (PR 304)
- [x] Signed-in Featured page, owner-only checkout, event claim flow with Admin "Event claims" tab (PR 305)
- [x] Featured homes for contest podium finishers: `posts.featured`, `feature_orders.target`, podium from the frozen snapshot, checkout, webhook, Admin > Orders, gold pin and badge (migration 0166)
- [x] Contest history kept: indexable `/past` pages, organizer deletion no longer wipes results, deleted entrants scrubbed (PR 306)
- [x] Security fixes: stored script injection on installer pages, sign-in open redirect (PR 307)
- [x] Home page `/` list served from the edge copy (fresh 5 min, kept 1 h) with one narrow query instead of two scans (operations H5)
- [x] Sign-in code attempts atomic (5 per code even in parallel) plus 30 verifies per address per hour (security S-07)
- [x] Page counter: `/e/*` is one key `event`, `/past/*` is `past`; the 80 page-name cap ignores fn:/click:/ref: rows (seo H4)
- [x] Free-plan per-request limits (2026-11-06): verified Cloudflare/Resend limits in `docs/runbooks/cloudflare-limits.md`; mail outbox + Resend batch for contest results, reminders, invitations and weekly alerts; organizer entries in chunks of 10; `/api/posts` 100-parameter fix and resilient map boot; R2 batch deletes; D1 test stand-in enforces the limits
- [x] Audit 2026-11-07 small fixes: `/api/events` cache key whitelist, `?all=1` admin only, one rebuild per stale window (security N-01, engineering M1)
- [x] Audit 2026-11-07 PL-01, N-02, S-04, N-03, S-10, S-08 (migration 0181): organizer consent stored, "Remove my home" form and Admin queue, privacy policy paragraph; unverified organizers with official-sounding contest names held for review (25-home cap until approved); installer takeover closed; quote and alert-confirmation email caps; admin same-origin check
- [x] Whole-app audit by seven specialists; ranked gap list (PR 308)
- [x] Batch A fixes: fake-contest gate, invite caps and email escaping, locked results, security headers, real 404s, safer city-page SEO (PR 309)
- [x] Privacy-light counters (taps, `?ref=` campaign landings) and the privacy sentence that discloses them (PR 296, 300, 301)
- [x] Stripe webhook registered with the six events the code handles; Stripe, Cloudflare and database read access working
- [x] Separate preview environment: database `socal-lights-preview` and bucket `socal-lights-photos-preview`, same 180 migrations, no personal data; Pages preview points at them, production untouched
- [x] Admin protection verified (Access policy "Site owner only" on both hosts, admin pages and `/api/admin`)
- [x] Mailing address stored as a Pages secret (not in the public repo)
- [x] Android key workflow deleted (it published the key in a public repo); safe signing steps in `docs/android-signing.md`
- [x] Free uptime check on GitHub (every 15 minutes, emails on failure; tests the app through pages.dev because the zone answers cloud addresses with 403)

- [x] Help Center refresh: six articles updated, four added, "home" wording; applied by migration 0167 to articles not edited in Admin (`docs/help-updates.md` has paste text for any you edited)

### Featured event pricing (2026-11-06): owner to do
- [ ] After the PRs merge: open Admin > Help Center and check `is-it-free` and `feature-an-event-or-home`. Migration 0168 updates them only if nobody edited them in Admin; if you did, paste the new text from `docs/help-updates.md`.
- [x] **Terms now cover paid placements (2026-11-06, plain-English draft, NOT reviewed by an attorney):** `/terms#paid` (Featured events and homes, installer Sponsor placements, refunds, disputes, no guarantee). Tests: `tests/terms.test.mjs`.
- [ ] Send the attorney `docs/monetization/legal-redlines.md` (sections "Featured pricing wording changed 2026-11-06", "Installer Sponsor placements" and "What is now in the live Terms (2026-11-06) and what still needs the attorney" with its list of exactly what to review): the Pricing, Feature, add-event and sponsor text changed and the new Terms section is an unreviewed draft. Still missing from Terms: installer independence, paying contest sponsors, affiliate links, organizer agreement.
- [ ] Owner decision: the Finance refund window (7 days from payment and under 3 days live, `monetization/finance-operations.md` section 3). The Terms and the Feature FAQ do not include it yet.
- [ ] Decide whether to keep selling Full run at $25. Fees: $25 nets about $23.97 after Stripe (2.9% + 30 cents).
- [ ] Old $20 "Whole season" orders already paid keep running to the event's last day (grandfathered); nothing to do for them. If a buyer opened the old $20 checkout page before the deploy and pays after it, the order is still honored the same way.
- [ ] **Prove the new event funnel with the $10 test** (steps in the PR description): Pricing > Choose on the $10 Featured pin > sign in > pick an event that starts within 30 days > Pay $10 on Stripe > check the success view, the SoCal Lights email, the gold pin, Admin > Orders and the "How people use the site" counters, then refund it in Stripe.
- [ ] No real payment was made in testing. When you next do a live $10 test, pick an event that starts within 30 days (earlier ones are refused by design).

## 2. Needs you (owner)
- [ ] **Connect the usage panel** (5 minutes, `runbooks/cloudflare-limits.md` > One-time setup): create an API token with Account / Account Analytics / Read, then add Pages secrets `CF_ANALYTICS_TOKEN` and `CF_ACCOUNT_ID` (Production) and redeploy. Also check Cloudflare Billing: is the account on Workers Paid or Free? D1 reads hit 3.66M of the free 5M on Nov 6.
- [ ] Help Center: open Admin > Help Center after the deploy. If any of the ten articles in `docs/help-updates.md` still show old text, you had edited it in Admin: paste the text from that page. When the new videos are recorded and in `tutorials.json`, set each article's Video field in Admin.
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
- [ ] **Automatic renewal for installers (2026-11-07): enable and test.** In Stripe add the webhook event `payment_intent.succeeded` (`docs/stripe-setup.md`, section Automatic renewal). The GitHub workflow `Sponsor automatic renewals` needs no new secret (it uses `ALERT_CRON_KEY`): run it once by hand from the Actions tab and check it answers `"ok":true`. Then test with your own card: on `/sponsor` tick the box, pay the real price, check the acknowledgment email, the dashboard shows Automatic renewal: On with the next charge date, and Admin > Orders lists it under Automatic renewals; cancel with the link in the email and check the dashboard says Off. Send the ARL section of `docs/monetization/legal-redlines.md` to the attorney.
- [ ] **Installer Sponsor placements (2026-11-06): prove it end to end.** Set the Stripe webhook if not done (`docs/stripe-setup.md`). Sign in as the owner of an installer profile that has a phone or website, open `/pricing#banner`, tap **Choose** on the Banner, pay the real price with your own card (the page shows the end date: Jan 6 for the Christmas lights season, Jan 7 to Jan 31 for the next one), check the banner on the map (the company shows when its area is in view), Admin > Orders shows the order, then refund it in the Stripe Dashboard and confirm the banner switches off. Repeat once for Banner and top of the list. Details in `docs/installer-banner.md`. Also: the attorney items in `docs/monetization/legal-redlines.md` (Installer Sponsor placements) and Terms wording.
- [ ] Tutorial videos (2026-11-06): `approve`, `profile`, `voting` re-recorded and new videos "Add your city's homes yourself", "Unpublish and publish again", "Claim your home", "Feature your event or home" are live, all with phone versions. You can tell Covina. Please review them on `/tutorials` (voice, wording, the on-screen prices in the Feature video). Not re-recorded: map, pro-filter, installer-profile, announce, showcase (see `docs/tutorial-updates.md`). The map banner added by PR 359 is not in the older recordings.
- [ ] Check in with Covina's Director in a week; offer a judge-setup session. The CEO session is building **organizer-added homes** (paste a list of addresses) because the city will enter its registered homes itself.
- [ ] Tell the Grok agents when organizer entry is live, so the playbook line can be switched on.

**This week**
- [ ] **Protect `main` in GitHub so nothing merges without passing tests:** repository Settings, Branches (or Rules, then Rulesets), add a rule for `main`, tick "Require status checks to pass", search for and add **Tests**, save. The workflow cannot set this itself.
- [ ] Stripe dashboard: look at Radar fraud rules and confirm the "Successful payments" receipt toggle (audit items; the API cannot read them)
- [ ] Send the three Outlook drafts (Mom's LA, Mission Viejo MVAC, Pasadena Now) and paste Draft A2 into Enjoy Orange County's form
- [ ] Book the **CPA hour** (brief: `monetization/finance-operations.md`) and the **attorney** review (`monetization/legal-redlines.md`)
- [ ] Apply to the **Fever** affiliate program (Impact); read Eventbrite's live terms first (`monetization/affiliate-plan.md`)
- [ ] Search Console (after Batch E): Sitemaps, resubmit `https://socallights.app/sitemap.xml` (it now lists `/in`, only city pages with 3+ events or one confirmed, and confirmed event pages `/e/...`); then URL inspection, request indexing for `/in` and the ten top city pages; send fresh Indexing and Performance screenshots in 2 to 3 days
- [ ] **Fix the Grok outreach email template (found 2026-11-04 in the Sent mail):** the installer emails (11 sent since Oct 30, 1 bounce, 0 replies, 0 homes added) have no postal address and no opt-out line (CAN-SPAM), and link to the home page. Add a footer with the business mailing address and "Don't want these? Reply no thanks and I won't write again"; link to `https://socallights.app/add-house?ref=inst` so landings are counted; keep a do-not-contact list. Rules: `monetization/grok-outreach-guide.md`.
- [ ] Info mailbox: `info@socallights.app` forwards to `rey@forza-tek.com` (confirmed); DMARC reports will arrive there daily; add a mail rule to file them
**Before the first Google Play upload**
- [ ] Make a new Android upload key locally and replace the four GitHub secrets (`docs/android-signing.md`); use Play App Signing
**Cloudflare, optional**
- [ ] **Backups:** Cloudflare > My Profile > API Tokens > the GitHub token > Edit > add Account > Workers R2 Storage > Edit > Update; then GitHub > Actions > Nightly backup > Run workflow, and confirm the file in R2 `socal-lights-backups` (`docs/runbooks/backup-restore.md`)
- [ ] Add notification policies (failed Pages deployment, D1 alerts) and confirm D1 Time Travel retention
- [ ] Turn on a second uptime view (an external free monitor) if you want alerts besides GitHub email

## 3. Team backlog (CEO runs; order from the audit)
- [x] **Batch B, privacy (PR 315):** privacy statements made true, account deletion complete, IPs pruned after 48 hours, postal address and unsubscribe in marketing emails (verified on a real email). Still for the attorney: Terms additions, installer licensing text, DMCA, prize wording.
- [x] **Batch C, payments (PR 318):** 70 automated tests run by a new `Tests` workflow on every pull request; Admin > Orders tab (refund due, disputed, held, unapplied, placement differs); correct refunds on stacked orders; refunds that arrive early; amount check; digest alerts; checkout caps; stricter claim matching; Amazon Shop hidden in the app; Season plan needs 7 days. Not exercised against real Stripe.
- [ ] **Batch D, operations (in progress):** (4) offline page and saved pages on every page (service worker `scl-4`); (3) `/api/events` drops events ended over 3 days ago (`?ended=1` for all) and has an ETag; (2) alerting: failed emails not marked sent, `ops_log`, digest "Problems" section, GitHub issues from uptime, migrations, digest and backup workflows; (1) nightly backup workflow `backup.yml` + `docs/runbooks/backup-restore.md` (needs the owner to add R2 Edit to the API token, see the runbook Setup);
- [x] **Event list lighter (2026-11-06, details in `status.md`):** `/api/events` no longer carries each event's blurb and link (210 KB to 137 KB gzip, 864 KB to 619 KB raw); they load from `/api/events/<id>` when an event opens, saved for offline in service worker cache `scld-5`. Owner check after deploy: open an event from the list and from a shared link, tap Add to calendar, go offline after opening an event (see the status entry).
- [ ] Batch D original scope: nightly database backup to a private bucket (never a public-repo artifact), restore runbook; error alerting; `/api/events` slimmed (drop ended events, ETag); offline page
- [x] **Batch E, SEO and measurement (2026-11-06; details in `status.md`):** city pages with nearby links, `/in` hub, hidden crawlable city and event list on the home page, thin pages noindex and out of the sitemap (PR 340); funnel counters `fn:*` with an admin list and digest section, honest "Page views*" label (PR 341); per-event pages `/e/<id>` with share previews, Share button now shares them (PR 342); accessibility quick fixes (PR 343). Still open: colour contrast, county hub pages, house share pages, Cloudflare vs counter comparison after a week of `fn:visit`.
- [x] **Phase 3 built (2026-11-06):** Featured homes for podium finishers (winner, 2nd, 3rd of announced contests; podium computed from the frozen results; design in `monetization/feature-account-spec.md`). Owner: run one real $10 home test after a contest is announced, and have the attorney read the Featured home wording (Terms, Pricing, Featured page) with the other redlines.
- [x] **Design pass (2026-11-06, PRs 345 to 347):** contrast fixes verified with axe, skip link, header landmarks, aria-invalid on step errors, 44 px footer links, asset version test, breadcrumbs, map data preload, clear-search empty state, Featured pricing wording (`status.md`)
- [ ] Owner: confirm the Cloudflare plan (Workers & Pages > Plans) and the Resend plan (free = 100 emails a day, shared with sign-in codes); after the first big contest announcement check Admin > ops log for `email` lines. Renewal job: process 5 renewals per call (see runbook)
- [ ] Still open from the audit: a screen reader and real-phone check of the design pass; one word for house/home/display (owner decision); `<main>` on `contest-enter.html`; tutorials folder to R2 or Stream; `/c/<unknown>` 404; Content-Security-Policy (needs a long test)
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
**Finance.** Keep Featured at $10 / $15 / $25 (Full run, events of 31+ days; the old $20 whole season is retired); hand-sell Contest Pro at about $99 only to an existing organizer; installer pricing stays a founder-sold pilot (about $299 a season) after five installer conversations. Fixed costs are $0 this season. One CPA hour before the first dollar: entity and a dedicated bank account, whether listing placement is taxable, seller's permit, affiliate income reporting. Refund policy as drafted in `finance-operations.md` (owner decision on the 7-day and 3-day rules).
**Digital monetization.** One shared price source and one checkout path (done). Next: orders view, refund handling for declined paid submissions, and tests. Sell Featured to organizers of ticketed events (73 upcoming links to Eventbrite or Fever); apply to Fever first; expect $0 to $5 a month from affiliates.
**Product and marketing.** Growth before monetization: city pages, local press, parks departments, neighborhood groups, the weekly email. The event database is the moat. First sends: Mission Viejo MVAC, Mom's LA, Enjoy Orange County. The Grok campaign is about supply (homes and contests); say "free for now", never "free forever", quote no traffic.
**Legal (not a lawyer; attorney review pending).** Free entry and free voting appear to fall outside California's contest provisions; paid votes would not. Label paid placements clearly (the FTC does not list "Featured" as clearly understood: consider "Sponsored"). Prize wording must state the approximate value. Installer listings need an opinion on licensing language. Fix the privacy statements before the attorney sees them.
**Security.** Fixed: script injection and open redirect. Next: installer-profile takeover paths, same-origin check on admin actions, atomic email-code attempts, Content-Security-Policy, unpkg integrity for the map library. No secrets in the repo; keep keys out of workflow artifacts in this public repository.
**Data and operations.** Back up the database nightly to a private bucket; the live database cannot be rebuilt from migrations. Reduce `/api/events` (38% of rows have ended; 300 KB compressed). Replace dead links from one source (`socalhauntlist.com`, 93 events). Make routine runs leave a trace even when they find nothing. Confirm the 19 unconfirmed events starting within 14 days.
**UX and accessibility.** Real 404s (done); card headings and landmarks; contrast on the Live tab; explain why "Route these" is disabled; one word for houses, homes and displays.
**SEO and measurement.** Structured data only for confirmed events (done); richer, interlinked city pages; per-event share pages; counters for each funnel step (event opened, add completed, sign-in, subscribe); a reliable human-visitor estimate.
**Contests and engineering.** Results are now locked after announcement; vote core is sound. Add alerts on failed email sends and webhook errors; tests for payment, claims, voting and deletion; branch protection on `main`.
