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

## Contest passes (2026-11-07)
Migration `0188_help_contest_passes.sql` adds one article and two small edits, only where nobody edited the article in Admin. For an article you edited, paste by hand.

### New article: contest-passes
Category: run. Type: answer. Order: 15.

Title:

    Contest passes: your first contest is free

One-sentence answer:

    Your organization's first contest in every 12-month window is free. To run more in the same window, choose a pass. Entering and voting stay free, and payment never affects a result.

Search words:

    contest pass free first contest 12 month window cost price pay more contests upgrade founding partner organization limit count paywall refund

Text:

    **Your organization's first contest in every 12-month window is free.** To run more contests inside the same window, you buy a **contest pass**. The [Pricing page](/pricing) shows what each pass costs.
    
    ## What a pass is
    A pass sets the total number of contests your organization may run in the window, the free first one included: Up to 5, Up to 10 or Up to 20. For more than 20 contests, write to info@socallights.app. A pass only counts contests. Every contest still has resident entries, voting by the public, judges or both, People's Choice and Judges' Choice awards, its own page, link, QR code and poster, and an organizer dashboard. Entering and voting stay free for everyone, and payment never affects any result, vote, judge or ranking.
    
    ## Who "your organization" is
    - If your sign-in email matches the website you give for the contest (for example, an address at your city's own website), the organization is that website. Everyone at that organization shares one window.
    - Otherwise the organization is you, with your own account.
    - Co-organizers and staff do not create separate organizations.
    
    ## The 12-month window
    - It starts the day your organization's first contest goes live and ends the day before the same date a year later.
    - A contest counts when it goes live. A draft, a contest held for our review, a declined contest and a contest that was never live do not count. A contest that was live and later unpublished still counts.
    - When the window ends, your next contest starts a new window and is free again.
    
    ## When you choose a pass
    1. Start a contest as usual: tap **Add**, then **A contest**, and fill in the screens. Nothing is lost if you have to leave.
    2. If the contest would be more than your window allows, the Review screen shows the passes instead of creating it. You see how many contests you have used and the exact dates of your window.
    3. Tap **Choose** on a pass and pay on Stripe's secure page. Your details are kept in your browser, and your contest is created by itself when you come back.
    You can also choose a pass ahead of time on the [contest pass page](/contest-pass). To upgrade inside your window, choose a bigger pass and pay only the difference.
    
    ## Founding partners
    We sometimes give an organization free contests for a period. Then the page says "Founding partner: free through" a date, and no price is shown.
    
    ## Refunds
    If we cannot apply your pass, you get a full refund. Write to info@socallights.app for help. See the [Terms](/terms#passes) for the details.
    
    See also [Is SoCal Lights free?](/help/is-it-free) and [Create a contest with Quick start](/help/create-a-contest-quick-start).

### Add at the end of create-a-contest-quick-start and create-a-contest-customize

    ## Your first contest is free
    Your organization's first contest in every 12-month window is free. To run more contests in the same window, the Review screen shows the contest passes when you need one, and your contest is created as soon as you pay. See [Contest passes](/help/contest-passes).

### In is-it-free, replace the sentence "Entering a contest is free and votes are never sold." with

    Entering a contest is free and votes are never sold. Your organization's first contest in every 12-month window is free too; to run more in the same window you buy a contest pass (see [Contest passes](/help/contest-passes)).

## Add sponsors to your contest (2026-11-07)
Migration `0190_help_contest_sponsors.sql` adds this article (new, nothing to paste unless it did not appear: then Admin > Help Center > New article).

Category: run. Type: howto. Order: 35.

Title:

    Add sponsors to your contest

One-sentence answer:

    Record a sponsor who paid you, or send them a private invite link. Approve them for the contest page after you receive the payment. The money goes to you, not to SoCal Lights.

Search words:

    sponsor sponsors invite link payment link levels queue approve decline logo receipt invoice paid payment organizer donate in kind show contest page permission private

Text:

    A sponsor can support your contest with money or goods. **The sponsorship money goes to you, the organizer, not to SoCal Lights.** You collect it, receipt it and report it. SoCal Lights does not process, hold or guarantee it. Sponsors do not influence results, and payment never affects who wins.
    
    ## Add a sponsor
    1. Open your dashboard and tap **Sponsors**.
    2. Fill in the company name, the contact name and, if you like, the website, phone, email, amount and logo (JPG, PNG or WebP under 600 KB). Pick a level.
    3. Under **How the sponsorship counts**, choose one:
       - **Paid to me (the organizer):** tick **Payment collected by me**, enter the date you received it and how it was paid (cash, check, bank transfer, card on your own system, invoice paid, or your own words). You can upload the receipt or paid invoice (PDF, JPG or PNG under 5 MB).
       - **Donated in kind:** say what was donated, for example yard signs or printing.
    4. Tick that you have the sponsor's **permission** to list their name and logo and to keep their contact details here.
    5. Tick **Show on the contest page** and tap **Save sponsor**.
    
    ## Let sponsors send you a request
    Once your contest is live and we have approved it, your Sponsors tab has two more cards.
    1. **How sponsors pay you.** Add your own payment link (an https:// link such as Venmo, PayPal, Stripe or your city's portal) and/or plain words, for example "Checks payable to City of Covina, mail to ...". You can also add up to three levels, each with a name and a dollar amount, such as Presenting, Gold and Supporter. They are only shown to sponsors: the site never charges anyone.
    2. **Invite a sponsor.** Tap **Create invite link**. You get a private link that you can copy or send by email. A sponsor opens it (no account), reads that the money goes to you, sees your payment link, and fills in a short form. Tap **Turn link off** to stop it, or **Make a new link** to replace it (the old one stops working).
    
    When a sponsor sends the form we email you, and the request waits under **Waiting for your review**. For each one you can:
    - **Mark payment received:** enter the date, how it was paid and, if you like, upload the receipt.
    - **Approve for the contest page:** only after the payment is received (or marked donated in kind). Nothing shows before you approve.
    - **Decline:** add a short note if you like. We email the sponsor politely.
    - **Remove:** delete the request.
    
    SoCal Lights has not verified your payment link, and tells sponsors to pay only organizers they know. If your contest is still waiting for our review, these two cards say so and unlock when we approve it.
    
    ## What people see
    The contest page shows the logo, name and link, labeled "Sponsor", and says that sponsors do not influence results and that sponsorship payments go to the organizer. A sponsor shows only when you confirmed the payment (or the in-kind gift), ticked the permission and chose to show it. Until then it is saved but not shown.
    
    ## Privacy
    The contact details, the amount and the receipt are visible only to you, your co-organizers and SoCal Lights staff. The receipt is stored privately and is never shown on a page or in a list. They are deleted 24 months after the contest's voting ends, or when you remove the sponsor or delete your account. SoCal Lights staff can hide a sponsor from a contest page.
    
    ## Running the contest again
    When you run a contest again, sponsors are copied as unconfirmed drafts. Confirm each payment (or gift) and permission again before they show.
    
    See [Run it again](/help/edit-your-contest-and-change-dates) and [Contest passes](/help/contest-passes).


# Help Center audit, 2026-11-08: paste-ready text

Migration `0199_help_audit_2026-11-08.sql` applies this text to every article nobody edited in Admin. For an article you edited in Admin: Admin > Help Center > click the article > replace Title, One-sentence answer, Search words and Text with the blocks below > Save.

## is-it-free

Title:

    Is SoCal Lights free?

One-sentence answer:

    Yes. Finding lights, routes, voting and entering a home are free, and votes are never sold. Featured, Sponsor and contest passes are optional paid extras.

Search words:

    free, cost, price, pricing, pay, paid, charge, contest pass, featured, sponsor, tip, donate, support

Text:

    Using SoCal Lights is free. The map, search, routes and voting stay free for everyone. Entering a contest is free and votes are never sold. Listing an event or a home is free too (you sign in with your email first, see [Why do I need to sign in?](/help/why-sign-in)).
    
    Your organization's first contest in every 12-month window is free as well. To run more contests in the same window you buy a contest pass: Up to 5, Up to 10 or Up to 20 contests in total, counting the free one. See [Contest passes](/help/contest-passes).
    
    ## Optional paid extras
    
    Paid extras are optional and always labeled, and none of them can change a contest result. The [Pricing](/pricing) page shows every price.
    
    - **Contest passes** are for organizers who run more than one contest in 12 months.
    - **Featured** is for events and, after a contest, winning homes. An event organizer can add a Featured pin (a gold-ringed pin on the map and a "Featured" badge), a banner (your event as a pill labeled "Featured" in the strip at the top of the map list) and top of the list (your event is listed first when people browse your area). Every paid plan includes the pin; the banner and top of the list are optional extras, and each part costs the same. It runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first. A home can be featured only by the owner of a home that finished winner, 2nd or 3rd place in a contest, after the winners are announced: the Featured pin or Top of the list, for 30 days. Homes are a separate line from event plans.
    - **Sponsor** is for installers. A free installer profile stays free. An installer can pay for the Banner, for Top of the list (the company card, without the banner) or for both together, always labeled "Sponsor". A placement runs from the moment you pay to the last day of the season, and the price is the same whenever you start.
    
    Paying never affects a contest. It cannot change who wins, who is ahead or any contest result.
    
    See [Feature an event or a home](/help/feature-an-event-or-home), [Sponsor your installer company](/help/sponsor-your-installer-company) and the [Pricing](/pricing) page.
    
    If you would like to help keep it free, tap the three dots at the top of the map and choose **Support SoCal Lights**. There you can see pricing or leave a tip.

## why-sign-in

Title:

    Why do I need to sign in?

One-sentence answer:

    To keep contests fair (one vote per person) and so what you add stays yours to edit. Browsing the map and reading Help needs no account.

Search words:

    sign in, login, account, why, email, google, password, vote, add event, add home

Text:

    You do not need an account to browse the map, plan a night, sign up for the weekly lights email, report a problem or read this Help Center.
    
    You sign in when you want to do something that belongs to you:
    
    - vote in a contest, enter a home, judge, or run a contest
    - add an event or show off a home
    - save a draft, claim a listing, or buy a Featured, Sponsor or contest pass placement
    
    An account is tied to one verified email address. That keeps contests to one vote per person, lets organizers reach their entrants, and lets you come back later to edit or remove what you posted.
    
    There is no password. Tap the person icon at the top of the page, then choose **Continue with Google**, or type your email and use the 6-digit code we send you. Both prove the same email, so both open the same account. If something goes wrong, see [I cannot sign in](/help/i-cannot-sign-in).
    
    See our [privacy page](/privacy) for how your information is handled. You can delete your account any time: [How do I delete my account?](/help/delete-my-account)

## is-my-address-public

Title:

    Is my home address public?

One-sentence answer:

    If you enter a home in a contest or show off your home's lights, the pin goes on that address and visitors can see it. Your email is never shown.

Search words:

    address, public, privacy, home, pin, remove my home, email, visible, safe, photos

Text:

    When you enter a contest or show off a home, the pin and the street address go on the map, and visitors see them so they can drive by. Your photos are public too. Only add an address you want people to visit.
    
    Your email address is not shown to the public. If you enter a contest, that contest's organizers can see your name, email, street address and photos so they can run it. The name and address you may save in your profile are only used to fill in forms for you and are never shown.
    
    Some homes are listed by us or by a contest organizer, for example from a city or school holiday tour page. If a home that is yours was listed and you want it gone, you do not need an account:
    
    1. Open the home on the map.
    2. Tap **Not your listing? Remove my home**.
    3. Tell us the address and an email where we can reach you.
    
    We usually answer within two business days and delete the listing and its photos once approved. You can also use the [Remove my home](/remove-home) form directly.
    
    To take down a home you entered yourself, [withdraw your entry](/help/edit-or-withdraw-your-entry) or ask us. To delete everything, see [How do I delete my account?](/help/delete-my-account)

## delete-my-account

Title:

    How do I delete my account?

One-sentence answer:

    Tap your account circle, then Your profile, then the Account tab and Delete my account. Tap it a second time to confirm.

Search words:

    delete account, remove account, close account, erase my data, privacy, unsubscribe, cancel account

Text:

    1. Tap your account circle at the top of the page (your picture or the first letter of your email).
    2. Tap **Your profile**.
    3. Open the **Account** tab and scroll to **Delete my account**.
    4. Tap **Delete my account**, then tap it again when it asks **Tap again to permanently delete**. This cannot be undone.
    
    We delete your account, sign-ins, saved drafts, profile picture, contest entries (with their photos) and votes, and we close any contests you run. We remove your email, name and phone from judge invitations, co-organizer lists, event claims, your weekly email signup and contact details on reports, and from our copy of quote requests you sent. We also end the monthly update and remove the saved card for automatic renewal if you had one.
    
    A few things stay on purpose:
    
    - Order records for paid placements, with your account link removed (we keep them for accounting and refunds). If a paid placement was still running, we flag it so it can be refunded. Email us if you want to check on it.
    - The record that your address unsubscribed, as a one-way scrambled code and not the address itself, so we never email you again.
    - A contest whose results were already announced keeps its results, with your home removed from them.
    
    If a home of yours was listed by someone else, use **Remove my home** on the listing (see [Is my home address public?](/help/is-my-address-public)). You can also email info@socallights.app from the address you signed in with. See our [privacy page](/privacy) for the full list, or [ask us](#ask) if you need help.

## report-a-problem

Title:

    How do I report a wrong or unsafe listing?

One-sentence answer:

    Open the event or home and tap Something wrong? Tell us. A home that is not yours can be removed with Remove my home. We read every report.

Search words:

    report, wrong, unsafe, incorrect, problem, listing, correction, remove my home, closed, wrong date, wrong address

Text:

    Open the event or home on the map and tap **Something wrong? Tell us** (under the details). A short form opens:
    
    1. Say what is wrong in a few words, for example the date has changed, the pin is on the wrong street, or it is closed.
    2. Add your email only if you want an answer. It is optional.
    3. Tap **Send**.
    
    We read every report. If you send many in a short time you may be asked to try again in an hour.
    
    If a home on the map is yours and you want it removed, tap **Not your listing? Remove my home** on that home. You do not need an account. See [Is my home address public?](/help/is-my-address-public).
    
    For anything else, [ask us](#ask) or write to info@socallights.app.

## i-did-not-get-the-email

Title:

    I did not get the email

One-sentence answer:

    Check Spam or Junk, wait a few minutes, check the address you typed, and look for a message from SoCal Lights.

Search words:

    email, code, not received, missing, spam, junk, confirmation, weekly email, sign in code, did not arrive

Text:

    Emails from us come from SoCal Lights at login@socallights.app. If one has not arrived:
    
    - Wait two or three minutes, then check your Spam or Junk folder, and Promotions in Gmail.
    - Check the address you typed. A single wrong letter sends it elsewhere.
    - Search your mailbox for socallights.
    - Try again. For a sign-in code, go back and tap **Email me a code** again; use the newest code, because each one works for 10 minutes. You can ask for up to four codes an hour. If you see "Too many codes requested", wait an hour or use **Continue with Google**.
    - For the weekly email, we send one confirmation link first and nothing else until you tap it. Open that message and tap the link, or sign up again.
    - If you use a work or school address, it may block new senders. Try a personal address.
    
    Still nothing? [Ask us](#ask) and tell us which email you were waiting for. If you cannot sign in at all, see [I cannot sign in](/help/i-cannot-sign-in).

## i-cannot-sign-in

Title:

    I cannot sign in

One-sentence answer:

    Sign in with Google, or with the 6-digit code we email you. Both reach the same account if the email is the same.

Search words:

    sign in, login, cannot log in, code, google, expired, password, account, wrong code, trouble

Text:

    You do not need a password. Tap the person icon at the top of the page, then you can:
    
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
    
    If your account was suspended, the message says so. Email info@socallights.app if you think that is a mistake. Still stuck? [Ask us](#ask).

## enter-your-home-in-a-contest

Title:

    Enter your home in a contest

One-sentence answer:

    Tap Enter my home, add photos, your address and a name, then agree to the rules and submit.

Search words:

    enter contest, enter my home, submit entry, contest entry, photos, address, rules, sign in, review

Text:

    Find the contest ([how](/help/find-contests)) and tap **Enter my home**. You will find it under **Live now** on the Contests page and at the top of the contest page. If entries have closed, the button says Entries are closed.
    
    The entry is a short set of steps. You can leave at any time and come back later: your answers are saved as a draft in [your profile](/help/your-profile), except the photos, which you add again.
    
    1. If you are not signed in, tap **Sign in**. Use Google or an emailed 6-digit code. That is how you come back later to check on your entry.
    2. Add photos of your home. Tap **Choose photos**. You can add up to 8, and the first one is the cover.
    3. Type your street address and ZIP code. The city is already set to the contest's city. If your home is in a different city, tap **My home is in a different city**.
    4. Choose the name to show, for example, The Kim family. A line about your lights is optional.
    5. Check the summary, tick the box to agree to the official rules, then tap **Submit my entry**.
    
    ## What happens next
    
    Most organizers review every entry first, so your home will say it is waiting until they approve it. Some contests publish entries right away. The last screen tells you which one yours is, and you also get an email when the organizer approves or declines it.
    
    The address you enter is where the pin goes, and visitors see it so they can drive by. You can enter up to 5 homes in one contest.
    
    If something goes wrong, see [My photo will not upload](/help/my-photo-will-not-upload) and [My entry is not on the map](/help/my-entry-is-not-on-the-map).

## edit-or-withdraw-your-entry

Title:

    Edit or withdraw your entry

One-sentence answer:

    Open the contest from Mine, then Edit name and description, or Withdraw to take your home out.

Search words:

    edit entry, change entry, withdraw, remove my home from contest, change photos, change address

Text:

    1. Open Contests, then **Mine**. If you are signed in you can also tap your account circle at the top of the map and choose **Your contests**.
    2. Under **Homes you entered**, tap **Open contest**.
    3. Find **Your home** near the top of the contest page.
    4. To change the name or the line about your lights, tap **Edit name and description**, change it, and tap **Save**.
    5. To take your home out, tap **Withdraw**. It asks you to tap again, so you cannot do it by accident.
    
    You can edit or withdraw while your entry is waiting for the organizer and after it is approved.
    
    You cannot change the photos or the address on an existing entry. To change them, withdraw the entry and enter again while entries are open ([how](/help/enter-your-home-in-a-contest)).
    
    Withdrawing removes your photos and any votes for that home. You cannot undo it, but you can enter again.
    
    Once the organizer announces the winners, the results are locked and Your home no longer shows Edit or Withdraw.

## your-profile

Title:

    Your profile: drafts, contests, badges and your account

One-sentence answer:

    Tap your account circle at the top of the map and choose Your profile. Each section lists what you have, with buttons on every row.

Search words:

    profile, drafts, my contests, displays, events, badges, crown, account, change photo, change name, sign out, delete account

Text:

    Tap your account circle at the top of the map (it shows your photo, or the first letter of your name or email) and choose **Your profile**. On other pages the same circle is at the top right. If you are not signed in, it asks you to sign in first.
    
    Sections are in the menu on the left, or along the bottom on a phone. Each one is a list of rows, and each row has buttons for what you can do with it.
    
    - **Drafts** lists anything you started and saved, including a contest entry. Tap **Continue** to finish it on any device, or **Delete**.
    - **Contests** has two lists. **Contests you run** shows each contest you run or help run, with **Manage** and **View page**. **Homes you entered** shows your homes in other people's contests, whether each is in the contest, waiting for the organizer or not accepted, and **Open contest**.
    - **Displays** lists the homes you showed off on the map. You can edit one, take it down for the season, put it back, or delete it.
    - **Events** lists the events you added.
    - **Badges** shows the awards your home has won. Winners keep a crown. It appears once you have one, and you can choose where your badges show on your listings.
    - **Account** is where you change your name and address, turn the monthly update email on or off, sign out, or delete your account. Your name and address are optional, only fill in forms for you, and are never shown publicly.
    
    To change your photo, tap **Add a photo** or **Change photo** under your name at the top of the profile. Use a JPG, PNG or WebP.
    
    To remove a home or an entry, see [Edit or withdraw your entry](/help/edit-or-withdraw-your-entry) and [Unpublish and publish again](/help/unpublish-and-publish-again). To delete your account, see [How do I delete my account?](/help/delete-my-account).

## my-photo-will-not-upload

Title:

    My photo will not upload

One-sentence answer:

    Try fewer or smaller photos, use JPG, PNG or WebP, and check your connection.

Search words:

    photo upload, image will not upload, too large, 8 photos, jpg, png, webp, screenshot, heic

Text:

    You can add up to 8 photos. Photos are shrunk on your phone before they upload, so they are quick, but an unusual file or a weak signal can still fail.
    
    - If you see **That's the limit of 8 photos**, remove one with the x on its thumbnail and add the new one.
    - If you see **One photo couldn't be read**, use a normal photo (JPG, PNG or WebP). Screenshots and unusual formats may not work.
    - Try one photo first.
    - Move to Wi-Fi or a stronger signal and try again.
    - If your phone offers it, pick the photo from your gallery instead of taking a new one.
    
    Once you have submitted an entry you cannot swap its photos. Withdraw the entry and enter again ([how](/help/edit-or-withdraw-your-entry)).
    
    Sponsor logos are separate: they must be JPG, PNG or WebP under 600 KB.
    
    Still stuck? [Ask us](#ask).

## my-entry-is-not-on-the-map

Title:

    My entry is not on the map

One-sentence answer:

    In most contests the organizer reviews every entry first. Check Mine to see its status, and ask the organizer if it has been a while.

Search words:

    entry not on map, waiting, approval, declined, not accepted, organizer review, missing entry

Text:

    Most organizers review every entry before it goes on the map, so it is normal for a new entry to wait. Some contests publish entries right away. When the organizer approves your entry you get an email.
    
    1. Open Contests, then **Mine**. Under **Homes you entered**, your entry is listed with its status.
    2. If it says **Waiting for the organizer**, they have not reviewed it yet. Ask the organizer, or share the contest link with them.
    3. If it says **Not accepted**, the organizer declined it. The email we sent you may include their reason, and you can enter again with new photos or details while entries are open.
    4. Check you are signed in with the same email you entered with.
    5. If the whole contest says it is waiting for approval, it is not showing to the public yet and entries will appear once it is approved.
    
    While your entry is waiting you can still change its name and description. To change the photos or address, withdraw it and enter again: see [Edit or withdraw your entry](/help/edit-or-withdraw-your-entry).

## judge-a-contest

Title:

    Judge a contest

One-sentence answer:

    Open your invitation email, tap Open my judges' ballot, and pick a favorite home in each category (or score every home 1 to 10, if the organizer chose scoring).

Search words:

    judge, judges ballot, score, pick favorite, I know this household, recuse, invitation

Text:

    Open your invitation email and tap **Open my judges' ballot**. Sign in with the email address the invitation was sent to.
    
    Your ballot says when voting closes and how many picks or scores you have done. The invitation tells you which way this contest judges:
    
    - **Pick a favorite** (most contests): in each category, tap **Pick** on your favorite home. To change your mind, tap **Move my pick** on another home.
    - **Score every home**: give every home a score from 1 to 10 in each category.
    
    1. Tap **Visit the homes** to see the homes in routes of nine stops or fewer. Each route starts where the last one ended, and you tick off homes as you go.
    2. Tap a category. Every home is in every category.
    3. Know a household? Tap **I know this household**. Your vote for that home will not count. Your own home, if you entered one, is left out for you.
    4. Pick or score the other homes.
    5. Tap **Ballot** to see your progress.
    
    Judge on first impression, creativity, theme, craftsmanship and variety of lights. Your picks or scores stay private until winners are announced, and you can change them until voting closes.

## i-cannot-vote

Title:

    I cannot vote

One-sentence answer:

    You must be signed in, voting must be open, and you cannot vote for your own home. You get one vote per category.

Search words:

    cannot vote, vote button disabled, voting closed, sign in to vote, own home, judge, paused

Text:

    Check these in order:
    
    1. **Sign in.** Voting needs an account, which keeps it to one vote per person. Use Google or an emailed code. Throwaway email addresses cannot be used, so use your regular email.
    2. **Is voting open?** The contest page shows the voting dates. The buttons say Voting not open before it starts and Voting is over after the winners are announced. The organizer can also pause voting for a while.
    3. **Your own home.** You cannot vote for a home you entered. It shows Your home.
    4. **Are you a judge?** Judges do not use the public vote. Open the judges' ballot from your invitation email instead ([how](/help/judge-a-contest)).
    5. **One favorite per category.** After you pick one in a category, tap **Move my vote here** on another home to change it.
    6. Some contests are judges only. Then the public does not vote.
    
    See [Vote in a contest](/help/vote-in-a-contest).

## i-am-a-judge-and-cannot-open-the-ballot

Title:

    I am a judge and cannot open my ballot

One-sentence answer:

    Open the invitation email and tap Open my judges' ballot. If it asks you to sign in, use the email the invitation came to.

Search words:

    judge cannot open ballot, invitation, this email isn't a judge, sign in, spam

Text:

    1. Find the email that says you are invited to judge. If you cannot find it, search for judge and socallights, and check Spam.
    2. Tap **Open my judges' ballot** in that email.
    3. If it asks you to sign in, use the email address the invitation was sent to (Google or an emailed code).
    4. If it says **This email isn't a judge here**, you signed in with a different email. Sign out and sign in again with the invited address. Once you are signed in as the right judge, the contest page also shows an **Open the judges' ballot** link.
    5. Still no luck? Ask the contest organizer to check the judge email on their Judges tab. They can add the address you use.
    
    See [Judge a contest](/help/judge-a-contest).

## who-can-vote

Title:

    Who can vote in a contest?

One-sentence answer:

    The organizer chooses: everyone with an account, judges only, or both. Each voter picks one favorite home in each category.

Search words:

    who can vote, public vote, judges only, peoples choice, judges choice, account

Text:

    The organizer decides when creating the contest:
    
    - **Everyone:** anyone with an account (People's Choice).
    - **Judges only:** only invited judges (Judges' Choice).
    - **Everyone and judges:** two awards in each category, counted separately. Judges vote on their own private ballot and do not take part in the public vote.
    
    Every home is in every category, and each public voter picks one favorite home in each. You cannot vote for your own home. Judges either pick a favorite per category or score every home from 1 to 10, as the organizer chooses.

## how-winners-are-chosen

Title:

    How are winners chosen?

One-sentence answer:

    Most votes wins in each category. Judges decide their own award by picks or scores. Ties share the win, and results are final once announced.

Search words:

    winners, how winners are chosen, tie, judges choice, peoples choice, scores, picks, announce

Text:

    - **People's Choice:** the home with the most votes in a category wins.
    - **Judges' Choice:** if judges pick a favorite, the home with the most judge picks in a category wins. If judges score, each home's scores are averaged and the highest average wins. With five or more judges, the highest and lowest score for a home are dropped first.
    - **Ties** share the win. When both the public and judges vote, a tie in the public vote is settled by the judges if that breaks it.
    - A flagged home stays on the ballot but cannot win. If the organizer chose one win per home, a home that wins one category cannot win another.
    
    Vote counts are hidden until the organizer announces winners, unless the organizer chooses to show them.
    
    When the organizer announces, the results are saved and cannot be changed. Everyone with an approved home in the contest, and the judges, are emailed the results.

## can-i-change-my-vote

Title:

    Can I change my vote?

One-sentence answer:

    Yes, until voting closes. Tap Move my vote here on another home.

Search words:

    change vote, move vote, undo vote, change pick, change score

Text:

    Yes. Until voting closes you can change your vote in any category. Open the category and tap **Move my vote here** on the home you now prefer. The home you voted for shows Your vote.
    
    Judges can change too, until voting closes. If you pick a favorite, tap **Move my pick** on another home. If you score, choose a new score.

## find-lights-near-me

Title:

    Find lights near me

One-sentence answer:

    Tap the location button so distances work, pick a season, search a city, and narrow the list with Filters. Tap Route these to drive what you see.

Search words:

    near me nearby distance season city search filters map locate location button thanksgiving christmas halloween sort nearest route these

Text:

    1. Open socallights.app. To see what is close to you, tap **Use my location** when the message appears, or tap the **location button** on the map (top right, under the zoom buttons). Then tap **Allow** in your browser. Distances and "nearest first" depend on it. Nothing happens until you tap.
    2. Tap the season button at the top and pick a season, such as **Thanksgiving and Christmas Lights**.
    3. Or search: type a city name (or an event) in the search box and tap it in the list.
    4. To narrow the list, tap **Filters**. You can pick a date, a city and distance, a county, free or ticketed, a type, and more. Tap the button at the bottom to see the places.
    5. Use **Sort** above the list to put the nearest, soonest or free places first.
    
    The list shows the places in the part of the map you are looking at, so move or zoom the map to change it. It is sorted nearest first once the site knows where you are.
    
    Location not working? See [The map does not show my location](/help/location-does-not-work).
    
    ## Driving to what you see
    Tap **Route these**, the pill on the map. See [Drive a route](/help/drive-a-route).

## plan-a-night

Title:

    Plan a night of lights

One-sentence answer:

    Tap the heart on places you like, open Favorites, then tap Route these to open the drive in your maps app.

Search words:

    plan night route hearts favorites favourites share calendar my night directions maps stops start route these

Text:

    1. On the map, choose a season, then tap the **heart** on each place you want to visit.
    2. Open the **Favorites** tab (the heart). Your stops are listed in a sensible driving order, with the miles and the time for the whole drive and the distance from one stop to the next.
    3. Choose where to **Start**: **My location**, **First stop**, or a city. Check the maps app shown next to it, and tap it if you want Google Maps, Apple Maps or Waze.
    4. Tap **Route these**. A long night is split into routes of nine stops or fewer, and each route starts where the last one ended.
    5. Tick each stop when you have been there. Tap a route's button to open it in your maps app.
    6. Tap the **Share** icon to send your favorites to a friend. They open your list on their phone and can add it to their own favorites.
    
    Your favorites are saved on this phone or computer only, so they are not there if you open the site on another device.
    
    See [Drive a route](/help/drive-a-route) for how the routes work.

## drive-a-route

Title:

    Drive a route: Route these, Favorites and Visit the homes

One-sentence answer:

    A long list is split into routes of 9 stops or fewer. Each route starts where the last one ended, and you can tick off stops as you go.

Search words:

    route routes nine 9 stops route these favorites visit the homes tick off maps google apple waze send to car tesla split long list 20 homes

Text:

    Your maps app takes about nine stops at a time, so a long list is split into routes of nine stops or fewer. For example, 20 homes become three routes of 7, 7 and 6.
    
    - **Each route starts where the last one ended.** You do not have to plan the break.
    - **Tick off stops as you go.** Tap the box next to a stop when you have been there, so you can pick up later. Ticks stay on this device.
    - **Choose your maps app:** Google Maps, Apple Maps or Waze. On a phone, the first time you tap a route button the site asks which one to use and remembers your answer. To change it later, tap the arrows icon next to "Opens in".
    - **Tap a route's button** (for example **Open in Google Maps**) to start it.
    - **Waze** takes one stop at a time. **Start in Waze** takes you to stop 1; then tap the directions arrow on the next stop.
    - **Send to car:** on a phone, tap the car icon on a stop to share it to your Tesla or car app.
    - **Apple Maps:** routes with several stops need iPhone software 18.4 or later. On older iPhones the route opens with the first stop only.
    
    ## Where you find it
    - **On the map:** tap the **Route these** pill. It routes the places you can see on the map. If there are more than 45 in view, zoom in first. (It shows on the Places tab.)
    - **In Favorites:** tap **Route these**. It routes your hearted places in order, from the Start you chose.
    - **On a contest page**, for voters and judges: **Visit the homes**.
    
    When you are done, tap the X to close.

## find-contests

Title:

    Find a contest to vote in or enter

One-sentence answer:

    Open Contests from the three dots (or your account circle if you are signed in). Live now, Mine and Past results are the three tabs.

Search words:

    find contest vote enter live now mine past results menu contests three dots account circle cards map

Text:

    1. Start on the map at socallights.app.
    2. Open Contests:
       - Not signed in: tap the **three dots** at the top right, then **Contests**.
       - Signed in: tap your **account circle** at the top right, then **Your contests**, and tap the **Live now** tab.
    3. **Live now** lists contests that are running and have not announced winners yet. Each one shows whether entries and voting are open. Tap **Vote** (or **See the contest**), or tap **Enter my home** while entries are open.
    4. **Mine** shows contests you run and homes you entered.
    5. **Past results** shows finished contests and their winners.
    
    Contests also show on the map as cards with the link **Enter your home or vote**. To see only contests on the map, tap **Filters**, then **Contests** under Type.
    
    Can't find one? See [I cannot find a contest](/help/contest-not-listed).

## contest-not-listed

Title:

    I cannot find a contest

One-sentence answer:

    Live now lists contests that are running and have not announced winners. Check Past results, or ask the organizer for the contest link.

Search words:

    contest not listed missing cannot find live now past results link qr code not showing approval

Text:

    - Start on the map at socallights.app. Not signed in: tap the three dots at the top right, then **Contests**. Signed in: tap your account circle, then **Your contests**, and open the **Live now** tab.
    - **Live now** lists contests that are running and have not announced their winners yet. Each shows whether entries and voting are open, or when voting opens.
    - Once winners are announced, the contest moves to **Past results**.
    - A contest that has just been created may not be live yet. It can wait for the site owner to approve it first, so ask the organizer if theirs should be running.
    - Ask the organizer for the contest link or QR code. It opens the contest directly.
    - Contests also show on the map as cards. Pick the right season and city, or tap **Filters**, then **Contests** under Type.

## find-professionally-installed-displays

Title:

    Find professionally installed displays

One-sentence answer:

    Open Filters, choose Professionally installed under Type, and open an installer's profile.

Search words:

    professionally installed installer company filter type profile quote phone website homes

Text:

    1. Choose a season (for example **Thanksgiving and Christmas Lights**).
    2. Tap **Filters**. Under **Type**, tap **Professionally installed**.
    3. Tap the button at the bottom (**Show** and the number of places) to see them.
    4. Open one. A home says **Installed by** with the company's name. A check mark means the installer confirmed it.
    5. Tap the company's name to open its profile, with its service area, phone, website, a way to request a quote, and the homes it has installed.

## location-does-not-work

Title:

    The map does not show my location

One-sentence answer:

    Your browser needs permission to share your location. Tap the location button on the map, allow it for socallights.app, or search for a city instead.

Search words:

    location blocked not working gps near me locate button permission allow iphone android safari chrome instagram facebook in-app browser distances nearest

Text:

    Distances and "nearest first" need your location. If they are missing:
    
    - Tap the **location button** on the map (top right, under the zoom buttons) and tap **Allow** when your browser asks. Give it up to 20 seconds. If it is still looking, tap it again.
    - If you tapped **Block** or **No thanks** before, the site cannot ask again. Allow it in your browser:
      - **iPhone:** open Settings, Privacy & Security, Location Services. Turn it on, then tap Safari Websites (or your browser) and choose **While Using the App**. Reload the page.
      - **Android:** tap the lock icon in the address bar, then Permissions, Location, **Allow**. Also check that Location is on in your phone's quick settings. Then tap the location button again.
      - **Computer:** open your browser's site settings for socallights.app and set Location to **Allow**, then reload.
    - Opened the site from Instagram, Facebook, TikTok or another app's built-in browser? Those block location. Open socallights.app in Safari or Chrome instead.
    
    You can always skip location: search for a city, or pick a season, and the map works the same way.

## no-add-to-home-screen

Title:

    I do not see Add to Home Screen

One-sentence answer:

    On iPhone use Safari. On Android use Chrome. Browsers built into other apps do not offer it.

Search words:

    add to home screen missing install app iphone android safari chrome instagram facebook in-app browser share button

Text:

    - **Open the site in a real browser.** If you came from a link in Instagram, Facebook, TikTok, email or another app, the page opens in that app's own browser, which has no install option. Open **socallights.app** in Safari or Chrome instead.
    - **iPhone:** use **Safari**. It is the most reliable. Tap the **Share** button, scroll down, then tap **Add to Home Screen**.
    - **Android:** use **Chrome**. Tap the three dots, then **Install app** or **Add to Home screen**.
    - If it is already on your Home Screen, the option is hidden.
    
    See [Put SoCal Lights on your phone](/help/install-the-app).

## confirmed-or-expected

Title:

    What do Confirmed and Expected mean on an event?

One-sentence answer:

    Confirmed means the event's own page shows its name and this year's dates. Expected means the dates have not been checked yet.

Search words:

    confirmed expected dates verified check organizer filter confirmed dates only tag

Text:

    - **Dates confirmed:** the event's own web page shows its name and this year's dates.
    - **Expected from past years · check site:** the event is on the map, but its dates have not been checked yet. Many events repeat every year, so the dates are our best expectation. Check the organizer's page before you travel.
    
    To see only checked events, tap **Filters** and turn on **Confirmed dates only**.
    
    See something wrong? Open the event and tap **Something wrong? Tell us**.

## create-a-contest-quick-start

Title:

    Create a contest with Quick start

One-sentence answer:

    Tap Add, then A contest. Seven short screens, and your contest has its own link and QR code.

Search words:

    create contest, start a contest, quick start, add contest, run a contest, new contest, qr code, link, organizer

Text:

    Start at socallights.app. If you are signed in, tap your account circle at the top right, then **Add an event, home or contest**. If you are not signed in, tap the three dots at the top right, then **Add**. You can also go straight to socallights.app/add.
    
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
    
    Your organization's first contest in every 12-month window is free. To run more contests in the same window, the Review screen shows the contest passes when you need one, and your contest is created as soon as you pay. See [Contest passes](/help/contest-passes).

## create-a-contest-customize

Title:

    Create a contest with Customize

One-sentence answer:

    Choose Customize everything to add judges, a prize, your own categories and your own rules.

Search words:

    customize contest, judges, prize, categories, rules, who can vote, one win per home, vote counts, create contest

Text:

    Follow the same first screens as [Quick start](/help/create-a-contest-quick-start), then on the setup screen choose **Customize everything**.
    
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
    
    Your organization's first contest in every 12-month window is free. To run more contests in the same window, the Review screen shows the contest passes when you need one, and your contest is created as soon as you pay. See [Contest passes](/help/contest-passes).

## approve-and-decline-entries

Title:

    Approve and decline entries

One-sentence answer:

    On the Entries tab, tap Approve to put a home on the map, or Decline with an optional reason. You can also add homes yourself.

Search words:

    approve entry, decline entry, undo decline, entries tab, waiting for you, added by organizer, remove home, organizer

Text:

    Open your dashboard ([how](/help/share-your-contest)) and tap **Entries**. When you review each entry first (the recommended setting), nothing goes on the map until you approve it.
    
    1. Tap **Approve** to put a home in the contest and on the map.
    2. Tap **Decline** if an entry does not fit. A window asks why. The reason is optional, and it is emailed to the entrant. Tap **Decline entry**.
    3. Changed your mind? Tap **Undo decline** to put it back.
    
    If you chose to publish entries right away, new entries appear on the map by themselves. You can still decline one afterwards. You can switch this setting under Details ([how](/help/edit-your-contest-and-change-dates)).
    
    ## Homes you add yourself
    
    At the top of Entries is **Add homes yourself**. Use it when residents sign up somewhere else, such as a city form or a spreadsheet. See [Add your city's homes](/help/add-your-citys-homes-yourself).
    
    Homes you add carry an **Added by organizer** tag. They are approved already, so there is nothing to approve. To take one out, tap **Remove** on its row. It asks you to tap again, so you cannot do it by accident. Remove is there until the home gets its first vote or the winners are announced.

## add-your-citys-homes-yourself

Title:

    Add your city's homes yourself

One-sentence answer:

    On the Entries tab, paste one address per line under Add homes yourself, tap Check addresses, then Add homes.

Search words:

    add homes, paste addresses, spreadsheet, city form, entries tab, organizer added, bulk add, check addresses

Text:

    Already taking sign-ups somewhere else, such as a city form, a spreadsheet or email? You can put those homes in the contest yourself. The resident does not need a photo or an account.
    
    1. Open your dashboard ([how](/help/share-your-contest)) and tap **Entries**.
    2. Open **Add homes yourself**.
    3. Paste one home per line, like this: Street address, City, ZIP | Name. The city, ZIP and name are optional. Without a city, the contest's city is used. A column pasted from a spreadsheet works too.
    4. Tap **Check addresses**. Every line is marked Found, or tells you what is wrong, such as Already in this contest.
    5. Tick **These residents agreed to have their address shown on the public map**. Only tick it if they did.
    6. Tap **Add homes**. The button shows how many it will add.
    
    Each home goes straight onto the ballot and the driving routes. Its entry carries an **Added by organizer** tag. To take one out, tap **Remove** on its row, then tap again to confirm.
    
    ## Good to know
    
    - You can paste up to 100 homes at a time, and add up to 500 homes this way to one contest.
    - While your new contest is waiting for our quick review, you can add up to 25 homes. The limit lifts when we approve it.
    - Homes can be added once your contest is live and until voting starts. After that the card says so, because it would change the ballot under the voters.
    - Checking and adding are limited to about 1,000 homes an hour. If you hit the limit, wait a little and try again.
    
    See also [Approve and decline entries](/help/approve-and-decline-entries).

## edit-your-contest-and-change-dates

Title:

    Edit your contest and change the dates

One-sentence answer:

    On the Overview, tap Change dates, edit what you need on the Details tab, and tap Save changes. The same tab can start next year's contest.

Search words:

    edit contest, change dates, entries close, voting dates, rules, prize, welcome message, run it again, next year, copy contest, details tab

Text:

    Open your dashboard ([how](/help/share-your-contest)). On the Overview, find **Schedule** and tap **Change dates**. It opens the **Details** tab, where **Edit contest details** is ready. You can also tap Details yourself.
    
    1. Change the date that entries close, and the voting dates. You can also change the name, who runs it, the welcome message, how entries are approved, the prize, the official rules, and a presenting installer.
    2. Tap **Save changes**.
    
    Entrants see changes right away, and the rest of the team is emailed about changes, so nobody is surprised.
    
    Good to know:
    
    - The voting categories are locked after the first vote, because votes belong to a category.
    - Once you announce the winners, the details are locked.
    - Only the person who created the contest can change its details. Co-organizers can approve entries, review votes and manage judges and sponsors.
    
    If it will not save, see [My dashboard changes did not save](/help/dashboard-changes-did-not-save).
    
    ## Run it again
    
    At the bottom of the Details tab, **Run it again** starts a new contest with the same rules, categories, prizes and judges, and every date a year later. Tap **Run this contest again next year**, then tap again to confirm. Sponsors are copied as drafts: confirm each payment (or gift) and permission again before they show. You can edit the new contest before it opens. It counts toward your organization's 12-month window, so a second contest in the same window may need a [contest pass](/help/contest-passes).

## unpublish-and-publish-again

Title:

    Unpublish a contest and publish it again

One-sentence answer:

    On the Controls card, tap Unpublish to hide your contest. Tap Publish again to bring it back.

Search words:

    unpublish contest, hide contest, take off map, publish again, republish, pause contest, remove contest from map

Text:

    Open your dashboard ([how](/help/share-your-contest)). On the **Controls** card, find **Contest page**.
    
    1. Tap **Unpublish**. The button asks you to tap again, so you cannot do it by accident. Tap it once more.
    2. The contest is hidden from the public and the map, and new entries and votes are paused.
    
    Nothing is deleted. Your entries and votes stay, and your team can still open the dashboard. Your co-organizers are told.
    
    To bring it back, tap **Publish again** in the same place, or **Publish it again** in the notice at the top of the Overview.
    
    Only the person who created the contest can unpublish it, and only that person can publish it again. If the site owner took your contest off the map, Publish again will not work. Contact us.
    
    See also [Run voting](/help/run-voting).

## add-co-organizers-and-judges

Title:

    Add co-organizers and judges

One-sentence answer:

    Team is for co-organizers, Judges is for judges. Type an email and add them. They get an invitation by email.

Search words:

    co-organizer, add judge, team tab, judges tab, invite judge, invite co-organizer, staff, help run contest

Text:

    Open your dashboard ([how](/help/share-your-contest)) and tap **Team**.
    
    - **Co-organizers** help you run the contest. Type their email and tap **Add co-organizer**. They get an email with one button to open the dashboard, and they sign in with that email. You can add up to 8, and only you, the person who created the contest, can add or remove them. They can approve entries, review votes, and manage judges and sponsors. Changing the contest's details, pausing voting, unpublishing and announcing winners stay with you.
    - **Judges** are added on the **Judges** tab. It shows when your contest has judges, so choose "Judges only" or "Everyone and judges" when you create it. Type a judge's email and tap **Add judge**. Your judge gets an invitation with a button that opens their ballot. The tab also shows who has finished and has a button to remind judges who have not.

## announce-winners

Title:

    Announce winners

One-sentence answer:

    On Results, tap Close voting and announce winners, then tap again to confirm. It cannot be undone.

Search words:

    announce winners, close voting, results, download results, crown, winners email, end contest, final results

Text:

    Open your dashboard and tap **Results**. It shows who would win if you announced today.
    
    1. Tap **Download results (spreadsheet)** to save the tally.
    2. When voting is over, tap **Close voting and announce winners**. It asks you to tap again, because this cannot be undone.
    3. If voting has not started, nobody has voted, or some judges have not finished, the button warns you with **Announce anyway?**. Tap again only if you are sure.
    4. Everyone who entered is emailed the results, and winners get a congratulations with their prize. Your judges and you are emailed too. The winners keep a crown on the contest page.
    5. To see what everyone sees, tap **See it as voters do** in the menu.
    
    Only the person who created the contest can announce winners. Tied homes share the win.

## dashboard-changes-did-not-save

Title:

    My dashboard changes did not save

One-sentence answer:

    Read the red message above Save changes. Usual causes: dates out of order, a name, welcome message or rules that are too short, or categories locked after voting started.

Search words:

    changes did not save, cannot save, save changes, error, dates, rules too short, categories locked, dashboard, details

Text:

    When a change cannot be saved, a red message appears just above the **Save changes** button and tells you what to fix. Common causes:
    
    - **Dates.** Entries should close before voting starts, and voting must end after it starts. The voting end date also cannot be in the past.
    - **Something is too short or empty.** The contest name needs at least 4 letters, the welcome message at least 20 characters, and the official rules a few sentences.
    - **Categories.** They are locked once the first vote is in, because votes belong to a category. Put them back as they were and save the rest.
    - **Installer quote email.** If you fill in a presenting installer, add the email where quote requests should go.
    - **You are a co-organizer.** Only the person who created the contest can change its details. See [Add co-organizers and judges](/help/add-co-organizers-and-judges).
    - **Winners are announced.** After that the details are locked.
    
    Fix what the message says, then tap **Save changes** again. If it still fails, [ask us](#ask) and tell us the message you see.

## add-sponsors-and-logos

Title:

    Add sponsors and logos to your contest

One-sentence answer:

    On the Sponsors tab, add a company, its level, website and logo, confirm how it supported you and tick permission and Show. It then appears on your contest page, labelled Sponsor.

Search words:

    sponsor sponsors logo logos tier level gold silver presenting prize sponsor invite link contest page payment permission in kind

Text:

    Sponsors are the businesses that support your contest. They show on your contest page, always labelled "Sponsor". You add them on the Sponsors tab.
    
    1. Open your dashboard (how) and tap Sponsors.
    2. Under Add or edit a sponsor, type the company name and choose a Level: Presenting sponsor, Gold, Silver or Prize sponsor.
    3. Add their website and choose their logo (JPG, PNG or WebP, under 600 KB). The contact name, phone, email and amount are optional. Only you and SoCal Lights staff see them.
    4. Under How the sponsorship counts, choose Paid to me or Donated in kind. For Paid to me, tick that you collected the payment yourself and add the date and how it was paid. For Donated in kind, say what was given.
    5. Tick that you have the sponsor's permission, and tick Show on the contest page.
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
    Under How sponsors pay you, you can add your own payment link or instructions and up to three sponsor levels with amounts. Sponsors pay you directly. SoCal Lights never charges them, and payment never affects who wins.

## presenting-installer-and-quote-requests

Title:

    Add a presenting installer and quote requests

One-sentence answer:

    Add a lighting company on Details. While your contest is live, its page gets a Get a quote button that sends requests to the company and to you.

Search words:

    presenting installer quote request get a quote lighting company advertisement leads contest

Text:

    A presenting installer is a lighting company you partner with. Your contest page shows a labelled advertisement with a Get a quote button for neighbors.
    
    1. Open your dashboard and tap Details. Scroll to Presenting installer.
    2. Type the company's name, the email where quote requests should go, and their website.
    3. Tap Save changes. This adds a Get a quote button to your contest page while the contest is live.
    
    ## What a neighbor sees
    They open the contest page and tap Get a quote. They sign in if they have not yet, add their name and what they would like done, and tick the box to share their details. Then they tap Send request.
    
    Their details go only to that company and to you, the organizer, and only if they tick the box. SoCal Lights also keeps a copy. The form says so before they send it.
    
    ## Where you see requests
    Open your dashboard and tap Promote. Quote requests are listed under Activity, and you also get an email for each one.

## installer-profiles

Title:

    Installer profiles and "Installed by"

One-sentence answer:

    A home can name the company that installed it. A check mark means the company confirmed it. Companies claim their free profile and confirm homes on their dashboard.

Search words:

    installer profile installed by claim company confirm check mark not ours request a quote free profile

Text:

    On a home, Installed by shows the company's name. A check mark means the company confirmed it. Tap the name to open the company's profile, with its phone, website, areas served, a Request a quote button and every home it has on the map.
    
    ## If this is your company
    - No profile yet? Create your free profile (Add, then A lighting display, then A professional installer).
    - Already on the map? Open your company's profile and tap Is this your company? Claim this profile at the bottom. Sign in first.
    - If your email is at your company's website, it is yours right away. If not, a person checks and emails you.
    - Manage the profile from your installer page. Homes that name your company are listed on the Homes tab. Tap Confirm for each home you installed. It gets a check mark, and you and the homeowner can then both edit its listing. Tap Not ours for one you did not install.

## add-an-event

Title:

    Add an event to the map

One-sentence answer:

    Tap Add, then An event. Name it, pick the dates, add the place, and tap Add my event.

Search words:

    add event submit event tree lighting parade haunted house market confirmed expected featured sign in

Text:

    1. Start on the map at socallights.app. If you are signed out, tap the three dots at the top right and tap Add. If you are signed in, tap your account button (the person icon) and choose Add an event, home or contest. Then tap An event.
    2. Sign in with Google or an emailed code if asked. Your event is saved to your account.
    3. If your event has a web page, paste it. If not, tap No... Next. With a page that mentions the event's name and date, it shows as Confirmed. Without one, it still goes on the map, marked Expected until the dates are checked.
    4. Type the event's name, and choose a season and type. Next.
    5. Pick the first and last day. Next.
    6. Free or paid? Next.
    7. Type the place, the city and the street address. Next.
    8. Describe it in a sentence or two. Next.
    9. Check everything and tap Add my event.
    
    ## Want it to stand out?
    On the last step you can choose a paid Featured plan, or No thanks, just list it. If you pick a plan, you go straight to Stripe's secure page after tapping Add my event. See [Feature an event or a home](/help/feature-an-event-or-home). Listing your event is always free.

## show-off-your-house

Title:

    Show off your home on the map

One-sentence answer:

    Tap Add, then A lighting display. Photos, address and a description put your home's lights on the map for families to drive by.

Search words:

    show off house home display lights add my home showcase photos address homeowner installer drive by draft

Text:

    1. Start on the map at socallights.app. If you are signed out, tap the three dots at the top right and tap Add. If you are signed in, tap your account button (the person icon) and choose Add an event, home or contest. Then tap A lighting display.
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
    
    If you are a professional installer, you give a website or phone number for quotes and tick that you have the homeowner's permission to show the address.
    
    ## Is your home already on the map?
    Some homes are on the map already, with a photo from the street. If yours is one of them, tap Is this your home? Claim it on its card instead. The form opens with your address filled in. See [Is this your home? Claim it](/help/claim-your-home).

## claim-your-home

Title:

    Is this your home? Claim it

One-sentence answer:

    Open your home's card on the map and tap Is this your home? Claim it. The form starts with your address filled in.

Search words:

    claim home is this your home automatic listing street photo replace remove my home

Text:

    Some homes are on the map already, found by us with a photo from the street. If one of them is yours, you can add your own photos and details.
    
    1. Find your home on the map and tap it to open its card.
    2. Tap Is this your home? Claim it.
    3. Sign in if asked. The form opens with your address filled in, and the first step says You are claiming your home's name.
    4. Fill in the steps the same way as in [Show off your home on the map](/help/show-off-your-house), and tap Put it on the map.
    
    Your listing usually goes live right away and replaces the automatic one at the same address. If we hold it for a quick check, it replaces the automatic one once the site owner approves it.
    
    The claim link shows only on homes we found ourselves. A home you posted, or one entered in a contest, does not have it.
    
    ## Would you rather it was not on the map?
    At the bottom of the card, tap Not your listing? Remove my home. Tell us the address and your email. A person on our team looks at it, usually within two business days, and emails you when the home is removed.

## feature-an-event-or-home

Title:

    Feature an event or a home

One-sentence answer:

    Featured is optional and paid. Open the Feature page, choose your event or winning home, pick a plan and pay on Stripe.

Search words:

    feature featured pin banner top of the list gold pin pay stripe plan event home claim event refund badge

Text:

    A Featured listing has a gold badge and a bigger gold-ringed pin on the map. It is optional. The Pricing page shows what each plan costs.
    
    An event
    - Open the Feature page at socallights.app/feature, or tap Choose on a plan on the Pricing page.
    - Pick a plan (below).
    - Sign in, then choose your event. If it is not on the map yet, add it for free first. If it is yours but you did not add it, open Claim an existing listing, search for it and tap This is my event: claim it.
    - Check the dates and the total, then tap Pay on Stripe and pay on Stripe's secure page, with a card or Cash App Pay.
    
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
    - It starts the moment you pay and ends on your event's last day or the last day of the season it was bought in (Christmas lights: Jan 6), whichever comes first. The price is the same whenever you buy, and the Feature page shows the exact dates and the total before you pay.
    - Already have the pin? To add the banner or top of the list, pick the plan you want: you pay only for the parts you add. A plan that would add nothing is not sold, and the page says so.
    - Buying again never shortens what you already have.
    
    A home
    Only the owner of a home that finished winner, 2nd or 3rd place in an announced contest can feature it. Paying never changes a contest result. Homes have two plans, each for 30 days from the day you pay: the Featured pin (a gold-ringed pin and a "Featured" badge) and Top of the list (the same, and your home is listed first when people browse your area).
    
    Good to know
    - You pay once per event or home. There is no subscription.
    - Featured listings are always labeled, and they still have to be real and accurate.
    - If we cannot list or feature your event, you get a full refund of every part. Once it is live, payments are non-refundable, but if your event is cancelled, email us and we will move your placement to another of your events or refund the unused time. A refund or a payment dispute switches the placement off.
    - The map, search, routes and voting stay free. See [Is SoCal Lights free?](/help/is-it-free).
    - Featured is bought on the website, not in the app.

## Drive a route: title (2026-11-08, migration 0200)
Title: Drive a route: Route these and Visit the homes (was "...Route these, Open route and Visit the homes"). Paste into Admin > Help if you edited this article.


# Help Center re-audit, 2026-11-08 (second pass): paste-ready text

Migration `0201_help_audit_gaps_2026-11-08.sql` adds five articles and corrects eight. For an article you edited in Admin: Admin > Help Center > click the article > replace the fields with the blocks below (copy without the four leading spaces) > Save. A new article that did not appear: Admin > Help Center > New article.

## New: add-a-home-without-a-contest

Category: post. Type: howto. Order: 22.

Title:

    Add your home without entering a contest

One-sentence answer:

    You do not need a contest. Tap Add, then A lighting display, fill in the steps and your home goes on the map for free.

Search words:

    add home without contest not in a contest no contest list my home put my lights on map showcase homeowner installer free which button

Text:

    You can put your home's lights on the map without entering any contest. It is free, and there is no voting, no judges and no organizer to wait for.
    
    ## Which button do I tap?
    The Add page has three choices:
    - **An event** is for a tree lighting, parade, market or other seasonal event.
    - **A contest** is for organizers who want to run a neighborhood contest. It is not how you enter one.
    - **A lighting display** is for your home's lights. This is the one you want.
    
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
    
    More detail on each step is in [Show off your home on the map](/help/show-off-your-house).

## New: sponsor-a-contest-with-an-invite-link

Category: sponsors. Type: howto. Order: 40.

Title:

    Sponsor a contest with an invite link

One-sentence answer:

    Open the organizer's private link, pay the organizer directly, then send the short form. Nothing shows on the contest page until the organizer approves it.

Search words:

    sponsor a contest sponsor invite link s page business sponsor company logo pay organizer how to pay send to the organizer link not active sponsor form

Text:

    A contest organizer may send you a private sponsor link. It starts with socallights.app/s/ and then a string of letters and numbers. This page explains what you will see. You do not need an account.
    
    **Your sponsorship goes to the organizer, not to SoCal Lights.** SoCal Lights does not process, hold or guarantee sponsorship payments, and sponsors do not influence who wins.
    
    ## The steps
    1. Open the link. The page says **Sponsor** and the contest's name, who runs it, and the dates for entries and voting.
    2. If the organizer gave payment details, **How to pay** shows their payment link and any instructions they wrote. Pay the organizer directly. SoCal Lights has not checked that link, so only pay organizers you know, and confirm the details with them first.
    3. Under **Tell the organizer about your sponsorship**, choose a **Sponsor level** if the organizer set some (or **Other**, and say what you have in mind in your message).
    4. Type your name, your company name and your email. The website, phone, message and logo are optional. A logo can be a PNG, JPG or WebP image under 1 MB.
    5. Tick that you have permission to share your company's name and logo on the contest page, and that you understand your payment goes to the organizer. Both boxes are needed.
    6. Complete the "I am human" check if it shows, then tap **Send to the organizer**.
    7. You see a thank-you message and get a short confirmation email.
    
    ## What happens next
    The organizer confirms they received your payment and then approves your listing. Only after that do your company name and logo appear on the contest page, labeled "Sponsor". The organizer can also decline a request, and you are emailed if they do. To change something after you have sent the form, ask the organizer.
    
    ## If the page says "This sponsor link isn't active"
    The organizer switched the link off or replaced it with a new one. Ask them for the new link. Until you have confirmed the details with them, do not send any payment.
    
    ## Are you the organizer?
    See [Add sponsors to your contest](/help/add-sponsors-to-your-contest) for how to create the link, record payments and approve sponsors.

## New: ask-socal-lights-ai-assistant

Category: find. Type: answer. Order: 70.

Title:

    Ask SoCal Lights: the AI assistant

One-sentence answer:

    A chat button on the map and the Pricing page answers questions about the site, contests and events. It is an automated assistant, not a person, and it can be wrong.

Search words:

    ask socal lights ai assistant chat chatbot bot help button question assistant not a person robot sparkle

Text:

    **Ask SoCal Lights** is an automated AI assistant. It answers questions about finding events and homes, how contests work, how to add something and what things cost. It is not a person, and it can be wrong.
    
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
    - It cannot look up your account or anyone's personal details, and it does not do anything for you on the site.
    - It will not suggest that paying can help you win. It cannot: payment never affects a contest result.
    
    Prices come only from the [Pricing](/pricing) page, so check it before you pay.
    
    ## Your privacy
    Please do not type personal information such as names, addresses, phone numbers, email addresses or card numbers. Your chat stays in your browser tab only and is erased when you close the tab or tap **Start over**. We do not save what you type or what it answers. See the [privacy page](/privacy#ai-assistant) for the details.
    
    Not sure the answer is right? Use the Help Center search, or [ask us](#ask).

## New: monthly-update-email

Category: account. Type: howto. Order: 55.

Title:

    The optional monthly update email

One-sentence answer:

    It is separate from your account and your listings, and off unless you turn it on. Change or stop it in Your profile, on the Account tab, or from the link in the email.

Search words:

    monthly update newsletter email seasonal recommendations opt in turn on turn off unsubscribe topics installer host family preferences profile account

Text:

    The monthly update is an optional email with seasonal recommendations. Having an account, a listing or a contest never signs you up. It stays off until you turn it on yourself.
    
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
    This is different from the [weekly lights email](/help/weekly-lights-email) and from the service emails you get for sign-in codes and decisions about your listings. To see which emails you can stop, read [Stop emails from SoCal Lights](/help/stop-emails-from-socal-lights).

## New: stop-emails-from-socal-lights

Category: account. Type: howto. Order: 56.

Title:

    Stop emails from SoCal Lights

One-sentence answer:

    Every reminder, update and weekly email has an unsubscribe link that works without signing in. Sign-in codes and decisions about your listings are service emails and cannot be turned off.

Search words:

    unsubscribe stop emails opt out too many emails reminders updates results weekly email monthly update service emails do not contact one tap list-unsubscribe

Text:

    Which email is it? The way to stop it depends on the kind.
    
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
    
    Not getting emails you want? See [I did not get the email](/help/i-did-not-get-the-email). Anything else, [ask us](#ask).

## Corrections to existing articles (only if you edited them in Admin)

- `find-professionally-installed-displays`: change the title to "Find professionally installed homes". (Owner word rule: home, not display, in a title.)
- `find-lights-near-me`: replace "(top right, under the zoom buttons)" with "(top right, under the zoom buttons; its label is Find my location)". (Name the button the way the browser labels it.)
- `location-does-not-work`: replace "(top right, under the zoom buttons)" with "(top right, under the zoom buttons; its label is Find my location)". (Same as above.)
- `my-photo-will-not-upload`: replace "Sponsor logos are separate: they must be JPG, PNG or WebP under 600 KB." with "Sponsor logos are separate. The organizer adds them on the Sponsors tab as JPG, PNG or WebP under 600 KB, and a sponsor who uses an invite link can send one under 1 MB.". (The sponsor invite form takes 1 MB, the organizer form 600 KB.)
- `your-profile`: replace "turn the monthly update email on or off" with "turn the [monthly update email](/help/monthly-update-email) on or off". (Link the new article.)
- `show-off-your-house`: add at the end: "## No contest needed You do not have to enter a contest to put your home on the map. See [Add your home without entering a contest](/help/add-a-home-without-a-contest)." (People mix up Add, A contest and entering a contest.)
- `weekly-lights-email`: add at the end: "## Not the same as the monthly update The weekly lights email is for anyone and needs no account. The monthly update is a separate, optional email for installers, hosts and families. See [The optional monthly update email](/help/monthly-update-email) and [Stop emails from SoCal Lights](/help/stop-emails-from-socal-lights)." (Two different emails; link the new articles.)
- `add-sponsors-to-your-contest`: add at the end: "A sponsor who gets your invite link sees a page that explains the same thing: [Sponsor a contest with an invite link](/help/sponsor-a-contest-with-an-invite-link)." (Link the sponsor-side article.)

## Contest pricing: organizers pay from the first contest (2026-11-09)
Migration `0213_help_contest_pricing.sql` rewrites the contest-passes article and replaces the sentences that said the first contest is free, only where nobody edited the article in Admin. For an article you edited, paste by hand. Do this only when the new pricing goes live.

### contest-passes (replace title, one-sentence answer, search words and text)

Title:

    Contest passes: what running a contest costs

One-sentence answer:

    Organizers choose a contest pass before a contest goes live: a single contest, up to 5 or up to 20 in a 12-month window. Entering and voting stay free, and payment never affects a result.

Search words:

    contest pass cost price pay single contest up to 5 up to 20 12 month window upgrade founding partner organization limit count paywall refund how much does a contest cost

Text:

    **Running a contest needs a contest pass.** The organizer chooses a pass before the contest goes live. Residents enter and vote for free. The [Pricing page](/pricing) shows what each pass costs.
    
    ## What a pass is
    A pass sets the total number of contests your organization may run in a 12-month window: a single contest, up to 5 contests or up to 20 contests. For more than 20 contests, write to info@socallights.app. A pass only counts contests. Every contest still has resident entries, voting by the public, judges or both, People's Choice and Judges' Choice awards, its own page, link, QR code and poster, and an organizer dashboard. Entering and voting stay free for everyone, and payment never affects any result, vote, judge or ranking.
    
    ## Who "your organization" is
    - If your sign-in email matches the website you give for the contest (for example, an address at your city's own website), the organization is that website. Everyone at that organization shares one window.
    - Otherwise the organization is you, with your own account.
    - Co-organizers and staff do not create separate organizations.
    
    ## The 12-month window
    - It starts the day you buy your pass, or the day your organization's first contest goes live if that comes first. It ends the day before the same date a year later.
    - A contest counts when it goes live. A draft, a contest held for our review, a declined contest and a contest that was never live do not count. A contest that was live and later unpublished still counts.
    - When the window ends, your next contest needs a new pass.
    - Contests that were already live or announced before contest passes began are not affected: they are not counted and they do not need a pass.
    
    ## When you choose a pass
    1. Start a contest as usual: tap **Add**, then **A contest**, and fill in the screens. Nothing is lost if you have to leave.
    2. On the Review screen, if your organization has no pass with room for the contest, you see the passes instead of the contest being created.
    3. Tap **Choose** on a pass and pay on Stripe's secure page. Your details are kept in your browser, and your contest is created by itself when you come back.
    You can also choose a pass ahead of time on the [contest pass page](/contest-pass). To upgrade inside your window, choose a bigger pass and pay only the difference.
    
    ## Founding partners
    We sometimes give an organization contests for a period. Then the page says "Founding partner: free through" a date, and no price is shown.
    
    ## Refunds
    If we cannot apply your pass, you get a full refund. Write to info@socallights.app for help. See the [Terms](/terms#passes) for the details.
    
    See also [Is SoCal Lights free?](/help/is-it-free) and [Create a contest with Quick start](/help/create-a-contest-quick-start).

### Replace a paragraph or sentence

- `create-a-contest-quick-start and create-a-contest-customize`: replace

    ## Your first contest is free
    Your organization's first contest in every 12-month window is free. To run more contests in the same window, the Review screen shows the contest passes when you need one, and your contest is created as soon as you pay. See [Contest passes](/help/contest-passes).

  with

    ## Choosing a contest pass
    Running a contest needs a contest pass. The Review screen shows the passes when your organization needs one, and your contest is created as soon as you pay. Residents enter and vote for free. See [Contest passes](/help/contest-passes).

- `is-it-free`: replace

    Your organization's first contest in every 12-month window is free as well. To run more contests in the same window you buy a contest pass: Up to 5, Up to 10 or Up to 20 contests in total, counting the free one. See [Contest passes](/help/contest-passes).

  with

    Organizers who run a contest buy a contest pass: a single contest, up to 5 or up to 20 in a 12-month window. Residents still enter and vote for free. See [Contest passes](/help/contest-passes).

- `is-it-free`: replace

    - **Contest passes** are for organizers who run more than one contest in 12 months.

  with

    - **Contest passes** are how organizers pay for running a contest.

- `is-it-free`: replace

    Using SoCal Lights is free. The map, search, routes and voting stay free for everyone.

  with

    Using SoCal Lights is free for residents and visitors. The map, search, routes and voting stay free for everyone.

- `edit-your-contest-and-change-dates`: replace

    so a second contest in the same window may need a [contest pass](/help/contest-passes).

  with

    so your [contest pass](/help/contest-passes) needs room for it, and a new pass is needed once the window has ended.

## New articles for the 2026-11-10 organizer and homeowner features (migration 0222)

### Fix a home you added to your contest  (slug `edit-a-home-you-added`, category run, video `run-edit-home`)
Summary: On the Entries tab, tap Edit on a home you added, fix the name, description or address, then tap Save.

Typed a family name wrong, or pasted the wrong street number? You can fix any home you added yourself.

1. Open your dashboard ([how](/help/share-your-contest)) and tap **Entries**.
2. Find the home. Homes you added carry an **Added by organizer** tag and an **Edit** button.
3. Tap **Edit**.
4. Fix the name, the description, or the address.
5. Tap **Save**.

The change shows everywhere at once: the ballot, the judges' ballot, the driving routes, and the map.

## Good to know

- Changing the address moves the pin, so we look the new address up again. It cannot be the same as another home already in your contest.
- After the winners are announced, the address is locked. The name and the description can still be fixed.
- The **Edit** button is only on homes you added. A home a resident entered themselves is edited by that resident: see [Edit or withdraw your entry](/help/edit-or-withdraw-your-entry).
- Co-organizers can edit these homes too.
- Added a home by mistake? Tap **Remove** on its row, as described in [Add your city's homes yourself](/help/add-your-citys-homes-yourself).

See also [Add photos to homes you added](/help/add-photos-to-homes-you-added).

### Add photos to homes you added, and send the owner a link  (slug `add-photos-to-homes-you-added`, category run, video `run-home-photos`)
Summary: On the Entries tab, tap Photos on a home to add photos, and tap Copy link or Email link to send the homeowner a private link.

Homes you add yourself start with no photo, and the residents do not need an account. (Residents who enter their own home tap **Enter** on the contest page and add their own photos.) You can add photos yourself, and you can send the homeowner a private link so they can add their own.

## Add photos yourself

1. Open your dashboard ([how](/help/share-your-contest)) and tap **Entries**.
2. On the home, tap **Photos**.
3. Tap **Add photos** and choose up to eight pictures from your phone or computer. They are made smaller on your device before they upload.
4. To take a photo off, tap the cross on it.

Photos you add show at once on the contest page, the ballot and the map. As the organizer you can remove any photo of the home, including the homeowner's.

## Send the homeowner a link

Each home you added has a private link, just for that home. On the home's row, tap **Copy link** to copy it, or **Email link** to open an email with the link and a short message already written. The same link is in the Photos box.

The homeowner opens it, signs in, and links the home to their account: see [Your city added your home](/help/your-city-added-your-home) for what they see. Once they have linked it, the entry shows their email, like any other entrant's.

## If the wrong person got the link

- **Make a new link** makes the old link stop working. Use it when the link went to the wrong person and nobody has linked the home yet.
- **Unlink this homeowner** removes the person who linked the home, and gives you a new link to send to someone else.

## Good to know

- Photos can be added and removed until voting closes. After that they are locked.
- A home can have up to eight photos. Photos the homeowner hides still count.
- The homeowner can hide the photos you added, but cannot delete them.

See also [Fix a home you added to your contest](/help/edit-a-home-you-added).

### Your city added your home: add photos and details  (slug `your-city-added-your-home`, category enter, video `enter-city-home`)
Summary: Open the private link from your city, tap Yes, this is my home, then check the details and add your own photos.

If a city or neighborhood group put your home in a contest, they can send you a private link. It lets you link the home to your account, check its details, and add your own photos. You do not need to enter again.

1. Open the link from your email. It opens a private page for your home.
2. If the page asks, sign in with your email, or with Google.
3. Tap **Yes, this is my home: link it to my account**.
4. Check the details: the name, a description, when the lights are on, a tip for visitors, how to see it, parking, and the radio station. Tap **Save changes**.
5. Under **Photos**, tap **Add your own photos** and choose pictures from your phone or computer.

The home is now on your profile, under Contests and under Displays.

## What you can and cannot do

- You can change the details, add your own photos, and delete your own photos.
- You can hide the photos the organizer added. You cannot delete them.
- You cannot change the home's address (ask the organizer), delete the home from the contest, or change the contest.

## Good to know

- We use your email to send you contest updates and results, and the organizer can see it.
- The first account to link the home keeps it. If the page says the home is linked to another account, ask the organizer to unlink it and send you a new link.
- The link is private. Do not post it, because whoever links first gets the home.
- A link that says it is not active was replaced. Ask the organizer for a new one.
- You can change your home until voting ends.

See also [Edit or withdraw your entry](/help/edit-or-withdraw-your-entry).

### Appended to `add-your-citys-homes-yourself`
## After you add the homes

- Fix a mistake with **Edit** on the home's row: [Fix a home you added](/help/edit-a-home-you-added).
- Add photos, and send the homeowner a private link with **Copy link** or **Email link**: [Add photos to homes you added](/help/add-photos-to-homes-you-added).

### Appended to `edit-or-withdraw-your-entry`
## If your city added your home

A city or neighborhood group can enter your home for you and send you a private link. See [Your city added your home](/help/your-city-added-your-home).


# Help Center copy audit (2026-11-11): the new articles

Migration `0227_help_copy_audit_2026-11-11.sql` adds these eight articles and edits nineteen others (text fragments, only where nobody edited the article in Admin). If an article you edited in Admin should get the new wording, paste it from here. Regenerate with `node scripts/help/updates-copy-1111.mjs --md`. Slugs never change.

## edit-or-cancel-your-event
New article. Category: post. Type: howto. Order: 12.

Title:

    Edit or cancel your event

One-sentence answer:

    Open Your profile, tap Events, then Edit to change the details, or use Event notice to mark it Cancelled or Postponed.

Search words:

    edit event change event change dates cancel event cancelled postponed reschedule delete event event changed run again next year my event

Text:

    An event changed? You can fix its details, mark it cancelled or postponed, run it again next year, or delete it. You do this from your profile, signed in with the same account you used to add the event.
    
    1. Tap your **account circle** at the top of the map and choose **Your profile**. See [Your profile](/help/your-profile).
    2. Tap **Events**.
    3. Find your event. The tag under its name says **On the map**, **In review**, **Cancelled** or **Postponed**.
    4. Tap **Edit**. You can change the name, the start and end dates, the hours, the venue, the price, the description and the event web page.
    5. Tap **Save**. The map and the event's page show the change right away.
    
    ## Mark it cancelled or postponed
    
    The event stays on the map with a tag, so nobody drives out for nothing.
    
    1. On the event's row, open the **Event notice** list.
    2. Choose **Cancelled** or **Postponed**.
    3. When the event is back on, choose **No notice** to take the tag off. If the dates moved, tap **Edit** and change them too.
    
    ## Run it again next year
    
    Tap **Run again next year** on the event's row. It adds a copy with every date moved forward one year. The copy shows as Expected until its dates are checked, so open it and tap **Edit** when you know the real dates.
    
    ## Good to know
    
    - The Edit window does not change the city or the street address. To move an event, write to info@socallights.app.
    - **Delete** removes the event from the map for good. It asks you to tap again. If you paid for a Featured placement, write to us first: see [Feature an event or a home](/help/feature-an-event-or-home).
    - An event that is **In review** can be deleted but not edited until it is on the map.
    - Cancelled or postponed events cannot be featured.
    
    Did not find your event? See [Add an event to the map](/help/add-an-event). Anything else, [ask us](#ask).

## take-your-home-down-and-put-it-back
New article. Category: post. Type: howto. Order: 23.

Title:

    Take your home down and put it back

One-sentence answer:

    Open Your profile, tap Displays, then Take down for the season. Put back on the map brings it back with your photos and details.

Search words:

    take down take down my home season is over remove for the season pause put back put it back edit my home delete my home hide my home off the map

Text:

    When the season is over, or you just need a break, you can take your home off the map and put it back later. Nothing is deleted. Your details and photos wait for you.
    
    1. Tap your **account circle** at the top of the map and choose **Your profile**. See [Your profile](/help/your-profile).
    2. Tap **Displays**.
    3. Find your home. The tag under its name says **On the map**, **Taken down for the season** or **In review**.
    4. Tap **Take down for the season**. The home leaves the map, and the tag changes to **Taken down for the season**.
    
    ## Put it back
    
    1. Open **Your profile**, then **Displays**.
    2. Tap **Put back on the map** on the home's row.
    
    ## Change something first
    
    Tap **Edit** to change the name, the description, when the lights are on, how to see it, parking, the radio station or the tips for visitors, then tap **Save**.
    
    ## Delete it for good
    
    **Delete** removes the home and its photos for good. It asks you to tap again, so you cannot do it by accident. If you only want it off the map for now, use Take down for the season instead.
    
    ## Good to know
    
    - Only the person who posted the home can take it down or put it back. If an installer shares the listing, they are emailed when you do.
    - A home is on the map again as soon as you tap Put back on the map. You do not need to fill anything in again.
    - A home you added to a contest is not on this list. See [Edit or withdraw your entry](/help/edit-or-withdraw-your-entry).
    - Not signed in, or not your account? Use the Remove my home page: see [Is this your home? Claim it](/help/claim-your-home).
    
    Anything else, [ask us](#ask).

## what-is-the-shop-tab
New article. Category: find. Type: answer. Order: 160.

Title:

    What is the Shop tab?

One-sentence answer:

    The Shop tab has seasonal ideas for lights and decorations. Each card opens an Amazon search, and we may earn a small commission at no cost to you.

Search words:

    shop shop tab amazon affiliate buy lights decorations gift ideas commission associate store

Text:

    The **Shop** tab is next to **Places** and **Favorites** on the map. On a phone it is in the bar at the bottom. It has ideas for each season, such as lights and decorations.
    
    1. Open the map and tap **Shop**.
    2. Tap the season button at the top of the list (it says **Shop for** and the season) to see ideas for another season.
    3. Tap a card. It opens an Amazon search in a new tab.
    
    - SoCal Lights does not sell anything. Buying happens on Amazon.
    - The cards are affiliate links. As an Amazon Associate we earn from qualifying purchases, at no extra cost to you. The tab says so under the cards.
    - Shop links never affect a contest, a listing or the order of the map list. The map, search, routes, voting and entering stay free.
    - The Shop tab is on the website. It is not inside the SoCal Lights app.
    
    See also [Is SoCal Lights free?](/help/is-it-free) and the [Privacy Policy](/privacy).

## day-and-night-mode
New article. Category: find. Type: answer. Order: 170.

Title:

    Switch between day and night mode

One-sentence answer:

    Tap the sun and moon button at the top of any page. Night mode turns on by itself from 6 pm to 6 am, or whenever your device is set to dark.

Search words:

    dark mode night mode day mode light mode dark theme theme sun and moon sun moon too bright brightness switch

Text:

    Every page has a **sun and moon button**: in the header on the map and at the top of the other pages. Tap it to switch between day (light) and night (dark) mode.
    
    - SoCal Lights picks one for you. Night mode comes on from 6 pm to 6 am in your local time, or all day if your phone or computer is set to dark mode.
    - When you tap the button, your choice holds until the next automatic change at 6 am or 6 pm. After that, the automatic choice takes over again.
    - The choice is saved on that phone or computer only.

## see-who-won-a-contest
New article. Category: vote. Type: howto. Order: 135.

Title:

    See who won a contest

One-sentence answer:

    Open Contests and tap Past results. Winners appear after the organizer announces them, on the contest page and by email.

Search words:

    who won winner winners results past results contest results announced announcement scores ranking how did my home do

Text:

    Winners are announced by each contest's organizer, not by SoCal Lights. Until then, results stay hidden for everyone and nobody can see who is ahead.
    
    1. Open **Contests**: tap the **three dots** at the top right of the map and tap **Contests**, or, signed in, tap your **account circle** and then **Your contests**.
    2. Tap **Past results**.
    3. Choose the season and year in the **Season | Year** list.
    4. Each contest has a card with its **Winners** and the results for every home. Tap **See the full contest** to open its page. **Permanent page** is a link you can share.
    
    ## Good to know
    
    - Winners show on the contest's own page and are emailed to the people who entered when the organizer announces them.
    - Not there yet? The contest may still be taking entries or voting, or the organizer has not announced the winners. Check the contest page for the dates.
    - Your home is a winner? You get a crown on your profile. See [Your profile](/help/your-profile).
    - How winners are chosen is in [How are winners chosen?](/help/how-winners-are-chosen).
    
    Anything else, [ask us](#ask).

## who-can-run-a-contest
New article. Category: run. Type: answer. Order: 5.

Title:

    Can my HOA, school or business run a contest?

One-sentence answer:

    Yes. Any group can run a home-decorating contest: a city, a homeowners association (HOA), a school, a chamber of commerce, a business or a neighborhood group.

Search words:

    hoa homeowners association school business company church club chamber city neighborhood group who can run a contest organizer nonprofit

Text:

    Yes. Any group can run a contest, such as a city, a homeowners association (HOA), a school, a chamber of commerce, a business or a neighborhood group. You sign in and set it up yourself. Quick start is seven short screens.
    
    - Running a contest needs a **contest pass**. See [Contest passes](/help/contest-passes) and the [Pricing](/pricing) page.
    - Residents enter and vote for free, and payment never affects who wins.
    - You write or accept the official rules, and you decide who wins. SoCal Lights provides the website only. Read the contest part of our [Terms](/terms#contests).
    - If your sign-in email is at your organization's website, we match your organization to that website. Everyone at that organization shares one pass window.
    - A new contest may be held for a quick look by our team before it goes live. We email you when it is approved.
    
    Ready? See [Create a contest with Quick start](/help/create-a-contest-quick-start). Anything else, [ask us](#ask).

## what-is-socal-lights
New article. Category: find. Type: answer. Order: 5.

Title:

    What is SoCal Lights, and who runs it?

One-sentence answer:

    A free map of holiday lights, events and decorated homes across Southern California, with neighborhood contests. It is operated by Forza-TEK.

Search words:

    about about us what is socal lights who runs who owns who built forza-tek forza tek legit scam real contact company team

Text:

    SoCal Lights (socallights.app) is a free map of Christmas lights, Halloween, boat parades and other holiday events and decorated homes across Southern California. People use it to plan a night out, and neighbors use it to enter and vote in home-decorating contests.
    
    - It is operated by Forza-TEK. See our [Terms](/terms) and [Privacy Policy](/privacy).
    - Finding events and homes, routes, voting and entering a contest are free. Some extras are optional and paid, and they are always labeled. See [Is SoCal Lights free?](/help/is-it-free).
    - Events and times come from public sources and from the people who post them. Check with the organizer before you go.
    - Contests are run by their organizers. SoCal Lights provides the website only.
    
    Want to talk to a person? Write to info@socallights.app or [ask us](#ask).

## wheelchair-and-stroller-friendly-places
New article. Category: find. Type: answer. Order: 165.

Title:

    Find stroller and wheelchair friendly places

One-sentence answer:

    Open Filters, then Stroller friendly under Visiting a home. A home's page says Stroller and wheelchair friendly when its owner ticked it.

Search words:

    wheelchair accessible accessibility stroller strollers disabled mobility kids children toddler family parking walk by drive by hard to park

Text:

    Families and visitors who use a wheelchair or a stroller can narrow the map to homes whose owners say they are easy to visit.
    
    1. On the map, tap **Filters**.
    2. Under **Visiting a home**, tap **Stroller friendly**. You can add **Free parking**, **Drive by** or **Walk by** too.
    3. Tap the button at the bottom to see the places.
    4. Open a home to see its facts. A home says **Stroller and wheelchair friendly** when its owner ticked that box.
    
    ## Good to know
    
    - **Drive by** homes can be seen from your car. A home's page also says if parking is free, on the street or hard to find.
    - Owners fill these in themselves and we do not check them. If a home or an event is not as described, tap **Report a problem** on it.
    - Posting your own home? Tick **Stroller and wheelchair friendly** when you edit it. See [Take your home down and put it back](/help/take-your-home-down-and-put-it-back).
    - For an event, ask the organizer about access. The event's page links to their site.
    
    Anything else, [ask us](#ask).

## Find and manage your events (2026-11-13, migration 0243)
New article `your-events` ("Find and manage your events"): tap your account circle, then **Your events** (opens the Events tab of your profile); Edit, Cancelled or Postponed (No notice clears it), Run again next year, Delete; a short note that events do not take photo uploads (the picture comes from the event's web page, otherwise a stock photo), and that homes can have up to eight photos. A "After you add it" pointer is appended to `add-an-event` (seed-only, once). The text is in `migrations/0243_help_your_events.sql`; no video yet (see `docs/tutorial-updates.md`).

## Event photos (2026-11-13, migration 0245)
Owners can add up to 4 photos to an event they added. New article `add-photos-to-your-event` ("Add photos to your event"): account circle, **Your events**, **Edit**, the **Photos** box, **Add photos**; the first photo is the cover (**Cover**, x); saved right away; JPG, PNG or WebP under 6 MB; shown first and credited to the organizer; removing all brings back the web page picture or a stock photo; only once the event is on the map; **Run again next year** does not copy photos. `your-events` rewritten to match (and to say events you add are Confirmed, and Delete removes the photos); a pointer added to `add-an-event`; a note added to `my-photo-will-not-upload`. All seed-only. No video yet (`video` is empty): see `docs/tutorial-updates.md`.

## Manage your events video (2026-11-13, migration 0247)
The new video "Manage your events" (file `post-manage-events`, Tutorials group "Post events and homes") is linked to the Help articles `your-events`, `add-photos-to-your-event` and `edit-or-cancel-your-event` (only where the Video field was empty and nobody had edited the article in Admin). If you pasted those articles by hand, set their Video field to `post-manage-events`.


# Help Center audit (2026-11-16), part 1: fixes to existing articles

Migration `0269_help_fixes_2026-11-16.sql` changes these articles (text fragments, only where nobody edited the article in Admin). If you edited one in Admin, paste the text below over it. Regenerate with `node scripts/help/updates-1116a.mjs --md`. Slugs never change.

## add-an-event

One-sentence answer:

    Tap Add, then An event. Name it, pick the dates, add the place, and tap Add my event.

Text:

    1. Start on the map at socallights.app and tap the round **+** (Add) button in the top bar of the map. It is always there, signed in or not. You can also tap the **three dots** and then **Add** (signed out), or your **account circle** (the person icon) and then **Add an event, home or contest** (signed in). Then tap **An event**.
    2. Sign in with Google or an emailed code if asked. Your event is saved to your account.
    3. If your event has a web page, paste it into **Event web page** and tap **Next**. If it has no page, tap **No... Next** under the box. The web page is optional. Your event goes on the map as Confirmed either way, because you gave the dates.
    4. Type the event's name, choose a season and a type, then tap **Next**.
    5. Pick the first and last day (use the same day twice for a one-day event), add the hours if you like, then tap **Next**.
    6. Say whether it is free to attend. Tap **Free**, or tap **Paid** and type the price, for example "$15 adults, kids free". Then tap **Next**.
    7. Type the venue, choose the city and type the street address, then tap **Next**.
    8. Describe it in a sentence or two (at least 20 characters), then tap **Next**.
    9. Check everything and tap **Add my event**.
    
    On a very busy day we may hold a new event for a quick look before it goes on the map. The last screen says so, and we email you when it is up.
    
    ## Want it to stand out?
    On the last step you can choose a paid Featured plan, or **No thanks, just list it**. If you pick a plan, you go straight to Stripe's secure page after tapping Add my event. See [Feature an event or a home](/help/feature-an-event-or-home). Listing your event is always free. To change it later, or mark it cancelled or postponed, see [Edit or cancel your event](/help/edit-or-cancel-your-event).
    
    ## After you add it
    
    To change, cancel or delete your event later, tap your account circle, then **Your events**. See [Find and manage your events](/help/your-events).
    
    Want to add photos? Once your event is on the map, tap your account circle, then **Your events**, then **Edit**: [Add photos to your event](/help/add-photos-to-your-event).

## add-a-home-without-a-contest

One-sentence answer:

    You do not need a contest. Tap Add, then A lighting display, fill in the steps and your home goes on the map for free.

Text:

    You can put your home's lights on the map without entering any contest. It is free, and there is no voting, no judges and no organizer to wait for.
    
    ## Which button do I tap?
    The Add page has three choices:
    - **An event** is for a tree lighting, parade, market or other seasonal event.
    - **A contest** is for organizers who want to run a neighborhood contest. It is not how you enter one.
    - **A lighting display** is for your home's lights. This is the one you want.
    
    Tap the round **+** (Add) button in the top bar of the map. It is always there, signed in or not. Add is also in the account circle menu when you are signed in (**Add an event, home or contest**), or under the three dots when you are not. You can also go straight to socallights.app/add.
    
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
    
    More detail on each step is in [Show off your home on the map](/help/show-off-your-house).

## show-off-your-house

One-sentence answer:

    Tap Add, then A lighting display. Photos, address and a description put your home's lights on the map for families to drive by.

Text:

    1. Start on the map at socallights.app and tap the round **+** (Add) button in the top bar of the map. It is always there, signed in or not. You can also tap the **three dots** and then **Add** (signed out), or your **account circle** (the person icon) and then **Add an event, home or contest** (signed in). Then tap **A lighting display**.
    2. Sign in with Google or an emailed code if asked.
    3. Under **Who's posting?**, choose **A homeowner** (or **A professional installer**), then tap **Next**.
    4. Type the name to show, then tap **Next**.
    5. Did a company install your lights? If you did it yourself, tap **No**, then **Next**.
    6. Choose the season, then tap **Next**.
    7. Name your home and tell us what makes it special, then tap **Next**.
    8. Add the address. The pin goes here, and visitors see it so they can drive by. Tap **Next**.
    9. Tell families when the lights are on and how to see them (drive by, walk by, parking), then tap **Next**.
    10. Add photos, then tap **Next**.
    11. Check everything and tap **Put it on the map**.
    
    Nothing goes public until the last step, and you can save and exit at any time. Saved drafts are in your profile. To change your home later, or take it down when the season is over, see [Take your home down and put it back](/help/take-your-home-down-and-put-it-back). Most homes go live right away. If we hold one for a quick check, the site owner publishes it and may email you.
    
    If you are a professional installer, you give a website or phone number for quotes and tick that you have the homeowner's permission to show the address.
    
    ## Is your home already on the map?
    Some homes are on the map already, with a photo from the street. If yours is one of them, tap **Is this your home? Claim it** on its card instead. The form opens with your address filled in. See [Is this your home? Claim it](/help/claim-your-home).
    
    ## No contest needed
    You do not have to enter a contest to put your home on the map. See [Add your home without entering a contest](/help/add-a-home-without-a-contest).

## create-a-contest-quick-start

One-sentence answer:

    Tap Add, then A contest. Seven short screens, and your contest has its own link and QR code.

Text:

    Start at socallights.app and tap the round **+** (Add) button in the top bar of the map. It is always there, signed in or not. You can also tap your account circle, then **Add an event, home or contest** (signed in), or the three dots, then **Add** (not signed in). Or go straight to socallights.app/add.
    
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
    
    ## Choosing a contest pass
    
    Running a contest needs a contest pass. The Review screen shows the passes when your organization needs one, and your contest is created as soon as you pay. Residents enter and vote for free. See [Contest passes](/help/contest-passes).

## enter-your-home-in-a-contest

One-sentence answer:

    Tap Enter my home, add photos, your address and a name, then agree to the rules and submit.

Text:

    Find the contest ([how](/help/find-contests)) and tap **Enter my home**. You will find it under **Live now** on the Contests page and at the top of the contest page. If entries are closed, there is no **Enter my home** button. The page says why instead: when entries closed and when voting opens, or that the organizer has paused new entries for now, or that the winners are already announced.
    
    The entry is a short set of steps. You can leave at any time and come back later: your answers are saved as a draft in [your profile](/help/your-profile), except the photos, which you add again.
    
    1. If you are not signed in, tap **Sign in**. Use Google or an emailed 6-digit code. That is how you come back later to check on your entry.
    2. Add photos of your home. Tap **Choose photos**. You can add up to 8, and the first one is the cover.
    3. Type your street address and ZIP code. The city is already set to the contest's city. If your home is in a different city, tap **My home is in a different city**.
    4. Choose the name to show, for example, The Kim family. A line about your lights is optional.
    5. Check the summary, tick the box to agree to the official rules, then tap **Submit my entry**.
    
    ## Who can enter
    
    To enter a home in a contest you must be 18 or older. That is the rule in our [Terms](/terms#contests).
    
    Each contest's organizer writes its official rules and decides who wins, so a contest can add its own limits. Contests that use our standard official rules are open to people who own a home in the contest's city or have the owner's permission to enter it, or who installed the display. You tick a box to agree to the official rules on the last step, so read them first. If you are not sure you qualify, ask the organizer before you enter.
    
    ## What happens next
    
    Most organizers review every entry first, so your home will say it is waiting until they approve it. Some contests publish entries right away. The last screen tells you which one yours is, and you also get an email when the organizer approves or declines it.
    
    The address you enter is where the pin goes, and visitors see it so they can drive by. You can enter up to 5 homes in one contest.
    
    If something goes wrong, see [My photo will not upload](/help/my-photo-will-not-upload) and [My entry is not on the map](/help/my-entry-is-not-on-the-map).

## feature-an-event-or-home

One-sentence answer:

    Featured is optional and paid. Open the Feature page, choose your event or winning home, pick a plan and pay on Stripe.

Text:

    A Featured listing has a gold badge and a bigger gold-ringed pin on the map. It is optional. The Pricing page shows what each plan costs.
    
    ## For an event
    - Open the Feature page: tap the **three dots** in the top bar and choose **Feature your event**, or go to socallights.app/feature, or tap **Choose** on a plan on the Pricing page.
    - Pick a plan (below).
    - Sign in, then choose your event. If it is not on the map yet, add it for free first. If it is yours but you did not add it, open **Claim an existing listing**, search for it and tap **This is my event: claim it**.
    - Check the dates and the total, then tap **Pay on Stripe** and pay on Stripe's secure page. The payment methods you see depend on your device and location (see the end of this article).
    
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
    
    ## For a home
    Only the owner of a home that finished 1st, 2nd or 3rd place in a contest can feature it, and only after the winners are announced. Paying never changes a contest result. Homes have two plans, each for 30 days from the day you pay: the Featured pin (a gold-ringed pin and a "Featured" badge) and Top of the list (the same, and your home is listed first when people browse your area).
    
    ## Good to know
    - You pay once per event or home. There is no subscription.
    - Featured listings are always labeled, and they still have to be real and accurate.
    - If we cannot list or feature your event, you get a full refund of every part. Once it is live, payments are non-refundable, but if your event is cancelled, email us and we will move your placement to another of your events or refund the unused time. A refund or a payment dispute switches the placement off.
    - The map, search, routes and voting stay free. See [Is SoCal Lights free?](/help/is-it-free).
    - Featured is bought on the website, not in the app.
    
    The price you see is the price you pay. We do not add sales tax. Prices are in US dollars. You can pay by card, Apple Pay, Google Pay, Amazon Pay, Cash App Pay or Link. Which options you see depends on your device and location. Optional automatic renewal needs a card.

## ask-socal-lights-ai-assistant

One-sentence answer:

    A chat button on the map and the Pricing page answers questions about the site, contests and events. It is an automated assistant, not a person, and it can be wrong.

Text:

    **Ask SoCal Lights** is an automated AI assistant. It answers questions about finding events and homes, how contests work, how to add something and what things cost. It is not a person, and it can be wrong.
    
    ## Open it
    - Tap the **Ask SoCal Lights** button at the bottom right of the map or of the [Pricing](/pricing) page. On a phone it shows as a round button with a sparkle icon.
    - The first time in a visit it asks for a quick "I am human" check. Then type your question, or tap one of the suggestions, and tap **Send**.
    - Tap **Start over** to clear the chat, or the **x** to close it.
    
    If you do not see the button, the assistant is switched off or unavailable right now. The Help Center and info@socallights.app always work.
    
    ## What it is good for
    Questions such as how to enter or vote in a contest, how to add your home or an event, how sign-in works, what is on this weekend, or what an optional paid extra costs.
    
    ## Buttons it can offer
    
    Sometimes an answer comes with a card that has a button, so you can act right away. Each card says what it will do, and nothing happens until you tap its button.
    
    - **Send this to the team** has a box for your message. It is emailed to us. Add your email if you would like a reply.
    - **Report a problem** asks which event or home is wrong and what is wrong.
    - **Sign me up** is the free [weekly lights email](/help/weekly-lights-email). We email you a link to confirm first.
    - **Send removal request** asks us to take a home off the map. You do not need an account.
    - **Start this event**, **Start my home** and **Start my contest** open the Add form with what you told the assistant already filled in. You check everything there before anything goes on the map.
    - If you are signed in and ask about your own event, home or contest entry, it can offer a card to mark an event cancelled or postponed, run it again next year, change a description, take a home down for the season and put it back, or withdraw an entry. Each one asks you to confirm.
    
    ## What it will not do
    - It does not tell you who won or who is ahead in a contest.
    - It does not decide disputes, disqualifications, legal, tax or prize questions. For those, read the [Terms](/terms) or email info@socallights.app.
    - It does not do anything by itself. It cannot look up anyone's personal details, and nothing is sent or changed until you tap a button on a card.
    - It will not suggest that paying can help you win. It cannot: payment never affects a contest result.
    
    Prices come only from the [Pricing](/pricing) page, so check it before you pay.
    
    ## Your privacy
    Please do not type personal information such as names, addresses, phone numbers, email addresses or card numbers. Your chat stays in your browser tab only and is erased when you close the tab or tap **Start over**. We do not save what you type or what it answers. The one exception is a card you choose to send: what is in its boxes is emailed to the team. See the [privacy page](/privacy#ai-assistant) for the details.
    
    Not sure the answer is right? Use the Help Center search, or [ask us](#ask).

## edit-or-cancel-your-event

One-sentence answer:

    Open Your profile, tap Events, then Edit to change the details, or use Event notice to mark it Cancelled or Postponed.

Text:

    An event changed? You can fix its details, add photos, mark it cancelled or postponed, run it again next year, or delete it. You do this from **Your events**, signed in with the same account you used to add the event.
    
    1. Tap your **account circle** at the top of the map and choose **Your events**. It opens the Events tab of your profile: [Find and manage your events](/help/your-events).
    2. Find your event. The tag under its name says **On the map**, **In review**, **Cancelled** or **Postponed**.
    3. Tap **Edit**. You can change the name, the season and type, the city and street address, the start and end dates, the hours, the venue, the price, the description and the event web page. You can add up to 4 photos here too: [Add photos to your event](/help/add-photos-to-your-event). There is also an optional **Video link**: paste a YouTube or Vimeo link and visitors see a **Watch the video** button on your event. The video only loads when they tap it.
    4. Tap **Save**. The map and the event's page show the change right away. (Photos are saved as soon as you add them. The video link is saved with **Save**.)
    
    ## Mark it cancelled or postponed
    
    The event stays on the map with a tag, so nobody drives out for nothing.
    
    1. On the event's row, open the **Event notice** list.
    2. Choose **Cancelled** or **Postponed**.
    3. When the event is back on, choose **No notice** to take the tag off. If the dates moved, tap **Edit** and change them too.
    
    ## Run it again next year
    
    Tap **Run again next year** on the event's row. It adds a copy with every date moved forward one year. The copy starts as Expected, because the new dates are a guess. When you know the real dates, tap **Edit** and **Save** and it becomes Confirmed. The photos are not copied, so add them to the new copy.
    
    ## Good to know
    
    - Changing the address moves the pin, so we look the new address up again.
    - **Delete** removes the event and its photos from the map for good. It asks you to tap again. If you paid for a Featured placement, write to info@socallights.app first: see [Feature an event or a home](/help/feature-an-event-or-home).
    - An event that is **In review** can be deleted but not edited until it is on the map.
    - Cancelled or postponed events cannot be featured.
    
    Did not find your event? See [Add an event to the map](/help/add-an-event). Anything else, [ask us](#ask).

## i-cannot-vote

One-sentence answer:

    You must be signed in, voting must be open, and you cannot vote for your own home. You get one vote per category.

Text:

    Check these in order:
    
    1. **Sign in.** Voting needs an account, which keeps it to one vote per person. Use Google or an emailed code. Throwaway email addresses cannot be used, so use your regular email.
    2. **Is voting open?** The contest page shows the voting dates. The buttons say **Voting not open yet** before it starts, **Voting is paused** while the organizer has paused voting, and **Voting is over** after the winners are announced.
    3. **Your own home.** You cannot vote for a home you entered. It shows Your home.
    4. **Are you a judge?** Judges do not use the public vote. Open the judges' ballot from your invitation email instead ([how](/help/judge-a-contest)).
    5. **One favorite per category.** After you pick one in a category, tap **Move my vote here** on another home to change it.
    6. Some contests are judges only. Then the public does not vote.
    
    See [Vote in a contest](/help/vote-in-a-contest).

## wheelchair-and-stroller-friendly-places

One-sentence answer:

    Open Filters, then Stroller friendly under Visiting a home. A home's page says Stroller and wheelchair friendly when its owner ticked it.

Text:

    Families and visitors who use a wheelchair or a stroller can narrow the map to homes whose owners say they are easy to visit.
    
    1. On the map, tap **Filters**.
    2. Under **Visiting a home**, tap **Stroller friendly**. You can add **Free parking**, **Drive by** or **Walk by** too.
    3. Tap the button at the bottom to see the places.
    4. Open a home to see its facts. A home says **Stroller and wheelchair friendly** when its owner ticked that box.
    
    ## Good to know
    
    - **Drive by** homes can be seen from your car. A home's page also says if parking is free, on the street or hard to find.
    - Owners fill these in themselves and we do not check them. If a home or an event is not as described, tap **Something wrong? Tell us** on it.
    - Posting your own home? Tick **Stroller and wheelchair friendly** when you edit it. See [Take your home down and put it back](/help/take-your-home-down-and-put-it-back).
    - For an event, ask the organizer about access. The event's page links to their site.
    
    Anything else, [ask us](#ask).

## install-the-app

One-sentence answer:

    SoCal Lights is in the App Store for iPhone: search for SoCal Lights. On any phone you can also add the website to your Home Screen from your browser.

Text:

    ## The iPhone app
    
    SoCal Lights is in the App Store. Open the App Store on your iPhone and search for **SoCal Lights**. It shows the same map as the website. Two things differ: you sign in with an emailed code (there is no Google button in the app), and tips and paid options such as Featured placements and contest passes are on the website, not in the app.
    
    ## Or add the website to your Home Screen
    
    This works on any phone, with or without the app.
    
    **iPhone:** open socallights.app in **Safari**. Tap the Share button, scroll down, and tap **Add to Home Screen**.
    
    **Android:** open socallights.app in **Chrome**. Tap the three dots, then **Install app** (or **Add to Home screen**).
    
    ## With no signal
    The Home Screen version still opens, and so does any page you have opened before. Your last list of places is saved on your phone too. A page you have never opened shows a short offline message instead. Map pictures and photos are not saved. When your signal comes back, it updates by itself.
    
    Tip: open the pages you will want, such as the map and a contest, while you still have signal.
    
    The Install option missing? See [I do not see Add to Home Screen](/help/no-add-to-home-screen).

## add-co-organizers-and-judges

One-sentence answer:

    Team is for co-organizers, Judges is for judges. Type an email and add them. They get an invitation by email.

Text:

    Open your dashboard ([how](/help/share-your-contest)) and tap **Team**. On a phone, the bottom bar shows only the first tabs, so tap **More** to find the others.
    
    - **Co-organizers** help you run the contest. Type their email and tap **Add co-organizer**. They get an email with one button to open the dashboard, and they sign in with that email. You can add up to 8, and only you, the person who created the contest, can add or remove them. They can approve entries, review votes, and manage judges and sponsors. Changing the contest's details, pausing voting, unpublishing and announcing winners stay with you.
    - **Judges** are added on the **Judges** tab. It shows when your contest has judges, so choose "Judges only" or "Everyone and judges" when you create it. Type a judge's email and tap **Add judge**. Your judge gets an invitation with a button that opens their ballot. The tab also shows who has finished and has a button to remind judges who have not.

## add-sponsors-and-logos

One-sentence answer:

    On the Sponsors tab, add a company, its level, website and logo, confirm how it supported you and tick permission and Show. It then appears on your contest page, labeled Sponsor.

Text:

    Sponsors are the businesses that support your contest. They show on your contest page, always labeled "Sponsor". You add them on the **Sponsors** tab.
    
    1. Open your dashboard ([how](/help/share-your-contest)) and tap **Sponsors**. On a phone, tap **More** first.
    2. Under **Add or edit a sponsor**, type the company name and choose a **Level**: Presenting sponsor, Gold, Silver or Prize sponsor.
    3. Add their website and choose their logo (JPG, PNG or WebP, under 600 KB). The contact name, phone, email and amount are optional. Only you and SoCal Lights staff see them.
    4. Under **How the sponsorship counts**, choose **Paid to me** or **Donated in kind**. For Paid to me, tick that you collected the payment yourself and add the date and how it was paid. For Donated in kind, say what was given.
    5. Tick that you have the sponsor's permission, and tick **Show on the contest page**.
    6. Tap **Save sponsor**.
    7. To check how it looks, tap **See it as voters do**.
    
    A sponsor shows on the contest page only when all of that is done. A line under each sponsor tells you its status, for example Not confirmed: not shown.
    
    ## Let sponsors come to you
    Once your contest is live and approved, you can share one private invite link instead of typing everything yourself.
    
    - On the Sponsors tab, under Invite a sponsor, tap **Create invite link**, then **Copy link** or **Email this link**.
    - A sponsor fills in a short form. They do not need an account.
    - Their request waits under Waiting for your review. Tap **Mark payment received**, **Approve for the contest page** or **Decline**. Nothing shows on your page until you approve it.
    - Anyone with the link can send a request, so share it only with people you want to hear from. Make a new link to stop the old one, or tap **Turn link off**.
    
    The longer version, with receipts and privacy, is [Add sponsors to your contest](/help/add-sponsors-to-your-contest).
    
    ## How sponsors pay you
    Under How sponsors pay you, you can add your own payment link or instructions and up to three sponsor levels with amounts. Sponsors pay you directly. SoCal Lights never charges them, and payment never affects who wins.

## add-sponsors-to-your-contest

One-sentence answer:

    Record a sponsor who paid you, or send them a private invite link. Approve them for the contest page after you receive the payment. The money goes to you, not to SoCal Lights.

Text:

    A sponsor can support your contest with money or goods. **The sponsorship money goes to you, the organizer, not to SoCal Lights.** You collect it, receipt it and report it. SoCal Lights does not process, hold or guarantee it. Sponsors do not influence results, and payment never affects who wins.
    
    The short version, step by step, is [Add sponsors and logos to your contest](/help/add-sponsors-and-logos).
    
    ## Add a sponsor
    1. Open your dashboard and tap **Sponsors**. On a phone, tap **More** first.
    2. Fill in the company name, the contact name and, if you like, the website, phone, email, amount and logo (JPG, PNG or WebP under 600 KB). Pick a level.
    3. Under **How the sponsorship counts**, choose one:
       - **Paid to me (the organizer):** tick **Payment collected by me**, enter the date you received it and how it was paid (cash, check, bank transfer, card on your own system, invoice paid, or your own words). You can upload the receipt or paid invoice (PDF, JPG or PNG under 5 MB).
       - **Donated in kind:** say what was donated, for example yard signs or printing.
    4. Tick that you have the sponsor's **permission** to list their name and logo and to keep their contact details here.
    5. Tick **Show on the contest page** and tap **Save sponsor**.
    
    ## Let sponsors send you a request
    Once your contest is live and we have approved it, your Sponsors tab has two more cards.
    1. **How sponsors pay you.** Add your own payment link (an https:// link such as Venmo, PayPal, Stripe or your city's portal) and/or plain words, for example "Checks payable to City of Covina, mail to ...". You can also add up to three levels, each with a name and a dollar amount, such as Presenting, Gold and Supporter. They are only shown to sponsors: the site never charges anyone.
    2. **Invite a sponsor.** Tap **Create invite link**. You get a private link that you can copy or send by email. A sponsor opens it (no account), reads that the money goes to you, sees your payment link, and fills in a short form. Tap **Turn link off** to stop it, or **Make a new link** to replace it (the old one stops working).
    
    When a sponsor sends the form we email you, and the request waits under **Waiting for your review**. For each one you can:
    - **Mark payment received:** enter the date, how it was paid and, if you like, upload the receipt.
    - **Approve for the contest page:** only after the payment is received (or marked donated in kind). Nothing shows before you approve.
    - **Decline:** add a short note if you like. We email the sponsor politely.
    - **Remove:** delete the request.
    
    SoCal Lights has not verified your payment link, and tells sponsors to pay only organizers they know. If your contest is still waiting for our review, these two cards say so and unlock when we approve it.
    
    ## What people see
    The contest page shows the logo, name and link, labeled "Sponsor", and says that sponsors do not influence results and that sponsorship payments go to the organizer. A sponsor shows only when you confirmed the payment (or the in-kind gift), ticked the permission and chose to show it. Until then it is saved but not shown.
    
    ## Privacy
    The contact details, the amount and the receipt are visible only to you, your co-organizers and SoCal Lights staff. The receipt is stored privately and is never shown on a page or in a list. They are deleted 24 months after the contest's voting ends, or when you remove the sponsor or delete your account. SoCal Lights staff can hide a sponsor from a contest page.
    
    ## Running the contest again
    When you run a contest again, sponsors are copied as unconfirmed drafts. Confirm each payment (or gift) and permission again before they show.
    
    See [Run it again](/help/edit-your-contest-and-change-dates) and [Contest passes](/help/contest-passes).
    
    A sponsor who gets your invite link sees a page that explains the same thing: [Sponsor a contest with an invite link](/help/sponsor-a-contest-with-an-invite-link).

## edit-your-contest-and-change-dates

One-sentence answer:

    On the Overview, tap Change dates, edit what you need on the Details tab, and tap Save changes. The same tab can start next year's contest.

Text:

    Open your dashboard ([how](/help/share-your-contest)). On the Overview, find **Schedule** and tap **Change dates**. It opens the **Details** tab, where **Edit contest details** is ready. You can also tap Details yourself (on a phone it is under **More**).
    
    1. Change the date that entries close, and the voting dates. You can also change the name, who runs it, the welcome message, how entries are approved, the prize, the official rules, and a presenting installer.
    2. Tap **Save changes**.
    
    Entrants see changes right away, and the rest of the team is emailed about changes, so nobody is surprised. The **Team** tab keeps a list called **What the team changed**, with who changed what, newest first.
    
    Good to know:
    
    - The voting categories are locked after the first vote, because votes belong to a category.
    - Once you announce the winners, the details are locked.
    - Only the person who created the contest can change its details. Co-organizers can approve entries, review votes and manage judges and sponsors.
    
    If it will not save, see [My dashboard changes did not save](/help/dashboard-changes-did-not-save).
    
    ## Run it again
    
    At the bottom of the Details tab, **Run it again** starts a new contest with the same rules, categories, prizes and judges, and every date a year later. Tap **Run this contest again next year**, then tap again to confirm. Sponsors are copied as drafts: confirm each payment (or gift) and permission again before they show. You can edit the new contest before it opens. It counts toward your organization's 12-month window, so your [contest pass](/help/contest-passes) needs room for it, and a new pass is needed once the window has ended.

## presenting-installer-and-quote-requests

One-sentence answer:

    Add a lighting company on Details. While your contest is live, its page gets a Get a quote button that sends requests to the company and to you.

Text:

    A presenting installer is a lighting company you partner with. Your contest page shows a labeled advertisement with a **Get a quote** button for neighbors.
    
    1. Open your dashboard ([how](/help/share-your-contest)) and tap **Details** (on a phone, tap **More** first). Scroll to **Presenting installer**.
    2. Type the company's name, the email where quote requests should go, and their website.
    3. Tap **Save changes**. This adds a **Get a quote** button to your contest page while the contest is live.
    
    ## What a neighbor sees
    They open the contest page and tap **Get a quote**. They sign in if they have not yet, add their name and what they would like done, and tick the box to share their details. Then they tap **Send request**.
    
    Their details go only to that company and to you, the organizer, and only if they tick the box. SoCal Lights also keeps a copy. The form says so before they send it.
    
    ## Where you see requests
    Open your dashboard and tap **Promote** (on a phone, under **More**). Quote requests are listed under **Activity**, and you also get an email for each one.

## read-your-contest-activity

One-sentence answer:

    On Promote, Activity shows page visits, visits from your QR code, and how many people voted.

Text:

    Open your dashboard and tap **Promote** (on a phone, it is under **More**). **Activity** shows page visits, visits from your QR code, and how many people voted. Below, a chart shows votes for each day.
    
    Use it to see which sharing worked best.

## share-your-contest

One-sentence answer:

    On your dashboard's Overview, use Share it: copy the link, print the entry poster or yard sign, or invite neighbors by email.

Text:

    1. Open **Contests**, then **Mine**, then **Manage** next to your contest.
    2. On the **Overview**, find the card called **Share it**.
    3. Tap **Copy link**, then paste it into an email, a text, or a Facebook post.
    4. The **QR code** opens your contest when someone scans it with a phone. Put it on flyers and signs.
    5. **Print entry poster** makes a page for a bulletin board. **Print yard sign** makes a big sign for a lawn.
    6. To invite neighbors by email, tap **Promote** (on a phone, under **More**), then open **Invite neighbors by email**. Type their addresses and add a note. Each neighbor gets an invitation with your note and one button.

## find-lights-near-me

One-sentence answer:

    Tap the location button so distances work, pick a season, search a city, and narrow the list with Filters. Tap Route these to drive what you see.

Text:

    1. Open socallights.app. To see what is close to you, tap **Use my location** when the message appears, or tap the **location button** on the map (top right, under the zoom buttons; its label is Find my location). Then tap **Allow** in your browser. Distances and "nearest first" depend on it. Nothing happens until you tap.
    2. Tap the season button at the top and pick a season, such as **Thanksgiving & Christmas Lights**.
    3. Or search: type a city name (or an event) in the search box and tap it in the list.
    4. To narrow the list, tap **Filters**. You can pick a date, a city and distance, a county, free or ticketed, a type, and more. Tap the button at the bottom to see the places.
    5. Use **Sort** above the list to put the nearest, soonest or free places first. The quick picks **Tonight**, **This weekend** and **Free** above the list set the date and cost filters in one tap.
    
    The list shows the places in the part of the map you are looking at, so move or zoom the map to change it. It is sorted nearest first once the site knows where you are. After you allow location, a blue dot shows where you are and moves with you while the location button is on.
    
    Location not working? See [The map does not show my location](/help/location-does-not-work).
    
    ## Driving to what you see
    Tap **Route these**, the pill on the map. See [Drive a route](/help/drive-a-route).

## location-does-not-work

One-sentence answer:

    Your browser needs permission to share your location. Tap the location button on the map, allow it for socallights.app, or search for a city instead.

Text:

    Distances and "nearest first" need your location. If they are missing:
    
    - Tap the **location button** on the map (top right, under the zoom buttons; its label is Find my location) and tap **Allow** when your browser asks. Give it up to 20 seconds. If it is still looking, tap it again.
    - If you tapped **Block** or **No thanks** before, the site cannot ask again. Allow it in your browser:
      - **iPhone:** open Settings, Privacy & Security, Location Services. Turn it on, then tap Safari Websites (or your browser) and choose **While Using the App**. Reload the page.
      - **Android:** tap the lock icon in the address bar, then Permissions, Location, **Allow**. Also check that Location is on in your phone's quick settings. Then tap the location button again.
      - **Computer:** open your browser's site settings for socallights.app and set Location to **Allow**, then reload.
    - Opened the site from Instagram, Facebook, TikTok or another app's built-in browser? Those block location. Open socallights.app in Safari or Chrome instead.
    
    Once it works, the blue dot moves with you and the map follows you until you drag it. Tap the button again to stop.
    
    You can always skip location: search for a city, or pick a season, and the map works the same way.

## your-events

One-sentence answer:

    Tap your account circle, then Your events. That is where every event you added is kept.

Text:

    Every event you add is kept under **Your events**.
    
    1. Sign in. Tap your account circle at the top right of the map (your picture or your initial).
    2. Choose **Your events**. It opens the Events tab of your profile.
    3. Find your event. Each one says whether it is **On the map** or **In review**, and a **Cancelled** or **Postponed** tag shows if you set one. Events you add yourself show as Confirmed, because you gave the dates.
    
    ## What you can do there
    
    - Change the details, mark it cancelled or postponed, run it again next year, or delete it: [Edit or cancel your event](/help/edit-or-cancel-your-event).
    - Add up to 4 photos: [Add photos to your event](/help/add-photos-to-your-event).
    - Add a video: in **Edit**, paste a YouTube or Vimeo link in **Video link**. See [Edit or cancel your event](/help/edit-or-cancel-your-event).
    
    Only the person who added an event can edit or delete it. Adding another event? Tap your account circle, then **Add an event, home or contest**: [Add an event to the map](/help/add-an-event).

## your-profile

One-sentence answer:

    Tap your account circle at the top of the map and choose Your profile. Each section lists what you have, with buttons on every row.

Text:

    Tap your account circle at the top of the map (it shows your photo, or the first letter of your name or email) and choose **Your profile**. On other pages the same circle is at the top right. If you are not signed in, it asks you to sign in first.
    
    Sections are in the menu on the left, or along the bottom on a phone. Each one is a list of rows, and each row has buttons for what you can do with it. A status pill on a row shows where it stands, for example **On the map** or **In review**. On a phone the bottom bar shows Drafts, Contests, Displays and Events; tap **More** for Badges and Account.
    
    - **Drafts** lists anything you started and saved, including a contest entry. Tap **Continue** to finish it on any device, or **Delete**.
    - **Contests** has two lists. **Contests you run** shows each contest you run or help run, with **Manage** and **View page**. **Homes you entered** shows your homes in other people's contests, whether each is in the contest, waiting for the organizer or not accepted, and **Open contest**.
    - **Displays** lists the homes you showed off on the map. You can edit one, take it down for the season, put it back, or delete it. See [Take your home down and put it back](/help/take-your-home-down-and-put-it-back).
    - **Events** lists the events you added. You can edit one, mark it cancelled or postponed, or run it again next year. See [Edit or cancel your event](/help/edit-or-cancel-your-event).
    - **Badges** shows the awards your home has won. Winners keep a crown. It appears once you have one, and you can choose where your badges show on your listings.
    - **Account** is where you change your name and address, turn the [monthly update email](/help/monthly-update-email) on or off, sign out, or delete your account. Your name and address are optional, only fill in forms for you, and are never shown publicly.
    
    To change your photo, tap **Add a photo** or **Change photo** under your name at the top of the profile. Use a JPG, PNG or WebP.
    
    To remove a home or an entry, see [Edit or withdraw your entry](/help/edit-or-withdraw-your-entry) and [Unpublish and publish again](/help/unpublish-and-publish-again). To delete your account, see [How do I delete my account?](/help/delete-my-account).


# Help Center audit (2026-11-16), part 2: the new articles

Migration `0268_help_new_topics_2026-11-16.sql` adds these 15 articles and links to them from the articles people read next. A new article is added only if its address is free, so to change one later, edit it in Admin > Help. Regenerate with `node scripts/help/updates-1116b.mjs --md`. Slugs never change.

## where-is-the-add-button
New article. Category: post. Type: answer. Order: 5.

Title:

    Where is the Add button?

One-sentence answer:

    Tap the round + button in the top bar of the map. It is always there, signed in or not, and opens the Add page.

Search words:

    add button plus button + button where is add how do i add top bar add an event add a home add a contest menu three dots account circle

Text:

    The top bar of the map has a round **+** button. Its label is **Add**. It is always there, on a phone and on a computer, whether you are signed in or not.
    
    1. Tap **+**. The Add page opens with three choices.
    2. Choose one and follow the steps. You are asked to sign in when the form needs your account.
    
    - **An event** is for a tree lighting, parade, market or other seasonal event: [Add an event to the map](/help/add-an-event).
    - **A contest** is for organizers who want to run a neighborhood contest: [Create a contest with Quick start](/help/create-a-contest-quick-start).
    - **A lighting display** is for your home's lights: [Show off your home on the map](/help/show-off-your-house).
    
    ## Other ways to the Add page
    
    - Signed in: tap your **account circle**, then **Add an event, home or contest**.
    - Signed out: tap the **three dots** at the right end of the top bar, then **Add**.
    - Or go straight to socallights.app/add.
    
    Not sure which one you want? You do not need a contest to put your home on the map: [Add your home without entering a contest](/help/add-a-home-without-a-contest).

## add-an-event-to-your-calendar
New article. Category: find. Type: howto. Order: 26.

Title:

    Add an event to your calendar

One-sentence answer:

    Open an event and tap the calendar button. It opens Google Calendar if Google Maps is your maps app, otherwise it gives you a calendar file.

Search words:

    calendar add to calendar google calendar apple calendar outlook ics reminder save the date remind me event on my calendar

Text:

    You can put an event on your calendar so you do not forget it.
    
    1. On the map, tap the event to open its card.
    2. Tap the **calendar** button (its label is **Add to calendar**) in the row of buttons with the heart and Share.
    3. What happens next depends on your maps app:
       - If **Google Maps** is your maps app, Google Calendar opens in a new tab with the event filled in. Tap save there.
       - Otherwise you get a calendar file, and the site says **Calendar file ready**. Open it, and Apple Calendar, Outlook or your phone's calendar adds the event.
    
    ## Good to know
    
    - It fills in the name, the dates, the place and a link back to the event. If the hours are a single time range, such as 5 to 9 pm, it uses them. Otherwise it is an all-day event.
    - It adds one event at a time. There is no way to send all your favorites to a calendar at once.
    - Your maps app is the one you chose for directions. To change it, see [Drive a route](/help/drive-a-route).
    - Dates and hours come from the event. Check with the organizer before you go: [Plan a night of lights](/help/plan-a-night).

## event-video-link
New article. Category: post. Type: howto. Order: 13.

Title:

    Watch an event video, or add one to your event

One-sentence answer:

    A Watch the video button on an event plays a YouTube or Vimeo video. Owners paste the link in Your events, Edit, Video link.

Search words:

    video event video watch the video youtube vimeo video link add a video promo video trailer play

Text:

    ## Watch a video
    
    Some events have a video from their organizer. Open the event's card and tap **Watch the video**. It is a YouTube or Vimeo video. The player only loads when you tap, so just opening a card does not contact YouTube or Vimeo.
    
    If a video will not play, see [A tutorial video will not play](/help/video-will-not-play) for the usual fixes.
    
    ## Add a video to your event
    
    1. Sign in, tap your **account circle** and choose **Your events**.
    2. On your event, tap **Edit**.
    3. Find **Video link (optional)**. Paste a YouTube or Vimeo link. Use the link from the video's **Share** button.
    4. Tap **Save**. The **Watch the video** button shows on your event.
    
    To take the video off, clear the box and tap **Save**.
    
    ## Good to know
    
    - The video link is not in the Add form. Add your event first, then edit it.
    - Only YouTube and Vimeo links work. Anything else is turned down with a message.
    - The video shows once your event is on the map. An event that is still in review has to wait.
    - Only the person who added an event can change it. See [Edit or cancel your event](/help/edit-or-cancel-your-event) and [Add photos to your event](/help/add-photos-to-your-event).

## add-your-contest-logo
New article. Category: run. Type: howto. Order: 48.

Title:

    Add your contest logo

One-sentence answer:

    On your dashboard's Details tab, tap Upload a logo. It shows on your contest page and on homes that have no photo.

Search words:

    contest logo upload logo city logo organization logo icon remove logo replace logo picture for contest hoa logo

Text:

    Your contest has a logo. It shows on your contest page, and it stands in for homes that have no photo yet. Until you add one, we draw a simple icon from your contest's name.
    
    1. Open your dashboard ([how](/help/share-your-contest)) and tap **Details**. On a phone, tap **More** first.
    2. At the top you see the card **Contest logo**. Tap **Upload a logo** and choose a picture from your phone or computer.
    3. Wait for the note under the button. Your new logo shows on the card right away.
    
    ## Change or remove it
    
    - Tap **Replace logo** to choose a different picture.
    - Tap **Remove logo** to go back to the drawn icon. It asks you to confirm first.
    
    ## Good to know
    
    - Use a JPG, PNG or WebP. A logo under 600 KB goes up as it is. A bigger picture is made smaller for you, and a PNG keeps its see-through background.
    - You or a co-organizer can change the logo. See [Add co-organizers and judges](/help/add-co-organizers-and-judges).
    - Sponsor logos are separate: [Add sponsors and logos to your contest](/help/add-sponsors-and-logos).
    - The rest of the contest's details are on the same tab: [Edit your contest and change the dates](/help/edit-your-contest-and-change-dates).

## manage-your-installer-profile
New article. Category: sponsors. Type: howto. Order: 25.

Title:

    Manage your installer profile

One-sentence answer:

    Open Your profile, Displays, Manage. The four tabs are Overview, Homes, Details and Activity: edit your details and logo, confirm homes, and read quote requests.

Search words:

    installer dashboard installer profile manage installer company profile logo quote requests profile views activity confirm homes not ours areas served about sponsor placement installer

Text:

    Once you have claimed or created your company's free profile, you manage it from your installer page. See [Installer profiles and "Installed by"](/help/installer-profiles) for how to get one.
    
    ## Open it
    
    1. Sign in with the email you claimed the profile with.
    2. Tap your **account circle**, choose **Your profile**, then the **Displays** tab.
    3. Tap **Manage the (your company) profile**.
    
    If it says "This isn't your profile", you are signed in with a different email. Open the company's page and choose **Is this your company? Claim this profile**.
    
    ## The four tabs
    
    - **Overview** shows your profile views for the last 30 days, how many homes you have on the map, and how many quote requests you have. There is a link to your public page. If you have a Sponsor placement, it also shows how often the banner and your company card were shown and tapped, and a button to renew or upgrade. See [Sponsor your installer company](/help/sponsor-your-installer-company).
    - **Homes** lists homes that name your company. Tap **Confirm** on the ones you installed (they get a check mark) or **Not ours** on the ones you did not. Once confirmed, you and the homeowner can both edit that home, and each of you is emailed when the other changes something.
    - **Details** is where you change your phone for quotes, your website, the areas you serve and your **About** text. Tap **Save**. Below it, **Logo** takes a JPG, PNG or WebP under 600 KB. It shows on your profile page. Tap **Remove logo** to take it off.
    - **Activity** has a small chart of profile views by day, and the list of **Quote requests**: each person's name, email, phone and note. Each request is also emailed to you.
    
    ## Good to know
    
    - Paid Sponsor placements are bought on the website, not in the app.
    - Presenting a contest? See [Add a presenting installer and quote requests](/help/presenting-installer-and-quote-requests).

## find-santa-visits-and-nativities
New article. Category: find. Type: howto. Order: 62.

Title:

    Find Santa visits and nativities

One-sentence answer:

    In the Christmas season, open Filters, then Type, and choose Santa visits, photos & breakfasts or Nativity & drive-thru nativity.

Search words:

    santa santa claus photos with santa breakfast with santa brunch with santa santa visit nativity drive-thru nativity living nativity christmas types kids family

Text:

    Santa visits and nativities have their own type in the Christmas season, so you can see just those.
    
    1. On the map, tap the season button at the top and choose **Thanksgiving & Christmas Lights**.
    2. Tap **Filters**.
    3. Under **Type**, tap **Santa visits, photos & breakfasts** or **Nativity & drive-thru nativity**.
    4. Tap the button at the bottom to see the places.
    
    To go back to everything, open **Filters** again and choose **All** under Type.
    
    ## What is in each one
    
    - **Santa visits, photos & breakfasts** is for photos with Santa, breakfast or brunch with Santa, and Santa visits and arrivals.
    - **Nativity & drive-thru nativity** is for living nativities and drive-thru nativities.
    
    ## Good to know
    
    - These types are only in the Christmas season. In another season, pick Christmas first.
    - An event where Santa is just one part of something bigger, such as a tree lighting, may be listed under its main kind instead. You can also search for "Santa" in the search box.
    - Adding an event? Pick the Christmas season and then the type that fits. See [Add an event to the map](/help/add-an-event).
    - More ways to narrow the map: [Find lights near me](/help/find-lights-near-me).

## socal-lights-iphone-app
New article. Category: find. Type: answer. Order: 41.

Title:

    The SoCal Lights iPhone app

One-sentence answer:

    SoCal Lights is in the App Store for iPhone: search for SoCal Lights. It is the same map, with a few differences from the website.

Search words:

    iphone app app store ios download app apple sign in with code delete account in app contest pass in app featured in app android

Text:

    SoCal Lights is in the App Store for iPhone. Open the App Store and search for **SoCal Lights**.
    
    The app shows the same map, events, homes, contests and Help Center as socallights.app, and it updates whenever the website does. Browsing is free and needs no account.
    
    ## What is different in the app
    
    - **Sign in with an emailed code.** The app has no Google button. Google and the emailed code reach the same account, so a profile you made on the website is still yours: [I cannot sign in](/help/i-cannot-sign-in).
    - **Tips and paid options are on the website.** The app has no tip item, no Featured payment and no contest pass checkout. To feature an event, buy a contest pass or sponsor an installer company, open socallights.app in your browser. The app says so where it would have taken a payment.
    - **Delete your account in the app.** Tap your account circle, choose **Your profile**, open the **Account** tab and tap **Delete my account**. It asks you to tap again to confirm: [How do I delete my account?](/help/delete-my-account).
    - **Share uses your phone's own share sheet.**
    
    ## Android, or no app
    
    On any phone you can add the website to your Home Screen from your browser, and it opens full screen with its own icon: [Put SoCal Lights on your phone and use it offline](/help/install-the-app).
    
    Something not working in the app? [Report a problem](/help/report-a-problem) or [ask us](#ask).

## i-saw-it-lit-tonight
New article. Category: find. Type: howto. Order: 27.

Title:

    Tell us a home is lit tonight

One-sentence answer:

    On a home's card, tap I saw it lit tonight. It tells other families the lights are on. Sharing your location is optional.

Search words:

    i saw it lit tonight lights on tonight lit tonight is it on are the lights on seen on site reported lit lit report lights on

Text:

    Families like to know a home's lights are on before they drive over. If you have seen them, you can tell everyone.
    
    1. On the map, open the home's card.
    2. Tap **I saw it lit tonight** (the button with the light bulb).
    3. If your browser asks to share your location, you can allow it or say no. Either way your tap counts.
    
    The button then says **Thanks, noted as lit**, and shows how many people have said so, for example **3 tonight**. The count starts again each night.
    
    ## Seen on site, or reported
    
    - If you allow location and you are within about a quarter mile of the home, your tap counts as **Seen lit on site tonight**.
    - If you are farther away, or you do not share your location, it counts as **Reported lit tonight**.
    
    ## Good to know
    
    - You do not need an account.
    - Each connection counts once per home each night, so tapping again does not add to the count.
    - We do not save where you are. Your position is used once to check the distance. We keep only whether you were close, with a scrambled code of your connection so one person counts once, and we delete it after a few days.
    - Only homes show this button, not events.
    - Location not working? See [The map does not show my location](/help/location-does-not-work).

## share-an-event-or-a-home
New article. Category: find. Type: howto. Order: 28.

Title:

    Share an event or a home

One-sentence answer:

    Tap the Share icon on a card. An event shares its own page with a preview card. A home shares a link to the map.

Search words:

    share share an event share a home share link send to a friend text social preview card copy link share sheet

Text:

    1. Open an event or a home on the map.
    2. Tap the **Share** icon (an arrow leaving a box) in the row of buttons on the card.
    3. On a phone, your own share sheet opens. Pick Messages, WhatsApp, email or whatever you use. On a computer that cannot share, the link is copied and the site says **Link copied**. Paste it where you like.
    
    ## What your friend sees
    
    - **An event** shares the event's own page. It has the event's name and photo, so a text or a social post shows a preview card. The page tells them the dates and place, and its **Open on the map** button opens the event on the map.
    - **A home** shares a link that opens the map on that home.
    
    ## Other kinds of sharing
    
    - To send your whole list of favorites to a friend, see [Plan a night of lights](/help/plan-a-night).
    - To share a contest, see [Share your contest](/help/share-your-contest) and [Vote in a contest](/help/vote-in-a-contest).

## browse-events-by-city
New article. Category: find. Type: howto. Order: 63.

Title:

    Browse events city by city

One-sentence answer:

    Tap the three dots, then Browse by city. It lists every city with upcoming events, by county, and each city has its own page.

Search words:

    browse by city cities city list city page events in my city by county plan a trip in my town events near list of cities

Text:

    Want to see everything in one town without moving the map? Browse by city lists it.
    
    1. On the map, tap the **three dots** at the right end of the top bar.
    2. Tap **Browse by city**.
    3. Cities are grouped by county. Each one shows how many upcoming events it has. Tap a city.
    4. The city's page lists its upcoming events, with dates and places. Tap one for its details, or use the **Open the map** link at the top to go back to the map.
    
    ## Good to know
    
    - Only cities with upcoming events are listed, so the list changes through the season.
    - It is handy for planning a trip to a city you do not live in, and the city pages are plain pages that search engines can read.
    - Prefer the map? Search for a city there: [Find lights near me](/help/find-lights-near-me).

## what-featured-and-sponsor-labels-mean
New article. Category: find. Type: answer. Order: 155.

Title:

    What do Featured and Sponsor labels mean?

One-sentence answer:

    Featured, Sponsor and Event Partner mark places that paid for extra attention. They are always labeled, and none of them changes a contest result.

Search words:

    featured sponsor sponsored ad advertisement gold ring gold pin paid event partner banner top of the list label labeled is this an ad

Text:

    Some things on SoCal Lights are paid for. Every one of them is labeled, so you can tell.
    
    - **Featured** is on an event or a home. It has a gold-ringed pin on the map and a **Featured** badge. Featured events can also show as a pill in the strip at the top of the list, or first in the list.
    - **Sponsor** is on an installer company. A lighting company can pay to show its name and phone in a strip on the map, or as a company card at the top of the list. It is always labeled **Sponsor**.
    - **Event Partner** is on events from an organization with an Event Partner plan, such as a city or a chamber. It is not an endorsement by SoCal Lights.
    - **Sponsor** on a contest page marks a business that supported the contest. The organizer records it and shows it only with the sponsor's permission.
    
    ## What a label does not mean
    
    Paying never changes a contest. It cannot change who wins, who is ahead or any vote. The map, search, routes, voting and listing an event or a home stay free.
    
    Featured listings still have to be real and accurate. If something looks wrong, tap **Something wrong? Tell us** on its card.
    
    See [Is SoCal Lights free?](/help/is-it-free), [Feature an event or a home](/help/feature-an-event-or-home) and [Which Pricing tab is mine?](/help/which-pricing-tab-is-mine).

## why-a-winery-or-hotel-event-is-listed
New article. Category: find. Type: answer. Order: 156.

Title:

    Why is a winery, brewery or hotel event listed?

One-sentence answer:

    Wineries, breweries, taprooms, distilleries, hotels and resorts post holiday events too. We list the ones their own pages announce, and we fix or remove a listing if you ask.

Search words:

    winery brewery taproom distillery hotel resort venue tree lighting at a hotel why is this listed not my event remove my event wine beer holiday event at a winery

Text:

    SoCal Lights is a map of seasonal events, and many of them happen at wineries, breweries, taprooms, distilleries, hotels and resorts: a tree lighting at a hotel, a holiday market at a winery, a movie night at a brewery.
    
    We find these on public pages: the venue's own events page, a ticket page, or a local winery or business association's calendar. We only list an event that a public page announces, with the dates it gives. We do not make events up.
    
    ## If it is your event
    
    - Is it wrong or out of date? Tap **Something wrong? Tell us** on its card, or write to info@socallights.app, and we will correct it.
    - Would you rather it were not listed? Write to info@socallights.app and we will take it off.
    - Want to manage it yourself? Add it from your own account, so you can edit it and mark it cancelled or postponed. See [Add an event to the map](/help/add-an-event). Writing to us first means we can link it to your account instead of listing it twice.
    
    ## Good to know
    
    - Venue events can need a ticket or a reservation. Check the venue's page before you go. Dates are labeled **Confirmed** or **Expected**: [What do Confirmed and Expected mean?](/help/confirmed-or-expected).
    - Listing an event is always free.

## what-cancelled-and-postponed-mean
New article. Category: find. Type: answer. Order: 152.

Title:

    What do Cancelled and Postponed mean on an event?

One-sentence answer:

    A red Cancelled or Postponed tag means the organizer marked the event. It stays on the map so nobody drives out for nothing. Check the organizer's page for what comes next.

Search words:

    cancelled canceled postponed rescheduled event cancelled red tag faded event notice is it still on called off weather

Text:

    A **Cancelled** or **Postponed** tag on an event is a warning. The organizer marked the event, and it stays on the map with a red tag and a faded card so nobody drives out for nothing.
    
    - **Cancelled** means the event is not happening.
    - **Postponed** means it has been moved. The dates on the card may still be the old ones until the organizer sets new ones.
    
    ## What to do
    
    1. Open the event's card and tap its web page link to read what the organizer says.
    2. Check again before you go. If the event comes back, the tag comes off.
    3. If an event looks wrong, tap **Something wrong? Tell us** on its card.
    
    ## If it is your event
    
    You mark it, and clear the mark, with **Event notice** on your event's row in **Your events**: [Edit or cancel your event](/help/edit-or-cancel-your-event). A cancelled or postponed event cannot be featured.

## follow-your-drive-with-live-location
New article. Category: find. Type: howto. Order: 12.

Title:

    Follow your drive with live location

One-sentence answer:

    Tap the location button and allow it. A blue dot moves with you, the map follows you, and the list keeps the nearest places first.

Search words:

    live location moving dot blue dot follow me tracking gps heading arrow nearest first drive driving stop following location button

Text:

    1. On the map, tap the **location button** (top right, under the zoom buttons; its label is **Find my location**).
    2. Tap **Allow** when your browser asks.
    3. A blue dot shows where you are, with a ring for how exact the position is and an arrow for the way you are heading. It moves as you move, and the map follows you.
    
    The list keeps up too. Distances and the **nearest first** order refresh about every 30 seconds, so the places next to you stay at the top as you drive.
    
    ## Stop following
    
    - Drag the map to look around. The map stops following you.
    - Tap the location button again to turn it off.
    
    ## Good to know
    
    - Your position stays on your phone for this. The map does not send it to us. (The one time it is used is if you tap [I saw it lit tonight](/help/i-saw-it-lit-tonight), which is optional.)
    - Live location uses your phone's location service, which can use more battery.
    - It does not work in the built-in browser of other apps. If nothing happens, see [The map does not show my location](/help/location-does-not-work).
    - To drive to several places, see [Plan a night of lights](/help/plan-a-night) and [Drive a route](/help/drive-a-route).

## which-pricing-tab-is-mine
New article. Category: account. Type: answer. Order: 12.

Title:

    Which Pricing tab is mine?

One-sentence answer:

    The Pricing page has four tabs: Homeowners, Event organizers, Contest organizers and Installers. Pick the one that matches what you do.

Search words:

    pricing pricing tabs which plan which tab homeowner event organizer contest organizer installer how much plans what does it cost prices page

Text:

    The [Pricing](/pricing) page shows one audience at a time. The four tabs are above the page title. Pick the one that matches what you do.
    
    - **Homeowners**: showing your home's lights and entering a contest are free. A winning home can feature itself afterwards. [Pricing for homeowners](/pricing#homeowners).
    - **Event organizers**: listing an event is free. Featured placement is optional, and there is a plan for organizations with several events. [Pricing for event organizers](/pricing#events). See also [Feature an event or a home](/help/feature-an-event-or-home) and [Event Partner](/help/event-partner-plan).
    - **Contest organizers**: you choose a contest pass. Residents enter and vote for free. [Pricing for contest organizers](/pricing#contests). See [Contest passes](/help/contest-passes).
    - **Installers**: a free company profile, and optional paid Sponsor placements. [Pricing for installers](/pricing#banner). See [Sponsor your installer company](/help/sponsor-your-installer-company).
    
    ## Good to know
    
    - The prices are on the Pricing page only, so they are always the current ones.
    - Money never changes a contest result. See [Is SoCal Lights free?](/help/is-it-free).
    - A Pricing link that ends in #events, #contests, #banner or #homeowners opens that tab.
    - Inside the iPhone app, paid options are bought on the website: [The SoCal Lights iPhone app](/help/socal-lights-iphone-app).
