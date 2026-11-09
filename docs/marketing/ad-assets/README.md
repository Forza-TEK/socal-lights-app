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

## Videos: audio, sync, checks
- Narration: Kokoro `af_heart` (the tutorial voice), one clip per sentence (`_build/audio/narration.py`). The route line reads "Route these opens your stops in the maps app you choose." Route and favorites videos show the caption "Your phone switches to the map app you choose: Apple Maps, Google Maps or Waze." in the background area from the handoff on.
- Music: original and license-free, made with code (`_build/audio/`, see its README). Owner mapping: a06 and a08 = A "Bright bells pop", a09 = C "Cozy sparkle", a07 = B "Swing-along". Re-mix one video with another track: `WORK=.. TTS=.. sh _build/remix-all.sh <video> <track.mp3>`. I cannot hear audio: levels were measured, taste is the owner's call.
- Mix: music about 18 dB under the voice, about 10 dB under when alone, fade-out, loudnorm -14 LUFS, true peak below -1 dBTP, AAC 192k 48 kHz stereo, 30 fps H.264. Original phone audio is not used.
- Every cut shows the whole recorded frame (scaled to fit on a blurred background, nothing cropped): whole frame visible: yes. Captions equal the spoken words. Reels end on a plain "socallights.app" card (3 s). Frames were extracted and viewed for every video (Story cuts, with feed and Reel spot checks).
- a07 and a09 end on the Apple Maps directions of the owner's recording (finished route and stops). **Those Apple Maps screens, and the turn-by-turn part if included, show the owner's current street "Galway Dr" only in the a07 and a09 sources; the cuts end before turn-by-turn begins, but the owner should confirm no street name is legible.** a06 and a08 contain no Apple Maps.

### Loudness, durations, speech-recognition match (vosk small model; "SoCal" is heard as "so cow", expected)
| Cut | Size | Video / audio duration | Streams aligned (start 0, within 40 ms) | LUFS | True peak dBFS | Script words recognised | File |
|---|---|---|---|---|---|---|---|
| a06 feed | 1080x1350 | 11.80 / 11.80 s | yes | -14.2 | -1.3 | 25/26 | 0.90 MB |
| a06 story | 1080x1920 | 11.80 / 11.80 s | yes | -14.2 | -1.3 | 25/26 | 1.04 MB |
| a06 reel | 1080x1920 | 19.47 / 19.47 s | yes | -14.5 | -1.4 | 34/35 | 1.49 MB |
| a07 feed | 1080x1350 | 11.47 / 11.43 s | yes | -14.1 | -1.3 | 16/17 | 1.68 MB |
| a07 story | 1080x1920 | 11.47 / 11.43 s | yes | -14.1 | -1.3 | 16/17 | 2.16 MB |
| a07 reel | 1080x1920 | 16.43 / 16.43 s | yes | -14.2 | -1.4 | 21/22 | 2.41 MB |
| a08 feed | 1080x1350 | 12.00 / 12.00 s | yes | -14.2 | -1.5 | 20/21 | 2.15 MB |
| a08 story | 1080x1920 | 12.00 / 12.00 s | yes | -14.2 | -1.5 | 20/21 | 2.73 MB |
| a08 reel | 1080x1920 | 17.33 / 17.30 s | yes | -14.5 | -1.4 | 27/28 | 3.18 MB |
| a09 feed | 1080x1350 | 11.67 / 11.63 s | yes | -14.3 | -1.4 | 20/21 | 2.12 MB |
| a09 story | 1080x1920 | 11.67 / 11.63 s | yes | -14.3 | -1.4 | 20/21 | 2.72 MB |
| a09 reel | 1080x1920 | 18.63 / 18.63 s | yes | -14.4 | -1.4 | 29/30 | 3.33 MB |

| Cut | Cue (narration) | Spoken at (ASR, s) | On-screen action (s) | Action minus words (ms) | Result (target -100 to +400) |
|---|---|---|---|---|---|
| a06 feed | Is your home all lit up? | 0.15 | no on-screen cue | - | - |
| a06 feed | Put it on the map in a few minutes. | 2.16 | 2.246 | 86 | PASS |
| a06 feed | And there it is, on the map. | 6.39 | 6.46 | 70 | PASS |
| a06 feed | Free on SoCal Lights. | 9.69 | no on-screen cue | - | - |
| a06 story | Is your home all lit up? | 0.15 | no on-screen cue | - | - |
| a06 story | Put it on the map in a few minutes. | 2.16 | 2.246 | 86 | PASS |
| a06 story | And there it is, on the map. | 6.39 | 6.46 | 70 | PASS |
| a06 story | Free on SoCal Lights. | 9.69 | no on-screen cue | - | - |
| a06 reel | Is your home all lit up? | 0.15 | no on-screen cue | - | - |
| a06 reel | Put it on the map in a few minutes. | 2.16 | 2.246 | 86 | PASS |
| a06 reel | Add a name, a few words, and a street. | 5.1 | no on-screen cue | - | - |
| a06 reel | And there it is, on the map. | 9.54 | 9.62 | 80 | PASS |
| a06 reel | Free on SoCal Lights. | 14.34 | no on-screen cue | - | - |
| a07 feed | One tap, one route. | 1.02 | 1.1 | 80 | PASS |
| a07 feed | Route these opens your stops in the maps app you choose. | 5.64 | 5.72 | 80 | PASS |
| a07 feed | SoCal Lights. | 10.08 | no on-screen cue | - | - |
| a07 story | One tap, one route. | 1.02 | 1.1 | 80 | PASS |
| a07 story | Route these opens your stops in the maps app you choose. | 5.64 | 5.72 | 80 | PASS |
| a07 story | SoCal Lights. | 10.08 | no on-screen cue | - | - |
| a07 reel | One tap, one route. | 1.83 | 1.9 | 70 | PASS |
| a07 reel | Route these opens your stops in the maps app you choose. | 7.32 | 7.4 | 80 | PASS |
| a07 reel | Pick your stops, and go. | 10.17 | no on-screen cue | - | - |
| a07 reel | SoCal Lights. | 12.09 | no on-screen cue | - | - |
| a08 feed | Looking for holiday lights tonight? | 0.12 | no on-screen cue | - | - |
| a08 feed | Tap Find my location, | 2.01 | 2 | -10 | PASS |
| a08 feed | and see what is lighting up near you. | 4.59 | 4.68 | 90 | PASS |
| a08 feed | Free on SoCal Lights. | 9.9 | 9.96 | 60 | PASS |
| a08 story | Looking for holiday lights tonight? | 0.12 | no on-screen cue | - | - |
| a08 story | Tap Find my location, | 2.01 | 2 | -10 | PASS |
| a08 story | and see what is lighting up near you. | 4.59 | 4.68 | 90 | PASS |
| a08 story | Free on SoCal Lights. | 9.9 | 9.96 | 60 | PASS |
| a08 reel | Looking for holiday lights tonight? | 0.12 | no on-screen cue | - | - |
| a08 reel | Tap Find my location, | 2.01 | 2 | -10 | PASS |
| a08 reel | and see what is lighting up near you. | 4.59 | 4.68 | 90 | PASS |
| a08 reel | Tap a place to see the details. | 9.87 | 9.96 | 90 | PASS |
| a08 reel | Free on SoCal Lights. | 12.18 | no on-screen cue | - | - |
| a09 feed | Plan your whole night. | 0.09 | no on-screen cue | - | - |
| a09 feed | Tap the heart on the places you love, | 1.29 | 1.4 | 110 | PASS |
| a09 feed | then tap Route these. | 4.62 | 4.7 | 80 | PASS |
| a09 feed | SoCal Lights, free for families. | 9.45 | no on-screen cue | - | - |
| a09 story | Plan your whole night. | 0.09 | no on-screen cue | - | - |
| a09 story | Tap the heart on the places you love, | 1.29 | 1.4 | 110 | PASS |
| a09 story | then tap Route these. | 4.62 | 4.7 | 80 | PASS |
| a09 story | SoCal Lights, free for families. | 9.45 | no on-screen cue | - | - |
| a09 reel | Plan your whole night. | 0.12 | no on-screen cue | - | - |
| a09 reel | Tap the heart on the places you love, | 1.8 | 1.9 | 100 | PASS |
| a09 reel | then tap Route these. | 7.23 | 7.3 | 70 | PASS |
| a09 reel | Your stops open in the maps app you choose. | 10.53 | 10.62 | 90 | PASS |
| a09 reel | SoCal Lights, free for families. | 13.44 | no on-screen cue | - | - |

Sync target: on-screen action within -100 to +400 ms of the spoken cue. 28 of 28 cues that have an on-screen action pass; none fail. Cues without an on-screen action are marked "no on-screen cue". The transcript of the mixed audio (voice plus music) matches the script in all twelve cuts apart from "SoCal" and a one-word slip.

## Needs the owner
- a05: Lights Up Today must agree to paid use (written okay).
- Apple Maps screens in a07 and a09 (street name "Galway Dr").
- Confirm the music mapping (I cannot hear it).
- a04 and a06 are made on the local demo copy (the owner's decision) and are not labelled as demo.

## How it was made
Scripts in `_build/`: `live-stills.mjs`, `a04-poster.mjs`, `rec-local.mjs` (a06), `owner-cut.mjs` (cuts the owner recordings, narration, music, sync), `remix-all.sh`, `compare-layout.mjs`, `audio/` (music, narration, mix, checks), `a01-*.html` with `render-html.mjs` (Page images). Earlier-round files were removed; they are in git history.
