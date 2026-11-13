-- Help Center: owners can add up to 4 photos to an event they added (Your events > Edit > Photos). New article "Add photos to your event"; "Your events" is the short finder;
-- "Edit or cancel your event" is the full how-to; pointers in "Add an event to the map" and "My photo will not upload". Seed-only (updated_by = 'seed'), so an article edited in Admin is never overwritten. No prices, no dates.
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

See also [Edit or cancel your event](/help/edit-or-cancel-your-event) and [Find and manage your events](/help/your-events).', 'photo, photos, add a photo, upload a photo, cover photo, remove a photo, picture, image, photos for my event', '', 12, 'published', 'seed');
UPDATE help_articles SET summary = 'Tap your account circle, then Your events. That is where every event you added is kept.', body = 'Every event you add is kept under **Your events**.

1. Sign in. Tap your account circle at the top right of the map (your picture or your initial).
2. Choose **Your events**. It opens the Events tab of your profile.
3. Find your event. Each one says whether it is **On the map** or **In review**, and a **Cancelled** or **Postponed** tag shows if you set one. Events you add yourself show as Confirmed, because you gave the dates.

## What you can do there

- Change the details, mark it cancelled or postponed, run it again next year, or delete it: [Edit or cancel your event](/help/edit-or-cancel-your-event).
- Add up to 4 photos: [Add photos to your event](/help/add-photos-to-your-event).

Only the person who added an event can edit or delete it. Adding another event? Tap your account circle, then **Add an event, home or contest**: [Add an event to the map](/help/add-an-event).', keywords = 'your events, my events, where are my events, find my event, manage my event, account circle, events i added', updated_at = datetime('now') WHERE slug = 'your-events' AND updated_by = 'seed';
UPDATE help_articles SET body = 'An event changed? You can fix its details, add photos, mark it cancelled or postponed, run it again next year, or delete it. You do this from **Your events**, signed in with the same account you used to add the event.

1. Tap your **account circle** at the top of the map and choose **Your events**. It opens the Events tab of your profile: [Find and manage your events](/help/your-events).
2. Find your event. The tag under its name says **On the map**, **In review**, **Cancelled** or **Postponed**.
3. Tap **Edit**. You can change the name, the season and type, the city and street address, the start and end dates, the hours, the venue, the price, the description and the event web page. You can add up to 4 photos here too: [Add photos to your event](/help/add-photos-to-your-event).
4. Tap **Save**. The map and the event''s page show the change right away. (Photos are saved as soon as you add them.)

## Mark it cancelled or postponed

The event stays on the map with a tag, so nobody drives out for nothing.

1. On the event''s row, open the **Event notice** list.
2. Choose **Cancelled** or **Postponed**.
3. When the event is back on, choose **No notice** to take the tag off. If the dates moved, tap **Edit** and change them too.

## Run it again next year

Tap **Run again next year** on the event''s row. It adds a copy with every date moved forward one year. The copy starts as Expected, because the new dates are a guess. When you know the real dates, tap **Edit** and **Save** and it becomes Confirmed. The photos are not copied, so add them to the new copy.

## Good to know

- Changing the address moves the pin, so we look the new address up again.
- **Delete** removes the event and its photos from the map for good. It asks you to tap again. If you paid for a Featured placement, write to info@socallights.app first: see [Feature an event or a home](/help/feature-an-event-or-home).
- An event that is **In review** can be deleted but not edited until it is on the map.
- Cancelled or postponed events cannot be featured.

Did not find your event? See [Add an event to the map](/help/add-an-event). Anything else, [ask us](#ask).', updated_at = datetime('now') WHERE slug = 'edit-or-cancel-your-event' AND updated_by = 'seed';
UPDATE help_articles SET body = body || '

Want to add photos? Once your event is on the map, tap your account circle, then **Your events**, then **Edit**: [Add photos to your event](/help/add-photos-to-your-event).', updated_at = datetime('now') WHERE slug = 'add-an-event' AND updated_by = 'seed' AND body NOT LIKE '%/help/add-photos-to-your-event%';
UPDATE help_articles SET body = body || '

Adding photos to an **event**? An event can have up to 4 photos: [Add photos to your event](/help/add-photos-to-your-event).', updated_at = datetime('now') WHERE slug = 'my-photo-will-not-upload' AND updated_by = 'seed' AND body NOT LIKE '%/help/add-photos-to-your-event%';
UPDATE help_articles SET summary = 'Confirmed means the dates are known: the event''s own page shows them, or the person who added the event gave them. Expected means the dates are estimated from past years.', body = '- **Confirmed:** the dates are known. Either the event''s own web page shows its name and this year''s dates, or the organizer added the event themselves and entered the dates.
- **Expected from past years · check site:** the event is on the map, but its dates are our estimate from past years. Many events repeat every year, so check the organizer''s page before you travel. A copy made with **Run again next year** starts as Expected until the organizer saves the real dates.

To see only checked events, tap **Filters** and turn on **Confirmed dates only**.

Organizers: tap your account circle, then **Your events**, to keep your dates up to date: [Edit or cancel your event](/help/edit-or-cancel-your-event).

See something wrong? Open the event and tap **Something wrong? Tell us**.', updated_at = datetime('now') WHERE slug = 'confirmed-or-expected' AND updated_by = 'seed';
