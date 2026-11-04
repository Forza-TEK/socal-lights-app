# Ticket and shop affiliate plan (2026-11-04)

Owner: Digital Monetization lead. Status: research only. Nothing applied, no code changed. Facts from our database are exact (read-only SELECT, 2026-11-04). Program terms come mostly from aggregator sites; each is marked **[official]**, **[secondary]** or **[not verified]**.

## Bottom line

- The affiliate line is worth roughly **$0 to $30 a month** at today's traffic, and it could be exactly $0 because the biggest ticket host (Eventbrite) may not pay for ticket sales at all.
- The "84 ticket-seller events" is a count over all dates. **Upcoming** (end_date on or after 2026-11-05) there are **73**: 70 Eventbrite, 3 Fever. **Zero link to Ticketmaster, AXS, SeatGeek, StubHub, Live Nation, Universe, Tickettailor or Ticketweb.** Ticketmaster is not worth applying to for the current data.
- The most useful programs are ones that match what we link to: Fever (3 events, but all three are the big illuminated shows), a tours/attractions affiliate for the theme-park holiday events, and Amazon for the shop tab.

## 1. Inventory (upcoming events with a url, 1,242 of 1,242 upcoming)

| Host | Upcoming events | Notes |
|---|---|---|
| eventbrite.com | 70 | 36 free or free option, 68 confirmed |
| feverup.com | 3 | all paid, all confirmed |
| runsignup.com | 29 | race registration (turkey trots, Santa runs); not a ticket seller in the usual sense |
| raceroster.com | 2 | race registration |
| Theme-park and attraction sites (disneyland, knotts, seaworld, legoland, sixflags, universalstudioshollywood x2) | 12 | sell admission on their own sites |
| laphil.com, lewisfamilyplayhouse.com, musiccenter.org | 7, 5, 1 | venue's own box office |
| Other paid-looking events on organizer/venue sites (queenmary, flagshipsd, descanso, huntington, lazoo, enchantchristmas, etc.) | about 20 | host judged by hand, rough count |
| ticketmaster, axs, seatgeek, stubhub, livenation, universe, tickettailor, ticketweb, etix, viator, getyourguide, groupon | **0** each | none in the data |

So about **45 events link to a venue that sells its own tickets** (12 parks, 13 performing arts, about 20 other attractions). Those cannot be monetised by a ticket-network rule; only a reseller program (Fever, Viator, GetYourGuide, a Disney-ticket reseller) could, and only by changing the link or adding a second button.

**Eventbrite, 10 highest-priced (70 total):**
1. Long Beach Sugar & Spice Holiday Dessert Festival, Long Beach, Dec 19, paid options up to $71.69
2. Free Fontana Family Christmas Event, Fontana, Dec 19, free for first 60, $17 after
3. Christmas with Clare College Choir, Palm Desert, Dec 10, about $55
4. The Hot Chocolate Nutcracker, Redondo Beach, Dec 12, from $54.59
5. 5K Turkey Trot at Common Space Brewery, Hawthorne, Nov 28, from $52.33
6. Santa Shuffle 5K at Firestone Walker, Marina del Rey, Dec 12, from $52.33
7. Hanukkah Cha-Cha-Cha, Palm Springs, Dec 5, $25-$52
8. The Spirit of Christmas: Joshua Tree Philharmonic, Joshua Tree, Dec 18, $21-$50
9. Breakfast at the North Pole at The Rose Gardens, Whittier, Dec 6, adults $49.99, kids $29.99
10. Sweet Soul Christmas with Greg Adams & East Bay Soul, Palm Springs, Dec 10, $28.52-$49.87

**Fever (all 3):** Tinker Bell's Neverland: An Illuminated Adventure, Palos Verdes Estates, Nov 13 to Jan 3, $33 adult / $18 child; Lightscape, Encinitas, Nov 20 to Jan 3, from about $18 kids / $28 adults; Santa's Winter Wonderland at the Autry, Los Angeles, Dec 5, $25 adults.

**Parks and venues (own-site tickets):** Disneyland Holidays (Nov 13 to Jan 6), Knott's Merry Farm, SeaWorld Christmas Celebration, Holidays at LEGOLAND, Six Flags Holiday in the Park, Grinchmas at Universal Studios Hollywood; LA Phil holiday concerts at Disney Hall (from $39).

## 2. Programs

Approval odds for a site with 20-50 human visits a day are my judgement, not the programs' published rules.

| Program | Network | Commission / cookie / payout | Approval and restrictions | Odds |
|---|---|---|---|---|
| **Eventbrite** | Impact (program name "Organizer Program", id 21676) **[secondary]**: https://www.affilitizer.com/programs/eventbrite.com | Unclear. Listings say 10-25% of fees, or a flat $8-$20 bounty when a *new organizer* publishes a paid event **[secondary]**. One directory (checked 2026-09-03) says there is no public program: https://affonso.io/affiliate-programs/eventbrite. Cookie 30 days **[secondary]** | No official page found. If it pays only for organizer sign-ups, it does not pay for ticket buyers, which is what we send | Unknown. Possible but may pay nothing for our traffic |
| **Ticketmaster** | Impact | 1% per sale (0.5% AU/NZ), 30 days, reversed on refund **[secondary]**: https://getlasso.co/affiliate/ticketmaster/. Impact case study: https://impact.com/partners/ticketmaster/ **[official page, no terms]**. ticketmaster.com/h/affiliate.html returned a bot block | Active site with original event content, privacy policy and terms, approval at their discretion **[secondary]** | Likely to approve a real content site, but we have 0 Ticketmaster links, so skip for now |
| **Fever** | Impact, 6-10% **[secondary]** (https://app.hienergy.ai/a/fever-labs-inc-hienergy-impact); older listings say Admitad 3.8%, 1-day cookie | Official: rates vary by experience, each listing shows your commission, for "publishers, media, apps and digital partners" **[official]**: https://business.feverup.com/en/partner-programs/experience-distribution-platform/ (page text) and https://developer.feverup.com/en/ | Apply from the Fever business site. Ambassador track needs 10K+ followers (not us); the affiliate track is separate **[official, via search summary]** | Best fit. Reasonable chance for a real events site; no stated traffic floor |
| **AXS** | Impact, about 2% **[secondary]**; US program not confirmed, UK listing marked expired | Unknown | Not verified | Skip, 0 links |
| **SeatGeek** | Impact, 1-5%, 30 days **[secondary]** | Refund reversals | Not verified | Skip, 0 links |
| **StubHub** | Impact | Not researched | Resale marketplace | Skip, 0 links |
| **Viator** | Direct (Partner Resource Center) | 8% of net booking value, 30 days; bank pays monthly with $50 minimum, PayPal weekly no minimum **[official, via search summary]**: https://partnerresources.viator.com/ | Official page: "no traffic or follower minimums", quick free signup **[official, fetched]** | Very likely to approve. Useful only if we add tours (LA/SD holiday lights tours, boat parade cruises), which we do not link today |
| **GetYourGuide** | Direct partner portal or Awin/Travelpayouts | 8% / 31 days on Travelpayouts, 7% / 30 days on Awin; minimum $20-50 **[secondary]**. Portal: https://partner.getyourguide.com/en-us/ (page text did not load) | Not documented | Probably approves; same caveat as Viator |
| **Amazon Associates** | Direct. Tag `socallightsap-20` approved about 2026-10-21 | Fixed category rates; Home, Home Improvement, Lawn and Garden at 3%, catch-all 4% **[secondary]**: https://getlasso.co/amazon-affiliate-commission-rate/. 24-hour cookie; 89-day cart extension **[secondary]** | Three qualifying sales in the first 180 days or the account closes: sources conflict on whether this is still written in the agreement **[secondary]**, so treat the deadline (about 2027-04-19) as real. Disclosure wording required by the operating agreement (see 3) | Already approved. Risk is the 180-day sales test |
| **Lights/decor retailers** | Mixed | Christmas Lights By Design: 15% physical goods, 30-day tracking, own platform (https://www.christmaslightsdesign.com/affiliate **[official, via search summary]**). King of Christmas 6.4%, 30 days (FlexOffers listing **[secondary]**). Ollny 6-10%, 180-day cookie **[secondary]**. Balsam Hill 2% **[secondary, 2024]** | Terms not verified. Home Depot, Lowe's, Target and Walmart also run affiliate programs on Impact, not researched here | Small merchants approve readily; these only pay if people buy lights from our shop tab |
| **Theme-park tickets** | Undercover Tourist: ShareASale, flat $5 per sale or 1% **[secondary]**: https://getlasso.co/affiliate/undercovertourist-com/. Six Flags: own application **[secondary]**: https://www.flexoffers.com/affiliate-programs/six-flags-tickets-affiliate-program/ | Rates conflict | No official Disneyland, Legoland or Universal program found | Disneyland is the largest single holiday ticket buyer here; Undercover Tourist is the only realistic route, and it would be a separate link, not a rewrite |

**Honest approval view.** Unlikely to need traffic proof: Viator, Fever (no floor stated), Amazon (already in). Impact programs (Ticketmaster, Eventbrite, SeatGeek) review each publisher by hand and can decline a very new site. Approval criteria are not published for most of these, so "likely" means "no stated floor", not a promise.

## 3. Implementation spec (no code written)

**What exists.** `ticketAffiliates: {}` in `public/site-config.js` (about line 95). `affRule`, `isAff`, `affUrl` in `public/app.js` (about lines 868-871). The only place an event link is rewritten is the "Event info" button in the event panel (`public/app.js` about line 851): `href=infoUrl(affUrl(url), ev.n)` with `rel="noopener sponsored"` when `isAff`. Click counting already exists: the global handler at `app.js` lines 49-57 ticks `click:ticket` when the href contains eventbrite, ticketmaster or fever, and `functions/api/visit.js` writes it to `site_hits`. The Shop tab ticks `click:shop`. These edits are uncommitted in the working tree today.

**Rules per host** (values come from the network after approval):
- `"feverup.com": { template: "https://feverup.evyy.net/c/<ACCOUNT>/<CAMPAIGN>/<AD>?u={url}" }` (Impact deep-link form; Fever's exact domain unknown until approved).
- `"eventbrite.com": { template: "https://<eventbrite-impact-domain>/c/<ACCOUNT>/<CAMPAIGN>/<AD>?u={url}" }` only if the Impact program pays per ticket order. If it pays only for organizer sign-ups, add **no rule**.
- `"ticketmaster.com"`: do not add until a Ticketmaster link exists. The current click regex already covers it.
- Viator/GetYourGuide: no rule needed; they need a new link type (see below).
- Parameter-style rules `{ param, value }` suit Eventbrite's classic `aff=` parameter only if Eventbrite supplies one; none is documented.

**Fix needed.** `infoUrl` appends a `#:~:text=` fragment after `affUrl`. For `template` rules the fragment lands on the network redirect URL, not the destination, so it is lost or harmless. Instruction: when `affRule(url).template` exists, skip `infoUrl` and pass the raw wrapped link; for `param` rules keep current order.

**Counting.** Keep `click:ticket` as the total. To tell paid from unpaid, have Rey's counter owner add two keys to `CLICK_KEYS` in `functions/api/visit.js`: `click:ticket-aff` (host has an active rule) and `click:shop`. In the handler, tick `click:ticket-aff` when `a.rel` contains "sponsored". Network dashboards (Impact "clicks") then cross-check ours; expect ours to be 10-30% higher (bots, blocked redirects).

**Disclosure.** Today it exists only in the Support modal ("Some links are affiliate links: we may earn a small commission at no extra cost to you", `app.js` line 889). The FTC items in `legal-research.md` section 3 (clear and conspicuous, "as close as possible" to the claim, not only a footer; 16 CFR 255.5; .com Disclosures) require more:
1. In the event panel, a short line directly under the actionbar, same font size as the facts and not grey-on-grey: "Ticket link: we may earn a commission if you buy." Show it **only** when `isAff(url)` is true. Plain words; do not use "Promoted" or "Presented by".
2. On the Shop tab, a line at the top of the grid and, ideally, under each card heading: "As an Amazon Associate, SoCal Lights earns from qualifying purchases." Amazon's agreement requires its own wording **[secondary; check the Operating Agreement text before launch]**, which the generic sentence does not satisfy.
3. Keep the modal sentence, but it is no longer the primary disclosure.
4. Link a short "How we earn" paragraph to the donate/support page for detail.
5. `rel` values: `noopener sponsored` on every affiliate link (events and shop). Add `noreferrer` only if a network says so; Amazon needs the referrer intact for tracking, so do not add it to Amazon links.
6. Style: a `.aff-note` class in `public/styles.css`; after editing `styles.css` or `app.js`, bump `?v=` in `public/index.html` (currently `styles.css?v=20261105c`, `app.js?v=20261105f`) per CLAUDE.md.

**Other restrictions.** The store apps (`IN_APP`) show external links; Amazon forbids affiliate links in some app contexts, so hide shop affiliate links when `IN_APP` is true **[not verified; check the Operating Agreement]**.

## 4. Revenue realism

Assumptions (all mine; the first is measured):
- Human visits: `site_hits` map views were 12 (Nov 2), 26 (Nov 3). Use **30 map visits/day in the base case, 100 optimistic**. The Cloudflare "450-650 uniques/day" includes bots; I do not use it.
- Season runs about 2026-11-15 to 2027-01-03 (7 weeks), so month-equivalent = 30 days of peak traffic.
- Share of visits that open an event with a ticket-seller link: 73 of 1,242 upcoming events is 5.9%; weight up to 12% because ticketed events are the better-known ones. Event-info clicks per visit among those: 15%.
- Ticket conversion after click: 5% base, 10% optimistic (affiliate benchmarks for ticketing run low single digits; **[secondary]**, no source I can cite precisely). Average order $60 base, $80 optimistic.
- Commission: Fever 6% base, 10% optimistic **[secondary]**. Eventbrite: **0** in the base case (organizer-bounty uncertainty), 5% optimistic. Ticketmaster: none.

| Case | Visits/mo | Ticket clicks | Orders | Ticket commission |
|---|---|---|---|---|
| Base (30/day) | 900 | about 16 | about 0.8 | **$3** |
| Optimistic (100/day) | 3,000 | about 54 | about 5 | **$20** |

Amazon: shop clicks about 3% of visits (27-90 per month); conversion 5-8% on holiday lights; average ticket-line item $35 at 3-4% rate gives about **$1-$4 a month**, and the three-sale test is the real risk.

**Total: about $0-$5 in the base case, up to $25-$30 optimistic, per month.** Even 10x the traffic (Cloudflare's upper bound) is roughly $50-$250. This will not pay for any tool. Payout minimums (Viator $50, Amazon about $10 **[not verified]**) mean the first cash could be months away.

**Leading indicator:** `click:ticket` per day in `site_hits`. Below 5 a day, ticket commissions are noise. At 20 or more a day for two weeks, revisit Ticketmaster/SeatGeek and a Disneyland reseller. A second indicator is the first Impact "approved" email and whether the Eventbrite/Fever dashboard shows an actual per-order rate. A third: first Amazon sale before April 2027.

## 5. Two-week task list

| # | By | Owner | Task |
|---|---|---|---|
| 1 | Nov 5 | CEO | Confirm the `click:ticket` / `click:shop` counters are deployed and receiving data (query `site_hits`). |
| 2 | Nov 5-6 | Rey | Open Amazon Associates; confirm account status and read the current Operating Agreement for the exact disclosure sentence and the 180-day rule. Reply with the wording. |
| 3 | Nov 6 | Rey | Create a free Impact publisher account (used for Fever, Eventbrite, Ticketmaster); apply to **Fever** first. Submit the info below. |
| 4 | Nov 6 | Rey | Apply to Viator (no traffic minimum, direct portal). Only worth doing if the CEO approves adding a "Tours" link type. |
| 5 | Nov 7 | Rey | In Impact's marketplace, open the **Eventbrite** program page and read what it actually pays (ticket buyers or new organizers). Send the CEO a screenshot of the terms. Apply only if it pays per ticket order. |
| 6 | Nov 8-10 | CEO | Add the disclosure lines (section 3, items 1, 2, 6) and the `infoUrl` fix to a branch; do not merge until a rule is live. |
| 7 | Nov 10 | Rey | Apply to Undercover Tourist (ShareASale) for Disneyland tickets, or skip if the CEO prefers not to add a separate link. |
| 8 | On approval | Rey, then CEO | Rey pastes the Impact deep-link URL; CEO adds the rule to `ticketAffiliates`, checks the link in a browser, deploys. |
| 9 | Nov 14 | CEO | Review `click:ticket` after 10 days; report real numbers against section 4. |
| 10 | Nov 17 | CEO | Decide whether affiliate work continues past season. Do not buy through our own links. |

**What Rey needs to apply (same for each application):**
- Business name: Forza-TEK (legal entity name and address as registered; Rey to confirm). Site name: SoCal Lights Finder.
- Site URL: https://socallights.app
- How the site earns: a free events map with no ads or paywall; income comes from a voluntary donate button (Cash App), paid Featured event listings through Stripe (`/feature`), and affiliate links (disclosed next to each link).
- Audience and traffic proof: Southern California families looking for Christmas, Halloween and holiday events; 2,013 events listed, 1,242 upcoming. Cloudflare analytics for the last 30 days (screenshot) and the `site_hits` count. Be candid: tens of human visits a day. Do not quote Cloudflare "uniques" as visitors.
- Content proof: privacy policy and terms URLs, contact email info@socallights.app, and a page showing the disclosure text.
- Payment and tax: W-9 (US), bank or PayPal details for payout.

## What I could not verify
- Eventbrite's real program, terms and whether it pays for ticket purchases (no official page reachable; sources conflict).
- Ticketmaster's current Impact terms (official page blocked); all Impact rates for Fever, SeatGeek and AXS come from aggregators.
- GetYourGuide approval criteria and Amazon's current rate card and exact disclosure sentence (Associates Central pages need a login or JavaScript).
- Whether Amazon's 180-day sales rule is still enforced, and whether Amazon allows affiliate links in the iOS/Android wrapper.
- Any current benchmark conversion rates for ticket affiliates; the percentages in section 4 are assumptions.
