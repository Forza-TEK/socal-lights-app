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
// The opening screens every contest shares (explained in full in both the Quick start and Customize videos)
const wizardStart = (nameText, total = 7) => [
  ...openSite(), ...fromMap("add", [
    { cap: "Three choices", say: "This is the Add page. It has three choices. An event, like a tree lighting or a holiday parade. A contest, where neighbors enter their homes, and the community votes for a favorite. Or a lighting display, to show off your own house.", do: async (p, h) => { await sleep(1500); await p.evaluate(() => { if (!document.getElementById('o-contest')) location.reload(); }); }, pad: 0.4 },
    { cap: "Tap A contest", say: "We are creating a contest, so tap A contest.", do: async (p, h) => { await h.click('a[href="/add-contest"]', { after: 400 }); await p.waitForURL(/add-contest/, { timeout: 8000 }).catch(() => {}); await p.waitForSelector("#f-name", { timeout: 10000 }); await sleep(1200); }, pad: 0.4 },
  ]),
  { cap: "1 of 7: Name it", say: "First, the name. This is the title everyone sees, on the contest page, on the map, and in the emails your neighbors get. Something simple and local works best, like your street or neighborhood, and the year.", do: async (p, h) => { await h.hover("#f-name", 800); }, pad: 0.3 },
  { cap: "1 of 7: Name it", say: `I will type ${nameText}. Then tap Next.`, do: async (p, h) => { await h.type("#f-name", nameText); }, target: NEXT },
  { cap: "2 of 7: Who runs it", say: "Next, who is running it, and where. Type the name of your group. It can be a city, a school, an H O A, a club, a business, or just your neighbors on one street.", do: async (p, h) => { await h.type("#f-org", "Oak Hill Neighbors"); }, pad: 0.3 },
  { cap: "2 of 7: Where", say: "Then pick the city the homes are in. That is how your contest shows up for the right neighbors. Tap Next.", do: async (p, h) => { await h.move("#f-city"); await p.selectOption("#f-city", "Irvine"); await h.unring(); await sleep(700); }, target: NEXT },
  { cap: "3 of 7: Welcome message", say: "This is the welcome message. Neighbors read it before they decide to enter, so it is your chance to say what the contest is about.", do: async (p, h) => { await h.hover("#f-descr", 1200); }, pad: 0.3 },
  { cap: "3 of 7: Welcome message", say: "We already wrote a friendly one for you. You can keep it as it is, or change a few words so it sounds like you. Tap Next.", do: async (p, h) => { await h.hover("#f-descr", 600); }, target: NEXT },
  { cap: "4 of 7: Website (optional)", say: "A website is optional. If your group has one, add it here, and people can see who is behind the contest.", do: async (p, h) => { await h.hover("#f-site", 1000); }, pad: 0.3 },
  { cap: "4 of 7: Website (optional)", say: "Your contest goes live right away either way, so it is fine to skip this. Tap Next.", do: async (p, h) => { await sleep(300); }, target: NEXT },
  { cap: "5 of 7: Dates", say: "Now the dates. There are three. The last day neighbors can enter.", do: async (p, h) => { await h.hover("#f-closes", 1000); }, pad: 0.3 },
  { cap: "5 of 7: Dates", say: "The day voting starts. And the day voting ends.", do: async (p, h) => { await h.hover("#f-vs", 800); await h.hover("#f-ve", 800); }, pad: 0.3 },
  { cap: "5 of 7: Dates", say: "Entries and voting open and close on these dates by themselves. We filled in typical dates, so you can just tap Next. You can change any of them later, from your dashboard.", do: async (p, h) => { await h.hover(".note", 900); }, target: NEXT },
].map((x) => (x.cap ? { ...x, cap: x.cap.replace(" of 7:", ` of ${total}:`) } : x));
S.quick = { id: "quick", file: "run-quick", cookie: ck.u_org, ...MAPSPEC, maxSeconds: 300, steps: [
  { ...hook(ER, "Create a contest with Quick start", "The short setup, explained", "Let's create a neighborhood decorating contest. With Quick start, you will have a live contest, with its own link and QR code, in a few minutes. I will explain what every screen is for as we go, so you always know what you are choosing. We will start on the map."), pre: async (p) => { await p.route('**/api/auth/me', async (r) => { const res = await r.fetch(); const j = await res.json().catch(() => ({})); j.methods = { ...(j.methods || {}), google: true, email: true }; await r.fulfill({ response: res, json: j }); }); } },
  ...wizardStart("Oak Hill Holiday Lights 2026"),
  { cap: "6 of 7: How to set it up", say: "This is the big choice, how the rules are set up. Quick start is the recommended one, and it is what we are using.", do: async (p, h) => { await h.hover('[data-tile="quick|yes"]', 1100); }, pad: 0.3 },
  { cap: "6 of 7: Quick start", say: "It turns on public voting, where anyone with an account gets one vote in each category. It gives you four voting categories: Best Overall, Most Creative, Best Lights and Music, and Best Traditional.", do: async (p, h) => { await h.hover('[data-tile="quick|yes"]', 600); }, pad: 0.3 },
  { cap: "6 of 7: Quick start", say: "It lets you approve every entry before it reaches the map. And it writes your official rules for you. Everything can still be changed later.", do: async (p, h) => { await h.hover('[data-tile="quick|yes"]', 600); }, pad: 0.3 },
  { cap: "6 of 7: Customize", say: "If you would rather choose judges, prizes, or your own categories, pick Customize everything. We cover that in the next video.", do: async (p, h) => { await h.hover('[data-tile="quick|no"]', 1100); }, pad: 0.3 },
  { cap: "6 of 7: Quick start", say: "For now, choose Quick start, then tap Next.", target: '[data-tile="quick|yes"]', after: 1000, post: (p, h) => next(p, h) },
  { cap: "7 of 7: Review", say: "The last screen is the review. It lists everything you chose: the name, who runs it, the dates, the categories, and who can vote.", do: async (p, h) => { await h.hover(".sum", 1500); }, pad: 0.3 },
  { cap: "7 of 7: Review", say: "If something is not right, tap Edit next to it. Nothing is public until you tap Create contest. When you are happy, tap Create contest.", do: async (p, h) => { await h.scroll(160); }, target: NEXT, after: 2600, poster: true },
  { cap: "Your contest is live", say: "That is it. Your contest is live. This page explains what happens next. You share your link or your QR code. Neighbors enter their homes. You look over each entry before it goes on the map. Then the community votes, on the dates you set, and you announce the winners. Tap Open my dashboard.", target: "text=Open my dashboard", after: 2000 },
  { cap: "Your dashboard", say: "This is your dashboard. It is where you run the contest. Up here are the numbers that matter: your entries, the ones waiting for you, and the votes.", do: async (p, h) => { await h.hover(".stats", 1200); }, pad: 0.3 },
  { cap: "Share it", say: "And here is your link, and your QR code, ready to paste into a message, or print for a flyer. We will cover sharing in a moment.", do: async (p, h) => { await h.scrollTo("text=Share it", 100); await h.hover(".poster", 1200); }, pad: 0.8 },
  nextUp(ER, "Create a contest with Customize", "Judges, prizes, categories, vote counts and your own rules"),
]};
S.custom = { id: "custom", file: "run-custom", cookie: ck.u_org, ...MAPSPEC, maxSeconds: 420, steps: [
  hook(ER, "Create a contest with Customize", "Judges, prizes, categories and rules", "In this video, you will set up a contest exactly your way: your own voting categories, invited judges, a prize, and your own rules. I will explain every choice as we go, so you know what each one does. We will start on the map."),
  ...wizardStart("Pine Ridge Holiday Lights 2026", 16),
  { cap: "6 of 16: How to set it up", say: "Here is the big choice. Quick start sets everything up for you. Customize everything lets you decide each rule yourself. We want to decide, so choose Customize everything, then tap Next.", do: async (p, h) => { await h.hover('[data-tile="quick|yes"]', 800); }, target: '[data-tile="quick|no"]', after: 1000, post: (p, h) => next(p, h) },
  { cap: "7 of 16: Categories", say: "Now the voting categories. Every home competes in every category, and each voter picks one favorite home in each. So the categories are the awards you will give out.", do: async (p, h) => { await h.hover(".tiles", 1200); }, pad: 0.3 },
  { cap: "7 of 16: Categories", say: "These four are suggested. Tap one to turn it off. Best Overall is a category like any other, so you can keep it, or drop it. You need at least one.", do: async (p, h) => { await h.hover('[data-tile], .tile', 1000); }, pad: 0.3 },
  { cap: "7 of 16: Your own category", say: "You can add your own. Type a name, like Best Inflatable, and tap Add. Funny, local categories are a big part of the fun. Then tap Next.", do: async (p, h) => { await h.type("#f-newcat", "Best Inflatable"); await h.click('[data-a="addcat"]', { after: 1400 }); }, target: NEXT, poster: true, after: 1200 },
  { cap: "8 of 16: Who can vote", say: "Next, who gets to vote. There are three choices. Everyone means anyone with an account, one vote per category. That award is called People's Choice.", do: async (p, h) => { await h.hover('[data-tile="mode|public"]', 1000); }, pad: 0.3 },
  { cap: "8 of 16: Who can vote", say: "Judges only means just the people you invite can vote. That award is called Judges' Choice.", do: async (p, h) => { await h.hover('[data-tile="mode|judges"]', 900); }, pad: 0.3 },
  { cap: "8 of 16: Who can vote", say: "And Everyone and judges does both. The public and your judges vote separately, so every category has two winners, one chosen by the neighborhood and one by the judges. Judges do not vote in the public vote. We will choose that one, then tap Next.", target: '[data-tile="mode|both"]', after: 900, post: (p, h) => next(p, h) },
  { cap: "9 of 16: Invite your judges", say: "Now your judges. Type one email address on each line. Each judge gets an invitation with a private link, and signs in with that same email. Choose people your neighbors will trust, like a city staff member, a teacher, or a local lighting company.", do: async (p, h) => { await h.hover("#f-judges", 1400); }, pad: 0.3 },
  { cap: "9 of 16: Invite your judges", say: "I will add two. You can add or remove judges later from your dashboard, so nothing is final. Tap Next.", do: async (p, h) => { await h.type("#f-judges", "judge1@example.com\njudge2@example.com"); }, target: NEXT, after: 1200 },
  { cap: "10 of 16: How judges vote", say: "How do judges vote? Pick a favorite is simple and quick. Each judge chooses one home in each category, the same way the public does.", do: async (p, h) => { await h.hover('[data-tile="method|pick"]', 1100); }, pad: 0.3 },
  { cap: "10 of 16: How judges vote", say: "Score every home is for formal judging. Each judge gives every home a score from one to ten, in every category, and the highest average wins. With five or more judges, the highest and lowest score for each home are dropped, so one unusual judge cannot decide the result. We will choose score, then tap Next.", target: '[data-tile="method|score"]', after: 900, post: (p, h) => next(p, h) },
  { cap: "11 of 16: Approving entries", say: "How should new entries be approved? I review each entry first is the recommended choice. Nothing appears on the map until you approve it, so you can screen out photos that do not belong.", do: async (p, h) => { await h.hover('[data-tile="approval|manual"]', 1500); }, pad: 0.3 },
  { cap: "11 of 16: Approving entries", say: "Publish entries right away is faster, but you cannot screen photos first. We will keep the recommended choice. Tap Next.", do: async (p, h) => { await h.hover('[data-tile="approval|auto"]', 1100); }, target: NEXT, after: 1200 },
  { cap: "12 of 16: Vote counts", say: "Should people see the vote counts while voting is open? Hiding them until you announce winners is recommended. It stops bandwagon voting, where people just vote for whoever is ahead.", do: async (p, h) => { await h.hover('[data-tile="counts|no"]', 1500); }, pad: 0.3 },
  { cap: "12 of 16: Vote counts", say: "Showing running totals builds excitement, but everyone can see who is ahead. You always see the counts yourself on your dashboard. Keep the recommended choice and tap Next.", do: async (p, h) => { await h.hover('[data-tile="counts|yes"]', 1100); }, target: NEXT, after: 1200 },
  { cap: "13 of 16: Fairness rules", say: "A few fairness rules. The first is whether one home can win more than one category. By default it can, because the best home in each category simply wins.", do: async (p, h) => { await h.hover('[data-tile="oneWin|no"]', 1400); }, pad: 0.3 },
  { cap: "13 of 16: Fairness rules", say: "One win per home spreads the awards around, so a home that wins one category cannot win a later one. Below, you can see what is already protected for you: one vote per person per category, tied to a verified email, nobody can vote for their own home, and ties are shared. Keep the default and tap Next.", do: async (p, h) => { await h.hover('[data-tile="oneWin|yes"]', 1000); await h.hover(".hint", 1400); }, target: NEXT, after: 1200 },
  { cap: "14 of 16: Prize", say: "Is there a prize? This is optional. A prize is shown on your contest page, and with the winners when you announce them. No prize still gives winners a crown and recognition.", do: async (p, h) => { await h.hover('[data-tile="prizeMode|none"]', 1200); }, pad: 0.3 },
  { cap: "14 of 16: Prize", say: "You can give the same prize to every winner, or a different prize for each award. We will choose one prize for all winners.", target: '[data-tile="prizeMode|one"]', after: 900 },
  { cap: "14 of 16: Prize", say: "Describe it, for example, a fifty dollar gift card. If a local business is providing it, you can name them here too. Then tap Next.", do: async (p, h) => { await h.type("#f-prize", "A 50 dollar gift card"); }, target: NEXT, after: 1200 },
  { cap: "15 of 16: Official rules", say: "These are your official rules. We drafted them for you, and people have to accept them before they enter. They cover who can enter, how winners are chosen, and what the prize terms are.", do: async (p, h) => { await h.hover("#f-rules", 1800); }, pad: 0.3 },
  { cap: "15 of 16: Official rules", say: "You can edit anything. If you offer a prize, it is a good idea to have a lawyer read them. Tap Next.", do: async (p, h) => { await h.scroll(200, 900); }, target: NEXT, after: 1200 },
  { cap: "16 of 16: Review", say: "Last is the review. Everything you chose is listed here, and each line has an Edit link if you want to change it. Nothing is public until you tap Create contest.", do: async (p, h) => { await h.hover(".sum", 1500); }, pad: 0.3 },
  { cap: "16 of 16: Create contest", say: "When you are happy with it, tap Create contest.", do: async (p, h) => { await h.scroll(260, 1000); }, target: NEXT, after: 2600, poster: true },
  { cap: "Your contest is live", say: "Your contest is live. This page explains what happens next. Share your link, neighbors enter, you approve the entries, the community and your judges vote, and you announce the winners. Tap Open my dashboard.", target: "text=Open my dashboard", after: 2000 },
  { cap: "Your dashboard", say: "This is your dashboard, where you run the contest, with your link and QR code ready to share. Sharing is the next video.", do: async (p, h) => { await h.hover(".stats", 1200); }, pad: 0.8 },
  nextUp(ER, "Share your contest", "Link, QR code, entry poster and yard sign"),
]};
const preview = async (p, h, sel, ms) => { // the real print layout, drawn as a sample page (the print dialog itself cannot be recorded)
  await h.hover(sel, 900);
  const q = await h.ctx.newPage(); await q.setViewportSize({ width: 816, height: 1056 });
  await q.goto(p.url(), { waitUntil: "networkidle" }); await sleep(900);
  await q.evaluate(() => { window.print = () => {}; const o = window.addEventListener.bind(window); window.addEventListener = (t, ...a) => (t === "afterprint" ? 0 : o(t, ...a)); });
  await q.click(sel); await q.emulateMedia({ media: "print" }); await sleep(500);
  const src = "data:image/png;base64," + (await q.screenshot({ type: "png" })).toString("base64"); await q.close();
  await h.showSheet(src); await sleep(ms); await h.showSheet(null); await sleep(500);
};
S.share = { id: "share", file: "run-share", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Share your contest", "Link, QR code, poster, yard sign", "In this video, you will learn every way to share your contest: the link, the QR code, a printable entry poster and yard sign, and an email invitation to your neighbors. The more people who know about it, the better the contest. We start on the map."),
  ...toDash(),
  { cap: "Share it", say: "This is the Overview, the first page of your dashboard. Scroll down to the card called Share it. Everything you need to get the word out is in this one card.", do: async (p, h) => { await h.scrollTo("text=Share it", 100); } },
  target("Tap Copy link", "At the top is your contest link. Tap Copy link, and it is copied for you. Paste it into an email, a text message, a neighborhood group, or a Facebook post. Anyone who opens it lands on your contest page, where they can see the homes, enter their own, and vote.", "[data-copy]", { after: 1200, poster: true }),
  { cap: "The QR code", say: "Below the link is your QR code. When someone points their phone camera at it, it opens your contest page. That makes it perfect for anything printed, like flyers, signs, and the bulletin board at your local coffee shop.", do: async (p, h) => { await h.hover(".poster", 1200); } },
  { cap: "Entry poster", say: "Tap Print entry poster for a page made for a bulletin board or a shop window. Here is a sample. It shows your contest name, a big QR code, and the words, scan to enter your home. Its job is to get neighbors to enter.", do: async (p, h) => { await preview(p, h, "#printposter", 3200); } },
  { cap: "Yard sign", say: "Print yard sign makes a big sign for a lawn. Here is a sample. It says vote in huge letters, so people can read it from the street, with a QR code that opens the voting page. Put these out when voting opens, and your neighbors can vote while they are standing in front of the lights.", do: async (p, h) => { await preview(p, h, "#printsign", 3200); } },
  target("Tap Promote", "You can also invite neighbors by email, right from the dashboard. Want to know whether your sharing is working? Tap Promote.", nav("promote"), { after: 1200 }),
  target("Invite neighbors by email", "Open Invite neighbors by email. Type one address on each line, and add a short personal note. A note from a real neighbor gets many more people to open the invitation than a plain message does.", "#invitecard summary", { after: 1000 }),
  emailScene(mails.neighbor, "This is what each neighbor receives. It has your contest name, your note, and one clear button that takes them straight to the contest. They do not need to hunt for anything.", "neighbor@example.com"),
  nextUp(ER, "Approve and decline entries", "Approve, decline with a reason, and undo a decline"),
]};
S.approve = { id: "approve", file: "run-approve", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Approve and decline entries", "Review each home", "In this video, you will review the homes your neighbors enter. You will approve the good ones, decline the ones that do not fit, and learn how to undo a mistake. We start on the map."),
  ...toDash(),
  target("Tap Entries", "Now tap Entries. This is where you review every home that neighbors enter. Nothing goes on the map until you approve it, which protects your contest from photos that do not belong.", nav("entries"), { after: 1500 }),
  target("Tap Approve", "Each entry shows the photos, the address, and who sent it. If it looks right, tap Approve. The home joins the contest, appears on the map, and shows up on every voter's ballot. The neighbor is emailed to say they are in.", '[data-entry="approve:p_pend1"]', { after: 1800, poster: true }),
  target("Tap Decline", "If an entry does not belong, for example, the photo is not a home, or it is a duplicate, tap Decline.", '[data-entry="decline:p_pend2"]', { after: 1200 }),
  { cap: "Give a reason", say: "A small window asks why. The reason is optional, but a kind note helps the neighbor fix the problem and try again. It is emailed to them. Then tap Decline entry.", do: async (p, h) => { await h.type("#rsn", "The photo is too dark to see the lights."); }, target: "#rs-go", after: 1800 },
  target("Tap Restore", "Changed your mind? A declined entry is not gone. Tap Restore and it goes back to waiting for your review, so you can approve it.", '[data-entry="restore:p_pend2"]', { after: 1800 }),
  nextUp(ER, "Edit your contest and change the dates", "Change the details any time before winners are announced"),
]};
S.edit = { id: "edit", file: "run-edit", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Edit your contest", "Change the dates and details", "In this video, you will change your contest after you have created it: the dates, the name, the message, the prize, and the rules. Plans change, and the site is built for that. We start on the map."),
  ...toDash(),
  target("Tap Change dates", "Plans change, and you can change your contest at any time before you announce winners. On the Overview, find Schedule, which shows when entries close and when voting runs. Tap Change dates.", "#editdates", { after: 1800 }),
  { cap: "Change the dates", say: "Here you can move the day entries close, the day voting starts, and the day voting ends. Voting should start after entries close, and end after it starts. If you need more time for neighbors to enter, move these dates later.", do: async (p, h) => { await h.scrollTo("#e-closes", 220); await h.type("#e-closes", "2026-12-12", { fill: true }); await h.type("#e-vs", "2026-12-13", { fill: true }); await h.type("#e-ve", "2026-12-22", { fill: true }); }, poster: true },
  { cap: "Name, message, prize, rules", say: "Scroll down and you can also change the contest name, the welcome message, the prize, and the official rules. Neighbors see the changes right away.", do: async (p, h) => { await h.scrollTo("#e-name", 120); await h.hover("#e-descr", 800); } },
  target("Tap Save changes", "When you are done, tap Save changes. Everyone on your team is emailed about the change, so nobody is surprised, and you have a record of what changed.", '#editform button[type="submit"]', { after: 2000 }),
  nextUp(ER, "Run voting", "Start now, pause, review votes and void a vote"),
]};
S.voting = { id: "voting", file: "run-voting", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Run voting", "Pause, review, and void a vote", "In this video, you will learn how to run voting once it has started. You will pause and resume it, check the results, and remove a vote that should not count. We start on the map."),
  ...toDash(),
  { cap: "Controls", say: "This card is where you control the contest while it is running. Voting opens and closes on your dates by itself. The Controls card lets you step in when you need to.", do: async (p, h) => { await h.scrollTo("text=Controls", 100); } },
  target("Tap Pause voting", "Say you spot something odd, or you need to fix a mistake. Tap Pause voting, and votes stop right away, until you say otherwise.", '[data-act="pause_voting"]', { after: 1500, poster: true }),
  target("Tap Resume voting", "When you are ready, tap Resume voting, and voting carries on.", '[data-act="resume_voting"]', { after: 1500 }),
  target("Tap Results", "Now tap Results. Here is the full tally, category by category. You can always see the counts, even when you have hidden them from the public so people are not swayed by who is ahead.", nav("results"), { after: 1500 }),
  target("Review individual votes", "Open Review individual votes. Every single vote is listed, with when it was cast. The system flags odd patterns, like a burst of votes within a few seconds, so you can look more closely.", "#votecard summary", { after: 1500, pre: async (p, h) => { await h.scrollTo("#votecard summary", 140); } }),
  target("Tap Void", "If a vote should not count, tap Void next to it. It is removed from the tally, and you can restore it later if you change your mind. This keeps the contest fair.", "#votecard button:has-text('Void') >> nth=0", { after: 1800 }),
  nextUp(ER, "Add co-organizers and judges", "Invite people to help run the contest"),
]};
S.team = { id: "team", file: "run-team", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Add co-organizers and judges", "Invite people to help", "In this video, you will bring in help. You will add co-organizers, who share the work of running the contest, and judges, who score the homes. We start on the map."),
  ...toDash(),
  target("Tap Team", "Running a contest is easier with help. Tap Team. Co-organizers get the same dashboard you have, so they can approve entries, answer questions, and keep things moving.", nav("team"), { after: 1400 }),
  { cap: "Add a co-organizer", say: "Type their email address, and tap Add co-organizer.", do: async (p, h) => { await h.scrollTo("#newstaff", 260); await h.type("#newstaff", "helper@example.com"); }, target: "#addstaff", after: 1800, poster: true },
  emailScene(mails.coorg, "They get an email like this one, with one button that opens the dashboard. They sign in with that email address, and they are in.", "helper@example.com"),
  target("Tap Judges", "Judges are different from co-organizers. They score the homes, but they do not manage the contest. They are added on the Judges tab, so tap Judges.", nav("judges"), { after: 1400 }),
  { cap: "Add a judge", say: "Type a judge's email address, and tap Add judge. You can see who has signed in, and how many homes each judge has scored, so you know the judging is on track.", do: async (p, h) => { await h.scrollTo("#newjudge", 260); await h.type("#newjudge", "judge4@example.com"); }, target: "button:has-text('Add judge')", after: 1800 },
  emailScene(mails.judge, "Your judge gets an invitation like this one. It says which contest it is, how judging works, and has a button that opens their private ballot. Nothing else to set up.", "judge4@example.com"),
  nextUp(ER, "Announce winners", "Close voting, announce, export results and see the archive"),
]};
S.announce = { id: "announce", file: "run-announce", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Announce the winners", "Close voting and show the results", "In this video, you will finish your contest. You will check the results, close voting, and announce the winners, and see what everyone else sees. We start on the map."),
  ...toDash(),
  target("Tap Results", "When voting is over, it is time to announce the winners. Tap Results. This shows who would win if you announced today, in every category, so there are no surprises.", nav("results"), { after: 1500 }),
  target("Tap Download results", "Tap Download results to save everything to a spreadsheet. It is a good idea to keep a copy for your records.", "text=Download results", { after: 800, pre: async (p, h) => { await h.scrollTo("text=Download results", 300); } }),
  target("Close voting and announce winners", "When you are ready, tap Close voting and announce winners.", '[data-act="announce"]', { after: 1400, poster: true }),
  target("Tap again to confirm", "It asks you to tap again, because this cannot be undone. Once you confirm, the results are saved and locked, and everyone who entered is emailed. Winners get a congratulations message.", '[data-act="announce"]', { after: 2400 }),
  target("See it as voters do", "To see what everyone else sees, tap See it as voters do.", 'a:has-text("See it as voters do")', { after: 1800 }),
  { cap: "The winners", say: "Here are the winners, with their awards. Winning homes keep a crown on the map and in their owners' profiles, so the recognition lasts all year.", do: async (p, h) => { await h.scrollTo("h2:has-text('Winners')", 140).catch(() => {}); await h.hover("h2:has-text('Winners')", 1200).catch(() => {}); await sleep(800); }, pad: 0.6 },
  nextUp(ER, "Read your contest activity", "Visits, QR scans, voters and votes per day"),
]};
S.activity = { id: "activity", file: "run-activity", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Read your contest activity", "Visits, QR scans, and votes", "In this video, you will see how many people found your contest: page visits, visits from your QR code, and votes, day by day. That tells you which kind of sharing works. We start on the map."),
  ...toDash(),
  target("Tap Promote", "Want to know whether your sharing is working? Tap Promote.", nav("promote"), { after: 1400 }),
  { cap: "Activity", say: "Activity shows three numbers: how many people have visited your contest page, how many arrived by scanning your QR code, and how many people have voted.", do: async (p, h) => { await h.scrollTo("text=Page visits", 220); await h.hover("text=From the QR code", 900); }, poster: true },
  { cap: "Votes per day", say: "Below, a chart shows the votes for each day. Use it to see which sharing worked best. If votes jump the day after a flyer went up, or after an email, do more of that.", do: async (p, h) => { await h.scrollTo("text=Votes per day", 160); await h.hover("text=Votes per day", 1200); } },
  nextUp(ER, "Add sponsors and logos", "Show sponsors by tier on the contest page"),
]};

// ---------------- Sponsors and installers ----------------
S.sponsors = { id: "sponsors", file: "sponsors-add", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ES, "Add sponsors and logos", "Thank the businesses that help", "In this video, you will add a local business as a sponsor of your contest, with its logo and website, so it gets thanked on your contest page. We start on the map."),
  ...toDash(),
  target("Tap Sponsors", "A sponsor is a local business that supports your contest. Their name and logo show on your contest page. Tap Sponsors.", nav("sponsors"), { after: 1400 }),
  { cap: "Name and tier", say: "Type the sponsor's name, and choose a tier. Sponsors are listed by tier, so the top tier shows first.", do: async (p, h) => { await h.type("#sp-name", "Oak Hill Hardware"); await h.move("#sp-tier"); await p.selectOption("#sp-tier", "gold"); await h.unring(); await sleep(600); } },
  { cap: "Website and logo", say: "Add their website, so people can click through. Then choose their logo. Use a clear picture, a J P G, P N G, or WebP file under six hundred kilobytes.", do: async (p, h) => { await h.type("#sp-url", "https://oakhillhardware.example.com"); p.once("filechooser", (fc) => fc.setFiles(process.env.LOGO)); }, target: "#sp-logo", after: 1800 },
  target("Tap Add sponsor", "Tap Add sponsor. Sponsors can support your contest directly, and any payment goes to you. One rule is important: payment never affects who wins.", '#spform button[type="submit"]', { after: 2000, poster: true }),
  target("See it as voters do", "To check how it looks, tap See it as voters do, and you will see the sponsors on the contest page, just as your neighbors do.", 'a:has-text("See it as voters do")', { after: 2200 }),
  nextUp(ES, "Presenting installer and quote requests", "How the Get a quote button works"),
]};
S.installer = { id: "installer", file: "sponsors-installer", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ES, "Add a presenting installer", "The Get a quote button", "In this video, you will add a lighting company as the presenting installer of your contest, and see how neighbors can ask them for a quote with one tap. We start on the map."),
  ...toDash(),
  target("Tap Details", "A lighting company can sponsor your contest as its presenting installer, and neighbors can ask them for a quote. This is set up on the Details tab, so tap Details, and scroll down to Presenting installer.", nav("details"), { after: 1400 }),
  { cap: "Presenting installer", say: "Type the company's name. Then the email address where quote requests should go. That is the address the company checks for new customers. And add their website.", do: async (p, h) => { await h.scrollTo("#e-iname", 220); await h.type("#e-iname", "Bright Nights Lighting"); await h.type("#e-iemail", "quotes@brightnights.example.com"); await h.type("#e-iurl", "brightnights.example.com"); } },
  target("Tap Save changes", "Tap Save changes. This adds a Get a quote button to your contest page, so families who love the lights can ask the company for the same thing at their own house.", '#editform button[type="submit"]', { after: 2000, poster: true }),
  { cap: "A neighbor visits", say: "Now let's see it from a neighbor's side. They open the contest page, and tap Get a quote.", do: async (p, h) => { await h.ctx.clearCookies(); await h.ctx.addCookies([{ name: "scl_session", value: ck.u_voter, url: BASE }]); await p.goto(BASE + "/c/" + SLUG, { waitUntil: "networkidle" }); await h.scrollTo("#quotebtn", 300); }, target: "#quotebtn", after: 1400 },
  { cap: "Share my details", say: "They add their name, a phone number if they like, and describe what they would like done. They must tick the box that says they agree to share their details with the company. Without that tick, nothing is sent. Then they tap Send request, and the company receives it. Their details go only to that company.", do: async (p, h) => { await h.type("#q-name", "Sam Rivera"); await h.type("#q-note", "Roofline lights, please."); await h.click("#q-ok", { after: 700 }); }, target: '#quoteform button[type="submit"]', after: 2000 },
  nextUp(ES, "Installer profiles and Installed by", "How a company gets a profile, how a home links to it, and how to confirm or claim yours"),
]};
S["installer-profile"] = { id: "installer-profile", file: "sponsors-profile", cookie: ck.u_inst, ...MAPSPEC, steps: [
  hook(ES, "Installer profiles", "Installed by, and how to claim yours", "In this video, you will see how a lighting company gets a profile on SoCal Lights, how homes link to it with Installed by, and how a company claims and manages its own profile. We start on the map."),
  ...openShort(),
  target("Tap the season button", "Tap the season button.", "#seasonbtn", { after: 800 }),
  target("Tap Thanksgiving and Christmas Lights", "Tap Thanksgiving and Christmas Lights.", '[data-sp]:has-text("Christmas")', { after: 1400 }),
  { cap: "Search a home", say: "Let's look at how a lighting company gets a profile. A homeowner can say which company installed their lights. Search for a home that does. Type its name, and open it.", do: async (p, h) => { await h.type("#q", "Garcia Family"); }, target: "#pbody .item >> nth=0", after: 2200 },
  { cap: "Installed by", say: "It says Installed by, with the company's name. If there is a check mark next to the name, the company has confirmed that it did the job. Without one, the homeowner says it did, but the company has not confirmed it yet.", do: async (p, h) => { await h.hover(".instby", 1200); } },
  target("Tap the company name", "Tap the company's name to open its profile page.", "a.instlink >> nth=0", { after: 2400, poster: true }),
  { cap: "Manage your profile", say: "If this is your company, claim the profile with your company email. That proves it is yours. Then you manage it here, with your company details and logo. Homes that name your company are listed on the Homes tab.", do: async (p, h) => { await p.goto(BASE + "/installer/bright-nights-lighting/manage#homes", { waitUntil: "networkidle" }); await sleep(1200); await h.hover("[data-claim^='confirm']", 900); } },
  target("Tap Confirm", "Tap Confirm for each home you really installed. It gets a check mark, which tells visitors it is true. If it is not yours, tap Not ours, and the name is removed from that home.", "[data-claim^='confirm']", { after: 2000 }),
  nextUp(ES, "Add an event to the map", "Share a tree lighting, market, parade or haunted house"),
]};

// ---------------- Post events and homes ----------------
const NOCFG = [{ url: "**/api/config", json: {} }];
S["add-event"] = { id: "add-event", file: "post-event", cookie: ck.u_enter, routes: NOCFG, ...MAPSPEC, steps: [
  hook(EP, "Add an event to the map", "A tree lighting, market or parade", "In this video, you will add an event to the map, like a tree lighting, a market, a parade, or a haunted house, so families across Southern California can find it. We start on the map."),
  ...openShort(),
  ...fromMap("add", [target("Tap An event", "Now tap An event. Events are for things the whole community can attend, like a tree lighting, a holiday parade, a market, or a haunted house.", 'a[href="/add-event"]', { after: 1800 })]),
  { cap: "1 of 6: Web page", say: "The first question is whether your event has a web page. If it does, paste the address here. When the page mentions your event's name and date, your event is marked Confirmed on the map, which people trust more. If you do not have one, tap No, Next, and the event still goes on the map.", target: '[data-a="skipurl"]', after: 1400 },
  { cap: "2 of 6: Name and type", say: "Type the event's name, the way people know it. Then choose the season it belongs to, and the type of event. That is how visitors find it when they filter the map.", do: async (p, h) => { await h.type("#f-name", "Oak Hill Neighborhood Tree Lighting"); await h.move("#f-season"); await p.selectOption("#f-season", "christmas"); await h.unring(); await sleep(500); const o = await p.$$eval("#f-type option", (os) => os.map((x) => [x.value, x.textContent])); await h.move("#f-type"); await p.selectOption("#f-type", (o.find(([v, t]) => v && /tree/i.test(t)) || o.find(([v]) => v))[0]); await h.unring(); await sleep(500); }, target: NEXT, after: 1400 },
  { cap: "3 of 6: When", say: "Pick the first and last day. For a one-day event, pick the same day twice. Then tap Next.", do: async (p, h) => { await p.fill("#f-start", "2026-12-05"); await p.fill("#f-end", "2026-12-05"); await h.type("#f-hours", "5 to 9 pm"); }, target: NEXT, after: 1400 },
  { cap: "4 of 6: Free or paid", say: "Is it free to attend, or paid? Families plan around this, so say it clearly. Tap Free, then Next.", target: '[data-tile="free|yes"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "5 of 6: Where", say: "Now where. Type the name of the place, the city, and the street address. The street address puts a pin in the right spot on the map, so families can get directions.", do: async (p, h) => { await h.type("#f-venue", "Oak Hill Community Park"); await h.move("#f-city"); await p.selectOption("#f-city", "Irvine"); await h.unring(); await h.type("#f-street", "100 Oak Hill Way"); }, target: NEXT, after: 1400 },
  { cap: "6 of 6: Describe it", say: "Describe it in a sentence or two. What will families see and do? That is the text people read before they decide to come.", do: async (p, h) => { await h.type("#f-blurb", "Join the neighborhood for cocoa, carols and the lighting of the tree. Free and open to everyone."); }, target: NEXT, after: 1400 },
  { cap: "Add my event", say: "Last, check everything. You can change any line with its Edit link. Nothing is public until you tap Add my event. Your event then goes on the map.", target: NEXT, after: 2400, poster: true },
  nextUp(EP, "Show off your house", "Put your lights on the map with Showcase a House"),
]};
S.showcase = { id: "showcase", file: "post-house", cookie: ck.u_enter, routes: NOCFG, ...MAPSPEC, steps: [
  hook(EP, "Show off your house", "Put your lights on the map", "In this video, you will put your own house on the map, so families can find your lights and drive by. You will add the address, a description, and photos. We start on the map."),
  ...openShort(),
  ...fromMap("add", [target("Tap A lighting display", "Now tap A lighting display. This is for showing off your own house, or a house you decorated for a customer, so families can drive by and see it.", 'a[href="/add-house"]', { after: 1800 })]),
  { cap: "Who is posting", say: "Who is posting? A homeowner is for your own house. A professional installer is for a house your company did. We are a homeowner, so tap A homeowner, then Next.", target: '[data-tile="kind|homeowner"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "Name to show", say: "Type the name to show. This is the name people see on the map, for example, the Garcia family. It does not have to be your full name.", do: async (p, h) => { await h.type("#f-biz", "The Kim family"); }, target: NEXT, after: 1400 },
  { cap: "Did a company install it?", say: "Did a company install your lights? If one did, you can name them, and your display links to their profile. We did it ourselves, so tap No, then Next.", target: '[data-tile="hadPro|no"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "Season", say: "Which season is this display for? Visitors pick a season on the map, so choose the one your lights belong to. Tap Christmas, then Next.", target: '[data-tile="season|christmas"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "About the display", say: "Give the display a name, and tell us what makes it special. Is it the music, the animation, the number of lights? Families read this to decide whether it is worth the drive.", do: async (p, h) => { await h.type("#f-title", "Kim Family Christmas Lights"); await h.type("#f-desc", "Twelve thousand lights on the roof and trees, with a walkway of candy canes."); }, target: NEXT, after: 1400 },
  { cap: "Address", say: "Add the address. This is where the pin goes, and visitors see it so they can drive by, so only add an address you want people to visit.", do: async (p, h) => { await h.move("#f-city"); await p.selectOption("#f-city", "Irvine"); await h.unring(); await h.type("#f-street", "460 Maple Street"); await h.type("#f-zip", "92602"); }, target: NEXT, after: 1400 },
  { cap: "Plan a visit", say: "Tell families when the lights are on, and how to enjoy them, like drive by, walk by, or where to park. Good directions make for happier visitors, and happier neighbors.", do: async (p, h) => { await h.type("#f-lightsOn", "5 to 10 pm nightly"); await h.click('[data-tile="visit|both"]', { after: 800 }); }, target: NEXT, after: 1400 },
  { cap: "Photos", say: "Add photos. Take them at night, with the lights on. The first photo is the cover people see on the map.", pre: async (p) => p.once("filechooser", (fc) => fc.setFiles(["public/img/stock/tree-3.jpg", "public/img/stock/walk-2.jpg"])), target: "label[for=f-photos]", after: 2200, post: (p, h) => next(p, h) },
  { cap: "Put it on the map", say: "Finally, check everything, and tap Put it on the map. Your house is now part of the map, for any family in Southern California to find.", target: NEXT, after: 2400, poster: true },
  nextUp(EP, "Find lights near you", "Use the map, filters, seasons and All seasons to find what is on near you"),
]};

const id = process.argv[2];
if (id) { if (!S[id]) throw new Error("no video " + id); await record(S[id]); }
