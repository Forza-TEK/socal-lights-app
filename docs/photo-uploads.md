# Photo uploads: limits, and where EXIF/GPS is removed

Audit F-06 (docs/audit-2026-11-24-functions.md).

## What the server checks (new home, contest entry, home edit, event photos)
- At most 8 photos per home or entry (4 per event), each under 6 MB.
- **Total per request: 24 MB** (`MAX_TOTAL_BYTES` in `functions/_lib/imgsniff.js`).
- The file must really be a JPG, PNG or WebP, judged by its first bytes, not the name or declared type.
- **Pixel size** is read from the header bytes (`imageSize()` in `imgsniff.js`: JPEG start-of-frame, PNG IHDR, WebP VP8/VP8L/VP8X). Over 8000 px on a side or over 40 megapixels is refused. A header the reader cannot parse is let through (the bytes were already checked as a real image); no decoding and no library is involved.

## Where EXIF and GPS data is removed
**Only in the browser.** `shrink()` in `public/addflow.js` redraws every photo onto a canvas (longest side 1600 px) and re-encodes it as JPEG at 0.82. A canvas re-encode carries no EXIF, so camera model, timestamps and GPS coordinates from the phone are dropped before upload. The displayed orientation is applied first (`imageOrientation: "from-image"`).

The server does **not** strip metadata. A script that holds a session can still upload an original with EXIF/GPS, and it is then served publicly with a one-year cache.

## What the server could additionally do (not built)
1. Drop the EXIF block from JPEGs on upload: remove APP1 (`0xFFE1`, "Exif") segments, and for PNG the `eXIf` chunk, for WebP the `EXIF` chunk. This is a byte-level rewrite with no dependency, about 40 lines, but must be tested on real phone files.
2. Re-encode through Cloudflare Images (a paid feature, an extra binding).
3. Refuse files that still carry a GPS tag (APP1 with a GPS IFD) and ask the person to use the add form.

Option 1 is the cheapest next step if script uploads become a concern.
