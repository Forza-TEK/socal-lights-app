# Help Center refresh: paste-ready text (2026-11-06)

Update 2026-11-06 (new Featured event pricing): `is-it-free` and `feature-an-event-or-home` below carry the newer text from migration `0168_help_featured_pricing.sql`, which replaces what 0167 wrote for them (again only where nobody edited the article in Admin). If you edited either article in Admin, paste the blocks below over it. Regenerate with `node scripts/help/updates-0168.mjs`.

Update 2026-11-06 (event tiers and installer Top of the list): `is-it-free`, `feature-an-event-or-home` and `sponsor-your-installer-company` below carry the newest text from migration `0184_help_pricing_tiers.sql` (again only where nobody edited the article in Admin; the prices are not in the articles, they are on /pricing). `automatic-renewal-for-installers` gets one added sentence: in its **What it does** list, add after the first bullet's text: "It renews the same plan you bought: Banner renews as Banner, Top of the list as Top of the list, and both as both." If you edited any of them in Admin, paste the blocks below over it. Regenerate with `node scripts/help/updates-0184.mjs`.

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
Existing article (updated by migration 0184). Category: account. Type: answer. Order: 10.

Title:

    Is SoCal Lights free?

One-sentence answer:

    Yes. Finding lights, routes, voting and entering a home are free, and votes are never sold. Featured and Sponsor are the optional paid extras.

Search words:

    free cost price pay charge fee money tip cash app featured sponsor installer banner top of the list paid winner podium buy

Text:

    Using SoCal Lights is free. The map, search, routes and voting stay free for everyone. Entering a contest is free and votes are never sold. Listing an event or a home is free too.
    
    ## Two optional paid extras
    Paid placements are optional, always labeled, and never change a contest result. The [Pricing page](/pricing) shows every price.
    
    - **Featured** is for events and, after a contest, winning homes. An **event** organizer can add a **Featured pin** (a gold-ringed pin on the map and a "Featured" badge), a **banner** (your event as a pill labeled "Featured" in the strip at the top of the map list) and **top of the list** (your event is listed first when people browse your area). Every paid plan includes the pin; the banner and top of the list are optional extras, and each part costs the same. It runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first. A **home** can be featured only by the owner of a home that finished winner, 2nd or 3rd place in a contest, after the winners are announced: the Featured pin or Top of the list, for 30 days. Homes are a separate line from event plans.
    - **Sponsor** is for installers. A free installer profile stays free. An installer can pay for the **Banner**, for **Top of the list** (the company card, without the banner) or for **both together**, always labeled "Sponsor". A placement runs from the moment you pay to the last day of the season, and the price is the same whenever you start.
    - **Paying never affects a contest.** It cannot change who wins or any contest result.
    
    See [Feature an event or a home](/help/feature-an-event-or-home), [Sponsor your installer company](/help/sponsor-your-installer-company) and the [Pricing page](/pricing).
    
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
Existing article (updated by migration 0184). Category: post. Type: howto. Order: 30.

Title:

    Feature an event or a home

One-sentence answer:

    Featured is optional and paid. Open the Feature page, choose your event or winning home, pick a plan and pay on Stripe.

Search words:

    feature featured event home pin gold badge banner pill top of the list plan price pay stripe winner second third promote advertise upgrade add banner season opens 30 days last day

Text:

    A **Featured** listing has a gold badge and a bigger gold-ringed pin on the map. It is optional. The [Pricing page](/pricing) shows what each plan costs.
    
    ## An event
    1. Open the Feature page at [socallights.app/feature](/feature).
    2. Pick a plan (below).
    3. Sign in, then choose your event. If it is not on the map yet, add it for free first. If it is yours but you did not add it, tap **Claim this event**.
    4. Check the dates and the total, then tap **Pay on Stripe** and pay on Stripe's secure page.
    
    ### The plans for an event
    Every plan is built from three parts. The pin is in every plan; the banner and top of the list are optional extras, and each part costs the same.
    
    **Featured pin**
    - A gold-ringed pin on the map
    - A "Featured" badge on your event in the list and in its details
    - Runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first
    
    **Banner + Featured pin**
    - A gold-ringed pin on the map
    - A "Featured" badge on your event in the list and in its details
    - Your event as a pill labeled "Featured" in the strip at the top of the map list, with its name, city and dates; tap it to open your event
    - The pill shows whenever your event is in the map view
    - How many times your banner was shown and tapped, on your Feature page
    - Runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first
    
    **Top of the list + Featured pin**
    - A gold-ringed pin on the map
    - A "Featured" badge on your event in the list and in its details
    - Your event is listed first when people browse your area
    - Runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first
    
    **Top of the list + Banner + Featured pin**
    - A gold-ringed pin on the map
    - A "Featured" badge on your event in the list and in its details
    - Your event as a pill labeled "Featured" in the strip at the top of the map list, with its name, city and dates; tap it to open your event
    - The pill shows whenever your event is in the map view
    - How many times your banner was shown and tapped, on your Feature page
    - Your event is listed first when people browse your area
    - Runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first
    
    ### When it starts and ends
    - Featuring opens 30 days before your event starts. If you try sooner, the page tells you the date to come back. An event that is already running can be featured any time.
    - It starts the moment you pay and ends on your event's last day or the last day of the season it was bought in (Christmas lights: Jan 6), whichever comes first. The price is the same whenever you buy, and the Feature page shows the exact dates and the total before you pay.
    - Already have the pin? To add the banner or top of the list, pick the plan you want: you pay only for the parts you add. A plan that would add nothing is not sold, and the page says so.
    - Buying again never shortens what you already have.
    
    ## A home
    Only the owner of a home that finished winner, 2nd or 3rd place in an announced contest can feature it. Paying never changes a contest result. Homes have two plans, each for 30 days from the day you pay: the **Featured pin** (a gold-ringed pin and a "Featured" badge) and **Top of the list** (the same, and your home is listed first when people browse your area).
    
    ## Good to know
    - You pay once per event or home. There is no subscription.
    - Featured listings are always labeled, and they still have to be real and accurate.
    - If we cannot list or feature your event, you get a full refund of every part. Once it is live, payments are non-refundable; a refund or a payment dispute switches the placement off.
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
- **Sponsor** is for installers. A free installer profile stays free. An installer can pay for the **Banner** ($50 per season) or **Banner and top of the list** ($75 per season), always labeled "Sponsor". The price is the same whenever you start in a season.
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
A season runs from the day you pay to the last day of the season on the map (the Christmas lights season runs from Nov 3 to Jan 6, and the next season runs from Jan 7 to Jan 31). The price is the same whenever you start in a season. The page shows the exact price and a sentence such as "the season is 40% over, so this costs $X instead of $50" before you pay. The placement always ends on the season's last day.

## Renew or upgrade
- **Renew:** buy the same plan again while it runs. The new season starts the day after the current one ends, at the full price of that season. Time is only added, and we sell at most one season ahead.
- **Upgrade:** to add the top of the list to a banner that already runs to the end of the season, choose Banner and top of the list. You pay the difference between the two plans' prices that day (at least $15).
- Your dashboard (Overview) shows your dates and numbers, with a **Renew or upgrade** button.

## Refunds
If we cannot put your placement on, you get a full refund. A refund switches the placement off, and so does a payment dispute, so please email info@socallights.app before disputing a charge.

Paying never affects a contest, and the map stays free. See [Is SoCal Lights free?](/help/is-it-free).

(Migration 0174, 2026-11-06: updates the Sponsor article's minimum prices where it is still unedited.)


## 2026-11-06: Sponsor price is the same all season (migration 0175)
Only applied where the article is still unedited (`updated_by = 'seed'`). If you edited it in Admin > Help Center, paste this.

### sponsor-your-installer-company
Existing article (updated by migration 0184). Category: post. Type: howto. Order: 32.

Title:

    Sponsor your installer company

One-sentence answer:

    Installers can show their company in the labeled Sponsor banner, as a card at the top of the list, or both. Pick a plan on the Sponsor page and pay on Stripe.

Search words:

    sponsor installer banner top of the list card company advertise paid plan price season renew upgrade both stripe labeled

Text:

    Installers can put their company in front of people planning a drive: in a labeled **Sponsor** banner at the top of the list on the map, as a company card at the top of the list, or both. It is optional and paid; your free installer profile stays free. The [Pricing page](/pricing) shows what each plan costs.
    
    ## What you can buy
    **Banner**
    - Your company name, linked to your website (or to your email if you have no website), in the labeled "Sponsor" banner at the top of the list on the map
    - Your phone number in that banner, tap to call
    - Shown whenever your areas served are in the map view (everywhere if you list none)
    - Always labeled "Sponsor", so nobody is misled
    - How many times you were shown and tapped, in your dashboard
    
    **Top of the list**
    - Your company card at the top of the list, right behind the Featured events, labeled "Sponsor", for installers whose areas are in the map view
    - Your company name, a short description, and buttons to call, visit your website (or email) and open your profile, on that card
    - How many times the card was shown and tapped, in your dashboard
    - Always labeled "Sponsor", so nobody is misled
    - Not in the banner strip: for the banner as well, choose Banner and top of the list
    
    **Banner and top of the list**
    - Your company name, linked to your website (or to your email if you have no website), in the labeled "Sponsor" banner at the top of the list on the map
    - Your phone number in that banner, tap to call
    - Shown whenever your areas served are in the map view (everywhere if you list none)
    - Your company card at the top of the list, right behind the Featured events, labeled "Sponsor"
    - Your company name, a short description, and buttons to call, visit your website (or email) and open your profile, on that card
    - Always labeled "Sponsor", so nobody is misled
    - How many times the banner and the card were shown and tapped, in your dashboard
    
    ## How to buy
    1. Open the [Pricing page](/pricing) and tap **Choose** on a plan, or go to [socallights.app/sponsor](/sponsor).
    2. Sign in. If you do not have an installer profile yet, tap **Create your free profile first**; if you are already on the map, find your company and tap **Claim this profile**.
    3. Choose your company. It needs a phone number or a website (the page tells you what is missing and links to your profile). Areas served are recommended.
    4. Choose a plan and check the dates and price.
    5. Tap **Continue to payment** and pay on Stripe's secure page. Your placement turns on within a few minutes.
    
    ## How long it lasts and what it costs
    A placement runs from the moment you pay to the last day of the season on the map (the Christmas lights season runs from Nov 3 to Jan 6, and the next season runs from Jan 7 to Jan 31). The price is the same whenever you start, so check the end date before you pay: the page shows the exact start date, end date, number of days and price. We do not refund or credit for timing.
    
    ## Renew or upgrade
    - **Renew:** buy the same plan again while it runs. The new season starts the day after the current one ends, at the plan's price. Time is only added, and we sell at most one season ahead.
    - **Upgrade:** Banner and Top of the list are different products, and Banner and top of the list is both. If you hold one of them to the end of the season and want both, choose Banner and top of the list: you pay the difference between that plan and the one you hold (the page shows it), and what you hold stays as it is. Buying the other single product instead is a full, separate purchase, so the page tells you when both together cost less.
    - Your dashboard (Overview) shows your dates and numbers, with a **Renew or upgrade** button.
    
    ## Refunds
    If we cannot put your placement on, you get a full refund. A refund switches the placement off, and so does a payment dispute, so please email info@socallights.app before disputing a charge.
    
    Paying never affects a contest, and the map stays free. See [Is SoCal Lights free?](/help/is-it-free).
    
    ## Automatic renewal
    Automatic renewal is optional and off unless you turn it on. It renews the same plan you bought. See [Automatic renewal for installer Sponsor placements](/help/automatic-renewal-for-installers).
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
A season runs from the day you pay to the last day of the season on the map (the Christmas lights season runs from Nov 3 to Jan 6, and the next season runs from Jan 7 to Jan 31). The price is the same whenever you start, so check the end date before you pay: the page shows the exact start date, end date, number of days and price. We do not refund or credit for timing.

## Renew or upgrade
- **Renew:** buy the same plan again while it runs. The new season starts the day after the current one ends, at the plan's price. Time is only added, and we sell at most one season ahead.
- **Upgrade:** to add the top of the list to a banner that already runs to the end of the season, choose Banner and top of the list. You pay the difference between the two plans' prices (the page shows it).
- Your dashboard (Overview) shows your dates and numbers, with a **Renew or upgrade** button.

## Refunds
If we cannot put your placement on, you get a full refund. A refund switches the placement off, and so does a payment dispute, so please email info@socallights.app before disputing a charge.

Paying never affects a contest, and the map stays free. See [Is SoCal Lights free?](/help/is-it-free).

### is-it-free (one sentence changed)
In the Sponsor bullet, replace the sentence about the price falling with: "The price is the same whenever you start in a season."


## 2026-11-07: automatic renewal (migration 0177)
The new article is inserted only if missing. If you edited `sponsor-your-installer-company` in Admin > Help Center, add this at the end:

## Automatic renewal
Automatic renewal is optional and off unless you turn it on. See [Automatic renewal for installer Sponsor placements](/help/automatic-renewal-for-installers).

### automatic-renewal-for-installers (new)
Summary: Optional and off by default: we charge your saved card on the last day of your Sponsor placement, email you 7 days before, and you can cancel any time with the link in any email.

Automatic renewal is optional and for installers only. It is **off** unless you turn it on.

## What it does
- On the last day of your Sponsor placement we charge the card you saved with Stripe, at the plan's price shown on the [Pricing page](/pricing) at that time, and the next season starts the next day.
- We email you 7 days before each charge, with the amount, the date and a link to cancel.
- You get an email when it is turned on and after each charge, and Stripe sends its own receipt.
- We never see your card number. Stripe keeps the card; we keep only Stripe's ids.

## Turn it on
- On the [Sponsor page](/sponsor), tick **Renew automatically each season** before you pay (it is never ticked for you), or
- In your installer dashboard, under **Sponsor placement**, tick the box and tap **Turn on automatic renewal**. A Stripe page saves your card; nothing is charged that day. You need a running placement.

## Cancel any time
- Use the **Cancel automatic renewal** link in any renewal email. You do not need to sign in.
- Or tap **Turn off automatic renewal** in your dashboard.
- Cancelling before the charge means nothing is charged, and the placement you already paid for keeps running. We also ask Stripe to remove the saved card.

## If a charge fails
We email you a link to pay once or use a different card. We try once more 3 days later. If that fails too, automatic renewal stops and nothing more is charged automatically. You can turn it on again any time.

## Refunds
A refund or a payment dispute of an automatic charge switches that placement off and pauses automatic renewal. Please email info@socallights.app before disputing a charge.

We sell at most one season ahead. Paying never affects a contest, and the map stays free.
