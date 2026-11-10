<!--
Public-safe knowledge for the AI assistant (docs/ai-assistant.md). Everything here is meant to be shown to the public: no secrets, no internal operations, no postal address, no prices (prices come only from the code), no dates.
Every statement is taken from docs/contests.md and the Terms. Edit this file, then run `node scripts/build-chat-kb.mjs`; tests fail if the generated file is out of date.
Format: "## Title" then a line "url: /path" then plain text. Say "home", never "house".
-->

## Running a contest: the steps
url: /help#run
Open the Add page (signed in, tap the account circle at the top right and choose Add an event, home or contest; not signed in, tap the three dots and choose Add) and choose Contest (or go to /add-contest). The contest wizard asks for the contest name, who is running it and the city, a welcome message (already written for you), an optional website, and the dates (filled in for you: the last day to enter, and when voting starts and ends). Then you choose how to set it up. Quick start (recommended) keeps the defaults: public voting, four categories, you approve each entry, and we draft the official rules; it takes about a minute. Customize everything adds screens for judges, prizes, categories, vote counts and your own rules. Everything can be changed later from your dashboard. The last screen is Review, where you check everything and tap Create contest. You sign in on that screen if you have not already, and your draft is kept while you sign in, whether you use Google or an emailed code. When you finish, the contest normally goes live right away and appears on the map as an event; if it is held for a quick check, we email you when it is approved, and your link and QR code already work. Each contest has its own page at /c/<name> (the page a QR code opens). The organizer dashboard is at /c/<name>/manage: approve or decline entries, invite judges, pause or start voting, hide or show vote counts, announce winners, copy the link, and print a QR poster. An organizer can create up to 3 contests per account per day.

## Adding your home to the map (no contest needed)
url: /add-house
You do not need a contest to put your home on the map. Adding a home, also called showing your lights or listing your display, is free and works on its own. Go to the Add page (signed in: account circle at the top right, then Add an event, home or contest; not signed in: the three dots, then Add) and choose Home (or open /add-house). Sign in first with Google or an emailed code, because every listing belongs to the account that adds it. The form asks: who is posting (a homeowner or a professional installer), the name to show, which season the display is for, a display name and a few sentences about it, the address (city, street and 5-digit ZIP) so the pin can go on the map, and optional details such as when the lights are on, drive or walk by, parking, accessibility, radio station and tips. Photos are optional: up to 8, and you can add them later by email. On the last screen you check everything and choose Put it on the map; the home normally appears right away, and on a very busy day a new home may wait briefly for review. You can ask us to change or remove it at any time. If the map already shows an automatic listing for your address, open it and choose Is this your home? to claim it; your listing usually goes live at once and replaces the automatic one, and if it is held for a quick check it goes live once the site owner has looked it over. Entering a contest is a separate, optional step: a contest asks you to be 18 or older, add photos and accept that contest's rules.

## Entering a home in a contest
url: /help#enter
To enter, open the contest page and choose Enter. You must sign in, add photos, the home's address and a name, and accept the contest's official rules. You must be 18 or older to enter a home. A home does not pick a category: it competes in every category. If the organizer approves entries by hand, your photos stay private until the organizer approves your entry; if entries are approved automatically, your home appears right away. You can edit or withdraw your entry from your profile while the contest allows it. If you are the organizer and your city already has a list of homes, you can add them yourself instead: see Organizer-added homes.

## Voting in a contest
url: /help#vote
Voting is free and needs a sign-in. Every approved home is listed in every voting category (for example Best Overall or Most Creative). Each voter picks one favorite home in each category. Voting again in a category moves your vote. Some contests give one vote in total instead; the contest page says which. Nobody can vote for their own home. Voting opens on the contest's start date (or when the organizer starts it early) and stops when the winners are announced. Fake, automated or traded votes are not allowed and may be voided. Votes are never sold.

## Categories, winners and ties
url: /help#run
The organizer defines the voting categories. Best Overall is an ordinary category like any other. There is no computed overall winner. For a single overall winner, use one category. Winners are the top home in each category. Vote counts are hidden until winners are announced unless the organizer chooses to show them. An organizer may choose to give each home only one win. Tied homes share the win. Each contest's organizer writes its official rules, decides who wins, and provides any prize.

## How an organizer opens the contest dashboard
url: /contests#mine
The organizer dashboard is where you run your contest: approve entries, add co-organizers and judges, change details, share the link and announce winners. To open it, sign in with the account that created the contest (or the email a co-organizer was invited at). Then tap the account circle at the top right and choose Your contests. That opens your contests (the address is /contests#mine); tap Manage on the contest. You can also open your contest's own page while signed in and tap Manage this contest. The dashboard address is /c/<name>/manage, where <name> is the contest's name in its web address. Inside the dashboard the sections are Overview, Entries, Results, Judges, Details, Promote, Team and Sponsors. On a phone they are in the bar at the bottom, and More shows the rest.

## Judges and how judging works
url: /help/judge-a-contest
A contest can be public voting only (People's Choice), judges only (Judges' Choice), or both. The organizer adds judges by email from the dashboard. Each judge gets an email with a private link to the judges' ballot at /c/<name>/judge and signs in with the email they were invited at. Judges vote on the judges' ballot, not in the public vote. The organizer chooses one of two methods. Pick: each judge picks one favorite home in every category. Score: each judge scores every home from 1 to 10 in every category; there is no separate rubric or criteria list. When 5 or more judges score a home, the highest and lowest score for it are dropped before averaging (a trimmed average), so one very generous or very harsh judge cannot swing it. A judge cannot judge their own home, and a judge can mark a home as a conflict and skip it; skipped homes do not count for that judge. Judging happens during the contest's voting dates.

## How votes, judge results and ties decide winners
url: /help/how-winners-are-chosen
Winners are worked out in each category separately. People's Choice goes to the home with the most public votes in that category. Judges' Choice goes to the home with the most judge picks, or the highest judge score. They are separate awards: public votes and judge scores are not added together. When a contest uses both, the judges' result is used only to separate homes that are tied on public votes. Tied homes that remain tied share the win. Votes the organizer voided do not count. A home the organizer flagged to be disqualified stays on the ballot but cannot win. If the organizer chose one win per home, a home that wins one category cannot win a later one. The organizer announces the winners; the contest's organizer writes the official rules and decides who wins, and any prize comes from the organizer.

## Prizes and organizer fairness tools
url: /help#run
Organizers can set a prize per award. To help keep voting fair, organizers can review the votes in their contest, void a vote that looks fake (and restore it if it was a mistake), flag a home to be disqualified at close, and download the results as a spreadsheet. These decisions belong to the organizer; questions about a specific decision go to the organizer. Disputes and eligibility edge cases are for the organizer under our Terms.

## Who can vote and how often
url: /help/who-can-vote
Anyone with an account can vote in a contest that has public voting; voting is free. You sign in with Google or an emailed code, so your vote belongs to your account (your verified email address), not to a device. You get one vote per category: pick one favorite home in each category, and the contest page says if that contest gives one vote in total instead. You cannot vote for your own home. A judge in the contest votes on the judges' ballot instead of the public vote. Voting is open only between the contest's voting dates, or when the organizer starts it early, and the organizer can pause it. It closes when the winners are announced.

## Changing a vote
url: /help/can-i-change-my-vote
While voting is open you can change your vote: open the category and tap Move my vote here on the home you now prefer, and your vote moves to it (the page says "vote moved"). Judges can change their scores the same way until voting closes. Choosing the home you already picked says it is already your vote. There is no separate button to withdraw a vote without choosing another home. After the winners are announced votes are locked.

## My vote did not count or I cannot vote
url: /help/i-cannot-vote
Common reasons: you are not signed in; voting is not open yet, is paused, or has ended; the winners were already announced; you tried to vote for your own home; you are a judge in this contest (use the judges' ballot); the contest is judges only; or you voted again in the same category, which moves your earlier vote instead of adding a second one. Organizers can also void a vote that looks fake. If none of these fit, email info@socallights.app and say which contest it was; please do not include personal information.

## Vote counts, fairness and fraud protection
url: /help#vote
Vote counts are hidden until the winners are announced unless the organizer chooses to show them. To protect fairness, voting needs a verified sign-in, each account gets one vote per category, nobody can vote for their own home, and organizers can review and void votes that look fake. Fake, automated or traded votes are not allowed, and votes are never sold. We do not share how fake votes are detected. Paying for anything never gives anyone votes or changes a result.

## Announcing winners and the results page
url: /past
When the organizer announces winners, the results are saved as a fixed snapshot and votes are locked. Every entrant is emailed, and winners get a congratulations email. The permanent results page is at /past/<name>, and /past lists every announced contest. Winners can show a crown badge on their listings; each person can hide badges from the Badges tab on their profile.

## Organizer-added homes
url: /help/add-your-citys-homes-yourself
keywords: add homes yourself organizer adds homes spreadsheet city form paste addresses residents no photo no account entries tab check addresses
For cities that collect resident sign-ups somewhere else, such as a city form, a spreadsheet or email, the organizer or a co-organizer can put those homes in the contest themselves. The resident does not need a photo or an account. Steps: open your dashboard (account circle, Your contests, Manage), tap Entries, and open Add homes yourself. Paste one home per line, like this: Street address, City, ZIP | Name. The city, ZIP and name are optional, and without a city the contest's city is used. A column pasted from a spreadsheet works too. Tap Check addresses: every line is marked Found, or says what is wrong, such as Already in this contest. Tick "These residents agreed to have their address shown on the public map" (only if they did), then tap Add homes; the button shows how many it will add. Each home goes straight onto the ballot and the driving routes with an Added by organizer tag. Homes that cannot be found are not added. To take one out, tap Remove on its row, then tap again to confirm. Limits: up to 100 homes pasted at a time, up to 500 added this way to one contest, and up to 25 while a new contest is waiting for our quick review (the limit lifts when we approve it). Homes can be added once the contest is live and until voting starts, because after that it would change the ballot under the voters.

A home the organizer added has no photo at first. The organizer can add photos from the dashboard: on the Entries tab, tap Photos on that home (up to 8 photos, until voting ends). The Photos box also shows a private link the organizer can send to the homeowner, so the homeowner can add or remove photos of their own home without signing in, until voting ends. The organizer can make a new link if one was shared by mistake.

## All the ways a home gets into a contest
url: /help/add-your-citys-homes-yourself
keywords: how do homes get into my contest ways to enter homes add homes to my contest city list residents sign up enter a home organizer enters homes for residents
There are two ways to get homes into a contest. 1) Residents enter their own home: they open the contest page (the link, QR code, poster or yard sign you share) and tap Enter, sign in, add photos, the home's address and a name, and accept the contest's official rules. They must be 18 or older. If you approve entries by hand, a new entry waits for you on the Entries tab; if entries are approved automatically, the home appears right away. 2) You add homes yourself, which is the way to go when your city already collects sign-ups on a form, a spreadsheet or email: on your dashboard open Entries, then Add homes yourself, paste one address per line, tap Check addresses, then Add homes. Residents need no photo or account for that. You can use both ways in the same contest. All the steps, the formats and the limits are in the chunk "Organizer-added homes" and the Help article "Add your city's homes yourself". Either way, voting opens on the contest's start date and every approved home is on the ballot and the driving routes.

## Unpublish a contest and publish it again
url: /help#run
The person who created a contest can unpublish it from the dashboard: Overview, Controls, Contest page, Unpublish (two taps). That takes it off the map and hides its page, but keeps the entries, votes, judges and sponsors. The creator can use Publish it again to put it back. Co-organizers cannot unpublish. If our team unpublished a contest, only our team can put it back.

## Contest passes: how they work
url: /contest-pass
Running a contest needs a contest pass, starting with the first contest. The organizer chooses a pass before the contest goes live: a single contest, up to 5 contests or up to 20 contests in a 12-month window (the total counts every contest in the window). The window starts the day the pass is bought, or the day the organization's first contest goes live if that comes first. Upgrading inside the window costs only the difference. When the window ends, the next contest needs a new pass. Contests that were already live or announced before passes began are not affected. More than 20: contact us. Some organizations, such as a founding partner, are given contests for a period and then see "Founding partner: free through" a date instead of a price. A pass is one payment on Stripe's secure page and never renews by itself. You can buy ahead of time on the contest pass page, or the contest wizard offers it before a new contest goes live. Passes only count contests: they do not change entries, features or results. Entering and voting stay free, and payment never affects who wins.

## Sponsors of a contest
url: /help#sponsors
An organizer can record a sponsor who paid them directly. Sponsorship money goes to the organizer, not to SoCal Lights. A sponsor appears on the contest page only when the organizer has confirmed the payment (or an in-kind gift), has the sponsor's permission, and chooses to show it. The contest page then shows the sponsor's logo, name and link, labelled Sponsor, with the line that sponsors support the contest but do not influence who wins. Organizers can also share a private sponsor invite link (/s/<code>): a sponsor opens it without an account, fills in a short form, and nothing is shown on the contest page until the organizer confirms the payment and approves it. The organizer can turn the link off or make a new one. Never pay anyone you do not know.

## Featuring a home after a contest
url: /feature
After winners are announced, the owner of a home that finished first, second or third in any category can pay to feature it for 30 days, from the Feature page. Paying never changes a contest result. The price is on the Pricing page.

## Where to find Add, Contests, Tutorials and Help
url: /help
The map has two buttons at the top right: the account circle and the three dots. When you are signed in, Add (called Add an event, home or contest), Your contests, Tutorials and Help are in the account circle menu: tap the account circle at the top right. That menu also has Your profile and Sign out. When you are not signed in, Add, Contests, Tutorials and Help are in the three dots menu instead, and the account circle asks you to sign in. The three dots menu always has the Weekly lights email, Promote your event, Browse by city, Privacy and terms, and a way to email us.

## Accounts and sign-in
url: /help#account
You never need an account to browse the map, plan a night in Favorites or sign up for the weekly email. You sign in to add an event or a home, and to run, enter or vote in a contest, because each listing, contest and vote belongs to your account. There are no passwords: sign in with Google or with a 6-digit code emailed to you. Both reach the same account for the same email address. A sign-in lasts up to 30 days and a code lasts 10 minutes. You can delete your account from your profile, Account tab.

## Favorites: plan a night of lights and open a route
url: /tutorials#night
The Favorites tab (heart icon, next to Places and Shop) is where you plan a night. Steps: tap the heart on every place you want to visit; open the Favorites tab; check your stops, which are put in a sensible driving order with the miles and time between them ("Start here", then "from" the previous stop); choose where to Start (My location, First stop or a city) and your maps app (Apple Maps, Google Maps or Waze; the change button next to Opens in switches it, and phones ask the first time and remember your choice); then tap Route these. Waze takes one stop at a time, so it starts with the first stop, and phones also show a Send to car button on each stop. The Route these button is also on the map itself: in the top bar on a computer, just above the list on a phone. Your maps app takes about 9 stops at a time, so a longer night is split into routes of 9 or fewer and each route starts where the last one ended (the button shows how many routes). Tick off stops as you go. Tap the share icon to send your favorites to family or friends, who open the same list on their phone. A question-mark button beside the stop count shows or hides a short three-step guide: tap the heart, check your stops, tap Route these. Favorites are saved on your own device only.

## Remove my home from the map
url: /remove-home
If your home is on SoCal Lights and you would rather it were not, open the Remove my home page (socallights.app/remove-home). You do not need an account. Enter which home (the listing id from its page, or the street address) and your email so we can confirm and tell you when it is removed, add anything else we should know if you like, and tap Send my request. We email you when it is done. We use your email only to answer this request. You can also write to info@socallights.app.

## Promote your event: how to pay for a Featured pin
url: /feature
Listing an event is always free; Featured placement is an optional, one-time payment with no subscription. To feature an event: open the three-dot menu and tap Promote your event, or go to the Feature page. Pick a plan: every plan includes the gold Featured pin on the map; the banner adds a Featured pill in the strip at the top of the map list, and Top of the list puts your event first when people browse your area. Choose your event from your list (a home that finished first, second or third in an announced contest can be featured the same way), check the start date, end date and total, and tap Pay on Stripe, where you pay by card or Cash App Pay. Featured events carry a visible Featured badge and still have to be accurate. Plan prices are on the Pricing page.

## Event Partner: a plan for organizations with several events
url: /partner
Listing an event is always free and stays free. Event Partner is an optional plan for cities, chambers of commerce, nonprofits and event producers: one payment per season covers up to 10 of the organization's events in that season. Each covered event gets the Featured pin (a gold-ringed pin on the map and a Featured badge) for its run window, and an Event Partner badge on its page. Featuring opens 30 days before an event starts and runs to the event's last day or the end of the season, whichever comes first (the Christmas lights season ends January 6). To use it, go to the Event Partner page, sign in with the email you use for your organization (an address at the organization's own website is matched to it automatically), pay once on Stripe, then choose Use the plan next to each event. The page shows how many of the 10 are used. The badge only shows that the organization has the plan; it is not an endorsement by SoCal Lights. When the organizer's email is at the organization's own website the page also says Verified email domain. Founding city partners have it free through the end of 2026 and see no price. The price is on the Pricing page. Refunds follow the same rules as other paid placements; a refund or chargeback switches off the pins the plan applied.

## Weekly lights email: sign up and stop
url: /tutorials#email
keywords: unsubscribe stop emails opt out weekly email newsletter
The weekly lights email is free: one short email a week with lights and events near a city you choose. To sign up: tap the three dots at the top of the map, beside the search box, and choose Weekly lights email; enter your email and your city, choose how far from the city to look (5, 10 or 25 miles), and tick the box to agree; tap Sign up. We email you a confirmation link and nothing is sent until you tap it, which protects you from anyone signing you up by mistake. You can also sign up from a city page or an event page, where a small box asks only for your email. Every email ends with a one-tap link that deletes your address from the list right away. Contest emails have their own unsubscribe link, which does not stop the weekly email, and the other way round.

## Is there an app in the App Store or Google Play?
url: /tutorials#app
No, not yet. SoCal Lights is not in the Apple App Store, Google Play or any other app store right now, and there is nothing to search for or download from a store. For now it is a website that works on any phone at socallights.app. You can add it to your phone's Home Screen so it opens full screen with its own icon, like an app. On an iPhone, open socallights.app in Safari, tap the Share button, then Add to Home Screen, then Add. On an Android phone, open it in Chrome, tap the three dots, then Add to Home screen (Chrome may call it Install app; either way it adds the website, not a store app). With no signal it still opens and shows the last list of places it saved on your phone, and it updates by itself when your signal returns. Say "not yet" and nothing more: do not promise that a store app is coming or give a date.

## Refund rules for paid placements and passes
url: /terms#paid
Featured events, installer placements and contest passes: if we cannot list, feature or apply what you paid for, for any reason, you get a full refund. Once a placement is live, payments are non-refundable, but if your event is cancelled we will move your placement to another of your events or refund the unused time. A pass refunded before its extra contests went live is switched off; if they are live we review it by hand. We make refunds ourselves through Stripe, and a refund or chargeback switches the placement off, so email us before disputing a charge. Nothing limits any refund right you have by law. Questions: info@socallights.app.

## What an installer can do: all the options for installers
url: /pricing#banner
A professional lighting installer has these options, and a free profile comes first. 1) A free company profile page at /installer/<name> with the company, service area, phone, website, a Request a quote button and every home it installed. 2) Add homes you installed: sign in, open Add, choose A lighting display, then A professional installer; your company details are filled in from your profile, and the home counts as confirmed. 3) Homes that homeowners say you installed show Installed by with your company name; you confirm or reject them. 4) Claim and manage your profile: details, logo, areas served, profile views and quote requests. 5) Share listings with homeowners once you confirm them. 6) Get quote requests from your profile, and from contests that name you as their presenting installer. 7) Optional paid Sponsor placements: the Banner, Top of the list, or both, always labelled Sponsor. Prices are on the Pricing page.

## Installers: add a home you installed
url: /add-house
An installer can put a home they worked on on the map. Sign in, open Add (account circle when signed in, three dots when not) and choose A lighting display. At Who's posting, choose A professional installer. Your company name, website, phone and service area are filled in from your profile if you own one. Then give the display a name and a few lines about it, choose the season, add the address, and add night photos. You must tick that you have the homeowner's permission to show the address. Review and tap Put it on the map. A home an installer posts counts as confirmed, appears on your profile with the company name, and joins your profile by company name, so use the same spelling each time. Homeowners can also name your company when they post their own home.

## Installers: claim and manage your profile
url: /tutorials#installer-profile
Open your company's profile page and tap Claim this profile at the bottom. If you sign in with an email at your company's website, the profile is yours at once. With any other email, the site owner checks it and emails you. Once it is yours, open your manage page at /installer/<name>/manage. It has your details (website, phone for quotes, areas served, About, logo), the Homes tab (homes that name your company, and homes you share with homeowners), profile views for the last 30 days, the number of homes on the map, your quote requests, and your Sponsor placement with its automatic renewal switch. On the Homes tab, tap Confirm for each home you really installed (it gets a check mark) or Not ours to remove your name from a home you did not install.

## Installers: homes you share with homeowners
url: /tutorials#installer-profile
When a homeowner names your company and you confirm, you and the homeowner can both edit that listing: you from the manage page, under Homes you share with homeowners, and the homeowner from their profile. Only the person who created the listing can take it down for the season or put it back. Each change is logged with who changed which field, and both of you are emailed. Homes you posted yourself are edited by anyone who owns your profile. Visitors can find installer displays with the Professionally installed filter, then tap Installed by to open the profile. A check mark means the company confirmed it.

## Installers: quote requests
url: /tutorials#presenting-installer
Quote requests reach an installer two ways. On your profile, visitors tap Request a quote; they must be signed in and tick that they agree to share their details. Requests go to your email and are listed on your manage page. A contest organizer can also name you as the contest's presenting installer (Details tab, Presenting installer, with your company, quote email and website); that adds a Get a quote button to the contest page while it is live, and each request goes to you and to the organizer.

## Installers: Sponsor placements, step by step
url: /sponsor
Your free profile stays free. Paid Sponsor placements are optional, always labelled Sponsor, and never affect any contest. The Banner is a pill in the strip at the top of the map list; Top of the list puts your company card first in the installer list without the banner; the third plan has both. To buy: open Pricing and choose Installers, or open Promote your event and tap See all pricing; tap Choose on a plan; sign in with your company email; choose your company (it needs a free profile first); check the dates, which start today and end on the last day of the season; and tap Continue to payment, which opens Stripe. Automatic renewal is optional and off unless you tick the box, and you can cancel it any time from your manage page. Prices are on the Pricing page.

## Seasons and kinds of events on the map
url: /
keywords: boat parades walk-through displays walk through drive-by seasons halloween christmas types of events categories
The map shows one season at a time. Tap the season button at the top to switch. The seasons are: New Year's & Lunar New Year; Valentine's Day; Spring Blooms, Easter & Cinco de Mayo; Summer & Fourth of July; Halloween & Día de los Muertos; and Thanksgiving & Christmas Lights. The map opens on the season that is on now. Each season has its own kinds of events. Thanksgiving & Christmas Lights: Turkey trots & fun runs, Thanksgiving feasts & harvest, Walk-through lights, Drive-by / neighborhood displays, Boat & street parades, Theme parks & zoos, Tree lightings & villages, Tours & rides, and Shows & concerts. Halloween & Día de los Muertos: Haunted attractions, Pumpkin trails & patches, Trick-or-treat & festivals, Día de los Muertos, Shows & immersive theater, and Theme parks & zoos. New Year's & Lunar New Year: New Year's Eve & fireworks, Noon Year's & family events, Rose Parade & parades, Lunar New Year festivals, and Shows & festivals. Valentine's Day: date nights, dances, chocolate and wine tastings, Cupid runs, lights and light shows, shows and concerts, and family events. Spring: flower fields, whale watching, St. Patrick's Day, Easter egg hunts, Cinco de Mayo, and spring festivals and fairs. Summer: Fourth of July fireworks and parades, county fairs, outdoor concerts and movies, summer festivals and art shows, and theme parks and zoos. To find boat parades, choose the Thanksgiving & Christmas Lights season, tap Filters, and under Type choose Boat & street parades. Walk-through lights are displays you walk through, usually ticketed events.

## Map filters: what each one does
url: /tutorials#map
keywords: filters filter free ticketed cost county distance miles tonight weekend type drive walk parking stroller
Tap Filters on the map to narrow the list. When: Any date, Tonight, This weekend, or pick a day. Near: pick a city, then how far from it to look (5, 10 or 25 miles). County: choose one or more counties. Cost: All, Free, or Ticketed. Type: the kinds of events for the season, plus Home displays, Professionally installed and Contests. Visiting a home: Drive by, Walk by, Free parking and Stroller friendly. There is also Confirmed dates only, which hides events whose dates are not yet confirmed, and Clear all. The button at the bottom shows how many places match (Show N places). Active filters appear as chips you can tap to remove.

## On any listing: directions, report a problem, remove a home
url: /help
keywords: directions get directions report wrong problem bug mistake remove home confirmed expected
Open an event or home and tap Directions to open it in your maps app. To plan several stops use Favorites and Route these. If something looks wrong on a listing, tap Report a problem on it, or see the Help Center article Report a problem; you can also email info@socallights.app. If your own home is on the map and you would rather it were not, tap Not your listing? Remove my home on the listing, or use the Remove my home page. Events listed as Expected have dates that are not confirmed yet; Confirmed means a web page checked the name and date.

## Day and night mode
url: /
Every page has a sun and moon button, in the header on the map and on other pages, that switches between day (light) and night (dark) mode. The site picks one for you at first, and remembers your choice on your device.

## Your profile: drafts, displays, events, contests, badges and account
url: /profile
keywords: draft drafts badges delete event edit display edit event profile tabs save exit
Open your profile from the account circle (Your profile). It has these tabs. Drafts: add forms keep your place when you tap Save & exit, and here you can Continue or Delete a draft. Contests: the contests you run (Manage or View page) and the homes you entered. Displays: homes you posted, each showing On the map, In review or Taken down for the season, with Edit, Take down for the season (or Put back on the map) and Delete; installers also see Manage the company profile. Events: events you added, with Edit, a notice you can set to Cancelled or Postponed, Run again next year, and Delete. Badges: winners keep a crown badge, and you choose where badges show (list card, map pop-up, details page). Account: your optional name and address (used only to fill in forms, never shown publicly), your monthly update choice, Sign out, and Delete my account. To delete an event or a home, use Delete on its row in your profile.

## Signing in and out, and passwords
url: /profile
keywords: sign out log out logout passwords password sign in code email
There are no passwords. Sign in with Google or with a 6-digit code emailed to you. To sign out, tap the account circle and choose Sign out, or open Your profile, Account tab, and tap Sign out. The sign-in lasts up to 30 days on your device unless you sign out. If the emailed code does not arrive, check spam, make sure the address is right, and ask for a new one; codes last 10 minutes.

## How payments work: Stripe, receipts and tips
url: /pricing
keywords: pay payment secure receipt tip tips donate apple pay cash app card stripe
Paid options (Featured events, installer Sponsor placements, contest passes, featuring a winning home) are paid on Stripe's secure page, with a card or Cash App Pay. We never see your card details. Stripe emails your receipt, and SoCal Lights sends a short confirmation. There are no subscriptions unless an installer ticks the optional automatic renewal box. If a payment was taken but a placement or pass has not appeared, wait a few minutes and refresh, then email info@socallights.app. Tips: tap the three dots, choose Support SoCal Lights, and use the tip link there. We do not list other payment methods.

## Cancel automatic renewal for an installer Sponsor placement
url: /sponsor
keywords: cancel renewal automatic renew stop subscription
Automatic renewal is optional and off unless you ticked the box when you bought. To stop it: open the cancel link in any renewal email, or open your installer manage page (/installer/<name>/manage), find Sponsor placement, and tap Turn off automatic renewal. You can turn it on again there. Cancelling stops the next renewal; the season you already paid for keeps running.

## Advertising and promoting on SoCal Lights
url: /pricing
keywords: advertise advertising promote cost price list banner buy
Event organizers can promote an event with a Featured pin, banner or top of the list (Promote your event). Lighting installers can buy a Sponsor Banner or Top of the list placement (Pricing, Installers). Contest organizers can record sponsors on their contest page. All paid placements are labelled and never affect a contest result. Prices are on the Pricing page. For anything else, email info@socallights.app.

## Contest organizer tools: QR poster, yard signs, results download
url: /help#run
keywords: print qr poster yard sign download results spreadsheet
On the organizer dashboard you can copy the contest link and print a QR poster that opens the contest page, print entry posters, and print a yard sign. In the print window turn on background graphics so colors print. After winners are announced, the dashboard has Download results (spreadsheet). You can also hide or show vote counts, and read contest activity.

## The Shop tab and affiliate links
url: /
The map has a Shop tab next to Places and Favorites, with ideas for each season. Its cards open an Amazon search. As an Amazon Associate we earn from qualifying purchases, at no extra cost to you. Shop links never affect contests or listings.

## Privacy basics: cookies, location, data and the AI assistant
url: /privacy
keywords: cookies cookie location stored data collect sell tracking ads advertising privacy
We do not sell your personal information and we do not use advertising cookies or ad networks. A sign-in cookie keeps you signed in on your device for up to 30 days, and signing out removes it. Your location is used only on your own device, to show distances and directions; you can say no at any time. Page views are counted as one number per page per day, with no IP address, cookie or account. The site remembers a few choices on your device only, such as your saved places in Favorites, your day or night choice, your maps app and whether you hid the tips. The AI assistant keeps your chat only in your browser tab, and the server stores counts, never your messages. Full details are on the Privacy page.

## Is SoCal Lights free? What costs money?
url: /pricing
keywords: free cost how much price list listing site free pay
Using SoCal Lights is free: the map, search, routes, Favorites, voting, entering a contest, and posting an event or your own home. Residents and visitors use it for free, and organizers pay for a contest pass to run a contest. Optional paid extras are always labelled and never change a contest result: Featured placements for events, installer Sponsor placements (the Banner, Top of the list, or both), contest passes, and featuring a winning home. Prices are on the Pricing page. The site is in English.

## Installer and Featured plans: what the Banner includes
url: /pricing
keywords: banner plan include includes top of the list pin what do i get
For events, every Featured plan includes the gold-ringed Featured pin and badge. The banner adds your event as a Featured pill in the strip at the top of the map list, and Top of the list shows your event first when people browse your area; the plans combine these. For installers, the Sponsor Banner is a pill labelled Sponsor in that strip, Top of the list puts your company card first in the installer list without the banner, and the third plan has both. Each plan card on the Pricing page folds open with What's included and the exact price.

## Adding a logo, photos and sponsor logos
url: /help#sponsors
keywords: logo logos add a logo upload sponsor logo installer logo photo
An installer adds a company logo on the manage page under Your details. A contest organizer adds a sponsor's logo on the Sponsors tab when recording a sponsor, or the sponsor adds it on the private invite link. Logos show only after the organizer confirms the sponsor and chooses to show it. Photos for homes and events are added in the add form (take them at night, the first is the cover), and can be edited from your profile.

## Photos: formats, size and tips
url: /help/my-photo-will-not-upload
keywords: photo photos picture size how big resolution format jpg png webp upload limit megabytes
You can add up to 8 photos to a home. Photos must be JPG, PNG or WebP, and each one must be under 6 MB. You do not need to resize them: the form shrinks big phone photos for you before they upload, so a normal phone photo works. Take photos at night with the lights on; the first photo is the cover people see on the map. Homes can also add photos later by email. If a photo will not upload, check that it is a JPG, PNG or WebP and under 6 MB, then try again, and see the Help Center article "My photo will not upload".

## Every route for a home at a glance
url: /add-house
keywords: all the ways options routes several ways different ways claim installer organizer adds enter contest
There are several ways a home gets onto SoCal Lights. 1) A homeowner adds it: sign in, open Add, choose A lighting display, and fill in the form with night photos; it is free. 2) A professional installer adds homes they put up for customers, choosing A professional installer in the same form. 3) A home that is already on the map from a public list can be claimed: open its card, tap Is this your home? Claim it, and add your own photos and details. 4) A contest organizer can add residents' homes to their own contest from a list (Entries tab, Add homes yourself), with no photo or account needed. 5) A resident can enter a home in a contest from the contest page. The first three put a home on the map for everyone; the last two put it in a contest.

## Every route for an event at a glance
url: /add-event
keywords: all the ways options routes several ways different ways claim an existing event web page confirmed expected
To list an event, sign in, open Add, and choose An event. If your event has a web page that mentions its name and date, the event is marked Confirmed; without a page it still goes on the map, marked Expected until the dates are checked. If your event is already on the map but not on your account, open Promote your event (or its listing) and use Claim an existing listing: if your email matches the event's own website it is approved at once, otherwise the team checks it. Contest organizers who create a contest also get it on the map as an event automatically. Listing an event is always free.
