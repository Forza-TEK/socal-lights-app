# Persona audit, 2026-11-01

Method: loaded the site in a test browser at phone (375 and 390 px), landscape phone (844 x 390), tablet (820 x 1180) and desktop (1440 px) widths, walked the flows as five people, and read the code behind each screen. The earlier map-and-menu audit is `docs/ux-audit.md` (its calendar, share, report, alerts, offline and orientation items have since been built). Nothing here is built yet unless marked **Fixed**.

Checked and clean: no JavaScript errors and no sideways scrolling on any of 10 pages at 5 sizes.

## Every device
1. **Tablet portrait (820 px) uses the phone layout stretched.** The list sheet is full width, text is small, and most of the screen is empty map. From about 700 px wide the side panel (as on desktop) would suit it better.
2. **Landscape phone (844 x 390).** The bottom sheet covers about 60% of the height, leaving a thin strip of map. Under ~500 px tall, switch to a left-hand panel.
3. **Touch targets under 44 px.** Quick picks (Tonight, This weekend, Free, Filters) are 33 to 36 px tall, "Route these" 33, the light/dark toggle 38. Raise them to 44 or enlarge the tap area.
4. **Desktop search box is cut off** ("Search p...") beside the season button. Give it more room or shrink the season button's label.
5. **Tutorials page shows 23 large empty "Coming soon" tiles.** Use compact rows until a video exists.
6. **Stale wording after auto-publish. Fixed:** Add event said "a person checks it first, usually within a day", Add house said "goes live after a quick review" with a "Send for review" button, and the event thank-you said "a person will take a quick look". They now say it goes on the map right away.

## A family looking for homes to see
1. **Little to tell a good stop from a bad one.** Cards show name, city and dates. Families want: lights-on hours ("5 to 10 pm"), drive-by or walk-through, free parking nearby, stroller or wheelchair friendly, and the radio station for synced shows (the contest entry example even says "Tune to 88.1 FM"). Add a few optional fields and filter chips for them.
2. **No "is it on tonight?" signal.** Dates are for the season, not the night. A one-tap "Lights are on" report from visitors, shown as "Confirmed tonight by 3 people", would make the list trustworthy.
3. **On Nov 1 the default season is Día de los Muertos**, while most families now look for Christmas. The "Coming up" teaser exists; a stronger "Christmas lights start Nov 15, see homes now" entry point would help.
4. **Posted homes show only in their own season or All seasons**, so a Christmas home is invisible on the default view in early November even though families can already plan for it.
5. **First visit.** The location prompt covers the search and season controls on small phones. Make it a compact banner that does not cover controls.

## A neighbor (homeowner or contest entrant)
1. **Cannot edit or take down their own home or event.** Profile > Displays and > Events list them with a status only; a typo or a changed date needs an email to you. Add Edit, "Taken down for the season" and "Run again next year".
2. **No "entry received" email** when someone enters a contest (they hear only on approve or decline).
3. **Voting needs sign-in on the first tap.** Google works in one tap; the emailed code takes a minute. Consider keeping the pick and finishing it after sign-in (it already returns to the same spot).
4. **Photos can't be added or swapped after posting.**

## A professional installer
1. **No way to claim or edit their own profile.** Only the admin can edit it. A company a homeowner named first has no email on file, so it can never confirm a claim. Add "Claim this profile" using the same trust rule as contests (email at the company's website domain), which then unlocks editing, a logo, confirming or denying claims, and a leads list.
2. **Profile page is bare:** no logo, no photos of their best work up top, no quote form (only Call and Visit website). Reuse the contest's opt-in quote form so requests are emailed with consent and counted.
3. **Posting a second home means re-typing the business details.** After claiming, pre-fill from the profile.
4. **No numbers for them:** profile views, quote requests, homes on the map. These are what a paid tier would sell.
5. **Free-text company names invite duplicates.** Suggestions help and the admin can merge, but a "Did you mean...?" check on a near-match would prevent most of it.

## A community organizer (contests)
1. **No preview as a voter.** First-time organizers cannot see the voter page before going live. Add "Preview as a voter".
2. **No "Run again next year".** A finished contest should start a new one with the same categories, rules, sponsors and judges.
3. **Shared links show a generic preview.** `/c/<slug>` has no Open Graph tags (name, city, a photo), so a link pasted in Facebook, Nextdoor or a text looks blank. This is the main way neighbors spread a contest; make the title and image come from the server.
4. **No way to invite by list.** QR and a link only. Allow pasting emails to send one invite each.
5. **Judges:** the dashboard shows each judge's progress but has no "nudge" button for those who have not finished.

## An events organizer
1. **Cannot edit or cancel a submitted event.** Dates change and events get cancelled. Add an emailed edit link or a profile Edit, and a visible "Cancelled" or "Postponed" tag on the card.
2. **Recurring events are re-entered every year.** Add "Copy to next year".
3. **No flyer or photo on an event** unless the web page supplies one.
4. **Multi-day schedules are free text** (start, end, hours). A small per-day schedule would read better.
5. **Featured payment path:** the add-event flow can go to Stripe, while /feature currently shows the manual Cash App path. Pick one before promoting it.

## Cross-cutting
1. **Android app:** the project notes say Google sign-in does not work inside an embedded web view. Contests and Mine need sign-in, so test this on a real phone before the Play listing.
2. **Open Graph and titles** are missing on contest, tutorial and installer pages (the installer page has them); index has them.
3. **Reports feed the daily email.** Add the count of "Something wrong? Tell us" reports to the three-a-day email so auto-published mistakes are caught.
4. **Moderation load.** With auto-publish, the only brakes are spam words and daily caps. A per-person limit (for example 5 homes a day per verified email) is cheap insurance.

## Suggested build order
1. Own-listing edit, take down and renew (neighbor and events organizer; the biggest shared gap).
2. Server-rendered share previews for contests (and tutorials).
3. Claim an installer profile, plus quote form and logo on the profile.
4. Family-friendly details and filters (hours, parking, accessibility, radio station), and "lights are on" reports.
5. Tablet and landscape layouts, 44 px targets, desktop search width.
6. Run a contest again, preview as a voter, invite by email list.
7. Tutorials page compact rows (then videos as they are made).
