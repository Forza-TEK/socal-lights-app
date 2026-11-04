# Guide for the Grok outreach agents (installers and contest organizers)

_CEO, 2026-11-04. Goal of the campaign: more lit-up houses on the map so families have more places to see lights. This file lists what is true and safe to say, the tracking links to use, the rules to follow, and what the CEO measures. Hand it to the agents as their fact sheet._

## 1. Two groups, one goal
| Group | Who | The ask | Where to send them |
|---|---|---|---|
| Installers | Christmas-light installers, plus window cleaners, pressure washers and home-service companies that hang lights | Post the installs you have done, free | `https://socallights.app/add-house?ref=inst` (choose "A professional installer") |
| Contest organizers | City departments, chambers, HOAs, neighborhood and community groups | Host your decorating contest or light tour on SoCal Lights | `https://socallights.app/add-contest?ref=cont` |

Use the `?ref=` ending on every link the agents send. It counts anonymous landings so the CEO can see what the campaign brings. Other codes: `?ref=pub` (press and publishers, used by the CEO's own outreach) and `?ref=soc` (social posts).

## 2. What is true today (each item checked in the code or the live site on 2026-11-04)
**For installers**
- Posting is free. The post goes live right away (unless it trips the spam checks) and shows on the map and in the house list.
- The installer gets a profile page (`socallights.app/installer/<name>`) listing the company, service area, phone, website and every home it posted.
- A "Call for a quote" button on the profile and on each home.
- Say "free to post". Do NOT say "free forever" or "always free": paid options for installers are planned and nothing is promised.

**For contest organizers**
- Creating a contest is free. Residents enter their home, neighbors vote, and the organizer can invite judges.
- Awards: People's Choice (public votes) and Judges' Choice (judges). One or both.
- A contest page, a QR code, a printable poster and yard sign, an organizer dashboard, and results emailed to entrants.
- One vote per person per category; nobody can vote for their own home; vote counts can be hidden until winners are announced.
- A contest from an organizer whose email matches the contest's website goes live at once (a city address such as `name@city.gov`). Any other email, including Gmail, is held until the site owner approves it. Say "reviewed and approved quickly", never "instant".

**About the site**
- A free map of Southern California holiday lights and events: 1,244 upcoming listings in 266 cities.
- Anyone can add an event or a home for free.

## 3. Do not say
- Any number of visitors, "thousands of families", or "popular". The site has tens of visits a day; claims must not outrun that.
- That SoCal Lights provides prizes, money or sponsors. Prizes come from the organizer.
- That installers will receive leads, customers or exclusive territory. None is promised.
- Prices or future paid plans for any offer.
- That the site is endorsed by, or partnered with, a city, company or media outlet, unless it is true and named.
- "No ads": not supported by anything in the repository.
- Any reference to winning being influenced by payment. Payment never affects who wins a contest.
- Anything about votes being sold, or entry fees. There are none.

## 4. Rules for every channel
**Email (CAN-SPAM applies, including to business-to-business email).** Verified in the statute (15 U.S.C. 7704) and the FTC's guide:
- The From, Reply-To and subject must be accurate and not misleading.
- Include a valid physical postal address of the sender.
- Include a clear way to opt out, and honor an opt-out within 10 business days. Keep a do-not-contact list and never message a name on it again.
- Source: https://www.law.cornell.edu/uscode/text/15/7704 and https://search.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
**Contact forms.** Fine to use; follow the same honesty rules and one message per organization.
**Instagram and Facebook DMs and comments.** I could not open Meta's terms from this environment, so treat this as unverified: automated or high-volume DMs and repetitive comments are a common reason accounts get restricted. Rules for safety: a person reviews the batch before it goes out; low daily volume; personalized, not copy-pasted comments; no replies to someone who says no or ignores a first and second message; never use the CEO's or owner's personal account. Check Meta's current terms before scaling.
**General.** One first message and at most one polite follow-up per target. Stop immediately on "no". Never send two campaigns to the same organization (the CEO's press and city outreach is separate: see `outreach.md`; do not contact Mom's LA, Enjoy OC, Pasadena Now, Mission Viejo MVAC, Riverside, Santa Barbara Waterfront).
**Stop rule.** If any platform warns, restricts or blocks an account, pause that channel and tell the owner the same day.

## 5. Funnel check (live, 2026-11-04)
| Page | Result |
|---|---|
| `/add-house` (installers post here) | Loads, 0.3-0.7 s (one timeout during a deploy, then fine) |
| `/add-contest` (organizers) | Loads; sign-in with Google or email code is on |
| `/add`, `/add-event`, `/contests`, `/help`, `/in/<city>` | Load |
| `/installers` and `/installer` | Show the map, not a landing page: send installers to `/add-house?ref=inst`, not these |

Known friction: a contest created with a free-mail address waits for approval (Admin, Contests). Someone must approve these quickly or the pitch breaks. Ask organizers to use their official email where they have one.

## 6. Scoreboard (CEO reports from the live database)
Baseline 2026-11-04: homes on the map 6, installer profiles 1, live contests 1, user accounts 5, votes 0, judges 0.
Daily, the CEO reads: homes, installer profiles, contests (live and waiting), accounts, and landings by `ref` (ref:inst, ref:cont, ref:pub, ref:soc), and reports changes. The campaign succeeds when homes and contests rise, not when messages are sent.

## 7. Replies and logging
Route every reply that needs a person to rey@forza-tek.com. Log each target (name, channel, date, outcome) so no organization is contacted twice. Keep the log in the shared tracking sheet the owner already uses and mirror the status in `docs/monetization/outreach.md`.
