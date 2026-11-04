# Help Center (`/help`)

Written articles for visitors, homeowners, voters, judges and organizers. Plan and research: `docs/help-center-plan.md`. The AI assistant is not built yet (an owner decision).

## What is where
| Piece | Where |
|---|---|
| Pages | `functions/help/index.js` (`/help`, `/help?q=`), `functions/help/[slug].js` (`/help/<slug>`), look in `functions/_lib/helpui.js`, text and search in `functions/_lib/help.js` |
| Search and votes | `functions/api/help/search.js`, `vote.js`, `contact.js` |
| Data | D1 tables `help_articles`, `help_searches`, `help_votes` (migration 0152) |
| First articles | `scripts/help/articles.mjs`, turned into migration 0153 by `node scripts/help/make-seed.mjs` (INSERT OR IGNORE, so edits made in Admin are never overwritten) |
| Editing | Admin > Help Center (`public/admin/help.js`, `functions/api/admin/help/`) |
| Check the seed articles | `node scripts/help/check.mjs` (links, video files) |

## How it works
- **Categories** match the Tutorials page groups, plus "Account, privacy and safety". They are fixed in `functions/_lib/help.js`.
- **Three article types:** How to, Fix a problem, Answer. Each has a title in the words people use, a one-sentence answer, steps, and (for how-tos) the tutorial video in a Computer and a Phone version.
- **Search** reads the published articles and scores title, extra words, the one-line answer and the text. Every word typed must match. A search is logged (words and result count only) after the person stops typing or presses Search.
- **"Was this helpful?"** stores yes or no, and an optional note on a no. The fingerprint is a one-way hash of the connection and the day, so one person cannot vote many times.
- **"Still stuck? Ask us"** writes to Admin > Reports (the same list as "Something wrong? Tell us"), five an hour per connection, with the article it came from.
- Pages are cached for a minute, so a saved edit is live within about a minute.

## Writing and keeping articles
- Text format: blank line = new paragraph, `- ` = list, `1. ` = numbered step, `## ` = small heading, `**bold**`, `[text](/help/other-article)`.
- Put the answer first, use the app's own button names exactly, keep steps to about seven.
- Weekly: open Admin > Help Center. "Searches with no result" and "What people said was missing" show what to write next. Articles with more "not helpful" than "helpful" votes need a rewrite.
- After a feature change: update the article, then the video (`docs/tutorials.md`), so the two never disagree.
