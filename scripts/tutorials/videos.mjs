// All 25 tutorial videos, built to docs/tutorial-standard.md. Usage: node scripts/tutorials/videos.mjs <id>
// VOICE, COOKIES, LOGO, PLAYWRIGHT_PATH, LENGTH_SCALE as in docs/tutorials.md.
import { readFileSync } from "node:fs";
import { record, sleep } from "./record.mjs";
import { end as endCard, navSteps, openSite, openShort, hook, recap, emailScene, MAPSPEC } from "./steps.mjs";
import { renderTemplate } from "../../functions/_lib/mailtpl.js";
const ck = JSON.parse(readFileSync(process.env.COOKIES, "utf8")), SLUG = "maple-street-holiday-lights-2026", BASE = process.env.BASE || "http://localhost:8788";
const PAGE = "https://socallights.app/c/" + SLUG, NEXT = "#nextbtn", nav = (k) => `[data-k="${k}"] >> visible=true`;
const next = (p, h) => h.click(NEXT, { after: 1400 });
const V = { contest: "Maple Street Holiday Lights 2026", org: "Maple Street Neighbors" };
const mails = {
  judge: await renderTemplate({}, "judge_invite", { ...V, how: "Score every home from 1 to 10 in each category.", link: PAGE + "/judge" }),
  coorg: await renderTemplate({}, "coorg_invite", { ...V, link: PAGE + "/manage" }),
  neighbor: await renderTemplate({}, "contest_invite", { ...V, city: "Irvine", link: PAGE, note: "Come enter your house, or vote for your favorites. Cocoa on the corner Saturday at 6.", contact: "maria@demo.example" }),
};
const nextUp = (ey, t, s) => endCard(ey, t, s);
const target = (cap, say, sel, o = {}) => ({ cap, say, target: sel, after: o.after ?? 1200, ...o });
// map -> three dots -> menu item -> more
const fromMap = (which, more = []) => navSteps([
  target("Tap the three dots", "Look at the top right corner of the map. See the three dots? Tap them.", "#morebtn", { after: 900 }),
  target(`Tap ${{ add: "Add", contests: "Contests", tutorials: "Tutorials" }[which]}`, `In the menu, tap ${{ add: "Add", contests: "Contests" }[which]}.`, `#moremenu a[href="/${which}"]`),
  ...more,
]);
const toDash = (ey) => [...openShort(), ...fromMap("contests", [
  target("Tap Mine", "Tap Mine. These are the contests you run.", "[data-tab=mine]", { after: 1200 }),
  target("Tap Manage", "Tap Manage, next to your contest. This is your dashboard.", `a[href="/c/${SLUG}/manage"]`, { after: 2000 }),
])];
const panel = (k, name, say) => target("Tap " + name, say, nav(k), { after: 1500 });
const org = (id, file, ey) => ({ id, file, cookie: ck.u_org, ...MAPSPEC });
const S = {}; // specs by video id

// ---------------- Find and plan ----------------
const EF = "Find and plan";
S.map = { id: "map", file: "find-map", cookie: null, ...MAPSPEC, steps: [
  hook(EF, "Find lights near you", "The map, seasons and filters", "In two minutes, you will find the lights and events near you. We start on the map."),
  ...openSite(),
  target("Tap the season button", "Choose a season. Tap the season button at the top.", "#seasonbtn", { after: 800 }),
  target("Tap Thanksgiving and Christmas Lights", "Tap Thanksgiving and Christmas Lights.", '[data-sp]:has-text("Christmas")', { after: 1500 }),
  { cap: "Search a city", say: "Or search for a city. Type its name, and tap it in the list.", do: async (p, h) => { await h.type("#q", "Irvine"); }, target: 'button:has-text("Show this city on the map")', after: 1800 },
  target("Tap the season button", "Want everything coming up? Open the season button again.", "#seasonbtn", { after: 800 }),
  target("Tap All seasons", "Tap All seasons. It shows every upcoming event for that city.", '[data-sp="all"]', { after: 1800 }),
  target("Tap Filters", "To narrow the list, tap Filters. You can pick a date, a distance, a type, and more.", "text=Filters >> visible=true", { after: 1500, poster: true }),
  recap(EF, "You can now find lights near you", ["Use my location for distances", "Pick a season, or All seasons", "Search a city, and use Filters"], "That is how you find lights near you. Use your location, pick a season, search a city, and narrow it with Filters."),
  nextUp(EF, "Plan a night", "Save favorites, build a route, share it and add it to your calendar"),
]};
S.night = { id: "night", file: "find-night", cookie: null, ...MAPSPEC, steps: [
  hook(EF, "Plan a night of lights", "Hearts, route, share, calendar", "In two minutes, you will plan a night of lights, and get a driving route. We start on the map."),
  ...openShort(),
  target("Tap the season button", "Choose what you want to see. Tap the season button.", "#seasonbtn", { after: 800 }),
  target("Tap Thanksgiving and Christmas Lights", "Tap Thanksgiving and Christmas Lights.", '[data-sp]:has-text("Christmas")', { after: 1500 }),
  { cap: "Tap the heart", say: "On a place you want to visit, tap the heart. Add three.", do: async (p, h) => { await h.click("#pbody .item .star >> nth=0", { after: 800 }); await h.click("#pbody .item .star >> nth=1", { after: 800 }); }, target: "#pbody .item .star >> nth=2", after: 1200, poster: true },
  target("Tap My night", "Tap My night. Your stops are here, in a sensible driving order, with the miles and the time.", "#t-plan", { after: 1600 }),
  { cap: "Open route", say: "Choose your maps app, and tap Open route. Your maps app takes you there.", do: async (p, h) => { await h.hover("#mapsSel", 900); }, target: ".qgo", after: 0, post: async (p) => { await p.keyboard.press("Escape"); } },
  { cap: "Share", say: "Tap Share to send your night to a friend.", target: "[data-nshare]", after: 800 },
  recap(EF, "Your night is planned", ["Tap the heart on places you like", "My night builds the route", "Open it in your maps app, or share it"], "Tap the heart on places you like. My night builds the route. Then open it in your maps app, or share it."),
  nextUp(EF, "Weekly lights email", "Sign up for the weekly email and unsubscribe any time"),
]};
const confirmText = "Confirm that you want a weekly email of lights and events within 10 miles of Irvine:\n\nhttps://socallights.app/api/alerts/confirm?t=demo-confirm-token\n\nIf you did not ask for this, ignore this email and nothing will be sent.\n\nSoCal Lights · socallights.app";
S.email = { id: "email", file: "find-email", cookie: null, ...MAPSPEC, routes: [{ url: "**/api/config", json: {} }, { url: "**/api/alerts", json: { ok: true } }], steps: [
  hook(EF, "Get the lights in your inbox", "The weekly email", "In one minute, you will sign up for one email a week with the lights near you. We start on the map."),
  ...openShort(),
  ...navSteps([
    target("Tap the three dots", "Look at the top right corner of the map. See the three dots? Tap them.", "#morebtn", { after: 900 }),
    target("Tap Weekly lights email", "In the menu, tap Weekly lights email.", '[data-m="alerts"]', { after: 1400 }),
  ]),
  { cap: "Type your email", say: "Type your email address, and your city. Then tick the box to agree.", do: async (p, h) => { await h.type("#alEmail", "neighbor@example.com"); await h.type("#alCity", "Irvine"); }, target: "#alOk", after: 1000, poster: true },
  target("Tap Sign up", "Tap Sign up.", ".alsend", { after: 2200 }),
  { ...emailScene({ subject: "Confirm your SoCal Lights alerts", html: undefined }, "We send you an email to confirm. Nothing is sent until you do. Tap the link in it.", "neighbor@example.com"), mail: { subject: "Confirm your SoCal Lights alerts", text: confirmText, to: "neighbor@example.com", note: "Example email" }, target: '#__mail a[href*="alerts/confirm"]', after: 2400 },
  { cap: "You are signed up", say: "That is it. Every weekly email ends with a link to stop. One tap, and you are off the list.", do: async (p, h) => { await sleep(1500); }, pad: 0.8 },
  nextUp(EF, "Install the app and use it offline", "Add SoCal Lights to your phone and use it without a connection"),
]};
S.app = { id: "app", file: "find-app", phone: true, warm: true, cookie: null, start: "/", steps: [
  hook(EF, "Put SoCal Lights on your phone", "Install it, and use it offline", "In one minute, you will put SoCal Lights on your phone, and see what works with no signal."),
  { cap: "Open the site on your phone", say: "On your phone, open your web browser, and go to SoCal Lights dot app. There is nothing to download from an app store.", do: async (p, h) => { await h.hover("#q", 900); } },
  { card: { ey: "On an iPhone", title: "Share, then Add to Home Screen", sub: "In Safari, tap the Share button, scroll down, and tap Add to Home Screen" }, say: "On an iPhone, use Safari. Tap the Share button, scroll down, and tap Add to Home Screen.", pad: 1.0 },
  { card: { ey: "On an Android phone", title: "Menu, then Install app", sub: "In Chrome, tap the three dots, then Install app or Add to Home screen" }, say: "On an Android phone, use Chrome. Tap the three dots, then tap Install app.", pad: 1.0 },
  { cap: "No signal", say: "With no signal, the app still opens. Your last list of places is saved on your phone.", do: async (p, h) => { await sleep(1500); await h.ctx.setOffline(true); await p.reload({ waitUntil: "domcontentloaded" }); await sleep(3000); }, poster: true },
  { cap: "Back online", say: "When your signal comes back, the app updates by itself.", do: async (p, h) => { await h.ctx.setOffline(false); await sleep(1200); }, pad: 0.6 },
  nextUp(EF, "Find contests", "Live now, Mine and Past results, and the Enter or vote button on a map card"),
]};
S.contests = { id: "contests", file: "find-contests", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(EF, "Find the contests", "Live now, Mine, and Past results", "In two minutes, you will find the neighborhood contests, and where to vote or enter. We start on the map."),
  ...openShort(),
  ...fromMap("contests"),
  target("Live now", "Live now lists the contests open today. You can vote, or enter your own home.", 'a:has-text("Enter my home")', { after: 800 }),
  target("Tap Mine", "Tap Mine. These are the contests you run, and the homes you entered.", "[data-tab=mine]", { after: 1400, poster: true }),
  target("Tap Past results", "Tap Past results, for finished contests and their winners.", "[data-tab=past]", { after: 1800 }),
  recap(EF, "Contests, found", ["Three dots, then Contests", "Live now, Mine, and Past results", "Contests are on the map too"], "Three dots, then Contests. Live now, Mine, and Past results. And contests are on the map too."),
  nextUp(EF, "Find professionally installed displays", "Use the Professionally installed filter, then open an installer's profile"),
]};
S["pro-filter"] = { id: "pro-filter", file: "find-pro", cookie: null, ...MAPSPEC, steps: [
  hook(EF, "Find professionally installed displays", "Filter, then open the installer's profile", "In one minute, you will find displays that a lighting company installed. We start on the map."),
  ...openShort(),
  target("Tap the season button", "Tap the season button.", "#seasonbtn", { after: 800 }),
  target("Tap Thanksgiving and Christmas Lights", "Tap Thanksgiving and Christmas Lights.", '[data-sp]:has-text("Christmas")', { after: 1500 }),
  target("Tap Filters", "Tap Filters.", "text=Filters >> visible=true", { after: 1500 }),
  target("Tap Professionally installed", "Under Type, tap Professionally installed.", '[data-ftype="pro"] >> visible=true', { after: 900 }),
  target("Show the places", "Tap the red button to show the places.", "text=/^Show \\d+ places?$/ >> visible=true", { after: 2200, poster: true }),
  target("Open a display", "Open one. It says Installed by, with the company's name.", "#pbody .item.home >> nth=0", { after: 2000 }),
  target("Tap the company name", "Tap the company's name to open its profile.", "a.instlink >> nth=0", { after: 2600 }),
  nextUp(EF, "Enter your home in a contest", "Sign in, add photos, your address and agree to the rules"),
]};

// ---------------- Enter a home ----------------
const EE = "Enter a home";
const PH = ["public/img/stock/tree-3.jpg", "public/img/stock/show-2.jpg"];
const chooser = (p) => p.once("filechooser", (fc) => fc.setFiles(PH));
S.enter = { id: "enter", file: "enter", cookie: ck.u_enter, ...MAPSPEC, steps: [
  hook(EE, "Enter your home in a contest", "Photos, address, and the rules", "In two minutes, you will enter your home in a neighborhood contest. We start on the map."),
  ...openShort(),
  ...fromMap("contests", [target("Tap Enter my home", "Under Live now, tap Enter my home. If you are not signed in, the site asks you to sign in with Google or your email first.", `a[href="/c/${SLUG}/enter"]`, { after: 2000 })]),
  { cap: "1 of 4: Add photos", say: "Add photos of your home. Tap Choose photos. The first photo is the cover.", pre: async (p) => chooser(p), target: "label[for=f-photos]", after: 2200 },
  target("Tap Next", "Tap Next.", NEXT, { after: 1400 }),
  { cap: "2 of 4: Your address", say: "Type your street address and ZIP code. Then tap Next.", do: async (p, h) => { await h.type("#f-street", "460 Maple Street"); await h.type("#f-zip", "92602"); }, target: NEXT, after: 1400 },
  { cap: "3 of 4: Name your entry", say: "Choose the name to show, for example, The Kim family. Then tap Next.", do: async (p, h) => { await h.type("#f-name", "The Kim family"); await h.type("#f-desc", "Colorful lights on the roof and a lit walkway."); }, target: NEXT, after: 1400 },
  { cap: "4 of 4: Agree and submit", say: "Tick the box to agree to the rules. Then tap Submit my entry.", target: '[data-k="rules"]', after: 800, post: async (p, h) => { await h.click(NEXT, { after: 2400 }); }, poster: true },
  { cap: "You are entered", say: "You are entered! The organizer reviews every entry before it goes on the map.", do: async (p, h) => { await sleep(1200); }, pad: 0.6 },
  nextUp(EE, "Edit or withdraw your entry", "Change your entry's name and description, or take it out"),
]};
S["edit-entry"] = { id: "edit-entry", file: "edit-entry", cookie: ck.u_mine, ...MAPSPEC, steps: [
  hook(EE, "Edit or withdraw your entry", "Change the name, or take it out", "In one minute, you will change your entry, then take it out of the contest. We start on the map."),
  ...openShort(),
  ...fromMap("contests", [target("Tap Mine", "Tap Mine. Under Homes you entered, tap Open contest.", "[data-tab=mine]", { after: 1200 }), target("Tap Open contest", "Tap Open contest.", `a[href="/c/${SLUG}"]:has-text("Open contest")`, { after: 2200 })]),
  target("Tap Edit", "Find Your home. Tap Edit name and description.", "[data-edit]", { after: 1000 }),
  { cap: "Change the name", say: "Change the name, then tap Save.", do: async (p, h) => { await h.type('[data-editform] [name="name"]', "Cole Family Christmas Village"); }, target: '[data-editform] button[type="submit"]', after: 2000, poster: true },
  target("Tap Withdraw", "To take your home out, tap Withdraw.", "[data-withdraw]", { after: 1000 }),
  target("Tap again to confirm", "It asks you to tap again, so you cannot do it by accident. Tap it again.", "[data-withdraw]", { after: 2000 }),
  nextUp(EE, "Your profile", "Badges, saved drafts and deleting your account"),
]};
S.profile = { id: "profile", file: "profile", cookie: ck.u_mine, ...MAPSPEC, steps: [
  hook(EE, "Your profile", "Drafts, badges, and your account", "In one minute, you will find your saved drafts, your badges, and your account. We start on the map."),
  ...openShort(),
  ...navSteps([target("Tap the person icon", "Look at the top of the map. Tap the person icon.", "#acctbtn", { after: 2000 })]),
  target("Drafts", "Drafts lists anything you started and saved. You can finish it on any device.", "text=Our new light show", { after: 600, poster: true }),
  target("Tap Badges", "Tap Badges. Winners keep a crown, and the awards your home has won are listed here.", nav("badges"), { after: 1800 }),
  target("Tap Account", "Tap Account. This is where you change your name and photo, and delete your account.", nav("account"), { after: 1400 }),
  recap(EE, "That is your profile", ["Drafts you saved", "Badges you won", "Account, and Delete my account"], "That is your profile: your drafts, your badges, and your account."),
  nextUp(EE, "Vote in a contest", "Pick one favorite in each category and share the contest"),
]};

// ---------------- Vote and judge ----------------
const EV = "Vote and judge";
S.vote = { id: "vote", file: "vote", cookie: ck.u_voter, ...MAPSPEC, steps: [
  hook(EV, "Vote for your favorite homes", "One favorite in each category", "In two minutes, you will vote for your favorite homes in a neighborhood contest. We start on the map."),
  ...openShort(),
  ...fromMap("contests", [target("Tap Vote", "Under Live now, tap Vote. The first time, the site asks you to sign in. That keeps it to one vote per person.", `a[href="/c/${SLUG}"]:has-text("Vote")`, { after: 2200 })]),
  { cap: "Visit the homes", say: "Want to see the homes first? Visit the homes puts them in a few driving routes, in your maps app.", do: async (p, h) => { await h.scrollTo("[data-tour]", 90); await h.hover("[data-tour] .leg", 900); } },
  target("Best Traditional", "Every home is in every category. In Best Traditional, tap Vote on your favorite.", `[data-vote="p_garcia"]`, { after: 2000, poster: true, pre: async (p, h) => { await h.scrollTo(".vrow", 120); } }),
  target("Most Creative", "The next category opens by itself. Tap Vote on your favorite creative display.", `[data-vote="p_patel"]`, { after: 2000, pre: async (p, h) => { await h.scrollTo(".vrow", 120); } }),
  target("Best Animated", "Last, Best Animated. Tap your favorite.", `[data-vote="p_nguyen"]`, { after: 2000, pre: async (p, h) => { await h.scrollTo(".vrow", 120); } }),
  target("Share this contest", "Thanks for voting! You can change your vote until voting closes. Tap Share this contest to send it to a neighbor.", "#sharec", { after: 1200, pre: async (p, h) => { await h.scrollTo("#sharec", 300); } }),
  nextUp(EV, "Judge a contest", "Open your judge link, score each home, and recuse yourself when you know the household"),
]};
S.judge = { id: "judge", file: "judge", cookie: ck.u_judge, start: "/offline.html", steps: [
  hook(EV, "Judge a contest", "From your invitation email", "In two minutes, you will score the homes in a contest, starting from your invitation email."),
  emailScene(mails.judge, "This is your invitation email. It says which contest it is, and how judging works. Tap Open my judges' ballot.", "dana@demo.example"),
  { cap: "Tap Open my judges' ballot", say: "", mail: "keep", target: '#__mail a[href*="/judge"] >> nth=0', after: 2600, pad: 0.1 },
  { cap: "Your ballot", say: "This is your ballot. It says when voting closes, and how many scores you have given.", do: async (p, h) => { await h.hover(".status", 900); } },
  target("Visit the homes", "Tap Visit the homes to see the homes in a few driving routes, before you score.", nav("tour"), { after: 1600 }),
  target("Tap a category", "Tap a category. Every home is in every category.", nav("c0"), { after: 1600 }),
  target("I know this household", "Know a household? Tap I know this household. That home is skipped.", `[data-conf="p_okafor"]`, { after: 1600, poster: true }),
  { cap: "Score each home", say: "Score each of the other homes, one to ten.", do: async (p, h) => { for (const [id, n] of [["p_garcia", "9"], ["p_patel", "8"], ["p_nguyen", "7"]]) { const sel = `[data-score="${id}|Best Traditional"]`; await h.move(sel); await p.selectOption(sel, n); await h.unring(); await sleep(800); } } },
  target("Tap Ballot", "Tap Ballot to see your progress. Your scores stay private until winners are announced.", nav("ballot"), { after: 1400 }),
  nextUp(EV, "Create a contest in two minutes", "The short setup: seven screens"),
]};
export { S, ck, SLUG, BASE, hook, recap, nextUp, target, fromMap, toDash, panel, next, nav, PH, mails, MAPSPEC, EF, EE, EV, org, emailScene };
