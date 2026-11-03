// Records the nine "Run a contest" tutorials (desktop, signed in as the organizer). Every video starts on the map.
// Usage: VOICE=... COOKIES=... PLAYWRIGHT_PATH=... node scripts/tutorials/run-contest.mjs [quick|custom|share|approve|edit|voting|team|announce|activity]
import { readFileSync } from "node:fs";
import { record, sleep } from "./record.mjs";
import { end as endCard, fromMap, navSteps } from "./steps.mjs";
import { renderTemplate } from "../../functions/_lib/mailtpl.js";
// The app's real invitation emails (the wording comes from the template list that Admin edits), filled with demo names
const PAGE = "https://socallights.app/c/maple-street-holiday-lights-2026", NOTE = "Hi neighbors! Come enter your house, or vote for your favorites. Cocoa on the corner Saturday at 6.", BASE_VARS = { contest: "Maple Street Holiday Lights 2026", org: "Maple Street Neighbors" };
const MAILS = {
  neighbor: await renderTemplate({}, "contest_invite", { ...BASE_VARS, city: "Irvine", link: PAGE, note: NOTE, contact: "maria@demo.example" }),
  coorg: await renderTemplate({}, "coorg_invite", { ...BASE_VARS, link: PAGE + "/manage" }),
  judge: await renderTemplate({}, "judge_invite", { ...BASE_VARS, how: "Score every home from 1 to 10 in each category.", link: PAGE + "/judge" }),
};
const ck = JSON.parse(readFileSync(process.env.COOKIES, "utf8")), SLUG = "maple-street-holiday-lights-2026", EY = "Run a contest";
const end = (t, s) => endCard(EY, t, s), card = (t, s) => ({ card: { ey: EY, title: t, sub: s } });
const nav = (k) => `[data-k="${k}"] >> visible=true`;
// map -> three dots -> Contests -> Mine -> Manage
const toDash = () => fromMap("contests", "", [
  { cap: "Tap Mine", say: "Then tap the Mine tab. It lists the contests you run.", do: async (p, h) => { await h.click("[data-tab=mine]", { after: 1800 }); } },
  { cap: "Tap Manage", say: "Last, tap Manage next to your contest. This opens your dashboard.", do: async (p, h) => { await h.click(`a[href="/c/${SLUG}/manage"]`, { after: 2600 }); } },
]);
const panel = (k, label, say) => ({ cap: "Tap " + label, say, do: async (p, h) => { await h.click(nav(k), { after: 2200 }); } });
// map -> Add -> A contest
const toWizard = () => fromMap("add", "", [
  { cap: "Tap A contest", say: "Three choices. Tap A contest.", target: 'a[href="/add-contest"]', after: 2200 },
]);
const NEXT = "#nextbtn";
const next = async (p, h, after = 1800) => h.click(NEXT, { after });
const startScreens = (nm) => [
  { cap: "1 of 7: Name it", say: "Name your contest. Type a name, then tap Next.", do: async (p, h) => { await h.type("#f-name", nm); }, target: NEXT },
  { cap: "2 of 7: Who runs it", say: "Who is running it? Type the name, pick your city, then tap Next.", do: async (p, h) => { await h.type("#f-org", "Oak Hill Neighbors"); await h.move("#f-city"); await p.selectOption("#f-city", "Irvine"); await h.unring(); await sleep(700); }, target: NEXT },
  { cap: "3 of 7: Welcome message", say: "This welcome message is already written. Keep it, and tap Next.", do: async (p, h) => { await h.hover("#f-descr", 900); }, target: NEXT },
  { cap: "4 of 7: Website (optional)", say: "A website is optional. Skip it, and tap Next.", do: async (p, h) => { await h.hover("#f-site", 700); }, target: NEXT },
  { cap: "5 of 7: Dates", say: "These dates are filled in for you. Tap Next.", do: async (p, h) => { await h.hover("#f-closes", 900); }, target: NEXT },
];
const quick = {
  id: "quick", file: "run-quick", cookie: ck.u_org, start: "/",
  steps: [
    { card: { ey: EY, title: "Create a contest in two minutes", sub: "Quick start" }, say: "In two minutes, you will have a live neighborhood contest, with its own link and QR code. We start on the map.", pad: 0.6 },
    ...toWizard(),
    ...startScreens("Oak Hill Holiday Lights 2026"),
    { cap: "6 of 7: Quick start", say: "Choose Quick start. It sets everything up for you. Then tap Next.", target: '[data-tile="quick|yes"]', after: 1000, post: (p, h) => next(p, h) },
    { cap: "7 of 7: Create contest", say: "Check your details, and tap Create contest.", do: async (p, h) => { await h.scroll(160); }, target: NEXT, after: 2600, poster: true },
    { cap: "Your contest is live", say: "Your contest is live! Tap Open my dashboard.", target: "text=Open my dashboard", after: 2200 },
    { cap: "Your dashboard", say: "This is your dashboard, with your link and QR code, ready to share. That was the map, the three dots, Add, A contest, and seven quick screens.", do: async (p, h) => { await h.hover(".stats", 1200); }, pad: 1.0 },
    end("Create a contest with Customize", "Judges, prizes, categories, vote counts and your own rules"),
  ],
};
const custom = {
  id: "custom", file: "run-custom", cookie: ck.u_org, start: "/",
  steps: [
    { ...card("Create a contest with Customize", "Judges, prizes, categories, vote counts and your own rules"), say: "Create a contest with Customize. In this video, you choose every setting yourself.", pad: 1.2 },
    ...toWizard(),
    ...startScreens("Pine Ridge Holiday Lights 2026"),
    { cap: "Customize everything", say: "On the setup screen, choose Customize everything.", do: async (p, h) => { await h.click('[data-tile="quick|no"]', { after: 2000 }); }, post: (p, h) => next(p, h) },
    { cap: "Categories", say: "Pick your voting categories. Tap a category to turn it off, or add your own.", do: async (p, h) => { await h.click('[data-a="cat:Best Overall"]', { after: 1200 }); await h.type("#f-newcat", "Best Inflatable"); await h.click('[data-a="addcat"]', { after: 1800 }); }, post: (p, h) => next(p, h), poster: true },
    { cap: "Who can vote", say: "Choose who can vote. Everyone, judges only, or everyone and judges. We will choose both.", do: async (p, h) => { await h.click('[data-tile="mode|both"]', { after: 2000 }); }, post: (p, h) => next(p, h) },
    { cap: "Invite your judges", say: "Add your judges, one email address on each line. They each get a private link.", do: async (p, h) => { await h.type("#f-judges", "judge1@example.com\njudge2@example.com\njudge3@example.com"); }, post: (p, h) => next(p, h) },
    { cap: "How judges vote", say: "Judges can pick a favorite, or score every home from one to ten. We will choose scoring.", do: async (p, h) => { await h.click('[data-tile="method|score"]', { after: 2000 }); }, post: (p, h) => next(p, h) },
    { cap: "Approving entries", say: "Choose how entries are approved. Reviewing each one first is recommended.", do: async (p, h) => { await h.hover('[data-tile="approval|manual"]', 1600); }, post: (p, h) => next(p, h) },
    { cap: "Vote counts", say: "Choose whether people see vote counts while voting. Hiding them avoids bandwagon voting.", do: async (p, h) => { await h.hover('[data-tile="counts|no"]', 1600); }, post: (p, h) => next(p, h) },
    { cap: "Fairness rules", say: "Choose whether a home can win more than one category. These rules protect your contest.", do: async (p, h) => { await h.hover('[data-tile="oneWin|no"]', 1600); }, post: (p, h) => next(p, h) },
    { cap: "Prize", say: "Add a prize if you like. We will give each winner the same prize.", do: async (p, h) => { await h.click('[data-tile="prizeMode|one"]', { after: 1400 }); await h.type("#f-prize", "A 50 dollar gift card for each winner"); }, post: (p, h) => next(p, h) },
    { cap: "Official rules", say: "We wrote the official rules for you. Read them, and edit anything you like. This is also where you can use your own rules.", do: async (p, h) => { await h.hover("#f-rules", 1200); await h.scroll(300, 1800); }, post: (p, h) => next(p, h) },
    { cap: "Create contest", say: "Review everything, then tap Create contest.", do: async (p, h) => { await h.scroll(300, 1400); }, post: (p, h) => h.click(NEXT, { after: 3200 }) },
    { cap: "Your contest is live", say: "Your contest is live, with a link and a QR code. Tap Open my dashboard.", do: async (p, h) => { await h.click("text=Open my dashboard", { after: 2800 }); } },
    end("Share your contest", "Link, QR code, entry poster and yard sign"),
  ],
};
// Shows what the print button would print, on screen: print layout for a few seconds, then back to the dashboard
const preview = async (p, h, sel, ms) => { await p.evaluate(() => { window.print = () => {}; }); const y = await p.evaluate(() => scrollY); await h.click(sel, { after: 300 }); await p.emulateMedia({ media: "print" }); await p.evaluate(() => scrollTo(0, 0)); await sleep(ms / 2); await h.scroll(260, ms / 2); await sleep(400); await p.evaluate((y) => scrollTo(0, y), y); await p.emulateMedia({ media: null }); await p.evaluate(() => dispatchEvent(new Event("afterprint"))); await sleep(900); };
const share = {
  id: "share", file: "run-share", cookie: ck.u_org, start: "/",
  steps: [
    { ...card("Share your contest", "Link, QR code, entry poster and yard sign"), say: "Share your contest. In this video, you get the word out to your neighbors.", pad: 1.2 },
    ...toDash(),
    { cap: "Overview > Share it", say: "On the Overview, look for the card called Share it.", do: async (p, h) => { await h.scrollTo("text=Share it", 100); } },
    { cap: "Copy link", say: "Tap Copy link, then paste the link into an email, a text, or a Facebook post.", do: async (p, h) => { await h.click("[data-copy]", { after: 2000 }); }, poster: true },
    { cap: "QR code", say: "The QR code opens your contest page when someone scans it with a phone. Put it on flyers and signs.", do: async (p, h) => { await h.hover(".poster", 2200); } },
    { cap: "Print entry poster", say: "Print entry poster makes a page for a bulletin board or a shop window. Here is a sample. It has the contest name, the QR code, and an invitation to enter.", do: async (p, h) => { await preview(p, h, "#printposter", 4200); }, poster: false },
    { cap: "Print yard sign", say: "Print yard sign makes a big sign for a lawn, with a QR code that opens the voting page. Here is a sample.", do: async (p, h) => { await preview(p, h, "#printsign", 4200); } },
    { cap: "Tap Promote", say: "On the Promote tab, you can also email an invitation to neighbors. Open Invite neighbors by email.", do: async (p, h) => { await h.click(nav("promote"), { after: 1600 }); await h.click("#invitecard summary", { after: 2200 }); } },
    { cap: "Invite neighbors by email", say: "Type one email address on each line, add a short note if you like, and tap Send invitations.", do: async (p, h) => { await h.type("#iv-list", "neighbor@example.com"); await h.type("#iv-note", "Hi neighbors! Come enter your house, or vote for your favorites. Cocoa on the corner Saturday at 6."); } },
    { cap: "What your neighbors receive", say: "Each neighbor gets an invitation email like this one, with your note and one button. This is an example.", mail: { subject: MAILS.neighbor.subject, html: MAILS.neighbor.html, to: "neighbor@example.com", note: "Example email" }, pad: 2.6 },
    end("Approve and decline entries", "Approve, decline with a reason, and undo a decline"),
  ],
};
const approve = {
  id: "approve", file: "run-approve", cookie: ck.u_org, start: "/",
  steps: [
    { ...card("Approve and decline entries", "Approve, decline with a reason, and undo a decline"), say: "Approve and decline entries. In this video, you review the homes that neighbors enter.", pad: 1.2 },
    ...toDash(),
    { cap: "Waiting for you", say: "The Overview shows how many entries are waiting for you. Nothing goes on the map until you approve it.", do: async (p, h) => { await h.hover(".stats", 2000); } },
    panel("entries", "Entries", "Open the Entries tab. Every entry is listed with its photo, address, and status."),
    { cap: "Approve", say: "Tap Approve to put a home in the contest and on the map.", do: async (p, h) => { await h.click('[data-entry="approve:p_pend1"]', { after: 2400 }); }, poster: true },
    { cap: "Decline with a reason", say: "Tap Decline if an entry does not fit. A small window asks why. The reason is optional, and it is emailed to the entrant.", do: async (p, h) => { await h.click('[data-entry="decline:p_pend2"]', { after: 1800 }); await h.type("#rsn", "The photo is too dark to see the lights."); await h.click("#rs-go", { after: 2400 }); } },
    { cap: "Undo a decline", say: "Changed your mind? Tap Restore to put a declined entry back.", do: async (p, h) => { await h.click('[data-entry="restore:p_pend2"]', { after: 2400 }); } },
    end("Edit your contest and change the dates", "Change the details any time before winners are announced"),
  ],
};
const edit = {
  id: "edit", file: "run-edit", cookie: ck.u_org, start: "/",
  steps: [
    { ...card("Edit your contest and change the dates", "Change the details any time before winners are announced"), say: "Edit your contest and change the dates. You can change the details any time before winners are announced.", pad: 1.2 },
    ...toDash(),
    { cap: "Change dates", say: "On the Overview, the Schedule line shows your dates. Tap Change dates.", do: async (p, h) => { await h.click("#editdates", { after: 2200 }); } },
    { cap: "Tap Details", say: "That opens the Details tab, with a form for everything about your contest.", do: async (p, h) => { await h.hover("#editcard summary", 1400); } },
    { cap: "Change the dates", say: "Change the date that entries close, or when voting starts and ends.", do: async (p, h) => { await h.scrollTo("#e-closes", 220); await h.type("#e-closes", "2026-12-12", { fill: true }); }, poster: true },
    { cap: "Name, message, prize, rules", say: "You can also change the name, the welcome message, the prize and the official rules. Entrants see changes right away.", do: async (p, h) => { await h.scrollTo("#e-name", 120); await h.hover("#e-descr", 1600); } },
    { cap: "Save changes", say: "Tap Save changes when you are done. The team is emailed about changes, so nobody is surprised.", do: async (p, h) => { await h.click('#editform button[type="submit"]', { after: 2600 }); } },
    end("Run voting", "Start now, pause, review votes and void a vote"),
  ],
};
const voting = {
  id: "voting", file: "run-voting", cookie: ck.u_org, start: "/",
  steps: [
    { ...card("Run voting", "Start now, pause, review votes and void a vote"), say: "Run voting. In this video, you control when neighbors can vote.", pad: 1.2 },
    ...toDash(),
    { cap: "Overview > Controls", say: "Voting opens and closes on your dates by themselves. The Controls card lets you override them.", do: async (p, h) => { await h.scrollTo("text=Controls", 100); await h.hover("text=Schedule:", 1600); } },
    { cap: "Pause voting", say: "Tap Pause voting to stop votes for a moment. Tap Resume voting to start again.", do: async (p, h) => { await h.click('[data-act="pause_voting"]', { after: 2200 }); await h.click('[data-act="resume_voting"]', { after: 2200 }); }, poster: true },
    { cap: "Vote counts", say: "Vote counts are hidden from the public until you announce winners. You can show them while voting if you like.", do: async (p, h) => { await h.hover('[data-act="show_counts"]', 1800); } },
    panel("results", "Results", "Open the Results tab to see the full tally. You always see the counts, even when they are hidden from the public."),
    { cap: "Review individual votes", say: "Open Review individual votes to see who voted for what. Throwaway emails and other odd patterns are flagged.", do: async (p, h) => { await h.scrollTo("#votecard summary", 140); await h.click("#votecard summary", { after: 2400 }); } },
    { cap: "Void a vote", say: "Tap Void next to a vote that should not count. It is removed from the tally.", do: async (p, h) => { await h.click("#votecard button:has-text('Void') >> nth=0", { after: 2600 }); } },
    end("Add co-organizers and judges", "Invite people to help run the contest"),
  ],
};
const team = {
  id: "team", file: "run-team", cookie: ck.u_org, start: "/",
  steps: [
    { ...card("Add co-organizers and judges", "Invite people to help run the contest"), say: "Add co-organizers and judges. In this video, you invite people to help run the contest.", pad: 1.2 },
    ...toDash(),
    panel("team", "Team", "Open the Team tab. Co-organizers sign in with their own email, and get the same dashboard as you."),
    { cap: "Add a co-organizer", say: "Type their email address, and tap Add co-organizer. You can add up to eight.", do: async (p, h) => { await h.scrollTo("#newstaff", 260); await h.type("#newstaff", "helper@example.com"); await h.click("#addstaff", { after: 2600 }); }, poster: true },
    { cap: "What they receive", say: "They get an email with one button. Signing in with that address opens the same dashboard. This is an example.", mail: { subject: MAILS.coorg.subject, html: MAILS.coorg.html, to: "helper@example.com", note: "Example email" }, pad: 2.4 },
    panel("judges", "Judges", "Open the Judges tab. Here you invite judges, and see who has finished voting."),
    { cap: "Add a judge", say: "Type a judge's email address, and tap Add judge. They get an invitation with a private link, and you can copy the link too.", do: async (p, h) => { await h.scrollTo("#newjudge", 260); await h.type("#newjudge", "judge4@example.com"); await h.click("button:has-text('Add judge')", { after: 2600 }); } },
    { cap: "What your judge receives", say: "Your judge gets an invitation email with a button that opens their ballot. This is an example.", mail: { subject: MAILS.judge.subject, html: MAILS.judge.html, to: "judge4@example.com", note: "Example email" }, pad: 2.6 },
    end("Announce winners", "Close voting, announce, export results and see the archive"),
  ],
};
const announce = {
  id: "announce", file: "run-announce", cookie: ck.u_org, start: "/",
  steps: [
    { ...card("Announce winners", "Close voting, announce, export results and see the archive"), say: "Announce winners. In this video, you close voting and show everyone who won.", pad: 1.2 },
    ...toDash(),
    panel("results", "Results", "Open the Results tab. It shows who would win if you announced today."),
    { cap: "Download results", say: "Tap Download results to save a spreadsheet of the final tally.", do: async (p, h) => { await h.scrollTo("text=Download results", 300); await h.hover("text=Download results", 1800); } },
    { cap: "Close voting and announce winners", say: "When voting is over, tap Close voting and announce winners. The button asks you to tap again to confirm, because this ends voting and cannot be undone.", do: async (p, h) => { await h.click('[data-act="announce"]', { after: 2800 }); }, poster: true },
    { cap: "Tap again to confirm", say: "Tap it again. This locks the results, shows everyone the winners, and emails every entrant. Tied homes share the win.", do: async (p, h) => { await h.click('[data-act="announce"]', { after: 3200 }); } },
    { cap: "See it as voters do", say: "To see what everyone sees, tap See it as voters do. The winners now keep a crown on the contest page.", do: async (p, h) => { await h.click('a:has-text("See it as voters do")', { after: 2600 }); await h.scrollTo("h2:has-text('Winners')", 140); await h.hover("h2:has-text('Winners')", 1800); } },
    { cap: "Back to the map", say: "To find finished contests later, tap the SoCal Lights logo to go back to the map.", do: async (p, h) => { await h.click("a.brand", { after: 4200 }); } },
    ...navSteps([
      { cap: "Tap the three dots", say: "Tap the three dots at the top.", do: async (p, h) => { await h.click("#morebtn", { after: 1800 }); } },
      { cap: "Tap Contests", say: "Tap Contests.", do: async (p, h) => { await h.click('#moremenu a[href="/contests"]', { after: 2200 }); } },
      { cap: "Tap Past results", say: "Then tap Past results. Finished contests are listed by season and year, and winners keep a badge on their profile.", do: async (p, h) => { await h.click("[data-tab=past]", { after: 3000 }); } },
    ]),
    end("Read your contest activity", "Visits, QR scans, voters and votes per day"),
  ],
};
const activity = {
  id: "activity", file: "run-activity", cookie: ck.u_org, start: "/",
  steps: [
    { ...card("Read your contest activity", "Visits, QR scans, voters and votes per day"), say: "Read your contest activity. In this video, you see how many people found your contest.", pad: 1.2 },
    ...toDash(),
    panel("promote", "Promote", "Open the Promote tab."),
    { cap: "Activity", say: "The Activity card shows page visits, visits from the QR code, and how many people voted.", do: async (p, h) => { await h.scrollTo("text=Page visits", 220); await h.hover("text=From the QR code", 1800); }, poster: true },
    { cap: "Votes per day", say: "Below that, a chart shows votes for each day. Use it to see which sharing worked best.", do: async (p, h) => { await h.scrollTo("text=Votes per day", 160); await h.hover("text=Votes per day", 2000); } },
    end("Create a contest with Quick start", "The short setup: seven screens"),
  ],
};
const all = { quick, custom, share, approve, edit, voting, team, announce, activity };
for (const v of process.argv[2] ? [all[process.argv[2]]] : Object.values(all)) await record(v);
