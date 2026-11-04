-- The first Help Center articles (see scripts/help/articles.mjs). INSERT OR IGNORE: an article edited in Admin > Help is never overwritten.
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('find-lights-near-me', 'Find lights near me', 'find', 'howto', 'Tap Use my location, pick a season, search a city, and narrow the list with Filters.', '1. Open socallights.app. When the message asks to use your location, tap **Use my location**, then **Allow** in your browser. Distances and directions depend on it.
2. Tap the season button at the top and pick a season, such as **Thanksgiving and Christmas Lights**.
3. Or search for a city: type its name and tap it in the list.
4. To narrow the list, tap **Filters**. You can pick a date, a distance, a type, and more.

The list is sorted nearest first once the site knows where you are.

## Driving to what you see
Tap **Route these**, under the list. See [Drive a route](/help/drive-a-route).', 'near me nearby distance season city search filters map thanksgiving christmas halloween', 'find-map', 10, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('plan-a-night', 'Plan a night of lights', 'find', 'howto', 'Tap the heart on places you like, open My night, then open the route in your maps app.', '1. On the map, choose a season, then tap the **heart** on each place you want to visit.
2. Tap **My night**. Your stops are listed in a sensible driving order, with the miles and the time.
3. Tap **Open route**. A long night is split into routes of nine stops or fewer, and each route starts where the last one ended.
4. Tick each stop when you have been there. Tap a route''s button to open it in your maps app.
5. Tap **Share** to send your night to a friend.

See [Drive a route](/help/drive-a-route) for how the routes work.', 'plan night route hearts favorites share calendar my night directions maps stops', 'find-night', 20, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('drive-a-route', 'Drive a route: Route these, Open route and Visit the homes', 'find', 'howto', 'A long list is split into routes of 9 stops or fewer. Each route starts where the last one ended, and you can tick off stops as you go.', 'Your maps app takes about nine stops at a time, so a long list is split into routes of nine stops or fewer. For example, 20 homes become three routes of 7, 7 and 6.

- **Each route starts where the last one ended.** You do not have to plan the break.
- **Tick off stops as you go.** Tap the box next to a stop when you have been there, so you can pick up later.
- **Choose your maps app** (Google Maps or Apple Maps), then tap a route''s button to open it.

## Where you find it
- On the map, under the list: **Route these**.
- In **My night**: **Open route**.
- On a contest page, for voters and judges: **Visit the homes**.

When you are done, tap the X to close.', 'route routes nine 9 stops open route route these visit the homes tick off maps google apple split long list 20 homes', 'find-night', 25, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('weekly-lights-email', 'Get the weekly lights email', 'find', 'howto', 'Sign up once, confirm from your inbox, and get one email a week with the lights near a city you choose.', '1. Start on the map at socallights.app. Tap the three dots at the top right.
2. Tap **Weekly lights email**.
3. Type your email address, choose your city and how far you will travel, and tick the box to agree.
4. Tap **Sign up**.
5. We send you an email to confirm. **Nothing is sent until you tap the link in it.**

## To stop
Every weekly email ends with a link to stop. One tap and you are off the list.

Not seeing the confirmation? See [I did not get the email](/help/i-did-not-get-the-email).', 'weekly email newsletter alerts sign up unsubscribe stop subscribe city distance miles', 'find-email', 30, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('install-the-app', 'Put SoCal Lights on your phone and use it offline', 'find', 'howto', 'Add it to your Home Screen from your browser. There is nothing to download from an app store.', '**iPhone:** open socallights.app in **Safari**. Tap the Share button, scroll down, and tap **Add to Home Screen**.

**Android:** open socallights.app in **Chrome**. Tap the three dots, then **Install app** (or **Add to Home screen**).

## With no signal
The app still opens. Your last list of places is saved on your phone. When your signal comes back, the app updates by itself.

The Install option missing? See [I do not see Add to Home Screen](/help/no-add-to-home-screen).', 'install app home screen iphone android safari chrome offline no signal pwa add to home screen', 'find-app', 40, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('find-contests', 'Find a contest to vote in or enter', 'find', 'howto', 'Tap the three dots, then Contests. Live now, Mine and Past results are the three tabs.', '1. Start on the map at socallights.app. Tap the three dots at the top right.
2. Tap **Contests**.
3. **Live now** lists contests open today. You can vote, or enter your own home.
4. **Mine** shows contests you run and homes you entered.
5. **Past results** shows finished contests and their winners.

Contests also show on the map as cards, with an Enter or Vote button.', 'contests live now mine past results vote enter neighborhood contest list', 'find-contests', 50, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('find-professionally-installed-displays', 'Find professionally installed displays', 'find', 'howto', 'Open Filters, choose Professionally installed under Type, and open an installer''s profile.', '1. Choose a season (for example **Thanksgiving and Christmas Lights**).
2. Tap **Filters**. Under **Type**, tap **Professionally installed**.
3. Tap the red button to show the places.
4. Open one. It says **Installed by** with the company''s name.
5. Tap the company''s name to open its profile, with its area, phone, website, and the homes it has installed.', 'professionally installed installer company profile filter type lighting company installed by', 'find-pro', 60, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('enter-your-home-in-a-contest', 'Enter your home in a contest', 'enter', 'howto', 'Tap Enter my home, add photos, your address and a name, then agree to the rules.', '1. Find the contest ([how](/help/find-contests)) and, under **Live now**, tap **Enter my home**. If you are not signed in, the site asks you to sign in with Google or your email first.
2. **Add photos** of your home. Tap **Choose photos**. The first photo is the cover.
3. Type your **street address** and ZIP code.
4. Choose the **name to show**, for example, The Kim family. A line about your display is optional.
5. Tick the box to agree to the official rules, then tap **Submit my entry**.

The organizer reviews every entry before it goes on the map.

The address you enter is where the pin goes, and visitors see it so they can drive by.', 'enter home contest entry photos address name rules submit sign in', 'enter', 10, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('edit-or-withdraw-your-entry', 'Edit or withdraw your entry', 'enter', 'howto', 'Open the contest from Mine, then Edit name and description, or Withdraw to take your home out.', '1. Open **Contests**, then **Mine**.
2. Under **Homes you entered**, tap **Open contest**.
3. Find **Your home**.
4. To change the name or description, tap **Edit name and description**, change it, and tap **Save**.
5. To take your home out, tap **Withdraw**. It asks you to tap again, so you cannot do it by accident.', 'edit withdraw entry change name description remove take out delete home', 'edit-entry', 20, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('your-profile', 'Your profile: drafts, badges and your account', 'enter', 'howto', 'Tap the person icon at the top of the map. Drafts, Badges and Account are on the left.', 'Tap the **person icon** at the top of the map, next to the three dots.

- **Drafts** lists anything you started and saved. You can finish it on any device.
- **Badges** shows the awards your home has won. Winners keep a crown.
- **Account** is where you change your name and photo, and where you can delete your account.', 'profile drafts badges account name photo delete account crown winner person icon', 'profile', 30, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('vote-in-a-contest', 'Vote in a contest', 'vote', 'howto', 'Open the contest, tap Vote, and pick one favorite home in each category.', '1. Find the contest ([how](/help/find-contests)) and tap **Vote**. The first time, the site asks you to sign in. That keeps it to one vote per person.
2. Want to see the homes first? Tap **Visit the homes**. Long lists are split into routes of nine stops or fewer ([how routes work](/help/drive-a-route)).
3. Every home is in every category. In the first category, tap **Vote** on your favorite. The next category opens by itself.
4. Do the same in each category.
5. Tap **Share this contest** to send it to a neighbor.

You can change your vote until voting closes.', 'vote voting favorite home category ballot best traditional creative animated sign in', 'vote', 10, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('judge-a-contest', 'Judge a contest', 'vote', 'howto', 'Open your invitation email, tap Open my judges'' ballot, and score each home from 1 to 10.', '1. Open your invitation email and tap **Open my judges'' ballot**.
2. Your ballot says when voting closes and how many scores you have given.
3. Tap **Visit the homes** to see the homes in routes of nine stops or fewer. Each route starts where the last one ended, and you tick off homes as you go.
4. Tap a category. Every home is in every category.
5. Know a household? Tap **I know this household**. That home is skipped for you.
6. Score each of the other homes from 1 to 10.
7. Tap **Ballot** to see your progress.

Your scores stay private until winners are announced. You can change them until voting closes.', 'judge judging score ballot invitation email recuse i know this household visit the homes', 'judge', 20, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('create-a-contest-quick-start', 'Create a contest with Quick start', 'run', 'howto', 'Tap Add, then A contest. Seven short screens, and your contest has its own link and QR code.', '1. Start on the map at socallights.app. Tap the three dots at the top right. Tap **Add**, then **A contest**.
2. **Name your contest.** Type a name, then **Next**.
3. **Who is running it?** Type the name, pick your city, then **Next**.
4. The welcome message is already written. Keep it, or change it, then **Next**.
5. A website is optional. **Next**.
6. The dates are filled in for you. **Next**.
7. Choose **Quick start**. It sets everything up for you. **Next**.
8. Check your details and tap **Create contest**.
9. Tap **Open my dashboard**. Your link and QR code are ready to share.

Want judges, prizes or your own categories? Use [Customize](/help/create-a-contest-customize).', 'create contest quick start new neighborhood contest link qr code organizer add', 'run-quick', 10, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('create-a-contest-customize', 'Create a contest with Customize', 'run', 'howto', 'Choose Customize everything to add judges, a prize, your own categories and your own rules.', 'Follow the same first screens as [Quick start](/help/create-a-contest-quick-start), then on the setup screen choose **Customize everything**.

- **Categories:** keep the ones you like, turn one off, or add your own (for example, Best Inflatable).
- **Who can vote:** everyone, judges only, or everyone and judges.
- **Judges:** type one email on each line.
- **How judges vote:** pick a favorite, or score every home.
- **Approving entries:** reviewing each entry first is recommended.
- **Vote counts:** hidden until you announce winners is the default.
- **Prize:** the same for every winner, or a different one for each award.
- **Official rules:** written for you. Edit anything you like.

Finish with **Create contest**, then **Open my dashboard**.', 'customize contest judges prize categories rules score pick favorite vote counts approval', 'run-custom', 20, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('share-your-contest', 'Share your contest: link, QR code, poster, yard sign', 'run', 'howto', 'On your dashboard''s Overview, use Share it: copy the link, print the entry poster or yard sign, or invite neighbors by email.', '1. Open **Contests**, then **Mine**, then **Manage** next to your contest.
2. On the **Overview**, find the card called **Share it**.
3. Tap **Copy link**, then paste it into an email, a text, or a Facebook post.
4. The **QR code** opens your contest when someone scans it with a phone. Put it on flyers and signs.
5. **Print entry poster** makes a page for a bulletin board. **Print yard sign** makes a big sign for a lawn.
6. To invite neighbors by email, tap **Promote**, then open **Invite neighbors by email**. Type their addresses and add a note. Each neighbor gets an invitation with your note and one button.', 'share link copy qr code poster yard sign invite neighbors email promote flyers', 'run-share', 30, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('approve-and-decline-entries', 'Approve and decline entries', 'run', 'howto', 'On the Entries tab, tap Approve to put a home on the map, or Decline with an optional reason.', '1. Open your dashboard ([how](/help/share-your-contest)) and tap **Entries**. Nothing goes on the map until you approve it.
2. Tap **Approve** to put a home in the contest and on the map.
3. Tap **Decline** if an entry does not fit. A window asks why. The reason is optional, and it is emailed to the entrant. Tap **Decline entry**.
4. Changed your mind? Tap **Restore** to put it back.', 'approve decline entries review reason restore undo photos entrants', 'run-approve', 40, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('edit-your-contest-and-change-dates', 'Edit your contest and change the dates', 'run', 'howto', 'On the Overview, tap Change dates, edit what you need, and tap Save changes.', '1. Open your dashboard ([how](/help/share-your-contest)). On the **Overview**, find **Schedule** and tap **Change dates**.
2. Change the date that entries close, and the voting dates. You can also change the name, the message, the prize, and the rules.
3. Tap **Save changes**.

Entrants see changes right away, and the team is emailed about changes, so nobody is surprised.

If it will not save, see [My dashboard changes did not save](/help/dashboard-changes-did-not-save).', 'edit contest change dates entries close voting starts ends name message prize rules save', 'run-edit', 50, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('run-voting', 'Run voting: pause, check results and void a vote', 'run', 'howto', 'Use the Controls card to pause or resume voting, and Results to review the tally and individual votes.', 'Voting opens and closes on your dates. The **Controls** card lets you change that.

- **Pause voting** stops votes for a moment. **Resume voting** starts again.
- **Results** is the full tally. You always see the counts, even when the public cannot.
- Open **Review individual votes**. Odd patterns are flagged. Tap **Void** next to a vote that should not count.', 'voting pause resume results tally void vote review flagged controls close entries', 'run-voting', 60, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('add-co-organizers-and-judges', 'Add co-organizers and judges', 'run', 'howto', 'Team is for co-organizers, Judges is for judges. Type an email and add them. They get an invitation by email.', '1. Open your dashboard ([how](/help/share-your-contest)) and tap **Team**.
2. Co-organizers get the same dashboard you have. Type their email and tap **Add co-organizer**. They get an email with one button to open the dashboard.
3. Judges are added on the **Judges** tab. Type a judge''s email and tap **Add judge**. Your judge gets an invitation with a button that opens their ballot.', 'co-organizer team judges invite help run contest add email', 'run-team', 70, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('announce-winners', 'Announce winners', 'run', 'howto', 'On Results, tap Close voting and announce winners, then tap again to confirm. It cannot be undone.', '1. Open your dashboard and tap **Results**. It shows who would win if you announced today.
2. Tap **Download results** to save a spreadsheet.
3. When voting is over, tap **Close voting and announce winners**. It asks you to tap again, because this **cannot be undone**.
4. Everyone is emailed. The winners keep a crown on the contest page.
5. To see what everyone sees, tap **See it as voters do**.', 'announce winners close voting results download spreadsheet crown email final', 'run-announce', 80, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('read-your-contest-activity', 'Read your contest activity', 'run', 'howto', 'On Promote, Activity shows page visits, visits from your QR code, and how many people voted.', 'Open your dashboard and tap **Promote**. **Activity** shows page visits, visits from your QR code, and how many people voted. Below, a chart shows votes for each day.

Use it to see which sharing worked best.', 'activity visits qr scans voters votes per day chart promote stats', 'run-activity', 90, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('add-sponsors-and-logos', 'Add sponsors and logos to your contest', 'sponsors', 'howto', 'On the Sponsors tab, add a name, a tier, a website and a logo. They show on your contest page.', '1. Open your dashboard ([how](/help/share-your-contest)) and tap **Sponsors**.
2. Type the sponsor''s name and choose a tier.
3. Add their website, and choose their logo (JPG, PNG or WebP, under 600 KB).
4. Tap **Add sponsor**.
5. To check how it looks, tap **See it as voters do**.

Sponsors can pay you directly. Payment never affects who wins.', 'sponsors logos tier gold website add sponsor contest page pay payment', 'sponsors-add', 10, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('presenting-installer-and-quote-requests', 'Add a presenting installer and quote requests', 'sponsors', 'howto', 'Add a lighting company on Details. Your contest page gets a Get a quote button that sends requests to them.', '1. Open your dashboard and tap **Details**. Scroll to **Presenting installer**.
2. Type the company''s name, the email for quote requests, and their website.
3. Tap **Save changes**. This adds a **Get a quote** button to your contest page.

## What a neighbor sees
They open the contest page and tap **Get a quote**, add their name and what they would like done, and tick the box to share their details. Then they tap **Send request**. Their details go only to that company, and only if they tick the box.', 'presenting installer quote request get a quote lighting company details email', 'sponsors-installer', 20, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('installer-profiles', 'Installer profiles and "Installed by"', 'sponsors', 'howto', 'A home can name the company that installed it. A check mark means the company confirmed it. Companies claim their profile and confirm homes.', 'On a home, **Installed by** shows the company''s name. A **check mark** means the company confirmed it. Tap the name to open the company''s profile.

## If this is your company
1. Claim the profile with your company email.
2. Manage it from your installer page.
3. Homes that name your company are listed on the **Homes** tab. Tap **Confirm** for each home you installed. It gets a check mark. Tap **Not ours** for one you did not.', 'installer profile installed by confirm claim company homes check mark manage', 'sponsors-profile', 30, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('add-an-event', 'Add an event to the map', 'post', 'howto', 'Tap Add, then An event. Name it, pick the dates, add the place, and tap Add my event.', '1. Start on the map at socallights.app. Tap the three dots at the top right. Tap **Add**, then **An event**.
2. If your event has a web page, paste it. If not, tap **No, Next**. With a page that mentions the event''s name and date, it shows as **Confirmed**. Without one, it still goes on the map, marked **Expected** until the dates are checked.
3. Type the event''s name, and choose a season and type. **Next**.
4. Pick the first and last day. **Next**.
5. Free or paid? **Next**.
6. Type the place, the city and the street address. **Next**.
7. Describe it in a sentence or two. **Next**.
8. Check everything and tap **Add my event**.', 'add event tree lighting market parade haunted house submit map confirmed expected web page', 'post-event', 10, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('show-off-your-house', 'Show off your house on the map', 'post', 'howto', 'Tap Add, then A lighting display. Photos, address and a description put your lights on the map for families to drive by.', '1. Start on the map at socallights.app. Tap the three dots at the top right. Tap **Add**, then **A lighting display**.
2. **Who is posting?** Choose **A homeowner** (or a professional installer). **Next**.
3. Type the name to show. **Next**.
4. Did a company install your lights? If you did it yourself, tap **No**. **Next**.
5. Choose the season. **Next**.
6. Name the display and tell us what makes it special. **Next**.
7. Add the address. The pin goes here, and visitors see it so they can drive by. **Next**.
8. Tell families when the lights are on and how to see them (drive by, walk by, parking). **Next**.
9. Add photos. **Next**.
10. Check everything and tap **Put it on the map**.

Nothing goes public until the last step, and you can save and exit at any time. Saved drafts are in [your profile](/help/your-profile).', 'show off house lighting display homeowner showcase photos address put it on the map drive by', 'post-house', 20, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('location-does-not-work', 'The map does not show my location', 'find', 'fix', 'Your browser needs permission to share your location. Allow it for socallights.app, or search for a city instead.', 'Distances and "nearest first" need your location. If they are missing:

1. Tap **Use my location** on the home page, then **Allow** when your browser asks.
2. If you tapped **Block** or **No thanks** before, open your browser''s site settings for socallights.app and set **Location** to **Allow**.
3. On an iPhone, also check **Settings, Privacy and Security, Location Services**: it must be on, and **Safari Websites** must be set to **While Using**.
4. Reload the page.

You can always skip location: search for a city, or pick a season, and the map works the same way.', 'location not working gps blocked permission allow near me distance denied no distances', '', 110, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('i-did-not-get-the-email', 'I did not get the email', 'account', 'fix', 'Check Spam or Junk, wait a few minutes, check the address you typed, and look for a message from SoCal Lights.', 'Emails from us come from **SoCal Lights** at login@socallights.app. If one has not arrived:

1. Wait two or three minutes, then check your **Spam** or **Junk** folder, and Promotions in Gmail.
2. Check the address you typed. A single wrong letter sends it elsewhere.
3. Search your mailbox for **socallights**.
4. Try again. For a sign-in code, go back and ask for a new code. For the weekly email, sign up again.
5. If you use a work or school address, it may block new senders. Try a personal address.

Still nothing? [Ask us](#ask) and tell us which email you were waiting for.', 'email not received code sign in confirm weekly invitation spam junk missing no email login', '', 110, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('i-cannot-sign-in', 'I cannot sign in', 'account', 'fix', 'Sign in with Google, or with the 6-digit code we email you. Both reach the same account if the email is the same.', 'You do not need a password. You can:

- tap **Continue with Google**, or
- type your email and use the 6-digit code we send you.

Both prove the same email address, so both open the same account.

If it will not work:

- Make sure you use the same email each time.
- Codes expire. Ask for a new one and use the newest.
- Some throwaway email addresses cannot use the emailed code. Use Google or a regular address.
- If the code does not arrive, see [I did not get the email](/help/i-did-not-get-the-email).', 'sign in login cannot code google account password email verify problem', '', 120, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('my-photo-will-not-upload', 'My photo will not upload', 'enter', 'fix', 'Try fewer or smaller photos, use JPG or PNG, and check your connection.', 'You can add up to 8 photos. Photos are shrunk on your phone so they upload quickly, but a very large file or a weak signal can still fail.

1. Try **one photo** first.
2. Use a normal photo (JPG or PNG). Screenshots and unusual formats may not work.
3. Move to Wi-Fi or a stronger signal and try again.
4. If your phone offers it, pick the photo from your gallery instead of taking a new one.

Sponsor logos are separate: they must be JPG, PNG or WebP under 600 KB.

Still stuck? [Ask us](#ask).', 'photo upload failed picture image too big size choose photos error wont upload', '', 110, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('my-entry-is-not-on-the-map', 'My entry is not on the map', 'enter', 'fix', 'The organizer reviews every entry first. Check Mine to see its status, and ask the organizer if it has been a while.', 'Nothing goes on the map until the contest organizer approves it. That is normal, and it protects the contest.

1. Open **Contests**, then **Mine**. Under **Homes you entered**, your entry is listed.
2. If it says it is waiting, the organizer has not reviewed it yet. Ask the organizer, or share the contest link with them.
3. If it was declined, the organizer may have given a reason by email.
4. Check you were signed in with the same email when you entered.

You can change a waiting entry: see [Edit or withdraw your entry](/help/edit-or-withdraw-your-entry).', 'entry not showing map missing waiting approved review pending declined organizer find my home', '', 120, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('i-cannot-vote', 'I cannot vote', 'vote', 'fix', 'You must be signed in, voting must be open, and you cannot vote for your own home. You get one vote per category.', 'Check these in order:

1. **Sign in.** Voting needs an account, which keeps it to one vote per person.
2. **Is voting open?** The contest page shows the voting dates. Voting may not have started, may be paused, or may have closed.
3. **Your own home.** You cannot vote for a home you entered.
4. **One favorite per category.** After you pick one in a category, tap **Move my vote here** on another home to change it.
5. Some contests are **judges only**. Then the public does not vote.

See [Vote in a contest](/help/vote-in-a-contest).', 'cant vote button disabled closed sign in own home one vote per category voting not open', '', 110, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('i-am-a-judge-and-cannot-open-the-ballot', 'I am a judge and cannot open my ballot', 'vote', 'fix', 'Open the invitation email and tap Open my judges'' ballot. If it asks you to sign in, use the email the invitation came to.', '1. Find the email that says you are invited to judge. If you cannot find it, search for **judge** and **socallights**, and check Spam.
2. Tap **Open my judges'' ballot** in that email.
3. If it asks you to sign in, use the email address the invitation was sent to.
4. Still no luck? Ask the contest organizer to check the judge email on their **Judges** tab.

See [Judge a contest](/help/judge-a-contest).', 'judge ballot cannot open invitation link not working judges sign in score', '', 120, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('contest-not-listed', 'I cannot find a contest', 'find', 'fix', 'Live now lists only contests open today. Check Past results, or ask the organizer for the contest link.', '1. Start on the map at socallights.app. Tap the three dots at the top right. Tap **Contests**.
2. **Live now** lists only contests that are open today. A contest that has not started, or has finished, is not there.
3. Check **Past results** for finished contests.
4. Ask the organizer for the contest link or QR code. It opens the contest directly.
5. Contests also show on the map as cards. Pick the right season and city.', 'contest missing not listed cant find live now past results link qr code organizer', '', 130, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('dashboard-changes-did-not-save', 'My dashboard changes did not save', 'run', 'fix', 'Check the dates (entries close before voting starts, and voting ends after it starts) and that required boxes are filled in.', 'When a change cannot be saved, a red message appears next to the box that needs fixing. Common causes:

- **Dates.** Entries should close before voting starts, and voting must end after it starts.
- **A required box is empty**, such as the official rules.
- **A web address** is not a full address. Start it with https://.

Fix the box that is marked, then tap **Save changes** again. If it still fails, [ask us](#ask) and say which box.', 'save failed error dates dashboard contest edit not saving rules required voting should start after entries close', '', 110, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('video-will-not-play', 'A tutorial video will not play', 'account', 'fix', 'Try the other version (Computer or Phone), switch to Wi-Fi, and turn captions on with CC.', '1. Choose the other version. Each tutorial has a **Computer** and a **Phone** version.
2. Switch to **Wi-Fi**. The videos are high quality and can be slow on a weak signal.
3. Tap the play button again, and check your phone is not on silent.
4. Turn **captions** on with the **CC** button if you cannot hear.
5. Read the written steps instead. Every video has an article in this Help Center.', 'video not playing tutorial stuck loading sound captions cc black screen', '', 130, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('no-add-to-home-screen', 'I do not see Add to Home Screen', 'find', 'fix', 'On iPhone use Safari. On Android use Chrome. Other browsers may not offer it.', '- **iPhone:** use **Safari**. Other browsers on iPhone do not offer it. Tap the Share button, scroll down, then **Add to Home Screen**.
- **Android:** use **Chrome**. Tap the three dots, then **Install app** or **Add to Home screen**.
- If it is already on your Home Screen, the option is hidden.

See [Put SoCal Lights on your phone](/help/install-the-app).', 'add to home screen missing install option iphone chrome safari not showing', '', 140, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('is-it-free', 'Is SoCal Lights free?', 'account', 'answer', 'Yes. Finding lights, voting and entering a home are free, and votes are never sold.', 'Using SoCal Lights is free. Entering a contest is free and votes are never sold. If you would like to help keep it free, there is a **Keep SoCal Lights Free** row in the three-dots menu.', 'free cost price pay charge fee money tip cash app', '', 10, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('who-can-vote', 'Who can vote in a contest?', 'vote', 'answer', 'The organizer chooses: everyone with an account, judges only, or both. Each voter picks one favorite home in each category.', 'The organizer decides when creating the contest:

- **Everyone**: anyone with an account (People''s Choice).
- **Judges only**: only invited judges (Judges'' Choice).
- **Everyone and judges**: two awards in each category, counted separately.

Every home is in every category, and each voter picks one favorite home in each. You cannot vote for your own home.', 'who can vote eligible everyone judges one vote people''s choice judges'' choice', '', 130, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('how-winners-are-chosen', 'How are winners chosen?', 'vote', 'answer', 'Most votes wins in each category. Judges score separately. Ties share the win, and results are final once announced.', '- **People''s Choice:** the home with the most votes in a category wins.
- **Judges'' Choice:** judges score each home from 1 to 10. Scores are averaged. With five or more judges, the highest and lowest are dropped first.
- **Ties** share the win.
- **Vote counts are hidden** until the organizer announces winners, unless the organizer chooses to show them.
- When the organizer announces, the results are saved and cannot be changed. Everyone who entered is emailed.', 'winners chosen tie tied how winners decided results announce counts hidden judges scores', '', 140, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('can-i-change-my-vote', 'Can I change my vote?', 'vote', 'answer', 'Yes, until voting closes. Tap Move my vote here on another home.', 'Yes. Until voting closes you can change your vote in any category. Open the category and tap **Move my vote here** on the home you now prefer. Judges can change their scores the same way until voting closes.', 'change vote undo move switch vote closes', '', 150, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('why-sign-in', 'Why do I need to sign in?', 'account', 'answer', 'To keep contests fair: one vote per person, and so organizers can reach entrants. Browsing the map needs no account.', 'You do **not** need an account to browse the map, plan a night or read this Help Center.

You sign in only to **vote**, **enter a home**, **judge**, or **run a contest**. An account is tied to one verified email address, which keeps it to one vote per person. See our [privacy page](/privacy) for how your information is handled.', 'why sign in account required login needed privacy voting entering', '', 20, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('confirmed-or-expected', 'What do Confirmed and Expected mean on an event?', 'find', 'answer', 'Confirmed means the event''s own page shows its name and dates. Expected means the dates have not been checked yet.', '- **Confirmed**: the event''s own web page mentions its name and date.
- **Expected**: the event is on the map, but its dates have not been checked yet. Many events repeat every year, so the dates are our best expectation. Check the organizer''s page before you travel.

See something wrong? Open the event and tap **Something wrong? Tell us**.', 'confirmed expected event dates verified tags green yellow accuracy', '', 150, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('is-my-address-public', 'Is my home address public?', 'account', 'answer', 'If you enter a home in a contest or show a display, the pin goes on that address and visitors can see it.', 'When you enter a contest or show off a house, **the pin goes on the address you type, and visitors see it so they can drive by.** Only add an address you want people to visit.

Your email address is not shown to the public. To remove a home, [withdraw your entry](/help/edit-or-withdraw-your-entry) or ask us. To delete your account, see [How do I delete my account?](/help/delete-my-account).', 'address public privacy pin map visible home safe drive by hide location', '', 30, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('delete-my-account', 'How do I delete my account?', 'account', 'howto', 'Tap the person icon, then Account, then Delete my account.', '1. Tap the **person icon** at the top of the map.
2. Tap **Account**.
3. Tap **Delete my account** and confirm.

We delete your account, saved drafts, profile picture, contest entries and votes, close any contests you run, and remove your email from homes and events you posted. See our [privacy page](/privacy) for details, or [ask us](#ask) if you need help.', 'delete account remove data close account erase profile privacy', '', 40, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('report-a-problem', 'How do I report a wrong or unsafe listing?', 'account', 'answer', 'Open the event or home and tap Something wrong? Tell us. We read every report.', 'Open the event or home and tap **Something wrong? Tell us**. Say what is wrong in a few words. You can leave your email if you want an answer.

For anything else, [ask us](#ask) or write to info@socallights.app.', 'report wrong listing error unsafe abuse remove correction bad information contact', '', 50, 'published', 'seed');
