# Outreach targets and send-ready copy (nothing sent)

_Product and Marketing, 2026-11-04. Turns `outreach.md` into a researched package. Every contact below was read on a page I opened (URL given). `UNCONFIRMED` means I could not verify it; I never guessed an address. Database facts come from read-only SELECTs against the live D1 on 2026-11-04._

## 0. The numbers we may quote (live database, 2026-11-04)

| Fact | Value | Note |
|---|---|---|
| Upcoming listings (end date today or later) | **1,244** | 579 confirmed, 665 expected; 798 are free |
| Cities with an upcoming listing (each has `/in/<city>`) | **266** | checked: 10 sample pages return 200 |
| By county (listings / cities) | LA 374 / 109; Orange 297 / 37; San Diego 169 / 39; Riverside 152 / 29; San Bernardino 121 / 31; Ventura 67 / 10; Santa Barbara 64 / 11 | Inland Empire = Riverside + San Bernardino = 273 |
| Upcoming listings that link to Eventbrite or Fever | **73** (70 Eventbrite, 3 Fever, 0 Ticketmaster) | |
| Listings that cite a target publisher's page as source | Enjoy OC 38, Mom's LA 13, Patch 8, Secret LA 4, Pasadena Now 2 | usable as a true "we already credit you" line |
| Free add-event page | https://socallights.app/add-event (200) | |

### Assumptions in `outreach.md` that failed (fix before sending)
1. **"2,000+ events (1,254 confirmed)"** counts every row ever stored (2,013), including finished Halloween and past events. What a visitor sees: **1,244 upcoming, 579 confirmed**. All copy below uses those.
2. **"84 ticket links to Eventbrite, Ticketmaster or Fever"**: 84 is all-time (81 Eventbrite, 3 Fever, 0 Ticketmaster). **73 are upcoming.**
3. **"Every event links to its official page"** is only partly true. All 1,244 have a URL, but at least 82 point to a media or aggregator page (Enjoy OC, Macaroni Kid, Patch, NBC, CBS and similar). Copy below says "links to the page we found it on".
4. **City event counts are inflated by decorated homes.** 180 of the 1,244 upcoming listings are private contest homes (Mission Viejo: 47 of 54; Ladera Ranch: 18 of 22), mostly from last year's winner lists with expected dates. Ask MVAC to confirm them after its Dec 11 winners release, and say "54 listings" only with that context.
5. **Draft A's "No ads" and "fixed within a day"** have no evidence in the repo; removed. Only "free", "links to the source page" and "I'll correct it" are kept.
6. **Publisher articles are stale or competing.** LAist's guide is dated Nov 29, 2024; ABC7's page metadata says Dec 2019; Patch's California call for photos is from Dec 2024. San Diego Family says it created its own Map of Christmas Lights over 30 years ago, so we pitch as complement. LAist's `tips@laist.com` is for news tips, not listings.
7. **Offering free Featured assumes someone can switch it on by hand** (`events.featured`, `featured_until`). Owner: confirm the admin can do this before Draft C goes out. The Stripe path is still unproven (`data-2026-11-04.md`).

## 1. Publishers (12; 11 verified, 1 unverified)

| # | Outlet | Page to be added to (opened unless noted) | How to submit (opened) | Editor / section | Status |
|---|---|---|---|---|---|
| 1 | **Mom's LA** | "See Christmas Lights and Decorations in Los Angeles", marked "Updating now for 2026": https://momsla.com/where-to-see-holiday-lights-in-los-angeles/. Also linked, not opened: https://momsla.com/tree-lighting-ceremonies/ | Contact page https://momsla.com/about/contact-us/ lists **Sarah@MomsLA.com** (Sarah Auerswald, co-founder; in the page's meta description). Tracy Fredkin's address is obfuscated: UNCONFIRMED. No tip form found; the Advertise page is paid, avoid | Sarah Auerswald, run MomsLA with Tracy Fredkin (https://momsla.com/about/) | Verified |
| 2 | **San Diego Family Magazine** | Their own "San Diego's Best Map of Christmas Lights" (they say they built it first, 30+ years ago, with homeowner connections): https://www.sandiegofamily.com/things-to-do/san-diego-s-best-map-of-christmas-lights. Page still says "come back next year for 2026" | Contact form (name, email, phone required): https://www.sandiegofamily.com/component/rsform/form/88-contact-us?Itemid=119; phone 619-685-6970. Event form (for an organizer's own event): https://www.sandiegofamily.com/component/rsform/form/3-event-submission?Itemid=119 | No editor named: UNCONFIRMED. Pitch as a complement, not a replacement | Verified |
| 3 | **LAist** (Explore LA, Best Things To Do) | "Where to catch holiday light displays in Southern California" (Yusra Farzan, Nov 29, 2024): https://laist.com/news/los-angeles-activities/holiday-light-displays-in-southern-california-guide. Weekly roundup: https://laist.com/news/arts-and-entertainment/best-things-to-do | General contact https://laist.com/about-us/contact-us. `tips@laist.com` is for newsworthy tips only (https://laist.com/news/laist-story-tip-how-to). `events@laist.com` and `bestthingstodo@laist.com` appear in page source of https://laist.com/events with no stated purpose: UNCONFIRMED | Editor UNCONFIRMED | Verified (low fit) |
| 4 | **Only In Your State** | Search shows https://www.onlyinyourstate.com/experiences/california/best-christmas-lights-socal (**not opened**) | Site returns 403 to automated fetch and its host does not resolve in WebFetch. Contact and submission route: UNCONFIRMED | UNCONFIRMED | **Unverified; owner checks by hand or skips** |
| 5 | **The Atlas Heart** | "15 BEST Christmas Lights in Orange County [2026 Guide]", by Taylor Neal, last updated May 27, 2026, includes the Mission Viejo contest: https://theatlasheart.com/best-christmas-lights-in-orange-county/. LA guide: https://theatlasheart.com/best-christmas-lights-in-los-angeles/ (search result, not opened) | Form: https://theatlasheart.com/contact/. `hello@theatlasheart.com` is in the site's structured data. Site owner Mimi McFadden (https://theatlasheart.com/about/). Affiliate-funded blog | Taylor Neal (OC byline) | Verified |
| 6 | **ABC7 (KABC)** | "Holiday light displays in Southern California" by ABC7.com staff, "share with #abc7eyewitness": https://abc7.com/post/holiday-light-displays-in-southern-california/5676165/ (page metadata date 2019-12-16) | Tip form: https://abc7.com/news-tips-submit-a-tip-contact-abc7-abc7eyewitness/27721/. Editorial email UNCONFIRMED (`pr@abc7.com` is on the page, press-relations only) | None named | Verified (stale page) |
| 7 | **Patch** (Temecula, Inland Empire) | "Where Are The Best Holiday Lights In Temecula?" (Kat Schuster, Dec 4, 2024): https://patch.com/california/temecula/where-are-best-holiday-lights-temecula-0. Statewide: https://patch.com/california/across-ca/where-are-best-holiday-lights-california | The 2024 call says email photos to **kat.schuster@patch.com**. Whether she handles 2026: UNCONFIRMED. Anyone can post to the events calendar: https://patch.com/info/posting-instructions (Patch sells "Featured" events at $2 a day, so it is also a competing promoter) | Kat Schuster, Patch Staff | Verified for 2024 only |
| 8 | **OC Register** (SCNG) | Holiday-lights article: UNCONFIRMED (site search is script-rendered) | https://www.ocregister.com/contact-us/ : story suggestions **local@ocregister.com** or 714-796-7984. Entertainment, "Food and Events, Orange County": Brock Keeling, bkeeling@scng.com; features editor Jeffrey Miller, jsmiller@scng.com (same page) | Brock Keeling | Verified contacts, article unconfirmed |
| 9 | **Pasadena Now** | No holiday-lights roundup opened. Section: https://www.pasadenanow.com/weekendr/events-entertainment/ (the "best events this weekend" URL I tried returned a 404 page) | Homepage popup: "E-mail press release to **Editor@PasadenaNow.com**"; breaking-news tips (626) 737-8486 ext. 7 (https://pasadenanow.com/main/) | Editor desk | Verified contact, article unconfirmed |
| 10 | **Press-Enterprise / Inland Empire (SCNG)** | No article found (pe.com search is script-rendered) | https://www.ocregister.com/contact-us/ lists "Inland Empire events": Charlie Vargas, 951-368-9318, cvargas@scng.com | Charlie Vargas | Verified contact, article unconfirmed |
| 11 | **Enjoy Orange County** | "Best Neighborhoods to See Christmas Lights in Orange County 2026", by Heidi Deal, updated Oct 29, 2026: https://enjoyorangecounty.com/best-neighborhoods-christmas-lights/ | Form "event tip or story idea": https://enjoyorangecounty.com/contact-enjoy-orange-county/ | Heidi Deal (author) | Verified |
| 12 | **Secret Los Angeles** | "18 Places To See Christmas Lights In Los Angeles (2025)": https://secretlosangeles.com/best-places-holiday-lights-around-la/ | Contact link `mailto:la@secretmedianetwork.com`; "List your event" goes to https://business.feverup.com/ (Fever sells tickets, three of our listings are Fever) | None named | Verified |

Daily Pilot: homepage fetch failed (HTTP 000), so it is not a verified target. Discover Los Angeles and Visit Newport Beach returned 403.

### Two-sentence pitches (numbers from the database)
| # | Pitch |
|---|---|
| 1 Mom's LA | SoCal Lights is a free map with 374 upcoming Los Angeles County listings across 109 cities, and 13 of them already link to MomsLA pages as their source. Could your holiday-lights guide mention our free [Los Angeles page](https://socallights.app/in/los-angeles) (30 listings) or [Pasadena](https://socallights.app/in/pasadena) (22)? |
| 2 SD Family | We list 169 upcoming San Diego County events in 39 cities, including 48 in [San Diego](https://socallights.app/in/san-diego); we see it as a companion to your Map of Christmas Lights, not a replacement. If useful, I can send the list for any neighborhood your map does not cover. |
| 3 LAist | Our free map has 374 upcoming Los Angeles County listings (579 confirmed region-wide of 1,244), each linking to the page we found it on. For Best Things To Do or an updated lights guide, [Long Beach](https://socallights.app/in/long-beach) (19) and [Pasadena](https://socallights.app/in/pasadena) (22) are examples of the city pages. |
| 4 OIYS | SoCal Lights lists 1,244 upcoming events across 266 cities, free to use. (Hold until contact is found.) |
| 5 Atlas Heart | Our Orange County pages list 297 upcoming events in 37 cities, such as [Newport Beach](https://socallights.app/in/newport-beach) (25) and [Dana Point](https://socallights.app/in/dana-point) (24). Your OC guide could add them as a free, dated reference for readers who want the current-year schedule. |
| 6 ABC7 | We list 1,244 upcoming holiday and seasonal events across Southern California (374 LA, 297 Orange, 169 San Diego, 273 Inland Empire), free to use. If your lights roundup would like a dated, mappable companion, we can supply listings by county. |
| 7 Patch | [Temecula](https://socallights.app/in/temecula) alone has 25 upcoming listings (15 confirmed), and Riverside County has 152 across 29 cities. Happy to send Patch's local editors the data behind a lights or holiday roundup. |
| 8 OC Register | 297 upcoming Orange County events across 37 cities, free to browse, for example [Newport Beach](https://socallights.app/in/newport-beach) (25) and [Anaheim](https://socallights.app/in/anaheim) (15). For a holiday events story, I can send the list by city. |
| 9 Pasadena Now | [Pasadena](https://socallights.app/in/pasadena) has 22 upcoming listings, [Arcadia](https://socallights.app/in/arcadia) 16 and [Altadena](https://socallights.app/in/altadena) 11, and 2 link to Pasadena Now stories. Free for readers, and I'll correct anything wrong. |
| 10 PE / IE | Riverside and San Bernardino counties together have 273 upcoming listings in 60 cities, including [Riverside](https://socallights.app/in/riverside) (34), [Redlands](https://socallights.app/in/redlands) (15) and [Rancho Cucamonga](https://socallights.app/in/rancho-cucamonga) (14). I can send the Inland Empire list for an events roundup. |
| 11 Enjoy OC | 38 of our upcoming Orange County listings already credit Enjoy OC pages as their source. Our free [Ladera Ranch](https://socallights.app/in/ladera-ranch) and [Mission Viejo](https://socallights.app/in/mission-viejo) pages (22 and 54 listings, mostly decorated homes) may suit your lights-by-neighborhood guide. |
| 12 Secret LA | 4 of our Los Angeles County listings cite Secret LA pages; we list 374 upcoming in the county, free. Could your lights guide point readers to our free [Los Angeles page](https://socallights.app/in/los-angeles) (30)? |

## 2. Cities (top 10 by upcoming listings)

| # | City (listings) | Page listing their holiday events (opened) | Where our link belongs | Public contact (opened) | 3 of their events to confirm |
|---|---|---|---|---|---|
| 1 | **Mission Viejo** (54; 47 are homes) | MVAC (Activities Committee) https://mvactivities.com/ | https://mvactivities.com/all-mvac-events-1/home-lighting-contest/ (tour directions; winners' addresses go up Dec 11) | https://mvactivities.com/contact-us-2/ ; **mvac@missionviejo.gov**; 949.830.7066 (Tue-Fri 10 to 2) | Santa's Workshop at Santa's Village (Dec 2-20); Mission Viejo Holiday Lights Tour (Dec 11 to Jan 1); Gifts & Goodies Holiday Boutique (Nov 21) |
| 2 | **San Diego** (48) | Parks & Rec calendar https://www.sandiego.gov/park-and-recreation/event-calendar; fall flyer PDF linked on the Parks page | Same calendar page (no events-page owner named) | https://www.sandiego.gov/contact (form; email UNCONFIRMED) | Dia de los Muertos at Memorial Pool (Nov 7); Turkey Trot Race at Penn Athletic Field (Nov 14); Harvest Festival at Memorial Recreation Center (Nov 21). City-run content is thin; most San Diego holiday listings are private venues |
| 3 | **Riverside** (34) | Community calendar https://riversideca.events/ | Submit a Community Event: https://riversideca.events/coordinator-portal/ | **CommunityCalendar@RiversideCA.gov** (mailto on the page); callcenter@riversideca.gov | Goeske Holiday Festival (Nov 21); Riverside Snow Day at Bordwell Park (Dec 5); Breakfast with Santa at Hunt Park (Dec 12) |
| 4 | **Los Angeles** (30) | El Pueblo (city dept) https://elpueblo.lacity.gov/articles/events-el-pueblo ; RAP https://www.laparks.org/ | Weak fit: few city-run holiday events | El Pueblo: eptours@lacity.org, (213) 485-6855; RAP.PublicInfo@lacity.org (both on their pages); Grand Park form https://grandparkla.org/contact-us/ | Las Posadas on Olvera Street (Dec 16-24, listed under Downtown L.A.); NYELA at Gloria Molina Grand Park (Dec 31); Kwanzaa Parade & Festival, Leimert Park (Dec 26) |
| 5 | **Temecula** (25) | https://temeculaca.gov/1425/Holiday-Fun (also lists a Holiday Home Decorating Map opening Nov 2026) | Same page, next to the home-decorating map | City main line 951-694-6444, Community Services https://temeculaca.gov/1628/Community-Services ; email UNCONFIRMED | Santa's Electric Light Parade (Dec 4); Temecula Christmas Tree Lighting (Nov 30); Santa's Arrival & Visits at Pennypickle's Workshop (Nov 27 to Dec 20) |
| 6 | **Newport Beach** (25) | Boat Parade site, hosted by the Commodores Club of the Newport Beach Chamber: https://www.christmasboatparade.com/ | Its Ring of Lights page https://www.christmasboatparade.com/enter-your-home/ or the Viewing pages | Media page https://www.christmasboatparade.com/media/ : Erin Rose erose@newportbeachandco.com (949.467.2758); Megan Johns megan@newportbeachandco.com; Jeff Parker (Chamber) jparker@newportbeach.com (949.729.4408) | Newport Beach Christmas Boat Parade (Dec 16-20); Balboa Island Ring of Lights Homes (Dec 1-31, expected); Santa Strolling Lido Marina Village (Nov 28 to Dec 20) |
| 7 | **Dana Point** (24) | Harbor management https://danapointharbor.com/holidays-at-the-harbor/ (the city's own site returned 403) | Same Holidays at the Harbor page | https://danapointharbor.com/contact/ : **info@danapointharbor.com** "for on-site event or media opportunities"; (949) 388-3663 | Harbor After Dark: Holiday Edition (Nov 12 to Dec 17); Dana Point Boat Parade of Lights (Dec 11-13); Santa Paws Pet Photos at Dana Point Harbor (Dec 12-13) |
| 8 | **Santa Barbara** (23) | City Waterfront page https://santabarbaraca.gov/things-do/waterfront/waterfront-news-and-events/santa-barbara-parade-lights | Same page (Parade of Lights, 40th year, Dec 13) | Angela Rodriguez, Waterfront Public Information Officer, **ARodriguez@SantaBarbaraCA.gov**, (805) 897-1962 (on that page) | Santa Barbara Parade of Lights (Dec 13); Downtown Santa Barbara Holiday Parade (Dec 4); Holiday Festival of Trains at the Maritime Museum (Dec 12-13). The last two are not city events (santabarbaraca.com pages) |
| 9 | **Pasadena** (22) | Visit Pasadena (destination bureau, not the city; the city site was not opened) https://www.visitpasadena.com/events/annual-events/holidayfest/ | Its "Submit An Event" page https://www.visitpasadena.com/events/add-event/ | Form on that page. `cb@visitpasadena.com` and `cvb@visitpasadena.com` appear in page source, role UNCONFIRMED | Holidayfest on South Lake Avenue (Dec 5); Pasadena Symphony Holiday Candlelight (Dec 11-12); Castle Green Holiday Tour (Dec 13) |
| 10 | **Ladera Ranch** (22; 18 are homes) | Community site https://laderalife.com/events/winter-fest-564 (unincorporated; no city) | Its Events page | `contact.larcs@laderalife.com` and `contact.larmac@laderalife.com` listed on the event page; what they are: UNCONFIRMED | Ladera Ranch Winter Fest (Dec 5); Ladera Ranch Festival of Lights Menorah Lighting (Dec 6); Holiday Decorating Contest homes (Dec 3-15; source https://laderalife.com/events/holiday-decorating-contests-602) |

## 3. Event organizers for free Featured (15 picks, all upcoming, all paid or ticketed except where noted)

Organizer names come from each Eventbrite event page's organizer field. Public contact route is the organizer's Eventbrite profile (public; direct email UNCONFIRMED) unless a site I opened is given. Excluded: Redlands Feast of Lights (page says tickets sold out), and Joshua Tree's own `jtcc.org` (that domain is a tennis group, not the organizer). Site link format: `https://socallights.app/#e-<id>`.

| # | Event id | Event, city | Dates | Host | Organizer and contact |
|---|---|---|---|---|---|
| 1 | `lightscape` | Lightscape, Encinitas | Nov 20 to Jan 3 | Fever | San Diego Botanic Garden: https://sdbg.org/contact-us/ (form; Public Events ext. 213) |
| 2 | `lg-tinkerbell-neverland-scbg` | Tinker Bell's Neverland, Palos Verdes Estates | Nov 13 to Jan 3 | Fever | South Coast Botanic Garden Foundation: https://southcoastbotanicgarden.org/contact-us/ |
| 3 | `autry-santas-winter-wonderland` | Santa's Winter Wonderland at the Autry, Los Angeles | Dec 5 | Fever | Autry Museum: https://theautry.org/about-us/contact-us (link seen, page not opened) |
| 4 | `redondo-beach-hot-chocolate-nutcracker` | The Hot Chocolate Nutcracker, Redondo Beach | Dec 12 | Eventbrite | The Debbie Allen Dance Academy: https://www.eventbrite.com/o/the-debbie-allen-dance-academy-27273137871 |
| 5 | `san-pedro-city-ballet-nutcracker` | San Pedro City Ballet: The Nutcracker, San Pedro | Dec 11-13 | Eventbrite | San Pedro City Ballet: https://www.eventbrite.com/o/san-pedro-city-ballet-35815786733 |
| 6 | `santa-clarita-cube-christmas-carol` | A Christmas Carol on Ice, Santa Clarita | Dec 11-12 | Eventbrite | The Cube Santa Clarita: 661-257-2823 (https://www.thecubesantaclarita.com/); https://www.eventbrite.com/o/the-cube-santa-clarita-35880546903 |
| 7 | `whittier-breakfast-at-the-north-pole` | Breakfast at the North Pole, Whittier | Dec 6 | Eventbrite | The Rose Gardens: https://www.eventbrite.com/o/the-rose-gardens-53729118403 |
| 8 | `van-nuys-hanukkah-on-ice` | Hanukkah on Ice, Van Nuys | Dec 6 | Eventbrite | Camp Gesher Family Programming: https://shalominstitute.com/contact (linked from campgesher.org); https://www.eventbrite.com/o/camp-gesher-family-programming-18407542095 |
| 9 | `torrance-mom-said-yes-real-snow` | Winter Wonderland: Real Snow, Torrance | Dec 5 | Eventbrite | Mom Said Yes Pizza Torrance: https://www.eventbrite.com/o/mom-said-yes-pizza-torrance-115707475071 |
| 10 | `long-beach-sugar-spice-dessert-fest` | Sugar & Spice Holiday Dessert Festival, Long Beach | Dec 19 | Eventbrite | Axiom Productions, LLC: https://www.eventbrite.com/o/axiom-productions-llc-76312744883 |
| 11 | `palm-springs-sweet-soul-christmas` | Sweet Soul Christmas, Palm Springs | Dec 10 | Eventbrite | Take Five Entertainment: https://www.eventbrite.com/o/take-five-entertainment-36314292013 |
| 12 | `palm-desert-clare-college-choir` | Christmas with Clare College Choir, Palm Desert | Dec 10 | Eventbrite | Music at St. Margaret's: https://www.eventbrite.com/o/music-at-st-margarets-31513050951 |
| 13 | `temecula-holiday-pop-up-market` | Temecula Holiday Pop Up Market, Temecula | Nov 28-29 | Eventbrite | River City Events Group: https://www.eventbrite.com/o/river-city-events-group-121265022476 |
| 14 | `riverside-festival-of-trees-fair` | Festival of Trees Holiday Fair, Riverside | Nov 28 | Eventbrite | RUHS Foundation: https://ruhsfoundation.org/contact ; Foundation@RUHealth.org (on that page) |
| 15 | `joshua-tree-spirit-of-christmas` | The Spirit of Christmas: Joshua Tree Philharmonic, Joshua Tree | Dec 18 | Eventbrite | Joshua Tree Cultural Center: https://www.eventbrite.com/o/joshua-tree-cultural-center-108592909301 |

I did not re-check ticket availability on the day; confirm before sending 4 to 15.

## 4. Installers (10 public business pages, all opened)

| # | Company | Area | Website | Public contact |
|---|---|---|---|---|
| 1 | Light Up My Holiday | Orange, all SoCal | https://lightupmyholiday.com/ | (949) 484-5864; email form on Contact page; 1015 W Hoover Ave, Orange |
| 2 | SoCal Light LLC | Orange County, LA, San Diego | https://socallight.com/ | (949) 787-3828; info@socallight.com (in page source); "free estimate" form |
| 3 | Holiday Light Installations | Southern California; Paramount HQ | https://www.holidaylightinstallationsco.com/ | 562-850-3235; info@holidaylightinstallations.com; quote form |
| 4 | Elegant Outdoor Lights | LA, Malibu, Pasadena, OC, Ventura | https://www.elegantoutdoorlights.com/ | (310) 499-8814; info@elegantoutdoorlights.com (in page source) |
| 5 | Christmas Brothers | LA-based, commercial and residential | https://www.christmasbrothers.com/ | (310) 773-9857; info@christmasbrothers.com; https://www.christmasbrothers.com/contact/ |
| 6 | Let Us Hang | All SoCal | https://www.letushang.com/ | (888) LET-HANG; text (714) 224-8956. Footer says 2022, may be stale |
| 7 | Trimlight Conejo Valley (permanent lighting dealer) | Ventura County, Santa Barbara | https://trimlight.com/locations/santa-barbara | (805) 420-7807; Get a Quote form |
| 8 | Bespoke Holiday Lighting | Ventura County | https://bespoke-holiday-lighting.pages.dev/ | 805-892-6031; /contact page. The site sits on a `pages.dev` address, own domain UNCONFIRMED |
| 9 | All Occasions Lighting (Temecula) | Inland Empire, Temecula, OC | https://40871f05.all-occasions-lighting.pages.dev/ | (951) 526-7119; preview-style address, own domain UNCONFIRMED |
| 10 | Squeegee Squad San Diego (franchise) | San Diego | https://squeegeesquad.com/san-diego-ca/residential/holiday-lighting/ | Quote form or phone on the page |

**Note, not a target:** *SociaLights* (San Diego, Oelo permanent-lighting dealer) has a name close to ours. Oelo's dealer page for it (https://www.oelo.com/sociallights-outdoor-permanent-christmas-lights-san-diego) now says "the page you are looking for is no longer here", so its status is unclear. Do not contact it for installer talks; if anyone confuses the brands, say we are unrelated. Not verified: The Christmas Light Guy Co and Outdoor Lighting Perspectives (both pages returned 403).

## 5. Final copy (first three targets of each type, send-ready)

Signature on all: **Rey, Forza-TEK, SoCal Lights, socallights.app**. Pitches claim no traffic, no endorsements.

### Draft A, publishers

**A1. Mom's LA** to Sarah@MomsLA.com
Subject: A free map of SoCal holiday lights and events you could link to

Hi Sarah,
I run SoCal Lights (socallights.app), a free map of holiday lights and seasonal events across Southern California. We list 374 upcoming Los Angeles County events in 109 cities, for example https://socallights.app/in/los-angeles (30 events). Each lists dates, hours, price and address, and links to the page we found it on; 13 of them link to MomsLA pages.
If your readers would find it useful, we'd be glad to be a resource on "See Christmas Lights and Decorations in Los Angeles". If you'd like the data for a roundup, tell me which cities and I'll send it. Anyone can add an event for free at socallights.app/add-event.
Thank you,
Rey

**A2. Enjoy Orange County** via https://enjoyorangecounty.com/contact-enjoy-orange-county/
Subject: Free Orange County lights map that already credits Enjoy OC

Hi Enjoy OC team,
I run SoCal Lights (socallights.app), a free map of holiday lights and seasonal events in Southern California. We list 297 upcoming Orange County events in 37 cities, and 38 of them link to Enjoy OC pages as the source. Examples: https://socallights.app/in/ladera-ranch and https://socallights.app/in/mission-viejo.
If it would help readers of "Best Neighborhoods to See Christmas Lights in Orange County 2026", we'd be glad to be a resource. I can send listings for any city you choose. Anyone can add an event for free.
Thank you,
Rey

**A3. Pasadena Now** to Editor@PasadenaNow.com (press-release address)
Subject: Free map of Pasadena-area holiday events: 22 in Pasadena, 11 in Altadena

Hello,
SoCal Lights (socallights.app) is a free map of holiday lights and seasonal events across Southern California. Pasadena has 22 upcoming listings (https://socallights.app/in/pasadena), Arcadia 16 and Altadena 11, each linking to the page we found it on; 2 link to Pasadena Now stories.
If it suits your events coverage, a mention or link is welcome, and I can send the Pasadena-area list. Tell me anything out of date and I'll correct it.
Thank you,
Rey

### Draft B, cities

**B1. Mission Viejo MVAC** to mvac@missionviejo.gov
Subject: Is your holiday event listed correctly on SoCal Lights?

Hello MVAC team,
SoCal Lights (socallights.app) is a free public map of holiday lights and events across Southern California. We list Mission Viejo's events here: https://socallights.app/in/mission-viejo (54 listings, 47 of them decorated homes from earlier contest lists).
Could you check these three: Santa's Workshop at Santa's Village (Dec 2-20), Mission Viejo Holiday Lights Tour (Dec 11 to Jan 1) and Gifts & Goodies Holiday Boutique (Nov 21)? Reply with corrections, or add an event free at socallights.app/add-event. After your Dec 11 winners release I'd like to replace last year's homes with the new ones. A link from your Holiday Home Lighting Contest page would help residents find everything in one place.
Thank you,
Rey

**B2. Riverside** to CommunityCalendar@RiversideCA.gov
Subject: Is your holiday event listed correctly on SoCal Lights?

Hello,
SoCal Lights (socallights.app) is a free public map of holiday lights and events across Southern California. We list Riverside's events here: https://socallights.app/in/riverside (34 upcoming).
Could you check Goeske Holiday Festival (Nov 21), Riverside Snow Day at Bordwell Park (Dec 5) and Breakfast with Santa at Hunt Park (Dec 12)? Each links back to riversideca.events. Reply with corrections or add events free at socallights.app/add-event. If you have a holiday page, a link to ours helps residents find everything in one place.
Thank you,
Rey

**B3. Santa Barbara Waterfront** to ARodriguez@SantaBarbaraCA.gov
Subject: Is the Parade of Lights listed correctly on SoCal Lights?

Hi Angela,
SoCal Lights (socallights.app) is a free public map of holiday lights and events across Southern California. We list Santa Barbara's events here: https://socallights.app/in/santa-barbara (23 upcoming), including the Santa Barbara Parade of Lights on Dec 13, linked to your city page.
Could you check the date, times and location? Reply with corrections. We also list Downtown Santa Barbara Holiday Parade (Dec 4) and Holiday Festival of Trains (Dec 12-13); if you know who runs those, I'd welcome a pointer. A link from your Parade of Lights page would help residents find everything in one place.
Thank you,
Rey

### Draft C, event organizers (free Featured offer; Featured keeps its label)

**C1. Lightscape** via https://sdbg.org/contact-us/
Subject: Your Lightscape is on SoCal Lights, want it featured?

Hello Public Events team,
We list Lightscape (Nov 20 to Jan 3) on SoCal Lights, a free map of Southern California holiday events: https://socallights.app/#e-lightscape. It links to your ticket page.
We're opening five free Featured placements (gold pin, top of the city list, labelled "Featured") for the next 30 days. In return I'd ask permission to share how many people tapped through to your event page, so we can learn whether Featured is useful. I can't promise results. If you're interested, reply and I'll switch it on, and tell me anything out of date on the listing.
Thank you,
Rey

**C2. Tinker Bell's Neverland** via https://southcoastbotanicgarden.org/contact-us/
Subject: Your Tinker Bell's Neverland is on SoCal Lights, want it featured?

Hello,
We list Tinker Bell's Neverland: An Illuminated Adventure (Nov 13 to Jan 3) on SoCal Lights, a free map of Southern California holiday events: https://socallights.app/#e-lg-tinkerbell-neverland-scbg. It links to your ticket page.
We're opening five free Featured placements (gold pin, top of the city list, labelled "Featured") for the next 30 days. In return I'd ask permission to share how many people tapped through to your event page. I can't promise results. If you're interested, reply and I'll switch it on, and tell me anything on the listing that's out of date.
Thank you,
Rey

**C3. Santa's Winter Wonderland at the Autry** via https://theautry.org/about-us/contact-us
Subject: Your Santa's Winter Wonderland is on SoCal Lights, want it featured?

Hello,
We list Santa's Winter Wonderland at the Autry (Dec 5) on SoCal Lights, a free map of Southern California holiday events: https://socallights.app/#e-autry-santas-winter-wonderland. It links to your ticket page.
We're opening five free Featured placements (gold pin, top of the city list, labelled "Featured") for the next 30 days. In return I'd ask permission to share how many people tapped through to your event page. I can't promise results. Reply if you're interested and I'll switch it on; tell me anything out of date.
Thank you,
Rey

### Draft D, installers (a conversation, not a sale)

**D1. Light Up My Holiday** via the email form at https://lightupmyholiday.com/ or (949) 484-5864
Subject: 15 minutes to ask how you find holiday-lighting customers

Hello Light Up My Holiday team,
I run SoCal Lights, a free map of holiday lights across Southern California where homeowners and installers can show their work. Before I build anything for installers, I want to understand what you do today: where your customers come from, what a lead costs you, and what a booked job is worth.
Could we talk for 15 minutes this week? I'm not selling anything. If it helps, your company can have a free profile page on the site.
Thank you,
Rey

**D2. SoCal Light LLC** to info@socallight.com: same text, greeting "Hello SoCal Light team".
**D3. Holiday Light Installations** to info@holidaylightinstallations.com: same text, greeting "Hello Holiday Light Installations team".

## 6. One-week sending plan (Thu Nov 5 to Wed Nov 11)

Rules: owner approves each send; **max 4 messages a day**; one polite follow-up per target, 5 business days after the first message, then stop; never send two drafts to the same organization; log replies in the table below and in `outreach.md`.

| Day | Send (max 4) | Why now |
|---|---|---|
| Thu Nov 5 | Mom's LA, Enjoy OC, Pasadena Now, Mission Viejo MVAC | Confirmed channels; MVAC's Dec 11 winners release comes soonest |
| Fri Nov 6 | Riverside, Santa Barbara Waterfront, Patch (Kat Schuster), San Diego Family form | Confirmed email or form |
| Sat Nov 7 | Nothing | Weekend |
| Mon Nov 9 | Lightscape, Tinker Bell's Neverland, Autry, Temecula (phone or city contact page; email UNCONFIRMED) | Only after the owner confirms the admin can set Featured |
| Tue Nov 10 | Installers D1 to D3, Atlas Heart form | Installer talks are planned for December; Atlas Heart's guide was last updated in May, so a pitch now may still land |
| Wed Nov 11 | LAist form, ABC7 tip form, OC Register (local@ocregister.com), Press-Enterprise (cvargas@scng.com) | Larger outlets; low odds, no urgency |
| After week 1 | Secret LA, Newport Beach (Boat Parade media contacts), Dana Point, Pasadena (Visit Pasadena form), Ladera Ranch, organizers 4-15 in batches of 4, installers 4-10 | Follow-ups on Nov 12 start with the Nov 5 group |

**Best first sends** (confirmed contact, true hook, time-sensitive): Mission Viejo MVAC, Mom's LA, Enjoy OC.

### Tracking table (copy to the Status log in `outreach.md` as replies arrive)

| # | Target | Type | Route used | Planned | Sent (date, by) | Follow-up due | Reply | Next step |
|---|---|---|---|---|---|---|---|---|
| 1 | Mom's LA | Publisher | Sarah@MomsLA.com | Nov 5 | | | | |
| 2 | Enjoy OC | Publisher | web form | Nov 5 | | | | |
| 3 | Pasadena Now | Publisher | Editor@PasadenaNow.com | Nov 5 | | | | |
| 4 | Mission Viejo MVAC | City | mvac@missionviejo.gov | Nov 5 | | | | |
| 5 | Riverside | City | CommunityCalendar@RiversideCA.gov | Nov 6 | | | | |
| 6 | Santa Barbara Waterfront | City | ARodriguez@SantaBarbaraCA.gov | Nov 6 | | | | |
| 7 | Patch (Kat Schuster) | Publisher | kat.schuster@patch.com | Nov 6 | | | | |
| 8 | San Diego Family | Publisher | contact form | Nov 6 | | | | |
| 9 | Lightscape (SDBG) | Organizer | sdbg.org form | Nov 9 | | | | |
| 10 | Tinker Bell's Neverland | Organizer | scbg form | Nov 9 | | | | |
| 11 | Autry Santa's Winter Wonderland | Organizer | autry contact | Nov 9 | | | | |
| 12 | Temecula | City | city phone / page | Nov 9 | | | | |
| 13 | Light Up My Holiday | Installer | email form / phone | Nov 10 | | | | |
| 14 | SoCal Light | Installer | info@socallight.com | Nov 10 | | | | |
| 15 | Holiday Light Installations | Installer | info@holidaylightinstallations.com | Nov 10 | | | | |
| 16 | Atlas Heart | Publisher | contact form | Nov 10 | | | | |
| 17 | LAist | Publisher | contact form | Nov 11 | | | | |
| 18 | ABC7 | Publisher | tip form | Nov 11 | | | | |
| 19 | OC Register | Publisher | local@ocregister.com | Nov 11 | | | | |
| 20 | Press-Enterprise (IE) | Publisher | cvargas@scng.com | Nov 11 | | | | |
