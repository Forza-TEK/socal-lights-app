// Help Center article for organizer-collected sponsors (2026-11-07). `node scripts/help/updates-contest-sponsors.mjs` writes migrations/<NUM>_help_contest_sponsors.sql and the paste-ready text in docs/help-updates.md.
// INSERT OR IGNORE only: an article that exists (or was edited in Admin > Help Center) is never replaced. No prices. "home", not "house" or "display". Never "Everything in ...".
import { readFileSync, writeFileSync } from "node:fs";

export const NUM = process.env.MIGRATION_NUM || "0190";
export const NEW = [
  { slug: "add-sponsors-to-your-contest", category: "run", kind: "howto", sort: 35, title: "Add sponsors to your contest",
    summary: "Record a sponsor who paid you, or send them a private invite link. Approve them for the contest page after you receive the payment. The money goes to you, not to SoCal Lights.",
    keywords: "sponsor sponsors invite link payment link levels queue approve decline logo receipt invoice paid payment organizer donate in kind show contest page permission private",
    body: `A sponsor can support your contest with money or goods. **The sponsorship money goes to you, the organizer, not to SoCal Lights.** You collect it, receipt it and report it. SoCal Lights does not process, hold or guarantee it. Sponsors do not influence results, and payment never affects who wins.

## Add a sponsor
1. Open your dashboard and tap **Sponsors**.
2. Fill in the company name, the contact name and, if you like, the website, phone, email, amount and logo (JPG, PNG or WebP under 600 KB). Pick a level.
3. Under **How the sponsorship counts**, choose one:
   - **Paid to me (the organizer):** tick **Payment collected by me**, enter the date you received it and how it was paid (cash, check, bank transfer, card on your own system, invoice paid, or your own words). You can upload the receipt or paid invoice (PDF, JPG or PNG under 5 MB).
   - **Donated in kind:** say what was donated, for example yard signs or printing.
4. Tick that you have the sponsor's **permission** to list their name and logo and to keep their contact details here.
5. Tick **Show on the contest page** and tap **Save sponsor**.

## Let sponsors send you a request
Once your contest is live and we have approved it, your Sponsors tab has two more cards.
1. **How sponsors pay you.** Add your own payment link (an https:// link such as Venmo, PayPal, Stripe or your city's portal) and/or plain words, for example "Checks payable to City of Covina, mail to ...". You can also add up to three levels, each with a name and a dollar amount, such as Presenting, Gold and Supporter. They are only shown to sponsors: the site never charges anyone.
2. **Invite a sponsor.** Tap **Create invite link**. You get a private link that you can copy or send by email. A sponsor opens it (no account), reads that the money goes to you, sees your payment link, and fills in a short form. Tap **Turn link off** to stop it, or **Make a new link** to replace it (the old one stops working).

When a sponsor sends the form we email you, and the request waits under **Waiting for your review**. For each one you can:
- **Mark payment received:** enter the date, how it was paid and, if you like, upload the receipt.
- **Approve for the contest page:** only after the payment is received (or marked donated in kind). Nothing shows before you approve.
- **Decline:** add a short note if you like. We email the sponsor politely.
- **Remove:** delete the request.

SoCal Lights has not verified your payment link, and tells sponsors to pay only organizers they know. If your contest is still waiting for our review, these two cards say so and unlock when we approve it.

## What people see
The contest page shows the logo, name and link, labeled "Sponsor", and says that sponsors do not influence results and that sponsorship payments go to the organizer. A sponsor shows only when you confirmed the payment (or the in-kind gift), ticked the permission and chose to show it. Until then it is saved but not shown.

## Privacy
The contact details, the amount and the receipt are visible only to you, your co-organizers and SoCal Lights staff. The receipt is stored privately and is never shown on a page or in a list. They are deleted 24 months after the contest's voting ends, or when you remove the sponsor or delete your account. SoCal Lights staff can hide a sponsor from a contest page.

## Running the contest again
When you run a contest again, sponsors are copied as unconfirmed drafts. Confirm each payment (or gift) and permission again before they show.

See [Run it again](/help/edit-your-contest-and-change-dates) and [Contest passes](/help/contest-passes).` },
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
  for (const a of NEW) { if (/everything (in|above)/i.test(a.body)) throw new Error("banned wording"); if (/\$\d/.test(a.body)) throw new Error("a price"); if (/\b(house|display)s?\b/i.test(a.body)) throw new Error("say home"); }
  const ins = NEW.map((a) => `INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES (${[a.slug, a.title, a.category, a.kind, a.summary, a.body, a.keywords, "", a.sort, "published", "seed"].map((v) => (typeof v === "number" ? v : q(v))).join(", ")});`);
  writeFileSync(`migrations/${NUM}_help_contest_sponsors.sql`, `-- Help Center: one new article about organizer-collected sponsors (see scripts/help/updates-contest-sponsors.mjs). INSERT OR IGNORE, so an existing or Admin-edited article is never replaced.\n${ins.join("\n")}\n`);
  const ind = (t) => t.split("\n").map((l) => "    " + l).join("\n"), a = NEW[0];
  let doc = readFileSync("docs/help-updates.md", "utf8");
  const head = "## Add sponsors to your contest (2026-11-07)";
  doc = doc.replace(new RegExp(`\\n${head.replace(/[()]/g, "\\$&")}[\\s\\S]*?(?=\\n## |$)`), "").replace(/\s*$/, "\n");
  doc += `\n${head}\nMigration \`${NUM}_help_contest_sponsors.sql\` adds this article (new, nothing to paste unless it did not appear: then Admin > Help Center > New article).\n\nCategory: ${a.category}. Type: ${a.kind}. Order: ${a.sort}.\n\nTitle:\n\n${ind(a.title)}\n\nOne-sentence answer:\n\n${ind(a.summary)}\n\nSearch words:\n\n${ind(a.keywords)}\n\nText:\n\n${ind(a.body)}\n`;
  writeFileSync("docs/help-updates.md", doc);
  console.log("ok", NUM);
}
