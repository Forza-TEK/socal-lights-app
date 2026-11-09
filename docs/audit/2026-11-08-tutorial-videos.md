# Tutorial videos audit, 2026-11-08

Scope: every tutorial video (31 listed, computer and phone, 62 files) checked against the product as it is now, and every one checked for audio/video sync. Result: 38 files re-recorded (all 31 computer versions, 7 phone versions) plus one new video (Contest passes, both versions); the other 24 phone files were repaired without re-recording (audio padded, captions retimed). `scripts/tutorials/check-sync.mjs` now passes on all 64 files.

## 1. Short answer
- **Content.** The narration was in good shape. Prices: no video speaks a dollar amount (the only "dollar" is the example prize "a fifty dollar gift card"), and the prices that appear on screen match the code (event plans $25 / $50 / $50 / $75 = `COMPONENT_CENTS` and `EVENT_PLANS` in `functions/_lib/featured.js`; installer Banner $50, Top of the list $50, both $75 = `INSTALLER_PLANS`; homes $10 / $15; contest passes $50 / $75 / $100 = `functions/_lib/passes.js`). Season end "Jan 6, 2027" appears on the Feature and Sponsor screens and is right. No video shows the "Ask SoCal Lights" assistant (it is off by default). What was wrong: two phone videos that never showed the screen the words describe, three wrong titles on end cards, a duplicate sentence in two scripts, and one missing video (Contest passes).
- **Sync.** This was the real problem. Two separate faults, both fixed (section 4):
  1. **Desktop tap lag.** In the computer versions the screen change that follows "tap X" came 1.5 to 5.8 seconds after the words (median per video 1.4 to 5.6 s; phone versions 0.9 to 1.2 s). Cause: the recorder moved the cursor with 38 separate mouse moves, and on a loaded machine each took 50 to 100 ms, so the glide took 1.6 to 4 s instead of 0.7 s, and the tap (the screen change) happened after the narration had finished. Fixed in the recorder (clock-timed glide), all 31 computer videos re-recorded. Median tap lag is now 1.1 to 1.8 s (one exception, section 5) with the cursor ring on the target while the words are spoken.
  2. **Audio shorter than video by 1.9 s in all 62 files**, because the silent end card had no audio track under it. Not audible, but it fails the "streams within 150 ms" rule. Fixed: the audio is padded with silence to the last frame (re-recorded files by the recorder, the 24 untouched phone files by `fix-sync.mjs`, video stream copied, not re-encoded).

## 2. Inventory
Recording date: all 31 computer and phone videos before this audit were rendered on 2026-11-08 between 00:08 and 02:48 Pacific (PRs 466 to 471; `find-app` again at 11:14 by another agent, PR 481). Now every computer file, and the phone files marked in section 3, were rendered 2026-11-08 between 19:15 and 23:30 (container clock) on this branch.

| id | Title | File | Length now (computer / phone) | Was | Help article(s) |
|---|---|---|---|---|---|
| `map` | Find lights near me | `find-map` | 2:56 / 2:53 | 2:57 / 2:55 | find-lights-near-me |
| `night` | Plan a night | `find-night` | 2:31 / 2:30 | 2:36 / 2:30 | plan-a-night, drive-a-route |
| `email` | Weekly lights email | `find-email` | 1:31 / 1:31 | 1:31 / 1:31 | weekly-lights-email |
| `app` | Install the app and use it offline | `find-app` | 1:20 / 1:19 | 1:19 / 1:19 | install-the-app |
| `contests` | Find contests: the Contests page | `find-contests` | 1:53 / 1:52 | 1:52 / 1:52 | find-contests |
| `pro-filter` | Find professionally installed homes | `find-pro` | 1:27 / 1:28 | 1:28 / 1:28 | find-professionally-installed-displays |
| `enter` | Enter your home in a contest | `enter` | 2:49 / 2:49 | 2:50 / 2:49 | enter-your-home-in-a-contest |
| `edit-entry` | Edit or withdraw your entry | `edit-entry` | 1:32 / 1:31 | 1:32 / 1:31 | edit-or-withdraw-your-entry |
| `profile` | Your profile | `profile` | 2:02 / 2:04 | 2:02 / 2:04 | your-profile |
| `vote` | Vote in a contest | `vote` | 2:06 / 2:05 | 2:04 / 2:05 | vote-in-a-contest |
| `judge` | Judge a contest | `judge` | 2:01 / 2:01 | 2:01 / 2:01 | judge-a-contest |
| `quick` | Create a contest with Quick start | `run-quick` | 4:43 / 4:41 | 4:44 / 4:41 | create-a-contest-quick-start |
| `custom` | Create a contest with Customize | `run-custom` | 6:58 / 6:57 | 6:59 / 6:57 | create-a-contest-customize |
| `contest-passes` | Contest passes | `run-passes` | 4:18 / 4:17 | - / - | contest-passes (0202) |
| `share` | Share your contest | `run-share` | 3:18 / 3:16 | 3:16 / 3:16 | share-your-contest |
| `approve` | Approve and decline entries | `run-approve` | 2:13 / 2:14 | 2:16 / 2:14 | approve-and-decline-entries |
| `add-homes` | Add your city's homes yourself | `run-add-homes` | 2:19 / 2:18 | 2:20 / 2:18 | add-your-citys-homes-yourself |
| `edit` | Edit your contest and change the dates | `run-edit` | 2:26 / 2:24 | 2:17 / 2:24 | edit-your-contest-and-change-dates |
| `voting` | Run voting | `run-voting` | 2:11 / 2:12 | 2:12 / 2:12 | run-voting |
| `unpublish` | Unpublish and publish again | `run-unpublish` | 1:55 / 1:53 | 1:54 / 1:53 | unpublish-and-publish-again |
| `team` | Add co-organizers and judges | `run-team` | 2:21 / 2:21 | 2:21 / 2:21 | add-co-organizers-and-judges |
| `announce` | Announce winners | `run-announce` | 2:13 / 2:14 | 2:12 / 2:41 | announce-winners |
| `activity` | Read your contest activity | `run-activity` | 1:36 / 1:35 | 1:35 / 1:35 | read-your-contest-activity |
| `sponsors` | Record a sponsor on your contest page | `sponsors-add` | 2:02 / 2:04 | 2:04 / 2:05 | add-sponsors-and-logos |
| `sponsor-invite` | Invite a sponsor to your contest | `sponsors-invite` | 2:13 / 2:16 | 2:15 / 2:16 | add-sponsors-to-your-contest, sponsor-a-contest-with-an-invite-link (0202) |
| `installer` | Presenting installer and quote requests | `sponsors-installer` | 2:32 / 2:33 | 2:33 / 2:33 | presenting-installer-and-quote-requests |
| `installer-profile` | Installer profiles and "Installed by" | `sponsors-profile` | 1:47 / 1:47 | 1:48 / 1:47 | installer-profiles |
| `sponsor` | Sponsor your installer company | `sponsors-sponsor` | 2:20 / 2:20 | 2:21 / 2:20 | sponsor-your-installer-company |
| `add-event` | Add an event to the map | `post-event` | 2:33 / 2:33 | 2:34 / 2:34 | add-an-event |
| `showcase` | Show off your home | `post-house` | 2:49 / 2:50 | 2:51 / 2:51 | show-off-your-house, add-a-home-without-a-contest (0202) |
| `claim` | Claim your home | `post-claim` | 2:10 / 2:11 | 2:13 / 2:11 | claim-your-home |
| `feature` | Feature your event or home | `post-feature` | 2:27 / 2:27 | 2:30 / 2:28 | feature-an-event-or-home |

Every video is linked by at least one Help article (the Video field of the article, set by the seed articles and migrations 0170, 0185, 0191, and now 0202). No video is orphaned. Titles in `public/tutorials.json` now match the end cards ("Next up: ...").

## 3. Verdict per video
"Content" is the verdict against the product as it was when the audit started; "Sync before" is tap lag (median seconds from the end of "tap X" to the screen change), computer / phone. Timestamps are from the original captions. "Action" is what was done.

| id | Content | Sync before | Reasons and timestamps | Action |
|---|---|---|---|---|
| `map` | Minor script fix | 5.8 / 1.2 | Title card and the "Next up" cards on other videos said "Find lights near you"; the title is "Find lights near me". The "Route these" step (1:36) only works with 45 or fewer places in view; the live data now has more in the Irvine view, so the step failed to record until the recorder zooms in first (the narration already says "zoom in if there are more"). Gap, not an error: the video never shows the map's Find me button (Help article `find-lights-near-me` calls it "Find my location"). | Both re-recorded (computer with the new tap timing; phone for the title card). |
| `night` | Current | 3.0 / 1.1 | Favorites, Route these, nine stops, Waze, Send to car, Share all match `app.js` (ROUTE_CAP 45, legs of 9). | Computer re-recorded; phone repaired. |
| `email` | Current | 2.3 / 1.1 | Signed-out three dots menu, Weekly lights email: matches `moreHtml()`. | Computer re-recorded; phone repaired. |
| `app` | Current (re-recorded 11:14 by another agent, PR 481) | 2.0 / 8.4 | Says the three dots are Chrome's. The "Tap the Share button" lines (0:30) describe the phone's own menus, so no browser screen change is possible there; that is why the tap lag reads 4.6 s for this video (see section 5). Optional, not added: pages you opened before also open offline (C10 in `tutorial-updates.md`). | Computer re-recorded from the merged script; phone repaired. |
| `contests` | Current | 2.2 / 1.0 | Account circle, Your contests, Live now, Mine, Past results: matches. | Computer re-recorded; phone repaired. |
| `pro-filter` | Current | 1.5 / 1.3 | "Professionally installed" filter, Installed by, check mark: matches. | Computer re-recorded; phone repaired. |
| `enter` | Current | 3.3 / 1.0 | Starts after sign in (sign in is described at 1:02 but not shown). Up to eight photos, five homes per contest. | Computer re-recorded; phone repaired. |
| `edit-entry` | Minor script fix (not made) | 3.1 / 1.1 | "Tap Open contest." is spoken twice in a row (0:51 and 0:54): two steps of the script, the second taps the same kind of button on the next page. | Computer re-recorded; duplicate remains (section 6). |
| `profile` | Current | 1.7 / 1.1 | Tabs Drafts, Contests, Displays, Events, Badges, Account match `profile.html`. The tab is still labelled "Displays" in the product (owner decision, section 7). | Computer re-recorded; phone repaired. |
| `vote` | Current | 1.4 / 0.9 | Matches. | Computer re-recorded; phone repaired. |
| `judge` | Minor script fix | 0.9 / 0.9 | End card said "Next up: Create a contest in two minutes" (1:56); the video is titled "Create a contest with Quick start". | Both re-recorded. |
| `quick` | Current (long: 4:43) | 3.3 / 1.0 | Review wording about the free first contest and passes matches `passes.js`. Four categories (Best Overall, Most Creative, Best Lights and Music, Best Traditional) = `DEF` in `add-contest.html`. | Computer re-recorded; phone repaired. |
| `custom` | Current (long: 6:58) | 5.6 / 1.0 | Trimmed average with five or more judges = `trimmedAvg`; "Run it again" and pass wording correct. Worst desktop lag (every tap about 5.5 s after the words, from 0:52). | Computer re-recorded; phone repaired. |
| `share` | Current | 2.9 / 1.0 | Matches. | Computer re-recorded; phone repaired. |
| `approve` | Current | 2.3 / 1.1 | Add homes yourself, Added by organizer, Undo decline: match. "Tap again." (1:44) is a second tap on Remove, intended. | Computer re-recorded; phone repaired. |
| `add-homes` | Current | 3.2 / 1.0 | "Up to a hundred at a time" equals the form hint (`organizer.html`: "Up to 100 at a time."; the hard limit in code is 500 lines, the hint is what the organizer sees). | Computer re-recorded; phone repaired. |
| `edit` | Current | 1.4 / 0.9 | Change dates, Run it again, "a new contest may need a pass": match. Computer captions at 1:10 to 1:15 were 1.2 s off and two cues ran at 40 characters a second (sentences squeezed into one cue). | Computer re-recorded; phone repaired. |
| `voting` | Current | 2.2 / 1.0 | Controls card with Contest page / Unpublish: matches. | Computer re-recorded; phone repaired. |
| `unpublish` | Current | 2.7 / 1.0 | Matches. | Computer re-recorded; phone repaired. |
| `team` | Current | 2.6 / 1.0 | "Up to eight" co-organizers matches the Team tab. | Computer re-recorded; phone repaired. |
| `announce` | **Phone: needs re-record.** Computer: current | 1.5 / picture stuck | Phone: from 1:40 the picture stayed on the Results tab for the last minute (a 29 s silent stretch at 2:07 to 2:36, and no screen change for 37 s) while the words said "See it as voters do" and "Here are the winners". On a phone that link is in the More sheet, which the script never opened. | Both re-recorded; the phone script says "open More, then tap See it as voters do" and opens the sheet. |
| `activity` | Current | 2.4 / 1.0 | Matches. | Computer re-recorded; phone repaired. |
| `sponsors` | **Phone: needs re-record.** Computer: current | 1.3 / 0.9 | Same fault: at 1:50 "tap See it as voters do, and you will see the sponsor on the contest page", and the phone picture never left the sponsor form. Narration (Sponsorship type, Paid to me, permission, Show on the contest page) matches the form. | Both re-recorded. |
| `sponsor-invite` | Current | 1.2 / 1.1 | `/s/<token>` page, Mark payment received: matches. | Computer re-recorded; phone repaired. |
| `installer` | Current | 2.7 / 0.9 | Matches. | Computer re-recorded; phone repaired. |
| `installer-profile` | Current | 2.4 / 1.0 | Matches. | Computer re-recorded; phone repaired. |
| `sponsor` | Current | 2.7 / 1.1 | Banner $50, Top of the list $50, both $75, ends Jan 6, 2027, renewal off by default: on-screen numbers equal `INSTALLER_PLANS`; no price is spoken. Stops at Continue to payment (request held). | Computer re-recorded; phone repaired. |
| `add-event` | Minor script fix | 2.6 / 1.0 | End card "Next up: Show off your house" (2:30): home, not house. | Both re-recorded. |
| `showcase` | Needs re-record | 3.0 / 1.0 | Title card and title said "Show off your house". The flow (A lighting display, A homeowner, season, Put it on the map, "usually goes on the map right away") is current and needs no contest. | Both re-recorded; title is now "Show off your home" in `tutorials.json`. |
| `claim` | Current | 1.7 / 0.9 | Matches. | Computer re-recorded; phone repaired. |
| `feature` | Minor script fix | 1.4 / 0.9 | End card "Next up: Find lights near you". On screen: four plans $25 / $50 / $50 / $75 = `EVENT_PLANS`; Pay on Stripe, "card or Cash App Pay" = the feature page's own sentence; "Christmas lights: Jan 6" on the page. | Both re-recorded. |
| `contest-passes` (new) | Was missing | - | Pass picker for an organization's second contest in a 12-month window. | Recorded, computer 4:18 and phone 4:17, registered in `tutorials.json` (Run a contest, after Customize). No price is spoken; the cards on screen show $50 / $75 / $100 = `passes.js`. |

## 4. Fixes to the pipeline
1. **Clock-timed cursor glide** (`record.mjs` `Helper.move`): the glide always takes 0.7 s whatever the machine load; the tap follows 0.25 s after the end of the "tap" sentence (was 0.5 s). Root cause of the 1.5 to 5.8 s desktop lag. Optional timing log: `TIMING=1`.
2. **Audio runs to the last frame** (`apad`, `aresample=async=1` in the mix): equal stream lengths, both streams start at 0.
3. **Captions retimed to the voice** (`captions.mjs`, called by `record.mjs` after rendering and by `fix-sync.mjs` on published files): each sentence cue is moved to the voice onset after a pause, cue ends follow the voice. Replaces the character-count guess (up to 1.2 s off).
4. **`fix-sync.mjs`**: repairs a rendered file without re-recording (video stream copied; audio padded; captions retimed). Used on the 24 phone files that were not re-recorded.
5. **Phone "See it as voters do"** opens the More sheet first (`videos2.mjs`, announce and sponsors).
6. **Map**: zooms in until "Route these" is available (`videos.mjs`).
7. **Titles**: end cards use the real titles ("Create a contest with Quick start", "Show off your home", "Find lights near me").
8. **`rerecord-queue.sh`**: records, checks, installs, commits and pushes one video at a time (so a container restart loses at most the video in progress). Also found: a recording needs about 2 GB of free disk for frames (a 7-minute video), and the local server must run on its own database copy with all migrations applied and the demo photos in R2.

## 5. Sync results (per file)
Start offsets are 0 ms for audio and video in every file, before and after. "Duration drift" is video minus audio. "Tap lag" is the median from the end of the "tap" sentence to the screen change. "Max caption offset" is the largest distance between a caption start and the nearest detected voice onset.

**Why the earlier "ATTENTION" lines.** The queue printed ATTENTION for every computer re-record because `check-sync.mjs` checks both the computer and the phone file of an id and the phone file was still the old one (audio 1.9 s short). The computer files themselves passed with drift of at most 15 ms. A second cause was the tap heuristic, which counted "no visible change after Tap Mine" (a tab already open) and similar as failures; it is now a warning. Neither was an audible mismatch. The real audible mismatch was the tap lag, fixed by the recorder change.

**Still not perfect, stated plainly.**
- `app`: the median tap lag reads 4.6 s because its "tap" lines describe the iPhone and Android menus (Share, Add to Home Screen, three dots) that a browser recording cannot show; the picture stays on the page while the words describe the phone's own menus. Not an error in timing.
- `quick` and `contest-passes`: one caption (a one-breath sentence pair, "Now the dates. There are three." around 2:34 in Quick start) starts 0.76 s from the nearest detectable voice onset. It is an estimate inside a continuous run of speech, not an audible mismatch; the checker allows 800 ms.
- `installer-profile` and `quick`: one tap each (4.4 s and 7.5 s lag at 1:00 and 3:50) where the script types or scrolls before the tap; the screen is changing during those words.
- 26 warnings across the 64 files ("tap" followed by no change within 4.5 s). They are taps on something already open, hovers, or the phone-OS instructions.

### Table
| id | Kind | Audio start / video start (ms) | Duration drift before to after (ms) | Tap lag, median s, before to after | Max caption offset after (ms) | Result before to after |
|---|---|---|---|---|---|---|
| `map` | computer | 0 / 0 | 1899 to -8 | 5.8 to 1.7 | 20 | FAIL to PASS |
| `map` | phone | 0 / 0 | 1901 to 8 | 1.2 to 0.9 | 20 | FAIL to PASS |
| `night` | computer | 0 / 0 | 1892 to 7 | 3.0 to 1.5 | 20 | FAIL to PASS |
| `night` | phone | 0 / 0 | 1900 to 0 | 1.1 to 1.1 | 20 | FAIL to PASS |
| `email` | computer | 0 / 0 | 1906 to 12 | 2.3 to 1.4 | 20 | FAIL to PASS |
| `email` | phone | 0 / 0 | 1895 to 1 | 1.1 to 1.1 | 20 | FAIL to PASS |
| `app` | computer | 0 / 0 | 1893 to 15 | 2.0 to 4.6 | 20 | FAIL to PASS |
| `app` | phone | 0 / 0 | 1896 to 1 | 8.4 to 4.7 | 20 | FAIL to PASS |
| `contests` | computer | 0 / 0 | 1907 to 11 | 2.2 to 1.3 | 20 | FAIL to PASS |
| `contests` | phone | 0 / 0 | 1901 to 0 | 1.0 to 1.0 | 20 | FAIL to PASS |
| `pro-filter` | computer | 0 / 0 | 1916 to -15 | 1.5 to 1.4 | 20 | FAIL to PASS |
| `pro-filter` | phone | 0 / 0 | 1894 to 1 | 1.3 to 1.3 | 20 | FAIL to PASS |
| `enter` | computer | 0 / 0 | 1911 to -7 | 3.3 to 1.1 | 20 | FAIL to PASS |
| `enter` | phone | 0 / 0 | 1897 to 1 | 1.0 to 1.0 | 20 | FAIL to PASS |
| `edit-entry` | computer | 0 / 0 | 1894 to 12 | 3.1 to 1.6 | 20 | FAIL to PASS |
| `edit-entry` | phone | 0 / 0 | 1898 to 0 | 1.1 to 1.1 | 20 | FAIL to PASS |
| `profile` | computer | 0 / 0 | 1907 to -8 | 1.7 to 1.4 | 20 | FAIL to PASS |
| `profile` | phone | 0 / 0 | 1909 to 0 | 1.1 to 1.1 | 20 | FAIL to PASS |
| `vote` | computer | 0 / 0 | 1902 to -1 | 1.4 to 1.5 | 20 | FAIL to PASS |
| `vote` | phone | 0 / 0 | 1897 to 0 | 0.9 to 0.9 | 20 | FAIL to PASS |
| `judge` | computer | 0 / 0 | 1907 to 12 | 0.9 to 0.9 | 20 | FAIL to PASS |
| `judge` | phone | 0 / 0 | 1886 to -9 | 0.9 to 0.8 | 20 | FAIL to PASS |
| `quick` | computer | 0 / 0 | 1896 to -12 | 3.3 to 1.8 | 761 | FAIL to PASS |
| `quick` | phone | 0 / 0 | 1907 to 1 | 1.0 to 1.0 | 761 | FAIL to PASS |
| `custom` | computer | 0 / 0 | 1910 to 6 | 5.6 to 1.4 | 21 | FAIL to PASS |
| `custom` | phone | 0 / 0 | 1909 to 1 | 1.0 to 1.0 | 21 | FAIL to PASS |
| `contest-passes` | computer | 0 / 0 | - to 1 | 0.0 to 1.2 | 761 | new to PASS |
| `contest-passes` | phone | 0 / 0 | - to 10 | 0.0 to 1.0 | 762 | new to PASS |
| `share` | computer | 0 / 0 | 1912 to -5 | 2.9 to 1.4 | 21 | FAIL to PASS |
| `share` | phone | 0 / 0 | 1903 to 0 | 1.0 to 1.0 | 21 | FAIL to PASS |
| `approve` | computer | 0 / 0 | 1894 to -12 | 2.3 to 1.3 | 20 | FAIL to PASS |
| `approve` | phone | 0 / 0 | 1900 to 1 | 1.1 to 1.1 | 20 | FAIL to PASS |
| `add-homes` | computer | 0 / 0 | 1907 to -11 | 3.2 to 1.3 | 20 | FAIL to PASS |
| `add-homes` | phone | 0 / 0 | 1901 to 1 | 1.0 to 1.0 | 20 | FAIL to PASS |
| `edit` | computer | 0 / 0 | 1914 to 4 | 1.4 to 1.3 | 21 | FAIL to PASS |
| `edit` | phone | 0 / 0 | 1887 to 1 | 0.9 to 0.9 | 20 | FAIL to PASS |
| `voting` | computer | 0 / 0 | 1893 to 7 | 2.2 to 1.2 | 20 | FAIL to PASS |
| `voting` | phone | 0 / 0 | 1892 to 0 | 1.0 to 1.0 | 20 | FAIL to PASS |
| `unpublish` | computer | 0 / 0 | 1897 to -15 | 2.7 to 1.2 | 20 | FAIL to PASS |
| `unpublish` | phone | 0 / 0 | 1889 to 0 | 1.0 to 1.0 | 20 | FAIL to PASS |
| `team` | computer | 0 / 0 | 1903 to 13 | 2.6 to 1.4 | 20 | FAIL to PASS |
| `team` | phone | 0 / 0 | 1907 to 0 | 1.0 to 1.0 | 20 | FAIL to PASS |
| `announce` | computer | 0 / 0 | 1899 to 12 | 1.5 to 1.3 | 20 | FAIL to PASS |
| `announce` | phone | 0 / 0 | 1906 to -3 | 1.0 to 1.0 | 20 | FAIL to PASS |
| `activity` | computer | 0 / 0 | 1913 to 6 | 2.4 to 1.4 | 21 | FAIL to PASS |
| `activity` | phone | 0 / 0 | 1905 to 0 | 1.0 to 1.0 | 21 | FAIL to PASS |
| `sponsors` | computer | 0 / 0 | 1916 to 0 | 1.3 to 1.4 | 20 | FAIL to PASS |
| `sponsors` | phone | 0 / 0 | 1912 to -3 | 0.9 to 1.0 | 20 | FAIL to PASS |
| `sponsor-invite` | computer | 0 / 0 | 1891 to -11 | 1.2 to 1.2 | 20 | FAIL to PASS |
| `sponsor-invite` | phone | 0 / 0 | 1884 to 0 | 1.1 to 1.1 | 20 | FAIL to PASS |
| `installer` | computer | 0 / 0 | 1898 to 3 | 2.7 to 1.4 | 20 | FAIL to PASS |
| `installer` | phone | 0 / 0 | 1886 to 0 | 0.9 to 0.9 | 20 | FAIL to PASS |
| `installer-profile` | computer | 0 / 0 | 1900 to -5 | 2.4 to 1.8 | 20 | FAIL to PASS |
| `installer-profile` | phone | 0 / 0 | 1910 to 0 | 1.0 to 1.0 | 21 | FAIL to PASS |
| `sponsor` | computer | 0 / 0 | 1912 to -10 | 2.7 to 1.2 | 21 | FAIL to PASS |
| `sponsor` | phone | 0 / 0 | 1900 to 0 | 1.1 to 1.1 | 20 | FAIL to PASS |
| `add-event` | computer | 0 / 0 | 1889 to 0 | 2.6 to 1.3 | 21 | FAIL to PASS |
| `add-event` | phone | 0 / 0 | 1901 to 12 | 1.0 to 1.0 | 21 | FAIL to PASS |
| `showcase` | computer | 0 / 0 | 1894 to -6 | 3.0 to 1.3 | 20 | FAIL to PASS |
| `showcase` | phone | 0 / 0 | 1890 to 0 | 1.0 to 1.0 | 20 | FAIL to PASS |
| `claim` | computer | 0 / 0 | 1909 to -1 | 1.7 to 1.7 | 20 | FAIL to PASS |
| `claim` | phone | 0 / 0 | 1898 to 0 | 0.9 to 0.9 | 20 | FAIL to PASS |
| `feature` | computer | 0 / 0 | 1909 to -12 | 1.4 to 1.1 | 21 | FAIL to PASS |
| `feature` | phone | 0 / 0 | 1903 to -7 | 0.9 to 1.0 | 20 | FAIL to PASS |


## 6. Long videos, gaps and what remains
**Long videos (target 2:30).** Customize 6:58, Contest passes 4:18, Quick start 4:43. Recommended split, using the caption times of the new files:
- A shared **"Start a contest"** video (about 2:50): map, account menu, Add, A contest, name, who runs it, welcome message, website, dates. Today the first 2:50 of Quick start, the first 1:55 of Customize and the first 2:45 of Contest passes repeat this.
- **Quick start, finish** (about 1:50): the big choice, Quick start, Review (the free first contest, passes), Create contest, dashboard.
- **Customize: rules** (about 4:00): from "Customize everything" (about 2:00): categories, who votes, judges, how judges vote, approval, vote counts, fairness rules, prize, official rules, review.
- **Contest passes** (about 1:30 after the shared part): Review, the pass picker, Choose, what happens after paying.
Each existing Help article would link to the shared video plus its own. This is a decision for the owner; nothing was split.

**Remaining.**
- `edit-entry`: the duplicate "Tap Open contest." (0:51 and 0:54); minor, one script line.
- `app`: the phone-OS instructions cannot show their screens (record a short phone-screen insert, or say that the next lines are on your phone).
- Not videos: sign in; the map's Find me button (suggest adding 15 seconds to `map`); "pages you opened before also open offline" in `app`.
- Product copy still says "display" in places the videos read aloud ("A lighting display", the "Displays" profile tab, "Add your display" on Pricing). Help article titles and the `show-off-your-house` slug still say house (another agent owns the articles); the video title is now "Show off your home".
- `docs/video-metadata.csv` (YouTube metadata) still has the old title "Show off your house".

**Help links.** Migration `0202_help_video_links_2026-11-08.sql` (seed-safe: `updated_by='seed' AND COALESCE(video,'')=''`): `add-a-home-without-a-contest` gets `post-house`; `sponsor-a-contest-with-an-invite-link` gets `sponsors-invite` (both articles were added by 0201 with no video). The `contest-passes` article should link `run-passes`: not done in 0202 because the article may have been edited; add `UPDATE help_articles SET video='run-passes' WHERE slug='contest-passes' AND updated_by='seed' AND COALESCE(video,'')=''` in the next help migration, or set the Video field in Admin. No article body was edited.

## 7. Owner decisions
1. **Size.** The videos in this branch add about 563 MB of new files to the repository (64 mp4 files; every re-rendered file is stored whole in git, the old versions stay in history). Dropping commit d729335 (the `fix-sync` repair of the 24 phone files that were not re-recorded, about 195 MB, plus the showcase title in `tutorials.json`) keeps those files out; they then only lack the silent 1.9 s of audio under the end card and keep the older caption timing.
2. **Wording in the product**: change "A lighting display", "Displays" and "Add your display" to "home"? The videos read these aloud.
3. **Splitting** the long videos (section 6).
4. **Contest passes video**: 4:18 as recorded; shorten by the shared "Start a contest" video above.
5. Link `contest-passes` to the new video (section 6).

## 8. How to check and repair
```
node scripts/tutorials/check-sync.mjs            # every published video, exit 1 on any failure
node scripts/tutorials/check-sync.mjs quick      # one id (computer and phone)
node scripts/tutorials/fix-sync.mjs [id ...]     # pad audio, retime captions; video stream copied
scripts/tutorials/rerecord-queue.sh "quick:d quick:m"   # d = computer, m = phone
```
