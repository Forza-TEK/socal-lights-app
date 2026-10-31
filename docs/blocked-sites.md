# Sites that refuse automated visitors

Checked 2026-10-31. These sites answer **403 Access Denied** to our honest bot requests (User-Agent `SoCalLightsBot`, with a contact URL), even for `robots.txt`. The Whittier sites are behind Akamai bot protection (`server: AkamaiGHost`), which turns away cloud and data-center traffic whatever the User-Agent. Anthropic's own fetch tool is refused too. Setting the cloud network to Full does not help: the block is on the site's side.

**Rule: never try to get around it** (no spoofed browsers, no proxies, no retries after a 403). Log the host here and use another route.

## Routes that work
1. **Partner and second-hand pages that list the same events:** chambers of commerce, business associations, museums, historical societies, libraries, school districts, Patch, local papers, Macaroni Kid editions (the Norwalk edition covers Whittier), MomsLA, SceneOC. These are often easier to read and are public.
2. **Search-result snippets.** A web search often shows the page's title, date and place without loading it. Use them to find a date, then confirm on a page that loads.
3. **Last year's page pattern.** A search snippet for a blocked page can show last year's date. If an event repeats on a known pattern and no 2026 page exists, add it as `expected` with the date estimated from prior years and say so in the blurb (see `docs/updating-events.md`).
4. **Ask the city.** Email the events or IT contact and ask for (a) an events feed (iCal/RSS) or monthly event list, or (b) to allow `SoCalLightsBot` through. The owner sends it; the reply (a feed URL, or a PDF) is then added to this file.
5. **A person opens the page.** The owner opens the page in a normal browser and pastes the text or a screenshot into the chat. That is allowed and works every time.

## Email to send (owner's address; edit the greeting)
> Subject: Events feed for SoCalLights.app (free community events map)
>
> Hello, I run SoCalLights.app, a free public map of holiday, Halloween and community events across Southern California. We would like to list your city's events (tree lighting, parades, Halloween and holiday events) and link back to your pages. Your website currently blocks our automated reader (403 Access Denied, Akamai), so we cannot see your calendar. Could you either (1) send us an iCal/RSS feed or a monthly events list, or (2) allow our reader, identified as "SoCalLightsBot (+https://socallights.app)", through your site protection? Either would help your events reach more people. Thank you! Rey D'Angelo, info@socallights.app

## Blocked hosts
Bot = our scheduled, unattended cloud runs. Chrome = the owner's own Chrome driven by Claude in Chrome (checked 2026-10-30; see `docs/browser-pass.md`).

| Host | Bot | Chrome (2026-10-30) | Alternate sources | Ask sent? |
|---|---|---|---|---|
| cityofwhittier.org, whittierprcs.org | Akamai 403 (also robots.txt) | loads; 2026 events found (tree lighting Dec 1, Cookies with Santa Dec 5); no 2026 parade page | whittierchamber.com events, whittiermuseum.org, Macaroni Kid Norwalk, Patch | no |
| santamonica.com | 403 | loads (search `?mySearch=<word>&page-num=1`, event pages `/event/<slug>/`) | chambers, local papers, Patch | no |
| cityofhawthorne.org | 403 | loads; calendar has no seasonal events Nov-Jan | chambers, local papers | no |
| weho.org | 403 | loads; Halloween Carnaval page under `/community/events-in-the-city/`; no Nov-Jan calendar page found | chambers, local papers | no |
| culvercity.gov | 403 (some pages) | loads; events directory shows only the Veterans flag display | chambers, local papers | no |
| cityofinglewood.org | 403 | loads (`/calendar.aspx?view=list&year=2026&month=11`) | chambers, local papers | no |
| carlsbadca.gov | 403 | loads (Parks & Recreation special events pages list Dec 5 Holiday at the Rancho) | carlsbad-village.com, visitcarlsbad.com | no |
| chulavistaca.gov | 403 | loads (`/residents/advanced-components/site-content/city-calendar/-curm-12/-cury-2026`) | chambers, local papers | no |
| cityofperris.org | 403 | home page loads; full calendar page not found; Veterans Celebration Nov 7 lists only "Downtown D Street" | local papers | no |
| eastvaleca.gov | 403 | home page loads; "Full Calendar" opens a calendarwiz.com RSS feed that Chrome needs a site permission to read (not granted yet) | local papers | no |
| lacounty.gov, parks.lacounty.gov | 403 or no connection | home loads; events page errors (eventON setting), no events found | LA County Parks flyers via news | no |
| cityoflahabra.org / lahabraca.gov | no connection | lahabraca.gov home loads; no events page found | Brea/La Habra papers | no |
| Axios, Macaroni Kid (some editions) | 403 | not tried | same event on the organizer's own page | n/a |

Sites that **do** load: rivlib.libcal.com, library.sbcounty.gov (see `docs/sweep-methods.md`), santafesprings.gov, pico-rivera.org, norwalkca.gov, cityoflamirada.org, lahabraheights.org, whittierchamber.com, whittiermuseum.org.
