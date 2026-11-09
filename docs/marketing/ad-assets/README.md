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
- Honest limits: the Apple Maps scenes show the destination address of a public place ("28000 Rancho Pkwy") and the owner's real phone status bar. The a07 route sheet lists public events and also the "Ring of Lights contest" home entries near Newport Beach with their street numbers as the live app lists them (public listings, nothing hidden or edited); owner to confirm that is acceptable for paid ads.

### Loudness, durations, speech-recognition match (vosk small model; "SoCal" is heard as "so cow", expected)
| Cut | Size | Video / audio duration | Streams aligned (start 0, within 40 ms) | LUFS | True peak dBFS | Script words recognised | File |
|---|---|---|---|---|---|---|---|
| a06 feed | 1080x1350 | 34.60 / 34.57 s | yes | -14.0 | -1.4 | 61/63 | 2.12 MB |
| a06 story | 1080x1920 | 34.60 / 34.57 s | yes | -14.0 | -1.4 | 61/63 | 2.60 MB |
| a06 reel | 1080x1920 | 43.77 / 43.73 s | yes | -14.0 | -1.4 | 74/76 | 2.87 MB |
| a07 feed | 1080x1350 | 32.00 / 32.00 s | yes | -14.1 | -1.4 | 54/57 | 3.21 MB |
| a07 story | 1080x1920 | 32.00 / 32.00 s | yes | -14.1 | -1.4 | 54/57 | 4.21 MB |
| a07 reel | 1080x1920 | 43.40 / 43.37 s | yes | -14.0 | -1.4 | 72/75 | 4.60 MB |
| a08 feed | 1080x1350 | 28.97 / 28.93 s | yes | -14.1 | -1.3 | 48/49 | 3.00 MB |
| a08 story | 1080x1920 | 28.97 / 28.93 s | yes | -14.1 | -1.3 | 48/49 | 3.88 MB |
| a08 reel | 1080x1920 | 40.40 / 40.40 s | yes | -14.0 | -1.4 | 62/63 | 4.41 MB |
| a09 feed | 1080x1350 | 32.73 / 32.70 s | yes | -14.0 | -1.5 | 66/67 | 3.02 MB |
| a09 story | 1080x1920 | 32.73 / 32.70 s | yes | -14.0 | -1.5 | 66/67 | 3.81 MB |
| a09 reel | 1080x1920 | 43.03 / 43.03 s | yes | -14.0 | -1.4 | 78/81 | 4.22 MB |

| Cut | Cue (narration) | Spoken at (ASR, s) | On-screen action (s) | Action minus words (ms) | Result (target -100 to +400) |
|---|---|---|---|---|---|
| a06 feed | Is your home all lit up? | 0.12 | no on-screen cue | - | - |
| a06 feed | Tap Sign in, and use an emailed code. | 1.95 | 2.039 | 89 | PASS |
| a06 feed | Choose who is posting: a homeowner. | 7.71 | 7.813 | 103 | PASS |
| a06 feed | Add the name to show. | 10.47 | 10.492 | 22 | PASS |
| a06 feed | Name your home, and say what makes it special. | 12.81 | 12.872 | 62 | PASS |
| a06 feed | Add the street, and the ZIP code. | 16.53 | 16.572 | 42 | PASS |
| a06 feed | Check everything, then tap Put it on the map. | 19.56 | 19.664 | 104 | PASS |
| a06 feed | And there it is, on the map. | 22.47 | 22.534 | 64 | PASS |
| a06 feed | Free, on SoCal Lights dot app. | 31.65 | no on-screen cue | - | - |
| a06 story | Is your home all lit up? | 0.12 | no on-screen cue | - | - |
| a06 story | Tap Sign in, and use an emailed code. | 1.95 | 2.039 | 89 | PASS |
| a06 story | Choose who is posting: a homeowner. | 7.71 | 7.813 | 103 | PASS |
| a06 story | Add the name to show. | 10.47 | 10.492 | 22 | PASS |
| a06 story | Name your home, and say what makes it special. | 12.81 | 12.872 | 62 | PASS |
| a06 story | Add the street, and the ZIP code. | 16.53 | 16.572 | 42 | PASS |
| a06 story | Check everything, then tap Put it on the map. | 19.56 | 19.664 | 104 | PASS |
| a06 story | And there it is, on the map. | 22.47 | 22.534 | 64 | PASS |
| a06 story | Free, on SoCal Lights dot app. | 31.65 | no on-screen cue | - | - |
| a06 reel | Is your home all lit up? | 0.12 | no on-screen cue | - | - |
| a06 reel | Tap Sign in, and use an emailed code. | 1.95 | 2.039 | 89 | PASS |
| a06 reel | Choose who is posting: a homeowner. | 7.71 | 7.813 | 103 | PASS |
| a06 reel | Add the name to show. | 10.47 | 10.492 | 22 | PASS |
| a06 reel | Pick the season for your lights. | 12.84 | 12.877 | 37 | PASS |
| a06 reel | Name your home, and say what makes it special. | 15.66 | 15.718 | 58 | PASS |
| a06 reel | Add the street, and the ZIP code. | 19.38 | 19.418 | 38 | PASS |
| a06 reel | Check everything, then tap Put it on the map. | 22.41 | 22.51 | 100 | PASS |
| a06 reel | And there it is, on the map. | 25.32 | 25.38 | 60 | PASS |
| a06 reel | Tap your home to open its details. | 34.8 | 34.889 | 89 | PASS |
| a06 reel | Free, on SoCal Lights dot app. | 37.83 | no on-screen cue | - | - |
| a07 feed | One tap, one route. | 0.09 | no on-screen cue | - | - |
| a07 feed | Open the map near you, and find places you like. | 2.34 | 2.348 | 8 | PASS |
| a07 feed | Tap Route these on the map. | 11.88 | 11.949 | 69 | PASS |
| a07 feed | Here are your stops, nine at a time. | 14.43 | no on-screen cue | - | - |
| a07 feed | Tap the arrows to choose your maps app. | 19.38 | 19.433 | 53 | PASS |
| a07 feed | Apple Maps, Google Maps or Waze. | 22.23 | no on-screen cue | - | - |
| a07 feed | Your phone opens the route in the maps app you choose. | 26.58 | no on-screen cue | - | - |
| a07 feed | SoCal Lights dot app. | 30.21 | no on-screen cue | - | - |
| a07 story | One tap, one route. | 0.09 | no on-screen cue | - | - |
| a07 story | Open the map near you, and find places you like. | 2.34 | 2.348 | 8 | PASS |
| a07 story | Tap Route these on the map. | 11.88 | 11.949 | 69 | PASS |
| a07 story | Here are your stops, nine at a time. | 14.43 | no on-screen cue | - | - |
| a07 story | Tap the arrows to choose your maps app. | 19.38 | 19.433 | 53 | PASS |
| a07 story | Apple Maps, Google Maps or Waze. | 22.23 | no on-screen cue | - | - |
| a07 story | Your phone opens the route in the maps app you choose. | 26.58 | no on-screen cue | - | - |
| a07 story | SoCal Lights dot app. | 30.21 | no on-screen cue | - | - |
| a07 reel | One tap, one route. | 0.09 | no on-screen cue | - | - |
| a07 reel | Open the map near you, and find places you like. | 2.34 | 2.348 | 8 | PASS |
| a07 reel | Tap Route these on the map. | 11.88 | 11.949 | 69 | PASS |
| a07 reel | Here are your stops, nine at a time. | 14.43 | no on-screen cue | - | - |
| a07 reel | Tap the arrows to choose your maps app. | 19.38 | 19.433 | 53 | PASS |
| a07 reel | Apple Maps, Google Maps or Waze. | 22.23 | no on-screen cue | - | - |
| a07 reel | Then tap Open, and your phone switches to that app. | 26.55 | no on-screen cue | - | - |
| a07 reel | A longer trip is split into more routes. | 31.14 | no on-screen cue | - | - |
| a07 reel | Your phone opens the route in the maps app you choose. | 34.95 | no on-screen cue | - | - |
| a07 reel | SoCal Lights dot app. | 38.605833 | no on-screen cue | - | - |
| a08 feed | Looking for holiday lights tonight? | 0.06 | no on-screen cue | - | - |
| a08 feed | Tap Find my location. | 2.88 | 2.96 | 80 | PASS |
| a08 feed | Pull up the list to see what is near you. | 12.3 | 12.416 | 116 | PASS |
| a08 feed | Tap This weekend to see what is on soon. | 15.54 | 15.617 | 77 | PASS |
| a08 feed | Or tap Free to see only free places. | 18.99 | 19.079 | 89 | PASS |
| a08 feed | Tap a place to open its details. | 22.47 | 22.527 | 57 | PASS |
| a08 feed | Free, on SoCal Lights dot app. | 26.04 | no on-screen cue | - | - |
| a08 story | Looking for holiday lights tonight? | 0.06 | no on-screen cue | - | - |
| a08 story | Tap Find my location. | 2.88 | 2.96 | 80 | PASS |
| a08 story | Pull up the list to see what is near you. | 12.3 | 12.416 | 116 | PASS |
| a08 story | Tap This weekend to see what is on soon. | 15.54 | 15.617 | 77 | PASS |
| a08 story | Or tap Free to see only free places. | 18.99 | 19.079 | 89 | PASS |
| a08 story | Tap a place to open its details. | 22.47 | 22.527 | 57 | PASS |
| a08 story | Free, on SoCal Lights dot app. | 26.04 | no on-screen cue | - | - |
| a08 reel | Looking for holiday lights tonight? | 0.06 | no on-screen cue | - | - |
| a08 reel | Tap Find my location. | 2.88 | 2.96 | 80 | PASS |
| a08 reel | Pull up the list to see what is near you. | 12.3 | 12.416 | 116 | PASS |
| a08 reel | Tap This weekend to see what is on soon. | 15.54 | 15.617 | 77 | PASS |
| a08 reel | Or tap Free to see only free places. | 18.99 | 19.079 | 89 | PASS |
| a08 reel | Tap a place to open its details. | 22.44 | 22.527 | 87 | PASS |
| a08 reel | Then tap Directions to go. | 26.1 | no on-screen cue | - | - |
| a08 reel | Your phone switches to the maps app you choose. | 29.85 | no on-screen cue | - | - |
| a08 reel | Free, on SoCal Lights dot app. | 34.5 | no on-screen cue | - | - |
| a09 feed | Plan your whole night with Favorites. | 0.06 | no on-screen cue | - | - |
| a09 feed | Tap the heart on a place to save it. | 2.85 | 2.89 | 40 | PASS |
| a09 feed | Save a few more places you like. | 5.79 | 5.893 | 103 | PASS |
| a09 feed | Tap the heart in the bottom menu to open Favorites. | 10.14 | 10.221 | 81 | PASS |
| a09 feed | Your stops are listed in driving order. | 14.04 | no on-screen cue | - | - |
| a09 feed | Tap Route these. | 18.99 | 19.107 | 117 | PASS |
| a09 feed | Here is your route, with every stop listed. | 21.63 | no on-screen cue | - | - |
| a09 feed | Your phone opens the route in the maps app you choose. | 26.64 | no on-screen cue | - | - |
| a09 feed | Free, on SoCal Lights dot app. | 29.79 | no on-screen cue | - | - |
| a09 story | Plan your whole night with Favorites. | 0.06 | no on-screen cue | - | - |
| a09 story | Tap the heart on a place to save it. | 2.85 | 2.89 | 40 | PASS |
| a09 story | Save a few more places you like. | 5.79 | 5.893 | 103 | PASS |
| a09 story | Tap the heart in the bottom menu to open Favorites. | 10.14 | 10.221 | 81 | PASS |
| a09 story | Your stops are listed in driving order. | 14.04 | no on-screen cue | - | - |
| a09 story | Tap Route these. | 18.99 | 19.107 | 117 | PASS |
| a09 story | Here is your route, with every stop listed. | 21.63 | no on-screen cue | - | - |
| a09 story | Your phone opens the route in the maps app you choose. | 26.64 | no on-screen cue | - | - |
| a09 story | Free, on SoCal Lights dot app. | 29.79 | no on-screen cue | - | - |
| a09 reel | Plan your whole night with Favorites. | 0.06 | no on-screen cue | - | - |
| a09 reel | Tap the heart on a place to save it. | 2.85 | 2.89 | 40 | PASS |
| a09 reel | Save a few more places you like. | 5.79 | 5.893 | 103 | PASS |
| a09 reel | Tap the heart in the bottom menu to open Favorites. | 10.11 | 10.221 | 111 | PASS |
| a09 reel | Your stops are listed in driving order. | 14.04 | no on-screen cue | - | - |
| a09 reel | Tap Route these. | 18.99 | 19.107 | 117 | PASS |
| a09 reel | Here is your route, with every stop listed. | 21.63 | no on-screen cue | - | - |
| a09 reel | Tap the arrows to pick your maps app. | 26.82 | 26.902 | 82 | PASS |
| a09 reel | Apple Maps, Google Maps or Waze. | 29.64 | no on-screen cue | - | - |
| a09 reel | Your phone opens the route in the maps app you choose. | 33.99 | no on-screen cue | - | - |
| a09 reel | Free, on SoCal Lights dot app. | 37.14 | no on-screen cue | - | - |


Sync target -100 to +400 ms between spoken cue and on-screen action: all cues with an on-screen action pass (60 pass, 0 fail). The ASR transcript of the mixed audio (voice plus music) matches the script in every cut apart from "SoCal" and one-word slips.

## Needs the owner
- a05: Lights Up Today must agree to paid use (written okay).
- Apple Maps scenes in a07 and a09 (public destination address, owner's phone status bar) and the Ring of Lights contest home entries in the a07 route sheet.
- Confirm the music mapping (I cannot hear it).
- a04 and a06 are made on the local demo copy (the owner's decision) and are not labelled as demo.

## How it was made
Scripts in `_build/`: `live-stills.mjs`, `a04-poster.mjs`, `rec-local.mjs` (a06), `owner-cut.mjs` (cuts the owner recordings, narration, music, sync), `remix-all.sh`, `compare-layout.mjs`, `audio/` (music, narration, mix, checks), `a01-*.html` with `render-html.mjs` (Page images). Earlier-round files were removed; they are in git history.
