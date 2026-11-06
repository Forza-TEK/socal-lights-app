-- Help Center: the new event organizer tiers (pin / banner / top of the list) and the installer Top of the list plan (see scripts/help/updates-0184.mjs). Changed only while updated_by is still 'seed', so an article edited in Admin > Help Center is never overwritten (its text is in docs/help-updates.md to paste). No prices are written in the articles: they are on /pricing.
UPDATE help_articles SET title = 'Is SoCal Lights free?', summary = 'Yes. Finding lights, routes, voting and entering a home are free, and votes are never sold. Featured and Sponsor are the optional paid extras.', body = 'Using SoCal Lights is free. The map, search, routes and voting stay free for everyone. Entering a contest is free and votes are never sold. Listing an event or a home is free too.

## Two optional paid extras
Paid placements are optional, always labeled, and never change a contest result. The [Pricing page](/pricing) shows every price.

- **Featured** is for events and, after a contest, winning homes. An **event** organizer can add a **Featured pin** (a gold-ringed pin on the map and a "Featured" badge), a **banner** (your event as a pill labeled "Featured" in the strip at the top of the map list) and **top of the list** (your event is listed first when people browse your area). Every paid plan includes the pin; the banner and top of the list are optional extras, and each part costs the same. It runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first. A **home** can be featured only by the owner of a home that finished winner, 2nd or 3rd place in a contest, after the winners are announced: the Featured pin or Top of the list, for 30 days. Homes are a separate line from event plans.
- **Sponsor** is for installers. A free installer profile stays free. An installer can pay for the **Banner**, for **Top of the list** (the company card, without the banner) or for **both together**, always labeled "Sponsor". A placement runs from the moment you pay to the last day of the season, and the price is the same whenever you start.
- **Paying never affects a contest.** It cannot change who wins or any contest result.

See [Feature an event or a home](/help/feature-an-event-or-home), [Sponsor your installer company](/help/sponsor-your-installer-company) and the [Pricing page](/pricing).

If you would like to help keep it free, there is a **Keep SoCal Lights Free** row in the three-dots menu.', keywords = 'free cost price pay charge fee money tip cash app featured sponsor installer banner top of the list paid winner podium buy', updated_at = datetime('now') WHERE slug = 'is-it-free' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Feature an event or a home', summary = 'Featured is optional and paid. Open the Feature page, choose your event or winning home, pick a plan and pay on Stripe.', body = 'A **Featured** listing has a gold badge and a bigger gold-ringed pin on the map. It is optional. The [Pricing page](/pricing) shows what each plan costs.

## An event
1. Open the Feature page at [socallights.app/feature](/feature).
2. Pick a plan (below).
3. Sign in, then choose your event. If it is not on the map yet, add it for free first. If it is yours but you did not add it, tap **Claim this event**.
4. Check the dates and the total, then tap **Pay on Stripe** and pay on Stripe''s secure page.

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
- It starts the moment you pay and ends on your event''s last day or the last day of the season it was bought in (Christmas lights: Jan 6), whichever comes first. The price is the same whenever you buy, and the Feature page shows the exact dates and the total before you pay.
- Already have the pin? To add the banner or top of the list, pick the plan you want: you pay only for the parts you add. A plan that would add nothing is not sold, and the page says so.
- Buying again never shortens what you already have.

## A home
Only the owner of a home that finished winner, 2nd or 3rd place in an announced contest can feature it. Paying never changes a contest result. Homes have two plans, each for 30 days from the day you pay: the **Featured pin** (a gold-ringed pin and a "Featured" badge) and **Top of the list** (the same, and your home is listed first when people browse your area).

## Good to know
- You pay once per event or home. There is no subscription.
- Featured listings are always labeled, and they still have to be real and accurate.
- If we cannot list or feature your event, you get a full refund of every part. Once it is live, payments are non-refundable; a refund or a payment dispute switches the placement off.
- The map, search, routes and voting stay free. See [Is SoCal Lights free?](/help/is-it-free).
- Featured is bought on the website, not in the app.', keywords = 'feature featured event home pin gold badge banner pill top of the list plan price pay stripe winner second third promote advertise upgrade add banner season opens 30 days last day', updated_at = datetime('now') WHERE slug = 'feature-an-event-or-home' AND updated_by = 'seed';
UPDATE help_articles SET title = 'Sponsor your installer company', summary = 'Installers can show their company in the labeled Sponsor banner, as a card at the top of the list, or both. Pick a plan on the Sponsor page and pay on Stripe.', body = 'Installers can put their company in front of people planning a drive: in a labeled **Sponsor** banner at the top of the list on the map, as a company card at the top of the list, or both. It is optional and paid; your free installer profile stays free. The [Pricing page](/pricing) shows what each plan costs.

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
5. Tap **Continue to payment** and pay on Stripe''s secure page. Your placement turns on within a few minutes.

## How long it lasts and what it costs
A placement runs from the moment you pay to the last day of the season on the map (the Christmas lights season runs from Nov 3 to Jan 6, and the next season runs from Jan 7 to Jan 31). The price is the same whenever you start, so check the end date before you pay: the page shows the exact start date, end date, number of days and price. We do not refund or credit for timing.

## Renew or upgrade
- **Renew:** buy the same plan again while it runs. The new season starts the day after the current one ends, at the plan''s price. Time is only added, and we sell at most one season ahead.
- **Upgrade:** Banner and Top of the list are different products, and Banner and top of the list is both. If you hold one of them to the end of the season and want both, choose Banner and top of the list: you pay the difference between that plan and the one you hold (the page shows it), and what you hold stays as it is. Buying the other single product instead is a full, separate purchase, so the page tells you when both together cost less.
- Your dashboard (Overview) shows your dates and numbers, with a **Renew or upgrade** button.

## Refunds
If we cannot put your placement on, you get a full refund. A refund switches the placement off, and so does a payment dispute, so please email info@socallights.app before disputing a charge.

Paying never affects a contest, and the map stays free. See [Is SoCal Lights free?](/help/is-it-free).

## Automatic renewal
Automatic renewal is optional and off unless you turn it on. It renews the same plan you bought. See [Automatic renewal for installer Sponsor placements](/help/automatic-renewal-for-installers).', keywords = 'sponsor installer banner top of the list card company advertise paid plan price season renew upgrade both stripe labeled', updated_at = datetime('now') WHERE slug = 'sponsor-your-installer-company' AND updated_by = 'seed';
UPDATE help_articles SET body = replace(body, 'On the last day of your Sponsor placement we charge the card you saved with Stripe, at the plan''s price shown on the [Pricing page](/pricing) at that time, and the next season starts the next day.', 'On the last day of your Sponsor placement we charge the card you saved with Stripe, at the plan''s price shown on the [Pricing page](/pricing) at that time, and the next season starts the next day. It renews the same plan you bought: Banner renews as Banner, Top of the list as Top of the list, and both as both.'), updated_at = datetime('now') WHERE slug = 'automatic-renewal-for-installers' AND updated_by = 'seed';
