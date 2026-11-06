# Legal redlines for attorney review (2026-11-04)

**I am an AI research analyst, not a lawyer. This is not legal advice.** These are proposed text changes for a California attorney to approve, reject or rewrite. Nothing here has been applied; no site file was edited. "Statute says" means a quotation taken from `docs/monetization/legal-research.md` (the research brief), which quotes mirrored statute text that the attorney must confirm is current. "My reading" is my interpretation and may be wrong. CURRENT text is quoted from the repo at the file and line shown (lines as of 2026-11-04). Where the brief did not quote a statute, I say so and do not paraphrase it as law.

Tags: **SHIP NOW** = low-risk copy fix that makes the site more accurate and cannot plausibly create new exposure; the CEO may apply it before the attorney replies. **WAIT** = needs the attorney first.

---

## Summary for the attorney (10 lines)

1. Product: free map of holiday events; free organizer-run home-lighting contests (free entry, free voting, judge and/or popular vote, sponsor-donated prizes); paid "Featured" event placements (Stripe, web only); Amazon affiliate shop; installer directory with "Get a quote" lead forms. Operated by Forza-TEK. No paid votes, no entry fees.
2. Highest risk: the privacy policy says "We do not show ads" and "We do not sell your information or share it with advertisers" while the site sells Featured placements, shows sponsor logos and emails quote requests to installers (items 2, 5).
3. Contest rules say "Prizes have no cash value" while B&P 17539.1(a)(6) (quoted in brief) bars failing to disclose "exact nature and approximate value" of prizes (item 1).
4. The word "Sponsor" means the organizer in the rules and terms but means a paying logo sponsor on contest pages (item 1).
5. "Featured" is not on the FTC's list of clearly understood ad terms; one FAQ claims it already prevents deception (item 3).
6. Installer profiles and quote forms may be "advertising" under B&P 7027.1; we show no license information at all (item 4).
7. Quote-lead checkbox does not name what the installer may do, does not mention the organizer (contest version), and is not separate from account creation (item 5).
8. Terms are silent on paid placements, refunds, sponsor roles and affiliate links (item 6); a Finance refund policy is being drafted and is referenced by placeholder.
9. Open questions I could not answer from the brief: whether entry requires "valuable consideration" (email sign-in), skill vs chance for popular votes, out-of-state eligibility, minors, Apple 5.3.1 (organizer vs developer sponsorship).
10. Requested from you: approve or rewrite each PROPOSED text; answer the OWNER/ATTORNEY DECISION lines; tell us which items must wait for a lead or sponsor product launch.

---

## Risk ranking

| Rank | Item | Why | Tag |
|---|---|---|---|
| 1 | 2A. Privacy "no ads / do not sell or share" lines | Misstatement in our own policy; B&P 22576 (per brief) makes breaching a posted policy a violation | SHIP NOW (narrowing copy) |
| 2 | 1A/1B. Prize value disclosure and "no cash value" | 17539.1(a)(6),(7) | SHIP NOW for wording; field needs code |
| 3 | 5. Quote-lead consent | CCPA "consent" definition; "sale" question | Checkbox text SHIP NOW; paid-lead model WAIT |
| 4 | 4. Installer listings, B&P 7027.1 | Criminal misdemeanor provision (per brief); unknown classification | WAIT |
| 5 | 3. Featured / sponsor / affiliate labels | FTC native-ad guide; B&P 17200/17500 | SHIP NOW (labels) |
| 6 | 1C. "Sponsor" naming conflict | Confusion about who "conducts" the contest | SHIP NOW (rename), existing contests unaffected |
| 7 | 6. Terms: paid placements, refunds, sponsors | Gaps, not misstatements | WAIT (needs Finance refund policy) |
| 8 | 1D. Free-entry / no-purchase language, Apple | Mostly sound; consideration question open | Apple clause keep; rest WAIT |
| 9 | 2B. CalOPPA completeness items | Missing DNT and shared-categories statements | SHIP NOW (additions) |

---

## 1. `public/rules.js` (contest rules template)

### 1A. Prize disclosure

CURRENT (`public/rules.js:15`): "8. Prizes. ${w.prizeMode === "one" && w.prize ? "Prize: " + w.prize + "." : w.prizeMode === "each" ? "Prizes for each award are listed on the contest page." : "Any prize is announced by the Sponsor."}${w.sponsor ? " Provided by " + w.sponsor + "." : ""} The Sponsor (not SoCal Lights) provides and is responsible for the prizes. Prizes have no cash value, cannot be transferred, and may be replaced with one of equal value. Winners are responsible for any taxes. A prize not claimed within 14 days of notice may be given to another entrant."

PROPOSED:
"8. Prizes. [If no prize: No prize is offered in this contest.] [If a prize: Prize: ${w.prize}. Approximate retail value: $${w.prizeValue}. Provided by ${w.sponsor}. The Organizer will deliver every prize described on the contest page.] [If several: The prizes for each award, with the approximate retail value of each, are listed on the contest page before entries close.] Prizes cannot be exchanged for cash and cannot be transferred. If a prize becomes unavailable, the Organizer will replace it with one of equal or greater value. The Organizer (not SoCal Lights) provides and is responsible for the prizes. Winners are responsible for any taxes. If a winner does not respond within 14 days of notice, the Organizer will make a reasonable effort to contact them again before choosing another winner."

WHY:
- Statute says (B&P 17539.1(a), brief 1.2): unlawful "(6) Failing to clearly and conspicuously disclose the exact nature and approximate value of the prizes when offered. (7) Failing to award and distribute all prizes of the value and type represented."
- My reading: "Prizes have no cash value" can be read as stating a value of zero, which contradicts a real prize such as a gift card, and clashes with the next clause ("replaced with one of equal value"). The 17539.1 text is quoted in the brief under "any contest or sweepstakes"; whether our free skill/vote contest is a "contest" under 17539.3(e) (which requires payment of consideration) is the open question in brief 1.4, but the disclosure is cheap and the brief recommends following it anyway. "Any prize is announced by the Sponsor" announces the prize after entry, which sits badly with "when offered". "May be given to another entrant" after 14 days could be read against the duty to "award and distribute all prizes". Quoted as my reading only.

RISK IF NOT CHANGED: a prize offered with no stated value, or stated as having none, is the fact pattern 17539.1(a)(6) describes; penalties per the brief: misdemeanor (B&P 17534) and civil penalty up to $2,500 per violation (17536).

OWNER/ATTORNEY DECISION NEEDED: (a) Does the organizer or SoCal Lights supply the value (recommend a required "approximate retail value" field in the wizard, which is a code change after approval)? (b) Is "approximate retail value" the right measure? (c) Is the 14-day forfeiture acceptable? (d) Existing contests keep rules their organizer already saved (`docs/rules-review.md`); should they be notified to amend?

TAG: **SHIP NOW** for the wording change in the template (removes an inaccurate statement); the value field and a pre-entry-close publication requirement are WAIT (code plus attorney).

### 1B. Prize delivery and sponsors

CURRENT (`public/rules.js:14`, end): "Sponsors of prizes do not vote and do not influence the result."

PROPOSED: "Sponsors, including prize sponsors, installers and anyone who pays for a logo or other placement on the contest page, do not judge, vote or influence the result. Payment for a placement never affects who wins."

WHY: brief section 8 recommends a line that sponsors "pay for visibility only and do not judge or vote", and brief 1.4 notes the placement "is fine in principle if payment never affects entry or winner selection". Current text covers only "Sponsors of prizes", not logo sponsors or the presenting installer. `public/organizer.html:104` already says "payment never affects who wins".

RISK IF NOT CHANGED: a paying "Presented by" sponsor is outside the sentence; an entrant could argue paid sponsors were not covered by the independence promise (my reading; also 17539.1(a)(4) "Misrepresenting ... the rules, terms, or conditions" if reality differs).

OWNER/ATTORNEY DECISION NEEDED: Should the platform contractually require organizers to keep this true (brief question 12)?

TAG: **SHIP NOW**.

### 1C. "Sponsor" naming conflict

CURRENT (`public/rules.js:8`): "1. Sponsor. ${w.org || "The organizer"} (the "Sponsor") runs this contest for homes in ... SoCal Lights provides the website only. It is not the sponsor and is not responsible for any prize." Same use in `public/terms.html:41`: "Each contest is run by its organizer (the "Sponsor")". Contrast `public/contest.html:70`: `TIER = { presenting: "Presented by", gold: "Gold sponsors", silver: "Silver sponsors", prize: "Prize sponsors" }` and `public/organizer.html:101`: "Presenting sponsor".

PROPOSED: Rename the defined term to "Organizer" throughout `rules.js` (rules 1, 5, 7, 8, 12 and "The Sponsor's decisions are final") and `terms.html:41`. Rule 1: "1. Organizer. ${w.org || "The organizer"} (the "Organizer") runs this contest ... SoCal Lights provides the website only. It is not the organizer and is not responsible for any prize."

WHY: brief 1.4 note on wording and section 8 item (a): the same word means two different roles. Statute says (17539.15(l)(2)(B), brief 1.4): a person who "merely furnishes a prize" is not a "sweepstakes sponsor"; my reading is that keeping "Organizer" (who conducts) and "sponsor" (who funds or advertises) separate supports that distinction.

RISK IF NOT CHANGED: a prize sponsor or logo sponsor could be read as the party "conducting" the contest; an entrant could read "SoCal Lights ... is not the sponsor" as meaning no party is responsible when the organizer defaults.

OWNER/ATTORNEY DECISION NEEDED: Is "SoCal Lights provides the website only" accurate given that we write the rules template, run the voting software and lock results (brief question 4)? Should we add "SoCal Lights is not the Organizer" or a different disclaimer?

TAG: **SHIP NOW** for rename. Which clause survives for the "not the sponsor" statement is the attorney's call (see 1D, Apple).

### 1D. Free entry, no purchase necessary, eligibility, Apple

CURRENT (`public/rules.js:6`): "NO PURCHASE OR PAYMENT IS NECESSARY TO ENTER, VOTE OR WIN. A PURCHASE WILL NOT IMPROVE YOUR CHANCES. VOID WHERE PROHIBITED."
CURRENT (`public/rules.js:10`): "Entrants must be signed in with a verified email."
CURRENT (`public/rules.js:20`): "13. Apple. Apple is not a sponsor of, and is not involved in, this contest."

PROPOSED:
- Line 6: keep. Optionally append in plain language: "Sponsors may pay the Organizer for a logo on the contest page. This does not affect entry, voting or winning."
- Rule 3: add "[Open to residents of California.]" only if the attorney advises.
- Rule 13: keep as is. Add after it only if the attorney requires: "This contest is not offered through any app store."

WHY:
- Statute says (17539.15(b), brief 1.3): a no-purchase message "shall be set out in a separate paragraph ... printed in capital letters in contrasting typeface not smaller than the largest typeface used in the text of the official rules." The brief reads 17539.15 as a sweepstakes-mailing statute that "does not obviously govern a free skill-and-vote contest". The AG page (quoted in the brief): "Legitimate sweepstakes are free and by chance."
- Apple (quoted in `docs/monetization/digital-monetization.md:125`): 5.3.1: "Sweepstakes and contests must be sponsored by the developer of the app." 5.3.2: official rules "must be presented in the app and make clear that Apple is not a sponsor". Clause 13 satisfies the 5.3.2 wording. 5.3.1 is not satisfied by organizer-run contests (digital doc line 126: "5.3.1 still sits awkwardly with organizer-run contests; counsel should look"). Rule 1's "SoCal Lights ... is not the sponsor" would sit directly against 5.3.1 inside the app.
- My reading: requiring a verified email sign-in is probably not "consideration", but the brief lists this as open question 1.

RISK IF NOT CHANGED: Apple review rejection (business risk, not legal) if contests show in the iOS wrapper; no new legal exposure from keeping line 6 and 13.

OWNER/ATTORNEY DECISION NEEDED: (a) Does a verified-email sign-in count as "valuable consideration" (brief Q1)? (b) State eligibility (brief Q7: NY, FL, RI registration for sweepstakes, from secondary sources only). (c) Do we keep contests web-only in the apps (`docs/rules-review.md` item 7)? (d) Minors: rule 3 says 18 or older to enter; terms allow voting from 13 (brief Q8).

TAG: Apple clause and line 6: keep, **no change**. Everything else **WAIT**.

---

## 2. `public/privacy.html`

### 2A. "What we do not do" vs. what the site now does

CURRENT (`privacy.html:25-27`): "We do not show ads." / "We do not sell your information or share it with advertisers or data brokers." / "We do not track you across other apps or websites."
CURRENT (`privacy.html:52`): "Quote requests: some contests name a presenting installer. If you ask for a quote and tick the box, we send your name, email and any phone number or note you typed to that installer and to the contest organizer, and keep a copy for the organizer. Nothing is shared unless you ask."
CURRENT (`privacy.html:69`): "On the website, event hosts can pay to feature an event. Payments are handled by Stripe, and we never see or store card details. Tips go through Cash App."

PROPOSED (replace lines 24-28 and add a new section):
"What we do not do
- We do not use passwords, and you never need an account to browse the map or add an event.
- We do not sell your information to data brokers, and we do not use advertising cookies or ad networks.
- We do show some paid placements. Events marked "Sponsored", sponsor logos on contest pages and shop links are paid or earn us a commission; they are labelled where they appear. The companies behind them do not receive your information from us unless you send them a quote request (see below).
- We do not track you across other websites.

When you ask an installer for a quote
This is optional and separate from entering or voting. If you tick the box on a quote form, we send the details you typed (name, email, phone, and your note) to the installer named on the form, and on a contest page also to that contest's organizer. We keep a copy of the request. The installer and organizer use the details to respond to you and are responsible for what they do with them under their own policies. We do not send quote details to anyone you did not name on the form. [We do not charge installers per lead. If this changes, we will update this policy before it starts.]"

WHY:
- Statute says (CalOPPA, B&P 22576, brief 4.2): a violation to fail to comply with 22575 or "with the posted policy" "Knowingly and willfully" or "Negligently and materially". Brief 4.2 my reading: "match actual practice (22576(b) makes breach of our own policy a violation)". Brief section 8: "line 26 ... and line 52 ... should be reconciled".
- Statute says (CCPA 1798.140, brief 4.1): "a business does not sell personal information when: (A) A consumer uses or directs the business to intentionally: (i) Disclose personal information. (ii) Interact with one or more third parties." My reading: a consumer-initiated, ticked-box quote request is within that language today; a paid lead product might not be (brief Q11). CCPA "business" thresholds are far above our scale (brief 4.1), so CCPA itself probably does not apply today; the policy sentence still has to be true.
- B&P 17500/17200 (brief 3.4): untrue or misleading statements; "We do not show ads" next to Featured and sponsor logos is, in my reading, an untrue statement. Only 17500's and 17200's quoted text is relied on.

RISK IF NOT CHANGED: highest on the site. Two flat statements are now arguably untrue ("do not show ads", "do not ... share it with advertisers") and the quote paragraph is the only place the contradiction is explained.

OWNER/ATTORNEY DECISION NEEDED: (a) Are installers "advertisers" or "third parties" for "do not sell or share"? (b) If any lead fees are ever charged, the CCPA 50-percent revenue test (1798.140, "derives 50 percent or more of its annual revenues from selling or sharing") and the "sale" question reopen; confirm wording to use. (c) Should the policy say we do not certify voluntarily (brief 4.1)? I recommend not.

TAG: **SHIP NOW** for narrowing the two lines and the quote section as written (it makes the policy more accurate). The bracketed lead-fee sentence is **WAIT** and should be removed if no lead pricing exists.

### 2B. Items to add, and CalOPPA element check

Checked against the 22575 excerpts in brief 4.2 (the brief gives excerpts with "..." elisions; the attorney should compare to the full statute for any element not quoted).

| Element (as quoted in brief) | Current policy | Status |
|---|---|---|
| Conspicuously posted | Linked from terms; footer.js not inspected | Verify link in footer on every page |
| "categories of personally identifiable information that the operator collects" | Yes, by feature (lines 33-60) | Present, scattered; add a short summary table |
| "categories of third-party persons or entities with whom the operator may share" | Partial: Cloudflare, Resend, Stripe, Google, Amazon, installers, organizers each named separately | Missing consolidated list |
| "process by which the operator notifies consumers ... of material changes" | Line 76: "If we change this policy, we will update the date above." | Weak; add how (notice on this page, email to account holders for material changes) |
| "Identify its effective date" | Line 19: "Effective November 1, 2026." | Present |
| "how the operator responds to Web browser "do not track" signals" | None | **Missing** |
| "whether other parties may collect personally identifiable information about an individual consumer's online activities over time and across different Web sites" | Line 27 and 60 partly; no statement about Turnstile, Stripe, Google sign-in scripts | Partial |

PROPOSED additions:
- "Do Not Track. Our site does not change what it collects when your browser sends a "Do Not Track" signal. We count page views and clicks as anonymous totals and do not build profiles of your browsing."
- "Other parties. When you use Cloudflare Turnstile, sign in with Google, pay on Stripe or follow an Amazon or ticket link, those companies may collect information about you under their own policies. We do not allow ad networks on our pages."
- "Who we share with. Cloudflare (hosting, storage, spam check), Resend (email), Stripe (payments), Google (sign-in, if you choose it), installers and organizers (only the quote or contest details described above), and Amazon or ticket sellers (only if you click their links)."
- "Payments and orders. When an event host pays to feature an event, Stripe processes the card or Cash App Pay payment. We receive and keep the order record: your email, the event, the plan, the amount, Stripe's payment reference, the dates and any refund or dispute status. We do not receive your card number."
- "Click counts. We count clicks on outbound links, the Featured page and installer pages as anonymous daily totals. A count has no IP address, cookie or account." (Matches `public/hit.js`: "It sends only the page address; nothing about you." Confirm the new click counter is built the same way before publishing; `strategy.md` "Measure" says counters are to be added.)
- "Sponsors. If a sponsor or installer contacts us to arrange a placement, we keep their name, business, email and invoice details to manage that arrangement." (Only if sponsor emails are collected; today sponsors are added by organizers, `organizer.html:104`.)
- Delete the sentence at line 69, "Tips go through Cash App.", or reword with feature.html's "card or Cash App Pay" through Stripe (`feature.html:37`): the two pages currently describe Cash App differently.
- Line 66: affiliate paragraph should add ticket-ticketing partners once `ticketAffiliates` is no longer empty (`site-config.js`; `strategy.md`). Current text names only Amazon.

"Last updated" handling: CURRENT "Effective November 1, 2026" is both the first and only date. PROPOSED: "Effective November 1, 2026. Last updated [date of each change]." and the change process above. Statute says only "Identify its effective date"; my reading is that a separate last-updated date helps show when each version applied; keep a dated archive of old versions (attorney to confirm).

RISK IF NOT CHANGED: missing DNT statement is a plain gap against the quoted 22575 element. Note 22575 says an operator is in violation "only if the operator fails to post its policy within 30 days after being notified of noncompliance" (that clause applies to posting; whether it cures content gaps is the attorney's question).

OWNER/ATTORNEY DECISION NEEDED: Confirm the Turnstile/Google/Stripe "other parties" wording is accurate and sufficient; confirm whether Cloudflare analytics are enabled outside our own counter.

TAG: **SHIP NOW** for DNT, shared-categories, Stripe/order and change-process text. Click counts and sponsor-emails paragraphs: ship only when the feature actually exists.

---

## 3. Labels for paid and commissioned placements

Standard relied on (brief 3.2, FTC Native Advertising Guide, December 2015): "it's deceptive to mislead consumers about the commercial nature of content." "Terms likely to be understood include "Ad," "Advertisement," "Paid Advertisement," "Sponsored Advertising Content," or some variation thereof. Advertisers should not use terms such as "Promoted" ..." and "consumers reasonably may interpret other terms, such as "Presented by [X]," "Brought to You by [X]," ... or "Sponsored by [X]" to mean that a sponsoring advertiser funded or "underwrote" but did not create or influence the content." Disclosures should be "as close as possible to the native ads" and "company logos and names on their own are not likely adequate". Endorsement Guides 255.5: connection must be disclosed "clearly and conspicuously" when "not reasonably expected by the audience", including affiliate links (255.5(b) coffee-blog example). .com Disclosures: "as close as possible to the triggering claim". My reading (brief 3.2): "Featured" is not on the FTC's list; "Ad" or "Sponsored" is safer; "Presented by" fits an underwriting sponsor who does not control content.

| Placement | CURRENT (file:line) | PROPOSED exact string | Where |
|---|---|---|---|
| Featured badge, list card | `app.js:580`: `<span class="tag feat">Featured</span>` | "Sponsored" (keep gold styling) | `app.js:580`, same tag row as price and status |
| Featured badge, details | `app.js:835`: same "Featured" tag | "Sponsored" with title attribute "Paid listing: the event's organizer paid for this placement" | `app.js:835` |
| Map pin gold ring | Gold ring only, no text (`feature.html:19`) | No text on pin; the card and details labels above are the disclosure; attorney to say if the pin itself needs one | n/a |
| Top-of-list placement | `add-event.html:36`: "Top of the list" "Everything above, plus listed first" | Add to the list header when any sponsored item is first: "Sponsored listings appear first." | top of list in `app.js` |
| feature.html copy | `feature.html:19`: "A Featured listing stands out, with a gold Featured badge" ; `:47` "Featured events carry a visible Featured badge, so nobody is misled." | Line 19: "A paid listing stands out, with a gold Sponsored badge ..." Line 47: "Is it labeled as an ad? Yes. Paid listings carry a visible "Sponsored" badge on the map list and on the event's page. A paid listing still has to be accurate ..." | `feature.html:19, 47`; plan names ("Featured pin") can stay as product names, since the badge itself says Sponsored |
| Contest "Presented by" | `contest.html:70`: "Presented by"; section title "Sponsors" | Keep "Presented by" for the underwriting sponsor, and add under the heading (`contest.html:72`): "Sponsors pay the organizer for visibility. They do not judge or vote." | `contest.html:72` |
| Gold, silver, prize sponsors | "Gold sponsors", "Silver sponsors", "Prize sponsors" | Keep. Add "Prize sponsors donate prizes" only if true | same box |
| Presenting installer box | `contest.html:73`: "is the presenting installer. Ask for a free quote and they'll contact you." | "X is a sponsor of this contest. This is an advertisement. Ask X for a free quote ..." | `contest.html:73` |
| Organizer-side wording | `organizer.html:77`: "Presenting installer (optional)" | Leave (internal) but append: "Shown to visitors as a sponsor advertisement." | `organizer.html:77` |
| Amazon shop cards | `app.js:714`: card shows "Amazon ↗"; disclosure at bottom: "As an Amazon Associate we earn from qualifying purchases, at no extra cost to you." | Card label: "Amazon · affiliate link ↗". Keep the Associate sentence verbatim (it is Amazon's required text; confirm against the Associates agreement) and move it directly under the category row, not below the grid | `app.js:714` |
| Support box affiliate line | `app.js:889`: "Some links are affiliate links: we may earn a small commission at no extra cost to you." | Keep; add the same sentence next to any ticket link once `ticketAffiliates` is populated: "Ticket link (affiliate). We may earn a commission." | event details ticket button |
| Installer profile | `installer/[slug].js:24`: "Professional installer" tag | If an installer pays: add tag "Sponsored" to the profile card and header. Unpaid profiles: no tag. | profile page; whenever Installer Partner launches |

WHY: the FTC and Part 255 passages above. B&P 17200/17500 are cited in the brief as general theories; the brief found "no California statute that specifically requires affiliate or sponsor disclosure".

RISK IF NOT CHANGED: "Featured" next to an unlabelled paid placement is the FTC's own example of an unclear term (my reading); the feature.html FAQ asserts it is sufficient. Affiliate disclosure currently sits below the fold of the shop grid, not "as close as possible to" the links (my reading).

OWNER/ATTORNEY DECISION NEEDED: (a) Does "Sponsored" or "Ad" make a better label for a small listing fee than "Featured"? (b) Is "Presented by" acceptable for a paying contest sponsor (brief Q9)? (c) Does a gold pin ring without text need a label?

TAG: **SHIP NOW** for the shop and affiliate disclosure moves, "Sponsored" tag, feature.html FAQ and the Sponsors-box line. Presenting-installer "advertisement" wording: **SHIP NOW**. Installer profile "Sponsored" tag: not applicable until paid listings exist.

---

## 4. Installer listings and B&P 7027.1

CURRENT: Installer profile (`functions/installer/[slug].js:15, 24, 27-28`): title "`${inst.name}: professional holiday lighting installer | SoCal Lights`", tag "Professional installer", "Call for Quotes", bar "Call for a quote", "Request a quote". Quote dialog (`:40`): "Request a quote ... From [name]. They will email or call you." `add-house.html:55-56`: "A website or a phone number, so families can ask for a quote." No license number field or disclaimer exists anywhere (grep for license/CSLB in `public` and `functions` finds none).

Statute says (B&P 7027.1(a),(b), brief 3.5): "It is a misdemeanor for any person to advertise for construction or work of improvement covered by this chapter unless that person holds a valid license under this chapter in the classification so advertised ... "Advertise" ... includes ... any electronic transmission, or ... any directory under a listing for construction or work of improvement". 7027.2 (brief): an unlicensed person may advertise only if the aggregate contract price is under $1,000 and the ad says the person is not licensed. My reading: an installer directory with quote buttons might be a "directory ... listing"; I do not know whether seasonal light installation is "work of improvement" or what classification applies. That is the question.

PROPOSED (conservative, for attorney to rewrite):
- Profile page, under the facts list: "SoCal Lights does not license, inspect or endorse installers. Contractor license status: [License no. ______ (CSLB) | Not provided]. Check any contractor's license before you hire."
- Add optional "Contractor license number (if you hold one)" to `installer-manage.html` and to the pro branch of `add-house.html`; show it on the profile when given.
- Quote dialog (`installer/[slug].js:40`), add one line under the intro: "SoCal Lights lists installers but does not hire or supervise them. Your agreement is with the installer."
- Interim option: hold any paid installer product (Installer Partner) and the "Request a quote" button on profiles with no license number until the attorney answers.

WHY: 7027.1 and 7027.2 as quoted above. "Check any contractor's license" is a consumer-protection sentence, not a statute quotation; I am not citing the Contractors State License Board's page text because it is not in the research brief.

RISK IF NOT CHANGED: criminal-misdemeanor statute (per the quoted text) for the listing party if the directory is "advertising" for licensed-classification work; the brief flags this as unanswered.

OWNER/ATTORNEY DECISION NEEDED: (a) Is holiday-light installation within the Contractors State License Law, and under which classification? (b) Is a free directory listing "advertise"? (c) Require license numbers, or restrict listings to licensed contractors, or add a 7027.2-style statement? (d) Does charging installers change the analysis (brief Q10)?

TAG: **WAIT**. The neutral "does not license or endorse" line could ship alone; I do not recommend shipping any license wording before the attorney answers, because a wrong statement is worse than none.

---

## 5. Quote-lead consent

CURRENT, contest version (`contest.html:73`): label "I agree to share my name, email and phone with ${installer} so they can contact me." Lead text above it: "Ask for a free quote and they'll contact you. Your details are shared only with them, and only if you tick the box."
CURRENT, installer-profile version (`installer/[slug].js:40`): "I agree to share my name, email and phone with [name] so they can contact me."
CURRENT server (`functions/api/contests/[slug]/quote.js` and `.../installers/[slug]/quote.js`): consent required; the contest version also emails the organizer (`contest_quote_sent`) and stores a copy.
CURRENT terms (`terms.html:44`): "your details go only to that installer and the organizer, and only if you tick the box."

Two inaccuracies: contest lead text says "only with them" but the privacy policy and server also send to the organizer; the note field is shared but not named in the checkbox.

PROPOSED, contest form (unticked by default, own line, not bundled with sign-in or voting):
"[ ] Yes, send my request to [Installer name] and to the organizer of this contest, [Organizer name]. I am sharing my name, email address, phone number (if I entered one) and my note. [Installer name] may contact me by email or phone about my request. This is optional. It does not affect entering or voting. See the Privacy Policy."
Lead text: "Ask [Installer name] for a free quote. This is an advertisement. Your details go only to [Installer name] and the contest organizer, and only if you tick the box below."

PROPOSED, installer-profile form:
"[ ] Yes, send my request to [Installer name]. I am sharing my name, email address, phone number (if I entered one) and my note. They may contact me by email or phone about my request. SoCal Lights keeps a copy. See the Privacy Policy."

Server/data points (for the attorney to know, no change proposed): consent is a boolean in the request body; consent text and time are not stored. PROPOSED (after approval): store the version of the consent text and a timestamp with each lead.

WHY: Statute says (CCPA 1798.140, brief 4.1): "Consent" means "any freely given, specific, informed, and unambiguous indication of the consumer's wishes ... for a narrowly defined particular purpose. Acceptance of a general or broad terms of use ... does not constitute consent." My reading: naming each recipient, each data item and the purpose fits "specific, informed". CCPA may not apply to us at our size (brief 4.1) but this wording is the conservative standard and costs nothing.

RISK IF NOT CHANGED: contest page says details go "only" to the installer while the organizer also receives them (internal inconsistency; B&P 17500/17200 theory); no record of what the user agreed to.

OWNER/ATTORNEY DECISION NEEDED: (a) Is the organizer a necessary recipient or should contest leads go to the installer only? (b) Is a paid lead product a "sale" (brief Q11)? (c) Should the form also tell the user the installer's contractor license status (item 4)? (d) Retention: how long do we keep leads and for how long may organizers/installers keep them?

TAG: checkbox text and lead text **SHIP NOW** (more accurate); storing consent version and any paid lead model **WAIT**.

---

## 6. Terms: paid placements, refunds, sponsored contests

> **Update 2026-11-06: partly implemented.** A plain-English "Paid placements" section is now live in `public/terms.html` (see "What is now in the live Terms" near the end of this file). It is a draft written by the site team from the redlines and the code. **It has not been reviewed by an attorney.** The PROPOSED text below is kept for the attorney; the live text differs in places.

CURRENT (`terms.html:41-44`, quoted above for 41, 44): "Organizers agree to run their contest fairly, follow the law that applies to it, honor the prizes they promise, and not charge entrants to enter or vote." "Sponsors and installers shown on a contest page are identified as such."
CURRENT (`terms.html:51`): limit "to $100".
CURRENT (`feature.html:49`): "If we cannot feature your event for any reason, you get a full refund. Once your placement is live, payments are non-refundable, but if your event is cancelled we will move your placement to another event of yours or refund the unused time."
Terms contain no section on paid placements, payments, refunds, sponsors paying organizers, or affiliate links.

PROPOSED new terms section (insert before "Accounts"):
"Paid placements and payments
- Event hosts can pay to have an event shown as "Sponsored" with a highlighted pin and/or earlier position in lists. A paid placement does not change the event's details, and we may decline or remove any event we cannot verify or that breaks these terms.
- Payments are processed by Stripe. Refunds, cancellations and chargebacks are handled under our Refund Policy: [REFUND POLICY LINK / TEXT, PENDING FROM FINANCE]. Nothing in these terms limits any refund right you have by law.
- Paid placements never affect contests: entering and voting are free, votes cannot be bought, and no payment affects who wins.
Sponsors and installers
- An organizer may show sponsor logos or name an installer on a contest page. A sponsor that pays an organizer does not judge, vote or influence results. Installers shown anywhere on SoCal Lights are independent businesses. We do not hire, license or supervise them and are not a party to any agreement between you and an installer.
Affiliate links
- Some shop and ticket links earn us a commission, at no extra cost to you. They are labelled where they appear."
Also change the line 41 defined term from "Sponsor" to "organizer" (item 1C).
Also reconcile `feature.html:49` with the Refund Policy: [PLACEHOLDER: Finance text]; the brief and strategy both mention a pending refund and a Stripe fee issue (strategy: fixed 30-cent fee) so I make no assertion about the refund terms.

WHY: B&P 17500/17200 (brief 3.4) cover untrue or misleading statements; FTC native-ad guide (brief 3.2) on commercial nature; brief section 8 asks for a "Sponsors pay for visibility" line. I did not find statute text in the brief on mandatory refund terms for this product, and I do not state one.

RISK IF NOT CHANGED: moderate. Terms are a gap rather than a misstatement; refund inconsistency between `feature.html:49` and a future policy is the main exposure.

OWNER/ATTORNEY DECISION NEEDED: (a) Limitation of liability ($100) against paying customers; carve-outs for refunds. (b) Organizer agreement terms for contests with sponsors: indemnity, prize delivery, no influence (brief Q12). (c) Whether terms need an organizer-specific acceptance at contest creation (`docs/rules-review.md` item 1 flags this as the largest gap).

TAG: **WAIT** (needs Finance's refund policy and attorney review of liability limits). The affiliate and "paid placements never affect contests" sentences could ship now but would be orphaned without the section.

---

## Featured pricing wording changed 2026-11-06 (for the attorney)

**Not legal advice; a note so the attorney sees current text.** The owner approved new Featured EVENT pricing and the public wording changed in `public/pricing.html`, `public/feature.html`, the add-event plan step (`public/add-event.html`), the shared plan copy `public/feature-plans.js`, and the Help articles `is-it-free` and `feature-an-event-or-home` (migration 0168). Terms did not cover paid placements when this note was written; a plain-English "Paid placements" section was added on 2026-11-06 (see the end of this file).

What the pages now promise a buyer: Featured pin $10 and Top of the list $15 run "from today until your event's last day, up to 30 days"; Full run $25 (events that run 31 days or more) runs "until your event's last day, up to 90 days"; featuring opens 30 days before the event starts; one payment, no subscription. Each tier lists its contents in full (gold-ringed pin; "Featured" badge; listed first for Top of the list and Full run). The old $20 "Whole season" plan was retired; orders already paid keep their original terms.

Please review: (a) whether "up to 30 / 90 days" and "until your event's last day" are clear enough as the price/duration disclosure; (b) the refund wording on `feature.html` ("If we cannot feature your event for any reason, you get a full refund. Once your placement is live, payments are non-refundable, but if your event is cancelled we will move your placement to another event of yours or refund the unused time") against the window now ending at the event's last day; (c) whether Terms need a paid-placement clause (item 6 above) before the plans are promoted further.

---

## Installer Sponsor placements (added 2026-11-06, for the attorney)

**Not legal advice; a note so the attorney sees what the site now sells.** Installers can buy, at `/sponsor`, a **Banner** ($50 per season: company name linked to their website or email and phone number in a thin strip labelled "Sponsor" at the top of the map list) and a **Banner and top of the list** ($75 per season: the banner plus a company card labelled "Sponsor" at the top of the list). Prices are set in `functions/_lib/featured.js`; the page code is `public/sponsor.html`, `public/sponsor-plans.js`, `public/pricing.html`.

Terms the pages state to the buyer, for review:
1. **Duration and price.** From payment to the last day of the current season on the map (for example Jan 6 for the Christmas lights season, which starts Nov 3). The price is the plan's price shown on the Pricing page and again before payment; it does not change during a season (no proration), so a buyer late in a season pays the same for fewer days. The page shows the exact start date, end date and number of days before payment. One payment, no subscription, no automatic renewal. Please check that this is adequately disclosed. `public/terms.html` (Installer Sponsor placements) now says this.
2. **Renewal and upgrade.** A renewal starts the day after the running placement ends, at the plan's price; at most one season ahead is sold. An upgrade from the banner to banner and top is charged the difference between the two plans' prices (no refund or credit for timing).
3. **Refunds.** "If we cannot put your placement on for any reason, you get a full refund. Once it is running, payments are non-refundable, but email us if something is wrong. A refund switches the placement off, and so does a dispute." Same text pattern as Featured; please check it against California consumer rules for prorated and prepaid advertising.
4. **Labelling.** Paid placements are always labelled "Sponsor" (banner and list card), and the Featured and contest areas are separate. Please confirm "Sponsor" is clear enough for the FTC endorsement and native-advertising guidance (see section 3 above) and that it does not collide with contest "sponsors" (1C).
5. **Eligibility and content.** Only the verified owner of an installer profile (email at the company's website, or admin-approved) can buy. The profile must be active with a phone number or website. We show the company's own name, link and phone; we do not verify licensing. Please advise whether a licensing line (B&P 7027.1, section 4) must appear next to a paid placement.
6. **No effect on contests; the map stays free.** Payment never affects a contest result and nothing is charged to find lights.
7. **Terms and privacy.** `public/terms.html` now has a "Paid placements" section that includes installer Sponsor placements (2026-11-06, unreviewed by an attorney). The privacy page already says Stripe processes the payment and what the order record keeps.
8. **Statistics.** The dashboard shows counts of times shown and taps (totals only, no personal data).

---

## What is now in the live Terms (2026-11-06) and what still needs the attorney

**The Terms text is a plain-English draft written by the site team. It has not been reviewed by an attorney. It is not legal advice.** It was written to describe only what the code does and what the Feature page already promised. `public/terms.html`, section "Paid placements" (`/terms#paid`), "Updated November 6, 2026"; test `tests/terms.test.mjs`.

**Redline item 6 (Terms: paid placements, refunds, sponsored contests), item by item**

| Redline item | State |
|---|---|
| A section on paid placements, payments through Stripe | Implemented in the live Terms (Featured events and homes, Installer Sponsor placements). |
| Placements are labelled | Implemented. States "Featured" for events and homes and "Sponsor" for installer placements, which is what the site shows today. The redline's proposed "Sponsored" label was NOT adopted by the site, so the Terms do not say "Sponsored". |
| Paid placements never affect contests, votes cannot be bought | Implemented (no payment affects any contest result or vote; homes can be featured only after winners are announced and only for 1st to 3rd place). |
| We may decline or remove an event we cannot verify or that breaks the terms | Implemented, in plain words (inaccurate listing, cancelled event, breaks the terms), plus the review hold before an unapproved event goes live. |
| Refund policy text from Finance | Implemented as the policy the Feature page already stated (full refund if we cannot list or feature it; non-refundable once live; move or refund unused time if the event is cancelled; a refund or dispute switches the placement off). The Feature FAQ was reworded to match the Terms exactly. Finance's proposed 7-day or 3-day window (`finance-operations.md` section 3) is NOT in the Terms because the owner has not decided it. |
| "Nothing in these terms limits any refund right you have by law" | Implemented (sentence taken from the redline). |
| No guarantee of traffic or results | Implemented. |
| Installers are independent businesses; we are not a party to any agreement with them | NOT yet in the Terms. Still needs the attorney. |
| Sponsors that pay a contest organizer do not judge, vote or influence results | NOT yet in the Terms. Still needs the attorney. |
| Affiliate links (Amazon, tickets) earn a commission | NOT yet in the Terms. (The shop and support box already disclose it on the page.) |
| Change the defined term "Sponsor" (contest organizer) to "organizer" (item 1C) | NOT done. The new section only says the installer "Sponsor" label is separate from the contest organizer. |
| Organizer-specific acceptance at contest creation, indemnity, prize delivery | NOT done. Still needs the attorney. |
| Limitation of liability ($100) against paying customers, carve-outs for refunds | NOT changed. Still needs the attorney. |

**What the attorney should review (exactly)**
1. The whole "Paid placements" section for plain accuracy and for anything it should say or must not say.
2. The $100 limit of liability in "No warranty, and limits on our responsibility" as applied to paying customers, with refund carve-outs.
3. The refund rules: "full refund if we cannot list or feature it", "non-refundable once live", and the promise that a cancelled event gets its placement moved or the unused time refunded (made by hand, no code does it), against California consumer rules for prepaid advertising; whether the Finance 7-day window should be added.
4. "Featured" (events and homes) and "Sponsor" (installers) as labels for paid placements (item 3 above), and whether "Sponsor" collides with the contest organizer "Sponsor" in the Contests section (1C).
5. The rule that we may decline, remove or unpublish a listing or placement, and whether a removal for breaking the terms needs refund wording.
6. Dispute wording ("a payment dispute switches the placement off; email us before disputing").
7. Missing pieces listed as NOT done in the table (installer independence, paying contest sponsors, affiliate links, organizer agreement).
8. Whether a licensing line (B&P 7027.1, item 4) must appear next to a paid installer placement.
9. The one-line privacy addition about event claims and the claim email, and the rest of item 2.

---

## Not covered here (outside the brief or other owners)

Sales tax on listings and 1099s for prizes of $600 or more are CPA questions (brief 5, Q7). State sweepstakes registration (NY, FL, RI) is secondary-source only. `docs/rules-review.md` and `docs/contest-business-model.md` need the corrections listed in brief section 8; I did not edit them.
