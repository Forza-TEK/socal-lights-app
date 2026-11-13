-- Help Center: where to find and manage the events you added ("Your events" in the account circle menu), plus a pointer from "Add an event to the map".
-- INSERT OR IGNORE and seed-only updates (updated_by = 'seed'), so an article edited in Admin is never overwritten. No prices, no dates.
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('your-events', 'Find and manage your events', 'post', 'howto', 'Tap your account circle, then Your events, to edit an event you added, mark it cancelled or postponed, run it again next year, or delete it.', 'Every event you add is kept under **Your events**. That is where you change it later.

1. Sign in. Tap your account circle at the top right of the map (your picture or your initial).
2. Choose **Your events**. It opens the Events tab of your profile.
3. Find your event. Each one says whether it is **On the map** or **In review**, and events you add yourself show as Confirmed because you gave the dates, and shows a **Cancelled** or **Postponed** tag if you set one.
4. Tap **Edit** to change the name, dates, hours, place, price, description or web page, then tap **Save**.

## Other buttons on an event

- **Cancelled** or **Postponed** puts a tag on the event so visitors do not drive out for nothing. Choose **No notice** to take it off again.
- **Run again next year** makes a copy with every date moved forward a year. The copy starts as Expected (the new dates are a guess). When the real dates are set, tap **Edit** and **Save** and it becomes Confirmed.
- **Delete** takes the event off the map. This cannot be undone.

## What about a photo?

An event''s picture comes from the event''s own web page, when that page has a real photo of the event. If it does not, SoCal Lights shows a stock photo for that kind of event. The Add an event form and Your events do not take photo uploads. To change the picture, make sure the web page address under **Edit** is your official event page. If the picture is wrong, [ask us](#ask).

Homes work differently: you can add up to eight photos to a home. See [Show off your home](/help/show-off-your-house).

## Good to know

- Only the person who added an event can edit or delete it.
- Changing the address moves the pin, so we look it up again.
- Adding another event? Tap your account circle, then **Add an event, home or contest**: [Add an event to the map](/help/add-an-event).', 'your events, my events, edit my event, change my event, manage my event, where are my events, event photo, picture for my event, cancel my event, postpone my event, run again next year, delete my event, account circle', '', 11, 'published', 'seed');
UPDATE help_articles SET body = body || '

## After you add it

To change, cancel or delete your event later, tap your account circle, then **Your events**. See [Find and manage your events](/help/your-events).', updated_at = datetime('now') WHERE slug = 'add-an-event' AND updated_by = 'seed' AND body NOT LIKE '%/help/your-events%';
