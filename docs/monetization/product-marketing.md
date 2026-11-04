# Product and marketing report: grow first, then monetize (revision 2)

_Product & Marketing lead, revised 2026-11-04 after `data-2026-11-04.md`. Where this report and the data file disagree, the data file wins. Prices and gates marked **(H)** are hypotheses, not market facts. Not legal advice._

## Recommendations (read this first)

1. **For Nov 2026 to Jan 2027 the job is audience and supply, not revenue.** Nobody has ever paid, real traffic is probably 20-50 visits a day, and there are 6 homes, 1 installer, 1 contest with 0 votes. Selling exclusive installer slots or Contest Pro now would be selling an empty room. Stop pitching those until the gates in section 4 are hit.
2. **The moat is the event database, and it is already indexable.** 2,013 events, 266 `/in/<city>` pages already in the sitemap (checked live today: 318 URLs total, 46 help articles, 1 installer page). The cheapest traffic is making those pages rank and be linked, plus press and parks departments who want a map they don't have to build.
3. **The only paid offers worth running this season are small and honest:** (a) Featured Event for organizers of real ticketed or paid events, after the Stripe path is proven end to end with one real $5 charge, and (b) affiliate links on the 84 ticket-seller events. Expect token revenue. Treat it as a test of the payment path and of demand, not as income.
4. **Get supply for free, with a concrete weekly target.** 6 homes is a cold-start problem; the cheapest fix is to seed homes from public contest lists (`docs/contest-leads.md`) with city permission and to invite homeowners through the weekly email and neighborhood groups. Installers come after homes exist, because an installer's only reason to join is homes to be tagged on.
5. **Instrument before believing anything.** There is no usage evidence for any feature. Add the six counts in section 5 this week so the first real numbers exist by Dec 1.
6. **Keep the Free Heart Promise and publish it before any paid spot appears.** It is also the pitch to parks departments and press.

## What changed from my first draft (five conclusions)

| Before | Now |
|---|---|
| Sell contests first, then sponsors, installers | Contests and installers are supply-side growth tools this season, free. Nothing paid there until gates are hit |
| "Presenting Installer" $300-$1,000 per city | Not offered in 2026. Revisit in spring 2027 for the 2027 season, only if gates are met |
| Revenue levers were four offers | One live offer (Featured Event) plus affiliate on 84 ticket events; the rest is gated |
| "Features people love" ranked by judgment, ~450 homes | No usage evidence. 6 homes. Early page mix from the counter only (section 5) |
| Traffic assumed to be an existing base | Traffic is the problem to solve; plan to go from tens to thousands per day |

## 1. Audience: from tens to thousands of real visits a day

**Baseline.** Counter: 18 visits Nov 2, 50 Nov 3 (map 38, profile 9, tutorials 8, help 5, contests 7, add 1). Cloudflare "uniques" of 450-650 are an upper bound with bots. I could not verify how much of that is search crawlers versus humans.

**What ranks today.** I searched "christmas lights near me" and "christmas lights near me Orange County Los Angeles best displays map." The generic query is dominated by low-quality, scraped, off-topic pages (university and corporate subdomains carrying spam-style "Places to See Christmas Lights Near Me" posts, e.g. [cms.ncwc.edu](https://cms.ncwc.edu/?p=403852)). That is an opening: a real, maintained, local database is better than what ranks. The regional query is won by editorial listicles and TV/magazine pages: [CBS Los Angeles on best OC holiday lights](https://www.cbsnews.com/losangeles/news/best-holiday-lights-shows-in-oc), [The Atlas Heart's OC guide (which embeds its own map)](https://theatlasheart.com/best-christmas-lights-in-orange-county/), [Orange Coast Magazine](https://orangecountycoast.com/where-to-see-some-of-the-best-christmas-light-displays-in-orange-county), [Visit Anaheim](https://www.visitanaheim.org/blog/stories/post/best-holiday-lights-displays-in-orange-county), [Mommy Poppins LA](https://mommypoppins.com/los-angeles-kids/christmashanukkah/christmas-light-displays-and-dazzling-holiday-decorations-around). A volunteer Google map also circulates on Reddit. These pages are the ones to get linked from.

**Plays, cheapest first** (all free; effort is Rey's time):

| # | Play | Why it should work | Target by Dec 4 | Verification |
|---|---|---|---|---|
| 1 | **City page SEO.** Make each `/in/<city>` page the best answer for "christmas lights in <city>": a short human intro, count of confirmed events, "tonight" and "free" sections, FAQ, ItemList markup. Submit the sitemap in Google Search Console and Bing, check which of 266 pages are indexed | Pages exist and are in the sitemap; the head terms are won by listicles, but long-tail "<city> christmas lights 2026" is thin | Index status known; top 20 cities rewritten | Need Search Console data; I could not see rankings |
| 2 | **Press and Patch.** Patch runs "Where are the best holiday lights in <city>" posts for many SoCal towns ([Redondo Beach](https://patch.com/california/redondobeach/where-are-best-holiday-lights-redondo-beach-0), [Temecula](https://patch.com/california/temecula/where-are-best-holiday-lights-temecula-0), [Beverly Hills](https://patch.com/california/beverlyhills/where-are-best-holiday-lights-beverly-hills-0), [LA](https://patch.com/california/los-angeles/la-tour-o-lights-2-homes-dazzle-unique-holiday-displays)) and takes reader submissions by email to a local editor. Pitch: "a free searchable map of 1,200 confirmed local events" with the editor's city page. Also pitch the local TV map teams ([KSL](https://www.ksl.com/article/51414841), [ABC15](https://www.abc15.com/entertainment/events/add-your-holiday-lights-display-to-our-map) run free submission maps, so SoCal stations may want a partner) | One link from a local outlet carries more than weeks of SEO this season | 10 pitches in week 1, 1 per week after | Editor contacts change; I did not verify 2026 contacts |
| 3 | **Parks and Rec / city sharing.** The Orange County, VA parks department publishes a self-guided light map ([newsletter](https://newsletter.orangecountyva.gov/december2025/11)); SoCal cities with contests (Glendora, Covina, Mission Viejo, Beaumont, Chino Hills, Orange OTPA per `docs/contest-leads.md`) already promote homes on flyers. Offer a city-branded `/in/<city>` page they can link, a free QR poster, and winners added after judging | They need a map and a link; we need an authoritative inbound link | 8 emails sent by Nov 12, 3 city links by Dec 15 | No replies yet; response rate unknown |
| 4 | **Facebook and Nextdoor groups.** Post useful posts (a "tonight's best 5 in <city>" with the map link), not ads; read each group's rules; 1-2 posts a week | Neighbors share lights tips every December | 10 groups joined, 6 posts | Group rules vary; cannot verify admin tolerance |
| 5 | **Weekly email.** Already exists. Send Thursdays (Nov 5, 12, 19, 26, then Dec weekly). Add one-click "forward to a friend" and a signup box on every city page | Owned audience that survives search changes | Report list size; gate is 500 | Current list size is unknown to me |
| 6 | **The database as the moat.** Publish a "SoCal holiday lights 2026: 1,254 confirmed events by city" page and a downloadable "tonight" list; update at every migration. Reporters link to numbers | Competitors are listicles or crowd maps; we have 2,013 dated, sourced rows | One data page live by Nov 15 | |
| 7 | **Product Hunt / Reddit / local subreddits** | A competitor maker launched on Product Hunt in Feb 2026 ([Christmas Lights Map](https://www.producthunt.com/products/christmas-lights-map)); one-off bumps only | Optional, Dec 1 | |

**Traffic path (H):** SEO and press ramp slowly; most visits will arrive Dec 5-24. Reasonable aspiration is 300-1,000 real visits a day by mid-December with two or three press/city links, and 2,000+ only on peak weekends. Counted from our own counter, not Cloudflare.

## 2. How competitors get traffic and monetize

My network allowed searches but not fetching most competitor sites (christmaslightfinder.com, tackylighttour.com, ksl.com did not resolve), so these are from search snippets and need a manual check.

| Competitor | Traffic route | Monetization (what I could confirm) | Source |
|---|---|---|---|
| Christmas Light Finder (app, Light Year Software, 2010s) | App Store, forum posts | Paid app at 99 cents when launched; the current free App Store listing shows one 1.0 rating and a different seller, so I cannot say it is the same product | [MacRumors](https://forums.macrumors.com/threads/christmas-lights-finder-shows-you-where-to-find-great-light-displays.1058340), [App Store](https://apps.apple.com/us/app/id784383613) |
| Christmas Lights Map (web and iOS, launched Feb 2026) | Product Hunt, community contest | Listed "Free"; no ads or fees mentioned | [Product Hunt](https://www.producthunt.com/products/christmas-lights-map) |
| TV and newspaper maps (KSL Utah, ABC15, Times Colonist, Review-Journal) | Station audience, annual "submit your display" campaign | Free submission; value is the outlet's ad inventory and audience. Their map is a seasonal engagement product | [KSL](https://www.ksl.com/article/51414841), [Deseret](https://www.deseret.com/family/2025/12/06/utah-christmas-lights-map-2025-is-live-submit-your-display/), [ABC15](https://www.abc15.com/entertainment/events/add-your-holiday-lights-display-to-our-map) |
| Tacky Light Tour community maps | Local organizers, tourism boards | Local organizers offered businesses a bigger logo icon and promo message on the map (no prices shown); some run ticketed bus tours at about $35 per person | [Talbot example via search](https://www.tackylighttour.com/build-community-christmas-light-map), [Richmond VA tours](https://localwiki.org/richmond-va/Tacky_Lights_Tours/_history/95) |
| Patch (with T-Mobile partnership) | Local editors, reader submissions | Advertising and a corporate partner sponsoring the California "tour of lights" series | [Patch CA](https://patch.com/california/across-ca/where-are-best-holiday-lights-california) |
| Listicle publishers (Atlas Heart, magazines, mommy blogs) | SEO | Display ads, affiliate; Atlas Heart's own map is a content hook | [Atlas Heart](https://theatlasheart.com/best-christmas-lights-in-orange-county/) |

**Comparison with ours.** Nearly everyone in this niche is free to homeowners and viewers and earns, if at all, from the surrounding audience: ads, a sponsor or partner, or local-business logo placements, never homeowner fees. That matches our Free Heart Promise and tells me: (1) homeowner or visitor fees are not the market norm; (2) the proven models are sponsor/partner placement and ad inventory, both of which need traffic first; (3) we have an advantage the others lack in a deep, dated event database and a sellable ticketed-event lane. I found no competitor that sells installer exclusivity. That does not mean it would fail; it means it is unproven here. I could not verify any competitor's revenue or traffic numbers.

## 3. Supply: homes and installers for free first

**Problem:** 6 showcased homes, 1 installer, 1 contest, 0 votes, 5 users. A map of 2,013 events is rich, but "Showcase a House" looks abandoned.

**Plan (free, in order):**

1. **Seed homes from public sources, with permission and attribution.** The contest watch list (`docs/contest-leads.md`) shows entry or winner maps arriving in December: Glendora (entries Dec 7, judging Dec 9), Covina (Dec 12-14), Signal Hill (entries Nov 16-Dec 10), Mission Viejo (tour from Dec 11), Beaumont (judging Dec 7-13), Chino Hills (Dec 16), Orange OTPA (winners around Dec). Ask each city or organizer: "May we host your entrants as a free contest page and QR?" Where they say yes, the homes arrive as a batch; where they don't, keep adding public winners as events as the sweep does today. Respect the Burbank decision (do not add). Note the earlier "about 450 homes" claim is wrong; do not repeat it.
2. **Host one contest ourselves and make it small and winnable.** The live contest has 0 votes. Spend one weekend: invite the 5 users, the weekly email list and 3 neighborhood groups; set a 10-home entry target and a Dec 15 vote close. A contest with 10 homes and 100 votes is a proof point for city pitches.
3. **Homeowner invitations in context.** On each `/in/<city>` page add "Is your house lit? Add it in 2 minutes" and a poster QR. The audit already says owners can't edit or take down listings; that blocker will cost supply trust, so confirm it is fixed before pushing the invite.
4. **Installers after homes.** Do not cold-pitch installers until 20+ homes exist; then the pitch is "claim your free page and see the homes tagged to you." Start with the one installer page already live (`/installer/lights-up-today`), ask them for referrals to 4 peers. Free profile only.
5. **Free partners to pursue:** the 21 contest-list cities; chambers and downtown associations (Orange, Mission Viejo); HOAs in master-planned communities; local radio (FM-synced displays such as Fountain Valley are already press favorites per the OC coverage). All free pilots, results quoted with permission.

**Supply gates (our counters):** 25 approved homes and 3 installers by Jan 3 is a good season (H); 6 homes by December means rethinking the add-house flow, not selling harder.

## 4. Monetize who and when, with gates

| Offer | This season? | What to do now | Unlock gate (our own counters, H) |
|---|---|---|---|
| **Featured Event** ($5/$10/$15) | **Yes, small** | Fix the `/feature` double flow (Stripe plus Cash App "email us"); prove Stripe end to end with one real charge (nothing has ever been paid; 1 checkout expired). Target only organizers of real paid or ticketed events. Cap at 2-3 labelled slots per view | Keep selling while the checkout works. Raise prices or add bundles only after 5 paid orders |
| **Affiliate on ticket links** | **Yes, passive** | 84 events link to Eventbrite, Ticketmaster or Fever; check each network's program and disclose with `rel="sponsored"`. Amazon Associates status is unknown; verify before relying on it | Track outbound ticket clicks; worth tuning at 100+ clicks a week |
| **Contest Pro** ($79-$149) | No | Free contests only; log what organizers ask for | 3 live contests with 20+ entries and 100+ votes each, plus 2 organizers asking for sponsor tools |
| **Presented By** (local sponsors) | No, conversation only | After the first contest, ask city partners which local businesses already sponsor them | 1,000 real visits a day for 14 days and one contest with 500+ votes |
| **Installer Partner / Presenting Installer** | No | Free profiles; interview 5 installers in January about lead prices | 25+ homes, 3+ installers, 20 installer-link clicks a week, 2 installers say they'd pay |
| **Newsletter sponsor line** | No | Grow list | 500 subscribers and a stable open rate |

The sensible read: the ticketed-event and organizer lane is the only revenue with a path this season, and it is tiny. If Featured Event gets zero checkouts after real outreach to 20 organizers by Dec 15, the price or the offer is wrong, not the traffic alone.

## 5. Feature inventory: what the evidence actually shows

**There is no usage evidence that any feature is loved.** The counter started Nov 2 and has 2 days of data. The early page mix (68 hits in 2 days, small sample): map 38, profile 9, tutorials 8, contests 7, help 5, add 1. The one defensible read is that the map is the product, and tutorials plus help (13 combined) are drawing more attention than contests (7) or add (1). That is consistent with first-time visitors asking how things work, which argues for making the map's first screen clearer rather than building more features. It says nothing yet about love.

**Instrument (privacy-light, aggregate, no cookies), this week:**
1. Map interactions: event opened, filter used, "Route these" used, save-to-My-night.
2. Outbound clicks by type: ticket seller, directions, shop, installer.
3. City-page landings by `/in/<city>` and entry source (search, direct, referrer domain).
4. Add-house and add-event: starts versus submits.
5. Contest page views, votes, entries.
6. Weekly-email signups and clicks; Featured checkout starts versus paid (Stripe already shows this).

Then rank features after Dec 1 using these counts, not the audit-based judgments in the earlier draft.

| Persona | Feature | Evidence | Would they pay? |
|---|---|---|---|
| Visitor | Map, search, filters, routes, saved night, email | Map is 38 of 68 early hits | No. Free |
| Homeowner | Showcase, contest entry, QR poster | 6 homes, 1 add visit | Rarely; free |
| Installer | Profile page | 1 installer | Maybe later; no evidence |
| Organizer (city/HOA) | Contest wizard, QR, voting | 1 contest, 0 votes | Unknown; free pilots first |
| Event organizer | Free add-event, Featured | 0 featured orders, 0 submissions | The only paid path today |
| Everyone | Help Center (46 articles) and tutorials | 13 early hits | No; reduces support load |

## The Free Heart Promise (keep; publish before any paid spot)

> **Finding the lights is free, and it stays free.**
> Searching the map, filtering by date or place, getting directions and routes, browsing every house and event, saving your night, voting in a contest and entering one as a neighbor will always be free. We won't put them behind a login fee, a trial, or a limit. We won't make them worse to make paid options look better.
> What we do charge for: tools for organizers and professionals, and clearly labelled Featured and "Presented by" spots. A paid spot is always marked. **Money never buys votes, never changes who wins a contest, and never changes a contest's order or counts.** There are no entry fees.
> SoCal Lights is a small independent project by Forza-TEK.

Use it in outreach to cities and press: it is the reason a parks department can link to us safely.

## Trust and brand risks (unchanged principles, updated for the plan)

| Risk | Safeguard |
|---|---|
| "They sold out" | Promise on the site, pricing page and footer; free list never shrinks |
| Hidden ads | Gold "Featured" and "Presented by" labels; affiliate disclosure; `rel="sponsored"` |
| Ranking bought | Only labelled Featured slots, capped per view; organic and contest order never change |
| Contest integrity and law | No paid votes or entry fees; sponsors never judge; California attorney review of rules before prizes (the earlier doc cites Bus. & Prof. Code 17534; I did not verify it) |
| Seeded homes | Use only public addresses from public contest lists with the city's blessing; honor opt-outs and remove on request |
| Fake traffic claims | Quote only our own counter in pitches, never Cloudflare uniques |
| Installer favoritism | Free profiles stay; any future Presenting slot is labelled and city-limited |
| Apple rules | Paid upgrades web-only, hidden in native apps |
| Strava-style backlash | Never put an existing free feature behind a fee |

## 6. Updated 30/60/90 plan (from Nov 4, 2026)

**Days 1-30 (to Dec 4)**
- Week 1 (Nov 4-11): ship the six counters; submit sitemap to Search Console and Bing; fix `/feature` to one payment path and complete one real test charge; draft the promise and a short `/pricing` page (free list, offers "coming"); send 8 city emails and 10 press pitches.
- Week 2 (Nov 12-18): rewrite the top 20 `/in/<city>` intros; publish the data page; start 10 neighborhood-group posts; weekly email on Nov 12 and 19.
- Weeks 3-4 (to Dec 4): launch our own small contest; check Amazon Associates and ticket-affiliate status; reach out to 20 event organizers about Featured.
- Targets: 300+ real visits/day by Dec 4 (H), 3 city or press links, 15 homes.

**Days 31-60 (to Jan 3)**
- Peak season: seed homes as contests publish (Dec 7-18); one email per week; one press pitch per week; count outbound ticket clicks; thank and quote cooperating cities.
- Targets: 1,000 real visits/day on peak weekends (H), 25 homes, 200 email subscribers, first Featured sale or a clear read on why not.

**Days 61-90 (to Feb 2)**
- Read the counters against the gates; interview 5 installers and 3 organizers; publish a season recap with real numbers; decide which paid offers to build for 2027 only for those whose gates were met.

## Seasonal calendar (re-verified today, Nov 4, 2026)

| When | Event | Action |
|---|---|---|
| Nov 5, 12, 19 | Thursdays | Weekly email |
| Nov 26 (Thu) | Thanksgiving | Press peak: "lights start now"; email |
| Nov 27 (Fri) | Black Friday; many displays turn on this weekend | Social and group posts; Featured push |
| Dec 4-12 | Hanukkah begins at sundown Dec 4 (check calendar) | Include menorah/hanukkah events in city pages |
| Dec 7-18 | City contest judging (Glendora Dec 9, Covina Dec 12-14, Beaumont, Chino Hills Dec 16) | Seed homes, publish maps |
| Dec 24-25 (Thu-Fri) | Christmas Eve, Christmas | Last big traffic days; post-season email |
| Jan 1, 2027 (Fri) | Rose Parade, New Year | Season-end email; recap |
| Jan | Post-season | Installer and organizer interviews; gate review |
| Feb 14, 2027 (Sun) | Valentine's | Light touch only |
| Mar 28, 2027 | Easter | HOA/school contests |
| Jul 4, 2027 | Independence Day | Optional patriotic contest |
| Aug-Sep | Halloween prep | Launch Halloween contests; start 2027 sponsor talks only if gates are met |
| Oct 31, 2027 (Sun) | Halloween | Season close |

## What I could not verify
- Competitor revenue, traffic, and any current monetization of christmaslightfinder.com and ChristmasLightMap.com (hosts blocked from fetch; only search snippets).
- Real search rankings and indexing of our own pages (no Search Console data).
- Patch editor contacts and 2026 submission rules; Hanukkah 2026 dates (check a calendar).
- Weekly email list size, Amazon Associates status, ticket-affiliate approval, whether Google and Resend sign-in secrets are set.
- Whether the owner-edit and take-down blocker for home listings from the personas audit is fixed.

## Sources

Internal: `docs/monetization/data-2026-11-04.md`, `docs/contest-leads.md`, `docs/coverage-cities.md`, `docs/status.md`, `docs/contest-business-model.md`, `docs/audit-2026-11-01-personas.md`; `functions/sitemap.xml.js`, `functions/in/[city].js`, `public/robots.txt`; live `https://socallights.app/sitemap.xml` (fetched Nov 4).

Web: [cms.ncwc.edu spam example](https://cms.ncwc.edu/?p=403852) · [CBS LA OC lights](https://www.cbsnews.com/losangeles/news/best-holiday-lights-shows-in-oc) · [Atlas Heart OC guide](https://theatlasheart.com/best-christmas-lights-in-orange-county/) · [Orange Coast](https://orangecountycoast.com/where-to-see-some-of-the-best-christmas-light-displays-in-orange-county) · [Visit Anaheim](https://www.visitanaheim.org/blog/stories/post/best-holiday-lights-displays-in-orange-county) · [Mommy Poppins](https://mommypoppins.com/los-angeles-kids/christmashanukkah/christmas-light-displays-and-dazzling-holiday-decorations-around) · [Patch CA](https://patch.com/california/across-ca/where-are-best-holiday-lights-california) · [Patch Redondo Beach](https://patch.com/california/redondobeach/where-are-best-holiday-lights-redondo-beach-0) · [Patch Temecula](https://patch.com/california/temecula/where-are-best-holiday-lights-temecula-0) · [Patch Beverly Hills](https://patch.com/california/beverlyhills/where-are-best-holiday-lights-beverly-hills-0) · [Patch LA](https://patch.com/california/los-angeles/la-tour-o-lights-2-homes-dazzle-unique-holiday-displays) · [KSL Utah map](https://www.ksl.com/article/51414841) · [Deseret](https://www.deseret.com/family/2025/12/06/utah-christmas-lights-map-2025-is-live-submit-your-display/) · [ABC15 map](https://www.abc15.com/entertainment/events/add-your-holiday-lights-display-to-our-map) · [Product Hunt Christmas Lights Map](https://www.producthunt.com/products/christmas-lights-map) · [MacRumors Christmas Lights Finder](https://forums.macrumors.com/threads/christmas-lights-finder-shows-you-where-to-find-great-light-displays.1058340) · [App Store listing](https://apps.apple.com/us/app/id784383613) · [Tacky Light Tour community map](https://www.tackylighttour.com/build-community-christmas-light-map) · [Richmond VA tacky tours](https://localwiki.org/richmond-va/Tacky_Lights_Tours/_history/95) · [Orange County VA newsletter](https://newsletter.orangecountyva.gov/december2025/11) · plus the first-draft playbook sources (Nextdoor, Yelp, AllTrails, Strava, Eventbrite, Substack, Thumbtack, Digiday on Charlotte Agenda) retained from revision 1.
