// Run a contest (9), Sponsors and installers (3), Post events and homes (2); also the runner: node scripts/tutorials/videos2.mjs <id>
import { S, ck, SLUG, BASE, hook, recap, nextUp, target, fromMap, toDash, panel, next, nav, mails, MAPSPEC } from "./videos.mjs";
import { record, sleep } from "./record.mjs";
import { openSite, openShort, navSteps, emailScene } from "./steps.mjs";
const NEXT = "#nextbtn", ER = "Run a contest", ES = "Sponsors and installers", EP = "Post events and homes";
const toWizard = (full) => [...(full ? openSite() : openShort()), ...fromMap("add", [target("Tap A contest", "Three choices. Tap A contest.", 'a[href="/add-contest"]', { after: 1800 })])];
const screens = (nm) => [
  { cap: "1 of 7: Name it", say: "Name your contest. Type a name, then tap Next.", do: async (p, h) => { await h.type("#f-name", nm); }, target: NEXT },
  { cap: "2 of 7: Who runs it", say: "Who is running it? Type the name, pick your city, then tap Next.", do: async (p, h) => { await h.type("#f-org", "Oak Hill Neighbors"); await h.move("#f-city"); await p.selectOption("#f-city", "Irvine"); await h.unring(); await sleep(600); }, target: NEXT },
  { cap: "3 of 7: Welcome message", say: "This welcome message is already written. Keep it, and tap Next.", do: async (p, h) => { await h.hover("#f-descr", 700); }, target: NEXT },
  { cap: "4 of 7: Website (optional)", say: "A website is optional. Skip it, and tap Next.", do: async (p, h) => { await h.hover("#f-site", 600); }, target: NEXT },
  { cap: "5 of 7: Dates", say: "These dates are filled in for you. Tap Next.", do: async (p, h) => { await h.hover("#f-closes", 700); }, target: NEXT },
];
const live = (label) => [
  { cap: "Your contest is live", say: "Your contest is live! Tap Open my dashboard.", target: "text=Open my dashboard", after: 2000 },
  { cap: "Your dashboard", say: `This is your dashboard, with your link and QR code, ready to share.`, do: async (p, h) => { await h.hover(".stats", 1000); }, pad: 0.8 },
];
S.quick = { id: "quick", file: "run-quick", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Create a contest in two minutes", "Quick start", "In two minutes, you will have a live neighborhood contest, with its own link and QR code. Let's start."),
  ...toWizard(true), ...screens("Oak Hill Holiday Lights 2026"),
  { cap: "6 of 7: Quick start", say: "Choose Quick start. It sets everything up for you. Then tap Next.", target: '[data-tile="quick|yes"]', after: 1000, post: (p, h) => next(p, h) },
  { cap: "7 of 7: Create contest", say: "Check your details, and tap Create contest.", do: async (p, h) => { await h.scroll(160); }, target: NEXT, after: 2600, poster: true },
  ...live(), nextUp(ER, "Create a contest with Customize", "Judges, prizes, categories, vote counts and your own rules"),
]};
S.custom = { id: "custom", file: "run-custom", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Customize your contest", "Judges, prizes, categories and rules", "In two minutes, you will set up a contest your way, with judges, a prize, and your own categories. Let's start."),
  ...toWizard(false), ...screens("Pine Ridge Holiday Lights 2026"),
  { cap: "6: Customize everything", say: "Choose Customize everything. Then tap Next.", target: '[data-tile="quick|no"]', after: 1000, post: (p, h) => next(p, h) },
  { cap: "Categories", say: "Pick your categories. Tap one to turn it off, or add your own. Then tap Next.", do: async (p, h) => { await h.type("#f-newcat", "Best Inflatable"); await h.click('[data-a="addcat"]', { after: 900 }); }, target: NEXT, poster: true, after: 1200 },
  { cap: "Who can vote", say: "Who can vote? We choose Everyone and judges. Then tap Next.", target: '[data-tile="mode|both"]', after: 900, post: (p, h) => next(p, h) },
  { cap: "Invite your judges", say: "Add your judges, one email on each line. Then tap Next.", do: async (p, h) => { await h.type("#f-judges", "judge1@example.com\\njudge2@example.com"); }, target: NEXT, after: 1200 },
  { cap: "How judges vote", say: "Judges can pick a favorite, or score every home. Choose score, then tap Next.", target: '[data-tile="method|score"]', after: 900, post: (p, h) => next(p, h) },
  { cap: "Approving entries", say: "Review each entry first. That is recommended. Tap Next.", do: async (p, h) => { await h.hover('[data-tile="approval|manual"]', 500); }, target: NEXT, after: 1200 },
  { cap: "Vote counts", say: "Hide vote counts until you announce winners. Tap Next.", do: async (p, h) => { await h.hover('[data-tile="counts|no"]', 500); }, target: NEXT, after: 1200 },
  { cap: "Fairness rules", say: "A home can win several categories. Tap Next.", do: async (p, h) => { await h.hover('[data-tile="oneWin|no"]', 500); }, target: NEXT, after: 1200 },
  { cap: "Prize", say: "Add a prize. We give each winner the same one. Then tap Next.", target: '[data-tile="prizeMode|one"]', after: 800, post: async (p, h) => { await h.type("#f-prize", "A 50 dollar gift card"); await h.click(NEXT, { after: 1200 }); } },
  { cap: "Official rules", say: "We wrote your official rules. Edit anything you like. Tap Next.", do: async (p, h) => { await h.hover("#f-rules", 700); }, target: NEXT, after: 1200 },
  { cap: "Create contest", say: "Check everything, and tap Create contest.", do: async (p, h) => { await h.scroll(260, 1000); }, target: NEXT, after: 2600 },
  ...live(), nextUp(ER, "Share your contest", "Link, QR code, entry poster and yard sign"),
]};
const preview = async (p, h, sel, ms) => { await p.evaluate(() => { window.print = () => {}; }); const y = await p.evaluate(() => scrollY); await h.click(sel, { after: 300 }); await p.emulateMedia({ media: "print" }); await p.evaluate(() => scrollTo(0, 0)); await sleep(ms / 2); await h.scroll(260, ms / 2); await sleep(300); await p.evaluate((y) => scrollTo(0, y), y); await p.emulateMedia({ media: null }); await p.evaluate(() => dispatchEvent(new Event("afterprint"))); await sleep(600); };
S.share = { id: "share", file: "run-share", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Share your contest", "Link, QR code, poster, yard sign", "In under two minutes, you will share your contest with your neighbors. We start on the map."),
  ...toDash(),
  { cap: "Share it", say: "On the Overview, find the card called Share it.", do: async (p, h) => { await h.scrollTo("text=Share it", 100); } },
  target("Tap Copy link", "Tap Copy link, then paste it into an email, a text, or a Facebook post.", "[data-copy]", { after: 1200, poster: true }),
  { cap: "The QR code", say: "The QR code opens your contest when someone scans it with a phone. Put it on flyers and signs.", do: async (p, h) => { await h.hover(".poster", 1200); } },
  { cap: "Entry poster", say: "Print entry poster makes a page for a bulletin board. Here is a sample.", do: async (p, h) => { await preview(p, h, "#printposter", 3200); } },
  { cap: "Yard sign", say: "Print yard sign makes a big sign for a lawn. Here is a sample.", do: async (p, h) => { await preview(p, h, "#printsign", 3200); } },
  target("Tap Promote", "To invite neighbors by email, tap Promote.", nav("promote"), { after: 1200 }),
  target("Invite neighbors by email", "Open Invite neighbors by email. Type their addresses, and add a note.", "#invitecard summary", { after: 1000 }),
  emailScene(mails.neighbor, "Each neighbor gets an invitation like this one, with your note and one button.", "neighbor@example.com"),
  nextUp(ER, "Approve and decline entries", "Approve, decline with a reason, and undo a decline"),
]};
S.approve = { id: "approve", file: "run-approve", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Approve and decline entries", "Review each home", "In under two minutes, you will review the homes your neighbors entered. We start on the map."),
  ...toDash(),
  target("Tap Entries", "Tap Entries. Nothing goes on the map until you approve it.", nav("entries"), { after: 1500 }),
  target("Tap Approve", "Tap Approve to put a home in the contest, and on the map.", '[data-entry="approve:p_pend1"]', { after: 1800, poster: true }),
  target("Tap Decline", "Tap Decline if an entry does not fit.", '[data-entry="decline:p_pend2"]', { after: 1200 }),
  { cap: "Give a reason", say: "A window asks why. The reason is optional, and it is emailed to the entrant. Tap Decline entry.", do: async (p, h) => { await h.type("#rsn", "The photo is too dark to see the lights."); }, target: "#rs-go", after: 1800 },
  target("Tap Restore", "Changed your mind? Tap Restore to put it back.", '[data-entry="restore:p_pend2"]', { after: 1800 }),
  nextUp(ER, "Edit your contest and change the dates", "Change the details any time before winners are announced"),
]};
S.edit = { id: "edit", file: "run-edit", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Edit your contest", "Change the dates and details", "In under two minutes, you will change your contest's dates and details. We start on the map."),
  ...toDash(),
  target("Tap Change dates", "On the Overview, find Schedule. Tap Change dates.", "#editdates", { after: 1800 }),
  { cap: "Change the dates", say: "Change the date that entries close, and the voting dates.", do: async (p, h) => { await h.scrollTo("#e-closes", 220); await h.type("#e-closes", "2026-12-12", { fill: true }); await h.type("#e-vs", "2026-12-13", { fill: true }); await h.type("#e-ve", "2026-12-22", { fill: true }); }, poster: true },
  { cap: "Name, message, prize, rules", say: "You can also change the name, the message, the prize, and the rules. Entrants see changes right away.", do: async (p, h) => { await h.scrollTo("#e-name", 120); await h.hover("#e-descr", 800); } },
  target("Tap Save changes", "Tap Save changes. The team is emailed about changes, so nobody is surprised.", '#editform button[type="submit"]', { after: 2000 }),
  nextUp(ER, "Run voting", "Start now, pause, review votes and void a vote"),
]};
S.voting = { id: "voting", file: "run-voting", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Run voting", "Pause, review, and void a vote", "In under two minutes, you will control voting: pause it, check the votes, and void a bad one. We start on the map."),
  ...toDash(),
  { cap: "Controls", say: "Voting opens and closes on your dates. The Controls card lets you change that.", do: async (p, h) => { await h.scrollTo("text=Controls", 100); } },
  target("Tap Pause voting", "Tap Pause voting to stop votes for a moment.", '[data-act="pause_voting"]', { after: 1500, poster: true }),
  target("Tap Resume voting", "Tap Resume voting to start again.", '[data-act="resume_voting"]', { after: 1500 }),
  target("Tap Results", "Tap Results for the full tally. You always see the counts, even when the public cannot.", nav("results"), { after: 1500 }),
  target("Review individual votes", "Open Review individual votes. Odd patterns are flagged.", "#votecard summary", { after: 1500, pre: async (p, h) => { await h.scrollTo("#votecard summary", 140); } }),
  target("Tap Void", "Tap Void next to a vote that should not count.", "#votecard button:has-text('Void') >> nth=0", { after: 1800 }),
  nextUp(ER, "Add co-organizers and judges", "Invite people to help run the contest"),
]};
S.team = { id: "team", file: "run-team", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Add co-organizers and judges", "Invite people to help", "In under two minutes, you will invite people to help run your contest. We start on the map."),
  ...toDash(),
  target("Tap Team", "Tap Team. Co-organizers get the same dashboard you have.", nav("team"), { after: 1400 }),
  { cap: "Add a co-organizer", say: "Type their email, and tap Add co-organizer.", do: async (p, h) => { await h.scrollTo("#newstaff", 260); await h.type("#newstaff", "helper@example.com"); }, target: "#addstaff", after: 1800, poster: true },
  emailScene(mails.coorg, "They get an email like this one, with one button to open the dashboard.", "helper@example.com"),
  target("Tap Judges", "Judges are added on the Judges tab. Tap Judges.", nav("judges"), { after: 1400 }),
  { cap: "Add a judge", say: "Type a judge's email, and tap Add judge.", do: async (p, h) => { await h.scrollTo("#newjudge", 260); await h.type("#newjudge", "judge4@example.com"); }, target: "button:has-text('Add judge')", after: 1800 },
  emailScene(mails.judge, "Your judge gets an invitation like this one, with a button that opens their ballot.", "judge4@example.com"),
  nextUp(ER, "Announce winners", "Close voting, announce, export results and see the archive"),
]};
S.announce = { id: "announce", file: "run-announce", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Announce the winners", "Close voting and show the results", "In under two minutes, you will close voting and announce the winners. We start on the map."),
  ...toDash(),
  target("Tap Results", "Tap Results. It shows who would win if you announced today.", nav("results"), { after: 1500 }),
  target("Tap Download results", "Tap Download results to save a spreadsheet.", "text=Download results", { after: 800, pre: async (p, h) => { await h.scrollTo("text=Download results", 300); } }),
  target("Close voting and announce winners", "When voting is over, tap Close voting and announce winners.", '[data-act="announce"]', { after: 1400, poster: true }),
  target("Tap again to confirm", "It asks you to tap again, because this cannot be undone. Tap it again. Everyone is emailed.", '[data-act="announce"]', { after: 2400 }),
  target("See it as voters do", "To see what everyone sees, tap See it as voters do.", 'a:has-text("See it as voters do")', { after: 1800 }),
  { cap: "The winners", say: "The winners keep a crown on the contest page.", do: async (p, h) => { await h.scrollTo("h2:has-text('Winners')", 140).catch(() => {}); await h.hover("h2:has-text('Winners')", 1200).catch(() => {}); await sleep(800); }, pad: 0.6 },
  nextUp(ER, "Read your contest activity", "Visits, QR scans, voters and votes per day"),
]};
S.activity = { id: "activity", file: "run-activity", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Read your contest activity", "Visits, QR scans, and votes", "In one minute, you will see how many people found your contest. We start on the map."),
  ...toDash(),
  target("Tap Promote", "Tap Promote.", nav("promote"), { after: 1400 }),
  { cap: "Activity", say: "Activity shows page visits, visits from your QR code, and how many people voted.", do: async (p, h) => { await h.scrollTo("text=Page visits", 220); await h.hover("text=From the QR code", 900); }, poster: true },
  { cap: "Votes per day", say: "Below, a chart shows votes for each day. Use it to see which sharing worked best.", do: async (p, h) => { await h.scrollTo("text=Votes per day", 160); await h.hover("text=Votes per day", 1200); } },
  nextUp(ER, "Add sponsors and logos", "Show sponsors by tier on the contest page"),
]};

// ---------------- Sponsors and installers ----------------
S.sponsors = { id: "sponsors", file: "sponsors-add", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ES, "Add sponsors and logos", "Thank the businesses that help", "In under two minutes, you will add a sponsor and its logo to your contest. We start on the map."),
  ...toDash(),
  target("Tap Sponsors", "Tap Sponsors.", nav("sponsors"), { after: 1400 }),
  { cap: "Name and tier", say: "Type the sponsor's name, and choose a tier.", do: async (p, h) => { await h.type("#sp-name", "Oak Hill Hardware"); await h.move("#sp-tier"); await p.selectOption("#sp-tier", "gold"); await h.unring(); await sleep(600); } },
  { cap: "Website and logo", say: "Add their website, and choose their logo.", do: async (p, h) => { await h.type("#sp-url", "https://oakhillhardware.example.com"); p.once("filechooser", (fc) => fc.setFiles(process.env.LOGO)); }, target: "#sp-logo", after: 1800 },
  target("Tap Add sponsor", "Tap Add sponsor. Sponsors can pay you directly, and payment never affects who wins.", '#spform button[type="submit"]', { after: 2000, poster: true }),
  target("See it as voters do", "To check how it looks, tap See it as voters do.", 'a:has-text("See it as voters do")', { after: 2200 }),
  nextUp(ES, "Presenting installer and quote requests", "How the Get a quote button works"),
]};
S.installer = { id: "installer", file: "sponsors-installer", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ES, "Add a presenting installer", "The Get a quote button", "In under two minutes, you will add a lighting company to your contest, and see how families ask for a quote. We start on the map."),
  ...toDash(),
  target("Tap Details", "Tap Details, and scroll to Presenting installer.", nav("details"), { after: 1400 }),
  { cap: "Presenting installer", say: "Type the company's name, the email for quote requests, and their website.", do: async (p, h) => { await h.scrollTo("#e-iname", 220); await h.type("#e-iname", "Bright Nights Lighting"); await h.type("#e-iemail", "quotes@brightnights.example.com"); await h.type("#e-iurl", "brightnights.example.com"); } },
  target("Tap Save changes", "Tap Save changes. This adds a Get a quote button to your contest page.", '#editform button[type="submit"]', { after: 2000, poster: true }),
  { cap: "A neighbor visits", say: "Now a neighbor opens the contest page, and taps Get a quote.", do: async (p, h) => { await h.ctx.clearCookies(); await h.ctx.addCookies([{ name: "scl_session", value: ck.u_voter, url: BASE }]); await p.goto(BASE + "/c/" + SLUG, { waitUntil: "networkidle" }); await h.scrollTo("#quotebtn", 300); }, target: "#quotebtn", after: 1400 },
  { cap: "Share my details", say: "They add their name, and what they would like done. They must tick the box to share their details. Then they tap Send request.", do: async (p, h) => { await h.type("#q-name", "Sam Rivera"); await h.type("#q-note", "Roofline lights, please."); await h.click("#q-ok", { after: 700 }); }, target: '#quoteform button[type="submit"]', after: 2000 },
  nextUp(ES, "Installer profiles and Installed by", "How a company gets a profile, how a home links to it, and how to confirm or claim yours"),
]};
S["installer-profile"] = { id: "installer-profile", file: "sponsors-profile", cookie: ck.u_inst, ...MAPSPEC, steps: [
  hook(ES, "Installer profiles", "Installed by, and how to claim yours", "In under two minutes, you will see how a lighting company gets a profile, and how to manage it. We start on the map."),
  ...openShort(),
  target("Tap the season button", "Tap the season button.", "#seasonbtn", { after: 800 }),
  target("Tap Thanksgiving and Christmas Lights", "Tap Thanksgiving and Christmas Lights.", '[data-sp]:has-text("Christmas")', { after: 1400 }),
  { cap: "Search a home", say: "Search for a home. Type its name, and open it.", do: async (p, h) => { await h.type("#q", "Garcia Family"); }, target: "#pbody .item >> nth=0", after: 2200 },
  { cap: "Installed by", say: "It says Installed by, with the company's name. A check mark means the company confirmed it.", do: async (p, h) => { await h.hover(".instby", 1200); } },
  target("Tap the company name", "Tap the company's name to open its profile.", "a.instlink >> nth=0", { after: 2400, poster: true }),
  { cap: "Manage your profile", say: "If this is your company, claim the profile with your company email. Then you manage it here. Homes that name your company are listed on the Homes tab.", do: async (p, h) => { await p.goto(BASE + "/installer/bright-nights-lighting/manage#homes", { waitUntil: "networkidle" }); await sleep(1200); await h.hover("[data-claim^='confirm']", 900); } },
  target("Tap Confirm", "Tap Confirm for each home you installed. It gets a check mark.", "[data-claim^='confirm']", { after: 2000 }),
  nextUp(ES, "Add an event to the map", "Share a tree lighting, market, parade or haunted house"),
]};

// ---------------- Post events and homes ----------------
const NOCFG = [{ url: "**/api/config", json: {} }];
S["add-event"] = { id: "add-event", file: "post-event", cookie: ck.u_enter, routes: NOCFG, ...MAPSPEC, steps: [
  hook(EP, "Add an event to the map", "A tree lighting, market or parade", "In under two minutes, you will add an event to the map. We start on the map."),
  ...openShort(),
  ...fromMap("add", [target("Tap An event", "Tap An event.", 'a[href="/add-event"]', { after: 1800 })]),
  { cap: "1 of 6: Web page", say: "If your event has a web page, paste it here. If not, tap No, Next.", target: '[data-a="skipurl"]', after: 1400 },
  { cap: "2 of 6: Name and type", say: "Type the event's name, and choose a season and type. Then tap Next.", do: async (p, h) => { await h.type("#f-name", "Oak Hill Neighborhood Tree Lighting"); await h.move("#f-season"); await p.selectOption("#f-season", "christmas"); await h.unring(); await sleep(500); const o = await p.$$eval("#f-type option", (os) => os.map((x) => [x.value, x.textContent])); await h.move("#f-type"); await p.selectOption("#f-type", (o.find(([v, t]) => v && /tree/i.test(t)) || o.find(([v]) => v))[0]); await h.unring(); await sleep(500); }, target: NEXT, after: 1400 },
  { cap: "3 of 6: When", say: "Pick the first and last day. Then tap Next.", do: async (p, h) => { await p.fill("#f-start", "2026-12-05"); await p.fill("#f-end", "2026-12-05"); await h.type("#f-hours", "5 to 9 pm"); }, target: NEXT, after: 1400 },
  { cap: "4 of 6: Free or paid", say: "Free or paid? Tap Free, then Next.", target: '[data-tile="free|yes"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "5 of 6: Where", say: "Type the place, the city, and the street address. Then tap Next.", do: async (p, h) => { await h.type("#f-venue", "Oak Hill Community Park"); await h.move("#f-city"); await p.selectOption("#f-city", "Irvine"); await h.unring(); await h.type("#f-street", "100 Oak Hill Way"); }, target: NEXT, after: 1400 },
  { cap: "6 of 6: Describe it", say: "Describe it in a sentence or two. Then tap Next.", do: async (p, h) => { await h.type("#f-blurb", "Join the neighborhood for cocoa, carols and the lighting of the tree. Free and open to everyone."); }, target: NEXT, after: 1400 },
  { cap: "Add my event", say: "Check everything, and tap Add my event.", target: NEXT, after: 2400, poster: true },
  nextUp(EP, "Show off your house", "Put your lights on the map with Showcase a House"),
]};
S.showcase = { id: "showcase", file: "post-house", cookie: ck.u_enter, routes: NOCFG, ...MAPSPEC, steps: [
  hook(EP, "Show off your house", "Put your lights on the map", "In under two minutes, you will put your own lights on the map. We start on the map."),
  ...openShort(),
  ...fromMap("add", [target("Tap A lighting display", "Tap A lighting display.", 'a[href="/add-house"]', { after: 1800 })]),
  { cap: "Who is posting", say: "Who is posting? Tap A homeowner. Then tap Next.", target: '[data-tile="kind|homeowner"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "Name to show", say: "Type the name to show. Then tap Next.", do: async (p, h) => { await h.type("#f-biz", "The Kim family"); }, target: NEXT, after: 1400 },
  { cap: "Did a company install it?", say: "Did a company install your lights? We did it ourselves. Tap No, then Next.", target: '[data-tile="hadPro|no"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "Season", say: "Which season? Tap Christmas, then Next.", target: '[data-tile="season|christmas"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "About the display", say: "Name the display, and tell us what makes it special. Then tap Next.", do: async (p, h) => { await h.type("#f-title", "Kim Family Christmas Lights"); await h.type("#f-desc", "Twelve thousand lights on the roof and trees, with a walkway of candy canes."); }, target: NEXT, after: 1400 },
  { cap: "Address", say: "Add the address. The pin goes here. Then tap Next.", do: async (p, h) => { await h.move("#f-city"); await p.selectOption("#f-city", "Irvine"); await h.unring(); await h.type("#f-street", "460 Maple Street"); await h.type("#f-zip", "92602"); }, target: NEXT, after: 1400 },
  { cap: "Plan a visit", say: "Tell families when the lights are on, and how to see them. Then tap Next.", do: async (p, h) => { await h.type("#f-lightsOn", "5 to 10 pm nightly"); await h.click('[data-tile="visit|both"]', { after: 800 }); }, target: NEXT, after: 1400 },
  { cap: "Photos", say: "Add photos. Then tap Next.", pre: async (p) => p.once("filechooser", (fc) => fc.setFiles(["public/img/stock/tree-3.jpg", "public/img/stock/walk-2.jpg"])), target: "label[for=f-photos]", after: 2200, post: (p, h) => next(p, h) },
  { cap: "Put it on the map", say: "Check everything, and tap Put it on the map.", target: NEXT, after: 2400, poster: true },
  nextUp(EP, "Find lights near you", "Use the map, filters, seasons and All seasons to find what is on near you"),
]};

const id = process.argv[2];
if (id) { if (!S[id]) throw new Error("no video " + id); await record(S[id]); }
