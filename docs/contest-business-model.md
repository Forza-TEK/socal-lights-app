# Contest business model (2026-10-30)

Research from web searches; vendor and law-firm pages disagree and some are promotional. Prices below marked "hypothesis" are starting points to test, not market facts. Not legal advice: have a California attorney read the rules and sponsor terms before any prize is offered.

## What the research says
- **Paid votes are the risky lever.** Voting platforms do sell votes ([GoGo Photo Contest sells $1 votes](https://support.gogophotocontest.com/hc/en-us/articles/4409723863955-Does-voting-have-to-be-1-00-Can-it-be-2-00-or-5-00-per-vote); PollUnit offers donate-to-vote), but lawyers describe vote-based contests as a [thin line between a skill contest and an illegal lottery](https://kleinmoynihan.com/is-the-favorite-chef-contest-an-illegal-sweepstakes-contest-lawyer-gaming-attorney/) because paid votes are consideration, and the law that applies is the one where each participant lives. Paid votes also invite vote-buying services. Donate-to-vote for a charity is a different case that needs counsel.
- **Contest software is a subscription business.** Woobox, ShortStack, Gleam and Votigo list about $29-$99/month ([G2](https://www.g2.com/products/shortstack/pricing)); Easypromos sells white label at $399/month. Our basic version is free, so a paid tier must offer something they don't: a local audience.
- **Real home-lighting contests are funded by local sponsors,** not entry fees: gift cards from local businesses, chamber or economic-development co-sponsors, sometimes tiered Gold/Silver/Bronze sponsorship ([Light Up Langdon](https://langdonchamber.ca/product/light-up-langdon-sponsorship/), [Harrisburg](https://harrisburgsd.gov/departments/parksandrec/2023holidaylights)). They split residential and business divisions. I found no published sponsor prices.
- **Installers pay heavily to find customers.** A franchise like Christmas Decor puts about 90% of its territory fee into lead generation in year one ([Total Landscape Care](https://www.totallandscapecare.com/business/article/15041301/all-about-the-holiday-lighting-franchise-christmas-decor)) and charges a 1% ad fund; homeowners pay about [$168-$675](https://thumbtack.com/p/christmas-light-installation-prices) per install. No per-lead prices were found.
- **California:** a skill contest avoids the "chance" element, sweepstakes avoid "consideration". Violations are a misdemeanor under Bus. & Prof. Code 17534. I could not retrieve the current statutes; check them on leginfo.ca.gov.

## What this site has that contest software doesn't
A map and list that families already use to find displays, ~450 contest and owner-listed homes, ~1,300 events, and a built-in link from a winning home to an installer who could have built it. Contests make content, traffic and a first-party audience for the rest of the app.

## Recommended structure: free for the public, sponsor-funded, installer-led
1. **Keep entry and voting free, always.** No paid votes, no entry fees, no paid ballot position. This is the legal and trust position and it is what makes contests spread.
2. **Organizers: Free and Pro per season (hypothesis $79-$149 per season).** Free: a contest page, QR, voting, one prize line. Pro: sponsor logos and tiers on the page, prize list per award, judges, email results, export, custom rules template, branded poster. A season is about 2 months, so this sits under the $29-$99/month tools.
3. **Local sponsor slots on every contest.** Presenting, Gold, Silver, Prize sponsor. The organizer invites sponsors, who pay the organizer or us. Start by letting the sponsor pay the organizer directly and charging only for Pro; add Stripe payments and a platform share (hypothesis 10-20%) once sponsors are using it.
4. **Installer partner (the high-value product).** One exclusive "Presenting Installer" per city or county per season, who provides the grand prize (for example a free light installation), gets a "Get a quote" button on the contest page, winner pages and their listing, and opt-in leads from entrants who tick "I'd like a quote". Price it against one booked job (hypothesis $300-$1,000 per city per season). Exclusivity is the thing being sold.
5. **Regional presenting sponsor** across all contests in a county, sold by us. Candidates: hardware stores, roofing, solar, real estate, electric utilities.
6. **Entrants and fans (optional, small):** Featured home boost on the map and list only, never in the ballot order or counts. Keep clearly labelled.
7. **Audience:** with consent, an entrants/voters email list becomes a sponsor-supported season newsletter.

## Rules that keep it clean
- Sponsors can pay us or the organizer, but never the entrants, and payment never affects who wins. Judges and voters are separate from sponsors.
- Label sponsors and affiliate links clearly. I did not research FTC disclosure rules, so confirm them.
- Winners can be tied to prizes only through the organizer's rules. Prize terms live in the official rules text (`public/rules.js`).
- Paid upgrades stay on the web and hidden in the native apps because of Apple's in-app purchase rules.

## Sequence
1. **Now to December 2026:** run the contests that already exist on the platform for free, using the contest list in `docs/contest-leads.md` as the outreach list (cities, chambers, HOAs). Goal: 3-5 live contests, real entries and votes, and a list of businesses who ask to sponsor.
2. **January:** talk to 5 installers about paying for a presenting slot. Price from what they say they pay per lead.
3. **Build in this order:** sponsor logos and tiers on the contest page, "Get a quote" lead capture with consent, Pro flag and Stripe checkout, then the installer partner dashboard.
4. **Sell for the 2027 seasons,** starting with Halloween and Christmas, then spring and the 4th of July.

## What must be true (test before building)
- Organizers actually run contests on the platform (count of contests, entries, votes).
- Installers will pay for exclusive local leads (ask five).
- Entrants opt in to quotes (opt-in rate).
- Sponsors respond to a logo and prize slot (count of inquiries).
