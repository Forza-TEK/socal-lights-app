// Help Center pricing update (2026-11-06): the two articles that describe Featured plans, for the new event pricing.
// `node scripts/help/updates-0168.mjs` writes migrations/0168_help_featured_pricing.sql and replaces those two sections in docs/help-updates.md.
// Same safe pattern as 0167 (scripts/help/updates.mjs): UPDATE ... WHERE updated_by = 'seed' only touches articles nobody edited in Admin > Help Center
// (an Admin save sets updated_by to the admin's email), so an edited article is skipped; its new text is in docs/help-updates.md to paste.
// Word rule (owner): "home", not "house" or "display". Plan wording matches public/feature-plans.js.
import { readFileSync, writeFileSync } from "node:fs";

export const UPDATES = [
  { slug: "is-it-free", category: "account", kind: "answer", sort: 10, title: "Is SoCal Lights free?",
    summary: "Yes. Finding lights, routes, voting and entering a home are free, and votes are never sold. Featured is the one optional paid extra.",
    keywords: "free cost price pay charge fee money tip cash app featured paid winner podium buy full run $10 $15 $25",
    body: `Using SoCal Lights is free. The map, search, routes and voting stay free for everyone. Entering a contest is free and votes are never sold.

## Featured is the one paid option
A **Featured** listing has a gold badge and a bigger gold-ringed pin on the map. It is optional, and it is the only thing on SoCal Lights that costs money today. Featured listings are always labeled.

- **Events** can be featured by their organizer: **Featured pin** $10, **Top of the list** $15, or **Full run** $25 for events that run 31 days or more. The placement starts when you pay and ends on your event's last day, up to 30 days (up to 90 days for Full run).
- **Homes** can be featured only by the owner of a home that finished winner, 2nd or 3rd place in a contest, after the winners are announced. Featured pin $10 or Top of the list $15, for 30 days.
- **Paying never affects a contest.** It cannot change who wins or any contest result.

See [Feature an event or a home](/help/feature-an-event-or-home) and the [Pricing page](/pricing).

If you would like to help keep it free, there is a **Keep SoCal Lights Free** row in the three-dots menu.` },

  { slug: "feature-an-event-or-home", category: "post", kind: "howto", sort: 30, title: "Feature an event or a home",
    summary: "Featured is optional and paid. Open the Feature page, choose your event or winning home, pick a plan and pay on Stripe.",
    keywords: "feature featured event home pin gold badge top of the list full run plan price pay stripe winner second third promote advertise opens 30 days last day",
    body: `A **Featured** listing has a gold badge and a bigger gold-ringed pin on the map. It is optional.

## An event
1. Open the Feature page at [socallights.app/feature](/feature).
2. Find your event. If it is not on the map yet, add it for free first. If it is yours but you did not add it, tap **Claim this event**.
3. Pick a plan (below).
4. Tap **Continue to payment** and pay on Stripe's secure page.

### The plans for an event
**Featured pin, $10**
- A gold-ringed pin on the map
- A "Featured" badge on your event in the list and its details
- Runs from today until your event's last day, up to 30 days

**Top of the list, $15**
- A gold-ringed pin on the map
- A "Featured" badge on your event in the list and its details
- Your event is listed first when people browse your area
- Runs from today until your event's last day, up to 30 days

**Full run, $25** (events that run 31 days or more)
- A gold-ringed pin on the map
- A "Featured" badge on your event in the list and its details
- Your event is listed first when people browse your area
- Runs from today until your event's last day, up to 90 days

### When it starts and ends
- Featuring opens 30 days before your event starts. If you try sooner, the page tells you the date to come back. An event that is already running can be featured any time.
- Your placement starts when you pay and ends on your event's last day, as the date is on the map when you pay. If the event's dates change later, the placement does not change.
- Full run is for events that run 31 days or more and still have at least 7 days left.
- Buying again adds time only if the earlier placement ended at the 30-day (or 90-day) limit rather than your event's last day. If it already runs to the last day, there is nothing to add; you can still upgrade the pin to Top of the list.

## A home
Only the owner of a home that finished winner, 2nd or 3rd place in an announced contest can feature it. Paying never changes a contest result.

**Featured pin, $10**
- A gold-ringed pin on the map
- A "Featured" badge on your home in the list and its details
- Runs for 30 days from today

**Top of the list, $15**
- A gold-ringed pin on the map
- A "Featured" badge on your home in the list and its details
- Your home is listed first when people browse your area
- Runs for 30 days from today

## Good to know
- You pay once per event or home. There is no subscription.
- Featured listings are always labeled, and they still have to be real and accurate.
- The map, search, routes and voting stay free. See [Is SoCal Lights free?](/help/is-it-free).
- Featured is bought on the website, not in the app.` },
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
  const slugs = new Set(UPDATES.map((a) => a.slug));
  for (const a of UPDATES) for (const [, s] of a.body.matchAll(/\]\(\/help\/([a-z0-9-]+)\)/g)) if (!slugs.has(s) && !/^(is-it-free|feature-an-event-or-home)$/.test(s)) throw new Error(`${a.slug} links to missing /help/${s}`);
  for (const a of UPDATES) if (/everything (in|above)/i.test(a.body)) throw new Error("banned wording in " + a.slug);
  const up = UPDATES.map((a) => `UPDATE help_articles SET title = ${q(a.title)}, summary = ${q(a.summary)}, body = ${q(a.body)}, keywords = ${q(a.keywords)}, updated_at = datetime('now') WHERE slug = ${q(a.slug)} AND updated_by = 'seed';`);
  writeFileSync("migrations/0168_help_featured_pricing.sql", `-- Help Center: new Featured event pricing (see scripts/help/updates-0168.mjs). Changed only while updated_by is still 'seed', so an article edited in Admin > Help Center is never overwritten (its text is in docs/help-updates.md to paste).\n${up.join("\n")}\n`);
  const ind = (t) => t.split("\n").map((l) => "    " + l).join("\n");
  const blk = (a) => `## ${a.slug}\nExisting article (updated by migration 0168). Category: ${a.category}. Type: ${a.kind}. Order: ${a.sort}.\n\nTitle:\n\n${ind(a.title)}\n\nOne-sentence answer:\n\n${ind(a.summary)}\n\nSearch words:\n\n${ind(a.keywords)}\n\nText:\n\n${ind(a.body)}\n`;
  let doc = readFileSync("docs/help-updates.md", "utf8");
  for (const a of UPDATES) {
    const re = new RegExp(`## ${a.slug}\\n[\\s\\S]*?(?=\\n## |$)`);
    if (!re.test(doc)) throw new Error("section missing in docs/help-updates.md: " + a.slug);
    doc = doc.replace(re, () => blk(a).replace(/\n$/, ""));
  }
  const note = "Update 2026-11-06 (new Featured event pricing): `is-it-free` and `feature-an-event-or-home` below carry the newer text from migration `0168_help_featured_pricing.sql`, which replaces what 0167 wrote for them (again only where nobody edited the article in Admin). If you edited either article in Admin, paste the blocks below over it. Regenerate with `node scripts/help/updates-0168.mjs`.\n\n";
  if (!doc.includes("Update 2026-11-06 (new Featured")) doc = doc.replace("Normally you do nothing:", note + "Normally you do nothing:");
  writeFileSync("docs/help-updates.md", doc);
  console.log("ok");
}
