# Visitor audit 2026-11-16: decisions for the owner

Source: the visitor audit of the live map (22 findings, F1 to F22). The fixes are in three PRs (navigation and errors, layout, content). These are the places where I picked the safest reading, or where the fix needs something only the owner can supply.

## 1. Tonight and This weekend (F7)
Rule now: an event counts for Tonight or This weekend only if it is Confirmed, or Expected with real hours. An Expected event whose hours say "check site" (e.g. "Nightly; check site") is left out of both chips. Everything stays in the normal list and on the map.
Options:
- A (done): leave them out of the two chips.
- B: keep them in, sorted after the confirmed ones, with a "Not confirmed for 2026" line.
- C: leave them out and add a small "N more may be open tonight (not confirmed)" hint under the chips.
To change it: `unsureTonight` in `public/app.js`.

## 2. "Free" with paid extras, and "free in past years" (F17)
- "Free; Santa photos $20" now shows the tag "Free + paid extras" (still green, still in the Free chip). Option: leave such events out of the Free chip.
- An event whose price text says "free in past years" is no longer treated as free (3 Salvation Army meals): the client sets `free` to false on load. The stored flag in the database is unchanged; to fix it at the source, correct those three events in Admin > Events (I did not write a migration because I could not read the live rows).
- "Check listing", "See site", an empty price and "Price not listed" all show "Price not listed". "Ticketed" stays as it is. A full price-text clean-up (about 60 different strings) is a data job for the event intake.

## 3. First photo of "The D'Angelo's" is the SoCal Lights banner (F6)
It is the cover photo of a live home post (photo 1 of 4, `.../api/photo/p/b1db284594a44273/1794346064393.jpg`). Home posts are not migration-managed, so this is an Admin action: open the post in Admin > Homes and move that photo to the end or delete it, or ask the owner of the home for a real front-of-house photo. Not changed in code. Option for later: reject an upload whose image matches `img/share.png` (hash compare on upload).

## 4. Homes titled "Home at <street>" with no photo (F14)
The list now shows "Home in <city>" instead of putting the street address in the heading (this only changes how the title is shown). The three live homes (ids `de2482ff383f4e7f`, `a52149f5a5a9405e`, `c530582b69cf452c`, Covina) still have the street address stored as title and are still posted without a photo. Please confirm the owners agreed to their address being public (privacy track), and whether homes without a photo should be hidden from the list until they add one.

## 5. Sponsor strip tap targets (F10)
The sponsor pills ("Advertise here", sponsor name and phone) are 24 px high. Making them 44 px means a 44 px strip, which makes the collapsed phone sheet 20 px taller (you tuned it low several times). Done: the pause button has a 44 px hit area. Option: accept the 20 px, or leave the pills as they are.

## 6. Count and Sort at Peek on a phone (F4)
At Peek they sit under the tab bar and showed as clipped text. I hid them until the sheet is pulled up and left Peek height alone. Option: raise Peek by about 62 px (`PEEK` in `app.js`) so the count and Sort show above the tab bar.

## 7. Shop links sorted most expensive first (F13)
This is your own setting in `public/site-config.js` (`shopSort: "price-desc-rank"`, `shopHighEnd: "premium"`) with a comment that it is intended. I did not change it. To sort by relevance, set both to `""`. The Shop heading says "Shop for Christmas" while the season chip says Thanksgiving because the shop list is the Christmas one; not changed.

## 8. Spanish page and "display" wording (F11, F16)
- "Español" is now in the More menu. It is not in the footer (that file is referenced by 29 pages and being edited by another change) and there is no hreflang because `/es` is `noindex`; both are small follow-ups if you want them.
- "Home display" is now "Home" and "Home displays" is "Homes" on the map. "A lighting display" on `/add` and `/es`, the Profile and Help pages, and the tutorial videos still say "display"; the videos use that exact label, so I left them for one sweep that also re-records or re-captions them.

## Not fixed
- F21 (keyboard tab order puts map attribution before the list): moving the sheet before the map in the page changes stacking and touch handling around the map. Left alone because of the pinch fix.
- F15 mirroring event images to our own storage and F22 logging failing URLs: separate pieces of work (import pipeline and the visit beacon).
- F8 "disable Use my location offline": location works offline, so disabling it would be wrong.
- F20 hiding the Halloween homes: they are posted homes; the season menu now marks seasons with nothing listed, but a season with posted homes is not marked.
