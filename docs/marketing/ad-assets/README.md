# Facebook and Instagram ad creative (rebuilt 2026-11-09, PR 501)

Everything is the app's own rendering: the live site https://socallights.app, the local copy of the current `origin/main` with the tutorial demo data, or the owner's real iPhone recordings. No stock images, no illustrations, no hidden or reworded UI, no "Example" labels. Nothing is uploaded to Meta.

## Sources and layout proof
| Asset | Source | Captured | Layout comparison (iPhone 17 Pro Max 440x956, live vs local copy) |
|---|---|---|---|
| a02 city page (San Diego, 46 upcoming events, the most of the cities checked in /api/events) | live site | 2026-11-09 | live only |
| a03 contest entry page (real "Holiday Home Lighting Contest 2026", Mission Viejo) | live site | 2026-11-09 | live only |
| a05 installer profile, Lights Up Today | live site | 2026-11-09 | live only. **Needs the company's written okay before it runs as a paid ad (owner to confirm).** |
| a10 "This weekend" list | live site | 2026-11-09 | live only |
| a04 QR poster | local demo contest, app-drawn poster from the organizer dashboard; QR encodes https://socallights.app/contests?src=qr; no banner | 2026-11-09 | same `public/printables.js` as production; the live site has no organizer view to compare |
| a06 add-a-home | local copy (demo homeowner cookie, iPhone 17 Pro Max emulation). Sample values: Irvine City Hall address, "The Sample family". It presses "Put it on the map" on the LOCAL database only, then finds the home by search; the map flies to street level and shows its card | 2026-11-09 | /in/san-diego: 0.23 % of pixels differ (live also shows the assistant button); same CSS/JS versions on both (`styles.css?v=20261110d`, `app.js?v=20261110e`); the installer page cannot be compared (the demo database has no such installer) |
| a07, a08, a09 | the owner's real iPhone recordings (`docs/marketing/owner-videos/`), used as recorded | 2026-11-09 | n/a (real device) |

Difference found between live and local: only the assistant button's stylesheet (`chat.css`) is loaded on the live site. Nothing was fixed by editing UI.

## Files, placements, sizes
Stills: 1080x1350 (feed, 4:5) and 1080x1920 (Story, 9:16, in `a11-story-versions/`). The whole 1320x2868 phone capture is placed uncropped on a blurred copy of itself, headline and call to action only on the background. Stories keep text below the top 14% and away from the bottom 20%.

| Asset | Files | Ad ids | Placement |
|---|---|---|---|
| a01 | `a01-page-images/a01-facebook-profile-1080x1080.png`, `a01-facebook-cover-1640x624.png` | Page | Page |
| a02 | `a02-city-page/a02-city-page-san-diego-4x5-1080x1350.png`, Story in `a11-story-versions/` | ev-a-meta, ev-b-meta | feed, Story |
| a03 | `a03-contest-screens/a03-contest-entry-page-4x5-1080x1350.png`, Story in a11 | ct-a-meta, ct-c-meta | feed, Story |
| a04 | `a04-qr-poster/a04-qr-poster-4x5-1080x1350.png`, Story in a11 | ct-b-meta | feed, Story |
| a05 | `a05-installer-profile/a05-installer-profile-lights-up-today-4x5-1080x1350.png`, Story in a11 | in-a-meta, in-b-meta | feed, Story |
| a10 | `a10-weekend-list/a10-weekend-list-4x5-1080x1350.png`, Story in a11 | fa-c-meta | feed, Story |
| a06 add a home | `a06-add-home-video/a06-add-home-{feed-4x5,story-9x16,reel-9x16}.mp4` | ho-a-meta, ho-c-meta | feed, Story, Reel |
| a07 route | `a07-route-video/a07-route-{feed-4x5,story-9x16,reel-9x16}.mp4` | ho-b-meta | feed, Story, Reel |
| a08 find lights | `a08-find-location-video/a08-find-location-{...}.mp4` | fa-a-meta | feed, Story, Reel |
| a09 favorites and route | `a09-favorites-video/a09-favorites-{...}.mp4` | fa-b-meta | feed, Story, Reel |

## Videos (step-by-step walkthroughs, rebuilt 2026-11-09)
All four videos (a06 add a home, a07 route, a08 find lights, a09 favorites) are now real walkthroughs recorded on the LOCAL copy of the current app (iPhone 17 Pro Max emulation, demo data, tap rings drawn on every tap). Each step is narrated and captioned with the app's own labels, and the tap happens 0.3 s after the narration clip starts. Lengths: feed and Story 29 to 35 s, Reel 40 to 44 s (including the 3 s socallights.app end card).
- a09 favorites: tap the heart on a place, save more, open Favorites with the heart in the bottom menu, Route these, the route sheet, then the finished route in Apple Maps (the owner's real iPhone recording, a clean 2.8 s part with the route line, stop count and time; no turn-by-turn or messages screen). Reel adds the maps-app picker (Apple, Google, Waze).
- a07 route: Find my location, Route these on the map, the route sheet ("nine at a time"), the maps-app picker, the finished route in Apple Maps. Reel adds "Then tap Open" and "A longer trip is split into more routes".
- a08 find lights: Find my location, pull up the list, This weekend, Free, open a place; the Reel adds Directions and the maps-app switch.
- a06 add a home: Sign in (emailed code: the email box is shown, the code step is not recorded, a demo session stands in for it), who is posting, name, season, details, street and ZIP, Put it on the map (local database only), the map at street level with the home's card. The photos step is recorded but cut.
- Every cut shows the whole recorded frame; Reels end on a plain `socallights.app` card. Handoff caption "Your phone switches to the map app you choose: Apple Maps, Google Maps or Waze." from the Route/Directions step on.
- Narration: Kokoro `af_heart`, speed 0.88, "SoCal Lights dot app", short pause after "Free" (owner-approved settings, commit 17c9568). Music: owner mapping a06 and a08 = A, a09 = C, a07 = B (original, license-free). Mix about -14 LUFS, true peak under -1 dBTP, AAC 192k 48 kHz.
- Privacy scan (added 2026-11-09): `walk.mjs` scans every visible text line after every step for street-address-like titles and "Ring of Lights" contest homes and logs them (`PRIVACY-SCAN` in the recording output). a07 filters to Filters > Tree lightings and villages first, so its route sheet lists three public events only; a09's sheet lists the three events the viewer saved; a08's only match is the public venue address of Roger's Gardens (a business) on the place card; a06 shows only the demo form values (Irvine City Hall address, "The Sample family") and the demo account's prefilled name. Route sheets of a09, a08 and the a07 Reel were also checked in a full-resolution frame.
- The Apple Maps scenes (a07, a09) show the destination "28000 Rancho Pkwy" (a public place) and the owner's phone status bar; they stop before any turn-by-turn or messages screen.
- a06 sign-in uses the fake address demo@example.com, the email code step is not recorded, and the local copy's spam-check widget is replaced by nothing (it cannot load locally).

### Loudness, durations, speech-recognition match (vosk small model; "SoCal" is heard as "so cow", expected)
| Cut | Size | Video / audio duration | Streams aligned (start 0, within 40 ms) | LUFS | True peak dBFS | Script words recognised | File |
|---|---|---|---|---|---|---|---|
| a06 feed | 1080x1350 | 34.50 / 34.47 s | yes | -14.0 | -1.4 | 61/63 | 2.08 MB |
| a06 story | 1080x1920 | 34.50 / 34.47 s | yes | -14.0 | -1.4 | 61/63 | 2.57 MB |
| a06 reel | 1080x1920 | 43.60 / 43.57 s | yes | -14.0 | -1.3 | 74/76 | 2.92 MB |
| a07 feed | 1080x1350 | 30.60 / 30.57 s | yes | -14.2 | -1.2 | 49/51 | 3.47 MB |
| a07 story | 1080x1920 | 30.60 / 30.57 s | yes | -14.2 | -1.2 | 49/51 | 4.48 MB |
| a07 reel | 1080x1920 | 45.53 / 45.53 s | yes | -14.0 | -1.2 | 72/75 | 5.24 MB |
| a08 feed | 1080x1350 | 28.60 / 28.57 s | yes | -14.1 | -1.4 | 48/49 | 2.98 MB |
| a08 story | 1080x1920 | 28.60 / 28.57 s | yes | -14.1 | -1.4 | 48/49 | 3.82 MB |
| a08 reel | 1080x1920 | 40.03 / 40.03 s | yes | -14.0 | -1.2 | 62/63 | 4.35 MB |
| a09 feed | 1080x1350 | 32.60 / 32.60 s | yes | -14.0 | -1.4 | 66/67 | 3.03 MB |
| a09 story | 1080x1920 | 32.60 / 32.60 s | yes | -14.0 | -1.4 | 66/67 | 3.83 MB |
| a09 reel | 1080x1920 | 43.00 / 42.97 s | yes | -14.0 | -1.3 | 78/81 | 4.25 MB |

| Cut | Cue (narration) | Spoken at (ASR, s) | On-screen action (s) | Action minus words (ms) | Result (target -100 to +400) |
|---|---|---|---|---|---|
| a06 feed | Is your home all lit up? | 0.12 | no on-screen cue | - | - |
| a06 feed | Tap Sign in, and use an emailed code. | 1.95 | 2.039 | 89 | PASS |
| a06 feed | Choose who is posting: a homeowner. | 7.77 | 7.879 | 109 | PASS |
| a06 feed | Add the name to show. | 10.56 | 10.565 | 5 | PASS |
| a06 feed | Name your home, and say what makes it special. | 12.9 | 12.942 | 42 | PASS |
| a06 feed | Add the street, and the ZIP code. | 16.53 | 16.563 | 33 | PASS |
| a06 feed | Check everything, then tap Put it on the map. | 19.53 | 19.624 | 94 | PASS |
| a06 feed | And there it is, on the map. | 22.44 | 22.494 | 54 | PASS |
| a06 feed | Free, on SoCal Lights dot app. | 31.56 | no on-screen cue | - | - |
| a06 story | Is your home all lit up? | 0.12 | no on-screen cue | - | - |
| a06 story | Tap Sign in, and use an emailed code. | 1.95 | 2.039 | 89 | PASS |
| a06 story | Choose who is posting: a homeowner. | 7.77 | 7.879 | 109 | PASS |
| a06 story | Add the name to show. | 10.56 | 10.565 | 5 | PASS |
| a06 story | Name your home, and say what makes it special. | 12.9 | 12.942 | 42 | PASS |
| a06 story | Add the street, and the ZIP code. | 16.53 | 16.563 | 33 | PASS |
| a06 story | Check everything, then tap Put it on the map. | 19.53 | 19.624 | 94 | PASS |
| a06 story | And there it is, on the map. | 22.44 | 22.494 | 54 | PASS |
| a06 story | Free, on SoCal Lights dot app. | 31.56 | no on-screen cue | - | - |
| a06 reel | Is your home all lit up? | 0.12 | no on-screen cue | - | - |
| a06 reel | Tap Sign in, and use an emailed code. | 1.95 | 2.039 | 89 | PASS |
| a06 reel | Choose who is posting: a homeowner. | 7.77 | 7.879 | 109 | PASS |
| a06 reel | Add the name to show. | 10.56 | 10.565 | 5 | PASS |
| a06 reel | Pick the season for your lights. | 12.87 | 12.939 | 69 | PASS |
| a06 reel | Name your home, and say what makes it special. | 15.69 | 15.75 | 60 | PASS |
| a06 reel | Add the street, and the ZIP code. | 19.35 | 19.371 | 21 | PASS |
| a06 reel | Check everything, then tap Put it on the map. | 22.32 | 22.432 | 112 | PASS |
| a06 reel | And there it is, on the map. | 25.23 | 25.302 | 72 | PASS |
| a06 reel | Tap your home to open its details. | 34.62 | 34.732 | 112 | PASS |
| a06 reel | Free, on SoCal Lights dot app. | 37.68 | no on-screen cue | - | - |
| a07 feed | One tap, one route. | 0.09 | no on-screen cue | - | - |
| a07 feed | Open the map near you, and find places you like. | 2.31 | 2.332 | 22 | PASS |
| a07 feed | Tap Filters, and choose Tree lightings and villages. | 11.67 | 11.759 | 89 | PASS |
| a07 feed | Tap Route these on the map. | 17.88 | 17.928 | 48 | PASS |
| a07 feed | Here are your stops, nine at a time. | 20.43 | no on-screen cue | - | - |
| a07 feed | Your phone opens the route in the maps app you choose. | 25.17 | no on-screen cue | - | - |
| a07 feed | SoCal Lights dot app. | 28.8 | no on-screen cue | - | - |
| a07 story | One tap, one route. | 0.09 | no on-screen cue | - | - |
| a07 story | Open the map near you, and find places you like. | 2.31 | 2.332 | 22 | PASS |
| a07 story | Tap Filters, and choose Tree lightings and villages. | 11.67 | 11.759 | 89 | PASS |
| a07 story | Tap Route these on the map. | 17.88 | 17.928 | 48 | PASS |
| a07 story | Here are your stops, nine at a time. | 20.43 | no on-screen cue | - | - |
| a07 story | Your phone opens the route in the maps app you choose. | 25.17 | no on-screen cue | - | - |
| a07 story | SoCal Lights dot app. | 28.8 | no on-screen cue | - | - |
| a07 reel | One tap, one route. | 0.09 | no on-screen cue | - | - |
| a07 reel | Open the map near you, and find places you like. | 2.31 | 2.332 | 22 | PASS |
| a07 reel | Tap Filters, and choose Tree lightings and villages. | 11.67 | 11.759 | 89 | PASS |
| a07 reel | Tap Route these on the map. | 17.88 | 17.928 | 48 | PASS |
| a07 reel | Here are your stops, nine at a time. | 20.43 | no on-screen cue | - | - |
| a07 reel | Tap the arrows to choose your maps app. | 25.41 | 25.489 | 79 | PASS |
| a07 reel | Apple Maps, Google Maps or Waze. | 28.23 | no on-screen cue | - | - |
| a07 reel | Then tap Open, and your phone switches to that app. | 32.55 | no on-screen cue | - | - |
| a07 reel | Your phone opens the route in the maps app you choose. | 37.11 | no on-screen cue | - | - |
| a07 reel | SoCal Lights dot app. | 40.766111 | no on-screen cue | - | - |
| a08 feed | Looking for holiday lights tonight? | 0.06 | no on-screen cue | - | - |
| a08 feed | Tap Find my location. | 2.88 | 2.959 | 79 | PASS |
| a08 feed | Pull up the list to see what is near you. | 12.06 | 12.148 | 88 | PASS |
| a08 feed | Tap This weekend to see what is on soon. | 15.24 | 15.32 | 80 | PASS |
| a08 feed | Or tap Free to see only free places. | 18.72 | 18.817 | 97 | PASS |
| a08 feed | Tap a place to open its details. | 22.14 | 22.226 | 86 | PASS |
| a08 feed | Free, on SoCal Lights dot app. | 25.65 | no on-screen cue | - | - |
| a08 story | Looking for holiday lights tonight? | 0.06 | no on-screen cue | - | - |
| a08 story | Tap Find my location. | 2.88 | 2.959 | 79 | PASS |
| a08 story | Pull up the list to see what is near you. | 12.06 | 12.148 | 88 | PASS |
| a08 story | Tap This weekend to see what is on soon. | 15.24 | 15.32 | 80 | PASS |
| a08 story | Or tap Free to see only free places. | 18.72 | 18.817 | 97 | PASS |
| a08 story | Tap a place to open its details. | 22.14 | 22.226 | 86 | PASS |
| a08 story | Free, on SoCal Lights dot app. | 25.65 | no on-screen cue | - | - |
| a08 reel | Looking for holiday lights tonight? | 0.06 | no on-screen cue | - | - |
| a08 reel | Tap Find my location. | 2.88 | 2.959 | 79 | PASS |
| a08 reel | Pull up the list to see what is near you. | 12.03 | 12.148 | 118 | PASS |
| a08 reel | Tap This weekend to see what is on soon. | 15.24 | 15.32 | 80 | PASS |
| a08 reel | Or tap Free to see only free places. | 18.72 | 18.817 | 97 | PASS |
| a08 reel | Tap a place to open its details. | 22.14 | 22.226 | 86 | PASS |
| a08 reel | Then tap Directions to go. | 25.71 | no on-screen cue | - | - |
| a08 reel | Your phone switches to the maps app you choose. | 29.46 | no on-screen cue | - | - |
| a08 reel | Free, on SoCal Lights dot app. | 34.11 | no on-screen cue | - | - |
| a09 feed | Plan your whole night with Favorites. | 0.06 | no on-screen cue | - | - |
| a09 feed | Tap the heart on a place to save it. | 2.82 | 2.875 | 55 | PASS |
| a09 feed | Save a few more places you like. | 5.82 | 5.933 | 113 | PASS |
| a09 feed | Tap the heart in the bottom menu to open Favorites. | 10.05 | 10.151 | 101 | PASS |
| a09 feed | Your stops are listed in driving order. | 13.98 | no on-screen cue | - | - |
| a09 feed | Tap Route these. | 18.93 | 19.023 | 93 | PASS |
| a09 feed | Here is your route, with every stop listed. | 21.54 | no on-screen cue | - | - |
| a09 feed | Your phone opens the route in the maps app you choose. | 26.55 | no on-screen cue | - | - |
| a09 feed | Free, on SoCal Lights dot app. | 29.7 | no on-screen cue | - | - |
| a09 story | Plan your whole night with Favorites. | 0.06 | no on-screen cue | - | - |
| a09 story | Tap the heart on a place to save it. | 2.82 | 2.875 | 55 | PASS |
| a09 story | Save a few more places you like. | 5.82 | 5.933 | 113 | PASS |
| a09 story | Tap the heart in the bottom menu to open Favorites. | 10.05 | 10.151 | 101 | PASS |
| a09 story | Your stops are listed in driving order. | 13.98 | no on-screen cue | - | - |
| a09 story | Tap Route these. | 18.93 | 19.023 | 93 | PASS |
| a09 story | Here is your route, with every stop listed. | 21.54 | no on-screen cue | - | - |
| a09 story | Your phone opens the route in the maps app you choose. | 26.55 | no on-screen cue | - | - |
| a09 story | Free, on SoCal Lights dot app. | 29.7 | no on-screen cue | - | - |
| a09 reel | Plan your whole night with Favorites. | 0.06 | no on-screen cue | - | - |
| a09 reel | Tap the heart on a place to save it. | 2.82 | 2.875 | 55 | PASS |
| a09 reel | Save a few more places you like. | 5.82 | 5.933 | 113 | PASS |
| a09 reel | Tap the heart in the bottom menu to open Favorites. | 10.05 | 10.151 | 101 | PASS |
| a09 reel | Your stops are listed in driving order. | 13.98 | no on-screen cue | - | - |
| a09 reel | Tap Route these. | 18.93 | 19.023 | 93 | PASS |
| a09 reel | Here is your route, with every stop listed. | 21.54 | no on-screen cue | - | - |
| a09 reel | Tap the arrows to pick your maps app. | 26.73 | 26.821 | 91 | PASS |
| a09 reel | Apple Maps, Google Maps or Waze. | 29.55 | no on-screen cue | - | - |
| a09 reel | Your phone opens the route in the maps app you choose. | 33.9 | no on-screen cue | - | - |
| a09 reel | Free, on SoCal Lights dot app. | 37.05 | no on-screen cue | - | - |


Sync target -100 to +400 ms between spoken cue and on-screen action: all cues with an on-screen action pass (61 pass, 0 fail). The ASR transcript of the mixed audio (voice plus music) matches the script in every cut apart from "SoCal" and one-word slips.

## Needs the owner
- a05: Lights Up Today must agree to paid use (written okay).
- Apple Maps scenes in a07 and a09 (public destination address, owner's phone status bar) and the Ring of Lights contest home entries in the a07 route sheet.
- Confirm the music mapping (I cannot hear it).
- a04 and a06 are made on the local demo copy (the owner's decision) and are not labelled as demo.

## How it was made
Scripts in `_build/`: `live-stills.mjs`, `a04-poster.mjs`, `rec-local.mjs` (a06), `owner-cut.mjs` (cuts the owner recordings, narration, music, sync), `remix-all.sh`, `compare-layout.mjs`, `audio/` (music, narration, mix, checks), `a01-*.html` with `render-html.mjs` (Page images). Earlier-round files were removed; they are in git history.
