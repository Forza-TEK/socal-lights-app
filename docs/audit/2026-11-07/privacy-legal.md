# Privacy and legal-compliance audit (2026-11-07)

**I am an AI auditor, not a lawyer. Nothing here is legal advice or a legal conclusion.** Everything is a question or a risk flag for the owner's attorney. Statute references come from my general knowledge and from `docs/monetization/legal-research.md` ("brief"); I did not re-fetch statute text, so every citation is UNVERIFIED until the attorney confirms it is current.

Read-only audit of `origin/main` at `668b381` (PR 379). No application code or legal text was changed. Method: read the code and the live pages; `npm test` (177 of 177 pass); rendered all 38 email templates locally with a stub database; GET-only live reads (`/privacy`, `/terms`, `/pricing`, `/feature`, `/sponsor`, `/help/*`, `/api/config`, `/api/events`, `/sitemap.xml`, response headers). No writes, no emails, no payments. I could not see Cloudflare secrets, the Stripe dashboard, Resend settings or the live database contents, so those items are marked UNVERIFIED.

Baseline: this builds on `docs/audit/2026-11-04/privacy-compliance.md`. Most of its High items were fixed in PR 315 (privacy copy, account deletion, IP pruning, postal address and unsubscribe headers), and I confirmed that below. This report covers what is new, what is still open, and what the new features (organizer-added homes, claims, Sponsor orders, Featured homes, funnel counters) added.

## Top 5 (read these first)

1. **PL-01 (High): private homes are published with full street address on someone else's say-so.** 158 of the 1,254 live events are "Private home (view from the street)" entries that the team added from public pages (some named after a family), and organizers can now add up to 500 home addresses per contest (100 per call) after ticking one box that is never recorded. There is no per-listing "remove my home" control, no notice to the resident, and the Privacy Policy does not say the team itself lists homes from public sources.
2. **PL-02 (High, time-critical): the installer auto-renewal feature collides with copy that says "no subscription, no automatic renewal" in at least 12 places** (Terms, Pricing, Sponsor page, Installer dashboard, a receipt email, Help articles, video captions, and a test that pins the wording). None of the California Automatic Renewal Law (ARL) mechanics exist yet (consent capture, acknowledgment email, cancel path, renewal reminders, price-change notice, deletion handling). Checklist in section 3.
3. **PL-03 (High until verified): the postal address in marketing emails fails open.** It comes from an optional `MAIL_POSTAL_ADDRESS` secret; if the secret is empty the email goes out with no address and no warning (I rendered all templates with it empty to confirm). The Privacy Policy says "Those emails also carry our postal address". The repo's own checklist still lists the address as an open owner task.
4. **PL-04 (Medium): account deletion still leaves personal data the Privacy Policy says is removed.** `admin_log` keeps the deleted person's email as a label forever; `contest_changes.new` keeps co-organizer emails ("Added x@y.com") even though the policy promises edit histories are cleaned.
5. **PL-05 (Medium): a Help article tells people the opposite of the Terms about who receives a quote request** ("go only to that company" versus installer plus organizer plus a stored copy), and the contest rules template, Terms and Pricing still carry the legal gaps the attorney redlines flagged on 2026-11-04 (prize "no cash value", two meanings of "Sponsor", no content license or DMCA process, no contractor-license line next to paid installer ads).

## Counts

| Severity | Count | IDs |
|---|---|---|
| High | 3 | PL-01, PL-02, PL-03 |
| Medium | 9 | PL-04 to PL-12 |
| Low | 8 | PL-13 to PL-20 |

Urgent: PL-02 (feature is being built tonight; the copy and the consent flow must ship together or not at all) and PL-03 (confirm the secret is set before any further marketing email goes out, including the weekly email and invitations).

## Findings

Effort: S under a day, M a few days, L a week or more. Atty: whether the attorney should decide.

### High

**PL-01. Homes of private residents are published with address and (sometimes) family name without a consent record or a removal path.**
- **Status: FIXED 2026-11-07** (organizer confirmation stored in `home_consents`, public "Remove my home" form and Admin queue, privacy policy paragraph; see `docs/status.md`). Still open: consent evidence for homes the team lists from public pages, and a suppression list so a later city sweep does not re-add a removed home.
- Evidence:
  - Live `/api/events` (GET, 1,254 events): 158 have venue text containing "view from the street"; sample ids `lo-kooiman-light-show-brea` ("Kooiman Family Christmas Light Show", 515 Cedar Ave, Brea), `contest-1-songbird-lane-aliso`, `cg3-arc100-white-oak-drive`. Sourcing rule is in `docs/city-sweep.md:41` ("never publish a private home's address unless a public page published it"); nothing in the product records which page it came from beyond the event `url`.
  - The "Is this your home? Claim it" link (`public/app.js:932`) lets a resident replace the listing, but `docs/status.md:116` says a "remove this listing" request "was left out on purpose". Removal is only by emailing info@socallights.app or the generic Report link (`public/app.js:143`).
  - Organizer-added homes: `functions/api/contests/[slug]/entries/index.js:30` requires `confirm: true` ("the residents agreed to have their address shown"), but the value is not stored; the INSERT at line 76 keeps only `added_by` and `approved_at`. No date, wording, count or evidence is kept. Caps: 100 per call, 500 per contest, 10 calls per hour per account (`functions/_lib/homes.js:7-9`). Entries go `approved` immediately and appear on the public map and routes. `public/privacy.html:51` and `public/organizer.html:134` rely on the organizer's tick.
  - A contest goes live instantly for any signed-in account (`functions/api/contests/index.js:50`, `live = true`; the 2026-11-04 contests audit C1 about fake "City of X" contests is still open on `main`). Anyone with a free email can therefore publish up to 500 arbitrary addresses, with names, on the public map.
  - Organizer-added homes can then be bought as Featured placements by the organizer, not the resident (`functions/_lib/podium.js:62`; `public/terms.html:55`). A third party can pay to promote a resident's address.
  - Deleting the organizer's account keeps these homes and clears `added_by` (`functions/_lib/account.js:58`), so the only record of who vouched for them is erased.
  - `public/privacy.html` "Information you choose to submit" and "Homes added by an organizer" describe self-submitted and organizer-added homes. They do not mention homes the SoCal Lights team lists from public pages.
- Impact: unsolicited publication of a residence plus family name is the highest-harm item in the app (harassment, stalking, unwanted visitors). Possible exposure under California privacy, anti-doxxing and misappropriation theories is for the attorney; I make no conclusion. Reputational risk is real if one resident complains to a city.
- Fix: (a) a one-tap "Remove this home" request on every home card, answered within a stated time; (b) store the organizer attestation (user id, timestamp, wording version, number of homes) in a new table and keep it after the account is deleted; (c) require a city-verified or admin-approved organizer before the add-homes tool is available, and lower the cap until then; (d) add one sentence to the Privacy Policy that the team lists homes from public contest and tour pages and how to have one removed; (e) show the organizer a resident-facing line to share ("your address will be public on socallights.app"); (f) record the source URL for sweep homes.
- Effort: M. Atty: Y (what attestation is enough; takedown wording; whether homes of winners may be marketed as Featured by a third party).

**PL-02. Auto-renewal: current copy forbids it, and none of the ARL mechanics exist.** Details in section 3. Evidence of contradiction (all must change for installers only; Featured events and homes remain one-time):
- `public/terms.html:53` ("There is no subscription and nothing renews by itself", under Featured events and homes) and `:64` ("no subscription and no automatic renewal", under Installer Sponsor).
- `public/pricing.html:36` and `:45` ("pay once ... there is no subscription. You can renew or upgrade any time from your dashboard").
- `public/sponsor.html:35` ("Pay once for the season, no subscription"), `:7` (meta description) and `:149` (order summary "paid once"); `public/installer-manage.html:51` ("Pay once for the season").
- `functions/_lib/mailtpl.js:114` (`sponsor_paid` receipt: "paid once, no subscription"). Admins can also edit saved template wording in the database, so a stale edited copy may override the code default.
- Help articles `sponsor-your-installer-company` and `is-it-free` (migrations `0172_help_installer_sponsor.sql`, `0175_help_sponsor_flat_price.sql`; the `0167`/`0168` articles say "no subscription" for events and homes) and the caption files `public/tutorials/post-feature.vtt:61` and `post-feature-mobile.vtt:61` ("one time").
- `tests/terms.test.mjs:16` asserts the phrase "no subscription" is in the Terms.
- Checkout is `mode: "payment"` with no saved payment method (`functions/api/sponsor/checkout.js:31`, `functions/_lib/stripe.js:18`), so there is nothing for renewal to charge yet.
- Impact: a recurring charge under copy that says there is none is the classic misleading-terms pattern; ARL also treats goods or services provided under a non-compliant renewal as unconditional gifts (per my reading of Bus. & Prof. Code 17603; verify).
- Fix: build the checklist in section 3 together with the copy change, behind one release; do not ship renewal charging before the Terms, Pricing, emails and consent step are updated.
- Effort: M to L. Atty: Y (whether installers count as "consumers" under the ARL, final wording).

**PL-03. Postal address in marketing email is optional and fails silently.**
- Evidence: `functions/_lib/mailtpl.js:297-300` (`MAIL_POSTAL_ADDRESS` secret; "the line is left out when it is not set") and `:322-325` (address added only when non-empty). I rendered all 38 templates with the secret empty: none of the 15 "marketing" templates (unsub kind `link` or `alerts`: weekly alert, reminders, results, judge and organizer invitations, listing changes, co-organizer notices) contains an address. With the secret set, `tests/privacy.test.mjs:167` shows it does appear. `public/privacy.html:43` states "Those emails also carry our postal address". `docs/CHECKLIST.md:41,66` still list "postal address filled in" as an unchecked owner task; line 76 says it was "verified on a real email" after PR 315, so it may be set. I cannot read Cloudflare secrets: UNVERIFIED.
- Impact: a postal address is a CAN-SPAM element for commercial email (per `docs/monetization/grok-outreach-guide.md:44`; statute not re-checked). The weekly email and invitations are the exposure. The separate Grok outreach agent emails are outside the code, and the checklist says earlier ones had no address or opt-out.
- Fix: owner confirms the secret in Cloudflare; code skips (and logs to `ops_log`) any marketing send when the address is empty instead of sending without it; add the same address to the outreach template.
- Effort: S. Atty: N.

### Medium

**PL-04. Deletion and retention gaps the policy claims it covers.**
- `admin_log.label` stores the target's email for the Users area (`functions/_lib/adminlog.js:3-4`, `labelFor`, written at `:34`); `account.js` never touches `admin_log` and nothing prunes it (no DELETE anywhere in `functions`). An admin-deleted account leaves the email in the log indefinitely.
- `contest_changes.old/new` keep other people's emails ("Added x@y.com", "Removed x@y.com": `functions/api/contests/[slug]/staff.js:28,37`). `account.js:59` blanks only `by_email`/`by_name`. `public/privacy.html:56` says edit histories are cleaned. The 2026-11-04 report marked this UNVERIFIED; it is confirmed by reading the code.
- Sweep and event data: `event_submissions.contact_email` for declined or old submissions is never purged unless the person has an account and deletes it (`account.js:57`); a submitter without an account cannot self-delete.
- `alert_subs` rows that were never confirmed are kept forever (no `confirmed = 0` prune anywhere). The row holds an email typed by someone else; `public/privacy.html:97` says "until you unsubscribe".
- `reports` free text (name, message) and `help_votes.note`, `help_searches.q` are never expired (only `help_votes.who` is blanked, `retention.js:11`); the policy discloses only IP handling for these.
- `lights_on` hashes are pruned only when someone taps the button (`functions/api/posts/[id]/on.js:19`), not by the scheduled job, so "3 days" is not guaranteed on a quiet day (hash only; Low in isolation).
- Checked and fine: `ops_log` redacts emails before insert and the digest prunes at 30 days (`functions/_lib/oplog.js:7,21`; but see PL-17 for the console copy); `email_send_log`, `entry_add_log`, `checkout_log` hold only a user id and are pruned at 3 days, 1 day, 3 days on insert (`sendlimit.js:22`, `entries/index.js:44`, `stripe.js:11`); `banner_stats` and funnel counters have no personal data; `event_claims.emailed_status` has none; `feature_orders` is kept by design and `user_id` is cleared (policy discloses the email stays).
- Fix: add a scheduled purge (30 days for unconfirmed `alert_subs`, 12 months for declined submissions and answered reports), null emails in `contest_changes.old/new` and `admin_log.label` on deletion, add one line per item to "How long we keep information".
- Effort: S to M. Atty: retention periods (Y).

**PL-05. Quote-request consent and the Help article disagree.** `migrations/0153_help_articles.sql:163` (live at `/help/presenting-installer-and-quote-requests`): "Their details go only to that company, and only if they tick the box." Code and Terms: the installer, the contest organizer and a stored copy (`public/terms.html:44`, `public/privacy.html:54`, `functions/api/contests/[slug]/quote.js`); the on-page checkbox wording at `public/contest.html:73` was fixed and names the organizer. Fix by a new help migration (never edit 0153). Effort S. Atty: N.

**PL-06. Contest rules template: prize and naming gaps from redlines 1A, 1C, 1D are still open.** `public/rules.js` section 8 still says "Prizes have no cash value", with no field for prize value or number of prizes; section 1 names the organizer "the Sponsor" while the site's paying installers are labelled "Sponsor" (`public/banner.js:76`, `public/terms.html:41,63`); section 3 says 18 or older, but entry has no age check (`public/contest-enter.html`). Organizers accept nothing at contest creation (`public/add-contest.html`; only entrants tick the rules). Effort S to M. Atty: Y (redline 1A, 1C, 1D; sweepstakes versus contest of skill for popular votes; whether a free-email sign-in is "consideration").

**PL-07. Terms gaps listed in the redlines are still absent.** `public/terms.html` has no license to display user photos, no copyright takedown or DMCA agent, no installer-independence clause, no affiliate-commission clause (only the Privacy Policy and the Shop page say it), no organizer acceptance terms, no indemnity, and the $100 liability cap applies to paying customers without refund carve-outs (`terms.html:84`). The "Changes" clause promises only a changed date (`terms.html:90`) while the Privacy Policy promises a notice and an email for material changes (`privacy.html` "Changes"); the two should match. Effort M. Atty: Y.

**PL-08. Paid installer ads show no contractor-license information.** The Sponsor banner and card (`public/banner.js:29,98`) carry name, phone, website only; no license-number field exists in `installers`; redline item 4 (Bus. & Prof. Code 7027.1, per the brief) was left "WAIT". Paid placements are live on `/sponsor`. Effort S (a license field plus a line in the card) once the attorney decides. Atty: Y.

**PL-09. Photo EXIF GPS is still not stripped on the server** (`functions/api/submit.js:21-24` accepts bytes after a magic-byte check; avatar likewise, `functions/api/me/avatar.js`). Browser resizing drops EXIF (`public/addflow.js:50`), but a direct POST keeps it, and photos are public. This is P-10 from the previous audit, unchanged. Effort M.

**PL-10. No accessibility statement and no evidence of an accessibility test.** No page or footer link mentions accessibility (grep of `public` is empty). `docs/status.md:87-93` says "Not checked with a screen reader or axe", and lists unfixed items (contrast of the coral "Live" tab and the "Confirmed" tag, `aria-invalid`). The site now takes payments and runs contests. Fix: a short statement with a contact, run axe on the 8 core pages, fix the known items. Effort S to M. Atty: N (statement wording: Y).

**PL-11. Children and age.** The sign-in dialog says 13 or older (18 for contests) and links Terms and Privacy (`public/auth.js:53`), which is a notice, not a check. Photos "not of identifiable people or children" is a request (`terms.html:34`, `rules.js` section 4), with no screening and no reporting path specific to a child's image. The site is a family product with Halloween themes. Effort S (tick box "I am 13 or older" at first sign-in, a takedown route). Atty: Y (COPPA applicability, California age-appropriate design law, minors in photos).

**PL-12. CCPA/CPRA statement and rights path are missing.** `public/privacy.html` has no section on rights to know, delete or correct, how to ask, response time, or an authorized-agent route; deletion is self-serve and "write to info@" is the only path for everyone else (no account holders: sweep homes, alert subscribers, event submitters). The brief (section 4.1) concluded the business is below the CCPA thresholds; the attorney decides whether a short "we honor deletion requests within N days" statement is worth adding anyway. Effort S. Atty: Y.

### Low

**PL-13. Policy gaps (disclosure).** Missing from `public/privacy.html`: that Help searches and "Was this helpful?" notes are logged (no IP; free text), sessionStorage flags used by `public/hit.js` (`scl-hit:*`, `scl-visit`, `scl-ref`) and other local keys (`socal-welcomed`, `socal-thumbs`, `socal-listhidden`, `scl-emtab`), that installer emails can appear as a public `mailto:` link when no website is set (`functions/api/banner/index.js`), and that photos of event listings are hotlinked from third parties (disclosed as "Event image hosts"). The ARL changes in section 3 also need a Privacy edit. Effort S.

**PL-14. Affiliate and endorsement disclosure.** Amazon disclosure is present and near the links (`public/app.js:759`: "As an Amazon Associate we earn from qualifying purchases"; `rel="sponsored"` on links). Amazon's own program wording ("I earn") and placement rules should be checked against the Operating Agreement (UNVERIFIED). The support box (`app.js:981`) discloses generically. `site-config.js:95` `ticketAffiliates` is empty; if turned on, the disclosure needs to be next to each ticket link, not only in the support box and Shop tab. Terms say nothing about commissions (PL-07). Effort S.

**PL-15. Payment-method wording.** `public/terms.html:53` says "by card"; `public/feature.html:169` says "a card or Cash App Pay"; checkout sets no `payment_method_types` (`functions/api/feature/checkout.js:59`), so Stripe dashboard settings decide. The tip jar sends people to a personal-looking Cash App tag (`public/site-config.js:4`) under the heading "Keep SoCal Lights free" with no note that tips are not tax-deductible or that SoCal Lights is a business. Effort S. Atty/CPA: Y.

**PL-16. "Free for now" versus "meant to stay free".** `public/pricing.html:55` ("It is free today. We may add paid options later") sits next to `:56` ("meant to stay free for everyone") and the Terms opening line "SoCal Lights is a free map". Not wrong, but the two answers pull in opposite directions; pick one line. Effort S.

**PL-17. Console log copy of ops detail is not redacted.** `functions/_lib/oplog.js:6` logs `String(detail).slice(0,200)` to the Worker log before the email redaction that is applied to the database copy. Current callers pass technical text (Stripe event ids, Resend status), so no personal data is logged today; a future caller could leak an address. Redact before logging. Effort S.

**PL-18. Quote/lead and installer data after owner deletion.** Deleting an installer owner clears `installers.owner_email`/`email` and deletes leads (`account.js:38-42`), but the installer profile (company name, phone, logo, blurb) and any `banner_until`/`top_until` stay public with no owner. Probably intended (business data), but it should be stated and a paid placement running at that moment has no refund prompt (`account.js:68-72` handles only contest events). Effort S.

**PL-19. Email classification detail.** Operational notices to organizers (`entry_new`, `contest_team_changed`, `listing_*`) are treated as marketing (unsubscribe link, address), which is the safe direction. `claim_approved` ("You can now feature it") and `sponsor_paid` are service emails with a promotional call to action; arguably fine, but the Privacy Policy calls the claim email "a service email, not marketing" (`privacy.html` Payments section), which an attorney may want to confirm. Invitation emails (`contest_invite`, `judge_invite`, `coorg_invite`) go to people who never opted in at an organizer's request, rate limits exist (`functions/_lib/sendlimit.js`), unsubscribe works (`functions/api/unsub.js`) and List-Unsubscribe headers are sent (`mailtpl.js:330-346`). Effort S. Atty: Y.

**PL-20. Event photos and hotlinked images (copyright).** Event cards hotlink images from about 300 third-party hosts (previous audit P-07); the Terms have no takedown route (PL-07). Out of privacy scope; flagged for the attorney. Effort M.

## 1. Data inventory update (what is new since 2026-11-04)

| Store | Personal data | Retention in code | Deleted by `deleteAccount`? | Policy says |
|---|---|---|---|---|
| `users`, `sessions`, `drafts`, `login_codes` | email, name, google_sub, address, avatar | until deletion; sessions 30 days | yes | yes |
| `posts` (homes, entries, `added_by`, `claim_event_id`) | address, name, photos, contact email | until removed | own posts deleted; organizer-added kept, `added_by` cleared | yes (`privacy.html:51`) |
| `event_submissions`, `event_claims` (`emailed_status`) | email, name | submissions: forever; claims: until deletion | submissions blanked; claims deleted | partly (PL-04) |
| `feature_orders` (Featured, home, Sponsor) | email, payment_intent | kept by design | `user_id` cleared; email stays | yes |
| `installers`, `installer_leads`, `contest_leads` | email, phone, name, note | until deletion | yes | yes |
| `alert_subs` | email, city, lat/lng, token | until unsubscribe; unconfirmed forever | yes (by email) | partly (PL-04) |
| `email_prefs` | email, token | kept by design | no (justified) | yes |
| `judges`, `contest_staff`, `contest_changes` | emails | until deletion | yes, except `old/new` text | partly (PL-04) |
| `admin_log` | admin email, target label (user email) | forever | no | not stated |
| `ops_log` | none after redaction | 30 days | n/a | n/a |
| `banner_stats`, funnel counters, `site_hits`, `contest_hits` | none | forever | n/a | yes |
| `email_send_log`, `entry_add_log`, `checkout_log` | user id | 1 to 3 days | no (self-expire) | not stated (pseudonymous) |
| `submit_log` | raw IP | 48 hours (`functions/_lib/retention.js:2-8`; all five writers prune; digest backstop) | n/a | yes (now true) |
| `lights_on`, `help_votes.who` | IP hash | 3 days / 48 hours | `lights_on` for own posts | yes |
| `reports`, `help_votes.note`, `help_searches` | free text | forever | contact blanked only | not stated |
| R2 photos, avatars | photos, EXIF GPS (PL-09) | until removed | own posts and avatar deleted | yes |

Verified true now (was false on 2026-11-04): IP deletion within two days; location statement (policy now describes "I saw it lit tonight"); "no ads" wording replaced by a paid-placements statement; CalOPPA Do Not Track and "Who receives your data" (Google Fonts, Geoapify, Census, Nominatim, OpenFreeMap, unpkg, Cloudflare, Resend, Stripe, YouTube, Vimeo, Amazon, Cash App); deletion now covers judges, leads, installers, listing changes, claims, alert signups, staff rows, reports contact.

Cookies and storage: one first-party cookie `scl_session` (HttpOnly, SameSite=Lax, Secure on https, `functions/_lib/auth.js:35`); no analytics scripts (grep for Google Analytics, Meta pixel, Cloudflare Insights, Plausible, PostHog, Hotjar returned nothing in `public` or `functions`); live `/` response sets no cookie. No cookie banner is needed for strictly necessary cookies in my reading; attorney to confirm.

## 2. Consistency checks (Terms, Privacy, Pricing, Feature, Sponsor, Help, emails)

Consistent (checked against live `/api/config`: Featured pin $10, Top of the list $15, Full run $25; Banner $50, Banner and top $75; season 2026-11-06 to 2027-01-06): prices, "pay once on Stripe", refund rule (full refund if we cannot list or feature; non-refundable once live; cancelled event moves or refunds unused time; refund or dispute switches placement off), "labelled Featured / Sponsor", "never affects a contest", "no guarantee of results", and the Feature page refund FAQ versus Terms (`tests/terms.test.mjs` enforces this).

Contradictions and drift:

| # | Statement A | Statement B | Severity |
|---|---|---|---|
| 1 | Help `presenting-installer-and-quote-requests` (`migrations/0153_help_articles.sql:163`): details go "only to that company" | `public/terms.html:44` and `public/privacy.html:54`: installer plus organizer, plus a stored copy; `public/contest.html:73` names the organizer | Medium (PL-05) |
| 2 | `public/terms.html:53,64`, `pricing.html:36,45`, `sponsor.html:35`: "no subscription / no automatic renewal" | Planned installer auto-renewal | High (PL-02) |
| 3 | `public/privacy.html:43`: marketing emails carry our postal address | `mailtpl.js:322-325`: only if the secret is set | High until verified (PL-03) |
| 4 | `public/privacy.html:56`: edit histories are cleaned on deletion | `contest_changes.old/new` keep emails; `admin_log.label` keeps the email | Medium (PL-04) |
| 5 | `public/terms.html:53`: pay "by card" | `public/feature.html:169`: "card or Cash App Pay" | Low (PL-15) |
| 6 | `public/pricing.html:55` "free for now" / "we may add paid options later" | `pricing.html:56` and `terms.html` "meant to stay free" / "a free map" | Low (PL-16) |
| 7 | `public/pricing.html:45`: "renew or upgrade any time from your dashboard" | `public/sponsor.html` FAQ: renew by buying the same plan again on the Sponsor page (installer dashboard `installer-manage.html:51` links to buying, not a renewal control) | Low |
| 8 | `terms.html:90` change notice = date only | `privacy.html` "Changes": notice plus email for material changes | Low (PL-07) |
| 9 | `public/terms.html:41` organizer is "the Sponsor" | `terms.html:63` and `banner.js:76` paying installer is "Sponsor" (the Terms explain the split; the rules template still uses both) | Low (PL-06) |
| 10 | Help `delete-my-account` renders `[ask us](#ask)` as literal text | n/a | Low (cosmetic) |

Emails (rendered locally, 38 templates): service emails (sign-in, approvals, receipts, quotes) carry the "service email, no unsubscribe" line; marketing/invitation emails carry an unsubscribe link and, when the secret is set, the postal address; List-Unsubscribe and one-click POST headers are sent for those (`mailtpl.js:330-346`; `functions/api/unsub.js`, `functions/api/alerts/unsubscribe.js`). Marketing versus service: weekly alert, reminders, results, judge and co-organizer invitations, neighbor invitations, listing-change notices and entry/team notices are treated as marketing (conservative). I found no email that claims "no subscription" other than `sponsor_paid`.

## 3. California Automatic Renewal Law: readiness for installer auto-renewal

Statutory references are from my memory of Bus. & Prof. Code 17600 to 17606 as amended by AB 2863 (operative July 1, 2025) and of the federal ROSCA (15 USC 8401 to 8405). **Verify all of it with the attorney.** Two threshold questions for the attorney: (1) the ARL protects "consumers" (individuals buying primarily for personal, family or household purposes); installers are businesses, so it may not apply, but sole proprietors are blurry and ROSCA and the unfair-competition law do not have the same carve-out; I recommend building to the ARL standard regardless. (2) Whether a per-season product that renews at a flat price into a shorter season (Nov 6 to Jan 6 is 62 days; the next season Jan 7 to Jan 31 is 25 days, from `/api/config` and `help/sponsor-your-installer-company`) is fair; the same $50 or $75 for 25 days will draw complaints, and "length of the renewal term" must be disclosed per renewal.

Requirements (as I understand them) and gaps in this repo:

| # | Requirement | State today | Gap |
|---|---|---|---|
| 1 | Clear and conspicuous disclosure of the auto-renewal terms, in visual proximity to the request for consent, before the order is completed: that it renews until cancelled, the recurring price (and that it may change), the renewal length, how to cancel, and any minimum term | Checkout summary (`public/sponsor.html:149`) says "paid once" and shows dates | New disclosure block beside the pay button; Stripe Checkout custom text too |
| 2 | Separate affirmative consent to the auto-renewal terms (an unchecked box or equivalent), not bundled with the general Terms | None; no checkbox on the Sponsor page | Unchecked box that must be ticked before Continue to payment; the server must refuse the session without it |
| 3 | Keep evidence of consent (reported as 3 years, or 1 year after the term ends, whichever is longer) | No table; the privacy rule deletes IPs after 48 hours | Store user id, plan, timestamp, text version and the exact wording shown, in the order row; do not rely on IP |
| 4 | Acknowledgment in a retainable form (email) with the terms, the cancellation policy and how to cancel | `sponsor_paid` (`mailtpl.js:111-114`) says "paid once, no subscription", no cancel information | Rewrite `sponsor_paid`; make the renewal notice a service email so it is not blocked by marketing opt-out (`sendTemplate` only skips `unsub: "link"` emails, `mailtpl.js:339-342`) |
| 5 | Easy online cancellation: if you can sign up online you must be able to cancel online, with a clear button or link in the account or reachable without logging in; no forced phone call or chat | None. The account page has no billing section; today only "email us" exists (`terms.html:75`) | Cancel button in the installer dashboard and a link in every renewal email (Stripe customer portal or own endpoint); also cancel by email as a backup |
| 6 | Reminder before renewal when the term is a year or more (reported window 3 to 21 days) and an annual reminder for shorter terms; notice of a price or material change in advance (reported 7 to 30 days) | None | New templates, a scheduled job and idempotency keys; season-length renewals are short so a reminder may be needed anyway for a fair-notice posture |
| 7 | "Save" and retention offers only after the person asks to cancel, and never as a barrier | n/a | Do not add one in the cancel flow |
| 8 | Cancellation stops future charges; terms must say what happens to the current period | `terms.html:73-76` says non-refundable once live | Add: cancelling stops the next renewal, the current season keeps running, no refund of the current season (attorney to confirm this is acceptable) |
| 9 | Terms, Pricing, Sponsor page, installer dashboard, `sponsor_paid`, Help, video captions updated; tests changed | See PL-02 evidence list | Edit all; update `tests/terms.test.mjs`, `tests/sponsor-pay.test.mjs`, `tests/sponsor-rules.test.mjs`; keep "no subscription" for Featured events and homes |
| 10 | Privacy Policy: Stripe will hold a customer and a saved payment method; what we keep (customer id, subscription id, consent record); retention | Policy says "never card numbers" and "Order records" only | Add a paragraph; add the consent record to "How long we keep information" |
| 11 | Account deletion must cancel renewals and keep only the financial record | `deleteAccount` has no Stripe step and no customer id is stored | Cancel the subscription via Stripe, mark open Sponsor orders for refund review (as `account.js:68-72` does for contest events), clear the stored customer reference |
| 12 | Failed-payment and refund handling: a refund or dispute must switch off the placement and the renewal | `stripe-webhook.js` and `orders.js` handle one-off payments, refunds and disputes (`refund_due`, `disputed`) | Add handlers for subscription and invoice events; idempotent, with the existing `stripe_events` dedupe |
| 13 | Price integrity: a renewal charge must equal what was disclosed | `INSTALLER_PLANS` in `functions/_lib/featured.js:18-19` | Freeze the price in the consent record; give notice before any change |
| 14 | Taxes and receipts for recurring charges | Stripe emails a receipt; no tax calculation in checkout (no automatic tax parameter) | CPA question (brief section 5) |
| 15 | App stores: paid placement is hidden in the wrapper apps (`public/sponsor.html` `PAID(false)`) | fine | Keep hidden in the apps; auto-renewal outside the store billing system is a store-policy risk if ever shown in-app |

Also relevant: the federal FTC "click to cancel" rule was reported vacated by a federal appeals court in 2025 (verify), but the FTC still enforces ROSCA, so the same cancel-path standard is a sensible target.

## 4. Other area notes

- **Third parties (all disclosed now):** Cloudflare (hosting, D1, R2, Turnstile, Access), Resend, Stripe, Google (sign-in, Fonts), Geoapify, U.S. Census geocoder, Nominatim, OpenFreeMap, unpkg, YouTube-nocookie and Vimeo (Tutorials only), Amazon (Shop links), Cash App (tips), hotlinked event image hosts. No ad network and no analytics vendor. Not a sale or share in my reading; attorney to confirm for quote leads given to installers (free today; a paid-lead model would need review, redline item 5).
- **Contest touchpoints:** votes and entries are free (`rules.js` section 2; `terms.html:40-41`); Featured homes only after announcement and only for podium finishers (`functions/_lib/podium.js`), with no upsell in the winner email (`mailtpl.js:163-166`). Open attorney items: prize value disclosure, "no cash value", sponsor-bond and registration questions in the brief section 1, whether a city-run contest needs different terms, tax forms for prizes of $600 or more (CPA).
- **FTC and labelling:** Featured badge and "Sponsor" labels are present on map, list and cards (`public/banner.js:76,98`; `app.js`); the contest page says "This is an advertisement" next to the presenting installer's quote box (`public/contest.html:73`). Whether "Featured" and "Sponsor" are clear enough is redline item 3 and is still with the attorney.
- **Live headers:** `referrer-policy: strict-origin-when-cross-origin` and `permissions-policy` are present on `/`; no `Set-Cookie` on public pages.

## 5. Questions for the attorney

1. ARL: do installers buying a Sponsor placement count as "consumers"? If not, do ROSCA and the unfair-competition law still require the same consent, reminder and cancel steps? Is flat pricing across seasons of 62 and 25 days acceptable disclosure?
2. Private homes: what attestation, notice and takedown process makes it acceptable (a) for the team to list homes from public contest and tour pages, and (b) for an organizer to add residents' addresses? May a third-party organizer buy Featured for a resident's home?
3. Is one unrecorded checkbox enough, or must we keep a record of consent (who, when, wording)? How long?
4. Postal address: is a P.O. box or registered-agent address acceptable for CAN-SPAM? Are invitation emails sent at an organizer's request "commercial" under the primary-purpose test? Is the `claim_approved` email transactional?
5. Do we need a CCPA/CPRA rights section and a stated response time even if under the thresholds? Is a "Do Not Track" and "not sold or shared" statement sufficient?
6. Terms: license to user content, copyright agent registration and takedown, installer independence, affiliate clause, organizer agreement, liability cap for paying customers, change-notice clause.
7. Rules template: how to state prize value, "no cash value", "Sponsor" naming, eligibility 18 or older without an age check, contest of skill versus chance for popular votes; registration or bonding for prizes.
8. Contractor advertising: must a paid Sponsor banner or card show a CSLB license number (Bus. & Prof. Code 7027.1)? Does the "Sponsor" label satisfy FTC native-advertising guidance?
9. Children: does anything in the site trigger COPPA or the California age-appropriate design law? What should be the photo-of-a-minor takedown process?
10. Retention: acceptable periods for unconfirmed alert signups, declined submissions, reports, order records (CPA to advise on tax records).
11. Accessibility: wording of a statement and an acceptable remediation plan.

## 6. What I could not verify

Cloudflare secrets (`MAIL_POSTAL_ADDRESS`, `TURNSTILE_SECRET`), Stripe dashboard settings (payment methods, receipts, tax), Resend domain and bounce settings, live row counts (no database access in this session), R2 contents (EXIF), Google Search Console, and actual email delivery. I did not review the Grok outreach agents' sent mail. Statute text was not re-fetched.
