<!--
Public-safe knowledge for the AI assistant (docs/ai-assistant.md). Everything here is meant to be shown to the public: no secrets, no internal operations, no postal address, no prices (prices come only from the code), no dates.
Every statement is taken from docs/contests.md and the Terms. Edit this file, then run `node scripts/build-chat-kb.mjs`; tests fail if the generated file is out of date.
Format: "## Title" then a line "url: /path" then plain text. Say "home", never "house".
-->

## Running a contest: the steps
url: /help#run
Open the Add page and choose Contest (or go to /add-contest). The contest wizard has four screens: Basics, Dates, Rules and Review. You sign in on the last screen, and your draft is kept while you sign in with Google. When you finish, the contest goes live right away and appears on the map as an event. Each contest has its own page at /c/<name> (the page a QR code opens). The organizer dashboard is at /c/<name>/manage: approve or decline entries, pause or start voting, hide or show vote counts, announce winners, copy the link, and print a QR poster. An organizer can create up to 3 contests per account per day.

## Adding your home to the map (no contest needed)
url: /add-house
You do not need a contest to put your home on the map. Adding a home, also called showing your lights or listing your display, is free and works on its own. Go to the Add page and choose Home (or open /add-house). Sign in first with Google or an emailed code, because every listing belongs to the account that adds it. The form asks: who is posting (a homeowner or a professional installer), the name to show, which season the display is for, a display name and a few sentences about it, the address (city, street and 5-digit ZIP) so the pin can go on the map, and optional details such as when the lights are on, drive or walk by, parking, accessibility, radio station and tips. Photos are optional: up to 8, and you can add them later by email. On the last screen you check everything and choose Put it on the map; the home normally appears right away, and on a very busy day a new home may wait briefly for review. You can ask us to change or remove it at any time. If the map already shows an automatic listing for your address, open it and choose Is this your home? to claim it; the site owner approves the claim and your listing replaces the automatic one. Entering a contest is a separate, optional step: a contest asks you to be 18 or older, add photos and accept that contest's rules.

## Entering a home in a contest
url: /help#enter
To enter, open the contest page and choose Enter. You must sign in, add photos, the home's address and a name, and accept the contest's official rules. You must be 18 or older to enter a home. A home does not pick a category: it competes in every category. If the organizer approves entries by hand, your photos stay private until the organizer approves your entry; if entries are approved automatically, your home appears right away. You can edit or withdraw your entry from your profile while the contest allows it.

## Voting in a contest
url: /help#vote
Voting is free and needs a sign-in. Every approved home is listed in every voting category (for example Best Overall or Most Creative). Each voter picks one favorite home in each category. Voting again in a category moves your vote. Some contests give one vote in total instead; the contest page says which. Nobody can vote for their own home. Voting opens on the contest's start date (or when the organizer starts it early) and stops when the winners are announced. Fake, automated or traded votes are not allowed and may be voided. Votes are never sold.

## Categories, winners and ties
url: /help#run
The organizer defines the voting categories. Best Overall is an ordinary category like any other. There is no computed overall winner. For a single overall winner, use one category. Winners are the top home in each category. Vote counts are hidden until winners are announced unless the organizer chooses to show them. An organizer may choose to give each home only one win. Tied homes share the win. Each contest's organizer writes its official rules, decides who wins, and provides any prize.

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
Anyone with an account can vote in a contest that has public voting; voting is free and always will be. You sign in with Google or an emailed code, so your vote belongs to your account (your verified email address), not to a device. You get one vote per category: pick one favorite home in each category, and the contest page says if that contest gives one vote in total instead. You cannot vote for your own home. A judge in the contest votes on the judges' ballot instead of the public vote. Voting is open only between the contest's voting dates, or when the organizer starts it early, and the organizer can pause it. It closes when the winners are announced.

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
url: /help#run
For cities that collect resident entries on their own form or spreadsheet, the organizer or a co-organizer can add homes themselves: on the dashboard, open the Entries tab and choose Add homes yourself. Paste one home per line (street address, optionally with city, ZIP and a name). Choose Check addresses first to see which were found, tick the box confirming the residents agreed to have their address shown on the public map, then add them. Up to 10 homes can be added at a time. Homes that cannot be found are not added. Added homes have no photo and no resident account. This can be done before voting starts. A mistake can be removed from the entries list before the home has votes.

## Unpublish a contest and publish it again
url: /help#run
The person who created a contest can unpublish it from the dashboard: Overview, Controls, Contest page, Unpublish (two taps). That takes it off the map and hides its page, but keeps the entries, votes, judges and sponsors. The creator can use Publish it again to put it back. Co-organizers cannot unpublish. If our team unpublished a contest, only our team can put it back.

## Contest passes: how they work
url: /contest-pass
Each organization gets one free contest in every 12-month window, counted from the day its first contest goes live. To run more contests inside the window, the organization buys a pass: Up to 5, Up to 10 or Up to 20 contests in total, and the free one counts. More than 20: contact us. A pass is one payment on Stripe's secure page and never renews by itself. You can buy ahead of time on the contest pass page, or the contest wizard offers it when a new contest would go over your allowance. Passes only count contests: they do not change entries, features or results. Entering and voting stay free, and payment never affects who wins.

## Sponsors of a contest
url: /help#sponsors
An organizer can record a sponsor who paid them directly. Sponsorship money goes to the organizer, not to SoCal Lights. A sponsor appears on the contest page only when the organizer has confirmed the payment (or an in-kind gift), has the sponsor's permission, and chooses to show it. The contest page then shows the sponsor's logo, name and link, labelled Sponsor, with the line that sponsors support the contest but do not influence who wins. Organizers can also share a private sponsor invite link (/s/<code>): a sponsor opens it without an account, fills in a short form, and nothing is shown on the contest page until the organizer confirms the payment and approves it. The organizer can turn the link off or make a new one. Never pay anyone you do not know.

## Featuring a home after a contest
url: /feature
After winners are announced, the owner of a home that finished first, second or third in any category can pay to feature it for 30 days, from the Feature page. Paying never changes a contest result. The price is on the Pricing page.

## Accounts and sign-in
url: /help#account
You never need an account to browse the map or add an event. You sign in to run, enter or vote in a contest. There are no passwords: sign in with Google or with a 6-digit code emailed to you. Both reach the same account for the same email address. A sign-in lasts up to 30 days and a code lasts 10 minutes. You can delete your account from your profile, Account tab.
