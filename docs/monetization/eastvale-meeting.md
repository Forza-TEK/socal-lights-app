# Eastvale walkthrough: Monday, November 9, 2026, 2:00 PM

_Prepared by the CEO session, 2026-11-04. The first organizer to answer the contest outreach. Confirmed in the owner's mailbox: the City of Eastvale's management analyst wrote "We are interested in this platform!", asked for a Zoom, and then accepted **Monday Nov 9 at 2:00 PM**. **The Zoom invitation was sent on Nov 4 and the city replied.** Use `city-contest-meeting-kit.md` for the agenda, honest answers and the sign-in plan (city email systems may quarantine the sign-in code). Nothing below has been sent to the city._

## What we know, and what we do not
| Fact | Source / status |
|---|---|
| Contact: the City's management analyst (CPRP, MPA), Eastvale city hall | Reply in the owner's mailbox |
| The Community Services inbox got our first email on Oct 30 | Sent mail |
| In 2020 the contest was run by the Jurupa Community Services District (JCSD) Parks and Recreation with the City; entrants emailed their name and address; deadline Dec 15 | Web search snippet; **2020 only** |
| No 2025 or 2026 announcement was found | **Unconfirmed: ask for this year's dates and rules** |
| The city website refuses automated visits (403) | Checked |
| Our map has one Eastvale listing: JCSD Winter Wonderland and Tree Lighting, Dec 5, marked "expected" | Database |
| An email at the city's own domain matches the city's website, so a contest they create goes live as verified and can buy Featured | `trustOf` in the code |

## Goal of the meeting
1. Eastvale creates its 2026 contest on SoCal Lights (or agrees dates and a day to create it together).
2. JCSD Parks and Recreation is brought in (ask Amanda to invite them or share their contact).
3. A link to the contest from the city's or JCSD's events page.
4. Permission to describe the contest publicly afterwards. Do not ask for money, and do not mention Featured unless they ask.

## Agenda (20 minutes)
1. Their goals and last year's process (3 min). **Ask before showing.**
2. Live walkthrough (10 min), using `docs/contest-demo.md` (run of show) in this order: create the contest, a resident enters, approve and start voting, judges, public voting, announce, the permanent results page (`/past`).
3. Their questions (4 min).
4. Next steps and dates (3 min).

## Questions to ask them
- Are you running the Holiday Decorating Contest this year? Dates for entries, voting and winners?
- Who runs it: the City, JCSD, or both? Who must approve what residents see?
- How do residents enter today? Photos, forms, an email address? How many entries do you get?
- Judges, public vote, or both? Prizes, and who provides them?
- Does the city attorney review contest rules? (Our rules text is a starting point and is editable, or they can paste their own.)
- Accessibility and language needs (for example Spanish)?
- Any privacy limits: should street addresses be public, are minors involved, do you need photo releases?

## Honest answers to the likely questions
- **Cost.** Free for now. No entry fees and no paid votes, ever; payment never affects who wins. Paid extras may be added later and would be optional. Do not promise "free forever".
- **Who sees the homes?** Entries appear on the public map with the street address the resident enters (the same as the Past results). Residents can delete their account and their entry is removed from live data and scrubbed from the locked results.
- **Voting integrity.** One vote per person per category, tied to a verified email; throwaway email domains blocked; nobody can vote for their own home; counts are hidden until winners are announced; results lock when announced.
- **Prizes and rules.** The city supplies prizes. The law requires stating the prize's approximate value; our default rules text still says prizes have no cash value, **so have the city set its own rules text, or edit it, before launch**. Recommend city attorney review. We have not had a lawyer review our template.
- **Accessibility.** Be honest: an internal audit found basics still to fix (some labels, contrast, heading structure). Do not claim WCAG compliance. Offer a follow-up list and a date.
- **Data and exports.** The organizer can export entries and results as a spreadsheet.
- **Support and reliability.** Email info@socallights.app; the site is monitored every 15 minutes. Do not quote uptime numbers.
- **Traffic.** Do not quote visitor numbers. Say the site is new and that the contest page and QR code are what bring residents.

## Do not say
Traffic or audience claims; that installers or sponsors are involved; that the city is endorsing us; "free forever"; anything about 2027 plans.

## Before Monday (CEO and owner)
- [x] Owner: Zoom invitation for Nov 9 at 2:00 PM sent. Still to ask: whether JCSD Parks and Recreation should join.
- [ ] CEO: build a demo contest in the **preview environment** (not the live map): 8 sample homes, votes, two judges, an announced contest, so the walkthrough shows real-looking results. Say the word and I will build it.
- [ ] CEO: fix the top accessibility basics from the UX audit before the meeting (combobox role on search, `<main>` on the Add pages, contrast on the Live tab).
- [ ] Owner: decide whether to offer to create the contest for them during or right after the call.
- [ ] CEO: rules wording: prepare a city-friendly default that states the prize value (needs attorney review before the city relies on it).

## After the meeting
Send a short follow-up the same day: what we agreed, the dates, the link to `socallights.app/add-contest?ref=cont`, the poster and yard-sign printables, and our contact. Log the outcome in `docs/monetization/outreach.md`.
