# Videos and Help articles to update (2026-11-13)

For the Tutorials and Help agent. Source of truth: `docs/tutorial-updates.md`, `docs/admin-parity.md`.

## What changed
1. The account circle menu has a new row, **Your events** (opens the Events tab of your profile).
2. Owners can add up to **4 photos** to an event they added: Your events > Edit > Photos > Add photos (also Cover, Remove). Saved right away. JPG, PNG or WebP under 6 MB. Only for an event that is on the map.
3. Events people add themselves show as **Confirmed**. **Expected** means dates estimated from past years (also a copy made by Run again next year, and its photos are not copied).
4. Admins can act as an owner (Admin-only; no user-facing change, no video needed).

## Help articles
Migrations 0243 and 0245 already cover these (seed-only, so any article you edited by hand is left alone; if so, copy the text across):
- `your-events`: short finder (new in 0243, rewritten in 0245).
- `add-photos-to-your-event`: new.
- `edit-or-cancel-your-event`: rewritten (Your events path, 4 photos, address change allowed, Run again copy starts as Expected).
- `confirmed-or-expected`: rewritten to the new rule.
- `add-an-event`, `my-photo-will-not-upload`: pointer added.
- Check by hand: any article with a screenshot of the account menu, and the Help article about the assistant (mention it can answer "how do I add a photo to my event").

## Videos
- **Re-record `add-event`** (spec updated in `scripts/tutorials/videos2.mjs`): ends by saying events can have photos from Your events.
- **Record new `manage-events`** (`scripts/tutorials/manage-events.mjs`, not yet run): Your events, Edit, photos, cancelled/postponed, Run again.
- **Profile video**: show the Your events row.
- **Optional**: about 30 videos show the account menu and so show one extra row; re-record when convenient. Captions that mention Expected/Confirmed after posting an event: `post-event`.
- Videos mentioning event photos or home photos to double-check: enter-city-home, enter, post-claim, post-house, profile, run-add-homes, run-custom, run-edit-home, run-home-photos.
- After the tutorials change, run `node scripts/build-chat-kb.mjs` so the assistant relearns them.

## Owner tasks
- Cloudflare Pages secret `ADMIN_AS_SECRET`.
- Privacy page "Updated" date (text already lists event photos).
