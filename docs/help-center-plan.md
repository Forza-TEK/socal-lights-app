# Help center and AI assistant plan (SoCalLights.app)

Written 2026-11-03. This is a plan, not built yet. It needs four decisions from the owner (end of this page).

## The idea in one paragraph
Three layers, and every layer ends at a person. **Learn** (the 25 video tutorials, already live), **Do and fix** (a Help Center of short written articles and troubleshooting steps, searchable), **Ask** (an AI assistant that answers only from the Help Center, with a clear "email us" way out). The AI assistant shows on every page except the map.

## What the research says (and what we do about it)
The sources are mostly vendor blogs, so these are common practice, not measured proof.

| Finding | What we do |
|---|---|
| Organize around the jobs people are trying to do, with about 4 to 8 categories, not around your org chart ([Webfactory](https://www.webfactory.co.uk/blog-articles/how-to-organise-your-knowledge-base-for-easy-navigation), [HelpKit](https://www.helpkit.so/learn/help-center-structure), [Zendesk](https://support.zendesk.com/hc/en-us/articles/4408883389338-Getting-started-with-self-service-Part-2-Planning-your-self-service-content-structure)) | Categories match the six tutorial groups people already see, plus one for account and privacy |
| Few article types, and decide the type before writing ([Kayako](https://kayako.com/blog/documented-procedures/)) | Four types: How-to, Troubleshooting, Answer, Video. Based on the [Diátaxis](https://ubuntu.com/blog/diataxis-a-new-foundation-for-canonical-documentation) split of tutorial, how-to, reference, explanation, simplified |
| Search is the front door; log what people search and find the gaps ([Macha](https://www.getmacha.com/blog/freshdesk-knowledge-base-explained)) | Search box first on the page. Log every search, and review searches with no result each week |
| Help works best at the moment of trouble (in-product links, contextual panels) ([Intercom community](https://community.intercom.com/train-fin-94/how-do-you-organize-help-center-content-for-better-user-experience-14862)) | A "Help" row in the three-dots menu, and "Watch the 2-minute video" links inside the contest steps |
| An AI agent should answer only from your published help content, show its source link, say "I don't know" and hand off with the context attached ([eesel](https://www.eesel.ai/blog/ai-agent-handoff-best-practices), [HelpDocs](https://www.helpdocs.io/learn/ai-for-customer-support/)) | Grounded answers, source links, no account actions, one-tap "email us" with the conversation attached |
| Stale content makes an AI confidently wrong. Review monthly ([Halo](https://haloagents.ai/blog/ai-customer-support-best-practices)) | A weekly and monthly review routine (below) |

## Structure of the Help Center (`/help`)
**Home:** a search box, then "I want to..." cards, then the most-read articles, then "Watch a tutorial" and "Contact us".

**Categories** (same names as the Tutorials page, so people learn one map):
1. Find and plan: location, seasons, filters, routes ("Visit the homes"), weekly email, installing the app
2. Enter a home: entering, editing or withdrawing, your profile and badges
3. Vote and judge: voting, judging, "I know this household"
4. Run a contest: create, share, approve, dates, voting controls, co-organizers, announce, activity
5. Sponsors and installers: sponsors, "Get a quote", installer profiles
6. Post events and homes: add an event, show off a house
7. Account, privacy and safety: sign-in, deleting your account, rules, reporting a problem

**Article types** (decide before writing):
- **How-to**: one task, 3 to 7 steps, the tutorial video on top, the transcript below (the video narration is already written, so every tutorial becomes an article for free)
- **Troubleshooting**: symptom, likely cause, fix. For example "The map does not show my location", "I did not get the email", "My photo will not upload", "I cannot find my entry"
- **Answer**: short policy or rule answers ("Who can vote?", "Is it free?", "How are winners chosen?")
- **Video**: the existing tutorial, linked from the matching article

**Every article has:** a title in the words people use, a one-sentence answer first, numbered steps, the video (Computer and Phone), a "Was this helpful?" yes/no, a "Still stuck? Ask us" link, and an updated date.

**First 45 articles:** 25 how-tos (one per tutorial, from the transcripts), about 12 troubleshooting, about 8 answers. I can draft all of them from what is already written.

## How to build it on the current stack (no new vendor)
- **Content:** a `help_articles` table in the D1 database (slug, title, category, type, body, video id, status, updated date), edited in a new Admin tab, the same way the email templates are now editable. Pages are served by a Pages Function at `/help` and `/help/<slug>`, with proper titles and FAQ markup so search engines can show them.
- **Search:** D1 full-text search over the articles. Every search is logged (words, results count), plus a yes/no helpful vote per article.
- **Contact:** a short form with Turnstile and the same hourly limit the submissions use. It emails info@socallights.app and attaches the page, device and (if signed in) the account, so nobody has to repeat themselves.
- **Links in:** the three-dots menu gets "Help" next to "Tutorials". Tutorial cards link to their article, and articles link back to the video.

## The AI chat agent
**Requirements:** not on the map; on every other page; answers only from the Help Center; shows the article it used; never changes an account, entry, vote or contest; says "I am not sure" and offers email; no tracking beyond the chat itself.

**How "not on the map" works:** the site's shared page frame (`public/chrome.js`, loaded by every server-written page) is where the chat button is added. The map page (`index.html`) does not load that frame, so it never gets the button. Admin pages are also skipped. The same rule works for any of the hosted tools below, because they are all one script tag.

| Option | Cost (published prices, check before buying) | Effort | Fit |
|---|---|---|---|
| **A. Build it on Cloudflare** (recommended): the chat box calls a Pages Function that searches the Help Center and asks an AI model to answer from it. Uses [Cloudflare AI Search](https://developers.cloudflare.com/ai-search/platform/limits-pricing/) (1,000 free semantic searches a month, billing starts Dec 1, 2026, then $0.75 per 1,000) and either Workers AI ([10,000 free Neurons a day](https://developers.cloudflare.com/workers-ai/platform/pricing/), then $0.011 per 1,000) or the Claude API for better answers (pay per use) | Likely a few dollars a month at this size | About a day after the Help Center exists | Best: same account, you own the data, map exclusion is trivial, exact control of what it may say |
| B. [Chatbase](https://www.chatbase.co/pricing) (hosted, trained on your pages) | From $32 a month for 700 messages; $120 for 4,000. Removing their badge is $99 more | An hour | Fastest no-code start; monthly cost grows with use |
| C. Crisp | Often the cheapest of the hosted chat tools; check current plan | An hour | Good if you also want live chat with a person |
| D. Intercom Fin | Per seat plus about $0.99 per resolved question (varies by source) | Hours | Strong product, expensive and built for support teams |
| E. Tidio (Lyro) | Tiered, from about $29 a month | An hour | Simple, mostly for online stores |

**Recommendation:** build the Help Center first (the agent is only as good as the articles). Then build option A. If you want a chat button this week, add Chatbase (B) for the first month while the Help Center is written, then switch.

**Guardrails for the agent:** answer only from articles; always show the source link; if no article matches, say so and show the email link; never ask for passwords or payment details; short answers; a daily message cap so a bad actor cannot run up the bill.

## Keeping it good (weekly and monthly)
- **Weekly (a scheduled task, like the other `[SCL]` tasks):** a short list of searches with no result, articles marked "not helpful", and questions the AI could not answer. Each becomes a new article or a fix.
- **Monthly:** read the top 10 articles against the live site; update screenshots and videos when the screens change (the tutorial scripts re-record in minutes).
- **After any feature change** (like the "Visit the homes" routes): update the article first, then the video, then tell the AI by re-indexing.

## Rollout
1. **Week 1:** the Help Center skeleton (categories, search, contact form, Help link in the menu) with the 25 how-to articles drafted from the tutorials.
2. **Week 2:** 12 troubleshooting articles and 8 answers; admin editing; search and helpful-vote logging.
3. **Week 3:** the AI agent (option A), tested on 50 real questions before it goes live; map excluded; daily cap on.
4. **Ongoing:** the weekly and monthly routine.

## Decisions needed from the owner
1. Build the Help Center on the current stack as above (recommended), or use a hosted help-desk product?
2. AI agent: build on Cloudflare (A, recommended), or start with Chatbase (B)?
3. Better answers (Claude API, small monthly cost, needs an API key added as a Pages secret) or free (Workers AI, simpler, less polished)?
4. Who answers the email from "Still stuck?" and how fast (so the page can promise a reply time honestly)?
