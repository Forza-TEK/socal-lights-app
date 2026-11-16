// Help Center audit 2026-11-16, part 1 (fixes to existing articles): writes migrations/0267_help_fixes_2026-11-16.sql.
// Usage: node scripts/help/updates-1116a.mjs
// Same pattern as updates-copy-1111.mjs: text fragments replaced with UPDATE ... replace(), only where updated_by is still 'seed', so an article edited in Admin is never overwritten
// (paste the text from docs/help-updates.md into Admin > Help for those). Each fragment must be in the article exactly once. No prices are written in any article: they are on /pricing.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = "0267_help_fixes_2026-11-16.sql";

// The articles as the migrations before this one leave them.
const db = new DatabaseSync(":memory:");
for (const f of readdirSync(join(ROOT, "migrations")).filter((n) => n.endsWith(".sql")).sort()) { if (f >= OUT) continue; db.exec(readFileSync(join(ROOT, "migrations", f), "utf8")); }
const cur = (slug) => { const r = db.prepare("SELECT * FROM help_articles WHERE slug = ?").get(slug); if (!r) throw new Error("no article " + slug); return r; };
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const L = (...lines) => lines.join("\n");

const PLUS = "the round **+** (Add) button in the top bar of the map. It is always there, signed in or not";
const MORE = "On a phone, the bottom bar shows only the first tabs, so tap **More** to find the others.";

const EDITS = [
  // ---- the WRONG article: events from a signed-in account are Confirmed
  { slug: "add-an-event", kw: "plus button, + button, add button, top bar, confirmed", edits: [
    ["1. Start on the map at socallights.app. If you are signed out, tap the **three dots** at the top right and tap **Add**. If you are signed in, tap your **account circle** (the person icon) and choose **Add an event, home or contest**. Then tap **An event**.",
      `1. Start on the map at socallights.app and tap ${PLUS}. You can also tap the **three dots** and then **Add** (signed out), or your **account circle** (the person icon) and then **Add an event, home or contest** (signed in). Then tap **An event**.`],
    ["With a page that mentions the event's name and date, it shows as Confirmed. Without one, it still goes on the map, marked Expected until the dates are checked.",
      "The web page is optional. Your event goes on the map as Confirmed either way, because you gave the dates."],
    ["## Want it to stand out?", L("On a very busy day we may hold a new event for a quick look before it goes on the map. The last screen says so, and we email you when it is up.", "", "## Want it to stand out?")],
  ] },
  { slug: "add-a-home-without-a-contest", edits: [
    ["Add is in the account circle menu when you are signed in (**Add an event, home or contest**), or under the three dots at the top right of the map when you are not. You can also go straight to socallights.app/add.",
      `Tap ${PLUS}. Add is also in the account circle menu when you are signed in (**Add an event, home or contest**), or under the three dots when you are not. You can also go straight to socallights.app/add.`],
  ] },
  { slug: "show-off-your-house", edits: [
    ["1. Start on the map at socallights.app. If you are signed out, tap the **three dots** at the top right and tap **Add**. If you are signed in, tap your **account circle** (the person icon) and choose **Add an event, home or contest**. Then tap **A lighting display**.",
      `1. Start on the map at socallights.app and tap ${PLUS}. You can also tap the **three dots** and then **Add** (signed out), or your **account circle** (the person icon) and then **Add an event, home or contest** (signed in). Then tap **A lighting display**.`],
  ] },
  { slug: "create-a-contest-quick-start", edits: [
    ["Start at socallights.app. If you are signed in, tap your account circle at the top right, then **Add an event, home or contest**. If you are not signed in, tap the three dots at the top right, then **Add**. You can also go straight to socallights.app/add.",
      `Start at socallights.app and tap ${PLUS}. You can also tap your account circle, then **Add an event, home or contest** (signed in), or the three dots, then **Add** (not signed in). Or go straight to socallights.app/add.`],
  ] },

  // ---- STALE
  { slug: "enter-your-home-in-a-contest", edits: [
    ["If entries have closed, the button says Entries are closed.",
      "If entries are closed, there is no **Enter my home** button. The page says why instead: when entries closed and when voting opens, or that the organizer has paused new entries for now, or that the winners are already announced."],
  ] },
  { slug: "feature-an-event-or-home", kw: "feature your event, menu, three dots, apple pay, google pay, amazon pay, link", edits: [
    ["- Open the Feature page at socallights.app/feature, or tap **Choose** on a plan on the Pricing page.",
      "- Open the Feature page: tap the **three dots** in the top bar and choose **Feature your event**, or go to socallights.app/feature, or tap **Choose** on a plan on the Pricing page."],
    ["then tap **Pay on Stripe** and pay on Stripe's secure page, with a card or Cash App Pay.",
      "then tap **Pay on Stripe** and pay on Stripe's secure page. The payment methods you see depend on your device and location (see the end of this article)."],
  ] },
  { slug: "ask-socal-lights-ai-assistant", kw: "buttons, cards, send to the team, report a problem, start an event, action", edits: [
    ["## What it will not do", L(
      "## Buttons it can offer", "",
      "Sometimes an answer comes with a card that has a button, so you can act right away. Each card says what it will do, and nothing happens until you tap its button.", "",
      "- **Send this to the team** has a box for your message. It is emailed to us. Add your email if you would like a reply.",
      "- **Report a problem** asks which event or home is wrong and what is wrong.",
      "- **Sign me up** is the free [weekly lights email](/help/weekly-lights-email). We email you a link to confirm first.",
      "- **Send removal request** asks us to take a home off the map. You do not need an account.",
      "- **Start this event**, **Start my home** and **Start my contest** open the Add form with what you told the assistant already filled in. You check everything there before anything goes on the map.",
      "- If you are signed in and ask about your own event, home or contest entry, it can offer a card to mark an event cancelled or postponed, run it again next year, change a description, take a home down for the season and put it back, or withdraw an entry. Each one asks you to confirm.", "",
      "## What it will not do")],
    ["- It cannot look up your account or anyone's personal details, and it does not do anything for you on the site.",
      "- It does not do anything by itself. It cannot look up anyone's personal details, and nothing is sent or changed until you tap a button on a card."],
    ["We do not save what you type or what it answers.",
      "We do not save what you type or what it answers. The one exception is a card you choose to send: what is in its boxes is emailed to the team."],
  ] },
  { slug: "edit-or-cancel-your-event", kw: "video, video link, youtube, vimeo, watch the video", edits: [
    ["You can add up to 4 photos here too: [Add photos to your event](/help/add-photos-to-your-event).",
      "You can add up to 4 photos here too: [Add photos to your event](/help/add-photos-to-your-event). There is also an optional **Video link**: paste a YouTube or Vimeo link and visitors see a **Watch the video** button on your event. The video only loads when they tap it."],
    ["(Photos are saved as soon as you add them.)", "(Photos are saved as soon as you add them. The video link is saved with **Save**.)"],
  ] },
  { slug: "i-cannot-vote", kw: "voting is paused, voting not open yet, voting is over", edits: [
    ["The buttons say Voting not open before it starts and Voting is over after the winners are announced. The organizer can also pause voting for a while.",
      "The buttons say **Voting not open yet** before it starts, **Voting is paused** while the organizer has paused voting, and **Voting is over** after the winners are announced."],
  ] },
  { slug: "wheelchair-and-stroller-friendly-places", edits: [
    ["tap **Report a problem** on it.", "tap **Something wrong? Tell us** on it."],
  ] },
  { slug: "install-the-app", kw: "iphone app, app store, ios, search socal lights",
    set: { summary: "SoCal Lights is in the App Store for iPhone: search for SoCal Lights. On any phone you can also add the website to your Home Screen from your browser." },
    edits: [
    ["**iPhone:** open socallights.app in **Safari**. Tap the Share button, scroll down, and tap **Add to Home Screen**.",
      L("## The iPhone app", "",
        "SoCal Lights is in the App Store. Open the App Store on your iPhone and search for **SoCal Lights**. It shows the same map as the website. Two things differ: you sign in with an emailed code (there is no Google button in the app), and tips and paid options such as Featured placements and contest passes are on the website, not in the app.", "",
        "## Or add the website to your Home Screen", "",
        "This works on any phone, with or without the app.", "",
        "**iPhone:** open socallights.app in **Safari**. Tap the Share button, scroll down, and tap **Add to Home Screen**.")],
    ["The app still opens, and so does any page you have opened before.", "The Home Screen version still opens, and so does any page you have opened before."],
    ["When your signal comes back, the app updates by itself.", "When your signal comes back, it updates by itself."],
  ] },

  // ---- the same Add-button tip and the phone More tip, and the other nits
  { slug: "add-co-organizers-and-judges", edits: [
    ["Open your dashboard ([how](/help/share-your-contest)) and tap **Team**.", `Open your dashboard ([how](/help/share-your-contest)) and tap **Team**. ${MORE}`],
  ] },
  { slug: "add-sponsors-and-logos", edits: [
    ["1. Open your dashboard ([how](/help/share-your-contest)) and tap **Sponsors**.", "1. Open your dashboard ([how](/help/share-your-contest)) and tap **Sponsors**. On a phone, tap **More** first."],
    ["## How sponsors pay you", L("The longer version, with receipts and privacy, is [Add sponsors to your contest](/help/add-sponsors-to-your-contest).", "", "## How sponsors pay you")],
  ] },
  { slug: "add-sponsors-to-your-contest", edits: [
    ["1. Open your dashboard and tap **Sponsors**.", "1. Open your dashboard and tap **Sponsors**. On a phone, tap **More** first."],
    ["## Add a sponsor", L("The short version, step by step, is [Add sponsors and logos to your contest](/help/add-sponsors-and-logos).", "", "## Add a sponsor")],
  ] },
  { slug: "edit-your-contest-and-change-dates", edits: [
    ["You can also tap Details yourself.", "You can also tap Details yourself (on a phone it is under **More**)."],
    ["Entrants see changes right away, and the rest of the team is emailed about changes, so nobody is surprised.",
      "Entrants see changes right away, and the rest of the team is emailed about changes, so nobody is surprised. The **Team** tab keeps a list called **What the team changed**, with who changed what, newest first."],
  ] },
  { slug: "presenting-installer-and-quote-requests", edits: [
    ["Open your dashboard ([how](/help/share-your-contest)) and tap **Details**. Scroll to **Presenting installer**.", "Open your dashboard ([how](/help/share-your-contest)) and tap **Details** (on a phone, tap **More** first). Scroll to **Presenting installer**."],
    ["Open your dashboard and tap **Promote**. Quote requests are listed", "Open your dashboard and tap **Promote** (on a phone, under **More**). Quote requests are listed"],
  ] },
  { slug: "read-your-contest-activity", edits: [
    ["Open your dashboard and tap **Promote**. **Activity**", "Open your dashboard and tap **Promote** (on a phone, it is under **More**). **Activity**"],
  ] },
  { slug: "share-your-contest", edits: [
    ["6. To invite neighbors by email, tap **Promote**, then open", "6. To invite neighbors by email, tap **Promote** (on a phone, under **More**), then open"],
  ] },
  { slug: "find-lights-near-me", edits: [
    ["5. Use **Sort** above the list to put the nearest, soonest or free places first.",
      L("5. Use **Sort** above the list to put the nearest, soonest or free places first. The quick picks **Tonight**, **This weekend** and **Free** above the list set the date and cost filters in one tap.")],
    ["It is sorted nearest first once the site knows where you are.",
      "It is sorted nearest first once the site knows where you are. After you allow location, a blue dot shows where you are and moves with you while the location button is on."],
  ] },
  { slug: "location-does-not-work", edits: [
    ["You can always skip location:", "Once it works, the blue dot moves with you and the map follows you until you drag it. Tap the button again to stop.\n\nYou can always skip location:"],
  ] },
  { slug: "your-events", kw: "video, video link, watch the video", edits: [
    ["- Add up to 4 photos: [Add photos to your event](/help/add-photos-to-your-event).", L("- Add up to 4 photos: [Add photos to your event](/help/add-photos-to-your-event).", "- Add a video: in **Edit**, paste a YouTube or Vimeo link in **Video link**. See [Edit or cancel your event](/help/edit-or-cancel-your-event).")],
  ] },
  { slug: "your-profile", edits: [
    ["Each one is a list of rows, and each row has buttons for what you can do with it.",
      "Each one is a list of rows, and each row has buttons for what you can do with it. A status pill on a row shows where it stands, for example **On the map** or **In review**. On a phone the bottom bar shows Drafts, Contests, Displays and Events; tap **More** for Badges and Account."],
  ] },
];

// ---------------------------------------------------------------- build the SQL
const out = [L(
  "-- Help Center audit 2026-11-16, part 1: the add-an-event article (events added from a signed-in account are Confirmed), the stale articles (contest entry button, six payment methods, AI assistant cards, event video link, voting labels, Something wrong? Tell us, the iPhone app) and the small notes (the + Add button, the phone More tab, quick picks and the moving location dot).",
  "-- Generated by scripts/help/updates-1116a.mjs; the text is in docs/help-updates.md. Every UPDATE only touches an article nobody edited in Admin (updated_by = 'seed') and replaces text fragments, so an article that has moved on is left as it is. No prices are written in any article: they are on /pricing.")];
const KW = (extra) => `keywords = CASE WHEN keywords = '' THEN ${q(extra)} ELSE keywords || ', ' || ${q(extra)} END`;
let nEdits = 0;
for (const e of EDITS) {
  const row = cur(e.slug); let body = row.body, expr = "body";
  for (const [a, b] of e.edits || []) {
    const n = body.split(a).length - 1;
    if (n !== 1) throw new Error(`${e.slug}: the text to replace is in the article ${n} times (needs exactly 1): ${a.slice(0, 80)}`);
    if (/\$\s?\d/.test(b)) throw new Error("price in " + e.slug);
    body = body.replace(a, () => b); expr = `replace(${expr}, ${q(a)}, ${q(b)})`; nEdits++;
  }
  const sets = [];
  if (e.edits && e.edits.length) sets.push(`body = ${expr}`);
  if (e.kw) { const add = e.kw.split(",").map((x) => x.trim()).filter((w) => !row.keywords.toLowerCase().includes(w.toLowerCase())).join(", "); if (add) sets.push(KW(add)); }
  for (const [k, v] of Object.entries(e.set || {})) sets.push(`${k} = ${typeof v === "number" ? v : q(v)}`);
  if (!sets.length) continue;
  out.push(`UPDATE help_articles SET ${sets.join(", ")}, updated_at = datetime('now') WHERE slug = ${q(e.slug)} AND updated_by = 'seed';`);
}
writeFileSync(join(ROOT, "migrations", OUT), out.join("\n") + "\n");
console.log(`wrote migrations/${OUT}: ${EDITS.length} articles edited (${nEdits} text fragments)`);

// docs/help-updates.md: the finished text of every changed article, to paste into Admin > Help for an article edited there.
if (process.argv.includes("--md")) {
  const after = new DatabaseSync(":memory:");
  for (const f of readdirSync(join(ROOT, "migrations")).filter((n) => n.endsWith(".sql")).sort()) { if (f > OUT) continue; after.exec(readFileSync(join(ROOT, "migrations", f), "utf8")); }
  let md = "\n\n# Help Center audit (2026-11-16), part 1: fixes to existing articles\n\nMigration `" + OUT + "` changes these articles (text fragments, only where nobody edited the article in Admin). If you edited one in Admin, paste the text below over it. Regenerate with `node scripts/help/updates-1116a.mjs --md`. Slugs never change.\n";
  for (const e of EDITS) { const r = after.prepare("SELECT * FROM help_articles WHERE slug = ?").get(e.slug); md += `\n## ${e.slug}\n\nOne-sentence answer:\n\n    ${r.summary}\n\nText:\n\n${r.body.split("\n").map((l) => "    " + l).join("\n")}\n`; }
  const p = join(ROOT, "docs", "help-updates.md");
  writeFileSync(p, readFileSync(p, "utf8").replace(/\n+$/, "\n") + md);
  console.log("appended to docs/help-updates.md");
}
