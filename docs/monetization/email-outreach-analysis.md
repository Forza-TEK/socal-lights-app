# Email outreach analysis (installers and contest organizers)

_Outreach analyst, 2026-11-04. Source: the owner's Outlook mailbox, read-only (Sent Items, Inbox, Junk Email), plus public DNS, public pages and the site's public APIs. Nothing was sent, moved or changed. Recipients are described by organization type, role and domain only. "Unverified" means I could not check it from here._

## 1. Volume and timing

**Scope note.** The brief said "from 2026-10-29". The campaign actually began earlier: 30 installer emails went out on the evening of Mon 2026-10-26 (PDT). I widened the search to find them. Counts below cover 2026-10-26 to 2026-11-04 (about 19:40 UTC). Unrelated Forza-TEK business mail from the same mailbox (RFI response, vendor registrations, a 10/22 batch of about 30 city IT-vendor intros, 10/31 B2B follow-ups, a test message) is excluded. I did not read the mailbox before 10/22.

| | Installers | Contest / city / community | Total |
|---|---|---|---|
| First-touch emails | 46 | 80 (incl. 1 city "events feed" email) | **126** |
| Replies typed by the owner | 1 | 6 | 7 |
| Unique recipient addresses | 46 | 80 | 126 |
| Unique recipient domains | 33 | 72 | **104** (4 are free-mail providers) |
| To free-mail (gmail, aol, hotmail, cox) | 16 | 8 | 24 (19%) |

**Per day (first-touch).** Mon 10/26 (PDT): 30 installers. Fri 10/30: 43 contest + 3 installer. Sat 10/31: 21. Sun 11/1: 6. Mon 11/2: 8. Tue 11/3: 6. Wed 11/4: 9.

**Per template version.**

| Version | Subject pattern | Sent | Dates |
|---|---|---|---|
| Inst-v0 | "Free spot for your holiday light work on SoCal Lights" (long, personal opener, "quick review before it goes live") | 30 | 10/26 evening PDT |
| Inst-v1 | same subject, shorter body | 3 | 10/30 |
| Inst-v2 | "Free spot for your installs on SoCal Lights" (plain text, 3 short lines) | 8 | 11/1 to 11/3 |
| Inst-v3 | "Your <City> installs on SoCal Lights" (adds `?ref=inst` and an unsubscribe line) | 5 | 11/4 |
| Cont-v1 | "A free home for the <Contest>, from entries to winners" | 43 | 10/30 |
| Cont-v2 | "A free, easy way to run the <Area> holiday lights contest" | 35 | 10/31 to 11/4 |
| Cont-v3 | "A free map for Calimesa Deck the Streets holiday displays" | 1 | 11/2 |
| Events-feed | "Events feed for SoCalLights.app" (city parks dept.) | 1 | 10/31 |

**Time of day.** Installer wave 0 went out 8:29 to 9:21 PM PDT (evening, Monday). Cont-v1 went out 5:18 to 5:21 AM PDT: 42 emails in about 160 seconds, roughly 15 a minute. Later contest sends were 7:50 to 9:25 AM Pacific, installers about 11 AM to noon. On 10/31, seven emails went out within 30 seconds at noon PDT.

**Segments (126).** Installer 46. City or public agency 50. Chamber, merchants or visitor bureau 2. HOA or community group 26 (13 of them through HOA management companies or individuals' free-mail). Other (local news sites) 2.

**Geography (inferred from city names, approximate).** Installers cover all seven counties (about 12 LA, 9 OC, 7 San Diego, 7 Riverside/San Bernardino, 4 Ventura/Santa Barbara, 2 Coachella Valley, rest unclear). Contest targets skew LA (about 25), OC (about 20), Inland Empire (about 14), with only 3 in San Diego, 1 in Ventura and 3 in Santa Barbara.

## 2. Outcomes (as of 2026-11-04)

| Outcome | Count | Notes |
|---|---|---|
| Bounced | **1** (0.8% of 126) | Installer, 11/2. Exchange 550 5.4.317 "message expired, cannot connect to remote server": the recipient's mail server was unreachable. No other NDRs found (absence is not proof). |
| Positive replies | **4** | 2 city departments (Covina parks director; Eastvale management analyst), 2 installers (one confirmed it would post; the other thanked Rey and the owner answered "that's great to hear"; the inbound message itself was not found in the Inbox) |
| Neutral | 1 | An HOA management company's ticket desk forwarded the pitch to a community manager (auto-ack in 3 min, human note about 35 hours later). Silence since. |
| Auto-reply | 1 | Out of office (an HOA manager) |
| Negative, unsubscribe, "stop", complaint | **0 found** | Junk Email (25 items) holds only unrelated spam. A "no" would normally arrive as a reply, so this is a real zero as far as the mailbox shows. |
| Meetings booked | **2** | Covina Zoom Thu 11/5 3:30 PM; Eastvale Zoom Mon 11/9 2:00 PM. Neither held yet. |

**Reply rate.** Human replies 5 of 126 (4.0%). Positive 4 of 126 (3.2%): installers 2 of 46 (4.3%), contest side 2 of 80 (2.5%). Cont-v1: 2 of 43 positive (4.7%). Cont-v2: 0 of 35 positive, but it is 0 to 4 days old and Eastvale answered after 5 days, so do not conclude v1 beats v2. Inst-v0: 2 of 30. Inst-v2 and v3 (13 sends): 0.

**Response time.** Covina 5 h 44 min (same morning). Eastvale 5 days 4.5 hours (city hall is closed Fridays, so about 3 business days). Installer 3 days 11 hours. Ticket desk 3 minutes (automatic).

**Owner effort.** Covina took 3 manual replies plus a hand-sent Zoom invite; Eastvale 2 manual replies. Two consecutive replies went to the same ticket thread on 11/3.

**Complaint signal that is not a reply.** On 2026-10-31 (20:00 UTC) Microsoft sent a Medium-severity alert to the owner: "Suspicious email sending patterns detected ... User REY@FORZA-TEK.COM has been detected as sending suspicious messages outside the organization and will be restricted if this activity continues." It landed about 45 minutes after a noon burst. See section 4.

**Site conversion (what I could verify).**
- The Cloudflare token was not injected in this session, so the D1 queries (users, installers, contests, `site_hits` ref keys) were **not run: unverified**.
- Public APIs (read-only): `/api/posts` returns 6 homes. One is an installer post (El Segundo, created 10/27 15:33 UTC, about 11 hours after wave 0). The other five are homeowner Halloween posts, none from the campaign list. Created since 10/30: 2 (homeowner, Lake Forest). **Installer posts since 10/30: 0.** `/api/installers` returns `[]`. `/api/contests` returns 1 live contest (an Irvine committee, not on the recipient list). **Contests created from the campaign: 0.**
- The site's own admin digests on 11/3 and 11/4 each say "0 submissions today ... 6 homes live".
- Attribution is mostly impossible: 41 of 46 installer emails and **all 80** contest emails link to the bare homepage with no `?ref=` code. Only the 5 Inst-v3 emails carry `?ref=inst`.

## 3. Template review

Sampled bodies read in full: Inst-v0, v1, v2, v3, Cont-v1 (2), Cont-v2 (2), Cont-v3. Every email in a version shares its template. I did not read the events-feed email.

**Representative business content.**
- Inst-v3: "Love that [specific fact about the company]. I'm Rey, I run SoCal Lights, a map where families find lit-up houses around SoCal. Posting your installs is free for now, with your business name, website and phone number: https://www.socallights.app/add-house?ref=inst. Rey D'Angelo, SoCal Lights, www.socallights.app. If you'd rather not hear from me again, just reply "unsubscribe" and I won't email you again."
- Cont-v1/v2: "I'm Rey, and I run SoCal Lights, a free map that helps families find holiday light displays ... I saw that [organization] runs [contest] ... SoCal Lights can host your whole contest for free: residents submit their homes online and every entry shows on the map; a dashboard shows live vote tallies; People's Choice and Judge's Choice; results ready to share. It takes a few minutes to set up, and I'm happy to walk you through it or set it up with you." Signed "Rey D'Angelo, SoCal Lights, [homepage], info@socallights.app".

**Scorecard (Y = meets, P = partly, N = fails).**

| Rule | Inst-v0 | Inst-v1 | Inst-v2 | Inst-v3 | Cont-v1 | Cont-v2 | Cont-v3 |
|---|---|---|---|---|---|---|---|
| Specific, true opener | P | P | P | P | Y | Y | Y |
| No traffic or audience claim | P | P | Y | Y | P | Y | Y |
| "Free for now", not forever | Y | Y | Y | Y | Y | Y | Y |
| Accurate From and subject | Y | Y | Y | Y | Y | Y | Y |
| **Physical postal address in body** | **N** | **N** | **N** | **N** | **N** | **N** | **N** |
| **Working opt-out in body** | **N** | **N** | **N** | **Y** | **N** | **N** | **N** |
| Tracking link (`?ref=`) | N | N | N | Y | N | N | N |
| Single clear CTA | Y | Y | Y | Y | P | P | P |
| Length (words, approx.) | 120 | 70 | 55 | 60 | 190 | 170 | 190 |
| Format | HTML | HTML | text | text | HTML | text/HTML | HTML |

**Notes behind the scores.**
- **Personalization honesty.** Spot-checks with `curl` against recipients' own sites: three installer openers were confirmed (500+ customers since 2018 in LA and OC; a decade in live-event production; a design consultant visits every home). One was only weakly supported (a permanent-lighting company; "team colors on game night" not found), one not found on the home page (a free design consultation and wreath detail; may be on a subpage), and one contest opener could not be checked because the site is bot-walled. Nothing was clearly false, but several are one-off facts a person had to find. Inst-v0 and Cont-v1 imply an audience ("families use it to plan their nights", "help it reach more families"), which the site's tens of visits a day cannot back. The pitch names no numbers, which is good.
- **Stale claim.** Inst-v0 says "each post gets a quick review before it goes live". The guide and the 11/4 admin digest say posts go live immediately.
- **CAN-SPAM (15 U.S.C. 7704).** From and subject are accurate and not deceptive. **No email contains the sender's postal address.** Only 5 of 126 contain an opt-out (Inst-v3). The mailbox is Forza-TEK but the signature says SoCal Lights, so the sender entity is never named in the body (the owner explained "my parent company, Forza-TEK" to Covina only after a reply).
- **CTA.** Installer CTA is one link. The contest CTA is two things ("walk you through it or set it up with you") with no link to create a contest and no time proposed. Both city replies still asked for a demo, so the offer works; it just costs manual scheduling.
- **Mobile and gateway behavior.** Raw URLs in the body are rewritten by recipients' gateways (Eastvale's copy shows a Barracuda "linkprotect" rewrite), producing very long links. Mixed HTML and plain text across versions.
- **"Warning: Unusual sender" banner.** Eastvale's copy of the first email shows "Warning: Unusual sender <rey@forza-tek.com>. You don't usually receive emails from this address." This is the standard first-contact safety tip for a new external sender; it did not stop that city from replying. A real postal address, a named company and a short plain message reduce the chance a recipient treats it as a threat.
- **Targeting errors.** Mission Viejo's activities department was emailed on 10/30, and Mission Viejo is on the CEO's separate do-not-contact list (that list is dated 11/4, after the send). Four organizations got more than one message: one HOA management company received 3 emails about 3 different communities; one island improvement association got two (one to a personal AOL address); one city got two (a media site and the city). Several city staff also got a Forza-TEK IT-vendor email on 10/22 from the same address, eight days before a holiday-lights email. Recipients may link the two.

## 4. Deliverability

**DNS for forza-tek.com (DNS-over-HTTPS, 2026-11-04).**

| Record | Value | Assessment |
|---|---|---|
| SPF (TXT) | `v=spf1 include:spf.protection.outlook.com -all` | Correct for Microsoft 365, strict |
| DKIM | `selector1` and `selector2._domainkey` CNAME to `...zeraecom.y-v1.dkim.mail.microsoft.` | Present; NDR headers show `dkim=pass`, `spf=pass`, `dmarc=pass` |
| DMARC | `p=reject; pct=100; rua and ruf = rey@forza-tek.com` | Strictest policy. Daily aggregate reports from Google and Yahoo land in the owner's own inbox. |
| MX | `forzatek-com01c.mail.protection.outlook.com` | Microsoft 365 |

The tenant also appears to serve `zerae.com` (the NDR came from a `@zerae.com` Exchange address, and the DKIM targets name `zeraecom`). Whether that shares reputation across the two domains is unverified.

**Risks of cold outreach from the owner's primary business domain.**
1. **Reputation.** A spam-complaint or block-list event on forza-tek.com would also hit the owner's real vendor registrations, bid responses and customer mail. The last month shows heavy government vendor and procurement mail from this address.
2. **Microsoft automatic restriction.** The 10/31 alert is a real warning. If Exchange restricts the user, all outbound mail from that mailbox stops (including bid responses). Limits I know of but did not verify from this session: about 30 messages a minute, and a 10,000 recipients-a-day ceiling for Exchange Online. Cont-v1's burst of about 15 a minute and the 10/22 vendor batch are the kind of pattern that triggers "suspicious sending". Sending continued after the alert with no restriction visible.
3. **Recipient filters.** New-sender banners and gateway link rewriting are already visible. Government and HOA-management mail systems are the strictest. One installer domain's server was unreachable for 10 minutes and the message expired (not a reputation problem).
4. **Brand mismatch.** Brand SoCal Lights, sender domain Forza-TEK.
5. **The site sends its own mail** (sign-in codes and admin digests from `login@socallights.app` through Amazon SES). Cold outreach from the same domain would endanger those too.

**Recommended setup.**
- A separate sending domain or subdomain for outreach, with its own mailbox (for example on a subdomain of socallights.app, kept apart from the `login@` transactional stream, or a clearly branded second domain). Owner decision; I could not check availability.
- SPF, DKIM and DMARC (start at `p=none`, move to `quarantine` after 2 weeks of clean reports) on the new domain. Send DMARC reports to a shared mailbox, not the owner's inbox.
- Warm-up: week 1 up to 10 a day, week 2 up to 20, week 3 up to 30, then a ceiling of 40 a day per mailbox. Spread over the business day with 2 to 6 minutes between sends.
- Throttle: one message per organization, never more than one to the same domain per day, no bursts.
- Bounce handling: any hard bounce goes to the suppression list at once; stop and review if bounces exceed 2% in a day or any complaint arrives.
- Until the new domain is ready, cap sending from forza-tek.com at 15 a day and add the address and opt-out first.

**Could not verify:** inbox-versus-spam placement, any block-list status of forza-tek.com or its IP, Google and Yahoo DMARC report contents (attachments not read), Microsoft's current outbound thresholds, whether other bounces occurred silently, and who owns the domain registration.

## 5. Scale

The owner said: "we don't need to be confirming each event; that would be problematic when scaling nationally." Where the current approach depends on one-by-one human work:

| Manual step today | Why it will not scale | Scalable replacement |
|---|---|---|
| Opener written per company (46 of 46 installers; most contest openers cite a named contest or date) | Researcher time per email; some cannot be verified; a wrong detail damages trust | Merge fields from structured data (city, service type, county, the contest's name from our own events database). A personal line only when a captured source quote and URL exist; otherwise leave it out. |
| Asking organizations to confirm or check events (CEO draft B in `outreach.md`) | One person per event, thousands of events | Remove the ask. Events stay `expected` or `confirmed` per `docs/confirmation-plan.md`; invite organizers to post their own contest or event, nothing more. |
| Owner replying, offering times, sending Zoom invites | 3 turns per lead, all by hand | Reply templates for common questions; one booking link; human only for meeting content and anything not in the fact sheet. |
| One-by-one list building from organization websites | Slow; duplicates (4 orgs were hit twice) | Enrichment from public directories, then a single canonical organization key (domain plus normalized name) checked against a suppression list before every send. |
| No central do-not-contact list, no bounce log, no log of who got which version | Cannot prove opt-outs honored; cannot analyze | One log (sheet now, database table later). |

**Proposed design.**
1. **Data.** One row per organization: segment, city, county, domain, role mailbox, source URL, date found, verified (Y/N), status.
2. **Enrichment sources to evaluate (verify each one's terms first):** state contractor license board lookups (installers, window cleaners, pressure washers), IRS exempt-organization data (HOAs and nonprofits), city and chamber member directories, county and city department pages, the site's own events database (which cities already list a contest).
3. **Segment templates** with merge fields: installer, city or public agency, chamber or visitor bureau, HOA or community group. One CTA each.
4. **Volume ramp.** Follow section 4. At the current 2 to 4% positive rate, 40 sends a day gives about one positive a day; the real constraint is conversion after the reply, not send volume.
5. **Suppression and do-not-contact.** Checked before every send; unsubscribes, "no", bounces and the CEO's separate targets all go on it. Opt-outs honored within 1 business day (the law allows 10).
6. **Triage.** An agent classifies replies; only "interested" and "question outside the fact sheet" go to a human.
7. **Measurement.** `?ref=inst` and `?ref=cont` on every link. Template and A/B arm are tracked in the log (the site counts only the existing ref codes; I did not verify whether it accepts new ones). Funnel: sent, delivered, replied, positive, meeting held, contest or home created.
8. **Human gate.** Owner reviews the first batch of any new template, then spot-checks 10%.

**Legal flags (not legal advice).** CAN-SPAM covers business-to-business email: accurate headers and subject, postal address, working opt-out. California Business and Professions Code 17529.5 targets unsolicited commercial email sent to California addresses and carries per-message statutory damages, so a California-heavy list deserves attorney review. California privacy law (CPRA) can apply to collecting named contacts. Replies from city staff may be public records. Attorney review is needed before national scale. Scraping addresses from sites that forbid it is an aggravated violation under CAN-SPAM, so prefer role mailboxes listed for contact on the organization's own site.

**Instagram and Facebook DMs and comments.** Meta's terms were not verified here. Treat them as high risk: low volume, personalized, human-reviewed, never from a personal account, stop on first "no".
