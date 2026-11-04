# Privacy and compliance audit (2026-11-04)

**I am an AI auditor, not a lawyer. This is not legal advice.** Read-only: no code changed. Statute text is reused from `docs/monetization/legal-research.md` (cited as "brief") and `legal-redlines.md` ("redlines"); I did not re-derive it. Live D1 was queried with SELECT and `pragma_table_info` only; counts shown, no personal values read. Anything I could not verify is labelled UNVERIFIED.

## Summary

| Severity | Count | IDs |
|---|---|---|
| High | 5 | P-01 to P-05 |
| Medium | 9 | P-06 to P-14 |
| Low | 5 | P-15 to P-19 |

Context: the live DB is nearly empty (5 users, 1 alert subscriber, 6 homes, 1 contest, 1 installer, 0 leads/orders/votes). Most findings are latent: they bite when real people use the contest, quote and Featured features. Fixing them now is cheap.

## Ranked findings

| ID | Sev | Area | Evidence | Why it matters | Fix | Effort | Atty |
|---|---|---|---|---|---|---|---|
| P-01 | High | Policy vs reality: location | `privacy.html` "Your location": "not sent to our servers or stored". But `public/app.js:769` posts `{lat,lng}` to `/api/posts/:id/on`, handled in `functions/api/posts/[id]/on.js:12-17`, which computes distance server-side. Coordinates are not stored (only a `near` flag and an IP-derived hash, kept 3 days), but they are sent. | A flat false statement in a posted policy (CalOPPA 22576 per brief 4.2). Also contradicts `docs/app-store.md:56-57` ("Location: not collected"). | Reword: "if you tap 'I saw it lit tonight' your location is sent once to check you are near the home; we do not store it." Update store labels. Or compute distance on device and send only a boolean. | S | N |
| P-02 | High | Policy vs reality: "no ads / not shared" | `privacy.html` lines "We do not show ads" and "do not ... share it with advertisers". Redlines 2A already flags this: Featured placements, sponsor logos, installer quote sharing. | Misleading statement (B&P 17500/17200, brief 3.4). | Apply redlines 2A text (marked SHIP NOW). Not yet applied: policy still says it. | S | Y (approve) |
| P-03 | High | Quote-lead consent | `public/contest.html:73` says "Your details are shared only with them [the installer]" and checkbox names only the installer. `functions/api/contests/[slug]/quote.js:23-25` also stores a copy in `contest_leads` and emails the organizer (`contest_quote_sent`). Policy says organizer gets it too. Checkbox lists "name, email and phone" but the note is also sent. | Page text contradicts policy and code; consent is not "specific, informed" (CCPA consent definition, brief 4.1). Account-less users are not involved (sign-in required), good. | Checkbox: "Share my name, email, phone and note with X and with the contest organizer, who keep a copy." Remove "only with them". | S | Y |
| P-04 | High | Deletion completeness | `functions/_lib/account.js` leaves a deleted person's email/name in `judges`, `contest_leads`, `installer_leads`, `listing_changes`, `event_claims`, `alert_subs`, `installers.owner_email`, `contest_staff` (as a member of others' contests), `reports.contact`. See matrix. Policy and `account.js` header promise removal "of everything tied to it". | Policy sentence "We delete your account ... and remove your email" is incomplete. CCPA right-to-delete is not mandatory at our size (brief 4.1) but the policy itself makes the promise (22576). Leads contain phone numbers. | Extend `deleteAccount` (list in matrix). Keep `feature_orders` and `email_prefs` with stated retention reason. | M | N (retention period Y) |
| P-05 | High | Email: CAN-SPAM | `functions/_lib/mailtpl.js:254,278` footer has "Forza-TEK ... All rights reserved" and no postal address. `grep` of functions and public finds no mailing address anywhere. `docs/monetization/grok-outreach-guide.md:44` itself lists "valid physical postal address of the sender" as a requirement. No `List-Unsubscribe` header anywhere (`grep` empty). | The weekly alert (`alerts_weekly`) is a commercial-leaning marketing email; reminders (`contest_remind_*`), invites (`contest_invite`) are arguably promotional. Address is a statutory element (CAN-SPAM, per outreach guide source; I did not re-fetch the statute). Gmail/Yahoo bulk-sender rules also expect one-click `List-Unsubscribe`. | Add a PO box or registered-agent address to every email footer; add `List-Unsubscribe` and `List-Unsubscribe-Post` headers in `notify.js`. | S | N |
| P-06 | Medium | Third parties: Google Fonts | Every page (e.g. `privacy.html`, `terms.html`, `unsubscribe.html`) loads `fonts.googleapis.com` (20 refs) plus `fonts.gstatic.com`. Policy is silent. | Visitor IP and UA go to Google on every page view, contradicting the spirit of "no cookies, no IP, no tracking" copy in the Spam/technical section. German courts have fined sites for this; no US exposure I can verify. | Self-host the font (Cloudflare Pages, same origin) or disclose. | S | N |
| P-07 | Medium | Third parties: map and assets | Not disclosed: `unpkg.com` (MapLibre JS/CSS, `index.html:31,81`), `tiles.openfreemap.org`, `challenges.cloudflare.com` (Turnstile), `accounts.google.com`, `api.geoapify.com` (`functions/api/address.js:15,32`: typed addresses are sent server-side to Geoapify), `geocoding.geo.census.gov`, `nominatim.openstreetmap.org`, YouTube-nocookie and Vimeo embeds (`tutorials.html:44-46`). Event images hotlink third-party hosts: about 316 distinct image hosts in `events.image` (Eventbrite, socalhauntlist.com, squarespace-cdn, LA parks etc.). | Visitors' IPs reach all of these. CalOPPA requires categories of third parties and whether others collect info across sites (brief 4.2, redlines 2B "Partial"). Hotlinking also means third parties see who views which event. | Add a "Services we use" list. Consider proxying or caching event images in R2. Mark Geoapify as receiving typed addresses. | M | N |
| P-08 | Medium | CalOPPA elements | No Do Not Track statement; no consolidated third-party list; weak change-notice process ("we will update the date above"). Confirmed absent in `privacy.html`. Redlines 2B text proposed but not applied. | Quoted 22575 elements missing (brief 4.2). | Apply redlines 2B additions (SHIP NOW). | S | Y (approve) |
| P-09 | Medium | Retention statements | Policy says IP is deleted "within a day or two". Code: `submit_log` pruned only inside `submit.js:122` and `submit-event.js:82`; `report.js:17` and `help/contact.js:16` insert but never prune, so rows persist until the next house/event submission. Live: 2 rows, oldest 2026-10-31 (4 days old, so already beyond "a day or two"). `login_codes` pruned at `auth/email/start.js:25` only when `expires_at < now-1 day`; table is empty now. | Concrete false statement as of today. | Prune `submit_log` in a scheduled job or on every insert (`report.js`, `help/contact.js`). | S | N |
| P-10 | Medium | EXIF GPS | Browser path re-encodes via canvas (`public/addflow.js:52-56`, `profile.html:151-153`), which drops EXIF. Server does NOT strip: `functions/api/submit.js:21-24,98` stores bytes as uploaded after magic-byte check only. Any direct POST or a client without canvas keeps GPS. Avatar upload `me/avatar.js` same. | Home photos are public; GPS EXIF would leak exact location (largely the public address anyway, but not for `show_address=0` homes). Client-side stripping is not a control. | Re-encode server-side, or reject JPEGs with an APP1 EXIF segment. I did not test an upload (read-only). | M | N |
| P-11 | Medium | Terms gaps | `terms.html` has no refund/cancellation term for Featured placements, no prize/sponsor-label or affiliate disclosure, no user-content license grant, no takedown/DMCA process or agent, no paid-placement terms (see redlines item 6). | Without a content license the site arguably cannot display or crop photos; no DMCA agent registered means no safe harbor (17 USC 512 is outside the brief; UNVERIFIED by me). | Add license grant, takedown procedure, refund clause (Finance policy), DMCA agent registration. | M | Y |
| P-12 | Medium | Age | Terms and sign-in dialog (`public/auth.js:52`) state "13 or older" but there is no age gate or check; policy says "not directed to children under 13". Contest entry "18 or older" is only a sentence in terms. Photos of children are discouraged but not screened. | COPPA triggers on actual knowledge or child-directed content; "family-friendly" and Halloween themes raise child-directed risk. California age-appropriate design law applicability UNVERIFIED. | Add a checkbox "I am 13+ (18+ to enter)" at sign-in/entry; document takedown for child data. | S | Y |
| P-13 | Medium | Store labels | `docs/app-store.md:56-57`: Apple "Contact info: only when you submit event or house", Google "email only when submitting a form, not shared". Reality: accounts/sign-in (email, name, Google id, address, avatar), votes, quote leads shared with installers, contest organizers see entrant data, device location sent once (P-01), purchases excluded in app. Apple labels must cover User ID, Contact Info, Photos, Purchases (web only), Coarse/Precise location (transient). | Label mismatch is a review rejection and a deceptive-practice risk. The wrapper loads the live site, so everything the site collects counts. | Redo both questionnaires from this inventory. | S | N |
| P-14 | Medium | Contest data public | Entrant name, photos, and address are shown publicly. Policy "Information you choose to submit" says home details incl. street address and photos "are shown publicly". `show_address` exists (6 of 6 live posts have `show_address=1`). I did not find the entry form wording that states this at submit time; `contest-enter.html` greps show no "public/visible" notice. UNVERIFIED in the UI. | Showing a home address of a private person publicly is the main privacy exposure; consent should be at point of entry. | Add a visible line and per-entry `show_address` choice on the entry form. | S | N |
| P-15 | Low | alert_subs consent | `functions/api/alerts/index.js:20` requires `consent` true, but only the double-opt-in result is stored (`confirmed`, `confirmed_at`, `created_at`). The text version, IP and consent wording are not stored. Unsubscribe `alerts/unsubscribe.js` is a GET that deletes the row immediately (prefetch by link scanners can unsubscribe people silently). | Good practice; weak proof of consent. | Store consent text version; make unsubscribe confirm via POST. | S | N |
| P-16 | Low | Unsubscribe scope | `unsubscribe.html` opt-out covers `unsub: "link"` templates only; alerts use a separate path. Opt-out is not shared between the two systems. | User confusion; weekly email opt-out needs its own link (it has one). | Mention in policy. | S | N |
| P-17 | Low | Accessibility | No accessibility statement or WCAG/ADA page found (`ls public` has no accessibility page; grep finds none). Code shows aria-labels, `role="alert"`, and 48px buttons, so practice is reasonable. Not audited with a tool. | ADA web claims target commercial sites; a statement and contact channel reduces risk. | Add a short statement and contact. | S | N |
| P-18 | Low | Policy: Cash App | `privacy.html` says tips go through Cash App; `feature.html:53` says Featured is paid by card or Cash App Pay on Stripe. Redlines 2B flagged. | Inconsistent. | Align copy. | S | N |
| P-19 | Low | Policy: IP hash in lights_on | `on.js:10` stores a 24-char SHA-256 of `ip:post:day` for 3 days; `help_votes.who` (`_lib/help.js:70-75`) is an 8-byte hash, kept indefinitely. Policy says counts have "no IP" and mentions only the submission IP. Hashes of IPv4 with a day-salt-free input are brute-forceable (only 2^32). | Likely still personal data under CCPA "unique identifier" definition (not in brief; UNVERIFIED). | Disclose, or add a server-side secret to the hash. | S | N |

## Data inventory (live D1, row counts; columns from `pragma_table_info`)

| Table | Personal columns | Rows |
|---|---|---|
| users | email, name, google_sub, street, city, zip, avatar, picture (Google URL), badges, admin_note, last_login | 5 |
| sessions | user_id (session id is the token) | 5 |
| login_codes | email, ip, code_hash | 0 |
| submit_log | ip (raw) | 2 |
| posts | biz (name), contact_email, phone, address, street, zip, lat, lng, web, photos (R2 keys), user_id, installer_token, show_address | 6 (6 have contact_email, 0 have user_id) |
| votes | user_id, post_id | 0 |
| contests | owner_id, contact_email, installer_email, org, results (frozen snapshot with entrant names/addresses) | 1 |
| contest_staff | email | 0 |
| contest_leads | user_id, name, email, phone, note | 0 |
| contest_changes | by_email, by_name, old/new (free text) | 2 (both with email) |
| contest_sponsors | name, url, logo (business) | 0 |
| judges | email, token, user_id | 0 |
| judge_picks, judge_scores, judge_conflicts | judge_id only (indirect) | 0 |
| installers | email, owner_email, phone, name, logo | 1 |
| installer_leads | user_id, name, email, phone, note | 0 |
| listing_changes | by_email, by_name | 0 |
| alert_subs | email, city, lat, lng, token | 1 (1 confirmed, 1 with lat/lng) |
| email_prefs | email, token | 0 |
| event_submissions | contact_email, name, address | 0 |
| event_claims | user_id, email | 0 |
| feature_orders | email, user_id, payment_intent, charge_id | 0 |
| reports | name, contact, message | 0 |
| drafts | user_id, data (JSON of form answers) | 0 |
| help_votes | who (hash of IP+day+slug), note | 0 |
| help_searches | q (free text) | 0 |
| lights_on | voter (hash of IP+post+day, 3-day retention) | 0 |
| admin_log | admin (owner email), label | 21 (0 labels with an email) |
| site_hits, contest_hits, installer_hits, stripe_events, email_templates, help_articles, admin_digest | none | n/a |
| R2 `socal-lights-photos` | home photos, avatars (EXIF handling: see P-10) | UNVERIFIED (not listed) |

## Deletion matrix (`deleteAccount`, `functions/_lib/account.js`; also used by the admin Users tab)

| Table / store | Result | Note |
|---|---|---|
| users, sessions, drafts, login_codes | deleted | |
| votes (own, and votes on own entries) | deleted | |
| posts with user_id (contest entries and homes) | deleted, with R2 photos | |
| posts.contact_email (no-contest homes, by email match) | blanked | The home itself (name, address, photos) stays public if posted without an account. Policy says so. |
| avatar (R2) | deleted | |
| event_submissions.contact_email | blanked | event name stays |
| contests (owned) | blanked | owner_id, contact_email, installer_email cleared; contest name, org, `results` remain (frozen); entrant snapshot scrubbed |
| contest_staff (of owned contests) | deleted | Rows where the deleted person is staff in someone else's contest: **kept (gap)** |
| contest_changes | blanked | by_email, by_name only; `old`/`new` free text could hold emails: UNVERIFIED |
| judges | **kept (gap)** | email, token, user_id never touched, even for contests the person owned (orphaned) |
| judge_picks/scores/conflicts | kept (justified) | contain only judge_id; fine once `judges` row is removed |
| contest_leads | **kept (gap)** | name, email, phone of the requester; no `user_id` clean-up |
| installer_leads | **kept (gap)** | same |
| installers.owner_email / email | **kept (gap)** | business contact; remove or blank owner_email on delete |
| listing_changes | **kept (gap)** | by_email, by_name |
| event_claims | **kept (gap)** | user_id, email |
| alert_subs | **kept (gap)** | keyed by email, no user link; delete by email on account deletion |
| email_prefs | kept (justified) | suppression record (so an unsubscribed address is not re-mailed); state this in the policy |
| feature_orders | kept (justified, needs retention policy) | financial records; typical tax/bookkeeping retention is several years, attorney or CPA to confirm; state it; null `user_id` and keep amounts |
| reports | kept (gap, minor) | free-text name/contact; no key to delete by |
| lights_on | kept (justified) | hashes only, auto-expire 3 days |
| submit_log | kept (justified, with P-09 pruning fix) | raw IPs |
| help_votes | kept (justified) | hash only |
| admin_log | kept (justified) | admin audit trail; contains admin email only; labels may include user emails (0 now) |
| stripe_events | kept (justified) | no personal data |
| Stripe, Resend, Google, Cloudflare logs | UNVERIFIED | external systems; deletion not covered by code |

## Privacy policy truth table (`public/privacy.html`)

| Statement | Verdict | Basis |
|---|---|---|
| "no account needed to browse or add an event" | TRUE (events can be added without sign-in; `submit-event.js`). Note some flows require sign-in (feature orders, claims). | code |
| "We do not use passwords" | TRUE | email code + Google |
| "We do not show ads" | FALSE / misleading | Featured placements, sponsor logos (P-02) |
| "do not sell or share with advertisers/data brokers" | UNVERIFIED legally; installers get leads (P-02) | |
| "We do not track you across other apps or websites" | TRUE for first-party code; Google Fonts, hotlinked images and unpkg see IPs (P-06, P-07) | |
| Location "used only on your device ... not sent to our servers" | FALSE for "I saw it lit tonight" (P-01); TRUE for map centering/routes (`app.js:336-344`, `tour.js:63-65`) | |
| Maps app receives destinations | TRUE | `app.js:71` |
| Add event/house form fields listed | TRUE (`submit.js`, `submit-event.js`) | |
| "Your email address is private" (events/homes) | TRUE for map; organizers of a contest can see it (stated elsewhere) | |
| "stored with Cloudflare" | TRUE (D1, R2) | |
| Weekly email: stores email, city, distance, last sent | TRUE, plus lat/lng of city centroid and token (minor omission) | `alerts/index.js` |
| Confirmation link first; nothing sent until tapped | TRUE | `send.js` filters `confirmed = 1` |
| Each email has a link that deletes the address | TRUE | `mailtpl.js:263`, `alerts/unsubscribe.js` |
| Sent through Resend | TRUE (`api.resend.com`) | |
| Sign in with Google or code; we receive email and name | TRUE; also Google picture URL and `google_sub` (disclosed partly: picture yes, sub no) | `auth/google/callback.js` |
| Cookie keeps you signed in up to 30 days | UNVERIFIED (cookie attributes seen: HttpOnly, SameSite=Lax; Max-Age not checked) | `_lib/auth.js:33` |
| Organizers see name, email, street address, photos of entrants | TRUE | |
| Votes stored with account, organizers can see voter email | TRUE per policy; UNVERIFIED in code | |
| Quote requests: sent to installer and organizer; "nothing shared unless you ask" | TRUE in policy and code, but the checkbox/page copy contradicts it (P-03) | |
| Visit counts are totals only | TRUE (`hit.js`, `site_hits` has day/page/n) | |
| Delete account removes account, drafts, avatar, entries, votes, closes contests, blanks emails | TRUE for those items; incomplete overall (P-04) | |
| Optional profile details never shown publicly | TRUE (not in public posts); UNVERIFIED on all surfaces | |
| "one number per page per day, no IP" | TRUE | `site_hits` schema |
| IP recorded briefly, deleted within a day or two | FALSE in practice (P-09) | |
| Cloudflare processes IP and browser type | TRUE | |
| Device storage: saved places, theme, maps app, tips | TRUE (UNVERIFIED for every key) | |
| Amazon affiliate links | TRUE in policy; Amazon link count: 1 hostname found | |
| Stripe handles cards, we keep order | TRUE for web; order stores email (and now `user_id`, `payment_intent`) | `feature_orders` |
| "Tips go through Cash App" | Inconsistent (P-18) | |
| "Not directed to under 13, no knowing collection" | UNVERIFIED (no age gate, P-12) | |
| Changes: update the date | TRUE but weak (P-08) | |

Missing disclosures: Google Fonts, unpkg, OpenFreeMap tiles, Turnstile (disclosed lightly), Geoapify/Census/Nominatim address lookups, YouTube/Vimeo embeds, hotlinked event images, judges (name/email of invited judges), co-organizers/staff emails, IP hash in `lights_on` and `help_votes`, retention periods for sessions, orders, leads, accounts; Do Not Track; CCPA/CPRA statement (we are below the $25M/100k thresholds per brief 4.1, so a short "not a covered business; we honor deletion requests anyway" line is optional; the attorney decides); how to exercise rights and how fast.

## Email compliance (item 4)

| Email | Class | Unsubscribe | Postal address |
|---|---|---|---|
| signin_code, alerts_confirm | transactional | none (stated); fine | none |
| alerts_weekly | marketing/commercial content | yes (`footerFor` "alerts"), works (deletes row) | **no** |
| contest_remind_open/close, results_*, judge_nudge, contest_invite, entry_new, contest_team_changed, listing_* | mixed: operational for owners, promotional for invites and reminders | yes ("link"), honors `email_prefs` | **no** |
| admin_digest, installer_claim | admin | none, fine | n/a |
| contest_quote / contest_quote_sent / installer_quote | transactional to businesses | none | none |

`contest_invite` is an unsolicited email to a neighbor on the organizer's request: a commercial-style message to a third party who never opted in; it has an unsubscribe link, but there is no address and no record of who asked. `public/unsubscribe.html` plus `/api/unsub` correctly flips `email_prefs.optout` by token (TRUE), but it does not delete the person; the alert unsubscribe does (TRUE). No `List-Unsubscribe` header exists (P-05).

## Terms, accessibility, store claims (items 6 and 7)

Terms contain: age, content rules, contests organizer role, warranty disclaimer, $100 cap, California law. Missing: refunds and paid placements (redlines item 6), license to user content, takedown or DMCA agent, affiliate disclosure, dispute resolution venue (only "courts of California"), contradiction check: terms say details go "only to that installer and the organizer", which matches the policy but not `contest.html:73` (P-03). Terms say withdrawing a contest entry is possible; deletion of an announced result is partial by design (snapshot scrubbed).

Accessibility: no statement (P-17). Store listing: see P-13 and P-01.

## What I could not verify
- Actual entry-form wording for contest entrants (public visibility notice, P-14), only grep-level.
- Cookie lifetime, all localStorage keys, every email send site, Resend account settings (domain, bounce handling).
- R2 contents and whether any stored image has EXIF.
- Stripe and Google console settings, Cloudflare Web Analytics or Access logs.
- Current CAN-SPAM, DMCA and COPPA statute text (I relied on the outreach guide's list and my general knowledge; nothing re-fetched).
- Whether `contest_changes.old/new` or `reports` contain emails (counts only).
