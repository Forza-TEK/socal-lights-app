-- Help Center: three new articles for the organizer and homeowner features added 2026-11-10 (edit a home you added; photos and the homeowner's private link; the homeowner's own page), plus links from two existing articles.
-- The Video field holds the video's FILE name. Existing articles are only changed when nobody edited them in Admin (updated_by = 'seed'). Paste-ready text is in docs/help-updates.md.
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('edit-a-home-you-added', 'Fix a home you added to your contest', 'run', 'howto', 'On the Entries tab, tap Edit on a home you added, fix the name, description or address, then tap Save.', 'Typed a family name wrong, or pasted the wrong street number? You can fix any home you added yourself.

1. Open your dashboard ([how](/help/share-your-contest)) and tap **Entries**.
2. Find the home. Homes you added carry an **Added by organizer** tag and an **Edit** button.
3. Tap **Edit**.
4. Fix the name, the description, or the address.
5. Tap **Save**.

The change shows everywhere at once: the ballot, the judges'' ballot, the driving routes, and the map.

## Good to know

- Changing the address moves the pin, so we look the new address up again. It cannot be the same as another home already in your contest.
- After the winners are announced, the address is locked. The name and the description can still be fixed.
- The **Edit** button is only on homes you added. A home a resident entered themselves is edited by that resident: see [Edit or withdraw your entry](/help/edit-or-withdraw-your-entry).
- Co-organizers can edit these homes too.
- Added a home by mistake? Tap **Remove** on its row, as described in [Add your city''s homes yourself](/help/add-your-citys-homes-yourself).

See also [Add photos to homes you added](/help/add-photos-to-homes-you-added).', 'edit home, fix name, misspelled name, wrong address, change address, organizer added, edit entry, correct a mistake', 'run-edit-home', 46, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('add-photos-to-homes-you-added', 'Add photos to homes you added, and send the owner a link', 'run', 'howto', 'On the Entries tab, tap Photos on a home to add photos, and tap Copy link or Email link to send the homeowner a private link.', 'Homes you add yourself start with no photo. You can add photos yourself, and you can send the homeowner a private link so they can add their own.

## Add photos yourself

1. Open your dashboard ([how](/help/share-your-contest)) and tap **Entries**.
2. On the home, tap **Photos**.
3. Tap **Add photos** and choose up to eight pictures from your phone or computer. They are made smaller on your device before they upload.
4. To take a photo off, tap the cross on it.

Photos you add show at once on the contest page, the ballot and the map. As the organizer you can remove any photo of the home, including the homeowner''s.

## Send the homeowner a link

Each home you added has a private link, just for that home. On the home''s row, tap **Copy link** to copy it, or **Email link** to open an email with the link and a short message already written. The same link is in the Photos box.

The homeowner opens it, signs in, and links the home to their account: see [Your city added your home](/help/your-city-added-your-home) for what they see. Once they have linked it, the entry shows their email, like any other entrant''s.

## If the wrong person got the link

- **Make a new link** makes the old link stop working. Use it when the link went to the wrong person and nobody has linked the home yet.
- **Unlink this homeowner** removes the person who linked the home, and gives you a new link to send to someone else.

## Good to know

- Photos can be added and removed until voting closes. After that they are locked.
- A home can have up to eight photos. Photos the homeowner hides still count.
- The homeowner can hide the photos you added, but cannot delete them.

See also [Fix a home you added to your contest](/help/edit-a-home-you-added).', 'add photos, home photos, organizer photos, homeowner link, private link, email link, copy link, new link, unlink homeowner, photos for added homes', 'run-home-photos', 47, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('your-city-added-your-home', 'Your city added your home: add photos and details', 'enter', 'howto', 'Open the private link from your city, tap Yes, this is my home, then check the details and add your own photos.', 'If a city or neighborhood group put your home in a contest, they can send you a private link. It lets you link the home to your account, check its details, and add your own photos. You do not need to enter again.

1. Open the link from your email. It opens a private page for your home.
2. If the page asks, sign in with your email, or with Google.
3. Tap **Yes, this is my home: link it to my account**.
4. Check the details: the name, a description, when the lights are on, a tip for visitors, how to see it, parking, and the radio station. Tap **Save changes**.
5. Under **Photos**, tap **Add your own photos** and choose pictures from your phone or computer.

The home is now on your profile, under Contests and under Displays.

## What you can and cannot do

- You can change the details, add your own photos, and delete your own photos.
- You can hide the photos the organizer added. You cannot delete them.
- You cannot change the home''s address (ask the organizer), delete the home from the contest, or change the contest.

## Good to know

- We use your email to send you contest updates and results, and the organizer can see it.
- The first account to link the home keeps it. If the page says the home is linked to another account, ask the organizer to unlink it and send you a new link.
- The link is private. Do not post it, because whoever links first gets the home.
- A link that says it is not active was replaced. Ask the organizer for a new one.
- You can change your home until voting ends.

See also [Edit or withdraw your entry](/help/edit-or-withdraw-your-entry).', 'city added my home, private link, link my home, homeowner link, add photos, edit details, claim home, organizer added my home, photos link', 'enter-city-home', 15, 'published', 'seed');
UPDATE help_articles SET body = body || '

## After you add the homes

- Fix a mistake with **Edit** on the home''s row: [Fix a home you added](/help/edit-a-home-you-added).
- Add photos, and send the homeowner a private link with **Copy link** or **Email link**: [Add photos to homes you added](/help/add-photos-to-homes-you-added).', updated_at = datetime('now') WHERE slug = 'add-your-citys-homes-yourself' AND updated_by = 'seed' AND body NOT LIKE '%/help/edit-a-home-you-added%';
UPDATE help_articles SET body = body || '

## If your city added your home

A city or neighborhood group can enter your home for you and send you a private link. See [Your city added your home](/help/your-city-added-your-home).', updated_at = datetime('now') WHERE slug = 'edit-or-withdraw-your-entry' AND updated_by = 'seed' AND body NOT LIKE '%/help/your-city-added-your-home%';
