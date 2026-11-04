# Outreach pack (drafts, nothing sent)

_CEO, 2026-11-04. Every message below is a draft for the owner to approve and send. Facts are from the live database and site on 2026-11-04. Do not add claims about visitors or traffic: the site's own counter shows about 20-50 human visits a day and we do not quote numbers we cannot back up._

## Our honest pitch in one line
A free map of Southern California holiday lights and events: 1,244 upcoming listings (579 confirmed) across 266 city pages, with a free way to add yours. Use these numbers, not the all-time row count (2,013), which includes past events. Facts verified in `outreach-targets.md`.

## Priority list (cheapest links and supply first)
| # | Target | Ask | Why |
|---|---|---|---|
| 1 | Mom's LA, San Diego Family Magazine, LAist, Only In Your State | Link to or mention the city-page map as a resource; offer our event data for their roundups | They rank for the queries we want; one link from them is worth more than weeks of waiting |
| 2 | City parks and recreation departments and chambers (Mission Viejo, San Diego, Riverside, Los Angeles, Newport Beach, Temecula, Dana Point) | Check that their events are right; link to the city page from their holiday page | Strongest event counts; the people whose events we list |
| 3 | Patch editors and local TV/newspaper holiday-lights roundups | A story pitch: "a free map of 1,200+ upcoming SoCal holiday events" | Links and real human visits |
| 4 | Event organizers with ticketed events (73 upcoming events link to Eventbrite or Fever) | Free Featured placement for 5 organizers in exchange for permission to quote their click counts | Proves the Featured product with real data |
| 5 | Installers | Five 15-minute conversations: what do you pay per lead today? No payment asked | Prices are hypotheses until we hear this |
| 6 | HOAs and neighborhood groups with a lights tradition (see `docs/contest-leads.md`) | Run a free neighbor contest on the site | Supply of homes and votes |

## Draft A: publisher or writer (Mom's LA, San Diego Family, LAist, Only In Your State)
Subject: A free map of SoCal holiday lights and events you could link to

Hi [name],

I run SoCal Lights (socallights.app), a free map of holiday lights and seasonal events across Southern California. We list [N] upcoming events, with a page for each of [N] cities, for example [your city page, such as https://socallights.app/in/mission-viejo]. Each lists dates, hours, price and address, and every event links to its official page.

If your readers would find it useful, we'd be glad to be a resource on your [holiday lights article]. If you'd like the data behind a roundup, tell me which cities and I'll send it. Anyone can add a display or event for free.

It is free to use and to add an event. If anything is wrong, reply and I will correct it.

Thank you,
Rey
Forza-TEK, SoCal Lights

## Draft B: city parks and recreation or chamber
Subject: Is your holiday event listed correctly on SoCal Lights?

Hi [name],

SoCal Lights (socallights.app) is a free public map of holiday lights and events across Southern California. We list [city]'s events here: https://socallights.app/in/[city]

Could you check the dates, times and addresses? You can reply with corrections or add an event yourself for free at socallights.app/add-event. If you have a holiday events page, a link to ours helps residents find everything in one place.

Thank you,
Rey
Forza-TEK, SoCal Lights

## Draft C: event organizer (Featured placement)
Subject: Your [event name] is on SoCal Lights, want it featured?

Hi [name],

We list [event name] on SoCal Lights, a free map of Southern California holiday events: [event link on the site].

We're opening five free Featured placements (gold pin, top of the city list) for the next 30 days. In return, I'd ask permission to share how many people tapped through to your event page, so we can learn whether Featured is useful. If you're interested, reply and I'll switch it on. Anything on the listing that's out of date, tell me and I'll fix it.

Thank you,
Rey

## Draft D: installer (conversation, not a sale)
Subject: 15 minutes to ask how you find holiday-lighting customers

Hi [name],

I run SoCal Lights, a free map of holiday lights across Southern California where homeowners and installers can show their work. Before I build anything for installers, I want to understand what you do today: where your customers come from, what a lead costs you, and what a booked job is worth.

Could we talk for 15 minutes this week? I'm not selling anything. If it would help, your company can have a free profile page on the site.

Thank you,
Rey

## Rules for sending
- The owner approves and sends; nothing goes out automatically.
- Replace every bracketed field with a real fact. Do not guess a number.
- Never quote traffic. Say what the site has: events, cities, free to use.
- Featured placements given free must still carry the Featured label.
- Log every reply in this file so the next session knows where each conversation stands.

## Status log
| Date | Target | Sent by | Reply |
|---|---|---|---|
| | | | |

## Corrections from the research pass (2026-11-04)
- Use 1,244 upcoming listings (579 confirmed) and 266 city pages. Do not say "2,000+".
- Say events link to "the page we found it on", not "official page": at least 82 point to media or aggregator pages.
- Do not claim "no ads" or "fixed within a day": nothing in the repo supports either.
- About 180 upcoming listings are decorated homes, many from last year's winners lists; say so when a city's count is mostly homes.
- Free Featured (Draft C) has no admin button. To comp a placement, add a new migration (`UPDATE events SET featured=..., featured_until=...`, see `docs/monetization.md`); the refund code will not wipe a hand-applied placement. Ask the CEO session to write it.
- Full target list, contacts, the 12 send-ready emails and the one-week plan are in `outreach-targets.md`. Best first sends (Thu Nov 5): Mission Viejo MVAC, Mom's LA, Enjoy Orange County.
