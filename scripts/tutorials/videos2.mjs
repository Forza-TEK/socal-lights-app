// Run a contest (9), Sponsors and installers (3), Post events and homes (2); also the runner: node scripts/tutorials/videos2.mjs <id>
import { S, ck, SLUG, BASE, hook, recap, nextUp, target, fromMap, toDash, panel, next, nav, mails, MAPSPEC } from "./videos.mjs";
import { record, sleep } from "./record.mjs";
import { openSite, openShort, navSteps, emailScene } from "./steps.mjs";
import { fakeGeocode } from "./mockgeo.mjs";
// On a phone the dashboard's "See it as voters do" link lives in the More sheet (bottom bar), so the step opens More first; on a computer it is in the side menu
const MOREHINT = process.env.MOBILE === "1" ? "open More, then " : "";
const openMore = async (p, h) => { if (await p.locator("#sh-more").isVisible().catch(() => false)) await h.click("#sh-more", { after: 1200 }); };
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
const authPre = async (p) => { await p.route('**/api/auth/me', async (r) => { const res = await r.fetch(); const j = await res.json().catch(() => ({})); j.methods = { ...(j.methods || {}), google: true, email: true }; await r.fulfill({ response: res, json: j }); }); };
const wizardStart = (nameText, total = 7, opening = openSite()) => [
  ...opening, ...fromMap("add", [
    { cap: "Three choices", say: "This is the Add page. It has three choices. An event, like a tree lighting or a holiday parade. A contest, where neighbors enter their homes, and the community votes for a favorite. Or a lighting display, to show off your own home.", do: async (p, h) => { await sleep(1500); await p.evaluate(() => { if (!document.getElementById('o-contest')) location.reload(); }); }, pad: 0.4 },
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
  { ...hook(ER, "Create a contest with Quick start", "The short setup, explained", "Let's create a neighborhood decorating contest. With Quick start, you will have a live contest, with its own link and QR code, in a few minutes. I will explain what every screen is for as we go, so you always know what you are choosing. We will start on the map."), pre: authPre },
  ...wizardStart("Oak Hill Holiday Lights 2026"),
  { cap: "6 of 7: How to set it up", say: "This is the big choice, how the rules are set up. Quick start is the recommended one, and it is what we are using.", do: async (p, h) => { await h.hover('[data-tile="quick|yes"]', 1100); }, pad: 0.3 },
  { cap: "6 of 7: Quick start", say: "It turns on public voting, where anyone with an account gets one vote in each category. It gives you four voting categories: Best Overall, Most Creative, Best Lights and Music, and Best Traditional.", do: async (p, h) => { await h.hover('[data-tile="quick|yes"]', 600); }, pad: 0.3 },
  { cap: "6 of 7: Quick start", say: "It lets you approve every entry before it reaches the map. And it writes your official rules for you. Everything can still be changed later.", do: async (p, h) => { await h.hover('[data-tile="quick|yes"]', 600); }, pad: 0.3 },
  { cap: "6 of 7: Customize", say: "If you would rather choose judges, prizes, or your own categories, pick Customize everything. We cover that in the next video.", do: async (p, h) => { await h.hover('[data-tile="quick|no"]', 1100); }, pad: 0.3 },
  { cap: "6 of 7: Quick start", say: "For now, choose Quick start, then tap Next.", target: '[data-tile="quick|yes"]', after: 1000, post: (p, h) => next(p, h) },
  { cap: "7 of 7: Review", say: "The last screen is the review. It lists everything you chose: the name, who runs it, the dates, the categories, and who can vote. Below it is your contest pass. Running a contest needs one, and you choose it here, before the contest goes live. This organization is a founding partner, and the line here says its contest is covered, so there is nothing to choose today. The Pricing page shows what each pass costs.", do: async (p, h) => { await h.hover(".sum", 1500); await p.locator("#pass-box").first().waitFor({ timeout: 8000 }).catch(() => {}); await h.scrollTo("#pass-box", 320).catch(() => {}); await h.hover("#pass-box", 1400).catch(() => {}); }, pad: 0.3 },
  { cap: "7 of 7: Review", say: "If something is not right, tap Edit next to it. Nothing is public until you tap Create contest. When you are happy, tap Create contest.", do: async (p, h) => { await h.scroll(160); }, target: NEXT, after: 2600, poster: true },
  { cap: "Your contest is live", say: "That is it. Your contest is live. This page explains what happens next. You share your link or your QR code. Neighbors enter their homes. You look over each entry before it goes on the map. Then the community votes, on the dates you set, and you announce the winners. Tap Open my dashboard.", target: "text=Open my dashboard", after: 2000 },
  { cap: "Your dashboard", say: "This is your dashboard. It is where you run the contest. Up here are the numbers that matter: your entries, the ones waiting for you, and the votes.", do: async (p, h) => { await h.hover(".stats", 1200); }, pad: 0.3 },
  { cap: "Share it", say: "And here is your link, and your QR code, ready to paste into a message, or print for a flyer. We will cover sharing in a moment.", do: async (p, h) => { await h.scrollTo("text=Share it", 100); await h.hover(".pzprev", 1200); }, pad: 0.8 },
  nextUp(ER, "Create a contest with Customize", "Judges, prizes, categories, vote counts and your own rules"),
]};
// Customize repeats the first five screens that the Quick start video already explains in full, so here they are short
const condense = (steps) => {
  const DROP = ["First, the name.", "This is the welcome message.", "A website is optional. If", "Now the dates.", "The day voting starts."];
  const SHORT = [["This is the Add page. It has three choices.", "This is the Add page, with three choices. We want a contest."], ["I will type", null], ["Next, who is running it, and where.", "Next, who is running it. Type the name of your group."], ["Then pick the city", "Then pick the city the homes are in, and tap Next."], ["We already wrote a friendly one", "The welcome message is already written for you. Keep it, or change it to sound like you. Tap Next."], ["Your contest goes live right away either way", "A website is optional, and your contest goes live right away without one. Tap Next."], ["Entries and voting open and close", "These three dates are filled in for you: the last day to enter, and when voting starts and ends. Tap Next."]];
  return steps.filter((x) => !(x.say && DROP.some((d) => x.say.startsWith(d)))).map((x) => { const r = x.say && SHORT.find(([k]) => x.say.startsWith(k)); return r && r[1] ? { ...x, say: r[1] } : x; });
};
S.custom = { id: "custom", file: "run-custom", cookie: ck.u_org, ...MAPSPEC, maxSeconds: 480, steps: [
  { ...hook(ER, "Create a contest with Customize", "Judges, prizes, categories and rules", "In this video, you will set up a contest exactly your way: your own voting categories, invited judges, a prize, and your own rules. I will explain every choice as we go, so you know what each one does. We will start on the map."), pre: authPre },
  ...condense(wizardStart("Pine Ridge Holiday Lights 2026", 16)),
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
  { cap: "16 of 16: Review", say: "Last is the review. Everything you chose is listed here, and each line has an Edit link if you want to change it. Below it is your contest pass. Running a contest needs one, and you choose it here, before the contest goes live. This organization is a founding partner, and the line here says its contest is covered, so there is nothing to choose today. The Pricing page shows what each pass costs. Nothing is public until you tap Create contest.", do: async (p, h) => { await h.hover(".sum", 1500); await p.locator("#pass-box").first().waitFor({ timeout: 8000 }).catch(() => {}); await h.scrollTo("#pass-box", 320).catch(() => {}); await h.hover("#pass-box", 1400).catch(() => {}); }, pad: 0.3 },
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
  { cap: "Your posters", say: "Below the link are your two ready-made posters, with your contest name, the dates, and a QR code already on them. When someone points their phone camera at the QR code, it opens your contest page. That makes them perfect for anything printed, like flyers, signs, and the bulletin board at your local coffee shop.", do: async (p, h) => { await h.hover(".pzprev", 2000); }, pad: 0.4 },
  { cap: "Entry poster", say: "Tap Print entry poster for the one made for a bulletin board or a shop window. Here is a sample. It is festive, so it gets noticed, and it shows your contest name, a big QR code, the deadline to enter, and the words, scan to enter your home. Its job is to get neighbors to enter. When you print, turn on Background graphics in the print window, so the colors show.", do: async (p, h) => { await preview(p, h, "#printposter", 3200); } },
  { cap: "Yard sign", say: "Print yard sign makes a big sign for a lawn. Here is a sample. It says vote in huge letters, so people can read it from the street, with a QR code that opens the voting page, and the voting dates. Put these out when voting opens, and your neighbors can vote while they are standing in front of the lights.", do: async (p, h) => { await preview(p, h, "#printsign", 3200); } },
  target("Tap Promote", "You can also invite neighbors by email, right from the dashboard. Want to know whether your sharing is working? Tap Promote.", nav("promote"), { after: 1200 }),
  target("Invite neighbors by email", "Open Invite neighbors by email. Type one address on each line, and add a short personal note. A note from a real neighbor gets many more people to open the invitation than a plain message does.", "#invitecard summary", { after: 1000 }),
  emailScene(mails.neighbor, "This is what each neighbor receives. It has your contest name, your note, and one clear button that takes them straight to the contest. They do not need to hunt for anything.", "neighbor@example.com"),
  nextUp(ER, "Approve and decline entries", "Approve, decline with a reason, and undo a decline"),
]};
const shortDash = () => toDash().map((x) => /Contests$/.test(x.cap || "") ? { ...x, say: "In the menu, tap Contests." } : /Mine$/.test(x.cap || "") ? { ...x, say: "Tap Mine, your personal page." } : /Manage$/.test(x.cap || "") ? { ...x, say: "Tap Manage, next to your contest." } : x);
const ADD = "1 Civic Center Plaza, Irvine, 92606 | The Ortiz Family\n14301 Yale Ave, Irvine, 92604 | The Lin Family\n6950 Marine Way, Irvine, 92618 | The Brooks Family\n9999 Nowhere Lane, Irvine | The Moore Family\n412 Maple Street";
const addHomes = (long) => [
  target("Tap Add homes yourself", "At the top is Add homes yourself, for homes you already know about. Tap it to open.", "#addcard summary", { after: 1200, pre: async (p) => { await fakeGeocode(p); } }),
  { cap: "Paste the addresses", say: "Paste one address per line, with a name after a bar, if you like.", do: async (p, h) => { await h.type("#add-list", ADD, { fill: true, after: 1200 }); } },
  target("Tap Check addresses", "Then tap Check addresses. Nothing is added yet.", "#add-check", { after: 2600 }),
  { cap: "Found, not found, already in", say: "Each line is looked up. Found means ready. Not found means a typo. Already in means it is in your contest.", do: async (p, h) => { await h.hover("#add-res .rowi >> nth=0", 800); await h.hover("#add-res .rowi >> nth=3", 800); await h.hover("#add-res .rowi >> nth=4", 800); } },
  target("Tap the box", "Tick the box to confirm the residents agreed to have their address shown.", "#add-ok", { after: 900 }),
  target("Tap Add 3 homes", "Then tap Add 3 homes.", "#add-go", { after: 2600 }),
];
S.approve = { id: "approve", file: "run-approve", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Approve and decline entries", "Review homes, and add your own", "In this video, you will review the homes your neighbors enter, add homes yourself, and undo a mistake. We start on the map."),
  ...toDash().map((x) => /Contests$/.test(x.cap || "") ? { ...x, say: "In the menu, tap Contests." } : /Mine$/.test(x.cap || "") ? { ...x, say: "Tap Mine, your personal page." } : /Manage$/.test(x.cap || "") ? { ...x, say: "Tap Manage, next to your contest." } : x),
  target("Tap Entries", "Now tap Entries. Nothing goes on the map until you approve it.", nav("entries"), { after: 1500 }),
  ...addHomes(false),
  { cap: "Added by organizer", say: "The new homes are on the map and the ballot, tagged Added by organizer.", do: async (p, h) => { await h.scrollTo("[data-rmadded] >> nth=0", 320); await h.hover(".pill:has-text('Added by organizer') >> nth=0", 900); }, pad: 0.6 },
  target("Tap Remove", "Added one by mistake? Tap Remove, then tap again to confirm.", "[data-rmadded] >> nth=2", { after: 1000 }),
  target("Tap again to remove", "Tap again.", "[data-rmadded] >> nth=2", { after: 2000 }),
  target("Tap Approve", "Homes your neighbors enter wait for you. If one looks right, tap Approve. It joins the contest, and the neighbor is emailed.", '[data-entry="approve:p_pend1"]', { after: 1800, poster: true, pre: async (p) => { await p.locator('[data-entry="approve:p_pend1"]').first().evaluate((el) => el.scrollIntoView({ block: 'center' })); } }),
  target("Tap Decline", "If one does not belong, tap Decline.", '[data-entry="decline:p_pend2"]', { after: 1200, pre: async (p) => { await p.locator('[data-entry="decline:p_pend2"]').first().evaluate((el) => el.scrollIntoView({ block: 'center' })); } }),
  { cap: "Give a reason", say: "A kind note helps the neighbor try again. Then tap Decline entry.", do: async (p, h) => { await h.type("#rsn", "The photo is too dark to see the lights."); }, target: "#rs-go", after: 1800 },
  target("Tap Undo decline", "Changed your mind? Tap Undo decline.", '[data-entry="restore:p_pend2"]', { after: 1800, pre: async (p) => { await p.locator('[data-entry="restore:p_pend2"]').first().evaluate((el) => el.scrollIntoView({ block: 'center' })); } }),
  nextUp(ER, "Add your city's homes yourself", "Paste a whole list of addresses and put every home on the ballot"),
]};
S.edit = { id: "edit", file: "run-edit", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Edit your contest", "Change the dates and details", "In this video, you will change your contest after you have created it: the dates, the name, the message, the prize, and the rules. Plans change, and the site is built for that. We start on the map."),
  ...toDash(),
  target("Tap Change dates", "Plans change, and you can change your contest at any time before you announce winners. On the Overview, find Schedule, which shows when entries close and when voting runs. Tap Change dates. That opens the Details tab, where you edit your contest.", "#editdates", { after: 1800 }),
  { cap: "Change the dates", say: "Here you can move the day entries close, the day voting starts, and the day voting ends. Voting should start after entries close, and end after it starts. If you need more time for neighbors to enter, move these dates later.", do: async (p, h) => { await h.scrollTo("#e-closes", 220); await h.type("#e-closes", "2026-12-12", { fill: true }); await h.type("#e-vs", "2026-12-13", { fill: true }); await h.type("#e-ve", "2026-12-22", { fill: true }); }, poster: true },
  { cap: "Name, message, prize, rules", say: "Scroll down and you can also change the contest name, the welcome message, the prize, and the official rules. Neighbors see the changes right away.", do: async (p, h) => { await h.scrollTo("#e-name", 120); await h.hover("#e-descr", 800); } },
  target("Tap Save changes", "When you are done, tap Save changes. Everyone on your team is emailed about the change, so nobody is surprised, and you have a record of what changed. Only the person who created the contest can make these changes.", '#editform button[type="submit"]', { after: 2000 }),
  { cap: "Run it again", say: "One more card is on this tab: Run it again. Next year, it starts a new contest with the same rules, categories, prizes, sponsors and judges, and every date a year later. You tap twice to confirm, and you can edit it before it opens. A new contest needs room in your pass.", do: async (p, h) => { await h.scrollTo("#runagain", 300); if (process.env.MOBILE === "1") await sleep(1500); else await h.hover("#runagain", 1500); }, pad: 0.6 },
  nextUp(ER, "Run voting", "Start now, pause, review votes and void a vote"),
]};
S.voting = { id: "voting", file: "run-voting", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Run voting", "Pause, review, and void a vote", "In this video, you will learn how to run voting once it has started. You will pause and resume it, check the results, and remove a vote that should not count. We start on the map."),
  ...shortDash(),
  { cap: "Controls", say: "This card is where you control the contest while it is running. Voting opens and closes on your dates by itself. The Controls card lets you step in when you need to.", do: async (p, h) => { await h.scrollTo("text=Controls", 100); } },
  { cap: "Contest page", say: "The last row, Contest page, has an Unpublish button. It hides the whole contest from the public, and you can publish it again. The next video shows how.", do: async (p, h) => { await h.hover(".sw:has-text('Contest page')", 1000); } },
  target("Tap Pause voting", "Say you spot something odd, or you need to fix a mistake. Tap Pause voting, and votes stop right away, until you say otherwise.", '[data-act="pause_voting"]', { after: 1500, poster: true }),
  target("Tap Resume voting", "When you are ready, tap Resume voting, and voting carries on.", '[data-act="resume_voting"]', { after: 1500 }),
  target("Tap Results", "Now tap Results. Here is the full tally, category by category. You can always see the counts, even when you have hidden them from the public so people are not swayed by who is ahead.", nav("results"), { after: 1500 }),
  target("Review individual votes", "Open Review individual votes. Every single vote is listed, with when it was cast. The system flags odd patterns, like a burst of votes within a few seconds, so you can look more closely.", "#votecard summary", { after: 1500, pre: async (p, h) => { await h.scrollTo("#votecard summary", 140); } }),
  target("Tap Void", "If a vote should not count, tap Void next to it. It is removed from the tally, and you can restore it later if you change your mind. This keeps the contest fair.", "#votecard button:has-text('Void') >> nth=0", { after: 1800 }),
  nextUp(ER, "Unpublish and publish again", "Hide your contest, then bring it back"),
]};
S.team = { id: "team", file: "run-team", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Add co-organizers and judges", "Invite people to help", "In this video, you will bring in help. You will add co-organizers, who share the work of running the contest, and judges, who score the homes. We start on the map."),
  ...toDash(),
  target("Tap Team", "Running a contest is easier with help. Tap Team. Co-organizers sign in and see your dashboard, so they can approve entries, review votes, and manage judges and sponsors. Only you, the creator, can change the contest details, pause voting, unpublish, or announce the winners.", nav("team"), { after: 1400 }),
  { cap: "Add a co-organizer", say: "Only the creator can add co-organizers, and you can add up to eight. Type their email address, and tap Add co-organizer.", do: async (p, h) => { await h.scrollTo("#newstaff", 260); await h.type("#newstaff", "helper@example.com"); }, target: "#addstaff", after: 1800, poster: true },
  emailScene(mails.coorg, "They get an email like this one, with one button that opens the dashboard. They sign in with that same email address, and they are in.", "helper@example.com"),
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
  target("Tap again to confirm", "It asks you to tap again, because this cannot be undone. Once you confirm, the results are saved and locked. Everyone who entered is emailed, and so are your judges and you, and the winners get a congratulations message. Voters are not emailed. If voting has not started, nobody has voted, or the judges are not finished, the button first asks, Announce anyway, as a warning.", '[data-act="announce"]', { after: 2400 }),
  target("See it as voters do", "To see what everyone else sees, " + MOREHINT + "tap See it as voters do.", 'a:has-text("See it as voters do")', { after: 1800, pre: openMore }),
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
const dashUrl = BASE + "/c/" + SLUG + "/manage";
S.sponsors = { id: "sponsors", file: "sponsors-add", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ES, "Record a sponsor on your contest page", "Thank the businesses that help", "In this video, you will record a local business that paid you to sponsor your contest, so its name and logo are thanked on your contest page. We start on the map."),
  ...toDash(),
  target("Tap Sponsors", "A sponsor is a local business that supports your contest. This tab is where you record one. Tap Sponsors.", nav("sponsors"), { after: 1400 }),
  { cap: "Company and logo", say: "Type the company's name. The Level is already set, and you can change it. Then choose their logo, a J P G, P N G, or WebP file under six hundred kilobytes.", do: async (p, h) => { await h.scrollTo("#sp-name", 200); await h.type("#sp-name", "Oak Hill Hardware"); p.once("filechooser", (fc) => fc.setFiles(process.env.LOGO)); }, target: "#sp-logo", after: 1800 },
  { cap: "Paid to you", say: "Now how the sponsorship counts. The sponsor paid you yourself, so choose Paid to me.", do: async (p, h) => { await h.move("#sp-basis"); await p.selectOption("#sp-basis", "paid"); await h.unring(); await sleep(900); } },
  { cap: "Confirm the payment", say: "Tick that you collected the payment, and add the date and how it was paid. Sponsors pay you, never SoCal Lights.", do: async (p, h) => { await h.click("#sp-collected", { after: 500 }); await h.move("#sp-date"); await p.fill("#sp-date", "2026-11-05"); await h.type("#sp-method", "Check"); await h.unring(); } },
  { cap: "Permission", say: "Tick that you have the sponsor's permission, and tick Show on the contest page.", do: async (p, h) => { await h.click("#sp-perm", { after: 500 }); await h.click("#sp-show", { after: 700 }); } },
  target("Tap Save sponsor", "Tap Save sponsor. Payment never affects who wins.", "#sp-save", { after: 2000, poster: true }),
  target("See it as voters do", "To check how it looks, " + MOREHINT + "tap See it as voters do, and you will see the sponsor on the contest page, just as your neighbors do.", 'a:has-text("See it as voters do")', { after: 2200, pre: openMore }),
  nextUp(ES, "Invite a sponsor to your contest", "Share one private link and approve the request"),
]};
S["sponsor-invite"] = { id: "sponsor-invite", file: "sponsors-invite", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ES, "Invite a sponsor to your contest", "One private link, and you approve it", "In this video, you will send a sponsor one private link, then review their request and approve it. We start on the map."),
  ...toDash(),
  target("Tap Sponsors", "Tap Sponsors.", nav("sponsors"), { after: 1400 }),
  { cap: "How sponsors pay you", say: "First, tell sponsors how to pay you. Paste your own payment link, or write where to send a check. Tap Save.", do: async (p, h) => { await h.scrollTo("#su-pay", 200); await h.type("#su-pay", "https://example.com/oak-hill-neighbors-pay"); }, target: "#su-save", after: 1600 },
  { cap: "Invite a sponsor", say: "Next, Invite a sponsor. This works once your contest is live and approved. Tap Create invite link.", do: async (p, h) => { await h.scrollTo("#su-on", 260); }, target: "#su-on", after: 1500 },
  { cap: "Copy the link", say: "This is your private link. Tap Copy link, then send it to the sponsor.", do: async (p, h) => { await h.hover("#su-url", 1200); }, target: "#su-copy", after: 1500 },
  { cap: "The sponsor's page", say: "Now the sponsor's side. They open your link, no account needed, and see how to pay you.", do: async (p, h) => { const u = BASE + "/s/" + (await p.inputValue("#su-url")).split("/s/").pop(); await h.ctx.clearCookies(); await p.route("**/challenges.cloudflare.com/**", (r) => r.abort()); await p.goto(u, { waitUntil: "domcontentloaded" }); await p.waitForSelector("#contact", { timeout: 10000 }); await sleep(1000); await h.hover("#paylink, .notice", 1400); }, pad: 0.4 },
  { cap: "The sponsor's form", say: "They fill in a short form, and tap Send to the organizer.", do: async (p, h) => { await h.type("#contact", "Sam Demo"); await h.type("#company", "Oak Hill Hardware"); await h.type("#email", "owner@oakhillhardware.example.com"); await h.scrollTo("#perm", 200); await h.click("#perm", { after: 400 }); await h.click("#und", { after: 600 }); }, target: "#go", after: 2200 },
  { cap: "Back to your dashboard", say: "Back on your side, the request waits for you. Nothing shows until you approve it.", do: async (p, h) => { await h.ctx.addCookies([{ name: "scl_session", value: ck.u_org, url: BASE }]); await p.goto(dashUrl + "#sponsors", { waitUntil: "networkidle" }); await p.waitForSelector("[data-edsp]", { timeout: 10000 }); await h.scrollTo("[data-edsp]", 260); await h.hover("[data-edsp]", 1200); }, pad: 0.4 },
  { cap: "Mark payment received", say: "Once they have paid you, tap Mark payment received.", target: "[data-edsp]", after: 1200 },
  { cap: "Confirm the payment", say: "Choose Paid to me, tick that you collected it, add the date, then tap Save sponsor.", do: async (p, h) => { await h.move("#sp-basis"); await p.selectOption("#sp-basis", "paid"); await h.unring(); await sleep(500); await h.click("#sp-collected", { after: 400 }); await h.move("#sp-date"); await p.fill("#sp-date", "2026-11-05"); await h.type("#sp-method", "Check"); await h.unring(); }, target: "#sp-save", after: 1800 },
  { cap: "Approve", say: "Now tap Approve. The sponsor appears on your contest page, labelled Sponsor.", do: async (p, h) => { await h.scrollTo("[data-apsp]", 260); await h.hover("[data-apsp]", 700); }, target: "[data-apsp]", after: 2400, poster: true },
  nextUp(ES, "Presenting installer and quote requests", "How the Get a quote button works"),
]};
S.installer = { id: "installer", file: "sponsors-installer", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ES, "Add a presenting installer", "The Get a quote button", "In this video, you will add a lighting company as the presenting installer of your contest, and see how neighbors can ask them for a quote with one tap. We start on the map."),
  ...toDash(),
  target("Tap Details", "A lighting company can sponsor your contest as its presenting installer, and neighbors can ask them for a quote. This is set up on the Details tab, so tap Details, and scroll down to Presenting installer.", nav("details"), { after: 1400 }),
  { cap: "Presenting installer", say: "Type the company's name. Then the email address where quote requests should go. That is the address the company checks for new customers, and each request is emailed to you as well. And add their website.", do: async (p, h) => { await h.scrollTo("#e-iname", 220); await h.type("#e-iname", "Bright Nights Lighting"); await h.type("#e-iemail", "quotes@brightnights.example.com"); await h.type("#e-iurl", "brightnights.example.com"); } },
  target("Tap Save changes", "Tap Save changes. This adds a Get a quote button to your contest page, so families who love the lights can ask the company for the same thing at their own home. The button shows only while your contest is live.", '#editform button[type="submit"]', { after: 2000, poster: true }),
  { cap: "A neighbor visits", say: "Now let's see it from a neighbor's side. They open the contest page. They need to be signed in to ask. Then they tap Get a quote.", do: async (p, h) => { await h.ctx.clearCookies(); await h.ctx.addCookies([{ name: "scl_session", value: ck.u_voter, url: BASE }]); await p.goto(BASE + "/c/" + SLUG, { waitUntil: "networkidle" }); await h.scrollTo("#quotebtn", 300); }, target: "#quotebtn", after: 1400 },
  { cap: "Share my details", say: "They add their name, a phone number if they like, and describe what they would like done. They must tick the box that says they agree to share their details. Without that tick, nothing is sent. Then they tap Send request. The request goes to the company and to you, the contest organizer, and SoCal Lights keeps a copy.", do: async (p, h) => { await h.type("#q-name", "Sam Rivera"); await h.type("#q-note", "Roofline lights, please."); await h.click("#q-ok", { after: 700 }); }, target: '#quoteform button[type="submit"]', after: 2000 },
  { cap: "Quote requests", say: "Back on your side, open the Promote tab. Every quote request is listed there, with the neighbor's name and details.", do: async (p, h) => { await h.ctx.clearCookies(); await h.ctx.addCookies([{ name: "scl_session", value: ck.u_org, url: BASE }]); await p.goto(dashUrl + "#promote", { waitUntil: "networkidle" }); await p.waitForSelector("h3:has-text('Quote requests')", { timeout: 10000 }); await h.scrollTo("h3:has-text('Quote requests')", 200); await h.hover("h3:has-text('Quote requests')", 1800); }, pad: 0.4 },
  nextUp(ES, "Installer profiles and Installed by", "How a company gets a profile, how a home links to it, and how to confirm or claim yours"),
]};
S["installer-profile"] = { id: "installer-profile", file: "sponsors-profile", cookie: ck.u_inst, ...MAPSPEC, steps: [
  hook(ES, "Installer profiles", "Installed by, and how to claim yours", "In this video, you will see how a lighting company gets a profile on SoCal Lights, how homes link to it with Installed by, and how a company claims and manages its own profile. We start on the map."),
  ...openShort(),
  target("Tap the season button", "Tap the season button.", "#seasonbtn", { after: 800 }),
  target("Tap Thanksgiving and Christmas Lights", "Tap Thanksgiving and Christmas Lights.", '[data-sp]:has-text("Christmas")', { after: 1400 }),
  { cap: "Search a home", say: "Let's look at how a lighting company gets a profile. A homeowner can say which company installed their lights. Search for a home that does. Type its name, and open it.", do: async (p, h) => { await h.type("#q", "Garcia Family"); }, target: "#pbody .item >> nth=0", after: 2200 },
  { cap: "Installed by", say: "It says Installed by, with the company's name. If there is a check mark next to the name, the company has confirmed that it did the job. Without one, the homeowner says it did, but the company has not confirmed it yet.", do: async (p, h) => { await h.hover(".instby", 1200); } },
  target("Tap the company name", "Tap the company's name to open its profile page. At the bottom, a company can tap Claim this profile. If its email is at its website, the profile is its own at once. Otherwise the site owner checks it, and emails the company.", "a.instlink >> nth=0", { after: 2400, poster: true }),
  { cap: "Manage your profile", say: "Once the profile is yours, you manage it here, with your company details and logo. Homes that name your company are listed on the Homes tab.", do: async (p, h) => { await p.goto(BASE + "/installer/bright-nights-lighting/manage#homes", { waitUntil: "networkidle" }); await sleep(1200); await h.hover("[data-claim^='confirm']", 900); } },
  target("Tap Confirm", "Tap Confirm for each home you really installed. It gets a check mark, which tells visitors it is true, and then you and the homeowner can both edit that listing. If it is not yours, tap Not ours, and the name is removed from that home.", "[data-claim^='confirm']", { after: 2000 }),
  nextUp(ES, "Sponsor your installer company", "Banner, Top of the list, or both"),
]};

// ---------------- Post events and homes ----------------
const NOCFG = [{ url: "**/api/config", json: {} }];
// Like NOCFG (no spam-check widget), but online payment is on, so the review step shows the optional "Make it stand out" choice (nothing is paid in the video)
// Online payment is on at the real site, but the local copy has no Stripe keys: this makes /api/config say so (the checkout request itself is still held in the pay step, nothing goes to Stripe)
const payOn = async (p) => { await p.route("**/api/config", async (r) => { const j = await (await r.fetch()).json(); await r.fulfill({ json: { ...j, featureCheckout: true } }); }); };
const PAYCFG = [{ url: "**/api/config", json: { featureCheckout: true, featureOpenDays: 30, eventPlans: { ev_pin: { label: "Featured pin", cents: 2500, level: 1, banner: false, top: false, components: ["pin"] }, ev_banner: { label: "Banner + Featured pin", cents: 5000, level: 1, banner: true, top: false, components: ["pin", "banner"] }, ev_top: { label: "Top of the list + Featured pin", cents: 5000, level: 2, banner: false, top: true, components: ["pin", "top"] }, ev_all: { label: "Top of the list + Banner + Featured pin", cents: 7500, level: 2, banner: true, top: true, components: ["pin", "banner", "top"] } }, eventComponentCents: { pin: 2500, banner: 2500, top: 2500 } } }];
S["add-event"] = { id: "add-event", file: "post-event", cookie: ck.u_enter, routes: PAYCFG, ...MAPSPEC, steps: [
  hook(EP, "Add an event to the map", "A tree lighting, market or parade", "In this video, you will add an event to the map, like a tree lighting, a market, a parade, or a haunted house, so families across Southern California can find it. You need to be signed in to add an event, and in this video we already are. We start on the map."),
  ...openShort(),
  ...fromMap("add", [target("Tap An event", "Now tap An event. Events are for things the whole community can attend, like a tree lighting, a holiday parade, a market, or a haunted house.", 'a[href="/add-event"]', { after: 1800 })]),
  { cap: "1 of 6: Web page", say: "The first question is whether your event has a web page. If it does, paste the address here. It is optional, and it helps people trust the event. If you do not have one, tap No, Next, and the event still goes on the map.", target: '[data-a="skipurl"]', after: 1400 },
  { cap: "2 of 6: Name and type", say: "Type the event's name, the way people know it. Then choose the season it belongs to, and the type of event. That is how visitors find it when they filter the map.", do: async (p, h) => { await h.type("#f-name", "Oak Hill Neighborhood Tree Lighting"); await h.move("#f-season"); await p.selectOption("#f-season", "christmas"); await h.unring(); await sleep(500); const o = await p.$$eval("#f-type option", (os) => os.map((x) => [x.value, x.textContent])); await h.move("#f-type"); await p.selectOption("#f-type", (o.find(([v, t]) => v && /tree/i.test(t)) || o.find(([v]) => v))[0]); await h.unring(); await sleep(500); }, target: NEXT, after: 1400 },
  { cap: "3 of 6: When", say: "Pick the first and last day. For a one-day event, pick the same day twice. Then tap Next.", do: async (p, h) => { await p.fill("#f-start", "2026-12-05"); await p.fill("#f-end", "2026-12-05"); await h.type("#f-hours", "5 to 9 pm"); }, target: NEXT, after: 1400 },
  { cap: "4 of 6: Free or paid", say: "Is it free to attend, or paid? Families plan around this, so say it clearly. Tap Free, then Next.", target: '[data-tile="free|yes"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "5 of 6: Where", say: "Now where. Type the name of the place, the city, and the street address. The street address puts a pin in the right spot on the map, so families can get directions.", do: async (p, h) => { await h.type("#f-venue", "Oak Hill Community Park"); await h.move("#f-city"); await p.selectOption("#f-city", "Irvine"); await h.unring(); await h.type("#f-street", "100 Oak Hill Way"); }, target: NEXT, after: 1400 },
  { cap: "6 of 6: Describe it", say: "Describe it in a sentence or two. What will families see and do? That is the text people read before they decide to come.", do: async (p, h) => { await h.type("#f-blurb", "Join the neighborhood for cocoa, carols and the lighting of the tree. Free and open to everyone."); }, target: NEXT, after: 1400 },
  { cap: "Add my event", say: "Last, check everything. You can change any line with its Edit link. Below that, Make it stand out is optional. You can pick a Featured plan, or just list your event for free. Nothing is public until you tap Add my event. Your event then goes on the map right away, marked Confirmed because you gave the dates. To change it later, or to add up to four photos, tap your account circle, then Your events.", do: async (p, h) => { await h.hover(".sum", 900); await p.locator("#planbox .tile").first().waitFor({ timeout: 10000 }); await h.scrollTo("#planbox", 200); await h.hover("#planbox", 1800); }, target: NEXT, after: 2400, poster: true },
  nextUp(EP, "Show off your home", "Put your lights on the map with Showcase a House"),
]};
S.showcase = { id: "showcase", file: "post-house", cookie: ck.u_enter, routes: NOCFG, ...MAPSPEC, steps: [
  hook(EP, "Show off your home", "Put your lights on the map", "In this video, you will put your own home on the map, so families can find your lights and drive by. You will add the address, a description, and photos. You need to be signed in to add a home, and in this video we already are. We start on the map."),
  ...openShort(),
  ...fromMap("add", [target("Tap A lighting display", "Now tap A lighting display. This is for showing off your own home, or a home you decorated for a customer, so families can drive by and see it.", 'a[href="/add-house"]', { after: 1800 })]),
  { cap: "Who is posting", say: "Who is posting? A homeowner is for your own home. A professional installer is for a home your company did. We are a homeowner, so tap A homeowner, then Next.", target: '[data-tile="kind|homeowner"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "Name to show", say: "Type the name to show. This is the name people see on the map, for example, the Garcia family. It does not have to be your full name.", do: async (p, h) => { await h.type("#f-biz", "The Kim family"); }, target: NEXT, after: 1400 },
  { cap: "Did a company install it?", say: "Did a company install your lights? If one did, you can name them, and your home links to their profile. We did it ourselves, so tap No, then Next.", target: '[data-tile="hadPro|no"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "Season", say: "Which season are your lights for? Visitors pick a season on the map, so choose the one your lights belong to. Tap Christmas, then Next.", target: '[data-tile="season|christmas"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "About the display", say: "Type a display name, and tell us what makes your home special. Is it the music, the animation, the number of lights? Families read this to decide whether it is worth the drive.", do: async (p, h) => { await h.type("#f-title", "Kim Family Christmas Lights"); await h.type("#f-desc", "Twelve thousand lights on the roof and trees, with a walkway of candy canes."); }, target: NEXT, after: 1400 },
  { cap: "Address", say: "Add the address. This is where the pin goes, and visitors see it so they can drive by, so only add an address you want people to visit.", do: async (p, h) => { await h.move("#f-city"); await p.selectOption("#f-city", "Irvine"); await h.unring(); await h.type("#f-street", "460 Maple Street"); await h.type("#f-zip", "92602"); }, target: NEXT, after: 1400 },
  { cap: "Plan a visit", say: "Tell families when the lights are on, and how to enjoy them, like drive by, walk by, or where to park. Good directions make for happier visitors, and happier neighbors.", do: async (p, h) => { await h.type("#f-lightsOn", "5 to 10 pm nightly"); await h.click('[data-tile="visit|both"]', { after: 800 }); }, target: NEXT, after: 1400 },
  { cap: "Photos", say: "Add photos. Take them at night, with the lights on. The first photo is the cover people see on the map.", pre: async (p) => p.once("filechooser", (fc) => fc.setFiles(["public/img/stock/tree-3.jpg", "public/img/stock/walk-2.jpg"])), target: "label[for=f-photos]", after: 2200, post: (p, h) => next(p, h) },
  { cap: "Put it on the map", say: "Finally, check everything, and tap Put it on the map. Your home usually goes on the map right away, for any family in Southern California to find. If it is held for a quick check, it appears once the site owner has looked it over.", target: NEXT, after: 2400, poster: true },
  nextUp(EP, "Find lights near me", "Use the map, filters, seasons and All seasons to find what is on near you"),
]};


// ---------------- New videos (2026-11-06) ----------------
S["add-homes"] = { id: "add-homes", file: "run-add-homes", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Add your city's homes yourself", "Paste a list of addresses", "In this video, you will add a whole list of homes to your contest yourself, for example when your city already collects registrations somewhere else. We start on the map."),
  ...shortDash(),
  target("Tap Entries", "Now tap Entries. Homes can be added here until voting starts.", nav("entries"), { after: 1500 }),
  target("Tap Add homes yourself", "Open Add homes yourself. Each home goes straight onto the ballot and the routes, with no photo, and no sign in.", "#addcard summary", { after: 1200, pre: async (p) => { await fakeGeocode(p); } }),
  { cap: "One home per line", say: "Paste one home per line: the street address, city and ZIP, then a bar, and the family name. The city, ZIP and name are optional.", do: async (p, h) => { await h.hover("#addcard code >> nth=0", 1000); await h.scrollTo("#add-list", 260); } },
  { cap: "Paste the addresses", say: "Paste your list, up to a hundred at a time.", do: async (p, h) => { await h.type("#add-list", ADD, { fill: true, after: 1200 }); } },
  target("Tap Check addresses", "Tap Check addresses. This looks up each address, and adds nothing yet.", "#add-check", { after: 2600 }),
  { cap: "Found, not found, already in", say: "Found means ready. Not found means a typo, so fix it and check again. Already in means it is in your contest.", do: async (p, h) => { await h.hover("#add-res .rowi >> nth=0", 900); await h.hover("#add-res .rowi >> nth=3", 1100); await h.hover("#add-res .rowi >> nth=4", 1100); } },
  target("Tap the box", "Tick the box to confirm that the residents agreed to have their address shown on the public map.", "#add-ok", { after: 900 }),
  target("Tap Add 3 homes", "The button now says how many homes it will add. Tap Add 3 homes.", "#add-go", { after: 2600 }),
  { cap: "Added by organizer", say: "The three homes that were found are on the map and the ballot, tagged Added by organizer. The two that were not found stay in the box, so you can fix them.", do: async (p, h) => { await h.scrollTo("[data-rmadded] >> nth=0", 320); await h.hover(".pill:has-text('Added by organizer') >> nth=0", 1200); }, pad: 0.6 },
  target("Tap Remove", "Added one by mistake? Tap Remove.", "[data-rmadded] >> nth=2", { after: 1000 }),
  target("Tap again to remove", "Then tap again to confirm.", "[data-rmadded] >> nth=2", { after: 2000 }),
  recap(ER, "Your homes are on the ballot", ["Paste one home per line", "Check addresses", "Tick the box, then add", "Tagged Added by organizer"], "That is how you put a whole neighborhood on the ballot. Homes can be added until voting starts."),
  nextUp(ER, "Edit your contest and change the dates", "Change the details any time before winners are announced"),
]};
S.unpublish = { id: "unpublish", file: "run-unpublish", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Unpublish and publish again", "Hide your contest, then bring it back", "In this video, you will hide your contest from the public with two taps, and bring it back when you are ready. Nothing is deleted. We start on the map."),
  ...shortDash(),
  { cap: "Controls", say: "On the Overview, the Controls card has a row called Contest page. It says Public and on the map. That means anyone can find the contest.", do: async (p, h) => { await h.scrollTo("text=Controls", 100); await h.hover(".sw:has-text('Contest page')", 1000); } },
  target("Tap Unpublish", "Need to stop everything for a moment, for example to fix a mistake? Tap Unpublish.", '[data-act="unpublish"]', { after: 1000, poster: true }),
  target("Tap again to confirm", "The button now says, Tap again to unpublish, so it cannot happen by accident. Tap again. Entries and votes stop, and the contest leaves the map.", '[data-act="unpublish"]', { after: 2200 }),
  { cap: "", say: "A red notice now sits at the top. It says the contest is hidden, and that nothing has been deleted. Your team can still open this dashboard.", do: async (p, h) => { await p.evaluate(() => scrollTo(0, 0)); await sleep(800); await h.hover(".status.no", 1200); } },
  target("Tap Publish it again", "When you are ready, tap Publish it again.", '.status.no [data-act="publish_again"]', { after: 2200 }),
  { cap: "Public again", say: "The notice is gone, the Contest page row says Public and on the map again, and entries and votes carry on, with everything still in place.", do: async (p, h) => { await h.hover(".sw:has-text('Contest page')", 1200); } },
  recap(ER, "Hide it, bring it back", ["Controls, then Contest page", "Unpublish, tap again", "Publish it again"], "That is Unpublish: hide the contest, fix what you need to, and publish it again. Nothing is lost."),
  nextUp(ER, "Add co-organizers and judges", "Invite people to help run the contest"),
]};
S.claim = { id: "claim", file: "post-claim", cookie: ck.u_enter, routes: NOCFG, ...MAPSPEC, steps: [
  hook(EP, "Claim your home", "Is this your home?", "In this video, you will claim a home that is already on the map, so your own photos and details replace the automatic listing. You need to be signed in to do this, and in this video we already are. We start on the map."),
  ...openShort(),
  { cap: "Search for your street", say: "Say you spot your own home on the map, listed from a public list of homes. Search for your street, and open your home's card.", do: async (p, h) => { await h.type("#q", "Spadra Lane"); }, target: "#pbody .item >> nth=0", after: 2200 },
  target("Tap Is this your home?", "Homes we found on public lists have a link at the bottom of the card. Tap Is this your home? Claim it.", ".claimhome", { after: 2200, pre: async (p, h) => { await p.locator(".claimhome").first().evaluate((el) => el.scrollIntoView({ block: "center" })); } }),
  { cap: "You are claiming", say: "The form opens with your address already filled in, and tells you which listing you are claiming. Tap A homeowner, then Next.", do: async (p, h) => { await h.hover(".help", 1500); }, target: '[data-tile="kind|homeowner"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "Name to show", say: "Type the name to show, like the Park family, then tap Next.", do: async (p, h) => { await h.type("#f-biz", "The Park family"); }, target: NEXT, after: 1400 },
  { cap: "Did a company install it?", say: "If a company installed your lights, you can name them here. We did it ourselves, so tap No, then Next.", target: '[data-tile="hadPro|no"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "Season", say: "Tap Christmas, then Next.", target: '[data-tile="season|christmas"]', after: 800, post: (p, h) => next(p, h) },
  { cap: "About your home", say: "The name is filled in from the listing. Change it if you like, and tell families what makes your lights special. Then tap Next.", do: async (p, h) => { await h.type("#f-desc", "Ten thousand lights on the roof and trees, and a candy cane walkway."); }, target: NEXT, after: 1400 },
  { cap: "Address", say: "Check the address. It is already filled in, so just tap Next.", do: async (p, h) => { await h.hover("#f-street", 900); }, target: NEXT, after: 1400 },
  { cap: "Plan a visit", say: "Telling families when your lights are on is optional. Tap Next.", target: NEXT, after: 1400 },
  { cap: "Photos", say: "Add photos of your own lights, taken at night. They replace the picture on the automatic listing.", pre: async (p) => p.once("filechooser", (fc) => fc.setFiles(["public/img/stock/tree-3.jpg", "public/img/stock/walk-2.jpg"])), target: "label[for=f-photos]", after: 2200, post: (p, h) => next(p, h) },
  { cap: "Put it on the map", say: "Finally, check everything, and tap Put it on the map. Your home usually goes live at once, and it replaces the automatic listing at that address. If it is held for a quick check, it goes live once the site owner has looked it over.", target: NEXT, after: 2600, poster: true },
  recap(EP, "Claimed", ["Open the card, tap Is this your home?", "Add your own photos and details", "It replaces the automatic listing"], "That is it. Your home usually goes live at once, and it replaces the automatic listing, with your own photos and details."),
  nextUp(EP, "Feature your event or home", "A gold pin on the map, for events and winning homes"),
]};
S.feature = { id: "feature", file: "post-feature", cookie: ck.u_mine, ...MAPSPEC, steps: [
  hook(EP, "Feature your event or home", "Stand out on the map", "In this video, you will see how to feature an event, or a winning home, so it stands out on the map. We go as far as the secure payment page, and stop there. We start on the map."),
  ...openShort(),
  ...navSteps([
    target("Tap the three dots", "Look at the top right corner of the map, and tap the three dots.", "#morebtn", { after: 900 }),
    target("Tap Promote your event", "In the menu, tap Promote your event. Listing an event is always free. This is for organizers who want to stand out.", '#moremenu a[href="/feature"]', { after: 2200, pre: payOn }),
  ]),
  { cap: "Pick a plan", say: "First, pick a plan. There are four, and a table below the cards compares everything each one includes. Every plan includes the gold Featured pin on the map. The banner adds your event as a Featured pill, in the strip at the top of the map list. And Top of the list puts your event first when people browse your area. For prices, see the Pricing page.", do: async (p, h) => { await p.locator("#flow .pcard[data-p]").first().waitFor({ timeout: 10000 }); await h.scrollTo("#flow .pcard[data-p] >> nth=0", 150); for (const n of [0, 1, 2, 3]) await h.hover(`#flow .pcard[data-p] >> nth=${n}`, 1300); } },
  target("Tap Choose", "Tap Choose on the plan you want. We will take the banner with the pin.", '[data-pick="ev_banner"]', { after: 1600 }),
  { cap: "Which event?", say: "Next, pick what to feature. This list shows your events, and homes that finished first, second or third in an announced contest.", do: async (p, h) => { await p.locator("#mylist").first().waitFor({ timeout: 10000 }); await h.scrollTo("#mylist", 200); await h.hover("#mylist li >> nth=0", 1000); await h.hover("#mylist li >> nth=1", 1000); } },
  { cap: "Claim a listing", say: "Is your event already on the map, but not on your account? Open Claim an existing listing, find it by name or city, and tap This is my event: claim it. If your email matches the event's own website, it is approved at once. Otherwise we check it and email you.", do: async (p, h) => { await h.click("#claimbox summary", { after: 900 }); await h.type("#q", "Tree", { after: 1200 }); await h.hover("#res li >> nth=0", 1500); }, pad: 0.3 },
  target("Tap your event", "Tap your event.", '[data-mine="ev-oak-hill-tree-lighting"]', { after: 1800 }),
  { cap: "Check the dates", say: "This page shows exactly what you get, when it starts, when it ends, and the total, before you pay.", do: async (p, h) => { await h.hover("#flow .plan.sel ul", 1200); await h.hover("#flow .plan.sel p:has-text('Starts')", 1800); } },
  { cap: "Tap Pay on Stripe", say: "Then tap Pay on Stripe. This opens Stripe's secure page, where you pay with a card or Cash App Pay. We stop here, because this is only a demonstration, and we never enter card details in a video.", target: "#go", after: 3500, pre: async (p) => { await p.route("**/api/feature/checkout", () => new Promise(() => {})); }, poster: true }, // the request is held: nothing is sent to Stripe
  { cap: "", say: "After you pay, your placement turns on by itself within a few minutes, and a receipt arrives by email. There is no subscription. If your event is cancelled, email us, and we will move your placement to another of your events or refund the unused time. A winning home works the same way.", do: async (p, h) => { await sleep(600); } },
  recap(EP, "Featured, in a few taps", ["Menu, then Promote your event", "Pick a plan", "Pick your event or winning home", "Check the dates, then pay on Stripe"], "That is how you feature an event or a winning home. Listing is always free, and a Featured placement is optional."),
  nextUp(EP, "Find lights near me", "Use the map, filters, seasons and All seasons to find what is on near you"),
]};
S.sponsor = { id: "sponsor", file: "sponsors-sponsor", cookie: ck.u_inst, ...MAPSPEC, steps: [
  hook(ES, "Sponsor your installer company", "Banner, Top of the list, or both", "In this video, you will sponsor your installer company, so it stands out at the top of the map list, in the installer list, or both. We go as far as the secure payment page, and stop there. We start on the map."),
  ...openShort(),
  ...navSteps([
    target("Tap the three dots", "Look at the top right corner of the map, and tap the three dots.", "#morebtn", { after: 900 }),
    target("Tap Promote your event", "In the menu, tap Promote your event. This page is for paid placements.", '#moremenu a[href="/feature"]', { after: 2200 }),
    target("Tap See all pricing", "At the top, tap See all pricing.", 'main a[href="/pricing"] >> nth=0', { after: 2200 }),
  ]),
  target("Tap Installers", "The Pricing page is split by who you are. Tap Installers. Your company profile is free, and it comes first.", '[data-k="banner"] >> visible=true', { after: 1400 }),
  { cap: "Three paid placements", say: "Below the free profile are three paid placements. Paid placements are always labelled Sponsor. The Banner is a pill in the strip at the top of the map list. Top of the list puts your company first in the installer list. The third card takes both.", do: async (p, h) => { await p.locator("#insttiers .pcard").first().waitFor({ timeout: 10000 }); await h.scrollTo("#instfree", 140); for (const n of [0, 1, 2]) await h.hover(`#insttiers .pcard >> nth=${n}`, 1100); } },
  target("Tap What's included", "Each card folds open. Tap What's included, to see everything the Banner gives you.", '#insttiers .pcard[data-p="banner"] summary', { after: 1800 }),
  target("Tap Choose", "Under Banner, tap Choose.", '#insttiers a[href="/sponsor?plan=banner"]', { after: 2400, pre: payOn }),
  { cap: "Your company", say: "You sign in with your company email, and we already are. Then pick your company. It needs a free profile first.", do: async (p, h) => { await p.locator("#s2 .pick").first().waitFor({ timeout: 10000 }); await h.hover("#s2 .pick", 1500); } },
  { cap: "The three plans", say: "These are the three plans: Banner, Top of the list, and both together. Your choice is marked, and each one lists everything it includes.", do: async (p, h) => { await h.scrollTo("#plans", 160); for (const n of [0, 1, 2]) await h.hover(`#plans .plan >> nth=${n}`, 1200); } },
  { cap: "Check the dates", say: "Below is a summary with the exact dates. It starts today, and ends on the last day of the season. Automatic renewal is optional. It is off unless you tick this box, and you can cancel it any time.", do: async (p, h) => { await h.scrollTo("#sum", 160); await h.hover("#sum", 1800); await h.hover("#renewbox", 1500); } },
  { cap: "Tap Continue to payment", say: "Then tap Continue to payment. This opens Stripe's secure page. We stop here, because this is only a demonstration, and we never enter card details in a video.", target: "#go", after: 3500, pre: async (p) => { await p.route("**/api/sponsor/checkout", () => new Promise(() => {})); }, poster: true }, // the request is held: nothing is sent to Stripe
  { cap: "", say: "After you pay, your placement turns on within a few minutes, and a receipt arrives by email.", do: async (p, h) => { await sleep(600); } },
  recap(ES, "Sponsored, in a few taps", ["Menu, Promote, See all pricing", "Choose Banner, Top of the list, or both", "Pick your company and check the dates", "Pay on Stripe's secure page"], "That is how you sponsor your installer company. Every paid placement is labelled Sponsor, and renewal is always your choice."),
  nextUp(EP, "Add an event to the map", "Share a tree lighting, market, parade or haunted house"),
]};

// Contest passes (re-recorded 2026-11-09 for the new pricing): the wizard's Review screen for an organization with NO live contest and no comp, so the picker shows before Create contest.
// seed-passes.sql removes any comp and contest of the demo organization first. The pass picker is shown, the Choose button is
// pointed at but never tapped (the checkout request would go to Stripe), and no price is spoken: the cards on screen show what /api/config serves.
S["contest-passes"] = { id: "contest-passes", file: "run-passes", cookie: ck.u_org, ...MAPSPEC, maxSeconds: 300, steps: [
  { ...hook(ER, "Contest passes", "How you choose a contest pass", "In this video, you will see how you choose a contest pass, before your contest goes live. We start on the map."), pre: authPre },
  ...wizardStart("Oak Hill Holiday Lights 2027"),
  { cap: "6 of 7: Quick start", say: "Choose Quick start, then tap Next.", target: '[data-tile="quick|yes"]', after: 1000, post: (p, h) => next(p, h) },
  { cap: "7 of 7: Review", say: "This is the review. Your organization has no pass yet, so the passes appear right here, before the contest goes live.", do: async (p, h) => { await h.hover(".sum", 1000); await p.locator("#pass-box .pp-card").first().waitFor({ timeout: 10000 }); await h.scrollTo("#pass-box", 200).catch(() => {}); }, pad: 0.4, poster: true },
  { cap: "Choose a pass", say: "The page says where your organization stands in its 12-month window. You have no pass running yet, so choose one to start your contest.", do: async (p, h) => { await h.hover("#pass-box .pp-win", 1200); }, pad: 0.4 },
  { cap: "Three passes", say: "There are three passes: a single contest, up to 5 contests, and up to 20 contests. The number counts every contest in your window. Each card lists everything it gives you, and the price is on the card.", do: async (p, h) => { await h.scrollTo("#pass-box .pp-card:nth-child(1)", 140).catch(() => {}); await h.hover("#pass-box .pp-card:nth-child(1)", 1200); await h.scrollTo("#pass-box .pp-card:nth-child(2)", 140).catch(() => {}); await h.hover("#pass-box .pp-card:nth-child(2)", 1200); await h.scrollTo("#pass-box .pp-card:nth-child(3)", 140).catch(() => {}); await h.hover("#pass-box .pp-card:nth-child(3)", 1200); }, pad: 0.4 },
  { cap: "More than 20", say: "Running more than twenty contests? The Up to 20 card tells you what to do. You write to us, and we set it up with you.", do: async (p, h) => { await h.hover("#pass-box .pp-card:nth-child(3)", 1400); }, pad: 0.4 },
  { cap: "Tap Choose", say: "To go on, tap Choose under the pass you want. That opens Stripe's secure payment page. We stop here, because this is only a demonstration, and we never enter card details in a video.", do: async (p, h) => { await h.hover("#pass-box [data-pass]", 1500); }, pad: 0.5 },
  { cap: "After you pay", say: "After you pay, your contest is created by itself, with everything you typed. Your window runs for twelve months from the day you buy your pass, or the day your first contest goes live if that comes first, and a contest that is unpublished still counts. If you need more contests later, choose a bigger pass, and you pay only the difference.", do: async (p, h) => { await sleep(500); }, pad: 0.5 },
  { cap: "Free for everyone else", say: "Entering and voting stay free for everyone, and payment never affects who wins.", do: async (p, h) => { await sleep(300); }, pad: 0.5 },
  nextUp(ER, "Create a contest with Quick start", "The short setup: seven screens"),
]};

// Event Partner (new 2026-11-10): the plan for organizations with several events. The buy screen and the Founding-partner screen use the real page with the entitlement answer
// swapped (nothing is bought); the "plan" screens are real: a seeded plan and one covered event (scripts/tutorials/seed-partner.sql), and Use the plan really applies it.
// No price is spoken: the card on screen shows what /api/config serves. The checkout request is held, so nothing goes to Stripe.
const partnerMock = (st) => async (p) => {
  await p.route("**/api/partner/entitlement**", async (r) => {
    if (st.mode === "plan") return r.fallback();
    const res = await r.fetch(), j = await res.json().catch(() => ({})), cfg = await (await p.request.get(BASE + "/api/config")).json().catch(() => ({}));
    const cents = (cfg.eventPartner || {}).cents || 14900;
    if (st.mode === "buy") return r.fulfill({ json: { ...j, covered: false, hasPlan: false, comp: null, used: 0, cap: null, unlimited: false, remaining: null, canApply: false, offer: { cents, cap: 10 }, buyProblem: "", events: [] } });
    return r.fulfill({ json: { ...j, covered: true, hasPlan: false, comp: { until: "2026-12-31", unlimited: false }, used: 0, cap: 10, unlimited: false, remaining: 10, canApply: true, offer: null, buyProblem: "", events: [] } });
  });
};
const PST = { mode: "buy" };
S["event-partner"] = { id: "event-partner", file: "post-partner", cookie: ck.u_mine, ...MAPSPEC, steps: [
  { ...hook(EP, "Event Partner", "One plan for all your events", "In this video, you will see Event Partner, the plan for cities, chambers of commerce, nonprofits and event producers that run several events in a season. You will see what it is, how an organization gets it, and how you use it on your events. We start on the map."), pre: async (p) => { PST.mode = "buy"; await partnerMock(PST)(p); } },
  ...openShort(),
  ...navSteps([
    target("Tap the three dots", "Look at the top right corner of the map, and tap the three dots.", "#morebtn", { after: 900 }),
    target("Tap Promote your event", "In the menu, tap Promote your event. Listing an event is always free. This is for organizers who want to stand out.", '#moremenu a[href="/feature"]', { after: 2200, pre: payOn }),
  ]),
  { cap: "Look at the top", say: "This page features one event. Look at the sentence at the top: Run several events a season as a city, chamber, nonprofit or event producer? See Event Partner.", do: async (p, h) => { await h.hover('.lede a[href="/partner"]', 1600); }, pad: 0.4 },
  target("Tap Event Partner", "Tap Event Partner.", '.lede a[href="/partner"]', { after: 2400 }),
  { cap: "What it is", say: "This is the Event Partner page. It is for an organization that runs several events in a season. One payment covers up to ten of your events for the season. Each covered event gets the gold Featured pin on the map, and an Event Partner badge on its page.", do: async (p, h) => { await p.locator(".pbox").first().waitFor({ timeout: 10000 }); await h.hover(".pbox h2", 1200); await h.hover(".pbox ul", 1600); }, pad: 0.4, poster: true },
  { cap: "Listing stays free", say: "Listing an event stays free for everyone. Event Partner is only for events you want to stand out. The price is on the card, and you pay once for the season, with no subscription.", do: async (p, h) => { await h.hover(".pbox .price", 1600); }, pad: 0.4 },
  { cap: "Tap Pay on Stripe", say: "To buy it, you tap Pay on Stripe. That opens Stripe's secure payment page. We stop here, because this is only a demonstration, and we never enter card details in a video.", target: "#buy", after: 3000, pre: async (p) => { await p.route("**/api/partner/checkout", () => new Promise(() => {})); }, poster: true },
  { cap: "After you pay", say: "After you pay, the page shows your plan. It counts how many of your ten events you have used this season, and lists the events it already covers.", do: async (p, h) => { PST.mode = "plan"; await p.reload({ waitUntil: "domcontentloaded" }); await p.locator("#app .plist").first().waitFor({ timeout: 15000 }); await h.hover("#app p:has-text('events used')", 1500); await h.hover("#app .plist", 1400); }, pad: 0.4 },
  { cap: "Choose an event", say: "Under Choose an event are your other live events. Tap Use the plan next to the event you want to cover.", do: async (p, h) => { await h.scrollTo('[data-ap="ev-oak-hill-tree-lighting"]', 300).catch(() => {}); await h.hover('[data-ap="ev-oak-hill-tree-lighting"]', 900); }, target: '[data-ap="ev-oak-hill-tree-lighting"]', after: 2600 },
  { cap: "It is covered", say: "The page says the event is Featured through its last day, and the count goes up by one. Featuring opens thirty days before an event starts, and it runs to the event's last day, or to the end of the season, whichever comes first.", do: async (p, h) => { await h.hover("#msg", 1500); await h.hover("#app p:has-text('events used')", 1400); }, pad: 0.4 },
  { cap: "See it on the map", say: "Tap See it, to open a covered event on the map.", target: '.plist a[href="/#e-ev-oak-hill-holiday-market"]', after: 3200 },
  { cap: "The Event Partner badge", say: "On the event, you see the Featured badge, and an Event Partner badge. The badge only shows that the organization has this plan. It is not an endorsement by SoCal Lights.", do: async (p, h) => { await p.locator('.tag:has-text("Event Partner")').first().waitFor({ timeout: 10000 }); await h.hover('.tag:has-text("Event Partner")', 2200); }, pad: 0.5, poster: true },
  { cap: "Founding partners", say: "Some founding cities have Event Partner free this year. Then the page says Founding partner, free through a date, and shows no price at all.", do: async (p, h) => { PST.mode = "comp"; await p.goto(BASE + "/partner", { waitUntil: "domcontentloaded" }); await p.locator("#app p:has-text('Founding partner')").first().waitFor({ timeout: 15000 }); await h.hover("#app p:has-text('Founding partner')", 2200); }, pad: 0.5 },
  recap(EP, "Event Partner, in short", ["Menu, Promote your event, Event Partner", "One payment covers up to ten events a season", "Tap Use the plan on each event", "Covered events show an Event Partner badge"], "That is Event Partner. Listing stays free, the plan is for events you want to feature, and the badge is not an endorsement."),
  nextUp(EP, "Feature your event or home", "Pick a plan for one event, then pay on Stripe"),
]};

// Founder city badge (new 2026-11-10): what the label is and where it shows. The demo organizer's contests carry it (scripts/tutorials/seed-founder.sql, a local comp with badge = 1).
S["founder-city-badge"] = { id: "founder-city-badge", file: "run-founder", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "The Founder city badge", "What it is and where you see it", "In this video, you will see the Founder city badge: what it means, and where it shows. We start on the map."),
  ...shortDash(),
  { cap: "On the dashboard", say: "This is a contest dashboard. At the top, under the contest's name, is a small label: Founder city. It marks a city that is one of the first to run home decorating contests on SoCal Lights.", do: async (p, h) => { await p.locator(".pill.p-founder:visible").first().waitFor({ timeout: 10000 }); await h.hover(".pill.p-founder:visible", 2400); }, pad: 0.5, poster: true },
  { cap: "What it means", say: "The label only says the city is one of the first. It never changes votes, judging, results, or the order homes are listed in, and every home is treated the same way. It is not an endorsement, by the city or by SoCal Lights.", do: async (p, h) => { await h.hover(".pill.p-founder:visible", 2600); }, pad: 0.5 },
  { cap: "The contests list", say: "You see the same label on the Contests page, beside each of the city's contests.", do: async (p, h) => { await p.goto(BASE + "/contests", { waitUntil: "domcontentloaded" }); await p.locator(".pill.p-founder:visible").first().waitFor({ timeout: 10000 }); await h.hover(".pill.p-founder:visible", 2200); }, pad: 0.5 },
  target("Tap the contest", "Tap the contest's button to open it.", "section.card a.btn.org >> nth=0", { after: 2600 }),
  { cap: "The contest page", say: "On the contest page, the label is at the top, next to the contest's status.", do: async (p, h) => { await p.locator(".pill.p-founder:visible").first().waitFor({ timeout: 10000 }); await h.hover(".pill.p-founder:visible", 2400); }, pad: 0.5 },
  { cap: "Past results", say: "And in Past results, a finished contest keeps its label next to the winners.", do: async (p, h) => { await p.goto(BASE + "/contests", { waitUntil: "domcontentloaded" }); await h.click("[data-tab=past]", { after: 1500 }); await p.locator(".pill.p-founder:visible").first().waitFor({ timeout: 10000 }); await h.hover(".pill.p-founder:visible", 2400); }, pad: 0.5, poster: true },
  { cap: "Only while it is active", say: "The label shows only while it is active, and only on that city's own contests. If your city would like to run a contest, you can start one from the Add page.", do: async (p, h) => { await sleep(500); }, pad: 0.5 },
  recap(ER, "The Founder city badge", ["It marks one of the first cities to run contests here", "It shows on the dashboard, the Contests page, the contest page and Past results", "It never changes votes, judging or results", "It is not an endorsement"], "That is the Founder city badge. It is a label, and nothing more."),
  nextUp(ER, "Contest passes", "How you choose a pass before your contest goes live"),
]};

// Buying a contest pass from inside the app (new 2026-11-10): the app is the same site opened with the SoCalLightsApp user agent; it never shows a price or opens Stripe.
// The Continue button opens the pass page in the browser, so it is pointed at but not tapped; "I have my pass" is tapped before any pass exists, which shows the app's "we do not see a pass" line.
const appOpen = () => openSite("", false).map((x, i) => (i === 0 ? { ...x, card: { ey: "Start here", title: "Open the SoCal Lights app" }, say: "Open the SoCal Lights app on your phone." } : x));
S["contest-pass-app"] = { id: "contest-pass-app", file: "run-pass-app", cookie: ck.u_org, ua: "Mozilla/5.0 SoCalLightsApp/1.0", ...MAPSPEC, maxSeconds: 300, steps: [
  { ...hook(ER, "Contest passes in the app", "Get your pass on the website, then come back", "In this video, you will see what happens when you create a contest in the SoCal Lights app. Contest passes are bought on our website, in your browser, not inside the app. We start on the map."), pre: authPre },
  ...wizardStart("Oak Hill Holiday Lights 2027", 7, appOpen()),
  { cap: "6 of 7: Quick start", say: "Choose Quick start, then tap Next.", target: '[data-tile="quick|yes"]', after: 1000, post: (p, h) => next(p, h) },
  { cap: "7 of 7: Review", say: "This is the review. Your organization has no pass yet, so the app tells you how to get one.", do: async (p, h) => { await h.hover(".sum", 1000); await p.locator(".pp-app").first().waitFor({ timeout: 10000 }); await h.scrollTo(".pp-app", 200).catch(() => {}); await h.hover(".pp-app p >> nth=0", 1400); }, pad: 0.4, poster: true },
  { cap: "Passes are bought on the website", say: "Running a contest needs a contest pass. Passes are bought on our website, in your browser, not inside the app. The app shows no prices, and it never opens a payment page.", do: async (p, h) => { await h.hover(".pp-app ol", 1800); }, pad: 0.4 },
  { cap: "Continue on socallights.app", say: "Tap Continue on socallights.app. It opens the pass page in your browser, with this contest's website, so the pass goes to the same organization. Choose a pass there, and pay on Stripe's secure page.", do: async (p, h) => { await h.hover("[data-pass-web]", 2200); }, pad: 0.4 },
  { cap: "I have my pass", say: "Then come back to the app. Your contest details are kept here. Tap I have my pass, and your contest is created.", do: async (p, h) => { await h.hover("[data-pass-check]", 2000); }, pad: 0.4 },
  { cap: "Tap I have my pass", say: "If you tap it before you have a pass, the app tells you it does not see one yet. Finish on the website, then tap again.", target: "[data-pass-check]", after: 3000, poster: true },
  recap(ER, "Passes in the app", ["Create your contest as usual", "The Review screen says a pass is needed", "Tap Continue on socallights.app and choose a pass there", "Come back and tap I have my pass"], "That is how a contest pass works in the app. You choose it on the website, and then come back."),
  nextUp(ER, "Contest passes", "How you choose a pass on the website"),
]};

// ---- Today's organizer and homeowner features (2026-11-10): editing a home the organizer added, photos and the homeowner's private link, and the homeowner's own page ----
// Seeds: scripts/tutorials/seed-ownhomes.sql (three homes the organizer added, each with a private link, no photos, nobody linked). Demo photos come from public/img.
const PHOTO = (n) => new URL(`../../public/img/${n}`, import.meta.url).pathname;
const OWNLINK = "/photos/DemoLynnLinkTokenAAAAAAAAAAAAA1";
S["entry-edit"] = { id: "entry-edit", file: "run-edit-home", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Fix a home you added", "Correct a name or a description", "In this video, you will fix a mistake in a home you added to your contest yourself, such as a misspelled family name. We start on the map."),
  ...shortDash(),
  target("Tap Entries", "Now tap Entries.", nav("entries"), { after: 1500 }),
  { cap: "Added by organizer", say: "Every home is a row. The homes you added yourself are tagged Added by organizer, and each one has an Edit button.", do: async (p, h) => { await p.locator(".entr").first().waitFor({ timeout: 10000 }); await h.scrollTo("[data-edithome] >> nth=0", 300).catch(() => {}); await h.hover(".pill:has-text('Added by organizer') >> nth=0", 1600); } },
  target("Tap Edit", "Tap Edit on the home with the mistake.", "[data-edithome] >> nth=0", { after: 1500, pre: async (p) => { await fakeGeocode(p); } }),
  { cap: "Fix the name", say: "Fix the name here. A misspelled family name is the most common mistake.", do: async (p, h) => { await p.locator("#ed-name").waitFor({ timeout: 8000 }); await h.type("#ed-name", "The Lin Family", { fill: true, after: 900 }); } },
  { cap: "Description and address", say: "You can also change the description, and the address. If you change the address, we look it up again, and move the pin on the map.", do: async (p, h) => { await h.hover("#ed-desc", 1200); await h.hover("#ed-addr", 1400); } },
  target("Tap Save", "Tap Save.", ".phdlg button[type=submit]", { after: 2400 }),
  { cap: "Fixed everywhere", say: "The home is fixed everywhere, on the ballot, on the routes, and on the map. You can change a name or a description until the winners are announced. After that, the address is locked.", do: async (p, h) => { await h.hover(".entname b >> nth=0", 1600); }, pad: 0.5, poster: true },
  recap(ER, "Fix a home you added", ["Dashboard, then Entries", "Tap Edit on the home", "Fix the name, the description or the address", "Tap Save"], "That is how you fix a home you added. The Edit button is there for as long as the contest runs."),
  nextUp(ER, "Add photos to a home and send the owner a link", "Add photos yourself, and send the homeowner a private link"),
]};
S["entry-photos"] = { id: "entry-photos", file: "run-home-photos", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(ER, "Add photos to a home and send the owner a link", "Photos, and a private link for the homeowner", "In this video, you will add photos to a home you added yourself, and send the homeowner a private link, so they can add their own. We start on the map."),
  ...shortDash(),
  target("Tap Entries", "Now tap Entries.", nav("entries"), { after: 1500 }),
  { cap: "Copy link and Email link", say: "Each home you added shows two buttons for the homeowner: Copy link, and Email link. The link is private to that home. The homeowner signs in with it, and links the home to their account.", do: async (p, h) => { await p.locator(".entlk").first().waitFor({ timeout: 10000 }); await h.scrollTo(".entlk >> nth=0", 320).catch(() => {}); await h.hover(".entlk button >> nth=0", 1400); await h.hover(".entlk a >> nth=0", 1400); } },
  { cap: "Email link", say: "Email link opens an email with the link and a short message already written. Add the homeowner's address, and send it.", do: async (p, h) => { await h.hover(".entlk a >> nth=0", 1600); }, pad: 0.4 },
  target("Tap Photos", "To add a photo yourself, tap Photos.", "[data-photos] >> nth=0", { after: 1500 }),
  { cap: "Add photos", say: "Add up to eight photos, from your phone or your computer. They are made smaller for you, so they load fast.", do: async (p, h) => { await p.locator("#ph-files").waitFor({ state: "attached", timeout: 8000 }); await h.hover(".phpick", 1200); await p.setInputFiles("#ph-files", PHOTO("events/ramona-tree-lighting.jpg")); await p.locator(".phone img").first().waitFor({ timeout: 20000 }); await sleep(1200); } },
  { cap: "The photo is added", say: "The photo shows right away, on the contest page, the ballot and the map. As the organizer, you can remove any photo, with the cross.", do: async (p, h) => { await h.hover(".phone img >> nth=0", 1400); await h.hover(".phone button >> nth=0", 1400); }, poster: true },
  { cap: "The homeowner's link", say: "Below the photos is the homeowner's link. If you sent it to the wrong person, tap Make a new link, and the old one stops working. Once the homeowner links the home, you can unlink them, and send a new link to someone else.", do: async (p, h) => { await h.scrollTo(".phlink", 200).catch(() => {}); await h.hover(".phlink .copy", 1600); await h.hover("#ph-new", 1600); }, pad: 0.4 },
  { cap: "Until voting closes", say: "Photos can be added and removed until voting closes. After that, they are locked.", do: async (p, h) => { await sleep(500); }, pad: 0.5 },
  recap(ER, "Photos for a home you added", ["Dashboard, then Entries", "Copy link or Email link, for the homeowner", "Tap Photos to add or remove photos", "Make a new link, or unlink, if needed"], "That is how you add photos, and invite the homeowner. Photos stay open until voting closes."),
  nextUp(ER, "Add photos and details to your home", "What the homeowner sees when they open the link"),
]};
S["owner-photos"] = { id: "owner-photos", file: "enter-city-home", cookie: ck.u_mine, ...MAPSPEC, steps: [
  hook("Enter a home", "Add photos and details to your home", "When your city entered your home", "In this video, you will see what to do when your city entered your home in a contest, and sent you a private link. You will link the home to your account, check its details, and add your own photos. We start from the email."),
  { cap: "The email", say: "Your city sends you an email with a private link for your home. Tap the link.", mail: { subject: "Your home in Maple Street Holiday Lights 2026", to: "jamie@demo.example", note: "Example email", html: `<p>Hello,</p><p>Your home (The Lynn Family) is entered in Maple Street Holiday Lights 2026. Use this private link to sign in, link the home to your account, check the details and add photos:</p><p><a href="${BASE}${OWNLINK}">Open the private link for your home</a></p><p>Thank you,<br>Maple Street Neighbors</p>` }, target: '#__mail a[href*="/photos/"]', after: 2600, pad: 0.4 },
  { cap: "Is this your home?", say: "The link opens a private page for your home. It says which contest your home is in, and who entered it.", do: async (p, h) => { await p.locator(".hp .notice").first().waitFor({ timeout: 15000 }); await h.hover(".hp .meta", 1600); await h.hover(".hp .notice", 1600); }, pad: 0.4 },
  { cap: "Sign in", say: "If you are not signed in yet, the page asks you to sign in with your email, or with Google. We use your email to send you contest updates and results, and the organizer can see it.", do: async (p, h) => { await h.hover("#claim", 1800); }, pad: 0.4 },
  target("Tap Yes, this is my home", "Tap, Yes, this is my home, link it to my account.", "#claim", { after: 2600 }),
  { cap: "Your home", say: "Now the home is on your account. You can change it until voting ends.", do: async (p, h) => { await p.locator("#edit").waitFor({ timeout: 15000 }); await h.hover("#edit", 1600); }, pad: 0.4, poster: true },
  { cap: "Edit the details", say: "Change the name, the description, when the lights are on, a tip for visitors, how to see it, parking, and the radio station.", do: async (p, h) => { await h.type("#edit [name=desc]", "Ten thousand lights on the roof, a candy cane walkway, and music at six.", { after: 900 }); await h.type("#edit [name=lights_on]", "Every night, 5 to 10 pm", { after: 900 }); } },
  target("Tap Save changes", "Tap Save changes.", "#edit button[type=submit]", { after: 2200 }),
  { cap: "Photos", say: "Under Photos are the photos your city added. You can hide them, but you cannot delete them. Your own photos, you can delete.", do: async (p, h) => { await h.scrollTo("#files", 260).catch(() => {}); await h.hover(".pick", 1600); }, pad: 0.4 },
  { cap: "Add your own photos", say: "Tap Add your own photos, and choose pictures from your phone or computer. A home can have up to eight photos.", do: async (p, h) => { await p.setInputFiles("#files", PHOTO("events/lake-elsinore-tree-lighting.jpg")); await p.locator(".grid .ph img").first().waitFor({ timeout: 20000 }); await sleep(1400); await h.hover(".grid .ph img >> nth=0", 1400); }, poster: true },
  { cap: "On your profile", say: "The home now shows on your profile, under Contests, and under Displays.", do: async (p, h) => { await p.goto(BASE + "/profile#displays", { waitUntil: "domcontentloaded" }); await p.locator("text=Manage your home").first().waitFor({ timeout: 15000 }); await h.hover("text=Manage your home", 2200); }, pad: 0.5 },
  recap("Enter a home", "Your home, added by your city", ["Open the private link in your email", "Link the home to your account", "Check the details, and save", "Add your own photos"], "That is how you take over a home your city entered. You can change it until voting ends."),
  nextUp("Enter a home", "Edit or withdraw your entry", "Change your entry, or take it out of the contest"),
]};

// Manage your events (new 2026-11-13): the account menu's Your events row, Edit, the Photos box (up to 4 photos, Cover, remove), Cancelled or Postponed.
// Demo event "Oak Hill Neighborhood Tree Lighting" (seed-feature.sql), owned by jamie@demo.example (cookie u_mine). Selectors from public/chrome.js and public/forms.js.
const EVT = '[data-ev="sub_oak_hill"]';
S["manage-events"] = { id: "manage-events", file: "post-manage-events", cookie: ck.u_mine, routes: NOCFG, ...MAPSPEC, steps: [
  hook(EP, "Manage your events", "Edit an event, add photos, and mark it cancelled", "In this video, you will add photos to an event you posted, and learn where to find your events. We start on the map."),
  ...openShort(),
  ...navSteps([
    target("Tap your account circle", "Look at the top of the map, beside the search box. See your picture, or your initial, in a circle? Tap it.", "#acctbtn", { after: 1600 }),
    target("Tap Your events", "In the menu, tap Your events. It opens the events you added.", '.acctmenu a[role="menuitem"][href="/profile#events"]', { after: 2600 }),
  ]),
  { cap: "Your event", say: "Here is your event. It says whether it is on the map, and it shows the buttons for it.", do: async (p, h) => { await p.locator(EVT).first().waitFor({ timeout: 15000 }); await h.hover(EVT, 2200); }, pad: 0.4 },
  target("Tap Edit", "Tap Edit.", `${EVT} [data-medit]`, { after: 2200 }),
  { cap: "The Photos box", say: "Find the Photos box. You can add up to four photos. Photos are saved right away, so you do not need to tap Save.", do: async (p, h) => { await p.locator("[data-pbox]").first().waitFor({ timeout: 15000 }); await h.scrollTo("[data-pbox]", 240).catch(() => {}); await h.hover("[data-pbox]", 2400); }, pad: 0.4 },
  { cap: "Tap Add photos", say: "Tap Add photos, and choose pictures from your phone or computer.", do: async (p, h) => { const [fc] = await Promise.all([p.waitForEvent("filechooser"), h.click("[data-pbox] label.btn", { after: 300 })]); await fc.setFiles([PHOTO("stock/tree-3.jpg"), PHOTO("stock/walk-2.jpg"), PHOTO("stock/tree-1.jpg")]); await p.locator("[data-pbox] .t").first().waitFor({ timeout: 20000 }); await sleep(3200); }, pad: 0.4, poster: true },
  { cap: "The cover photo", say: "The first photo is the cover. It is the picture on the map list and at the top of your event page. To use a different one, tap Cover on it.", do: async (p, h) => { await h.hover("[data-pbox] .t >> nth=0", 1800); await h.click("[data-pbox] [data-ph-cover] >> nth=0", { after: 1800 }); }, pad: 0.4 },
  { cap: "Remove a photo", say: "To take a photo off, tap the x on it.", do: async (p, h) => { await h.hover("[data-pbox] [data-ph-rm] >> nth=2", 1800); }, pad: 0.4 },
  { cap: "Photos show first", say: "Your photos show first on the map and on the event page, credited to the organizer. If you remove them all, the picture from your event's web page comes back.", do: async (p, h) => { await sleep(2600); }, pad: 0.4 },
  { cap: "Cancel or postpone", say: "If your event is cancelled or postponed, choose that on the event, so visitors do not drive out for nothing. You can clear it later.", do: async (p, h) => { const f = await p.$(`${EVT} [data-mcancel]`); if (f) await f.click(); await sleep(900); await h.hover(`${EVT} [data-notice]`, 2200).catch(() => {}); }, pad: 0.5 },
  recap(EP, "Manage your events", ["Account circle, then Your events", "Tap Edit on an event", "Add up to four photos; the first is the cover", "Mark it cancelled or postponed"], "That is how you manage an event you posted. Your photos show first on the map and on the event page."),
  nextUp(EP, "Show off your home", "Put your lights on the map with Showcase a House"),
]};

const id = process.argv[2];
if (id) { if (!S[id]) throw new Error("no video " + id); await record(S[id]); }
