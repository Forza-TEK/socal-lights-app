# AI assistant: handoff for a training / tuning session

Paste or point a new session at this file. Read `docs/ai-assistant.md` too (the full design), then `CLAUDE.md` (project rules). Written 2026-11-08.

## What exists
A chat widget on socallights.app ("Ask SoCal Lights", a round "?" button on phones) that answers from our own public information only. **It ships OFF** until the owner turns it on in Admin > AI assistant (switch, kill switch, monthly cap, chats per day).

| Piece | File |
|---|---|
| Widget (browser) | `public/chat.js`, `public/chat.css` |
| Endpoint | `functions/api/chat.js` (`POST /api/chat`) |
| What the model is told (rules, prices, events, contests, help, sources) | `functions/_lib/chatkb.js` (`RULES`, `buildContext`) |
| Retrieved knowledge, compiled | `functions/_lib/chatkb-data.js` (generated; never edit by hand) |
| Hand-written public-safe knowledge | `docs/ai-assistant-kb.md` (the main thing to improve) |
| Terms contest rules (quoted) | `functions/_lib/chatrules.js` |
| Input and output filters | `functions/_lib/chatguard.js` |
| Model call (Workers AI default, Claude optional) | `functions/_lib/chatmodel.js` |
| Switches, caps, usage counters | `functions/_lib/chatsettings.js`, `functions/api/admin/chat.js` |
| Tests (100+ questions, mock model) | `tests/chat.test.mjs` |

## How it answers
1. Fixed refusals first, no model call: disputes, disqualification, legal, prizes and tax, results and predictions ("who is ahead"), "can paying make me win".
2. Otherwise it builds context: HELP (top 3 help articles from the database), SOURCES (top 3 chunks of the compiled knowledge base), EVENTS (up to 5 upcoming events from the database, matched on the question's words), CONTESTS (live contests), TERMS (quoted rules when it is a contest question), PRICES (from `featured.js` / `passes.js` only).
3. Dollar figures and calendar dates in retrieved text are stripped; prices come only from PRICES, dates only from EVENTS and CONTESTS.
4. The reply is filtered: unknown `$` amounts, unknown dates, off-site links and leaked instructions replace the answer with a fallback.

## To improve answers, in this order
1. **Add or fix a chunk in `docs/ai-assistant-kb.md`** ("## Title", a `url:` line, plain text; say "home", never "house"; no prices or dates). Then run `node scripts/build-chat-kb.mjs`. `npm test` fails if the generated file is stale.
2. Fix or add a **Help Center article** (migrations; see `docs/help-updates.md`). The chat reads them live.
3. Change the matching: `rankChunks`, `rankArticles`, `eventRows`, `GENERIC` words in `chatkb.js`.
4. Change the wording of `RULES` in `chatkb.js` (the system prompt). Keep every safety line.
5. Add a test to `tests/chat.test.mjs` for each fixed question.
Do not loosen the output filters in `chatguard.js` to make an answer pass: fix the source text instead.

## What we learned from real transcripts (the owner pasted these)
- **"What events are on this weekend?"** answered "I do not have that information. Check the EVENTS block": (a) the model named an internal block, (b) "this weekend" was not turned into dates, so events were not date-matched. Fixed on 2026-11-08: `dateWindow()` turns tonight / tomorrow / this weekend / this week into dates, events must overlap them; `RULES` now forbids naming the blocks and says to point to the map when no event is listed. Not yet re-checked with the real model.
- **"How do I invite judges to my contest?"** gave good steps but said how to open the dashboard "is not specified in the sources". Fixed: new chunk "How an organizer opens the contest dashboard" (account circle > Your contests > Manage, or Manage this contest on the contest page; `/c/<name>/manage`). The answer also said "tap Judges", but the Judges tab only shows when a contest has judging turned on; check the chunk "Judges and how judging works" and the Help article "Add co-organizers and judges" say where judges are added.
- A user asked about a named event ("Lake Forest Tree Lighting Ceremony"): name words are matched against event name, city, county and venue; test that real event names are found.

## Work done in this project about the assistant (chronological)
- Built and shipped it OFF (migration `0198_chat_assistant.sql`: `chat_settings`, `chat_usage`, `chat_topics`); privacy and Terms sections "AI assistant".
- Round "?" button only on phones (PR 457).
- **Chat now follows the visitor across pages (this session):** `footer.js` loads `chat.js` on content pages (map, Help, Tutorials, Pricing, Privacy, Terms, Contests, contest pages, city, past results, event and installer pages, Profile, and `/add`); not on forms, checkout or admin. The chat is kept in the browser tab only (`sessionStorage`, key `scl-chat`, last 40 lines), so it survives clicking a link the assistant gave; it stays closed on the new page until opened; "Start over" or closing the tab erases it. Privacy page and the widget note were reworded to say so (the owner and the attorney should read the Privacy wording). Server side is unchanged: no message text is stored.

## Constraints to keep
- **Counters only on the server.** No message text, IP or visitor id is stored. So there is no transcript log to train on: the only training signals are (a) transcripts the owner pastes, (b) the "unanswered topics" counts in Admin, (c) the test list.
- Prices only from the code; dates only from live events and contests; never invent steps or buttons; "home", not "house"; payment never affects results.
- Real-model quality, cost per answer and the model choice (Workers AI default `@cf/meta/llama-3.1-8b-instruct-fp8-fast`, optional Claude Haiku via `CHAT_PROVIDER=claude`) are still **untested** against Cloudflare/Anthropic numbers.
- Working rules: one branch, open a PR, wait for the owner to say "merge"; bump `?v=` on every changed CSS/JS asset (tests enforce one `?v=` per asset); update `docs/status.md` at the end of a session; push only to the session's designated branch.

## Suggested first steps for the training session
1. Read `docs/ai-assistant.md`, this file, `chatkb.js` and `tests/chat.test.mjs`.
2. Ask the owner for 20 to 30 real questions (a mix: events, contests, organizers, installers, pricing, accounts) and the answers they got.
3. For each bad answer: find which source is missing or mismatched, fix it in the order above, add a test.
4. Review `docs/ai-assistant-kb.md` against the live site for stale navigation (the account menu, app frame, Help and Pricing layouts changed recently).
