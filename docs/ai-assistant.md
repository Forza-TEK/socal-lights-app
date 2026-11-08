# AI assistant (chat widget)

Owner-approved 2026-11-08. Research and decisions: `docs/monetization/ai-chat-agent-research.md` (on branch `claude/quirky-goodall-yaumg1`). **It ships OFF.** Nothing is visible to visitors and no AI call is made until you turn it on in Admin > AI assistant.

## What it does
Today it only answers questions (it has no actions). Proposed actions (send to a human, look-ups, signed-in changes the visitor confirms): `docs/ai-assistant-actions-design.md`.

A button labelled "AI assistant" (bottom right on the map and on Pricing) opens a chat. It answers questions about everything on the site, using only our own public information:

- how to use the site: map, location and routes, accounts and sign-in, submitting and editing events and homes, photos, claiming listings, installer profiles, Featured placements and billing how-to, notifications, privacy;
- contests, in depth: how they work, who can enter and vote, entering, voting (one vote per category per account, changing a vote, "my vote did not count"), judging (pick or score 1 to 10, trimmed average with 5+ judges, conflicts), how winners and ties are decided, categories, organizer-added homes, unpublishing, passes, sponsors and sponsor invite pages, results pages;
- prices, **only** from the code exports `/api/config` serves (`featured.js`, `passes.js`);
- events and live contests (names, dates, status), from the database.

It **quotes** published rules and does not interpret or promise. Fixed deferrals (no model call): disputes, disqualification, legal, prize and tax questions go to the Terms and info@socallights.app; results and predictions ("who won", "who is ahead") are never given; "can paying make me win" gets a fixed "No"; how fake votes are detected, or how to get around the checks, gets one general statement and nothing else. Off-topic, prompt-injection and personal-data requests are refused without calling the model. When nothing in the knowledge base matches a question it does not improvise: it gives the Help Center link and info@socallights.app, and counts the topic (below).

Payment never affects contest results; the map, search, routes, entering and voting are free. The assistant says "home", not "house".

## Where its knowledge comes from (nothing else)
| Source | How |
|---|---|
| Help Center articles | D1 `help_articles`, loaded live (5-minute cache), top 3 by word match |
| Terms contest rules | `functions/_lib/chatrules.js`, quoted lines; a test fails if they stop matching `public/terms.html` |
| Curated public guide | `docs/ai-assistant-kb.md` (public-safe, plain language, no prices or dates) |
| Tutorials, page copy, Terms, Privacy | `public/tutorials.json` and caption files, pricing/feature/sponsor/contest-pass/add pages, etc. |
| Live data | D1 `events` (upcoming) and `contests` (live; names, dates, status, voting style; never results or counts) |
| Prices | `functions/_lib/featured.js` and `passes.js` exports, the same ones as `/api/config` |

The last four static rows are compiled into `functions/_lib/chatkb-data.js` by `node scripts/build-chat-kb.mjs`. **Run it after changing any listed public page, the tutorials or `docs/ai-assistant-kb.md`**; `npm test` fails if the file is stale (`node scripts/build-chat-kb.mjs --check`). `docs/contests.md` is deliberately NOT a source: it has internal operations (API details, comps, known gaps). Add public-safe content to `docs/ai-assistant-kb.md` instead.

Safety on every retrieved text: dollar figures and calendar dates are stripped (prices come only from PRICES, dates only from live events and contests), HTML is removed, sentences that describe how fraud is detected are removed, and the text is marked "untrusted data" to the model.

## Safety on the way out
The reply is filtered: any `$` amount not in our price list, or any date not in the events and contests given to the model, replaces the whole answer with a fallback; links other than socallights.app and emails other than info@socallights.app are removed; leaked instructions are blocked.
Known limit: the price filter checks that an amount exists in our price list, not that it belongs to the right product. A small model could still attach the right number to the wrong plan. The PRICES block names each plan with its price to keep that rare; review test transcripts in preview before launch.

## Privacy: counters only
No message text, no IP address, no visitor id is stored. D1 tables (`migrations/0198_chat_assistant.sql`):
- `chat_settings`: the switches and caps.
- `chat_usage`: one row per UTC day of counts (chats, questions, tokens, neurons, Claude micro-dollars, stopped, capped, errors, gaps).
- `chat_topics`: "unanswered topics": one count per day under a fixed bucket name (accounts, submit-listing, contest-setup, contest-enter-vote, sponsors, installers, featured-billing, map-location, notifications, privacy-terms, events, app, other) when nothing matched a question. The bucket comes from our own keyword list, never the visitor's words. Admin shows the top buckets of the last 30 days: write help for those first.
- Abuse limits reuse `send_throttle` (one-way scrambled codes of the connection, deleted after two days).
- A signed 30-minute cookie `scl_chat` (no identity) remembers that the visitor passed Turnstile.
`privacy.html` ("AI assistant") and `terms.html` ("AI assistant") describe this; both are dated November 8, 2026.

## Switches and cost cap (Admin > AI assistant)
- **Turn the assistant on/off** (`chat_enabled`, default off).
- **Kill switch** (`chat_kill`): stops answers at once and wins over the on/off switch. Emergency without Admin: set `CHAT_KILL=1` in Pages settings. The widget flag is cached up to 5 minutes (`/api/config`); the endpoint itself answers 404 immediately, and the widget then shows a polite "not available".
- **Monthly hard cap** in dollars, 0 to 10 (`chat_cap_usd`, default **0 = free allowance only**). On the free Workers AI plan the free allowance is 10,000 neurons per UTC day; the app stops answering when today's counted neurons would pass it (a 250-neuron reserve is kept). A cap above 0 lets it use paid Workers AI, or the Claude path, until the month's counted cost (estimated from tokens) reaches the cap. The Claude path never runs on a $0 cap.
- **Most chats per day** (`chat_daily_max`, default 300).
- Per visitor: Turnstile once per visit, 5 questions a minute and 40 a day. Overall: `CHAT_GLOBAL_PER_HOUR` (default 200 questions an hour).
- When a cap is reached visitors get a polite message with the Help Center and email links.
The counted cost is an estimate; the Cloudflare and Anthropic dashboards are the source of truth. Requests running at the same moment can overshoot a cap by a few answers.

## Provider and environment (Cloudflare Pages settings, never in the repo)
| Name | Kind | Purpose |
|---|---|---|
| `AI` | binding (declared in `wrangler.toml`) | Workers AI; used by default |
| `CHAT_MODEL` | variable, optional | `@cf/meta/llama-3.1-8b-instruct-fp8-fast` (default), `@cf/openai/gpt-oss-20b` or `@cf/ibm-granite/granite-4.0-h-micro` |
| `CHAT_AI_GATEWAY` | variable, optional | name of an AI Gateway; requests then go through it with logging and caching asked to stay off |
| `CHAT_PROVIDER` | variable, optional | `claude` switches to Claude Haiku 5.5 |
| `ANTHROPIC_API_KEY` | **secret**, only for `claude` | never commit it |
| `CHAT_ANTHROPIC_MODEL` | variable, optional | default `claude-haiku-5-5` (confirm the exact id in the Anthropic console) |
| `CF_ACCOUNT_ID` | variable/secret | already used by Admin > Usage; needed only to route Claude through AI Gateway |
| `CHAT_AI_GATEWAY_TOKEN` | secret, optional | if the gateway requires authentication |
| `CHAT_KILL` | variable, emergency | `1` stops the assistant |
| `CHAT_GLOBAL_PER_HOUR`, `CHAT_SESSION_SECRET` | optional | hourly ceiling; signing key for the cookie (falls back to `THROTTLE_SALT`) |

## Owner steps to launch
1. Merge the PR (migrations apply automatically from `main`: `0198_chat_assistant.sql`). The site deploys with the `AI` binding from `wrangler.toml`. The assistant is still OFF.
2. Check the binding (click path in case the dashboard shows it missing): Cloudflare dashboard > Workers & Pages > `socal-lights` > Settings > Bindings > Add > Workers AI > Variable name `AI` > Save; do it for Production and, if you want to test there, Preview. If the Settings page says bindings are managed by `wrangler.toml`, nothing is needed.
3. Test on a preview deployment first (preview has its own database): Admin > AI assistant > Turn the assistant on, open the preview site, ask the 20 or so questions you care about, and read the answers.
4. Production: Admin > AI assistant > Turn the assistant on. Leave the monthly cap at $0 to stay inside the free allowance. Watch Chats today, Stopped today and Unanswered topics for a week.
5. Optional: raise the cap (max $10); create an AI Gateway and set `CHAT_AI_GATEWAY`; for the stronger model add the secret `ANTHROPIC_API_KEY` and variable `CHAT_PROVIDER=claude` and set a cap above $0.
6. Quality: if answers are weak, try `CHAT_MODEL=@cf/openai/gpt-oss-20b` (uses neurons about 3.5 times faster) or switch to Claude.
Rollback: Admin kill switch, or `CHAT_KILL=1`.

## Tests
`tests/chat.test.mjs`: a mock model (`env.CHAT_TEST_MODEL`, never set in production), 100+ questions (prices, wrong prices, dates, how-to across every area, contests, voting, judging, deferrals, anti-fraud, off-topic, injection, personal data), switches, kill, Turnstile and cookie, rate limits, the cost cap with the free allowance and with dollars, Claude and Workers adapters with stubbed calls, privacy (no text or IP stored), Admin API, the generated knowledge base, and the Terms quote drift guard. No test calls any real AI, Stripe or email service.

## Not verified yet (needs the owner's Cloudflare account)
Real Workers AI answers and their quality, neuron counts against Cloudflare's dashboard, the exact Workers AI response shape for each listed model, AI Gateway options (`skipCache`, `collectLog`), the Claude model id and request through a gateway, whether the free plan's daily reset matches 00:00 UTC, Turnstile in the chat panel on a phone, and screen-reader and keyboard behavior on real devices. The widget's placement over the map's bottom sheet on small phones has not been looked at in a browser.
