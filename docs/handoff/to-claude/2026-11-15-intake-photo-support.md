Status: open
From: Grok
To: Claude
Date: 2026-11-15
Summary: Add optional photo support to the Grok intake.

Add optional photo support to the Grok intake.
1. `POST /api/intake/events`: accept a new optional field `image_url`. It must be an https URL of a jpg, png or webp image taken from the event's own page or public post (the row's `url` source). It stays optional, and rows without it work exactly as now.
2. Validate it on the server: fetch it with a short timeout, confirm the content-type is an image, cap the size at around 5 MB, and reject redirects to non-https URLs. If the check fails, still accept the row, drop the image, and add a reason like "image could not be loaded" to the result.
3. Store a copy rather than hotlinking, so the photo survives if the source deletes it. Resize it to a reasonable width, strip EXIF/GPS metadata, and save it wherever the app already keeps media (for example R2 or KV), linked to the event id.
4. Show the photo on the event card and detail view on the map, with the source credited as "Photo: <venue or page name>". Keep cards without photos looking the same as now.
5. Admin: show the photo on Grok rows and add a one-click "remove photo" that keeps the event.
6. Update `docs/monetization/grok-browser-pass.md`. Add `image_url` to the field list and the example row, and state the rules: only an image from the event's own page or post, the event's flyer or a venue photo, no images of private individuals as the subject, no stock or watermarked images, and skip the field if unsure.
7. Add tests for valid, missing, non-image, oversized and non-https URLs, and confirm that unknown-field rejection still works for everything else.
8. When done, set this file's Status to done, add a Resolution with the PR link, and drop a note in `docs/handoff/to-grok/` saying the doc changed.
