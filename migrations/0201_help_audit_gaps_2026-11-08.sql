-- Help Center re-audit 2026-11-08, second pass (see scripts/help/updates-audit-1108b.mjs and docs/audit/2026-11-08-help-articles.md): five new articles (INSERT OR IGNORE) and eight small corrections.
-- Every UPDATE only touches an article nobody edited in Admin (updated_by = 'seed'). No prices in the articles: they are on /pricing.
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('add-a-home-without-a-contest', 'Add your home without entering a contest', 'post', 'howto', 'You do not need a contest. Tap Add, then A lighting display, fill in the steps and your home goes on the map for free.', 'You can put your home''s lights on the map without entering any contest. It is free, and there is no voting, no judges and no organizer to wait for.

## Which button do I tap?
The Add page has three choices:
- **An event** is for a tree lighting, parade, market or other seasonal event.
- **A contest** is for organizers who want to run a neighborhood contest. It is not how you enter one.
- **A lighting display** is for your home''s lights. This is the one you want.

Add is in the account circle menu when you are signed in (**Add an event, home or contest**), or under the three dots at the top right of the map when you are not. You can also go straight to socallights.app/add.

## The steps
1. Tap **Add**, then **A lighting display**.
2. Sign in with Google or an emailed code if asked. Your home is saved to your account.
3. Choose **A homeowner** (or **A professional installer**), then type the name to show.
4. Say whether a company installed your lights, then choose the season.
5. Name your home and tell us what makes it special.
6. Add the address. The pin goes here, and visitors see it so they can drive by.
7. Tell families when the lights are on and how to see them. This part is optional.
8. Add photos. Photos are optional too: you can skip them and add them later by email.
9. Check everything and tap **Put it on the map**.

Nothing goes public until the last step, and you can save and exit at any time. Saved drafts are in [your profile](/help/your-profile). On the last step there is also an optional, unchecked box for the [monthly update email](/help/monthly-update-email).

## How this is different from a contest entry
- Most homes go live right away. If we hold one for a quick check, the site owner publishes it and may email you. In a contest the organizer usually approves each entry first.
- A home you add this way is not in any contest, so nobody votes on it and it cannot win. You can enter a contest later: see [Enter your home in a contest](/help/enter-your-home-in-a-contest). That is a separate entry.
- You manage it from **Your profile**, on the **Displays** tab: edit it, take it down for the season, put it back, or delete it.
- Your address and photos are public, so only add an address you want people to visit. See [Is my home address public?](/help/is-my-address-public).

## Is your home already on the map?
Some homes are on the map already, with a photo from the street. If yours is one of them, use **Is this your home? Claim it** on its card instead of adding it again. See [Is this your home? Claim it](/help/claim-your-home).

More detail on each step is in [Show off your home on the map](/help/show-off-your-house).', 'add home without contest not in a contest no contest list my home put my lights on map showcase homeowner installer free which button', '', 22, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('sponsor-a-contest-with-an-invite-link', 'Sponsor a contest with an invite link', 'sponsors', 'howto', 'Open the organizer''s private link, pay the organizer directly, then send the short form. Nothing shows on the contest page until the organizer approves it.', 'A contest organizer may send you a private sponsor link. It starts with socallights.app/s/ and then a string of letters and numbers. This page explains what you will see. You do not need an account.

**Your sponsorship goes to the organizer, not to SoCal Lights.** SoCal Lights does not process, hold or guarantee sponsorship payments, and sponsors do not influence who wins.

## The steps
1. Open the link. The page says **Sponsor** and the contest''s name, who runs it, and the dates for entries and voting.
2. If the organizer gave payment details, **How to pay** shows their payment link and any instructions they wrote. Pay the organizer directly. SoCal Lights has not checked that link, so only pay organizers you know, and confirm the details with them first.
3. Under **Tell the organizer about your sponsorship**, choose a **Sponsor level** if the organizer set some (or **Other**, and say what you have in mind in your message).
4. Type your name, your company name and your email. The website, phone, message and logo are optional. A logo can be a PNG, JPG or WebP image under 1 MB.
5. Tick that you have permission to share your company''s name and logo on the contest page, and that you understand your payment goes to the organizer. Both boxes are needed.
6. Complete the "I am human" check if it shows, then tap **Send to the organizer**.
7. You see a thank-you message and get a short confirmation email.

## What happens next
The organizer confirms they received your payment and then approves your listing. Only after that do your company name and logo appear on the contest page, labeled "Sponsor". The organizer can also decline a request, and you are emailed if they do. To change something after you have sent the form, ask the organizer.

## If the page says "This sponsor link isn''t active"
The organizer switched the link off or replaced it with a new one. Ask them for the new link. Until you have confirmed the details with them, do not send any payment.

## Are you the organizer?
See [Add sponsors to your contest](/help/add-sponsors-to-your-contest) for how to create the link, record payments and approve sponsors.', 'sponsor a contest sponsor invite link s page business sponsor company logo pay organizer how to pay send to the organizer link not active sponsor form', '', 40, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('ask-socal-lights-ai-assistant', 'Ask SoCal Lights: the AI assistant', 'find', 'answer', 'A chat button on the map and the Pricing page answers questions about the site, contests and events. It is an automated assistant, not a person, and it can be wrong.', '**Ask SoCal Lights** is an automated AI assistant. It answers questions about finding events and homes, how contests work, how to add something and what things cost. It is not a person, and it can be wrong.

## Open it
- Tap the **Ask SoCal Lights** button at the bottom right of the map or of the [Pricing](/pricing) page. On a phone it shows as a round button with a sparkle icon.
- The first time in a visit it asks for a quick "I am human" check. Then type your question, or tap one of the suggestions, and tap **Send**.
- Tap **Start over** to clear the chat, or the **x** to close it.

If you do not see the button, the assistant is switched off or unavailable right now. The Help Center and info@socallights.app always work.

## What it is good for
Questions such as how to enter or vote in a contest, how to add your home or an event, how sign-in works, what is on this weekend, or what an optional paid extra costs.

## What it will not do
- It does not tell you who won or who is ahead in a contest.
- It does not decide disputes, disqualifications, legal, tax or prize questions. For those, read the [Terms](/terms) or email info@socallights.app.
- It cannot look up your account or anyone''s personal details, and it does not do anything for you on the site.
- It will not suggest that paying can help you win. It cannot: payment never affects a contest result.

Prices come only from the [Pricing](/pricing) page, so check it before you pay.

## Your privacy
Please do not type personal information such as names, addresses, phone numbers, email addresses or card numbers. Your chat stays in your browser tab only and is erased when you close the tab or tap **Start over**. We do not save what you type or what it answers. See the [privacy page](/privacy#ai-assistant) for the details.

Not sure the answer is right? Use the Help Center search, or [ask us](#ask).', 'ask socal lights ai assistant chat chatbot bot help button question assistant not a person robot sparkle', '', 70, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('monthly-update-email', 'The optional monthly update email', 'account', 'howto', 'It is separate from your account and your listings, and off unless you turn it on. Change or stop it in Your profile, on the Account tab, or from the link in the email.', 'The monthly update is an optional email with seasonal recommendations. Having an account, a listing or a contest never signs you up. It stays off until you turn it on yourself.

## Turn it on in your profile
1. Tap your account circle at the top of the page, then **Your profile**.
2. Open the **Account** tab and find **Monthly update**.
3. Tick **Email me a monthly update with seasonal recommendations**.
4. Under **I am**, choose **Installer**, **Event or contest host** or **Family**.
5. Under **I would like**, tick any topics you want. They are optional. Installers can pick Seasonal reminders, Product updates and Shop and supply suggestions. Hosts can pick Planning tips and Upcoming opportunities. Families can pick Outings and Seasonal shopping ideas.
6. Tap **Turn on the monthly update**.

## Or tick the box when you add something
On the last step of adding an event, a home or a contest there is an optional, unchecked box with the same wording. It is separate from your listing: if you tick it, we save the choice after your listing is saved, and it never stops your listing from going through. You can change the role and topics later in your profile.

## Change it or stop it
- In **Your profile**, **Account**, **Monthly update**: change the role or topics and tap **Save**, or untick the box.
- Or use the link at the bottom of the email, which opens a preferences page with **Save** and **Unsubscribe**. You do not need to sign in. If you unsubscribe, we add your address to our do-not-contact list.
- Sponsored or affiliate content in the update will be clearly identified.

Deleting your account also ends the monthly update. See [How do I delete my account?](/help/delete-my-account).

## Other emails
This is different from the [weekly lights email](/help/weekly-lights-email) and from the service emails you get for sign-in codes and decisions about your listings. To see which emails you can stop, read [Stop emails from SoCal Lights](/help/stop-emails-from-socal-lights).', 'monthly update newsletter email seasonal recommendations opt in turn on turn off unsubscribe topics installer host family preferences profile account', '', 55, 'published', 'seed');
INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES ('stop-emails-from-socal-lights', 'Stop emails from SoCal Lights', 'account', 'howto', 'Every reminder, update and weekly email has an unsubscribe link that works without signing in. Sign-in codes and decisions about your listings are service emails and cannot be turned off.', 'Which email is it? The way to stop it depends on the kind.

## Reminders, updates and result emails
These are the notification emails about listings and contests, such as a reminder, a change to a contest or its results. Each one ends with **Unsubscribe** in the footer.
1. Tap **Unsubscribe** in the email. A page asks **Stop these emails?** You do not need to sign in.
2. Tap **Unsubscribe**.
3. Changed your mind? The same page offers **Turn them back on**.

Your mail app may also show its own unsubscribe button for these emails, and that works too.

## The weekly lights email
Every weekly email has a link, **Unsubscribe from the weekly email**. One tap and you are off the list. See [Get the weekly lights email](/help/weekly-lights-email).

## The monthly update
Use the link at the bottom of the email, or turn it off in your profile. See [The optional monthly update email](/help/monthly-update-email).

## Service emails
Sign-in codes and decisions about your listings, such as an entry being approved or declined, are service emails. We send them because you asked for the code or took the action, so they have no unsubscribe link, even after you unsubscribe from the others. To stop all emails, write to info@socallights.app from the address you want removed, or delete your account: [How do I delete my account?](/help/delete-my-account).

When you unsubscribe, we add your address to our do-not-contact list so we do not contact you about SoCal Lights for other reasons either. We keep a scrambled code of your address for that, not the address itself.

Not getting emails you want? See [I did not get the email](/help/i-did-not-get-the-email). Anything else, [ask us](#ask).', 'unsubscribe stop emails opt out too many emails reminders updates results weekly email monthly update service emails do not contact one tap list-unsubscribe', '', 56, 'published', 'seed');
UPDATE help_articles SET title = 'Find professionally installed homes', updated_at = datetime('now') WHERE slug = 'find-professionally-installed-displays' AND updated_by = 'seed' AND title <> 'Find professionally installed homes';
UPDATE help_articles SET body = replace(body, '(top right, under the zoom buttons)', '(top right, under the zoom buttons; its label is Find my location)'), updated_at = datetime('now') WHERE slug = 'find-lights-near-me' AND updated_by = 'seed' AND body NOT LIKE '%Find my location%';
UPDATE help_articles SET body = replace(body, '(top right, under the zoom buttons)', '(top right, under the zoom buttons; its label is Find my location)'), updated_at = datetime('now') WHERE slug = 'location-does-not-work' AND updated_by = 'seed' AND body NOT LIKE '%Find my location%';
UPDATE help_articles SET body = replace(body, 'Sponsor logos are separate: they must be JPG, PNG or WebP under 600 KB.', 'Sponsor logos are separate. The organizer adds them on the Sponsors tab as JPG, PNG or WebP under 600 KB, and a sponsor who uses an invite link can send one under 1 MB.'), updated_at = datetime('now') WHERE slug = 'my-photo-will-not-upload' AND updated_by = 'seed' AND body NOT LIKE '%invite link can send%';
UPDATE help_articles SET body = replace(body, 'turn the monthly update email on or off', 'turn the [monthly update email](/help/monthly-update-email) on or off'), updated_at = datetime('now') WHERE slug = 'your-profile' AND updated_by = 'seed' AND body NOT LIKE '%/help/monthly-update-email%';
UPDATE help_articles SET body = body || char(10) || char(10) || '## No contest needed
You do not have to enter a contest to put your home on the map. See [Add your home without entering a contest](/help/add-a-home-without-a-contest).', updated_at = datetime('now') WHERE slug = 'show-off-your-house' AND updated_by = 'seed' AND body NOT LIKE '%/help/add-a-home-without-a-contest%';
UPDATE help_articles SET body = body || char(10) || char(10) || '## Not the same as the monthly update
The weekly lights email is for anyone and needs no account. The monthly update is a separate, optional email for installers, hosts and families. See [The optional monthly update email](/help/monthly-update-email) and [Stop emails from SoCal Lights](/help/stop-emails-from-socal-lights).', updated_at = datetime('now') WHERE slug = 'weekly-lights-email' AND updated_by = 'seed' AND body NOT LIKE '%/help/monthly-update-email%';
UPDATE help_articles SET body = body || char(10) || char(10) || 'A sponsor who gets your invite link sees a page that explains the same thing: [Sponsor a contest with an invite link](/help/sponsor-a-contest-with-an-invite-link).', updated_at = datetime('now') WHERE slug = 'add-sponsors-to-your-contest' AND updated_by = 'seed' AND body NOT LIKE '%/help/sponsor-a-contest-with-an-invite-link%';
