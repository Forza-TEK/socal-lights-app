# Help Center refresh: paste-ready text (2026-11-06)

Update 2026-11-06 (new Featured event pricing): `is-it-free` and `feature-an-event-or-home` below carry the newer text from migration `0168_help_featured_pricing.sql`, which replaces what 0167 wrote for them (again only where nobody edited the article in Admin). If you edited either article in Admin, paste the blocks below over it. Regenerate with `node scripts/help/updates-0168.mjs`.

Normally you do nothing: migration `0167_help_refresh.sql` applies this text to every article nobody has edited in Admin, and adds the four new ones. Use this page only for an article you edited in Admin earlier (the migration skips those on purpose), or to check the wording.

To paste: Admin > Help Center > click the article > replace Title, One-sentence answer, Search words and Text with the blocks below (copy without the four leading spaces) > Save. For a new article that did not appear, click New article, type the slug exactly as the heading, and choose the category and type shown. Leave Video empty. Slugs never change. Word rule: "home", not "house" or "display".

Quoted button names (A lighting display, the profile tab for posted homes) are what the screen says today.

## approve-and-decline-entries
Existing article. Category: run. Type: howto. Order: 40.

Title:

    Approve and decline entries

One-sentence answer:

    On the Entries tab, tap Approve to put a home on the map, or Decline with an optional reason. You can also add homes yourself.

Search words:

    approve decline entries review reason restore undo photos entrants add homes paste addresses added by organizer remove

Text:

    1. Open your dashboard ([how](/help/share-your-contest)) and tap **Entries**. Nothing goes on the map until you approve it.
    2. Tap **Approve** to put a home in the contest and on the map.
    3. Tap **Decline** if an entry does not fit. A window asks why. The reason is optional, and it is emailed to the entrant. Tap **Decline entry**.
    4. Changed your mind? Tap **Restore** to put it back.
    
    ## Homes you add yourself
    At the top of Entries is **Add homes yourself**. Use it when residents sign up somewhere else, such as a city form or a spreadsheet. See [Add your city's homes yourself](/help/add-your-citys-homes-yourself).
    
    Homes you add carry an **Added by organizer** tag. They are approved already, so there is nothing to approve. To take one out, tap **Remove** on its row. It asks you to tap again, so you cannot do it by accident.

## run-voting
Existing article. Category: run. Type: howto. Order: 60.

Title:

    Run voting: pause, check results and void a vote

One-sentence answer:

    Use the Controls card to pause or resume voting, unpublish the contest, and open Results to review the tally and individual votes.

Search words:

    voting pause resume results tally void vote review flagged controls close entries unpublish publish again hide contest

Text:

    Voting opens and closes on your dates. The **Controls** card lets you change that.
    
    - **Pause voting** stops votes for a moment. **Resume voting** starts again.
    - **Contest page** shows **Unpublish** while your contest is public. It hides the whole contest from the public and the map, and you can publish it again. See [Unpublish a contest and publish it again](/help/unpublish-and-publish-again).
    - **Results** is the full tally. You always see the counts, even when the public cannot.
    - Open **Review individual votes**. Odd patterns are flagged. Tap **Void** next to a vote that should not count.

## show-off-your-house
Existing article. Category: post. Type: howto. Order: 20.

Title:

    Show off your home on the map

One-sentence answer:

    Tap Add, then A lighting display. Photos, address and a description put your home's lights on the map for families to drive by.

Search words:

    show off home house lighting display homeowner showcase photos address put it on the map drive by claim your home

Text:

    1. Start on the map at socallights.app. Tap the three dots at the top right. Tap **Add**, then **A lighting display**.
    2. **Who is posting?** Choose **A homeowner** (or a professional installer). **Next**.
    3. Type the name to show. **Next**.
    4. Did a company install your lights? If you did it yourself, tap **No**. **Next**.
    5. Choose the season. **Next**.
    6. Name your home and tell us what makes it special. **Next**.
    7. Add the address. The pin goes here, and visitors see it so they can drive by. **Next**.
    8. Tell families when the lights are on and how to see them (drive by, walk by, parking). **Next**.
    9. Add photos. **Next**.
    10. Check everything and tap **Put it on the map**.
    
    Nothing goes public until the last step, and you can save and exit at any time. Saved drafts are in [your profile](/help/your-profile).
    
    ## Is your home already on the map?
    Some homes are on the map already, with a photo from the street. If yours is one of them, tap **Is this your home? Claim it** on its card instead. The form opens with your address filled in. See [Is this your home? Claim it](/help/claim-your-home).

## your-profile
Existing article. Category: enter. Type: howto. Order: 30.

Title:

    Your profile: drafts, contests, badges and your account

One-sentence answer:

    Tap the person icon at the top of the map. Each tab lists what you have, with a button on every row.

Search words:

    profile drafts contests entries homes badges account name photo delete account crown winner person icon rows manage

Text:

    Tap the **person icon** at the top of the map, next to the three dots. Each tab is a list of rows, and each row has buttons for what you can do with it.
    
    - **Drafts** lists anything you started and saved. Tap **Continue** to finish it on any device, or **Delete**.
    - **Contests** has two lists. **Contests you run** shows each contest you run or help run, with **Manage** and **View page**. **Homes you entered** shows your homes in other people's contests, and whether each is in the contest or waiting for the organizer.
    - The tab for homes you posted lists the homes you showed off on the map. The **Events** tab lists the events you added.
    - **Badges** shows the awards your home has won. Winners keep a crown. It appears once you have one.
    - **Account** is where you change your name and photo, and where you can delete your account.

## is-it-free
Existing article (updated by migration 0168). Category: account. Type: answer. Order: 10.

Title:

    Is SoCal Lights free?

One-sentence answer:

    Yes. Finding lights, routes, voting and entering a home are free, and votes are never sold. Featured is the one optional paid extra.

Search words:

    free cost price pay charge fee money tip cash app featured paid winner podium buy full run $10 $15 $25

Text:

    Using SoCal Lights is free. The map, search, routes and voting stay free for everyone. Entering a contest is free and votes are never sold.
    
    ## Featured is the one paid option
    A **Featured** listing has a gold badge and a bigger gold-ringed pin on the map. It is optional, and it is the only thing on SoCal Lights that costs money today. Featured listings are always labeled.
    
    - **Events** can be featured by their organizer: **Featured pin** $10, **Top of the list** $15, or **Full run** $25 for events that run 31 days or more. The placement starts when you pay and ends on your event's last day, up to 30 days (up to 90 days for Full run).
    - **Homes** can be featured only by the owner of a home that finished winner, 2nd or 3rd place in a contest, after the winners are announced. Featured pin $10 or Top of the list $15, for 30 days.
    - **Paying never affects a contest.** It cannot change who wins or any contest result.
    
    See [Feature an event or a home](/help/feature-an-event-or-home) and the [Pricing page](/pricing).
    
    If you would like to help keep it free, there is a **Keep SoCal Lights Free** row in the three-dots menu.
## install-the-app
Existing article. Category: find. Type: howto. Order: 40.

Title:

    Put SoCal Lights on your phone and use it offline

One-sentence answer:

    Add it to your Home Screen from your browser. There is nothing to download from an app store. Pages you have visited open again with no signal.

Search words:

    install app home screen iphone android safari chrome offline no signal pwa add to home screen visited pages

Text:

    **iPhone:** open socallights.app in **Safari**. Tap the Share button, scroll down, and tap **Add to Home Screen**.
    
    **Android:** open socallights.app in **Chrome**. Tap the three dots, then **Install app** (or **Add to Home screen**).
    
    ## With no signal
    The app still opens, and so does any page you have opened before. Your last list of places is saved on your phone too. A page you have never opened shows a short offline message instead. Map pictures and photos are not saved. When your signal comes back, the app updates by itself.
    
    Tip: open the pages you will want, such as the map and a contest, while you still have signal.
    
    The Install option missing? See [I do not see Add to Home Screen](/help/no-add-to-home-screen).

## add-your-citys-homes-yourself
New article. Category: run. Type: howto. Order: 45.

Title:

    Add your city's homes yourself

One-sentence answer:

    On the Entries tab, paste one address per line under Add homes yourself, tap Check addresses, then Add homes.

Search words:

    add homes yourself paste addresses city spreadsheet register residents organizer bulk list added by organizer remove covina

Text:

    Already taking sign-ups somewhere else, such as a city form, a spreadsheet or email? You can put those homes in the contest yourself. The resident does not need a photo or an account.
    
    1. Open your dashboard ([how](/help/share-your-contest)) and tap **Entries**.
    2. Open **Add homes yourself**.
    3. Paste one home per line, like this: Street address, City, ZIP | Name. The city, ZIP and name are optional. Without a city, the contest's city is used. A column pasted from a spreadsheet works too.
    4. Tap **Check addresses**. Every line is marked **Found**, or tells you what is wrong, such as **Already in this contest**.
    5. Tick **These residents agreed to have their address shown on the public map**. Only tick it if they did.
    6. Tap **Add homes**. The button shows how many it will add.
    
    Each home goes straight onto the ballot and the driving routes. Its entry carries an **Added by organizer** tag. To take one out, tap **Remove** on its row, then tap again to confirm.
    
    ## Good to know
    - You can add up to 100 homes at a time.
    - Homes can be added until voting starts. After that the card says so, because it would change the ballot under the voters.
    - Checking and adding are limited to 10 times an hour.
    
    See also [Approve and decline entries](/help/approve-and-decline-entries).

## claim-your-home
New article. Category: post. Type: howto. Order: 25.

Title:

    Is this your home? Claim it

One-sentence answer:

    Open your home's card on the map and tap Is this your home? Claim it. The form starts with your address filled in.

Search words:

    claim home my home already on the map street view photo owner replace listing is this your home

Text:

    Some homes are on the map already, found by us with a photo from the street. If one of them is yours, you can add your own photos and details.
    
    1. Find your home on the map and tap it to open its card.
    2. Tap **Is this your home? Claim it**.
    3. The form opens with your address filled in, and the first step says **You are claiming** your home's name.
    4. Fill in the steps the same way as in [Show off your home on the map](/help/show-off-your-house), and tap **Put it on the map**.
    
    Once the site owner approves it, your listing replaces the automatic one.
    
    The claim link shows only on homes we found ourselves. A home you posted, or one entered in a contest, does not have it.

## unpublish-and-publish-again
New article. Category: run. Type: howto. Order: 65.

Title:

    Unpublish a contest and publish it again

One-sentence answer:

    On the Controls card, tap Unpublish to hide your contest. Tap Publish again to bring it back.

Search words:

    unpublish publish again hide contest take down off the map pause contest remove public

Text:

    1. Open your dashboard ([how](/help/share-your-contest)). On the **Controls** card, find **Contest page**.
    2. Tap **Unpublish**. The contest is hidden from the public and the map, and new entries and votes are paused.
    3. Nothing is deleted. Your entries and votes stay, and your team can still open the dashboard. Your co-organizers are told.
    4. To bring it back, tap **Publish again** in the same place, or **Publish it again** in the notice at the top of the Overview.
    
    Only the person who created the contest can unpublish it, and only that person can publish it again. If the site owner took your contest off the map, Publish again will not work. Contact us.
    
    See also [Run voting](/help/run-voting).

## feature-an-event-or-home
Existing article (updated by migration 0168). Category: post. Type: howto. Order: 30.

Title:

    Feature an event or a home

One-sentence answer:

    Featured is optional and paid. Open the Feature page, choose your event or winning home, pick a plan and pay on Stripe.

Search words:

    feature featured event home pin gold badge top of the list full run plan price pay stripe winner second third promote advertise opens 30 days last day

Text:

    A **Featured** listing has a gold badge and a bigger gold-ringed pin on the map. It is optional.
    
    ## An event
    1. Open the Feature page at [socallights.app/feature](/feature).
    2. Find your event. If it is not on the map yet, add it for free first. If it is yours but you did not add it, tap **Claim this event**.
    3. Pick a plan (below).
    4. Tap **Continue to payment** and pay on Stripe's secure page.
    
    ### The plans for an event
    **Featured pin, $10**
    - A gold-ringed pin on the map
    - A "Featured" badge on your event in the list and its details
    - Runs from today until your event's last day, up to 30 days
    
    **Top of the list, $15**
    - A gold-ringed pin on the map
    - A "Featured" badge on your event in the list and its details
    - Your event is listed first when people browse your area
    - Runs from today until your event's last day, up to 30 days
    
    **Full run, $25** (events that run 31 days or more)
    - A gold-ringed pin on the map
    - A "Featured" badge on your event in the list and its details
    - Your event is listed first when people browse your area
    - Runs from today until your event's last day, up to 90 days
    
    ### When it starts and ends
    - Featuring opens 30 days before your event starts. If you try sooner, the page tells you the date to come back. An event that is already running can be featured any time.
    - Your placement starts when you pay and ends on your event's last day, as the date is on the map when you pay. If the event's dates change later, the placement does not change.
    - Full run is for events that run 31 days or more and still have at least 7 days left.
    - Buying again adds time only if the earlier placement ended at the 30-day (or 90-day) limit rather than your event's last day. If it already runs to the last day, there is nothing to add; you can still upgrade the pin to Top of the list.
    
    ## A home
    Only the owner of a home that finished winner, 2nd or 3rd place in an announced contest can feature it. Paying never changes a contest result.
    
    **Featured pin, $10**
    - A gold-ringed pin on the map
    - A "Featured" badge on your home in the list and its details
    - Runs for 30 days from today
    
    **Top of the list, $15**
    - A gold-ringed pin on the map
    - A "Featured" badge on your home in the list and its details
    - Your home is listed first when people browse your area
    - Runs for 30 days from today
    
    ## Good to know
    - You pay once per event or home. There is no subscription.
    - Featured listings are always labeled, and they still have to be real and accurate.
    - The map, search, routes and voting stay free. See [Is SoCal Lights free?](/help/is-it-free).
    - Featured is bought on the website, not in the app.

## 2026-11-06: installer Sponsor placements (migration 0172)
Only applied where the article is still unedited (`updated_by = 'seed'`). If you edited it in Admin > Help Center, paste this.

### is-it-free
Summary: Yes. Finding lights, routes, voting and entering a home are free, and votes are never sold. Featured and Sponsor are the optional paid extras.

Using SoCal Lights is free. The map, search, routes and voting stay free for everyone. Entering a contest is free and votes are never sold.

## Two optional paid extras
Paid placements are optional, always labeled, and never change a contest result.

- **Featured** has a gold badge and a bigger gold-ringed pin on the map. **Events** can be featured by their organizer: **Featured pin** $10, **Top of the list** $15, or **Full run** $25 for events that run 31 days or more. The placement starts when you pay and ends on your event's last day, up to 30 days (up to 90 days for Full run). **Homes** can be featured only by the owner of a home that finished winner, 2nd or 3rd place in a contest, after the winners are announced: Featured pin $10 or Top of the list $15, for 30 days.
- **Sponsor** is for installers. A free installer profile stays free. An installer can pay for the **Banner** ($50 per season) or **Banner and top of the list** ($75 per season), always labeled "Sponsor". Late in a season the price is prorated for the days left.
- **Paying never affects a contest.** It cannot change who wins or any contest result.

See [Feature an event or a home](/help/feature-an-event-or-home), [Sponsor your installer company](/help/sponsor-your-installer-company) and the [Pricing page](/pricing).

If you would like to help keep it free, there is a **Keep SoCal Lights Free** row in the three-dots menu.

### sponsor-your-installer-company (new; inserted only if missing)
Summary: Installers can pay for a labeled Sponsor banner ($50 per season) or the banner plus the top of the list ($75). Choose on Pricing, pick your company, check the dates, pay on Stripe.

Installers can show their company in a labeled **Sponsor** banner at the top of the list on the map. It is optional and paid; your free installer profile stays free.

## What you can buy
**Banner, $50 per season**
- Your company name, linked to your website (or to your email if you have no website), in the labeled "Sponsor" banner at the top of the list on the map
- Your phone number in that banner, tap to call
- Shown whenever your areas served are in the map view (everywhere if you list none)
- How many times you were shown and tapped, in your dashboard

**Banner and top of the list, $75 per season**
- Your company name and phone number in the labeled "Sponsor" banner, as above
- Your company card at the top of the list, right behind the Featured events, labeled "Sponsor"
- How many times the banner and the card were shown and tapped, in your dashboard

## How to buy
1. Open the [Pricing page](/pricing#banner) and tap **Choose** on a plan, or go to [socallights.app/sponsor](/sponsor).
2. Sign in. If you do not have an installer profile yet, tap **Create your free profile first**; if you are already on the map, find your company and tap **Claim this profile**.
3. Choose your company. It needs a phone number or a website (the page tells you what is missing and links to your profile). Areas served are recommended.
4. Choose a plan and check the dates and price.
5. Tap **Continue to payment** and pay on Stripe's secure page. Your placement turns on within a few minutes.

## How long it lasts and what it costs
A season runs from the day you pay to the last day of the season on the map (the Thanksgiving & Christmas season ends Dec 26). With 14 or more days left you pay the full price. With fewer days left you pay a share of it for the days remaining (never less than $10); the page shows the exact price before you pay. The placement always ends on the season's last day.

## Renew or upgrade
- **Renew:** buy the same plan again while it runs. The new season starts the day after the current one ends. Time is only added, and we sell at most one season ahead.
- **Upgrade:** to add the top of the list to a running banner, choose Banner and top of the list. It is sold at its own price for the days left; there is no credit for the banner you already paid for.
- Your dashboard (Overview) shows your dates and numbers, with a **Renew or upgrade** button.

## Refunds
If we cannot put your placement on, you get a full refund. A refund switches the placement off, and so does a payment dispute, so please email info@socallights.app before disputing a charge.

Paying never affects a contest, and the map stays free. See [Is SoCal Lights free?](/help/is-it-free).
