# City contest meeting kit (reuse for every city, chamber, HOA and neighborhood group)

_Built from the first two meetings (Covina, Eastvale). City-specific facts live in `covina-meeting.md` and `eastvale-meeting.md`. The 12-minute demo script is `docs/contest-demo.md`; the tutorial videos on `/tutorials` show the same steps. Never put Zoom links, passcodes, phone numbers or personal addresses in this repository (it is public)._

## The meeting in one line
Let the organizer drive: by the end of the call their contest exists (or has a date to be created), with their own account as the owner.

## Before the call (15 minutes)
- [ ] Read their last contest's public flyer or page: dates, how residents enter, who judges, prizes, eligibility. Note what is **unconfirmed** and ask about it.
- [ ] Check what we already list for their city on the map (`/in/<city>`): events and homes. Mention one or two real items.
- [ ] **Sign-in test for their email system.** City and school mail gateways often quarantine unknown senders. Plan A: they sign in with their work email (a 6-digit code from `login@socallights.app`). Ask them in advance to check junk and quarantine, or to allow that sender. Plan B: use a personal Google account just for setup and add the city address as a co-organizer. A contest made with an email at the organization's own website is marked verified; any other is live but flagged for a quick Admin check before it can buy Featured.
- [ ] Have `socallights.app/add-contest` open, the poster and yard-sign printables ready, and one tutorial video queued as a backup if the network is slow.
- [ ] Do **not** build a practice contest on the live site: every contest goes live on the map at once.

## What cities liked most
From the Covina call (Nov 5): the **driving routes** (nine stops at a time, Google or Apple Maps) and the **judging module** (emailed ballot link, judges drive the homes in order). Lead the demo with a route to real homes, then the judge ballot, then contest creation. Cities that already run their own registration will want to **enter the homes themselves** (paste a list of addresses): ask early whether they have a registration list.

## Agenda (20 minutes)
1. Their goals and how last year went (3 min). Ask before showing.
2. They share their screen and create the contest with our guidance (10 min). The wizard's Quick start takes about three minutes.
3. Judges, voting, results, printables (4 min).
4. Dates, who does what, follow-up (3 min).

## What to ask
- Dates for entries, judging or voting, and winners. Who is the contest owner of record?
- Residents only? (Use "I review each entry first" so staff can check addresses.)
- Judges, public vote, or both? How many judges, and do they visit in person?
- Prizes: who provides them, and what is the approximate value? (The law wants the approximate value stated in the rules.)
- Rules: do they have their own text? (Paste it into the wizard; our default is only a starting point and has not been reviewed by a lawyer.)
- Accessibility and language needs. Privacy limits: public street addresses, minors, photo releases.
- Who else should be on the call or the account (a second staff member, the parks district)?

## Honest answers
- **Cost:** (Updated 2026-11-09: organizers pay from the first contest; the City of Eastvale recommended charging.) Residents enter and vote for free, with no entry fees and no paid votes, and payment never affects who wins. The organizer chooses a contest pass: a single contest, up to 5 contests in a 12-month window, or up to 20; more than 20, contact us. Prices are on socallights.app/pricing and in `functions/_lib/passes.js`; say them only once the new pricing is live. Admin can give a founding partner contests for a period. Never say "free forever".
- **Public vs private:** entries appear on the public map with the address the resident enters. A resident who deletes their account is removed from live data and scrubbed from the locked results.
- **Integrity:** one vote per person per category tied to a verified email; throwaway addresses blocked; no self-voting; counts hidden until winners are announced; results lock when announced; judges vote on their own ballot and can recuse.
- **Rules and prizes:** recommend their attorney reads the rules before launch.
- **Accessibility:** do not claim WCAG compliance. An internal audit found basics still to fix; offer a dated follow-up.
- **Support and reliability:** email info@socallights.app; the site is monitored every 15 minutes. Quote no uptime or traffic numbers.
- **Data:** the organizer can export entries and results as a spreadsheet.

## Do not say
Traffic or audience numbers; endorsements or partnerships that are not true; anything about 2027 plans; "free forever"; that a lawyer has reviewed our rules.

## Same day after the call
Send a short follow-up: what was agreed, their dates, the link `socallights.app/add-contest?ref=cont`, the poster and yard-sign printables, and our contact. Log the outcome (organization, date, result) in `docs/monetization/outreach.md`. Ask permission before describing them publicly.

## Scaling note
A city contest should take staff minutes, not days: the repeatable path is a short call, the organizer creates their own contest, we answer questions by email. Every manual step we repeat three times should become a template, a help article or a product change.
