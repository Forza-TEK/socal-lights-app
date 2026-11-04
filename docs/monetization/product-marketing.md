# Product and marketing report: how SoCal Lights charges without selling out

_Product & Marketing lead, 2026-11-04. Prices marked **(H)** are hypotheses to test, not market facts. We have no traffic, usage or revenue data in the repo, so nothing here is a forecast. Not legal advice._

## Recommendations (read this first)

1. **Publish the "Free Heart Promise" before charging for anything new** (text below), and build every paid thing around it: money buys *placement that is labelled* and *tools for organizers and pros*, never access, ranking inside contests, or votes.
2. **Sell to people who make money from the lights, not to families.** Installers (one booked job is $168-$675 per [Thumbtack](https://thumbtack.com/p/christmas-light-installation-prices)), contest organizers, local sponsors and event organizers pay. Visitors and homeowners stay free.
3. **Go "contests first, then sponsors, then installers" in sales order, but build installer leads first.** Free contests create the audience and the proof that sponsors and installers need. Target 3-5 live free contests before asking anyone for money (matches `docs/contest-business-model.md`).
4. **Sell exclusivity per city per season, not clicks.** One "Presenting Installer" and one "Presented by" sponsor per city per season. Local newsletters that sold a few deep sponsor seats did better than many small ads ([Charlotte Agenda](https://digiday.com/media/charlotte-agendas-local-news-formula-fewer-advertisers-deeper-partnerships/feed/), reported; one source, treat as indicative).
5. **Measure first, price second.** Add 8 privacy-light counts (below) and set prices after the Nov-Dec 2026 season. Fix `/feature` first: it shows both a Stripe flow and a Cash App "email us" flow (see `docs/audit-2026-11-01-personas.md`, events organizer item 5). Pick one before promoting it.

**Three features people would pay for first (my belief, unverified):** (1) Featured Event (already built), (2) installer quote leads and Presenting Installer slot, (3) Contest Pro (sponsor logos, prizes, export, branded poster).

## The Free Heart Promise (draft public statement)

> **Finding the lights is free, and it stays free.**
> Searching the map, filtering by date or place, getting directions and routes, browsing every house and event, saving your night, voting in a contest and entering one as a neighbor will always be free. We won't put them behind a login fee, a trial, or a limit. We won't make them worse to make paid options look better.
> What we do charge for: tools for organizers and professionals, and clearly labelled Featured and "Presented by" spots. A paid spot is always marked. **Money never buys votes, never changes who wins a contest, and never changes a contest's order or counts.** There are no entry fees.
> SoCal Lights is a small independent project by Forza-TEK.

## 1. Playbook research: how others charged without breaking the free core

Web sources are marketing or review blogs, so figures are approximate; confirm on each vendor's own page.

| Example | What stayed free | What got paid | Source |
|---|---|---|---|
| Nextdoor | Neighbors, claimed business pages, two free business posts a month | Local deals, neighborhood sponsorships, self-serve ads | [Simicart](https://simicart.com/blog/how-does-nextdoor-make-money), [ProductMint](https://productmint.com/the-nextdoor-business-model-how-does-nextdoor-make-money/) |
| Yelp | Reading and writing reviews | Ads. Yelp says ad purchases don't change ratings; a 2014 court ruling said even if they did it wasn't illegal, and owners still complain | [Consumerist](https://consumerist.com/2014/09/19/yelp-swears-it-doesnt-manipulate-reviews-even-though-its-allowed-to), [Phys.org](https://phys.org/news/2014-09-court-yelp-online.html) |
| AllTrails | Viewing, saving, navigating trails | Offline maps, ad-free (about $36/yr per review sites) | [SlashGear](https://www.slashgear.com/1896580/alltrails-app-cost-price-paid-subscription-what-includes) |
| Strava | Core activity tracking | Moved leaderboards, route creation, then the Year in Sport recap behind the paywall; drew backlash | [BikeRadar](https://www.bikeradar.com/news/strava-leaderboards-routes-subscription/), [Hashe](https://www.hashe.com/tech-news/strava-puts-popular-year-in-sport-recap-behind-an-80-paywall) |
| Eventbrite | Free events cost nothing | Fees only when tickets are paid | [Checkoutpage](https://checkoutpage.com/blog/eventbrite-fees), third-party |
| Substack | Free publishing | 10% on paid subscriptions only | [Substack FAQ](https://faq.substack.com/p/how-do-paid-subscriptions-on-substack) |
| Thumbtack | Free to join as a pro | Pay per lead, roughly $15-$80+ (sources conflict) | [Simplywise](https://www.simplywise.com/blog/home-service-lead-generation-companies/) |
| Houzz Pro | Free tier | $99-$399/mo tiers, $499/mo ad add-on (as reported) | same search; check Houzz's own page |
| Local newsletters | The newsletter | A few sponsor "seats" | Digiday link above |

**Principles**

1. **Charge the side that earns money; keep the demand side free.** *So for us:* installers, sponsors and organizers pay; families never do.
2. **Free must be genuinely useful, not a trial.** AllTrails keeps viewing and navigation free. *So for us:* the map, search, routes and house browsing are the product and the audience.
3. **Never move an already-free thing behind the paywall.** Strava's backlash came from taking things away. *So for us:* the promise lists what's free now; new paid features must be new.
4. **Charge when money changes hands, not before.** Eventbrite and Substack take nothing from free use. *So for us:* no fee for free events or free contests; Pro only adds sponsor and prize tooling.
5. **Say plainly that ads don't buy outcomes, and make it checkable.** Yelp's denial is contested, which shows trust is fragile. *So for us:* publish the promise, label every paid spot, and keep contest results frozen from votes only (already how `contests.results` works).
6. **Sell a few deep, exclusive seats.** *So for us:* one Presenting Installer and one Presented-by sponsor per city per season.
7. **Price against the customer's win, not our cost.** *So for us:* installer pricing is a fraction of one booked job, not a per-click rate.
8. **Free tier is a funnel for the paid tier.** Nextdoor's free business pages lead to ads. *So for us:* a free installer profile and free contest, then paid upgrades with numbers (views, quote requests).

## 2. Feature inventory by persona

Usage evidence: the repo has no usage data (docs say so; `public/hit.js` counts page paths, and I did not read admin counts). "Love" below is a judgment from the audits, not measurement.

| Persona | Feature | Love/use evidence | Would they pay? |
|---|---|---|---|
| Visitor/family | Map, search, filters, routes ("Route these", My night), saved hearts, weekly email, shop tab | ~1,300 events, ~450 homes listed; audit says families want hours, parking, "lights on tonight". No usage data | No. Keep free. Shop tab earns affiliate only |
| Homeowner decorator | Showcase a House, contest entry, QR poster/yard sign, winner crown | Audit: can't edit or take down own listing yet. No usage data | Rarely. Optional later: home display kit (H, low) |
| Installer | Profile page, "Installed by" links, claim and manage page, contest "Get a quote" | Profile is bare (no logo, quote form or stats, per audit). No data | **Yes, highest value** |
| Contest organizer (city/HOA/chamber) | Contest wizard, QR, voting, judges, results, archive, printables, invites | Hidden/noindex, sign-in depends on secrets (`docs/contests.md`). No usage data | **Yes**, if they get sponsor tools and proof |
| Local business/sponsor | Nothing today | Only an Amazon shop tab | Yes, if inventory exists |
| Event organizer | Free add-event, Featured $5/$10/$15 | Built, untested in market | Yes, small tickets, wide base |
| Everyone | Help Center (46 articles), 25 tutorial videos | Searches logged; "was this helpful" collected | No; these reduce support load and sell trust |

## 3. Packaging and positioning

| Offer | For | One-line promise | Price **(H)** | Includes |
|---|---|---|---|---|
| **Featured Event** (live) | Event organizers, haunts, light shows | "Stand out on the map this season." | $5 / $10 / $15 as today; test bundles | Gold badge and pin; capped slots, always labelled |
| **Contest Pro** | Cities, HOAs, chambers | "Run your neighborhood lights contest, sponsor-ready." | $79-$149 per season (from `contest-business-model.md`) | Sponsor logos and tiers, prizes per award, extra judges, results email, export, branded poster. Entry and voting stay free |
| **Installer Partner** | Lighting installers | "Show your best work to families who are already looking." | Verified listing + quote button + stats: $99-$199 per season; Presenting Installer exclusive per city: $300-$1,000 per season (range from `contest-business-model.md`, not validated) | Logo and photos, opt-in leads, view and quote counts, "Presented by" on a city's contests. Never ranks above others in free browsing except a labelled slot |
| **Presented By** | Local hardware, roofing, solar, realtors, utilities | "Be the neighborhood's name on the holiday lights." | Per contest $150-$500; regional presenting $1,000+ per season | Logo and link on a contest or city page, prize slot, poster mention, optional newsletter line |

**Pricing page outline** (`/pricing`, plain text)
1. Headline: "SoCal Lights is free to use. Here's how it stays that way."
2. The Free Heart Promise box.
3. "Free forever" list: map, search, filters, routes, saved night, browsing all homes and events, directions, calendar/share, voting, entering a contest as a neighbor, adding an event, adding your house, basic installer profile, basic contest page with QR, Help Center and tutorials.
4. "For organizers and pros" four cards (above), each with who it's for, what you get, price, "start free, upgrade later".
5. "How we label paid spots": Featured gold badge, "Presented by", affiliate disclosure.
6. FAQ: refunds, "does money change who wins?" (No), "is it in the app?" (Web only, per Apple rules in `monetization-analysis.md`).
7. Contact: info@socallights.app.

**Cap on Featured:** `/feature` says "Top of the list" sorts first in city, county and season. To honor "free experience must not get worse," cap Featured at 2-3 per view and only when they match the visitor's filters.

## 4. Partnerships and growth

Priority outreach (leads from `docs/contest-leads.md`, which lists about 21 contests across LA, Santa Barbara, Riverside, San Diego, Orange and San Bernardino counties, e.g. Glendora, Covina, Mission Viejo, Beaumont, Chino Hills, Orange OTPA, Norwalk):

| # | Segment | Why | Ask | Free pilot by |
|---|---|---|---|---|
| 1 | Cities running home contests (Parks & Rec / community promotion) | Already run them; most publish only after judging or as a flyer image | "Use our free contest page, QR and map; we'll add your winners" | Dec 2026 (late) or Halloween 2027 |
| 2 | Chambers and downtown associations | Sell sponsorships already | Co-host, sponsor tiers via Contest Pro | Jan 2027 conversations |
| 3 | Installers (~5 first) | Highest willingness to pay | Free profile now, Presenting slot later; ask what they pay per lead | Jan 2027 |
| 4 | HOAs / master-planned communities | Run contests and public events | Free contest + yard signs | Spring 2027 |
| 5 | Local hardware, roofing, solar, realtors | Natural sponsors | "Presented by" per contest | After 3 live contests |
| 6 | Local press (Patch and local papers), radio | Free coverage, credibility | Contest/map stories with real numbers | Nov-Dec 2026 |
| 7 | Facebook/Nextdoor neighborhood groups | Where neighbors share contest links | Value posts, not ads; check each group's rules | Now |
| 8 | Schools, PTAs, scouts | Spring/summer contests (gardens, 4th of July) | Free contest | Mar 2027 |

**Seasonal calendar, Nov 4 2026 to Halloween 2027** (dates are public holiday calendar facts; check yearly)

| When | Season | Marketing and sales action |
|---|---|---|
| Nov 4-25, 2026 | Christmas lights announced; Thanksgiving Nov 26 | Push "Lights start now" to press and groups; Featured Event pushes; invite city contests |
| Nov 26-Dec 24 | Holiday peak, contests judge Dec 7-18 | Run free contests; collect metrics; ask winners and organizers for permission to quote |
| Dec 25-Jan 1 | New Year / Tournament of Roses | Season-end newsletter; save sponsor leads |
| Jan 2027 | Post-season | Installer interviews; ask pricing questions; publish results recap |
| Feb 1-15 | Valentine's (Feb 12-14 quick dates) | Small Featured upsell; lighter outreach |
| Mar-Apr | Spring, Easter | HOA and school contests (garden); build Contest Pro |
| May-Jun | Summer | Sell 2027 holiday sponsorships and installer slots early; installers plan routes before the rush |
| Jul 4 | Summer | Patriotic lights contest pilot |
| Aug-Sep | Halloween prep | Launch Halloween contests; Presented-by pitches |
| Oct 31, 2027 | Halloween | Season close; Halloween winners; plan Christmas |

**30/60/90 day plan (from Nov 4)**
- **Days 1-30 (to Dec 4):** publish the promise and `/pricing` (free list, offers "coming"); settle the `/feature` payment path; message 20 cities/chambers from the contest list; start the 8 metrics; claim Nextdoor and Facebook group posts; 5 installer conversations scheduled.
- **Days 31-60 (to Jan 3):** 3-5 live free contests; publish winner maps; ask each organizer what they'd pay for; first Featured Event revenue; one press pitch per week.
- **Days 61-90 (to Feb 2):** interview 5 installers; decide Contest Pro and Installer Partner prices from answers; build sponsor logos and quote form only if two organizers and two installers say yes (see thresholds).

**Sample outreach: installer** (honest, no invented stats)

> Subject: Free profile for [Company] on SoCal Lights
> Hi [Name], I run SoCalLights.app, a free map families use to find holiday light displays across Southern California. Homeowners can tag the installer who did their lights, and [Company]'s page lists those homes. You can claim it free and edit your photos and phone. Next season I'm considering one "Presenting Installer" spot per city on neighborhood contests, with a quote button and opt-in leads. Before I build it, could I ask what you pay for leads today and what would make this worth it? Happy to do 15 minutes. -- Rey, Forza-TEK

**Sample outreach: city or chamber**

> Subject: Free tool for your holiday home lighting contest
> Hi [Name], I saw [City]'s [contest name]. SoCalLights.app can host it free: a contest page, QR code, poster and yard sign, voting, and a map of entered homes, all free to residents with no entry fees. Local businesses can optionally be listed as "Presented by" sponsors; payment never affects winners. Could I set up a test contest for your review? I'd also be glad to hear what your sponsors ask for. -- Rey, Forza-TEK, info@socallights.app

## 5. Trust and brand risks

| Risk | Safeguard |
|---|---|
| "They sold out" | Free Heart Promise on the site, pricing page, and footer link; free list never shrinks |
| Hidden ads | Gold "Featured" and "Presented by" labels on every paid spot; affiliate disclosure (already automatic); keep `rel="sponsored"` |
| Ranking bought | Money affects only labelled Featured slots, capped per view; organic order and contest order never change |
| Contest integrity and law | No paid votes or entry fees; sponsors never judge; California attorney review of rules before prizes (see `contest-business-model.md`, which warns about Bus. & Prof. Code 17534; I did not verify the statute) |
| Installer favoritism | Presenting Installer is labelled and limited to its city's contests; unpaid installers keep profiles |
| Privacy | Counts only path views, no personal data; add consent before any lead is shared with an installer; confirm privacy.html matches |
| Apple rules | Paid upgrades web-only, hidden in native apps (as now) |
| Strava-style backlash | Never put an existing free feature behind a fee |

## 6. What to measure (and thresholds that justify a paid push)

Thresholds are **hypotheses** to revisit after one season.

| Metric | How | Threshold to act (H) |
|---|---|---|
| Weekly visitors in season (page paths) | existing `/api/visit` | Any stable base before selling sponsors; need a number to quote |
| Event/house detail opens | count only | >30% of sessions: promotes Featured value |
| Outbound clicks (ticket, directions, shop, installer) | aggregate counters | Installer clicks >20/week before approaching installers with data |
| Featured checkout starts vs paid | Stripe events | 5 paid in season: keep; <3: rethink price |
| Contests created, entries, votes | database | 3 live contests with 20+ entries each justifies Contest Pro |
| Contest organizer asks "how do sponsors appear?" | log inquiries | 2 asks unlocks sponsor tooling |
| Installer profile views and quote opt-in rate | counts; opt-in checkbox | 10% opt-in or 30 requests unlocks Presenting Installer sales |
| Email list size (weekly lights email, opt-in) | existing | 500 subscribers before selling newsletter lines |

Add no cookies or fingerprints; keep reports aggregate.

## Sources

Internal: `docs/status.md`, `monetization.md`, `monetization-analysis.md`, `contest-business-model.md`, `contests.md`, `contest-leads.md`, `installers.md`, `audit-2026-11-01-personas.md`, `ux-audit.md`, `help-center.md`, `coverage-cities.md`; `public/feature.html`, `site-config.js`, `printables.js`, `hit.js`.

Web: [Simicart on Nextdoor](https://simicart.com/blog/how-does-nextdoor-make-money) · [ProductMint on Nextdoor](https://productmint.com/the-nextdoor-business-model-how-does-nextdoor-make-money/) · [Consumerist on Yelp](https://consumerist.com/2014/09/19/yelp-swears-it-doesnt-manipulate-reviews-even-though-its-allowed-to) · [Phys.org on Yelp ruling](https://phys.org/news/2014-09-court-yelp-online.html) · [SlashGear on AllTrails](https://www.slashgear.com/1896580/alltrails-app-cost-price-paid-subscription-what-includes) · [BikeRadar on Strava](https://www.bikeradar.com/news/strava-leaderboards-routes-subscription/) · [Hashe on Strava recap](https://www.hashe.com/tech-news/strava-puts-popular-year-in-sport-recap-behind-an-80-paywall) · [Checkoutpage on Eventbrite fees](https://checkoutpage.com/blog/eventbrite-fees) · [Substack FAQ](https://faq.substack.com/p/how-do-paid-subscriptions-on-substack) · [Simplywise on lead gen](https://www.simplywise.com/blog/home-service-lead-generation-companies/) · [Digiday on Charlotte Agenda](https://digiday.com/media/charlotte-agendas-local-news-formula-fewer-advertisers-deeper-partnerships/feed/) · [Thumbtack install prices](https://thumbtack.com/p/christmas-light-installation-prices)
