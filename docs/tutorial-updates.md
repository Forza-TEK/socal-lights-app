# Tutorial videos and pages: what is out of date (2026-11-06)

Written after the design pass (PRs 345 to 347) so that all recording can be done in one sitting.

## Done (2026-11-07, contest monetization went live)
Recorded in day mode against the local demo setup (Kokoro `af_heart`), each with a phone version. No dollar amounts or plan names in the narration.
| Video | What was done |
|---|---|
| `quick` | Re-recorded in place (4:58 desktop, 4:57 phone). The Review step says "Your first contest in a 12-month window is free. If you run more, you choose a pass first: see the Pricing page." The demo organizer is on the free contest, so the pass picker itself is not shown. Over the 2:30 target, like the version it replaces (4:32); splitting it is a separate decision. |
| `custom` | Re-recorded in place (7:14 desktop, 7:13 phone), same Review sentence. Same note on length (the replaced version was 6:47). |
| `sponsors` | Re-recorded in place (2:17 / 2:19): the old script used the old Sponsors form. Now: company and logo, Sponsorship type "Paid to me", collected, date and method, permission, Show on the contest page, Save sponsor. Title is now "Record a sponsor on your contest page". |
| `sponsor-invite` (new, Sponsors and installers) | Invite a sponsor to your contest (2:27 / 2:28): How sponsors pay you, Create invite link, Copy link, the sponsor's `/s/<token>` page with demo data, Mark payment received, Approve. The payment link is `example.com`; the sponsor is "Oak Hill Hardware" with an `.example.com` email. Linked to the Help article `add-sponsors-to-your-contest` by migration 0191. |
No `contest-passes` video: the pass picker only appears for an organizer's second contest, and a pass video would need a paid Stripe step that is never recorded. Not linked to `contest-passes`.

## Done (2026-11-06, recorded in day mode against the local demo setup with the Kokoro `af_heart` voice, the same voice as the other 25)
| Video | What was done |
|---|---|
| `approve` | Re-recorded (2:24): the Entries tab opens with Add homes yourself (paste five addresses, Check addresses, tick the box, Add 3 homes), the Added by organizer tag, Remove, then Approve, Decline with a reason, Undo decline. |
| `profile` | Re-recorded (1:54): full-width rows, and a Contests step (contests you run, homes you entered). |
| `voting` | Re-recorded (2:23) with the Contest page row and Unpublish; its end card now leads to the new Unpublish video. |
| `add-homes` (new, Run a contest) | Add your city's homes yourself (2:26). |
| `unpublish` (new, Run a contest) | Unpublish and publish again (2:04). |
| `claim` (new, Post events and homes) | Claim your home (2:15). |
| `feature` (new, Post events and homes) | Feature your event or home (2:11), recorded after the new Featured pricing went live (Full run, $25). It goes as far as Continue to payment and stops; the checkout request is held, nothing goes to Stripe. The narration names no prices or plan names; the plan cards on screen do show the current prices, so re-record if prices change. |
Not re-recorded, on purpose: `map`, `pro-filter`, `installer-profile` (the darker tag colours are a small change, narration still true), `announce` (Terms wording about Featured homes is still open with the attorney), `showcase` (the claim video covers the new path), `app`, `email`. All seven videos above also have new phone versions (9:16, `MOBILE=1`).
The recorder cannot reach the address lookup services from the local server, so `scripts/tutorials/mockgeo.mjs` stands in for them in the Add homes scenes (demo addresses are public buildings, never homes; the rows it writes are in the local database only). The Featured scene holds the checkout request, so nothing is sent to Stripe.

**Baseline.** The 25 videos were re-recorded on 2026-11-05 and merged in batches between 15:26 and 17:14 Pacific (PRs 320 to 329), against the app as it was that afternoon. Everything merged from PR 324 (profile as rows, 16:53) onward counts as "after". The recordings are day mode, so night-mode-only changes are ignored. Narration is not affected by anything below unless stated.

**How to read the verdicts.**
- **Re-record**: the screen the video shows has visibly changed and the narration is now incomplete or wrong.
- **Optional**: a small visible change; the video is still correct. Re-record only if you want it pixel-current.
- **Leave**: no visible change on the screens the video shows.

## Changes that matter (all UI changes since the recordings)
| # | Change | Where you see it | PR |
|---|---|---|---|
| C1 | Organizer "Add homes yourself" card on the dashboard's **Entries** tab (paste addresses, "Check addresses", "Add N homes"; open by default when there are no entries, collapsed to its title bar otherwise; "Homes can't be added once voting has started" after voting opens) | Dashboard > Entries, above the Entries card | 327 |
| C2 | "Added by organizer" tag under an entry's name in the Entries table | Dashboard > Entries | 327 |
| C3 | Controls card has a new row: **Contest page** ("Public and on the map") with an **Unpublish** button (tap again to confirm); after unpublishing a red notice at the top of Overview with **Publish it again** and a "Contest page / Publish again" row | Dashboard > Overview > Controls | 339 |
| C4 | "Is this your home? Claim it" link on map cards of homes the sweeps found (venue "view from the street"); opens Add a display prefilled, and the first step says "You are claiming ..." | Map > place card; /add-house?claim= | 339 |
| C5 | Featured homes: gold ringed pin and gold **Featured** tag on a home's card and list row, featured homes listed first; owners of a podium home (winner, 2nd, 3rd of an announced contest) see it on /feature ("Feature this home", 30-day plans only) | Map, /feature | 344 |
| C6 | Pricing page now explains Featured events and podium homes; this pass added a note (one-time payment, 30 days from payment, Full run (formerly Whole season) is events only) and named Choose buttons | /pricing | 303, 344, 347 |
| C7 | Event Share now sends `/e/<event id>` (a page with its own title, photo and card) instead of `/#e-<id>`; homes still share `/#h-<id>` | Map > event card > Share | 342 |
| C8 | Search box is a real combobox (screen reader change only; suggestions look the same) | Map | 343 |
| C9 | Profile: displays, events and drafts are full-width rows (name and status left, buttons right) instead of a card grid; the Contests tab, which was only a link to the Contests page, now lists the contests you run (Manage, View page) and the homes you entered | /profile | 324, 337 |
| C10 | Offline: a saved copy of any page you visited opens with no signal; the offline page lists the pages still available and retries by itself | Any page, offline | 334, 336 |
| C11 | Footers: links are 44 px tall (the footer is about 20 px taller); "Skip to the content" link appears on the first Tab press | Bottom of every page but the map | 345 |
| C12 | Light-theme tag colours a little darker (Confirmed, Expected, Free, Paid, blue tags, price text); in night mode the Contests "Live now" tab has dark text on coral | Map cards and detail, /contests | 345 |
| C13 | Empty search says "No places match "x"" with Clear search | Map | 347 |
| C14 | Breadcrumb trail on city pages, /in and event pages (/e) | Server pages | 346 |
| C15 | Admin: Orders tab, funnel counters, Help editor, backups | /admin only | various |
| C16 | Real emails now end with the postal address and an unsubscribe line (the recorder rendered the app's real templates on 2026-11-05, but the address is a deployment secret, so the mock emails show no address line) | Email screens in videos | 315 |

## Video by video
Order and ids follow `public/tutorials.json`. "Step" is the caption on screen.

### Find and plan
| Video (id) | Verdict | What changed and what to do |
|---|---|---|
| Find lights near me (`map`) | Optional | Step "Search a city": same look (C8). Cards in the list show the darker tag colours (C12), and a place card may show "Is this your home? Claim it" (C4) for sweep-found homes. Nothing in the narration is wrong. Re-record only if you want the new tag colours. |
| Plan a night (`night`) | Leave | Step "Share your night" is the night list, not an event (C7 does not apply). |
| Weekly lights email (`email`) | Optional | Step "Check your email" and "The weekly email": real emails now carry the postal address and unsubscribe line (C16). Leave unless you re-record anyway. |
| Install the app and use it offline (`app`) | Optional | Narration still true. Offline now works from every page you visited and the offline page lists what still works (C10). A 15-second addition to the last step ("pages you opened before also open") would be accurate and a good use of the new feature. |
| Find contests: the Contests page (`contests`) | Leave | Tabs Live now, Mine, Past results look the same in day mode (C12 only changes night mode). Step "Mine" is the /contests Mine tab, not the profile. |
| Find professionally installed displays (`pro-filter`) | Optional | Step "Open one of the places": tag colours (C12). A featured home would now show a gold pin and Featured tag (C5), but none exist until a contest is announced. |

### Enter a home
| Video | Verdict | What changed and what to do |
|---|---|---|
| Enter your home in a contest (`enter`) | Leave | Add flow unchanged apart from invisible markup (aria on errors, main landmark). |
| Edit or withdraw your entry (`edit-entry`) | Leave | The "Your home" card on the contest page is unchanged. |
| Your profile (`profile`) | Re-record (small) | Steps "Drafts" (and the Displays and Events tabs it passes) now show full-width rows (C9), and the Contests tab between Drafts and Displays now lists contests with Manage and View page buttons (C9). The narration lists Drafts, Badges, Account and stays true, but the screens look different. Add one sentence: "Contests lists the ones you run and the homes you entered." |

### Vote and judge
| Video | Verdict | What changed and what to do |
|---|---|---|
| Vote in a contest (`vote`) | Leave | Ballot unchanged. Organizer-added homes (C1) appear on the ballot without a photo, which the demo does not show. |
| Judge a contest (`judge`) | Leave | Invitation email now has the address and unsubscribe footer in real life (C16); the demo email does not show it. |

### Run a contest
| Video | Verdict | What changed and what to do |
|---|---|---|
| Create a contest with Quick start (`quick`) | Leave | Ends on the dashboard Overview; the new Controls row (C3) is below the fold of the shot. |
| Create a contest with Customize (`custom`) | Leave | Same as Quick start. |
| Share your contest (`share`) | Leave | Steps "Share it", "Print entry poster", "Print yard sign" unchanged. (Contest page share still uses `/c/<slug>`.) |
| Approve and decline entries (`approve`) | **Re-record (recommended)** | Step "Now tap Entries": the screen now opens with the **Add homes yourself** card above the Entries card (C1) and an **Added by organizer** tag on those entries (C2). The video neither shows nor mentions it, and organizers will ask. Re-record the Entries step (about 15 seconds of new narration: "Already taking registrations somewhere else? Paste the addresses under Add homes yourself, tap Check addresses, then Add homes."). Or leave this video and make the new video below. |
| Edit your contest and change the dates (`edit`) | Leave | Overview Schedule and Change dates unchanged. |
| Run voting (`voting`) | Optional | Step "Controls": the card now has a third row, **Contest page, Unpublish** (C3), after Pause voting and Vote counts. Narration is not wrong. If you re-record, add: "Unpublish hides the whole contest from the public and the map; you can publish it again." |
| Add co-organizers and judges (`team`) | Leave | Team and Judges tabs unchanged. |
| Announce winners (`announce`) | Optional | After announcing, podium homes can buy a Featured pin (C5) but the video never shows that and nothing on screen changed. Add one closing sentence only if you want to promote it: "Winning homes can optionally be featured on the map." Check with the attorney item first (Terms wording is still open). |
| Read your contest activity (`activity`) | Leave | |

### Sponsors and installers
| Video | Verdict | What changed and what to do |
|---|---|---|
| Add sponsors and logos (`sponsors`) | Leave | |
| Presenting installer and quote requests (`installer`) | Leave | |
| Installer profiles and "Installed by" (`installer-profile`) | Optional | Step "Search for a home that does": the home card tag colours changed (C12); a claim link shows only on sweep homes (C4). |

### Post events and homes
| Video | Verdict | What changed and what to do |
|---|---|---|
| Add an event to the map (`add-event`) | Leave | Add flow unchanged. After posting, the event can be shared with a preview page (C7); not shown. |
| Show off your house (`showcase`) | Optional | The normal flow is unchanged. The new claim path (C4) starts the same form with the address filled in and a "You are claiming ..." line on the first step. A short second video or help article is better than changing this one. |

## New videos worth making (all optional, in this order)
1. **Add your city's homes yourself** (organizers, about 1:30): Dashboard > Entries > Add homes yourself: paste one address per line (`Street, City, ZIP | Name`), Check addresses (Found / Not found / Already in), tick "These residents agreed to have their address shown", Add N homes; the "Added by organizer" tag; they appear on the ballot and routes with no photo; not possible once voting starts. Covina asked for exactly this.
2. **Claim your home** (about 1:00): map card > Is this your home? Claim it > add your display > approval replaces the automatic listing. Needs a sweep-found home in the demo data.
3. **Unpublish and publish again** (about 0:45, or add to Run voting): Controls > Contest page > Unpublish > tap again; Overview notice > Publish it again.
4. **Feature your event or home** (about 1:30): /pricing, /feature, pick the event or podium home, the three plans, Stripe page. Wait until the $10 live test purchase has passed.

## Pages that mirror the videos
- **/tutorials page** (`public/tutorials.html`, `tutorials.json`): no change needed; video titles and groups still match. If you add the new videos, add them to `tutorials.json` (see `docs/tutorials.md`).
- **Help Center articles** (rows in the `help_articles` table; edit in Admin > Help Center; a migration may change only rows still `updated_by = 'seed'`, see `docs/help-updates.md`). Written steps that need a sentence added: `approve-and-decline-entries` (C1, C2), `run-voting` (C3), `show-off-your-house` (C4), `your-profile` (C9), `is-it-free` (C5, C6: Featured is the only paid option, homes qualify only after a contest), `install-the-app` (C10). New "answer" articles would help: "Can I add homes for my city?", "Is this my home? How do I claim it?", "How do I unpublish a contest?". Done 2026-11-06: text in `scripts/help/updates.mjs`, migration 0167. Video links are still to add once the new videos exist.
- **Pricing and Featured pages** (`/pricing`, `/feature`): already current.

## If you re-record
Use `docs/tutorials.md` and `docs/tutorial-standard.md`. Order of value: `approve` (re-record), `profile` (small re-record), then the new organizer video. Everything else can wait for the next full refresh. Record in day mode, after merging this pass, so the darker tag colours (C12) are what viewers see.

---

## 2026-11-06 (second change): pricing tiers, event banner, installer Top of the list

The owner re-records after the pricing PR is live. Videos are `public/tutorials/<id>.mp4` (+ `-mobile`), built by `scripts/tutorials/*.mjs`; a Help article attaches one through its Video field.

## Videos out of date (id, step)
| Video (file) | Script | Steps that show old screens or wording |
|---|---|---|
| `feature` (`post-feature`) | `scripts/tutorials/videos2.mjs` (`S.feature`) | "Pick a plan": there are now four event plans (Featured pin, Banner + Featured pin, Top of the list + Featured pin, Top of the list + Banner + Featured pin) each listing its contents, not three; the narration says "a Featured event gets a gold ringed pin" only. "Tap a plan" (`#plans [data-pick] nth=1`) now picks the banner plan. The picker hovers `#plans [data-p]` 0 to 2, so add a fourth and check the selector (the plan grid has no `id="plans"`). "Tap Continue to payment": the button now reads "Pay <price> on Stripe" and the confirm screen shows the start, end and total. Recap "Featured is the only paid option": wrong, installers can also sponsor. Mention the banner and the exact dates. |
| `add-event` (`post-event`) | `scripts/tutorials/post-events-homes.mjs` | The review step's "Make it stand out" plan tiles are new (four tiers, loaded for the event's dates), if the take shows that step. |
| `find-map`, `find-night`, `find-app`, `find-pro` (any take that shows the top of the map list) | `scripts/tutorials/*.mjs` | The strip's dashed pill now says "Advertise here" (was "Installers: advertise here") and event pills labelled "Featured" can appear in it. Check screenshots/poster frames. |
| `installer` (`sponsors-installer`), `profile` / installer dashboard takes | `scripts/tutorials/sponsors-installers.mjs` | Only if a take opens the Sponsor placement card or /sponsor: three plans now (Banner, Top of the list, Banner and top of the list) and the new "both together" upgrade line. No take shown today names a price. |

## Help articles changed by migration 0184 (seed-only; paste text in `docs/help-updates.md`)
- `is-it-free`, `feature-an-event-or-home`, `sponsor-your-installer-company` (new tiers, no prices written), `automatic-renewal-for-installers` (one sentence: renews the same plan).
- **Needs a video linked:** `sponsor-your-installer-company` has no video yet (record "sponsor" and set its Video field). `feature-an-event-or-home` is linked to `post-feature`, which is now out of date (above): re-record, same file name, no change to the Video field.

### Done (2026-11-06, after the pricing PR went live)
- `feature` (Feature your event or home) re-recorded in place against the new feature page: four plans with their contents, Which event?, the confirm screen with exact dates and total, stops at Pay on Stripe (request held, nothing sent). Narration quotes no prices and uses no old plan names ("see the Pricing page"). Same file name `post-feature`, phone version too.
- `sponsor` (Sponsor your installer company, new, Sponsors and installers group, `sponsors-sponsor`): menu, Promote, See all pricing, Choose on the installer section, your company, the three plans, dates and the optional renewal box (off by default), stops at Continue to payment (held). Phone version too. Linked to the Help article by migration 0185.
- `installer-profile` re-recorded (end card now leads to the sponsor video; the map list now shows the new strip with the Sponsor pill and Advertise here).
- Left as they are: `find-map`, `find-night`, `find-app`, `find-pro` (the older takes show no strip at all, so no wrong pill or plan is visible), `add-event` (the recorder stubs `/api/config`, so the plan tiles never appear in it), `installer` (opens no placement card). The on-screen plan cards and confirm screens in `feature` and `sponsor` do show the current prices; re-record those two if prices change.

## Contest passes (2026-11-07): which videos are now out of date
The contest wizard now says where the organization stands in its 12-month window on the Review screen and, when a contest would go over what the window allows, shows the pass picker instead of creating it. Pricing has a new Contest organizers card.
| Video (id) | Verdict | Why |
|---|---|---|
| Create a contest with Quick start (`quick` / `run-quick`) | **Re-record (recommended)** | Its last steps are the **Review** screen and **Create contest**. The Review screen now carries a line under the trust note ("Your first contest in a 12-month window is free", or "This is contest N of M in your 12-month window") and, for an organization that has used its free contest, the pass picker with Choose buttons. The narration "Check your details and tap Create contest" is still true for a first contest, but it never mentions the pass. Add one sentence: "Your first contest is free; to run more in a 12-month window you choose a pass." Record with an account that has no live contest (shows the free line). |
| Create a contest with Customize (`custom` / `run-custom`) | **Re-record (recommended)** | Same Review screen and Create contest step as Quick start. |
| Feature your event or home (`feature`) | Optional | It opens on the Pricing page, whose page layout changed: a new **Contest organizers** card (Free, three passes, More than 20) sits below Installers, so the scroll position and page length differ. The event cards it uses are unchanged. |
| Sponsor your installer company (`sponsors-sponsor`) | Optional | Same Pricing page change. The installer cards it uses are unchanged. |
| Unpublish and publish again (`unpublish`) | Leave | Publishing again does not count the contest a second time, so the video is still true. If the demo organization was past its free contest, "Run it again" would show the pass link; the video does not use it. |
| Everything else | Leave | The Admin Contest passes panel is not in any video. |
Not covered by a video, so nothing to re-record: the new `/contest-pass` page and the "Run it again" pass message.

## Full audit and re-record (2026-11-08)
Every Help article and every tutorial video was checked against the app as it is today.
- **Help articles (54):** 43 updated, 11 verified accurate, by migration `0199_help_audit_2026-11-08.sql` (seed-only: `WHERE updated_by='seed'`, so Admin edits are never overwritten). Paste-ready text is in `docs/help-updates.md`.
- **Videos (31):** all re-recorded, computer (2560x1440) and phone (1080x1920) versions, Kokoro voice `af_heart`, because the header, the account menu and the contest pages had changed. Merged in batches of three or more after a review of the first frame, the voice start, the captions and a contact sheet.
- **Recorder fixes:** the long "To begin, open your web browser..." opening is used only in the map video (the others say "Start at SoCal Lights dot app"); narration is split in two parts so the tap follows the "tap" sentence (voice and picture in step); `accountMenuSteps` in `record.mjs` swaps the "..." menu for the account circle menu on signed-in videos; each recording port has its own database copy (`/tmp/state-<port>`); seeds for add-homes and feature.
- **Title change:** `pro-filter` is now "Find professionally installed homes".
- **Length limits:** 5:00 for every video except Customize (8:00, `maxSeconds`).
- **Not changed (app code, out of scope):** `public/manifest.webmanifest` had a shortcut named "My night"; renamed to "Favorites" later the same day.
