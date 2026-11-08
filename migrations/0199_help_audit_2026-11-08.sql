-- Help Center audit 2026-11-08 (see scripts/help/updates-audit-1108.mjs): corrected text for 43 articles. Only articles nobody edited in Admin are changed (updated_by = 'seed').
UPDATE help_articles SET title = 'Is SoCal Lights free?', summary = 'Yes. Finding lights, routes, voting and entering a home are free, and votes are never sold. Featured, Sponsor and contest passes are optional paid extras.', body = 'Using SoCal Lights is free. The map, search, routes and voting stay free for everyone. Entering a contest is free and votes are never sold. Listing an event or a home is free too (you sign in with your email first, see [Why do I need to sign in?](/help/why-sign-in)).

Your organization''s first contest in every 12-month window is free as well. To run more contests in the same window you buy a contest pass: Up to 5, Up to 10 or Up to 20 contests in total, counting the free one. See [Contest passes](/help/contest-passes).

## Optional paid extras

Paid extras are optional and always labeled, and none of them can change a contest result. The [Pricing](/pricing) page shows every price.

- **Contest passes** are for organizers who run more than one contest in 12 months.
- **Featured** is for events and, after a contest, winning homes. An event organizer can add a Featured pin (a gold-ringed pin on the map and a "Featured" badge), a banner (your event as a pill labeled "Featured" in the strip at the top of the map list) and top of the list (your event is listed first when people browse your area). Every paid plan includes the pin; the banner and top of the list are optional extras, and each part costs the same. It runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first. A home can be featured only by the owner of a home that finished winner, 2nd or 3rd place in a contest, after the winners are announced: the Featured pin or Top of the list, for 30 days. Homes are a separate line from event plans.
- **Sponsor** is for installers. A free installer profile stays free. An installer can pay for the Banner, for Top of the list (the company card, without the banner) or for both together, always labeled "Sponsor". A placement runs from the moment you pay to the last day of the season, and the price is the same whenever you start.

Paying never affects a contest. It cannot change who wins, who is ahead or any contest result.

See [Feature an event or a home](/help/feature-an-event-or-home), [Sponsor your installer company](/help/sponsor-your-installer-company) and the [Pricing](/pricing) page.

If you would like to help keep it free, tap the three dots at the top of the map and choose **Support SoCal Lights**. There you can see pricing or leave a tip.', keywords = 'free, cost, price, pricing, pay, paid, charge, contest pass, featured, sponsor, tip, donate, support', updated_at = datetime('now') WHERE slug = 'is-it-free' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Why do I need to sign in?', summary = 'To keep contests fair (one vote per person) and so what you add stays yours to edit. Browsing the map and reading Help needs no account.', body = 'You do not need an account to browse the map, plan a night, sign up for the weekly lights email, report a problem or read this Help Center.

You sign in when you want to do something that belongs to you:

- vote in a contest, enter a home, judge, or run a contest
- add an event or show off a home
- save a draft, claim a listing, or buy a Featured, Sponsor or contest pass placement

An account is tied to one verified email address. That keeps contests to one vote per person, lets organizers reach their entrants, and lets you come back later to edit or remove what you posted.

There is no password. Tap the person icon at the top of the page, then choose **Continue with Google**, or type your email and use the 6-digit code we send you. Both prove the same email, so both open the same account. If something goes wrong, see [I cannot sign in](/help/i-cannot-sign-in).

See our [privacy page](/privacy) for how your information is handled. You can delete your account any time: [How do I delete my account?](/help/delete-my-account)', keywords = 'sign in, login, account, why, email, google, password, vote, add event, add home', updated_at = datetime('now') WHERE slug = 'why-sign-in' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Is my home address public?', summary = 'If you enter a home in a contest or show off your home''s lights, the pin goes on that address and visitors can see it. Your email is never shown.', body = 'When you enter a contest or show off a home, the pin and the street address go on the map, and visitors see them so they can drive by. Your photos are public too. Only add an address you want people to visit.

Your email address is not shown to the public. If you enter a contest, that contest''s organizers can see your name, email, street address and photos so they can run it. The name and address you may save in your profile are only used to fill in forms for you and are never shown.

Some homes are listed by us or by a contest organizer, for example from a city or school holiday tour page. If a home that is yours was listed and you want it gone, you do not need an account:

1. Open the home on the map.
2. Tap **Not your listing? Remove my home**.
3. Tell us the address and an email where we can reach you.

We usually answer within two business days and delete the listing and its photos once approved. You can also use the [Remove my home](/remove-home) form directly.

To take down a home you entered yourself, [withdraw your entry](/help/edit-or-withdraw-your-entry) or ask us. To delete everything, see [How do I delete my account?](/help/delete-my-account)', keywords = 'address, public, privacy, home, pin, remove my home, email, visible, safe, photos', updated_at = datetime('now') WHERE slug = 'is-my-address-public' AND updated_by = 'seed';
UPDATE help_articles SET title = 'How do I delete my account?', summary = 'Tap your account circle, then Your profile, then the Account tab and Delete my account. Tap it a second time to confirm.', body = '1. Tap your account circle at the top of the page (your picture or the first letter of your email).
2. Tap **Your profile**.
3. Open the **Account** tab and scroll to **Delete my account**.
4. Tap **Delete my account**, then tap it again when it asks **Tap again to permanently delete**. This cannot be undone.

We delete your account, sign-ins, saved drafts, profile picture, contest entries (with their photos) and votes, and we close any contests you run. We remove your email, name and phone from judge invitations, co-organizer lists, event claims, your weekly email signup and contact details on reports, and from our copy of quote requests you sent. We also end the monthly update and remove the saved card for automatic renewal if you had one.

A few things stay on purpose:

- Order records for paid placements, with your account link removed (we keep them for accounting and refunds). If a paid placement was still running, we flag it so it can be refunded. Email us if you want to check on it.
- The record that your address unsubscribed, as a one-way scrambled code and not the address itself, so we never email you again.
- A contest whose results were already announced keeps its results, with your home removed from them.

If a home of yours was listed by someone else, use **Remove my home** on the listing (see [Is my home address public?](/help/is-my-address-public)). You can also email info@socallights.app from the address you signed in with. See our [privacy page](/privacy) for the full list, or [ask us](#ask) if you need help.', keywords = 'delete account, remove account, close account, erase my data, privacy, unsubscribe, cancel account', updated_at = datetime('now') WHERE slug = 'delete-my-account' AND updated_by = 'seed';
UPDATE help_articles SET title = 'How do I report a wrong or unsafe listing?', summary = 'Open the event or home and tap Something wrong? Tell us. A home that is not yours can be removed with Remove my home. We read every report.', body = 'Open the event or home on the map and tap **Something wrong? Tell us** (under the details). A short form opens:

1. Say what is wrong in a few words, for example the date has changed, the pin is on the wrong street, or it is closed.
2. Add your email only if you want an answer. It is optional.
3. Tap **Send**.

We read every report. If you send many in a short time you may be asked to try again in an hour.

If a home on the map is yours and you want it removed, tap **Not your listing? Remove my home** on that home. You do not need an account. See [Is my home address public?](/help/is-my-address-public).

For anything else, [ask us](#ask) or write to info@socallights.app.', keywords = 'report, wrong, unsafe, incorrect, problem, listing, correction, remove my home, closed, wrong date, wrong address', updated_at = datetime('now') WHERE slug = 'report-a-problem' AND updated_by = 'seed';
UPDATE help_articles SET title = 'I did not get the email', summary = 'Check Spam or Junk, wait a few minutes, check the address you typed, and look for a message from SoCal Lights.', body = 'Emails from us come from SoCal Lights at login@socallights.app. If one has not arrived:

- Wait two or three minutes, then check your Spam or Junk folder, and Promotions in Gmail.
- Check the address you typed. A single wrong letter sends it elsewhere.
- Search your mailbox for socallights.
- Try again. For a sign-in code, go back and tap **Email me a code** again; use the newest code, because each one works for 10 minutes. You can ask for up to four codes an hour. If you see "Too many codes requested", wait an hour or use **Continue with Google**.
- For the weekly email, we send one confirmation link first and nothing else until you tap it. Open that message and tap the link, or sign up again.
- If you use a work or school address, it may block new senders. Try a personal address.

Still nothing? [Ask us](#ask) and tell us which email you were waiting for. If you cannot sign in at all, see [I cannot sign in](/help/i-cannot-sign-in).', keywords = 'email, code, not received, missing, spam, junk, confirmation, weekly email, sign in code, did not arrive', updated_at = datetime('now') WHERE slug = 'i-did-not-get-the-email' AND updated_by = 'seed';
UPDATE help_articles SET title = 'I cannot sign in', summary = 'Sign in with Google, or with the 6-digit code we email you. Both reach the same account if the email is the same.', body = 'You do not need a password. Tap the person icon at the top of the page, then you can:

- tap **Continue with Google**, or
- type your email, tap **Email me a code**, and enter the 6-digit code we send you.

Both prove the same email address, so both open the same account.

If it will not work:

- Make sure you use the same email each time. A different address is a different account.
- Codes work for 10 minutes and allow 5 tries. If you see "That code has expired", ask for a new one and use the newest.
- You can ask for up to four codes an hour, so if you see "Too many codes requested", wait an hour or use Google.
- Complete the "I am human" check before asking for the code.
- If you see "Sign-in is having trouble right now", it is us, not you. Try again in a few minutes.
- Some throwaway email addresses cannot use the emailed code. Use Google or a regular address.
- In the SoCal Lights app, Google sign-in is not offered. Use the emailed code.
- If the code does not arrive, see [I did not get the email](/help/i-did-not-get-the-email).

If your account was suspended, the message says so. Email info@socallights.app if you think that is a mistake. Still stuck? [Ask us](#ask).', keywords = 'sign in, login, cannot log in, code, google, expired, password, account, wrong code, trouble', updated_at = datetime('now') WHERE slug = 'i-cannot-sign-in' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Enter your home in a contest', summary = 'Tap Enter my home, add photos, your address and a name, then agree to the rules and submit.', body = 'Find the contest ([how](/help/find-contests)) and tap **Enter my home**. You will find it under **Live now** on the Contests page and at the top of the contest page. If entries have closed, the button says Entries are closed.

The entry is a short set of steps. You can leave at any time and come back later: your answers are saved as a draft in [your profile](/help/your-profile), except the photos, which you add again.

1. If you are not signed in, tap **Sign in**. Use Google or an emailed 6-digit code. That is how you come back later to check on your entry.
2. Add photos of your home. Tap **Choose photos**. You can add up to 8, and the first one is the cover.
3. Type your street address and ZIP code. The city is already set to the contest''s city. If your home is in a different city, tap **My home is in a different city**.
4. Choose the name to show, for example, The Kim family. A line about your lights is optional.
5. Check the summary, tick the box to agree to the official rules, then tap **Submit my entry**.

## What happens next

Most organizers review every entry first, so your home will say it is waiting until they approve it. Some contests publish entries right away. The last screen tells you which one yours is, and you also get an email when the organizer approves or declines it.

The address you enter is where the pin goes, and visitors see it so they can drive by. You can enter up to 5 homes in one contest.

If something goes wrong, see [My photo will not upload](/help/my-photo-will-not-upload) and [My entry is not on the map](/help/my-entry-is-not-on-the-map).', keywords = 'enter contest, enter my home, submit entry, contest entry, photos, address, rules, sign in, review', updated_at = datetime('now') WHERE slug = 'enter-your-home-in-a-contest' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Edit or withdraw your entry', summary = 'Open the contest from Mine, then Edit name and description, or Withdraw to take your home out.', body = '1. Open Contests, then **Mine**. If you are signed in you can also tap your account circle at the top of the map and choose **Your contests**.
2. Under **Homes you entered**, tap **Open contest**.
3. Find **Your home** near the top of the contest page.
4. To change the name or the line about your lights, tap **Edit name and description**, change it, and tap **Save**.
5. To take your home out, tap **Withdraw**. It asks you to tap again, so you cannot do it by accident.

You can edit or withdraw while your entry is waiting for the organizer and after it is approved.

You cannot change the photos or the address on an existing entry. To change them, withdraw the entry and enter again while entries are open ([how](/help/enter-your-home-in-a-contest)).

Withdrawing removes your photos and any votes for that home. You cannot undo it, but you can enter again.

Once the organizer announces the winners, the results are locked and Your home no longer shows Edit or Withdraw.', keywords = 'edit entry, change entry, withdraw, remove my home from contest, change photos, change address', updated_at = datetime('now') WHERE slug = 'edit-or-withdraw-your-entry' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Your profile: drafts, contests, badges and your account', summary = 'Tap your account circle at the top of the map and choose Your profile. Each section lists what you have, with buttons on every row.', body = 'Tap your account circle at the top of the map (it shows your photo, or the first letter of your name or email) and choose **Your profile**. On other pages the same circle is at the top right. If you are not signed in, it asks you to sign in first.

Sections are in the menu on the left, or along the bottom on a phone. Each one is a list of rows, and each row has buttons for what you can do with it.

- **Drafts** lists anything you started and saved, including a contest entry. Tap **Continue** to finish it on any device, or **Delete**.
- **Contests** has two lists. **Contests you run** shows each contest you run or help run, with **Manage** and **View page**. **Homes you entered** shows your homes in other people''s contests, whether each is in the contest, waiting for the organizer or not accepted, and **Open contest**.
- **Displays** lists the homes you showed off on the map. You can edit one, take it down for the season, put it back, or delete it.
- **Events** lists the events you added.
- **Badges** shows the awards your home has won. Winners keep a crown. It appears once you have one, and you can choose where your badges show on your listings.
- **Account** is where you change your name and address, turn the monthly update email on or off, sign out, or delete your account. Your name and address are optional, only fill in forms for you, and are never shown publicly.

To change your photo, tap **Add a photo** or **Change photo** under your name at the top of the profile. Use a JPG, PNG or WebP.

To remove a home or an entry, see [Edit or withdraw your entry](/help/edit-or-withdraw-your-entry) and [Unpublish and publish again](/help/unpublish-and-publish-again). To delete your account, see [How do I delete my account?](/help/delete-my-account).', keywords = 'profile, drafts, my contests, displays, events, badges, crown, account, change photo, change name, sign out, delete account', updated_at = datetime('now') WHERE slug = 'your-profile' AND updated_by = 'seed';
UPDATE help_articles SET title = 'My photo will not upload', summary = 'Try fewer or smaller photos, use JPG, PNG or WebP, and check your connection.', body = 'You can add up to 8 photos. Photos are shrunk on your phone before they upload, so they are quick, but an unusual file or a weak signal can still fail.

- If you see **That''s the limit of 8 photos**, remove one with the x on its thumbnail and add the new one.
- If you see **One photo couldn''t be read**, use a normal photo (JPG, PNG or WebP). Screenshots and unusual formats may not work.
- Try one photo first.
- Move to Wi-Fi or a stronger signal and try again.
- If your phone offers it, pick the photo from your gallery instead of taking a new one.

Once you have submitted an entry you cannot swap its photos. Withdraw the entry and enter again ([how](/help/edit-or-withdraw-your-entry)).

Sponsor logos are separate: they must be JPG, PNG or WebP under 600 KB.

Still stuck? [Ask us](#ask).', keywords = 'photo upload, image will not upload, too large, 8 photos, jpg, png, webp, screenshot, heic', updated_at = datetime('now') WHERE slug = 'my-photo-will-not-upload' AND updated_by = 'seed';
UPDATE help_articles SET title = 'My entry is not on the map', summary = 'In most contests the organizer reviews every entry first. Check Mine to see its status, and ask the organizer if it has been a while.', body = 'Most organizers review every entry before it goes on the map, so it is normal for a new entry to wait. Some contests publish entries right away. When the organizer approves your entry you get an email.

1. Open Contests, then **Mine**. Under **Homes you entered**, your entry is listed with its status.
2. If it says **Waiting for the organizer**, they have not reviewed it yet. Ask the organizer, or share the contest link with them.
3. If it says **Not accepted**, the organizer declined it. The email we sent you may include their reason, and you can enter again with new photos or details while entries are open.
4. Check you are signed in with the same email you entered with.
5. If the whole contest says it is waiting for approval, it is not showing to the public yet and entries will appear once it is approved.

While your entry is waiting you can still change its name and description. To change the photos or address, withdraw it and enter again: see [Edit or withdraw your entry](/help/edit-or-withdraw-your-entry).', keywords = 'entry not on map, waiting, approval, declined, not accepted, organizer review, missing entry', updated_at = datetime('now') WHERE slug = 'my-entry-is-not-on-the-map' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Judge a contest', summary = 'Open your invitation email, tap Open my judges'' ballot, and pick a favorite home in each category (or score every home 1 to 10, if the organizer chose scoring).', body = 'Open your invitation email and tap **Open my judges'' ballot**. Sign in with the email address the invitation was sent to.

Your ballot says when voting closes and how many picks or scores you have done. The invitation tells you which way this contest judges:

- **Pick a favorite** (most contests): in each category, tap **Pick** on your favorite home. To change your mind, tap **Move my pick** on another home.
- **Score every home**: give every home a score from 1 to 10 in each category.

1. Tap **Visit the homes** to see the homes in routes of nine stops or fewer. Each route starts where the last one ended, and you tick off homes as you go.
2. Tap a category. Every home is in every category.
3. Know a household? Tap **I know this household**. Your vote for that home will not count. Your own home, if you entered one, is left out for you.
4. Pick or score the other homes.
5. Tap **Ballot** to see your progress.

Judge on first impression, creativity, theme, craftsmanship and variety of lights. Your picks or scores stay private until winners are announced, and you can change them until voting closes.', keywords = 'judge, judges ballot, score, pick favorite, I know this household, recuse, invitation', updated_at = datetime('now') WHERE slug = 'judge-a-contest' AND updated_by = 'seed';
UPDATE help_articles SET title = 'I cannot vote', summary = 'You must be signed in, voting must be open, and you cannot vote for your own home. You get one vote per category.', body = 'Check these in order:

1. **Sign in.** Voting needs an account, which keeps it to one vote per person. Use Google or an emailed code. Throwaway email addresses cannot be used, so use your regular email.
2. **Is voting open?** The contest page shows the voting dates. The buttons say Voting not open before it starts and Voting is over after the winners are announced. The organizer can also pause voting for a while.
3. **Your own home.** You cannot vote for a home you entered. It shows Your home.
4. **Are you a judge?** Judges do not use the public vote. Open the judges'' ballot from your invitation email instead ([how](/help/judge-a-contest)).
5. **One favorite per category.** After you pick one in a category, tap **Move my vote here** on another home to change it.
6. Some contests are judges only. Then the public does not vote.

See [Vote in a contest](/help/vote-in-a-contest).', keywords = 'cannot vote, vote button disabled, voting closed, sign in to vote, own home, judge, paused', updated_at = datetime('now') WHERE slug = 'i-cannot-vote' AND updated_by = 'seed';
UPDATE help_articles SET title = 'I am a judge and cannot open my ballot', summary = 'Open the invitation email and tap Open my judges'' ballot. If it asks you to sign in, use the email the invitation came to.', body = '1. Find the email that says you are invited to judge. If you cannot find it, search for judge and socallights, and check Spam.
2. Tap **Open my judges'' ballot** in that email.
3. If it asks you to sign in, use the email address the invitation was sent to (Google or an emailed code).
4. If it says **This email isn''t a judge here**, you signed in with a different email. Sign out and sign in again with the invited address. Once you are signed in as the right judge, the contest page also shows an **Open the judges'' ballot** link.
5. Still no luck? Ask the contest organizer to check the judge email on their Judges tab. They can add the address you use.

See [Judge a contest](/help/judge-a-contest).', keywords = 'judge cannot open ballot, invitation, this email isn''t a judge, sign in, spam', updated_at = datetime('now') WHERE slug = 'i-am-a-judge-and-cannot-open-the-ballot' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Who can vote in a contest?', summary = 'The organizer chooses: everyone with an account, judges only, or both. Each voter picks one favorite home in each category.', body = 'The organizer decides when creating the contest:

- **Everyone:** anyone with an account (People''s Choice).
- **Judges only:** only invited judges (Judges'' Choice).
- **Everyone and judges:** two awards in each category, counted separately. Judges vote on their own private ballot and do not take part in the public vote.

Every home is in every category, and each public voter picks one favorite home in each. You cannot vote for your own home. Judges either pick a favorite per category or score every home from 1 to 10, as the organizer chooses.', keywords = 'who can vote, public vote, judges only, peoples choice, judges choice, account', updated_at = datetime('now') WHERE slug = 'who-can-vote' AND updated_by = 'seed';
UPDATE help_articles SET title = 'How are winners chosen?', summary = 'Most votes wins in each category. Judges decide their own award by picks or scores. Ties share the win, and results are final once announced.', body = '- **People''s Choice:** the home with the most votes in a category wins.
- **Judges'' Choice:** if judges pick a favorite, the home with the most judge picks in a category wins. If judges score, each home''s scores are averaged and the highest average wins. With five or more judges, the highest and lowest score for a home are dropped first.
- **Ties** share the win. When both the public and judges vote, a tie in the public vote is settled by the judges if that breaks it.
- A flagged home stays on the ballot but cannot win. If the organizer chose one win per home, a home that wins one category cannot win another.

Vote counts are hidden until the organizer announces winners, unless the organizer chooses to show them.

When the organizer announces, the results are saved and cannot be changed. Everyone with an approved home in the contest, and the judges, are emailed the results.', keywords = 'winners, how winners are chosen, tie, judges choice, peoples choice, scores, picks, announce', updated_at = datetime('now') WHERE slug = 'how-winners-are-chosen' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Can I change my vote?', summary = 'Yes, until voting closes. Tap Move my vote here on another home.', body = 'Yes. Until voting closes you can change your vote in any category. Open the category and tap **Move my vote here** on the home you now prefer. The home you voted for shows Your vote.

Judges can change too, until voting closes. If you pick a favorite, tap **Move my pick** on another home. If you score, choose a new score.', keywords = 'change vote, move vote, undo vote, change pick, change score', updated_at = datetime('now') WHERE slug = 'can-i-change-my-vote' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Find lights near me', summary = 'Tap the location button so distances work, pick a season, search a city, and narrow the list with Filters. Tap Route these to drive what you see.', body = '1. Open socallights.app. To see what is close to you, tap **Use my location** when the message appears, or tap the **location button** on the map (top right, under the zoom buttons). Then tap **Allow** in your browser. Distances and "nearest first" depend on it. Nothing happens until you tap.
2. Tap the season button at the top and pick a season, such as **Thanksgiving and Christmas Lights**.
3. Or search: type a city name (or an event) in the search box and tap it in the list.
4. To narrow the list, tap **Filters**. You can pick a date, a city and distance, a county, free or ticketed, a type, and more. Tap the button at the bottom to see the places.
5. Use **Sort** above the list to put the nearest, soonest or free places first.

The list shows the places in the part of the map you are looking at, so move or zoom the map to change it. It is sorted nearest first once the site knows where you are.

Location not working? See [The map does not show my location](/help/location-does-not-work).

## Driving to what you see
Tap **Route these**, the pill on the map. See [Drive a route](/help/drive-a-route).', keywords = 'near me nearby distance season city search filters map locate location button thanksgiving christmas halloween sort nearest route these', updated_at = datetime('now') WHERE slug = 'find-lights-near-me' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Plan a night of lights', summary = 'Tap the heart on places you like, open Favorites, then tap Route these to open the drive in your maps app.', body = '1. On the map, choose a season, then tap the **heart** on each place you want to visit.
2. Open the **Favorites** tab (the heart). Your stops are listed in a sensible driving order, with the miles and the time for the whole drive and the distance from one stop to the next.
3. Choose where to **Start**: **My location**, **First stop**, or a city. Check the maps app shown next to it, and tap it if you want Google Maps, Apple Maps or Waze.
4. Tap **Route these**. A long night is split into routes of nine stops or fewer, and each route starts where the last one ended.
5. Tick each stop when you have been there. Tap a route''s button to open it in your maps app.
6. Tap the **Share** icon to send your favorites to a friend. They open your list on their phone and can add it to their own favorites.

Your favorites are saved on this phone or computer only, so they are not there if you open the site on another device.

See [Drive a route](/help/drive-a-route) for how the routes work.', keywords = 'plan night route hearts favorites favourites share calendar my night directions maps stops start route these', updated_at = datetime('now') WHERE slug = 'plan-a-night' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Drive a route: Route these, Favorites and Visit the homes', summary = 'A long list is split into routes of 9 stops or fewer. Each route starts where the last one ended, and you can tick off stops as you go.', body = 'Your maps app takes about nine stops at a time, so a long list is split into routes of nine stops or fewer. For example, 20 homes become three routes of 7, 7 and 6.

- **Each route starts where the last one ended.** You do not have to plan the break.
- **Tick off stops as you go.** Tap the box next to a stop when you have been there, so you can pick up later. Ticks stay on this device.
- **Choose your maps app:** Google Maps, Apple Maps or Waze. On a phone, the first time you tap a route button the site asks which one to use and remembers your answer. To change it later, tap the arrows icon next to "Opens in".
- **Tap a route''s button** (for example **Open in Google Maps**) to start it.
- **Waze** takes one stop at a time. **Start in Waze** takes you to stop 1; then tap the directions arrow on the next stop.
- **Send to car:** on a phone, tap the car icon on a stop to share it to your Tesla or car app.
- **Apple Maps:** routes with several stops need iPhone software 18.4 or later. On older iPhones the route opens with the first stop only.

## Where you find it
- **On the map:** tap the **Route these** pill. It routes the places you can see on the map. If there are more than 45 in view, zoom in first. (It shows on the Places tab.)
- **In Favorites:** tap **Route these**. It routes your hearted places in order, from the Start you chose.
- **On a contest page**, for voters and judges: **Visit the homes**.

When you are done, tap the X to close.', keywords = 'route routes nine 9 stops route these favorites visit the homes tick off maps google apple waze send to car tesla split long list 20 homes', updated_at = datetime('now') WHERE slug = 'drive-a-route' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Find a contest to vote in or enter', summary = 'Open Contests from the three dots (or your account circle if you are signed in). Live now, Mine and Past results are the three tabs.', body = '1. Start on the map at socallights.app.
2. Open Contests:
   - Not signed in: tap the **three dots** at the top right, then **Contests**.
   - Signed in: tap your **account circle** at the top right, then **Your contests**, and tap the **Live now** tab.
3. **Live now** lists contests that are running and have not announced winners yet. Each one shows whether entries and voting are open. Tap **Vote** (or **See the contest**), or tap **Enter my home** while entries are open.
4. **Mine** shows contests you run and homes you entered.
5. **Past results** shows finished contests and their winners.

Contests also show on the map as cards with the link **Enter your home or vote**. To see only contests on the map, tap **Filters**, then **Contests** under Type.

Can''t find one? See [I cannot find a contest](/help/contest-not-listed).', keywords = 'find contest vote enter live now mine past results menu contests three dots account circle cards map', updated_at = datetime('now') WHERE slug = 'find-contests' AND updated_by = 'seed';
UPDATE help_articles SET title = 'I cannot find a contest', summary = 'Live now lists contests that are running and have not announced winners. Check Past results, or ask the organizer for the contest link.', body = '- Start on the map at socallights.app. Not signed in: tap the three dots at the top right, then **Contests**. Signed in: tap your account circle, then **Your contests**, and open the **Live now** tab.
- **Live now** lists contests that are running and have not announced their winners yet. Each shows whether entries and voting are open, or when voting opens.
- Once winners are announced, the contest moves to **Past results**.
- A contest that has just been created may not be live yet. It can wait for the site owner to approve it first, so ask the organizer if theirs should be running.
- Ask the organizer for the contest link or QR code. It opens the contest directly.
- Contests also show on the map as cards. Pick the right season and city, or tap **Filters**, then **Contests** under Type.', keywords = 'contest not listed missing cannot find live now past results link qr code not showing approval', updated_at = datetime('now') WHERE slug = 'contest-not-listed' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Find professionally installed displays', summary = 'Open Filters, choose Professionally installed under Type, and open an installer''s profile.', body = '1. Choose a season (for example **Thanksgiving and Christmas Lights**).
2. Tap **Filters**. Under **Type**, tap **Professionally installed**.
3. Tap the button at the bottom (**Show** and the number of places) to see them.
4. Open one. A home says **Installed by** with the company''s name. A check mark means the installer confirmed it.
5. Tap the company''s name to open its profile, with its service area, phone, website, a way to request a quote, and the homes it has installed.', keywords = 'professionally installed installer company filter type profile quote phone website homes', updated_at = datetime('now') WHERE slug = 'find-professionally-installed-displays' AND updated_by = 'seed';
UPDATE help_articles SET title = 'The map does not show my location', summary = 'Your browser needs permission to share your location. Tap the location button on the map, allow it for socallights.app, or search for a city instead.', body = 'Distances and "nearest first" need your location. If they are missing:

- Tap the **location button** on the map (top right, under the zoom buttons) and tap **Allow** when your browser asks. Give it up to 20 seconds. If it is still looking, tap it again.
- If you tapped **Block** or **No thanks** before, the site cannot ask again. Allow it in your browser:
  - **iPhone:** open Settings, Privacy & Security, Location Services. Turn it on, then tap Safari Websites (or your browser) and choose **While Using the App**. Reload the page.
  - **Android:** tap the lock icon in the address bar, then Permissions, Location, **Allow**. Also check that Location is on in your phone''s quick settings. Then tap the location button again.
  - **Computer:** open your browser''s site settings for socallights.app and set Location to **Allow**, then reload.
- Opened the site from Instagram, Facebook, TikTok or another app''s built-in browser? Those block location. Open socallights.app in Safari or Chrome instead.

You can always skip location: search for a city, or pick a season, and the map works the same way.', keywords = 'location blocked not working gps near me locate button permission allow iphone android safari chrome instagram facebook in-app browser distances nearest', updated_at = datetime('now') WHERE slug = 'location-does-not-work' AND updated_by = 'seed';
UPDATE help_articles SET title = 'I do not see Add to Home Screen', summary = 'On iPhone use Safari. On Android use Chrome. Browsers built into other apps do not offer it.', body = '- **Open the site in a real browser.** If you came from a link in Instagram, Facebook, TikTok, email or another app, the page opens in that app''s own browser, which has no install option. Open **socallights.app** in Safari or Chrome instead.
- **iPhone:** use **Safari**. It is the most reliable. Tap the **Share** button, scroll down, then tap **Add to Home Screen**.
- **Android:** use **Chrome**. Tap the three dots, then **Install app** or **Add to Home screen**.
- If it is already on your Home Screen, the option is hidden.

See [Put SoCal Lights on your phone](/help/install-the-app).', keywords = 'add to home screen missing install app iphone android safari chrome instagram facebook in-app browser share button', updated_at = datetime('now') WHERE slug = 'no-add-to-home-screen' AND updated_by = 'seed';
UPDATE help_articles SET title = 'What do Confirmed and Expected mean on an event?', summary = 'Confirmed means the event''s own page shows its name and this year''s dates. Expected means the dates have not been checked yet.', body = '- **Dates confirmed:** the event''s own web page shows its name and this year''s dates.
- **Expected from past years · check site:** the event is on the map, but its dates have not been checked yet. Many events repeat every year, so the dates are our best expectation. Check the organizer''s page before you travel.

To see only checked events, tap **Filters** and turn on **Confirmed dates only**.

See something wrong? Open the event and tap **Something wrong? Tell us**.', keywords = 'confirmed expected dates verified check organizer filter confirmed dates only tag', updated_at = datetime('now') WHERE slug = 'confirmed-or-expected' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Create a contest with Quick start', summary = 'Tap Add, then A contest. Seven short screens, and your contest has its own link and QR code.', body = 'Start at socallights.app. If you are signed in, tap your account circle at the top right, then **Add an event, home or contest**. If you are not signed in, tap the three dots at the top right, then **Add**. You can also go straight to socallights.app/add.

1. Tap **A contest**.
2. Name your contest. Type a name, then Next.
3. Who is running it? Type the name, pick your city, then Next.
4. The welcome message is already written. Keep it, or change it, then Next.
5. A website is optional. Next.
6. The dates are filled in for you. Next.
7. Choose **Quick start**. It sets everything up for you. Next.
8. Check your details and tap **Create contest**. If you are not signed in yet, you are asked to sign in here, and nothing you typed is lost.
9. Tap **Open my dashboard**. Your link and QR code are ready to share.

Most contests go live right away. If we hold yours for a quick look, you see "Your contest is almost ready". We email you when it is approved, usually within a day, and your link and QR code already work.

Want judges, prizes or your own categories? Use [Customize](/help/create-a-contest-customize).

## Your first contest is free

Your organization''s first contest in every 12-month window is free. To run more contests in the same window, the Review screen shows the contest passes when you need one, and your contest is created as soon as you pay. See [Contest passes](/help/contest-passes).', keywords = 'create contest, start a contest, quick start, add contest, run a contest, new contest, qr code, link, organizer', updated_at = datetime('now') WHERE slug = 'create-a-contest-quick-start' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Create a contest with Customize', summary = 'Choose Customize everything to add judges, a prize, your own categories and your own rules.', body = 'Follow the same first screens as [Quick start](/help/create-a-contest-quick-start), then on the setup screen choose **Customize everything**.

- **Categories:** keep the ones you like, turn one off, or add your own (for example, Best Inflatable).
- **Who can vote:** everyone, judges only, or everyone and judges.
- **Judges:** type one email on each line. (Skipped when only the public votes.)
- **How judges vote:** pick a favorite, or score every home. (Skipped when only the public votes.)
- **Approving entries:** reviewing each entry first is recommended.
- **Vote counts:** hidden until you announce winners is the default. (Skipped when only judges vote.)
- **A few fairness rules:** a home can win several categories, or one win per home.
- **Prize:** none, the same for every winner, or a different one for each award.
- **Official rules:** written for you. Edit anything you like.

Finish with **Create contest**, then **Open my dashboard**. You can change most of this later from the dashboard.

## Your first contest is free

Your organization''s first contest in every 12-month window is free. To run more contests in the same window, the Review screen shows the contest passes when you need one, and your contest is created as soon as you pay. See [Contest passes](/help/contest-passes).', keywords = 'customize contest, judges, prize, categories, rules, who can vote, one win per home, vote counts, create contest', updated_at = datetime('now') WHERE slug = 'create-a-contest-customize' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Approve and decline entries', summary = 'On the Entries tab, tap Approve to put a home on the map, or Decline with an optional reason. You can also add homes yourself.', body = 'Open your dashboard ([how](/help/share-your-contest)) and tap **Entries**. When you review each entry first (the recommended setting), nothing goes on the map until you approve it.

1. Tap **Approve** to put a home in the contest and on the map.
2. Tap **Decline** if an entry does not fit. A window asks why. The reason is optional, and it is emailed to the entrant. Tap **Decline entry**.
3. Changed your mind? Tap **Undo decline** to put it back.

If you chose to publish entries right away, new entries appear on the map by themselves. You can still decline one afterwards. You can switch this setting under Details ([how](/help/edit-your-contest-and-change-dates)).

## Homes you add yourself

At the top of Entries is **Add homes yourself**. Use it when residents sign up somewhere else, such as a city form or a spreadsheet. See [Add your city''s homes](/help/add-your-citys-homes-yourself).

Homes you add carry an **Added by organizer** tag. They are approved already, so there is nothing to approve. To take one out, tap **Remove** on its row. It asks you to tap again, so you cannot do it by accident. Remove is there until the home gets its first vote or the winners are announced.', keywords = 'approve entry, decline entry, undo decline, entries tab, waiting for you, added by organizer, remove home, organizer', updated_at = datetime('now') WHERE slug = 'approve-and-decline-entries' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Add your city''s homes yourself', summary = 'On the Entries tab, paste one address per line under Add homes yourself, tap Check addresses, then Add homes.', body = 'Already taking sign-ups somewhere else, such as a city form, a spreadsheet or email? You can put those homes in the contest yourself. The resident does not need a photo or an account.

1. Open your dashboard ([how](/help/share-your-contest)) and tap **Entries**.
2. Open **Add homes yourself**.
3. Paste one home per line, like this: Street address, City, ZIP | Name. The city, ZIP and name are optional. Without a city, the contest''s city is used. A column pasted from a spreadsheet works too.
4. Tap **Check addresses**. Every line is marked Found, or tells you what is wrong, such as Already in this contest.
5. Tick **These residents agreed to have their address shown on the public map**. Only tick it if they did.
6. Tap **Add homes**. The button shows how many it will add.

Each home goes straight onto the ballot and the driving routes. Its entry carries an **Added by organizer** tag. To take one out, tap **Remove** on its row, then tap again to confirm.

## Good to know

- You can paste up to 100 homes at a time, and add up to 500 homes this way to one contest.
- While your new contest is waiting for our quick review, you can add up to 25 homes. The limit lifts when we approve it.
- Homes can be added once your contest is live and until voting starts. After that the card says so, because it would change the ballot under the voters.
- Checking and adding are limited to about 1,000 homes an hour. If you hit the limit, wait a little and try again.

See also [Approve and decline entries](/help/approve-and-decline-entries).', keywords = 'add homes, paste addresses, spreadsheet, city form, entries tab, organizer added, bulk add, check addresses', updated_at = datetime('now') WHERE slug = 'add-your-citys-homes-yourself' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Edit your contest and change the dates', summary = 'On the Overview, tap Change dates, edit what you need on the Details tab, and tap Save changes. The same tab can start next year''s contest.', body = 'Open your dashboard ([how](/help/share-your-contest)). On the Overview, find **Schedule** and tap **Change dates**. It opens the **Details** tab, where **Edit contest details** is ready. You can also tap Details yourself.

1. Change the date that entries close, and the voting dates. You can also change the name, who runs it, the welcome message, how entries are approved, the prize, the official rules, and a presenting installer.
2. Tap **Save changes**.

Entrants see changes right away, and the rest of the team is emailed about changes, so nobody is surprised.

Good to know:

- The voting categories are locked after the first vote, because votes belong to a category.
- Once you announce the winners, the details are locked.
- Only the person who created the contest can change its details. Co-organizers can approve entries, review votes and manage judges and sponsors.

If it will not save, see [My dashboard changes did not save](/help/dashboard-changes-did-not-save).

## Run it again

At the bottom of the Details tab, **Run it again** starts a new contest with the same rules, categories, prizes and judges, and every date a year later. Tap **Run this contest again next year**, then tap again to confirm. Sponsors are copied as drafts: confirm each payment (or gift) and permission again before they show. You can edit the new contest before it opens. It counts toward your organization''s 12-month window, so a second contest in the same window may need a [contest pass](/help/contest-passes).', keywords = 'edit contest, change dates, entries close, voting dates, rules, prize, welcome message, run it again, next year, copy contest, details tab', updated_at = datetime('now') WHERE slug = 'edit-your-contest-and-change-dates' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Unpublish a contest and publish it again', summary = 'On the Controls card, tap Unpublish to hide your contest. Tap Publish again to bring it back.', body = 'Open your dashboard ([how](/help/share-your-contest)). On the **Controls** card, find **Contest page**.

1. Tap **Unpublish**. The button asks you to tap again, so you cannot do it by accident. Tap it once more.
2. The contest is hidden from the public and the map, and new entries and votes are paused.

Nothing is deleted. Your entries and votes stay, and your team can still open the dashboard. Your co-organizers are told.

To bring it back, tap **Publish again** in the same place, or **Publish it again** in the notice at the top of the Overview.

Only the person who created the contest can unpublish it, and only that person can publish it again. If the site owner took your contest off the map, Publish again will not work. Contact us.

See also [Run voting](/help/run-voting).', keywords = 'unpublish contest, hide contest, take off map, publish again, republish, pause contest, remove contest from map', updated_at = datetime('now') WHERE slug = 'unpublish-and-publish-again' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Add co-organizers and judges', summary = 'Team is for co-organizers, Judges is for judges. Type an email and add them. They get an invitation by email.', body = 'Open your dashboard ([how](/help/share-your-contest)) and tap **Team**.

- **Co-organizers** help you run the contest. Type their email and tap **Add co-organizer**. They get an email with one button to open the dashboard, and they sign in with that email. You can add up to 8, and only you, the person who created the contest, can add or remove them. They can approve entries, review votes, and manage judges and sponsors. Changing the contest''s details, pausing voting, unpublishing and announcing winners stay with you.
- **Judges** are added on the **Judges** tab. It shows when your contest has judges, so choose "Judges only" or "Everyone and judges" when you create it. Type a judge''s email and tap **Add judge**. Your judge gets an invitation with a button that opens their ballot. The tab also shows who has finished and has a button to remind judges who have not.', keywords = 'co-organizer, add judge, team tab, judges tab, invite judge, invite co-organizer, staff, help run contest', updated_at = datetime('now') WHERE slug = 'add-co-organizers-and-judges' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Announce winners', summary = 'On Results, tap Close voting and announce winners, then tap again to confirm. It cannot be undone.', body = 'Open your dashboard and tap **Results**. It shows who would win if you announced today.

1. Tap **Download results (spreadsheet)** to save the tally.
2. When voting is over, tap **Close voting and announce winners**. It asks you to tap again, because this cannot be undone.
3. If voting has not started, nobody has voted, or some judges have not finished, the button warns you with **Announce anyway?**. Tap again only if you are sure.
4. Everyone who entered is emailed the results, and winners get a congratulations with their prize. Your judges and you are emailed too. The winners keep a crown on the contest page.
5. To see what everyone sees, tap **See it as voters do** in the menu.

Only the person who created the contest can announce winners. Tied homes share the win.', keywords = 'announce winners, close voting, results, download results, crown, winners email, end contest, final results', updated_at = datetime('now') WHERE slug = 'announce-winners' AND updated_by = 'seed';
UPDATE help_articles SET title = 'My dashboard changes did not save', summary = 'Read the red message above Save changes. Usual causes: dates out of order, a name, welcome message or rules that are too short, or categories locked after voting started.', body = 'When a change cannot be saved, a red message appears just above the **Save changes** button and tells you what to fix. Common causes:

- **Dates.** Entries should close before voting starts, and voting must end after it starts. The voting end date also cannot be in the past.
- **Something is too short or empty.** The contest name needs at least 4 letters, the welcome message at least 20 characters, and the official rules a few sentences.
- **Categories.** They are locked once the first vote is in, because votes belong to a category. Put them back as they were and save the rest.
- **Installer quote email.** If you fill in a presenting installer, add the email where quote requests should go.
- **You are a co-organizer.** Only the person who created the contest can change its details. See [Add co-organizers and judges](/help/add-co-organizers-and-judges).
- **Winners are announced.** After that the details are locked.

Fix what the message says, then tap **Save changes** again. If it still fails, [ask us](#ask) and tell us the message you see.', keywords = 'changes did not save, cannot save, save changes, error, dates, rules too short, categories locked, dashboard, details', updated_at = datetime('now') WHERE slug = 'dashboard-changes-did-not-save' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Add sponsors and logos to your contest', summary = 'On the Sponsors tab, add a company, its level, website and logo, confirm how it supported you and tick permission and Show. It then appears on your contest page, labelled Sponsor.', body = 'Sponsors are the businesses that support your contest. They show on your contest page, always labelled "Sponsor". You add them on the Sponsors tab.

1. Open your dashboard (how) and tap Sponsors.
2. Under Add or edit a sponsor, type the company name and choose a Level: Presenting sponsor, Gold, Silver or Prize sponsor.
3. Add their website and choose their logo (JPG, PNG or WebP, under 600 KB). The contact name, phone, email and amount are optional. Only you and SoCal Lights staff see them.
4. Under How the sponsorship counts, choose Paid to me or Donated in kind. For Paid to me, tick that you collected the payment yourself and add the date and how it was paid. For Donated in kind, say what was given.
5. Tick that you have the sponsor''s permission, and tick Show on the contest page.
6. Tap Save sponsor.
7. To check how it looks, tap See it as voters do.

A sponsor shows on the contest page only when all of that is done. A line under each sponsor tells you its status, for example Not confirmed: not shown.

## Let sponsors come to you
Once your contest is live and approved, you can share one private invite link instead of typing everything yourself.

- On the Sponsors tab, under Invite a sponsor, tap Create invite link, then Copy link or Email this link.
- A sponsor fills in a short form. They do not need an account.
- Their request waits under Waiting for your review. Tap Mark payment received, Approve for the contest page or Decline. Nothing shows on your page until you approve it.
- Anyone with the link can send a request, so share it only with people you want to hear from. Make a new link to stop the old one, or tap Turn link off.

## How sponsors pay you
Under How sponsors pay you, you can add your own payment link or instructions and up to three sponsor levels with amounts. Sponsors pay you directly. SoCal Lights never charges them, and payment never affects who wins.', keywords = 'sponsor sponsors logo logos tier level gold silver presenting prize sponsor invite link contest page payment permission in kind', updated_at = datetime('now') WHERE slug = 'add-sponsors-and-logos' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Add a presenting installer and quote requests', summary = 'Add a lighting company on Details. While your contest is live, its page gets a Get a quote button that sends requests to the company and to you.', body = 'A presenting installer is a lighting company you partner with. Your contest page shows a labelled advertisement with a Get a quote button for neighbors.

1. Open your dashboard and tap Details. Scroll to Presenting installer.
2. Type the company''s name, the email where quote requests should go, and their website.
3. Tap Save changes. This adds a Get a quote button to your contest page while the contest is live.

## What a neighbor sees
They open the contest page and tap Get a quote. They sign in if they have not yet, add their name and what they would like done, and tick the box to share their details. Then they tap Send request.

Their details go only to that company and to you, the organizer, and only if they tick the box. SoCal Lights also keeps a copy. The form says so before they send it.

## Where you see requests
Open your dashboard and tap Promote. Quote requests are listed under Activity, and you also get an email for each one.', keywords = 'presenting installer quote request get a quote lighting company advertisement leads contest', updated_at = datetime('now') WHERE slug = 'presenting-installer-and-quote-requests' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Installer profiles and "Installed by"', summary = 'A home can name the company that installed it. A check mark means the company confirmed it. Companies claim their free profile and confirm homes on their dashboard.', body = 'On a home, Installed by shows the company''s name. A check mark means the company confirmed it. Tap the name to open the company''s profile, with its phone, website, areas served, a Request a quote button and every home it has on the map.

## If this is your company
- No profile yet? Create your free profile (Add, then A lighting display, then A professional installer).
- Already on the map? Open your company''s profile and tap Is this your company? Claim this profile at the bottom. Sign in first.
- If your email is at your company''s website, it is yours right away. If not, a person checks and emails you.
- Manage the profile from your installer page. Homes that name your company are listed on the Homes tab. Tap Confirm for each home you installed. It gets a check mark, and you and the homeowner can then both edit its listing. Tap Not ours for one you did not install.', keywords = 'installer profile installed by claim company confirm check mark not ours request a quote free profile', updated_at = datetime('now') WHERE slug = 'installer-profiles' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Add an event to the map', summary = 'Tap Add, then An event. Name it, pick the dates, add the place, and tap Add my event.', body = '1. Start on the map at socallights.app. If you are signed out, tap the three dots at the top right and tap Add. If you are signed in, tap your account button (the person icon) and choose Add an event, home or contest. Then tap An event.
2. Sign in with Google or an emailed code if asked. Your event is saved to your account.
3. If your event has a web page, paste it. If not, tap No... Next. With a page that mentions the event''s name and date, it shows as Confirmed. Without one, it still goes on the map, marked Expected until the dates are checked.
4. Type the event''s name, and choose a season and type. Next.
5. Pick the first and last day. Next.
6. Free or paid? Next.
7. Type the place, the city and the street address. Next.
8. Describe it in a sentence or two. Next.
9. Check everything and tap Add my event.

## Want it to stand out?
On the last step you can choose a paid Featured plan, or No thanks, just list it. If you pick a plan, you go straight to Stripe''s secure page after tapping Add my event. See [Feature an event or a home](/help/feature-an-event-or-home). Listing your event is always free.', keywords = 'add event submit event tree lighting parade haunted house market confirmed expected featured sign in', updated_at = datetime('now') WHERE slug = 'add-an-event' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Show off your home on the map', summary = 'Tap Add, then A lighting display. Photos, address and a description put your home''s lights on the map for families to drive by.', body = '1. Start on the map at socallights.app. If you are signed out, tap the three dots at the top right and tap Add. If you are signed in, tap your account button (the person icon) and choose Add an event, home or contest. Then tap A lighting display.
2. Sign in with Google or an emailed code if asked.
3. Who is posting? Choose A homeowner (or A professional installer). Next.
4. Type the name to show. Next.
5. Did a company install your lights? If you did it yourself, tap No. Next.
6. Choose the season. Next.
7. Name your home and tell us what makes it special. Next.
8. Add the address. The pin goes here, and visitors see it so they can drive by. Next.
9. Tell families when the lights are on and how to see them (drive by, walk by, parking). Next.
10. Add photos. Next.
11. Check everything and tap Put it on the map.

Nothing goes public until the last step, and you can save and exit at any time. Saved drafts are in your profile. Most homes go live right away. If we hold one for a quick check, the site owner publishes it and may email you.

If you are a professional installer, you give a website or phone number for quotes and tick that you have the homeowner''s permission to show the address.

## Is your home already on the map?
Some homes are on the map already, with a photo from the street. If yours is one of them, tap Is this your home? Claim it on its card instead. The form opens with your address filled in. See [Is this your home? Claim it](/help/claim-your-home).', keywords = 'show off house home display lights add my home showcase photos address homeowner installer drive by draft', updated_at = datetime('now') WHERE slug = 'show-off-your-house' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Is this your home? Claim it', summary = 'Open your home''s card on the map and tap Is this your home? Claim it. The form starts with your address filled in.', body = 'Some homes are on the map already, found by us with a photo from the street. If one of them is yours, you can add your own photos and details.

1. Find your home on the map and tap it to open its card.
2. Tap Is this your home? Claim it.
3. Sign in if asked. The form opens with your address filled in, and the first step says You are claiming your home''s name.
4. Fill in the steps the same way as in [Show off your home on the map](/help/show-off-your-house), and tap Put it on the map.

Your listing usually goes live right away and replaces the automatic one at the same address. If we hold it for a quick check, it replaces the automatic one once the site owner approves it.

The claim link shows only on homes we found ourselves. A home you posted, or one entered in a contest, does not have it.

## Would you rather it was not on the map?
At the bottom of the card, tap Not your listing? Remove my home. Tell us the address and your email. A person on our team looks at it, usually within two business days, and emails you when the home is removed.', keywords = 'claim home is this your home automatic listing street photo replace remove my home', updated_at = datetime('now') WHERE slug = 'claim-your-home' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Feature an event or a home', summary = 'Featured is optional and paid. Open the Feature page, choose your event or winning home, pick a plan and pay on Stripe.', body = 'A Featured listing has a gold badge and a bigger gold-ringed pin on the map. It is optional. The Pricing page shows what each plan costs.

An event
- Open the Feature page at socallights.app/feature, or tap Choose on a plan on the Pricing page.
- Pick a plan (below).
- Sign in, then choose your event. If it is not on the map yet, add it for free first. If it is yours but you did not add it, open Claim an existing listing, search for it and tap This is my event: claim it.
- Check the dates and the total, then tap Pay on Stripe and pay on Stripe''s secure page, with a card or Cash App Pay.

### The plans for an event
Every plan is built from three parts. The pin is in every plan; the banner and top of the list are optional extras, and each part costs the same.

Featured pin
- A gold-ringed pin on the map
- A "Featured" badge on your event in the list and in its details
- Runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first

Banner + Featured pin
- A gold-ringed pin on the map
- A "Featured" badge on your event in the list and in its details
- Your event as a pill labeled "Featured" in the strip at the top of the map list, with its name, city and dates; tap it to open your event
- The pill shows whenever your event is in the map view
- How many times your banner was shown and tapped, on your Feature page
- Runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first

Top of the list + Featured pin
- A gold-ringed pin on the map
- A "Featured" badge on your event in the list and in its details
- Your event is listed first when people browse your area
- Runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first

Top of the list + Banner + Featured pin
- A gold-ringed pin on the map
- A "Featured" badge on your event in the list and in its details
- Your event as a pill labeled "Featured" in the strip at the top of the map list, with its name, city and dates; tap it to open your event
- The pill shows whenever your event is in the map view
- How many times your banner was shown and tapped, on your Feature page
- Your event is listed first when people browse your area
- Runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first

### When it starts and ends
- Featuring opens 30 days before your event starts. If you try sooner, the page tells you the date to come back. An event that is already running can be featured any time.
- It starts the moment you pay and ends on your event''s last day or the last day of the season it was bought in (Christmas lights: Jan 6), whichever comes first. The price is the same whenever you buy, and the Feature page shows the exact dates and the total before you pay.
- Already have the pin? To add the banner or top of the list, pick the plan you want: you pay only for the parts you add. A plan that would add nothing is not sold, and the page says so.
- Buying again never shortens what you already have.

A home
Only the owner of a home that finished winner, 2nd or 3rd place in an announced contest can feature it. Paying never changes a contest result. Homes have two plans, each for 30 days from the day you pay: the Featured pin (a gold-ringed pin and a "Featured" badge) and Top of the list (the same, and your home is listed first when people browse your area).

Good to know
- You pay once per event or home. There is no subscription.
- Featured listings are always labeled, and they still have to be real and accurate.
- If we cannot list or feature your event, you get a full refund of every part. Once it is live, payments are non-refundable, but if your event is cancelled, email us and we will move your placement to another of your events or refund the unused time. A refund or a payment dispute switches the placement off.
- The map, search, routes and voting stay free. See [Is SoCal Lights free?](/help/is-it-free).
- Featured is bought on the website, not in the app.', keywords = 'feature featured pin banner top of the list gold pin pay stripe plan event home claim event refund badge', updated_at = datetime('now') WHERE slug = 'feature-an-event-or-home' AND updated_by = 'seed';
