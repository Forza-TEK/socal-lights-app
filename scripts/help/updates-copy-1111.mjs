// Help Center copy audit, 2026-11-11 (batch E): writes migrations/0227_help_copy_audit_2026-11-11.sql.
// Usage: node scripts/help/updates-copy-1111.mjs            (writes the migration and checks every edit against the articles as the earlier migrations leave them)
//        node scripts/help/updates-copy-1111.mjs --md       (also appends the text of the new articles to docs/help-updates.md)
// What it does: 8 new articles (INSERT OR IGNORE) and small edits to existing ones (UPDATE ... replace(), only where updated_by is still 'seed', so an article edited in Admin is never overwritten).
// Edits are text fragments, not whole articles: if the fragment is no longer there the edit does nothing. No prices and no event dates are written in any article.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = "0227_help_copy_audit_2026-11-11.sql";

// The articles as the migrations before this one leave them.
const db = new DatabaseSync(":memory:");
for (const f of readdirSync(join(ROOT, "migrations")).filter((n) => n.endsWith(".sql")).sort()) { if (f >= OUT) continue; db.exec(readFileSync(join(ROOT, "migrations", f), "utf8")); }
const cur = (slug) => { const r = db.prepare("SELECT * FROM help_articles WHERE slug = ?").get(slug); if (!r) throw new Error("no article " + slug); return r; };
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const L = (...lines) => lines.join("\n");

// ---------------------------------------------------------------- edits to existing articles
// edits: [old text, new text] pairs; each old text must be in the article exactly once. kw: words added to the search words. set: other columns (category, sort, title, summary).
const EDITS = [
  // HLP-06 (search words), HLP-12 ("&" like the season button)
  { slug: "find-lights-near-me", kw: "boat parade, boat parades, parades, wheelchair, accessible, kids, family, mobile, phone", edits: [["**Thanksgiving and Christmas Lights**", "**Thanksgiving & Christmas Lights**"]] },
  { slug: "find-professionally-installed-displays", edits: [["(for example **Thanksgiving and Christmas Lights**)", "(for example **Thanksgiving & Christmas Lights**)"]] },
  { slug: "find-contests", kw: "who won, winners, results, past results", edits: [["5. **Past results** shows finished contests and their winners.", "5. **Past results** shows finished contests and their winners. See [See who won a contest](/help/see-who-won-a-contest)."]] },
  { slug: "install-the-app", kw: "mobile, phone, app store, download" },
  { slug: "plan-a-night", kw: "wheelchair, accessible" },
  { slug: "is-it-free", kw: "donation, donations, tipping, support, how much",
    edits: [[
      L("- **Featured** is for events and, after a contest, winning homes. An event organizer can add a Featured pin (a gold-ringed pin on the map and a \"Featured\" badge), a banner (your event as a pill labeled \"Featured\" in the strip at the top of the map list) and top of the list (your event is listed first when people browse your area). Every paid plan includes the pin; the banner and top of the list are optional extras, and each part costs the same. It runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first. A home can be featured only by the owner of a home that finished winner, 2nd or 3rd place in a contest, after the winners are announced: the Featured pin or Top of the list, for 30 days. Homes are a separate line from event plans."),
      L("- **Featured events** are for event organizers. Every plan has the Featured pin (a gold-ringed pin on the map and a \"Featured\" badge). The banner (your event as a pill labeled \"Featured\" in the strip at the top of the map list) and top of the list (your event is listed first when people browse your area) are optional extras, and each part costs the same.",
        "- A Featured event runs from the moment you pay until your event ends or the season ends (Christmas lights: Jan 6), whichever comes first. The [Pricing](/pricing#events) page shows the plans. Cities, chambers and event producers with several events can look at the [Event Partner plan](/help/event-partner-plan).",
        "- **Featured homes** are for winners. Only a home that finished 1st, 2nd or 3rd in a contest can be featured, by its owner, after the winners are announced: the Featured pin or Top of the list, for 30 days. Homes are a separate line from event plans."),
    ]] },
  // HLP-03 (age and eligibility, as the Terms say), HLP-06
  { slug: "enter-your-home-in-a-contest", kw: "age, how old, 18, minor, minors, kids, children, eligibility, who can enter, permission, owner, rent, renter",
    edits: [["## What happens next", L("## Who can enter", "",
      "To enter a home in a contest you must be 18 or older. That is the rule in our [Terms](/terms#contests).", "",
      "Each contest's organizer writes its official rules and decides who wins, so a contest can add its own limits. Contests that use our standard official rules are open to people who own a home in the contest's city or have the owner's permission to enter it, or who installed the display. You tick a box to agree to the official rules on the last step, so read them first. If you are not sure you qualify, ask the organizer before you enter.", "", "## What happens next")]] },
  { slug: "who-can-vote", kw: "age, how old, 13, minor, minors, kids, children",
    edits: [["Every home is in every category,", L("To vote you sign in, and you must be 13 or older to sign in. Entering a home in a contest is a separate rule: you must be 18 or older. See the [Terms](/terms#contests).", "", "Every home is in every category,")]] },
  // HLP-06, HLP-10 (the app pass video), HLP-08 (founder badge goes with the contest articles)
  { slug: "contest-passes", kw: "hoa, homeowners association, school, business, church, club",
    edits: [["See also [Is SoCal Lights free?](/help/is-it-free)", L("Creating your contest in our app? You choose your pass on our website, in your browser, then come back to the app: watch [Contest passes in the app](/tutorials#v-contest-pass-app).", "", "See also [Is SoCal Lights free?](/help/is-it-free)")]] },
  { slug: "create-a-contest-quick-start", kw: "hoa, homeowners association, school, business, church, club, who can run a contest" },
  { slug: "founder-city-badge", set: { category: "run", sort: 16 } },
  // HLP-02 (headings, bold button names), HLP-13
  { slug: "feature-an-event-or-home", kw: "cancelled, postponed",
    edits: [
      ["An event\n- Open the Feature page", "## For an event\n- Open the Feature page"],
      ["tap Pay on Stripe and pay", "tap **Pay on Stripe** and pay"],
      ["open Claim an existing listing, search for it and tap This is my event: claim it.", "open **Claim an existing listing**, search for it and tap **This is my event: claim it**."],
      ["tap Choose on a plan on the Pricing page", "tap **Choose** on a plan on the Pricing page"],
      ["\n\nFeatured pin\n- A gold", "\n\n**Featured pin**\n- A gold"],
      ["\n\nBanner + Featured pin\n- A gold", "\n\n**Banner + Featured pin**\n- A gold"],
      ["\n\nTop of the list + Featured pin\n- A gold", "\n\n**Top of the list + Featured pin**\n- A gold"],
      ["\n\nTop of the list + Banner + Featured pin\n- A gold", "\n\n**Top of the list + Banner + Featured pin**\n- A gold"],
      ["\nA home\nOnly the owner of a home that finished winner, 2nd or 3rd place in an announced contest can feature it.", "\n## For a home\nOnly the owner of a home that finished 1st, 2nd or 3rd place in a contest can feature it, and only after the winners are announced."],
      ["Good to know\n- You pay once", "## Good to know\n- You pay once"],
    ] },
  { slug: "add-sponsors-and-logos", edits: [
    ["They show on your contest page, always labelled \"Sponsor\". You add them on the Sponsors tab.", "They show on your contest page, always labeled \"Sponsor\". You add them on the **Sponsors** tab."],
    [L("1. Open your dashboard (how) and tap Sponsors.",
       "2. Under Add or edit a sponsor, type the company name and choose a Level: Presenting sponsor, Gold, Silver or Prize sponsor.",
       "3. Add their website and choose their logo (JPG, PNG or WebP, under 600 KB). The contact name, phone, email and amount are optional. Only you and SoCal Lights staff see them.",
       "4. Under How the sponsorship counts, choose Paid to me or Donated in kind. For Paid to me, tick that you collected the payment yourself and add the date and how it was paid. For Donated in kind, say what was given.",
       "5. Tick that you have the sponsor's permission, and tick Show on the contest page.",
       "6. Tap Save sponsor.",
       "7. To check how it looks, tap See it as voters do."),
     L("1. Open your dashboard ([how](/help/share-your-contest)) and tap **Sponsors**.",
       "2. Under **Add or edit a sponsor**, type the company name and choose a **Level**: Presenting sponsor, Gold, Silver or Prize sponsor.",
       "3. Add their website and choose their logo (JPG, PNG or WebP, under 600 KB). The contact name, phone, email and amount are optional. Only you and SoCal Lights staff see them.",
       "4. Under **How the sponsorship counts**, choose **Paid to me** or **Donated in kind**. For Paid to me, tick that you collected the payment yourself and add the date and how it was paid. For Donated in kind, say what was given.",
       "5. Tick that you have the sponsor's permission, and tick **Show on the contest page**.",
       "6. Tap **Save sponsor**.",
       "7. To check how it looks, tap **See it as voters do**.")],
    ["tap Create invite link, then Copy link or Email this link.", "tap **Create invite link**, then **Copy link** or **Email this link**."],
    ["Tap Mark payment received, Approve for the contest page or Decline.", "Tap **Mark payment received**, **Approve for the contest page** or **Decline**."],
    ["or tap Turn link off.", "or tap **Turn link off**."],
  ] },
  { slug: "presenting-installer-and-quote-requests", edits: [
    ["Your contest page shows a labelled advertisement with a Get a quote button for neighbors.", "Your contest page shows a labeled advertisement with a **Get a quote** button for neighbors."],
    ["1. Open your dashboard and tap Details. Scroll to Presenting installer.", "1. Open your dashboard ([how](/help/share-your-contest)) and tap **Details**. Scroll to **Presenting installer**."],
    ["3. Tap Save changes. This adds a Get a quote button", "3. Tap **Save changes**. This adds a **Get a quote** button"],
    ["tap Get a quote. They sign in", "tap **Get a quote**. They sign in"],
    ["Then they tap Send request.", "Then they tap **Send request**."],
    ["Open your dashboard and tap Promote. Quote requests are listed under Activity,", "Open your dashboard and tap **Promote**. Quote requests are listed under **Activity**,"],
  ] },
  { slug: "installer-profiles", edits: [
    ["On a home, Installed by shows the company's name.", "On a home, **Installed by** shows the company's name."],
    ["a Request a quote button", "a **Request a quote** button"],
    ["(Add, then A lighting display, then A professional installer)", "(**Add**, then **A lighting display**, then **A professional installer**)"],
    ["tap Is this your company? Claim this profile at the bottom.", "tap **Is this your company? Claim this profile** at the bottom."],
    ["listed on the Homes tab. Tap Confirm for each home you installed.", "listed on the **Homes** tab. Tap **Confirm** for each home you installed."],
    ["Tap Not ours for one you did not install.", "Tap **Not ours** for one you did not install."],
  ] },
  { slug: "claim-your-home", edits: [
    ["2. Tap Is this your home? Claim it.", "2. Tap **Is this your home? Claim it**."],
    ["and tap Put it on the map.", "and tap **Put it on the map**."],
    ["tap Not your listing? Remove my home.", "tap **Not your listing? Remove my home**."],
  ] },
  // HLP-14 (plain steps), HLP-02 (bold button names)
  { slug: "add-an-event", kw: "edit event, change event, cancel event",
    edits: [[
      L("1. Start on the map at socallights.app. If you are signed out, tap the three dots at the top right and tap Add. If you are signed in, tap your account button (the person icon) and choose Add an event, home or contest. Then tap An event.",
        "2. Sign in with Google or an emailed code if asked. Your event is saved to your account.",
        "3. If your event has a web page, paste it. If not, tap No... Next. With a page that mentions the event's name and date, it shows as Confirmed. Without one, it still goes on the map, marked Expected until the dates are checked.",
        "4. Type the event's name, and choose a season and type. Next.",
        "5. Pick the first and last day. Next.",
        "6. Free or paid? Next.",
        "7. Type the place, the city and the street address. Next.",
        "8. Describe it in a sentence or two. Next.",
        "9. Check everything and tap Add my event."),
      L("1. Start on the map at socallights.app. If you are signed out, tap the **three dots** at the top right and tap **Add**. If you are signed in, tap your **account circle** (the person icon) and choose **Add an event, home or contest**. Then tap **An event**.",
        "2. Sign in with Google or an emailed code if asked. Your event is saved to your account.",
        "3. If your event has a web page, paste it into **Event web page** and tap **Next**. If it has no page, tap **No... Next** under the box. With a page that mentions the event's name and date, it shows as Confirmed. Without one, it still goes on the map, marked Expected until the dates are checked.",
        "4. Type the event's name, choose a season and a type, then tap **Next**.",
        "5. Pick the first and last day (use the same day twice for a one-day event), add the hours if you like, then tap **Next**.",
        "6. Say whether it is free to attend. Tap **Free**, or tap **Paid** and type the price, for example \"$15 adults, kids free\". Then tap **Next**.",
        "7. Type the venue, choose the city and type the street address, then tap **Next**.",
        "8. Describe it in a sentence or two (at least 20 characters), then tap **Next**.",
        "9. Check everything and tap **Add my event**."),
    ], ["On the last step you can choose a paid Featured plan, or No thanks, just list it.", "On the last step you can choose a paid Featured plan, or **No thanks, just list it**."],
       ["Listing your event is always free.", "Listing your event is always free. To change it later, or mark it cancelled or postponed, see [Edit or cancel your event](/help/edit-or-cancel-your-event)."]] },
  { slug: "show-off-your-house", kw: "take down, put back, edit my home, season over",
    edits: [[
      L("1. Start on the map at socallights.app. If you are signed out, tap the three dots at the top right and tap Add. If you are signed in, tap your account button (the person icon) and choose Add an event, home or contest. Then tap A lighting display.",
        "2. Sign in with Google or an emailed code if asked.",
        "3. Who is posting? Choose A homeowner (or A professional installer). Next.",
        "4. Type the name to show. Next.",
        "5. Did a company install your lights? If you did it yourself, tap No. Next.",
        "6. Choose the season. Next.",
        "7. Name your home and tell us what makes it special. Next.",
        "8. Add the address. The pin goes here, and visitors see it so they can drive by. Next.",
        "9. Tell families when the lights are on and how to see them (drive by, walk by, parking). Next.",
        "10. Add photos. Next.",
        "11. Check everything and tap Put it on the map."),
      L("1. Start on the map at socallights.app. If you are signed out, tap the **three dots** at the top right and tap **Add**. If you are signed in, tap your **account circle** (the person icon) and choose **Add an event, home or contest**. Then tap **A lighting display**.",
        "2. Sign in with Google or an emailed code if asked.",
        "3. Under **Who's posting?**, choose **A homeowner** (or **A professional installer**), then tap **Next**.",
        "4. Type the name to show, then tap **Next**.",
        "5. Did a company install your lights? If you did it yourself, tap **No**, then **Next**.",
        "6. Choose the season, then tap **Next**.",
        "7. Name your home and tell us what makes it special, then tap **Next**.",
        "8. Add the address. The pin goes here, and visitors see it so they can drive by. Tap **Next**.",
        "9. Tell families when the lights are on and how to see them (drive by, walk by, parking), then tap **Next**.",
        "10. Add photos, then tap **Next**.",
        "11. Check everything and tap **Put it on the map**."),
    ], ["tap Is this your home? Claim it on its card instead.", "tap **Is this your home? Claim it** on its card instead."],
       ["Saved drafts are in your profile.", "Saved drafts are in your profile. To change your home later, or take it down when the season is over, see [Take your home down and put it back](/help/take-your-home-down-and-put-it-back)."]] },
  { slug: "your-profile", kw: "edit event, cancel event, postponed, take down, put back, who won",
    edits: [["- **Displays** lists the homes you showed off on the map. You can edit one, take it down for the season, put it back, or delete it.\n- **Events** lists the events you added.",
      "- **Displays** lists the homes you showed off on the map. You can edit one, take it down for the season, put it back, or delete it. See [Take your home down and put it back](/help/take-your-home-down-and-put-it-back).\n- **Events** lists the events you added. You can edit one, mark it cancelled or postponed, or run it again next year. See [Edit or cancel your event](/help/edit-or-cancel-your-event)."]] },
];

// ---------------------------------------------------------------- new articles
const NEW = [
  { slug: "edit-or-cancel-your-event", title: "Edit or cancel your event", category: "post", kind: "howto", sort: 12,
    summary: "Open Your profile, tap Events, then Edit to change the details, or use Event notice to mark it Cancelled or Postponed.",
    keywords: "edit event, change event, change dates, cancel event, cancelled, postponed, reschedule, delete event, event changed, run again next year, my event",
    body: L(
      "An event changed? You can fix its details, mark it cancelled or postponed, run it again next year, or delete it. You do this from your profile, signed in with the same account you used to add the event.", "",
      "1. Tap your **account circle** at the top of the map and choose **Your profile**. See [Your profile](/help/your-profile).",
      "2. Tap **Events**.",
      "3. Find your event. The tag under its name says **On the map**, **In review**, **Cancelled** or **Postponed**.",
      "4. Tap **Edit**. You can change the name, the start and end dates, the hours, the venue, the price, the description and the event web page.",
      "5. Tap **Save**. The map and the event's page show the change right away.", "",
      "## Mark it cancelled or postponed", "",
      "The event stays on the map with a tag, so nobody drives out for nothing.", "",
      "1. On the event's row, open the **Event notice** list.",
      "2. Choose **Cancelled** or **Postponed**.",
      "3. When the event is back on, choose **No notice** to take the tag off. If the dates moved, tap **Edit** and change them too.", "",
      "## Run it again next year", "",
      "Tap **Run again next year** on the event's row. It adds a copy with every date moved forward one year. The copy shows as Expected until its dates are checked, so open it and tap **Edit** when you know the real dates.", "",
      "## Good to know", "",
      "- The Edit window does not change the city or the street address. To move an event, write to info@socallights.app.",
      "- **Delete** removes the event from the map for good. It asks you to tap again. If you paid for a Featured placement, write to us first: see [Feature an event or a home](/help/feature-an-event-or-home).",
      "- An event that is **In review** can be deleted but not edited until it is on the map.",
      "- Cancelled or postponed events cannot be featured.", "",
      "Did not find your event? See [Add an event to the map](/help/add-an-event). Anything else, [ask us](#ask).") },
  { slug: "take-your-home-down-and-put-it-back", title: "Take your home down and put it back", category: "post", kind: "howto", sort: 23,
    summary: "Open Your profile, tap Displays, then Take down for the season. Put back on the map brings it back with your photos and details.",
    keywords: "take down, take down my home, season is over, remove for the season, pause, put back, put it back, edit my home, delete my home, hide my home, off the map",
    body: L(
      "When the season is over, or you just need a break, you can take your home off the map and put it back later. Nothing is deleted. Your details and photos wait for you.", "",
      "1. Tap your **account circle** at the top of the map and choose **Your profile**. See [Your profile](/help/your-profile).",
      "2. Tap **Displays**.",
      "3. Find your home. The tag under its name says **On the map**, **Taken down for the season** or **In review**.",
      "4. Tap **Take down for the season**. The home leaves the map, and the tag changes to **Taken down for the season**.", "",
      "## Put it back", "",
      "1. Open **Your profile**, then **Displays**.",
      "2. Tap **Put back on the map** on the home's row.", "",
      "## Change something first", "",
      "Tap **Edit** to change the name, the description, when the lights are on, how to see it, parking, the radio station or the tips for visitors, then tap **Save**.", "",
      "## Delete it for good", "",
      "**Delete** removes the home and its photos for good. It asks you to tap again, so you cannot do it by accident. If you only want it off the map for now, use Take down for the season instead.", "",
      "## Good to know", "",
      "- Only the person who posted the home can take it down or put it back. If an installer shares the listing, they are emailed when you do.",
      "- A home is on the map again as soon as you tap Put back on the map. You do not need to fill anything in again.",
      "- A home you added to a contest is not on this list. See [Edit or withdraw your entry](/help/edit-or-withdraw-your-entry).",
      "- Not signed in, or not your account? Use the Remove my home page: see [Is this your home? Claim it](/help/claim-your-home).", "",
      "Anything else, [ask us](#ask).") },
  { slug: "what-is-the-shop-tab", title: "What is the Shop tab?", category: "find", kind: "answer", sort: 160,
    summary: "The Shop tab has seasonal ideas for lights and decorations. Each card opens an Amazon search, and we may earn a small commission at no cost to you.",
    keywords: "shop, shop tab, amazon, affiliate, buy lights, decorations, gift ideas, commission, associate, store",
    body: L(
      "The **Shop** tab is next to **Places** and **Favorites** on the map. On a phone it is in the bar at the bottom. It has ideas for each season, such as lights and decorations.", "",
      "1. Open the map and tap **Shop**.",
      "2. Tap the season button at the top of the list (it says **Shop for** and the season) to see ideas for another season.",
      "3. Tap a card. It opens an Amazon search in a new tab.", "",
      "- SoCal Lights does not sell anything. Buying happens on Amazon.",
      "- The cards are affiliate links. As an Amazon Associate we earn from qualifying purchases, at no extra cost to you. The tab says so under the cards.",
      "- Shop links never affect a contest, a listing or the order of the map list. The map, search, routes, voting and entering stay free.",
      "- The Shop tab is on the website. It is not inside the SoCal Lights app.", "",
      "See also [Is SoCal Lights free?](/help/is-it-free) and the [Privacy Policy](/privacy).") },
  { slug: "day-and-night-mode", title: "Switch between day and night mode", category: "find", kind: "answer", sort: 170,
    summary: "Tap the sun and moon button at the top of any page. Night mode turns on by itself from 6 pm to 6 am, or whenever your device is set to dark.",
    keywords: "dark mode, night mode, day mode, light mode, dark theme, theme, sun and moon, sun moon, too bright, brightness, switch",
    body: L(
      "Every page has a **sun and moon button**: in the header on the map and at the top of the other pages. Tap it to switch between day (light) and night (dark) mode.", "",
      "- SoCal Lights picks one for you. Night mode comes on from 6 pm to 6 am in your local time, or all day if your phone or computer is set to dark mode.",
      "- When you tap the button, your choice holds until the next automatic change at 6 am or 6 pm. After that, the automatic choice takes over again.",
      "- The choice is saved on that phone or computer only.") },
  { slug: "see-who-won-a-contest", title: "See who won a contest", category: "vote", kind: "howto", sort: 135,
    summary: "Open Contests and tap Past results. Winners appear after the organizer announces them, on the contest page and by email.",
    keywords: "who won, winner, winners, results, past results, contest results, announced, announcement, scores, ranking, how did my home do",
    body: L(
      "Winners are announced by each contest's organizer, not by SoCal Lights. Until then, results stay hidden for everyone and nobody can see who is ahead.", "",
      "1. Open **Contests**: tap the **three dots** at the top right of the map and tap **Contests**, or, signed in, tap your **account circle** and then **Your contests**.",
      "2. Tap **Past results**.",
      "3. Choose the season and year in the **Season | Year** list.",
      "4. Each contest has a card with its **Winners** and the results for every home. Tap **See the full contest** to open its page. **Permanent page** is a link you can share.", "",
      "## Good to know", "",
      "- Winners show on the contest's own page and are emailed to the people who entered when the organizer announces them.",
      "- Not there yet? The contest may still be taking entries or voting, or the organizer has not announced the winners. Check the contest page for the dates.",
      "- Your home is a winner? You get a crown on your profile. See [Your profile](/help/your-profile).",
      "- How winners are chosen is in [How are winners chosen?](/help/how-winners-are-chosen).", "",
      "Anything else, [ask us](#ask).") },
  { slug: "who-can-run-a-contest", title: "Can my HOA, school or business run a contest?", category: "run", kind: "answer", sort: 5,
    summary: "Yes. Any group can run a home-decorating contest: a city, a homeowners association (HOA), a school, a chamber of commerce, a business or a neighborhood group.",
    keywords: "hoa, homeowners association, school, business, company, church, club, chamber, city, neighborhood group, who can run a contest, organizer, nonprofit",
    body: L(
      "Yes. Any group can run a contest, such as a city, a homeowners association (HOA), a school, a chamber of commerce, a business or a neighborhood group. You sign in and set it up yourself. Quick start is seven short screens.", "",
      "- Running a contest needs a **contest pass**. See [Contest passes](/help/contest-passes) and the [Pricing](/pricing) page.",
      "- Residents enter and vote for free, and payment never affects who wins.",
      "- You write or accept the official rules, and you decide who wins. SoCal Lights provides the website only. Read the contest part of our [Terms](/terms#contests).",
      "- If your sign-in email is at your organization's website, we match your organization to that website. Everyone at that organization shares one pass window.",
      "- A new contest may be held for a quick look by our team before it goes live. We email you when it is approved.", "",
      "Ready? See [Create a contest with Quick start](/help/create-a-contest-quick-start). Anything else, [ask us](#ask).") },
  { slug: "what-is-socal-lights", title: "What is SoCal Lights, and who runs it?", category: "find", kind: "answer", sort: 5,
    summary: "A free map of holiday lights, events and decorated homes across Southern California, with neighborhood contests. It is operated by Forza-TEK.",
    keywords: "about, about us, what is socal lights, who runs, who owns, who built, forza-tek, forza tek, legit, scam, real, contact, company, team",
    body: L(
      "SoCal Lights (socallights.app) is a free map of Christmas lights, Halloween, boat parades and other holiday events and decorated homes across Southern California. People use it to plan a night out, and neighbors use it to enter and vote in home-decorating contests.", "",
      "- It is operated by Forza-TEK. See our [Terms](/terms) and [Privacy Policy](/privacy).",
      "- Finding events and homes, routes, voting and entering a contest are free. Some extras are optional and paid, and they are always labeled. See [Is SoCal Lights free?](/help/is-it-free).",
      "- Events and times come from public sources and from the people who post them. Check with the organizer before you go.",
      "- Contests are run by their organizers. SoCal Lights provides the website only.", "",
      "Want to talk to a person? Write to info@socallights.app or [ask us](#ask).") },
  { slug: "wheelchair-and-stroller-friendly-places", title: "Find stroller and wheelchair friendly places", category: "find", kind: "answer", sort: 165,
    summary: "Open Filters, then Stroller friendly under Visiting a home. A home's page says Stroller and wheelchair friendly when its owner ticked it.",
    keywords: "wheelchair, accessible, accessibility, stroller, strollers, disabled, mobility, kids, children, toddler, family, parking, walk by, drive by, hard to park",
    body: L(
      "Families and visitors who use a wheelchair or a stroller can narrow the map to homes whose owners say they are easy to visit.", "",
      "1. On the map, tap **Filters**.",
      "2. Under **Visiting a home**, tap **Stroller friendly**. You can add **Free parking**, **Drive by** or **Walk by** too.",
      "3. Tap the button at the bottom to see the places.",
      "4. Open a home to see its facts. A home says **Stroller and wheelchair friendly** when its owner ticked that box.", "",
      "## Good to know", "",
      "- **Drive by** homes can be seen from your car. A home's page also says if parking is free, on the street or hard to find.",
      "- Owners fill these in themselves and we do not check them. If a home or an event is not as described, tap **Report a problem** on it.",
      "- Posting your own home? Tick **Stroller and wheelchair friendly** when you edit it. See [Take your home down and put it back](/help/take-your-home-down-and-put-it-back).",
      "- For an event, ask the organizer about access. The event's page links to their site.", "",
      "Anything else, [ask us](#ask).") },
];

// ---------------------------------------------------------------- build the SQL
const out = [L(
  "-- Help Center copy audit 2026-11-11 (batch E): eight new articles and small edits to existing ones. Generated by scripts/help/updates-copy-1111.mjs; the text of the new articles is in docs/help-updates.md.",
  "-- Every UPDATE only touches an article nobody edited in Admin (updated_by = 'seed'), and replaces text fragments, so an article that has moved on is left as it is. New articles use INSERT OR IGNORE. No prices and no event dates are written in any article: they are on /pricing and the map.",
  "-- Covers: the raw [ask us](#ask) links (rendered by the page now, nothing to change here), ### headings and bold button names (HLP-02), age and eligibility (HLP-03), edit/cancel an event and take a home down (HLP-04), Shop tab, day and night mode, who won, who can run a contest, what is SoCal Lights, wheelchair and stroller (HLP-05), search words (HLP-06), Founder city badge grouped with the contest articles (HLP-08), the app pass video link (HLP-10), '&' in the season name (HLP-12), the long Featured bullet (HLP-13), plain steps (HLP-14), 'labeled' (CPY-02).")];
const KW = (slug, extra) => `keywords = CASE WHEN keywords = '' THEN ${q(extra)} ELSE keywords || ', ' || ${q(extra)} END`;
let nEdits = 0;
for (const e of EDITS) {
  const row = cur(e.slug); let body = row.body, expr = "body";
  for (const [a, b] of e.edits || []) {
    const n = body.split(a).length - 1;
    if (n !== 1) throw new Error(`${e.slug}: the text to replace is in the article ${n} times (needs exactly 1): ${a.slice(0, 70)}`);
    body = body.replace(a, () => b); expr = `replace(${expr}, ${q(a)}, ${q(b)})`; nEdits++;
  }
  const sets = [];
  if (e.edits && e.edits.length) sets.push(`body = ${expr}`);
  // a few summaries carry the same spelling fix
  if (/labelled/.test(row.summary)) sets.push(`summary = replace(summary, 'labelled', 'labeled')`);
  if (e.kw) { const add = e.kw.split(",").map((x) => x.trim()).filter((w) => !row.keywords.toLowerCase().includes(w.toLowerCase())).join(", "); if (add) sets.push(KW(e.slug, add)); }
  for (const [k, v] of Object.entries(e.set || {})) sets.push(`${k} = ${typeof v === "number" ? v : q(v)}`);
  if (!sets.length) continue;
  out.push(`UPDATE help_articles SET ${sets.join(", ")}, updated_at = datetime('now') WHERE slug = ${q(e.slug)} AND updated_by = 'seed';`);
}
for (const a of NEW) {
  if (db.prepare("SELECT 1 FROM help_articles WHERE slug = ?").get(a.slug)) throw new Error("article exists: " + a.slug);
  if (/\$\s?\d/.test(a.body + a.summary)) throw new Error("price in " + a.slug);
  out.push(`INSERT OR IGNORE INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES (${q(a.slug)}, ${q(a.title)}, ${q(a.category)}, ${q(a.kind)}, ${q(a.summary)}, ${q(a.body)}, ${q(a.keywords)}, '', ${a.sort}, 'published', 'seed');`);
}
writeFileSync(join(ROOT, "migrations", OUT), out.join("\n") + "\n");
console.log(`wrote migrations/${OUT}: ${EDITS.length} articles edited (${nEdits} text fragments), ${NEW.length} new`);

if (process.argv.includes("--md")) {
  let md = "\n\n# Help Center copy audit (2026-11-11): the new articles\n\nMigration `0227_help_copy_audit_2026-11-11.sql` adds these eight articles and edits nineteen others (text fragments, only where nobody edited the article in Admin). If an article you edited in Admin should get the new wording, paste it from here. Regenerate with `node scripts/help/updates-copy-1111.mjs --md`. Slugs never change.\n";
  for (const a of NEW) md += `\n## ${a.slug}\nNew article. Category: ${a.category}. Type: ${a.kind}. Order: ${a.sort}.\n\nTitle:\n\n    ${a.title}\n\nOne-sentence answer:\n\n    ${a.summary}\n\nSearch words:\n\n    ${a.keywords.replace(/,/g, "")}\n\nText:\n\n${a.body.split("\n").map((l) => "    " + l).join("\n")}\n`;
  appendFileSync(join(ROOT, "docs", "help-updates.md"), md);
  console.log("appended to docs/help-updates.md");
}
