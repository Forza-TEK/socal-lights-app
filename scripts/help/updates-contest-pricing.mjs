// Help Center update for the new contest pricing (owner decision 2026-11-09: organizers pay from the first contest). `node scripts/help/updates-contest-pricing.mjs` writes
// migrations/<NUM>_help_contest_pricing.sql and the paste-ready text in docs/help-updates.md.
// Same safe pattern as 0188: UPDATE ... WHERE updated_by = 'seed' only touches articles nobody edited in Admin > Help Center (an Admin save sets updated_by to the admin's email), so an edited
// article is skipped (its new text is in docs/help-updates.md to paste). Existing text is replaced with replace(), so the rest of an article is left alone.
// Prices are NOT written in these articles: they live only in code (functions/_lib/passes.js) and are shown on /pricing, so an article can never go stale on a price.
// Word rule (owner): "home", not "house" or "display", for a lit home. Never "Everything in ...". No "free forever".
import { readFileSync, writeFileSync } from "node:fs";

export const NUM = process.env.MIGRATION_NUM || "0213";
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;

export const PASS = {
  slug: "contest-passes", title: "Contest passes: what running a contest costs",
  summary: "Organizers choose a contest pass before a contest goes live: a single contest, up to 5 or up to 20 in a 12-month window. Entering and voting stay free, and payment never affects a result.",
  keywords: "contest pass cost price pay single contest up to 5 up to 20 12 month window upgrade founding partner organization limit count paywall refund how much does a contest cost",
  body: `**Running a contest needs a contest pass.** The organizer chooses a pass before the contest goes live. Residents enter and vote for free. The [Pricing page](/pricing) shows what each pass costs.

## What a pass is
A pass sets the total number of contests your organization may run in a 12-month window: a single contest, up to 5 contests or up to 20 contests. For more than 20 contests, write to info@socallights.app. A pass only counts contests. Every contest still has resident entries, voting by the public, judges or both, People's Choice and Judges' Choice awards, its own page, link, QR code and poster, and an organizer dashboard. Entering and voting stay free for everyone, and payment never affects any result, vote, judge or ranking.

## Who "your organization" is
- If your sign-in email matches the website you give for the contest (for example, an address at your city's own website), the organization is that website. Everyone at that organization shares one window.
- Otherwise the organization is you, with your own account.
- Co-organizers and staff do not create separate organizations.

## The 12-month window
- It starts the day you buy your pass, or the day your organization's first contest goes live if that comes first. It ends the day before the same date a year later.
- A contest counts when it goes live. A draft, a contest held for our review, a declined contest and a contest that was never live do not count. A contest that was live and later unpublished still counts.
- When the window ends, your next contest needs a new pass.
- Contests that were already live or announced before contest passes began are not affected: they are not counted and they do not need a pass.

## When you choose a pass
1. Start a contest as usual: tap **Add**, then **A contest**, and fill in the screens. Nothing is lost if you have to leave.
2. On the Review screen, if your organization has no pass with room for the contest, you see the passes instead of the contest being created.
3. Tap **Choose** on a pass and pay on Stripe's secure page. Your details are kept in your browser, and your contest is created by itself when you come back.
You can also choose a pass ahead of time on the [contest pass page](/contest-pass). To upgrade inside your window, choose a bigger pass and pay only the difference.

## Founding partners
We sometimes give an organization contests for a period. Then the page says "Founding partner: free through" a date, and no price is shown.

## Refunds
If we cannot apply your pass, you get a full refund. Write to info@socallights.app for help. See the [Terms](/terms#passes) for the details.

See also [Is SoCal Lights free?](/help/is-it-free) and [Create a contest with Quick start](/help/create-a-contest-quick-start).`,
};

// create-a-contest-quick-start and create-a-contest-customize end with a paragraph written by 0188.
export const PARA_FROM = `## Your first contest is free
Your organization's first contest in every 12-month window is free. To run more contests in the same window, the Review screen shows the contest passes when you need one, and your contest is created as soon as you pay. See [Contest passes](/help/contest-passes).`;
export const PARA_TO = `## Choosing a contest pass
Running a contest needs a contest pass. The Review screen shows the passes when your organization needs one, and your contest is created as soon as you pay. Residents enter and vote for free. See [Contest passes](/help/contest-passes).`;
export const PARA_SLUGS = ["create-a-contest-quick-start", "create-a-contest-customize"];

// is-it-free (as written by 0184 and 0188)
export const FREE_FROM_1 = `Your organization's first contest in every 12-month window is free as well. To run more contests in the same window you buy a contest pass: Up to 5, Up to 10 or Up to 20 contests in total, counting the free one. See [Contest passes](/help/contest-passes).`;
export const FREE_TO_1 = `Organizers who run a contest buy a contest pass: a single contest, up to 5 or up to 20 in a 12-month window. Residents still enter and vote for free. See [Contest passes](/help/contest-passes).`;
export const FREE_FROM_2 = `- **Contest passes** are for organizers who run more than one contest in 12 months.`;
export const FREE_TO_2 = `- **Contest passes** are how organizers pay for running a contest.`;
export const FREE_FROM_3 = `Using SoCal Lights is free. The map, search, routes and voting stay free for everyone.`;
export const FREE_TO_3 = `Using SoCal Lights is free for residents and visitors. The map, search, routes and voting stay free for everyone.`;

// edit-your-contest-and-change-dates
export const EDIT_FROM = `so a second contest in the same window may need a [contest pass](/help/contest-passes).`;
export const EDIT_TO = `so your [contest pass](/help/contest-passes) needs room for it, and a new pass is needed once the window has ended.`;

const rep = (slug, from, to) => `UPDATE help_articles SET body = replace(body, ${q(from)}, ${q(to)}), updated_at = datetime('now') WHERE slug = ${q(slug)} AND updated_by = 'seed' AND body LIKE ${q("%" + from.slice(0, 40) + "%")};`;

export function build() {
  for (const t of [PASS.title, PASS.summary, PASS.body, PARA_TO, FREE_TO_1, FREE_TO_2, FREE_TO_3, EDIT_TO]) {
    if (/everything (in|above)/i.test(t)) throw new Error("banned wording");
    if (/\$\d/.test(t)) throw new Error("a price in a Help article");
    if (/\b(house|display)s?\b/i.test(t)) throw new Error("say home, not house/display");
    if (/free forever/i.test(t)) throw new Error("no free forever");
  }
  return [
    `UPDATE help_articles SET title = ${q(PASS.title)}, summary = ${q(PASS.summary)}, body = ${q(PASS.body)}, keywords = ${q(PASS.keywords)}, updated_at = datetime('now') WHERE slug = ${q(PASS.slug)} AND updated_by = 'seed';`,
    ...PARA_SLUGS.map((s) => rep(s, PARA_FROM, PARA_TO)),
    rep("is-it-free", FREE_FROM_1, FREE_TO_1), rep("is-it-free", FREE_FROM_2, FREE_TO_2), rep("is-it-free", FREE_FROM_3, FREE_TO_3),
    rep("edit-your-contest-and-change-dates", EDIT_FROM, EDIT_TO),
  ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(`migrations/${NUM}_help_contest_pricing.sql`, `-- Help Center: new contest pricing, organizers pay from the first contest (see scripts/help/updates-contest-pricing.mjs). Edits the contest-passes article and the sentences that said the first contest is free, each only while updated_by is still 'seed' (an article edited in Admin > Help Center is never overwritten; the text is in docs/help-updates.md to paste). Add-only: it does not touch an earlier migration. No prices are written in the articles: they are on /pricing.\n${build().join("\n")}\n`);
  const ind = (t) => t.split("\n").map((l) => "    " + l).join("\n");
  let doc = readFileSync("docs/help-updates.md", "utf8");
  const head = "## Contest pricing: organizers pay from the first contest (2026-11-09)";
  doc = doc.replace(new RegExp(`\\n${head.replace(/[()]/g, "\\$&")}[\\s\\S]*$`), "").replace(/\s*$/, "\n");
  doc += `\n${head}\nMigration \`${NUM}_help_contest_pricing.sql\` rewrites the contest-passes article and replaces the sentences that said the first contest is free, only where nobody edited the article in Admin. For an article you edited, paste by hand. Do this only when the new pricing goes live.\n\n### contest-passes (replace title, one-sentence answer, search words and text)\n\nTitle:\n\n${ind(PASS.title)}\n\nOne-sentence answer:\n\n${ind(PASS.summary)}\n\nSearch words:\n\n${ind(PASS.keywords)}\n\nText:\n\n${ind(PASS.body)}\n\n### Replace a paragraph or sentence\n\n${[["create-a-contest-quick-start and create-a-contest-customize", PARA_FROM, PARA_TO], ["is-it-free", FREE_FROM_1, FREE_TO_1], ["is-it-free", FREE_FROM_2, FREE_TO_2], ["is-it-free", FREE_FROM_3, FREE_TO_3], ["edit-your-contest-and-change-dates", EDIT_FROM, EDIT_TO]].map(([s, f, t]) => `- \`${s}\`: replace\n\n${ind(f)}\n\n  with\n\n${ind(t)}\n`).join("\n")}`;
  writeFileSync("docs/help-updates.md", doc);
  console.log("ok", NUM);
}
