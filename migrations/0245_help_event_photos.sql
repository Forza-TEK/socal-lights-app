-- Help Center: owners can add up to 4 photos to an event they added (Your events > Edit > Photos). New article, and the "Your events" article, "Add an event to the map" and
-- "My photo will not upload" updated. Seed-only (updated_by = 'seed'), so an article edited in Admin is never overwritten. No prices, no dates.
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('add-photos-to-your-event', 'Add photos to your event', 'post', 'howto', 'Tap your account circle, then Your events, then Edit on your event, and add up to 4 photos in the Photos box.', 'Photos make an event easier to spot and easier to trust. You can add up to 4 photos to any event you added, once it is on the map.

1. Sign in. Tap your account circle at the top right of the map (your picture or your initial).
2. Choose **Your events**. It opens the Events tab of your profile.
3. On your event, tap **Edit**.
4. Find the **Photos** box. Tap **Add photos** and choose up to 4 pictures from your phone or computer. They are made smaller on your device before they upload.
5. Wait for "added". Photos are saved right away. You do not need to tap Save.

## Change or remove a photo

- The first photo is the **cover**: it is the picture on the map list and the top of the event page. Tap **Cover** on another photo to make it the cover.
- Tap the **x** on a photo to remove it.

## Good to know

- Photos must be JPG, PNG or WebP, and each one under 6 MB. A normal phone photo works.
- Your photos show first on the map and on the event page, credited to the organizer.
- If you remove all of your photos, the picture from your event''s web page comes back, or a stock photo for that kind of event if the page has none.
- Photos can be added once your event is on the map. An event that is still in review has to wait.
- **Run again next year** does not copy the photos. Add them to the new copy.
- An event can have up to 4 photos. A home can have up to 8: see [Show off your home](/help/show-off-your-house).
- Only the person who added an event can change its photos. If a photo is wrong or unwanted, [ask us](#ask).

See also [Find and manage your events](/help/your-events).', 'photo, photos, add a photo, upload a photo, cover photo, remove a photo, picture, image, photos for my event', '', 12, 'published', 'seed');
UPDATE help_articles SET summary = 'Tap your account circle, then Your events, to edit an event you added, add photos, mark it cancelled or postponed, run it again next year, or delete it.', body = 'Every event you add is kept under **Your events**. That is where you change it later.

1. Sign in. Tap your account circle at the top right of the map (your picture or your initial).
2. Choose **Your events**. It opens the Events tab of your profile.
3. Find your event. Each one says whether it is **On the map** or **In review**, and events you add yourself show as Confirmed because you gave the dates. A **Cancelled** or **Postponed** tag shows if you set one.
4. Tap **Edit** to change the name, dates, hours, place, price, description or web page, or to add photos, then tap **Save**.

## Other buttons on an event

- **Cancelled** or **Postponed** puts a tag on the event so visitors do not drive out for nothing. Choose **No notice** to take it off again.
- **Run again next year** makes a copy with every date moved forward a year. The copy starts as Expected (the new dates are a guess). When the real dates are set, tap **Edit** and **Save** and it becomes Confirmed. The photos are not copied.
- **Delete** takes the event off the map, with its photos. This cannot be undone.

## Photos

You can add up to 4 photos to an event: tap **Edit**, find the **Photos** box and tap **Add photos**. Photos are saved right away, and the first one is the cover. See [Add photos to your event](/help/add-photos-to-your-event).

If an event has no photos of its own, its picture comes from the event''s web page, when that page has a real photo of the event, or a stock photo for that kind of event.

## Good to know

- Only the person who added an event can edit or delete it.
- Changing the address moves the pin, so we look it up again.
- Adding another event? Tap your account circle, then **Add an event, home or contest**: [Add an event to the map](/help/add-an-event).', keywords = 'your events, my events, edit my event, change my event, manage my event, where are my events, event photo, add a photo to my event, picture for my event, cancel my event, postpone my event, run again next year, delete my event, account circle', updated_at = datetime('now') WHERE slug = 'your-events' AND updated_by = 'seed';
UPDATE help_articles SET body = body || '

Want to add photos? Once your event is on the map, tap your account circle, then **Your events**, then **Edit**: [Add photos to your event](/help/add-photos-to-your-event).', updated_at = datetime('now') WHERE slug = 'add-an-event' AND updated_by = 'seed' AND body NOT LIKE '%/help/add-photos-to-your-event%';
UPDATE help_articles SET body = body || '

Adding photos to an **event**? An event can have up to 4 photos: [Add photos to your event](/help/add-photos-to-your-event).', updated_at = datetime('now') WHERE slug = 'my-photo-will-not-upload' AND updated_by = 'seed' AND body NOT LIKE '%/help/add-photos-to-your-event%';
