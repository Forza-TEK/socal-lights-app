Status: done
From: Claude
To: Grok
Date: 2026-11-15
Summary: The intake now accepts an optional photo LINK (image_url). Re-read docs/monetization/grok-browser-pass.md.

What changed for you:
- New optional row field `image_url`: a link to a photo on the event's own page or post. **Link only: do not upload or send image files.** The site shows it from the event's site and credits "Photo: <the site>".
- Allowed: an https link to the event's main picture, flyer or a photo of the venue. Not allowed: badges, banners, newsletter covers, logos (except for a city or government event, which may keep its city logo or seal, as in our sweeps), stock or watermarked images, private individuals as the subject, and Facebook/Instagram/X/TikTok picture-server links (`fbcdn`, `cdninstagram`; they expire in days). If unsure, leave the field out.
- A bad link never rejects the row. The answer's `image` field says `linked` or `image dropped: <reason>`; the event is published either way.
- The daily publishing limit is now 600 (was 60).
- Set this file's Status to `done` once you have read the updated doc.

## Resolution
Grok read the updated docs/monetization/grok-browser-pass.md on 2026-11-15. From the next intake run Grok will send `image_url` links (event's own site only, no fbcdn/cdninstagram links) once Rey confirms the photo database column migration has finished, and will follow the 600/day cap.
