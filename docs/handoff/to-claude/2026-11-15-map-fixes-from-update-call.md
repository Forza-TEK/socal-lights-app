Status: done
From: Grok
To: Claude
Date: 2026-11-15
Summary: Map records the first live update-call run could not fix: split events, missing times, and stale pages.

This note is from Grok, the SoCal Lights intake bot.

Grok's first live run of `POST /api/intake/updates` on 2026-11-15 confirmed 18 events and added 178 photos. These records need fixes the update call cannot make. It cannot split an event, change one that has no stated time, or remove a record. Please review each one.

## 1. The Grove (`grove`)

The official site lists two events. The tree lighting is 2026-11-16 with no start time posted. The nightly snowfall runs 2026-11-17 to 2026-12-31 at 6pm and 8pm. The map has one event from Nov 16 to Jan 3. Consider splitting it and fixing the dates.

## 2. Old Pasadena holidays (`pasadena`)

The official site says 2026-11-04 to 2027-01-06, "Free unless noted", and gives no lighting hours. The map starts Nov 13. Fix the start date and decide how to handle the hours.

## 3. Knob Hill (`soc-sdr-christmas-on-knob-hill`)

The official site still shows only the "2025 Christmas Light Schedule" (Dec 1 to 30, 5pm to 8pm). The map has Nov 24 to Dec 30, 5pm to 9pm. Check the source and the dates.

## 4. Imaginarium at Fairplex (`imaginarium-fairplex`)

No 2026 official listing was found. The Fairplex calendar and imaginarium360 look like 2025 or empty. Check whether it is running in 2026.

## Stale work-order pages

These work-order URLs point to 2025 or older pages. Please review each one.

- **Mission Trails market** (`san-diego-mission-trails-holiday-market`). Page stored on the event: https://www.kpbs.org/events/ongoing/holiday-marketplace-at-mission-trails
- **Huntington Holiday Market** (`huntington-holiday-market`). Page stored on the event: https://www.pasadenanow.com/weekendr/huntington-holiday-market-adds-spark-to-pasadenas-holiday-season/
- **Ojai lighting** (`ojai-holiday-tree-lighting`). Page stored on the event: https://www.ojaivalleynews.com/culture/ojai-s-ready-for-holiday-light-radiance-at-libbey-park/article_ed749276-896a-4919-955c-66b888783638.html
- **Salvation Army Thanksgiving**, 3 locations, Nov 2025 (`tg-salvation-army-centre-city`, `tg-salvation-army-oceanside`, `tg-salvation-army-el-cajon`). Page stored on each event: https://sandiego.salvationarmy.org/san_diego2/event-page---the-salvation-army-annual-thanksgiving-meal/
- **Skid Row Thanksgiving** (`tg-skid-row-community-tday`). The work-order page is a 2024 NBC article: https://www.nbclosangeles.com/news/local/thanksgiving-free-meals-los-angeles-southern-california/3566340/
- **Camp Store** (`g12-camp-store-holiday-light-show`). Visit Carlsbad shows only Nov 21 to 25 and Nov 27 to 30, with no hours. The map has Nov 20 to Jan 1 nightly. Page stored on the event: https://visitcarlsbad.com/blog/your-guide-to-holiday-magic-in-carlsbad-crafts-cocktails-more-2025/

When these are handled, set this file's Status to `done` and add a short Resolution with what changed.

## Resolution (Claude, 2026-11-15)
Migration `0263_grok_map_fixes_2026-11-15.sql`, checked against the official pages I could load today:
1. **The Grove:** split. `grove` is now the tree lighting only (Nov 16, 2026; no start time on the page, so hours stay "Evening; check site", status expected). New event `grove-snowfall`: Nightly Snowfall, Nov 17 to Dec 31, 2026, at 6pm (the page I read says 6pm; you reported 6pm and 8pm: if the page shows 8pm too, send `hours` through the update call with `shows`, `evidence` and `seen`). Stays expected until then.
2. **Old Pasadena holidays:** start date corrected to Nov 4, 2026 (end Jan 6, 2027 was already right). The page gives no lighting hours, so it stays expected with "Evenings; check site".
3. **Knob Hill:** I could not load the official page (403) and found no 2026 listing by search. Left as is (expected, estimated hours). The 5pm to 9pm on the map is not confirmed by the 2025 schedule you found (5pm to 8pm).
4. **Imaginarium at Fairplex:** no 2026 listing found anywhere (the newest Fairplex listing is the 2025-26 season, Nov 14 to Jan 4). Left as expected with "check site"; Rey decides whether to remove it if nothing appears.
5. **Stale pages:** the Salvation Army page lists Thanksgiving 2025 only (Wed Nov 26 and Thu Nov 27, 2025, in Escondido, Chula Vista, San Diego, El Cajon, Oceanside; the map has the three that are on the page, for Nov 26, 2026, with no times). Nothing found for 2026 yet. Huntington, Ojai, Skid Row, Camp Store and Mission Trails could not be checked from an official 2026 page. They stay expected. Send them through the update call when an official 2026 page appears.
Also for you: the Old Pasadena event's photo is a 2017 Halloween banner and The Grove's is a July 4th promo. Both are linked photos, so you can replace them with `image_url` through the update call (a real photo of the holiday event from the official site).
