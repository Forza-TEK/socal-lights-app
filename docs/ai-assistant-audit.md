# AI assistant knowledge audit (2026-11-10)

**Method.** 121 realistic visitor questions across find and plan, events, homes, accounts, contests, money, installers, notifications and privacy. For each, the same retrieval the assistant uses (live Help articles from the migrations, plus the compiled knowledge base) was run, and the top sources were checked by hand against the app code, pages and Terms. A question counts as covered when both Help and the knowledge base return a relevant source, thin when only one does, and a gap when neither does.

**Before:** 35 of 121 had no knowledge-base source at all (Help articles alone covered most of those, 0 gaps once Help was counted, 1 gap: boat parades), 37 were thin. **After:** 109 of 121 have both; the rest are covered by Help articles (address privacy, ties, winners chosen, directions) or are things the site does not offer.

## Gaps found and filled (new chunks in `docs/ai-assistant-kb.md`)
- Seasons and kinds of events (including boat parades, walk-through lights, drive-by displays).
- Map filters, what each one does.
- Directions, Report a problem, Not your listing? Remove my home, Confirmed vs Expected.
- Day and night mode.
- Profile tabs: Drafts (Save & exit), Contests, Displays (Edit, Take down for the season, Delete), Events (Cancelled, Postponed, Run again next year, Delete), Badges, Account.
- Sign in and out, no passwords, code not arriving.
- Payments: Stripe, card or Cash App Pay, receipts, tips. (Apple Pay and other methods are not listed on the site, so the assistant does not claim them.)
- Cancel automatic renewal; advertising; what each plan includes; logos.
- Contest organizer tools: QR poster, entry poster, yard sign, results download.
- Privacy basics: cookies, location, data, AI chat.
- Is it free; the Shop tab; refund rules; installers (six chunks); store apps; menus; Favorites; remove home; weekly email.

## Matching changes (`functions/_lib/chatkb.js`, `scripts/build-chat-kb.mjs`)
- A chunk can carry a `keywords:` line (words people use that the text does not, such as "unsubscribe" or "log out"). It is matched like a title and is never shown to the model.
- Filler words (take, tak, leave, give, get) no longer count as question words.

## Facts corrected earlier in this work
Adding an event needs sign-in; contest wizard is Quick start or Customize; Favorites replaces My night and Route these replaces Open route; Waze and Send to car; not in any app store yet.

## Known limits and open items
- Matching is keyword based: unusual wording can still miss. Real transcripts are the best way to find these.
- Some sources still read as video narration ("In this video, you will..."). Written Help articles are better sources; the Tutorials and Help agent can add written steps where a video is the only source.
- The Help Center article text for Cancel automatic renewal, Tips and "Is my address public" was not changed here.
- Real-model answer quality is unverified (needs a Cloudflare preview and the owner's 20-30 test questions).
