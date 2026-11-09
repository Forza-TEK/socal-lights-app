# Facebook and Instagram ad creative (2026-11-09)

Made only from our own product (live https://socallights.app, or the local demo contest from `scripts/tutorials/seed-demo.mjs`) and our own logo (`public/img/icon-512.png`). No stock images, no other sites' images, no residents, plates or faces. New files only; no app code changed. Nothing is uploaded to Meta.

## Rules applied
- Every phone picture is a **true phone view**: a 390 css px wide page (real mobile layout) captured at 2.77x so it is exactly 1080 px wide and fills the frame (no device border, no desktop layout shrunk into a portrait frame). Body text is therefore at least ~28 px in the final image.
- 9:16: headline bar starts below the top 14%; key text stays out of the bottom 20% (call-to-action lines end at y 1480 of 1920; only the phone's own icon bar sits lower). Text overlays are under 20% of the area except the headline bar on the videos (about 15%).
- Words: "home", not "house"/"display". On the add-home video (a06) the app's own words "house" and "display" are replaced with "home" on screen, because the live add-home form still says "house" in places. Product text on the other pictures is the app's own.
- No prices. Prices, photos of third-party events, and street-number home cards on the live list are hidden in the shots. Demo homes show "Maple Street" without house numbers.
- Demo location for the location video: Fashion Island, Newport Beach (a public shopping centre), set in the browser. No one's real position.

## Files and placements
| Asset | Folder / file | Ad ids | Placement | Size | Shows |
|---|---|---|---|---|---|
| a01 | `a01-page-images/a01-facebook-profile-1080x1080.png` | Page profile picture | Page | 1080x1080 | Logo |
| a01 | `a01-page-images/a01-facebook-cover-1640x624.png` | Page cover | Page | 1640x624 | Logo, "SoCal Lights", "Find Christmas lights near you", map |
| a02 | `a02-city-page/a02-city-page-newport-beach-4x5-1080x1350.png` | ev-a-meta, ev-b-meta | Feed | 1080x1350 | /in/newport-beach, 25 public events (most active city by upcoming events, from /api/events), Free / Confirmed tags |
| a03 | `a03-contest-screens/a03-contest-entry-page-4x5-1080x1350.png` | ct-a-meta, ct-c-meta | Feed | 1080x1350 | Demo contest page with "Enter my home", label "Example contest" |
| a03 | `a03-contest-screens/a03-contest-results-page-4x5-1080x1350.png` | ct-a-meta, ct-c-meta | Feed | 1080x1350 | Demo results (Winners), label "Example contest" |
| a04 | `a04-qr-poster/a04-qr-poster-example-4x5-1080x1350.png` | ct-b-meta | Feed | 1080x1350 | The app's own entry poster for the demo contest, label "Example poster"; QR points to socallights.app/contests |
| a05 | `a05-installer-profile/a05-installer-profile-example-4x5-1080x1350.png` | in-a-meta, in-b-meta | Feed | 1080x1350 | Demo installer "Bright Nights Lighting" (made-up, `.example.com`, 555 phone), label "Example installer profile" |
| a10 | `a10-weekend-list/a10-weekend-list-4x5-1080x1350.png` | fa-c-meta | Feed | 1080x1350 | Map list with "This weekend" selected, public events only |
| a11 | `a11-story-versions/a11-story-a02-city-page-9x16.png`, `...a03-contest-entry-9x16.png`, `...a03-contest-results-9x16.png`, `...a04-qr-poster-9x16.png`, `...a05-installer-profile-9x16.png`, `...a10-weekend-list-9x16.png` | same as the 4:5 versions | Story | 1080x1920 | Same screens, headline bar on top (ad headline), plain call-to-action line above the bottom 20%, no fake buttons |
| a06 | `a06-add-home-video/a06-add-home-{feed-4x5,story-9x16,reel-9x16}.mp4` | ho-a-meta (also ho-c-meta) | Feed / Story / Reel | 1080x1350 (11.8 s), 1080x1920 (11.8 s), 1080x1920 (19.5 s) | Add-a-home flow on the local demo server, example name and street, stops before "Put it on the map" (nothing submitted). Headline "Put your home's lights on the map" |
| a07 | `a07-route-video/a07-route-{...}.mp4` | ho-b-meta | Feed / Story / Reel | 9.1 s / 9.1 s / 14.4 s | 3 public events saved, Favorites, "Route these", maps-app handoff. Headline "Be on someone's lights route" |
| a08 | `a08-find-location-video/a08-find-location-{...}.mp4` | fa-a-meta | Feed / Story / Reel | 9.7 s / 8.4 s / 13.4 s | Tap Find my location, list of nearby public events. Headline "Find holiday lights near you tonight" |
| a09 | `a09-favorites-video/a09-favorites-{...}.mp4` | fa-b-meta | Feed / Story / Reel | 9.9 s / 9.9 s / 16.1 s | Heart three public events, Favorites, "Route these". Headline "Plan a family lights drive" |

Video details: H.264 High, 30 fps, silent AAC track (no music), burned-in headline and step captions, first line on screen from the first frame. Reel = the Story cut, its last frame held 1.5 s, then a plain end card (logo, "SoCal Lights", "socallights.app"; no price, no claim). All files are under 1 MB (limit 15 MB). The 4:5 feed cuts of a06, a07 and a09 are cropped from the 9:16 recording (bottom part of the screen), so the top of the page is cut off there.

## How it was made
- Stills: Playwright with the installed Chrome, mobile emulation (390 css px, 2.77x), live site or the local demo (`wrangler pages dev` with the demo seed), then CSS/JS tweaks to hide private or third-party content. Scripts in `_build/`: `shoot.mjs`, `a02.*`, `a03.*`, `a05.js`, `a04-poster.mjs`, `a10-weekend.mjs`, `a11-stories.mjs`, `a01-*.html`, `render-html.mjs`.
- Demo home pictures: six simple night illustrations drawn by `_build/make-demo-art.py` (own artwork, no photos), uploaded to the LOCAL storage only so the stock demo photos (which are third-party photos) never appear.
- Videos: `_build/adrec.mjs` (Chrome screencast at device pixels, tap highlight, hides third-party event photos, the sponsor bar, the assistant button and street-number cards), `scenarios.mjs` (the four scripts), `compose.mjs` (headline bar, captions, stall trimming to keep each cut at most 12 s), `reel.mjs` and `build-videos.sh` (Reel with end card). The existing tutorial pipeline (`scripts/tutorials/`) was not reused: it needs a TTS voice and records desktop widths, so a lighter recorder was written with the same look (cursor ring and tap ripple).
- Recordings of a07 to a09 ran on the live site read-only: only the browser's own favourites (local storage) were touched. The clock was set to Nov 27 5 pm Pacific in the browser so "Tonight" shows real tree lightings; the data is the live data. a10 uses Nov 12 as "today" so "This weekend" is Nov 14 and 15.

## Needs the owner
- Look at every file before upload. A reviewer must confirm no event photo of a person appears (event photos are hidden in all shots; the small SoCal Lights badge is our own logo).
- a02 and a10 name real public events and venues (Fashion Island, Roger's Gardens, Dana Point harbor events). These are public listings; no organizer consent is needed for a map listing, but check the ad policy wording if an organizer objects.
- The demo contest and installer are made up (Maple Street, "Bright Nights Lighting", example.com). Each is labelled "Example". Do not describe them as real.
- a05 uses a made-up profile, not the live Lights Up Today page (that needs written consent).
- a06: the form text was reworded on screen from "house/display" to "home". If you prefer the untouched app text, the app itself should be reworded first.
- The Page profile picture and cover use our logo as it is in `public/img/icon-512.png`.
- Meta may still crop edges differently per placement; the Reel and Story files keep text inside 14% top / 20% bottom, the feed files keep text away from the edges.
