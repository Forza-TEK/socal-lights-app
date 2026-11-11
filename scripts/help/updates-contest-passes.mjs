// SUPERSEDED by scripts/help/updates-contest-pricing.mjs (migration 0213): the old $50 / $75 / $100 passes and "first contest is free" are gone. Kept only so the history of migration 0188 can be regenerated.
// Help Center update for contest passes (2026-11-07). `node scripts/help/updates-contest-passes.mjs` writes migrations/<NUM>_help_contest_passes.sql and adds the paste-ready text to docs/help-updates.md.
// Same safe pattern as 0167/0168/0184: UPDATE ... WHERE updated_by = 'seed' only touches articles nobody edited in Admin > Help Center (an Admin save sets updated_by to the admin's email), so an
// edited article is skipped (its new text is in docs/help-updates.md to paste), and INSERT OR IGNORE never replaces an existing slug. Existing articles are changed by one appended paragraph or one
// replaced sentence, so the rest of their text (and the 0184 text) is left alone.
// Prices are NOT written in these articles: they live only in code (functions/_lib/passes.js) and are shown on /pricing, so an article can never go stale on a price.
// Word rule (owner): "home", not "house" or "display", for a lit home. Never "Everything in ...": list contents in full.
import { readFileSync, writeFileSync } from "node:fs";

export const NUM = process.env.MIGRATION_NUM || "0188";
export const NEW = [
  { slug: "contest-passes", category: "run", kind: "answer", sort: 15, title: "Contest passes: your first contest is free",
    summary: "Your organization's first contest in every 12-month window is free. To run more in the same window, choose a pass. Entering and voting stay free, and payment never affects a result.",
    keywords: "contest pass free first contest 12 month window cost price pay more contests upgrade founding partner organization limit count paywall refund",
    body: `**Your organization's first contest in every 12-month window is free.** To run more contests inside the same window, you buy a **contest pass**. The [Pricing page](/pricing) shows what each pass costs.

## What a pass is
A pass sets the total number of contests your organization may run in the window, the free first one included: Up to 5, Up to 10 or Up to 20. For more than 20 contests, write to info@socallights.app. A pass only counts contests. Every contest still has resident entries, voting by the public, judges or both, People's Choice and Judges' Choice awards, its own page, link, QR code and poster, and an organizer dashboard. Entering and voting stay free for everyone, and payment never affects any result, vote, judge or ranking.

## Who "your organization" is
- If your sign-in email matches the website you give for the contest (for example, an address at your city's own website), the organization is that website. Everyone at that organization shares one window.
- Otherwise the organization is you, with your own account.
- Co-organizers and staff do not create separate organizations.

## The 12-month window
- It starts the day your organization's first contest goes live and ends the day before the same date a year later.
- A contest counts when it goes live. A draft, a contest held for our review, a declined contest and a contest that was never live do not count. A contest that was live and later unpublished still counts.
- When the window ends, your next contest starts a new window and is free again.

## When you choose a pass
1. Start a contest as usual: tap **Add**, then **A contest**, and fill in the screens. Nothing is lost if you have to leave.
2. If the contest would be more than your window allows, the Review screen shows the passes instead of creating it. You see how many contests you have used and the exact dates of your window.
3. Tap **Choose** on a pass and pay on Stripe's secure page. Your details are kept in your browser, and your contest is created by itself when you come back.
You can also choose a pass ahead of time on the [contest pass page](/contest-pass). To upgrade inside your window, choose a bigger pass and pay only the difference.

## Founding partners
We sometimes give an organization free contests for a period. Then the page says "Founding partner: free through" a date, and no price is shown.

## Refunds
If we cannot apply your pass, you get a full refund. Write to info@socallights.app for help. See the [Terms](/terms#passes) for the details.

See also [Is SoCal Lights free?](/help/is-it-free) and [Create a contest with Quick start](/help/create-a-contest-quick-start).` },
];

// Paragraph appended to the two create-a-contest articles (and not again if it is there).
export const APPEND = `## Your first contest is free
Your organization's first contest in every 12-month window is free. To run more contests in the same window, the Review screen shows the contest passes when you need one, and your contest is created as soon as you pay. See [Contest passes](/help/contest-passes).`;
export const APPEND_SLUGS = ["create-a-contest-quick-start", "create-a-contest-customize"];
// One sentence of is-it-free (as written by migration 0184) gets a second sentence.
export const FREE_FROM = "Entering a contest is free and votes are never sold.";
export const FREE_TO = "Entering a contest is free and votes are never sold. Your organization's first contest in every 12-month window is free too; to run more in the same window you buy a contest pass (see [Contest passes](/help/contest-passes)).";

if (import.meta.url === `file://${process.argv[1]}`) {
  const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
  for (const t of [...NEW.map((a) => a.body), APPEND, FREE_TO]) { if (/everything (in|above)/i.test(t)) throw new Error("banned wording"); if (/\$\d/.test(t)) throw new Error("a price in a Help article"); if (/\b(house|display)s?\b/i.test(t)) throw new Error("say home, not house/display"); }
  const ins = NEW.map((a) => `INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES (${[a.slug, a.title, a.category, a.kind, a.summary, a.body, a.keywords, "", a.sort, "published", "seed"].map((v) => (typeof v === "number" ? v : q(v))).join(", ")});`);
  const app = `UPDATE help_articles SET body = body || char(10) || char(10) || ${q(APPEND)}, updated_at = datetime('now') WHERE slug IN (${APPEND_SLUGS.map(q).join(", ")}) AND updated_by = 'seed' AND body NOT LIKE '%/help/contest-passes%';`;
  const free = `UPDATE help_articles SET body = replace(body, ${q(FREE_FROM)}, ${q(FREE_TO)}), updated_at = datetime('now') WHERE slug = 'is-it-free' AND updated_by = 'seed' AND body NOT LIKE '%/help/contest-passes%';`;
  writeFileSync(`migrations/${NUM}_help_contest_passes.sql`, `-- Help Center: contest passes (see scripts/help/updates-contest-passes.mjs). One new article (INSERT OR IGNORE) plus a paragraph on the two create-a-contest articles and one sentence on is-it-free, each only while updated_by is still 'seed' (an article edited in Admin > Help Center is never overwritten; the text is in docs/help-updates.md to paste). No prices are written in the articles: they are on /pricing.\n${[...ins, app, free].join("\n")}\n`);
  const ind = (t) => t.split("\n").map((l) => "    " + l).join("\n");
  let doc = readFileSync("docs/help-updates.md", "utf8");
  const head = "## Contest passes (2026-11-07)";
  doc = doc.replace(new RegExp(`\\n${head.replace(/[()]/g, "\\$&")}[\\s\\S]*$`), "").replace(/\s*$/, "\n");
  doc += `\n${head}\nMigration \`${NUM}_help_contest_passes.sql\` adds one article and two small edits, only where nobody edited the article in Admin. For an article you edited, paste by hand.\n\n### New article: contest-passes\nCategory: ${NEW[0].category}. Type: ${NEW[0].kind}. Order: ${NEW[0].sort}.\n\nTitle:\n\n${ind(NEW[0].title)}\n\nOne-sentence answer:\n\n${ind(NEW[0].summary)}\n\nSearch words:\n\n${ind(NEW[0].keywords)}\n\nText:\n\n${ind(NEW[0].body)}\n\n### Add at the end of create-a-contest-quick-start and create-a-contest-customize\n\n${ind(APPEND)}\n\n### In is-it-free, replace the sentence "${FREE_FROM}" with\n\n${ind(FREE_TO)}\n`;
  writeFileSync("docs/help-updates.md", doc);
  console.log("ok", NUM);
}
