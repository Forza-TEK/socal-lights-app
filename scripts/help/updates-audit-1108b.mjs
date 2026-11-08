// Help Center re-audit of 2026-11-08 (second pass, after 0199/0200): five new articles and eight small corrections.
// `node scripts/help/updates-audit-1108b.mjs` writes migrations/<NUM>_help_audit_gaps_2026-11-08.sql and appends the paste-ready text to docs/help-updates.md.
// Same safe pattern as 0167/0188/0190/0199: new articles are INSERT OR IGNORE (an existing or Admin-edited article is never replaced); every UPDATE has
// AND updated_by = 'seed', so an article edited in Admin > Help Center is skipped (its new text is in docs/help-updates.md to paste). Slugs never change.
// No prices in articles (they live in code and on /pricing). Word rule (owner): "home", not "house" or "display" (quoted button names are what the screen says).
import { writeFileSync, readFileSync } from "node:fs";
export const NUM = process.env.MIGRATION_NUM || "0201";

export const NEW = [
  { slug: "add-a-home-without-a-contest", category: "post", kind: "howto", sort: 22,
    title: "Add your home without entering a contest",
    summary: "You do not need a contest. Tap Add, then A lighting display, fill in the steps and your home goes on the map for free.",
    keywords: "add home without contest not in a contest no contest list my home put my lights on map showcase homeowner installer free which button",
    body: `You can put your home's lights on the map without entering any contest. It is free, and there is no voting, no judges and no organizer to wait for.

## Which button do I tap?
The Add page has three choices:
- **An event** is for a tree lighting, parade, market or other seasonal event.
- **A contest** is for organizers who want to run a neighborhood contest. It is not how you enter one.
- **A lighting display** is for your home's lights. This is the one you want.

Add is in the account circle menu when you are signed in (**Add an event, home or contest**), or under the three dots at the top right of the map when you are not. You can also go straight to socallights.app/add.

## The steps
1. Tap **Add**, then **A lighting display**.
2. Sign in with Google or an emailed code if asked. Your home is saved to your account.
3. Choose **A homeowner** (or **A professional installer**), then type the name to show.
4. Say whether a company installed your lights, then choose the season.
5. Name your home and tell us what makes it special.
6. Add the address. The pin goes here, and visitors see it so they can drive by.
7. Tell families when the lights are on and how to see them. This part is optional.
8. Add photos. Photos are optional too: you can skip them and add them later by email.
9. Check everything and tap **Put it on the map**.

Nothing goes public until the last step, and you can save and exit at any time. Saved drafts are in [your profile](/help/your-profile). On the last step there is also an optional, unchecked box for the [monthly update email](/help/monthly-update-email).

## How this is different from a contest entry
- Most homes go live right away. If we hold one for a quick check, the site owner publishes it and may email you. In a contest the organizer usually approves each entry first.
- A home you add this way is not in any contest, so nobody votes on it and it cannot win. You can enter a contest later: see [Enter your home in a contest](/help/enter-your-home-in-a-contest). That is a separate entry.
- You manage it from **Your profile**, on the **Displays** tab: edit it, take it down for the season, put it back, or delete it.
- Your address and photos are public, so only add an address you want people to visit. See [Is my home address public?](/help/is-my-address-public).

## Is your home already on the map?
Some homes are on the map already, with a photo from the street. If yours is one of them, use **Is this your home? Claim it** on its card instead of adding it again. See [Is this your home? Claim it](/help/claim-your-home).

More detail on each step is in [Show off your home on the map](/help/show-off-your-house).` },

  { slug: "sponsor-a-contest-with-an-invite-link", category: "sponsors", kind: "howto", sort: 40,
    title: "Sponsor a contest with an invite link",
    summary: "Open the organizer's private link, pay the organizer directly, then send the short form. Nothing shows on the contest page until the organizer approves it.",
    keywords: "sponsor a contest sponsor invite link s page business sponsor company logo pay organizer how to pay send to the organizer link not active sponsor form",
    body: `A contest organizer may send you a private sponsor link. It starts with socallights.app/s/ and then a string of letters and numbers. This page explains what you will see. You do not need an account.

**Your sponsorship goes to the organizer, not to SoCal Lights.** SoCal Lights does not process, hold or guarantee sponsorship payments, and sponsors do not influence who wins.

## The steps
1. Open the link. The page says **Sponsor** and the contest's name, who runs it, and the dates for entries and voting.
2. If the organizer gave payment details, **How to pay** shows their payment link and any instructions they wrote. Pay the organizer directly. SoCal Lights has not checked that link, so only pay organizers you know, and confirm the details with them first.
3. Under **Tell the organizer about your sponsorship**, choose a **Sponsor level** if the organizer set some (or **Other**, and say what you have in mind in your message).
4. Type your name, your company name and your email. The website, phone, message and logo are optional. A logo can be a PNG, JPG or WebP image under 1 MB.
5. Tick that you have permission to share your company's name and logo on the contest page, and that you understand your payment goes to the organizer. Both boxes are needed.
6. Complete the "I am human" check if it shows, then tap **Send to the organizer**.
7. You see a thank-you message and get a short confirmation email.

## What happens next
The organizer confirms they received your payment and then approves your listing. Only after that do your company name and logo appear on the contest page, labeled "Sponsor". The organizer can also decline a request, and you are emailed if they do. To change something after you have sent the form, ask the organizer.

## If the page says "This sponsor link isn't active"
The organizer switched the link off or replaced it with a new one. Ask them for the new link. Until you have confirmed the details with them, do not send any payment.

## Are you the organizer?
See [Add sponsors to your contest](/help/add-sponsors-to-your-contest) for how to create the link, record payments and approve sponsors.` },

  { slug: "ask-socal-lights-ai-assistant", category: "find", kind: "answer", sort: 70,
    title: "Ask SoCal Lights: the AI assistant",
    summary: "A chat button on the map and the Pricing page answers questions about the site, contests and events. It is an automated assistant, not a person, and it can be wrong.",
    keywords: "ask socal lights ai assistant chat chatbot bot help button question assistant not a person robot sparkle",
    body: `**Ask SoCal Lights** is an automated AI assistant. It answers questions about finding events and homes, how contests work, how to add something and what things cost. It is not a person, and it can be wrong.

## Open it
- Tap the **Ask SoCal Lights** button at the bottom right of the map or of the [Pricing](/pricing) page. On a phone it shows as a round button with a sparkle icon.
- The first time in a visit it asks for a quick "I am human" check. Then type your question, or tap one of the suggestions, and tap **Send**.
- Tap **Start over** to clear the chat, or the **x** to close it.

If you do not see the button, the assistant is switched off or unavailable right now. The Help Center and info@socallights.app always work.

## What it is good for
Questions such as how to enter or vote in a contest, how to add your home or an event, how sign-in works, what is on this weekend, or what an optional paid extra costs.

## What it will not do
- It does not tell you who won or who is ahead in a contest.
- It does not decide disputes, disqualifications, legal, tax or prize questions. For those, read the [Terms](/terms) or email info@socallights.app.
- It cannot look up your account or anyone's personal details, and it does not do anything for you on the site.
- It will not suggest that paying can help you win. It cannot: payment never affects a contest result.

Prices come only from the [Pricing](/pricing) page, so check it before you pay.

## Your privacy
Please do not type personal information such as names, addresses, phone numbers, email addresses or card numbers. Your chat stays in your browser tab only and is erased when you close the tab or tap **Start over**. We do not save what you type or what it answers. See the [privacy page](/privacy#ai-assistant) for the details.

Not sure the answer is right? Use the Help Center search, or [ask us](#ask).` },

  { slug: "monthly-update-email", category: "account", kind: "howto", sort: 55,
    title: "The optional monthly update email",
    summary: "It is separate from your account and your listings, and off unless you turn it on. Change or stop it in Your profile, on the Account tab, or from the link in the email.",
    keywords: "monthly update newsletter email seasonal recommendations opt in turn on turn off unsubscribe topics installer host family preferences profile account",
    body: `The monthly update is an optional email with seasonal recommendations. Having an account, a listing or a contest never signs you up. It stays off until you turn it on yourself.

## Turn it on in your profile
1. Tap your account circle at the top of the page, then **Your profile**.
2. Open the **Account** tab and find **Monthly update**.
3. Tick **Email me a monthly update with seasonal recommendations**.
4. Under **I am**, choose **Installer**, **Event or contest host** or **Family**.
5. Under **I would like**, tick any topics you want. They are optional. Installers can pick Seasonal reminders, Product updates and Shop and supply suggestions. Hosts can pick Planning tips and Upcoming opportunities. Families can pick Outings and Seasonal shopping ideas.
6. Tap **Turn on the monthly update**.

## Or tick the box when you add something
On the last step of adding an event, a home or a contest there is an optional, unchecked box with the same wording. It is separate from your listing: if you tick it, we save the choice after your listing is saved, and it never stops your listing from going through. You can change the role and topics later in your profile.

## Change it or stop it
- In **Your profile**, **Account**, **Monthly update**: change the role or topics and tap **Save**, or untick the box.
- Or use the link at the bottom of the email, which opens a preferences page with **Save** and **Unsubscribe**. You do not need to sign in. If you unsubscribe, we add your address to our do-not-contact list.
- Sponsored or affiliate content in the update will be clearly identified.

Deleting your account also ends the monthly update. See [How do I delete my account?](/help/delete-my-account).

## Other emails
This is different from the [weekly lights email](/help/weekly-lights-email) and from the service emails you get for sign-in codes and decisions about your listings. To see which emails you can stop, read [Stop emails from SoCal Lights](/help/stop-emails-from-socal-lights).` },

  { slug: "stop-emails-from-socal-lights", category: "account", kind: "howto", sort: 56,
    title: "Stop emails from SoCal Lights",
    summary: "Every reminder, update and weekly email has an unsubscribe link that works without signing in. Sign-in codes and decisions about your listings are service emails and cannot be turned off.",
    keywords: "unsubscribe stop emails opt out too many emails reminders updates results weekly email monthly update service emails do not contact one tap list-unsubscribe",
    body: `Which email is it? The way to stop it depends on the kind.

## Reminders, updates and result emails
These are the notification emails about listings and contests, such as a reminder, a change to a contest or its results. Each one ends with **Unsubscribe** in the footer.
1. Tap **Unsubscribe** in the email. A page asks **Stop these emails?** You do not need to sign in.
2. Tap **Unsubscribe**.
3. Changed your mind? The same page offers **Turn them back on**.

Your mail app may also show its own unsubscribe button for these emails, and that works too.

## The weekly lights email
Every weekly email has a link, **Unsubscribe from the weekly email**. One tap and you are off the list. See [Get the weekly lights email](/help/weekly-lights-email).

## The monthly update
Use the link at the bottom of the email, or turn it off in your profile. See [The optional monthly update email](/help/monthly-update-email).

## Service emails
Sign-in codes and decisions about your listings, such as an entry being approved or declined, are service emails. We send them because you asked for the code or took the action, so they have no unsubscribe link, even after you unsubscribe from the others. To stop all emails, write to info@socallights.app from the address you want removed, or delete your account: [How do I delete my account?](/help/delete-my-account).

When you unsubscribe, we add your address to our do-not-contact list so we do not contact you about SoCal Lights for other reasons either. We keep a scrambled code of your address for that, not the address itself.

Not getting emails you want? See [I did not get the email](/help/i-did-not-get-the-email). Anything else, [ask us](#ask).` },
];

// Small corrections to existing articles. Each is { slug, set } where set is a list of SQL expressions applied only while updated_by = 'seed'.
// "replace" swaps one exact sentence for another (a no-op if the sentence is not there); "append" adds a section once.
const q = (s) => "'" + String(s).replaceAll("'", "''") + "'";
export const EDITS = [
  { slug: "find-professionally-installed-displays", title: "Find professionally installed homes", why: "Owner word rule: home, not display, in a title." },
  { slug: "find-lights-near-me", replace: ["(top right, under the zoom buttons)", "(top right, under the zoom buttons; its label is Find my location)"], guard: "Find my location", why: "Name the button the way the browser labels it." },
  { slug: "location-does-not-work", replace: ["(top right, under the zoom buttons)", "(top right, under the zoom buttons; its label is Find my location)"], guard: "Find my location", why: "Same as above." },
  { slug: "my-photo-will-not-upload", replace: ["Sponsor logos are separate: they must be JPG, PNG or WebP under 600 KB.", "Sponsor logos are separate. The organizer adds them on the Sponsors tab as JPG, PNG or WebP under 600 KB, and a sponsor who uses an invite link can send one under 1 MB."], guard: "invite link can send", why: "The sponsor invite form takes 1 MB, the organizer form 600 KB." },
  { slug: "your-profile", replace: ["turn the monthly update email on or off", "turn the [monthly update email](/help/monthly-update-email) on or off"], guard: "/help/monthly-update-email", why: "Link the new article." },
  { slug: "show-off-your-house", append: "## No contest needed\nYou do not have to enter a contest to put your home on the map. See [Add your home without entering a contest](/help/add-a-home-without-a-contest).", guard: "/help/add-a-home-without-a-contest", why: "People mix up Add, A contest and entering a contest." },
  { slug: "weekly-lights-email", append: "## Not the same as the monthly update\nThe weekly lights email is for anyone and needs no account. The monthly update is a separate, optional email for installers, hosts and families. See [The optional monthly update email](/help/monthly-update-email) and [Stop emails from SoCal Lights](/help/stop-emails-from-socal-lights).", guard: "/help/monthly-update-email", why: "Two different emails; link the new articles." },
  { slug: "add-sponsors-to-your-contest", append: "A sponsor who gets your invite link sees a page that explains the same thing: [Sponsor a contest with an invite link](/help/sponsor-a-contest-with-an-invite-link).", guard: "/help/sponsor-a-contest-with-an-invite-link", why: "Link the sponsor-side article." },
];

export function sql() {
  const ins = NEW.map((a) => `INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES (${[a.slug, a.title, a.category, a.kind, a.summary, a.body, a.keywords, "", a.sort, "published", "seed"].map((v) => (typeof v === "number" ? v : q(v))).join(", ")});`);
  const upd = EDITS.map((e) => {
    const where = `WHERE slug = ${q(e.slug)} AND updated_by = 'seed'`;
    if (e.title) return `UPDATE help_articles SET title = ${q(e.title)}, updated_at = datetime('now') ${where} AND title <> ${q(e.title)};`;
    if (e.replace) return `UPDATE help_articles SET body = replace(body, ${q(e.replace[0])}, ${q(e.replace[1])}), updated_at = datetime('now') ${where} AND body NOT LIKE ${q("%" + e.guard + "%")};`;
    return `UPDATE help_articles SET body = body || char(10) || char(10) || ${q(e.append)}, updated_at = datetime('now') ${where} AND body NOT LIKE ${q("%" + e.guard + "%")};`;
  });
  return `-- Help Center re-audit 2026-11-08, second pass (see scripts/help/updates-audit-1108b.mjs and docs/audit/2026-11-08-help-articles.md): five new articles (INSERT OR IGNORE) and eight small corrections.\n-- Every UPDATE only touches an article nobody edited in Admin (updated_by = 'seed'). No prices in the articles: they are on /pricing.\n${ins.join("\n")}\n${upd.join("\n")}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const a of NEW) {
    const t = a.body + " " + a.title + " " + a.summary;
    if (/everything (in|above)/i.test(t)) throw new Error("banned wording in " + a.slug);
    if (/\$\d/.test(t)) throw new Error("a price in " + a.slug);
    if (/\b(house|display)s?\b/i.test(t.replace(/\]\(\/[^)]*\)/g, "]").replaceAll("A lighting display", "").replaceAll("Displays", ""))) throw new Error("say home, not house/display in " + a.slug);
    for (const [, u] of a.body.matchAll(/\]\((\/help\/[a-z0-9-]+)\)/g)) { if (![...NEW.map((n) => "/help/" + n.slug)].includes(u) && !/\/help\/(your-profile|enter-your-home-in-a-contest|is-my-address-public|claim-your-home|show-off-your-house|add-sponsors-to-your-contest|weekly-lights-email|delete-my-account|i-did-not-get-the-email)$/.test(u)) throw new Error("unknown link " + u + " in " + a.slug); }
  }
  writeFileSync(`migrations/${NUM}_help_audit_gaps_2026-11-08.sql`, sql());
  const ind = (t) => String(t).split("\n").map((l) => "    " + l).join("\n");
  let doc = "\n\n# Help Center re-audit, 2026-11-08 (second pass): paste-ready text\n\nMigration `" + NUM + "_help_audit_gaps_2026-11-08.sql` adds five articles and corrects eight. For an article you edited in Admin: Admin > Help Center > click the article > replace the fields with the blocks below (copy without the four leading spaces) > Save. A new article that did not appear: Admin > Help Center > New article.\n\n";
  for (const a of NEW) doc += `## New: ${a.slug}\n\nCategory: ${a.category}. Type: ${a.kind}. Order: ${a.sort}.\n\nTitle:\n\n${ind(a.title)}\n\nOne-sentence answer:\n\n${ind(a.summary)}\n\nSearch words:\n\n${ind(a.keywords)}\n\nText:\n\n${ind(a.body)}\n\n`;
  doc += "## Corrections to existing articles (only if you edited them in Admin)\n\n";
  for (const e of EDITS) doc += `- \`${e.slug}\`: ` + (e.title ? `change the title to "${e.title}".` : e.replace ? `replace "${e.replace[0]}" with "${e.replace[1]}".` : `add at the end: "${e.append.replaceAll("\n", " ")}"`) + ` (${e.why})\n`;
  let cur = readFileSync("docs/help-updates.md", "utf8");
  cur = cur.replace(/\n\n# Help Center re-audit, 2026-11-08 \(second pass\)[\s\S]*$/, "").replace(/\s*$/, "\n");
  writeFileSync("docs/help-updates.md", cur + doc);
  console.log("wrote", NUM, NEW.length, "new,", EDITS.length, "edits");
}
