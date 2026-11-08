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
  target("Tap the three dots", "Now look at the top of the map, beside the search box. See the three dots? That is the menu, and it is the doorway to everything else on the site. Tap them.", "#morebtn", { after: 900 }),
  target(`Tap ${{ add: "Add", contests: "Contests", tutorials: "Tutorials" }[which]}`, `In the menu, tap ${{ add: "Add", contests: "Contests" }[which]}.` + ({ add: " That is where you add anything new: an event, a contest, or your own house.", contests: " That is where every neighborhood contest lives: the ones you can vote in, enter, or run." }[which] || ""), `#moremenu a[href="/${which}"]`),
  ...more,
]);
const toDash = (ey) => [...openShort(), ...fromMap("contests", [
  target("Tap Mine", "Tap Mine. This is your personal page. It lists the contests you run, if you run any, and the homes you entered, with their status.", "[data-tab=mine]", { after: 1200 }),
  target("Tap Manage", "Tap Manage, next to your contest. This opens your dashboard, the control room for your contest.", `a[href="/c/${SLUG}/manage"]`, { after: 2000 }),
])];
const panel = (k, name, say) => target("Tap " + name, say, nav(k), { after: 1500 });
const org = (id, file, ey) => ({ id, file, cookie: ck.u_org, ...MAPSPEC });
const S = {}; // specs by video id

// ---------------- Find and plan ----------------
const EF = "Find and plan";
S.map = { id: "map", file: "find-map", cookie: null, ...MAPSPEC, steps: [
  hook(EF, "Find lights near me", "The map, seasons and filters", "In this video, you will learn how to find holiday lights and events near you. We will cover the season buttons, searching by city, getting driving routes, and narrowing the list with filters. We start on the map."),
  ...openSite(undefined, true),
  target("Tap the season button", "The map shows different things at different times of the year, so first choose a season. Tap the season button at the top. It shows what is on right now.", "#seasonbtn", { after: 800 }),
  target("Tap Thanksgiving and Christmas Lights", "Pick the one you want. Christmas lights are the biggest, so tap Thanksgiving and Christmas Lights. Halloween, New Year, and other seasons are in the same list.", '[data-sp]:has-text("Christmas")', { after: 1500 }),
  { cap: "Search a city", say: "You can also search for a city. Type its name, and tap it in the list. The map jumps there, which is handy if you are planning a trip to a different part of Southern California.", do: async (p, h) => { await h.type("#q", "Irvine"); }, target: 'button:has-text("Show this city on the map")', after: 1800 },
  target("Tap Route these", "To drive to what you see, tap Route these, the button on the map. On a computer it sits in the top bar, and on a phone, just above the list. It puts the places in view into driving order. It works for up to forty five places at a time, so zoom in if there are more.", "[data-route]", { after: 1800 }),
  { cap: "Routes of 9 or fewer", say: "Your maps app can only take about nine stops at a time, so a long list is split into routes of nine or fewer. Each route starts where the last one ended, so you do not have to plan the break. Each route opens in Apple Maps, Google Maps, or Waze. On a phone, the site asks which one the first time, and remembers your answer. And you can tick off places as you go, so you can pick up where you left off. Tap the X to close.", do: async (p, h) => { await h.hover(".rsheet .leg", 1400); }, target: "[data-rsx]", after: 1000 },
  target("Tap Filters", "To narrow the list, tap Filters. You can pick a date, like tonight or this weekend, a city and how far from it to look, a county, free or ticketed, a type, such as home displays, and whether you can walk by a home. Use it when the list is too long to scan.", "text=Filters >> visible=true", { after: 3200, poster: true }),
  recap(EF, "You can now find lights near you", ["Use my location for distances", "Pick a season", "Search a city, and use Filters"], "That is how you find lights near you. Allow your location, so distances and directions work. Pick a season. Search a city. And narrow the list with Filters. In the next video, we will plan a whole night."),
  nextUp(EF, "Plan a night", "Save favorites, build a route and share it"),
]};
S.night = { id: "night", file: "find-night", cookie: null, ...MAPSPEC, steps: [
  hook(EF, "Plan a night of lights", "Favorites, route, share", "In this video, you will plan a whole evening of lights. You will save the places you like, put them in a sensible driving order, and send the route to your maps app. We start on the map."),
  ...openShort(),
  target("Tap the season button", "Let's plan a night. First, choose what you want to see. Tap the season button.", "#seasonbtn", { after: 800 }),
  target("Tap Thanksgiving and Christmas Lights", "Pick the one you want. Christmas lights are the biggest, so tap Thanksgiving and Christmas Lights. Halloween, New Year, and other seasons are in the same list.", '[data-sp]:has-text("Christmas")', { after: 1500 }),
  { cap: "Tap the heart", say: "When you see a place you want to visit, tap the heart on its card. That saves it to your favorites. Add a few. I will add three.", do: async (p, h) => { await h.click("#pbody .item .star >> nth=0", { after: 800 }); await h.click("#pbody .item .star >> nth=1", { after: 800 }); }, target: "#pbody .item .star >> nth=2", after: 1200, poster: true },
  target("Tap Favorites", "Now tap the heart tab, Favorites. Your hearts are collected here. The stops are put in a sensible driving order, with the miles and the time they add up to, so you do not zigzag across town.", "#t-plan", { after: 1600 }),
  target("Tap Route these", "You can choose where to start, and which maps app to use. When you are ready to go, tap Route these.", "[data-nroute]", { after: 1800 }),
  { cap: "Routes of 9 or fewer", say: "Your maps app takes about nine stops at a time, so a long night is split into routes of nine or fewer. Each route starts where the last one ended. A route with nine stops or fewer is a single route.", do: async (p, h) => { await h.hover(".rsheet .leg", 1400); } },
  target("Tick a stop", "As you go, tick each stop when you have been there. That way, if you stop for dinner, or save the rest for another night, you can see exactly where you left off.", ".rsheet [data-tvis] >> nth=0", { after: 1200 }),
  { cap: "Open a route in your maps app", say: "Each route has its own button, and it opens in your maps app, ready for turn by turn directions. You can choose Apple Maps, Google Maps, or Waze, and the change button next to Opens in switches between them. On a phone, the site asks the first time, and remembers your choice. Waze takes one stop at a time, so it starts with the first stop. Phones also show a Send to car button on each stop. Then tap the X to close.", do: async (p, h) => { await h.hover(".rsheet .legbtn", 1000); }, target: "[data-rsx]", after: 1000 },
  { cap: "Share", say: "Planning with family or friends? Tap Share to send your favorites to them. They can open the same list on their own phone, and add it to their own favorites.", target: "[data-nshare]", after: 800 },
  recap(EF, "Your night is planned", ["Tap the heart on places you like", "Route these splits it into routes of 9 or fewer", "Tick off stops as you go"], "Tap the heart on places you like. Route these splits your night into routes of nine or fewer, each starting where the last one ended. Tick off stops as you go."),
  nextUp(EF, "Weekly lights email", "Sign up for the weekly email and unsubscribe any time"),
]};
const confirmText = "Confirm that you want a weekly email of lights and events within 10 miles of Irvine:\n\nhttps://socallights.app/api/alerts/confirm?t=demo-confirm-token\n\nIf you did not ask for this, ignore this email and nothing will be sent.\n\nSoCal Lights · socallights.app";
S.email = { id: "email", file: "find-email", cookie: null, ...MAPSPEC, routes: [{ url: "**/api/config", json: {} }, { url: "**/api/alerts", json: { ok: true } }], steps: [
  hook(EF, "Get the lights in your inbox", "The weekly email", "In this video, you will sign up for the weekly lights email, one short email a week with the lights and events near a city you choose. It is free, and you can stop it any time. We start on the map."),
  ...openShort(),
  ...navSteps([
    target("Tap the three dots", "Now look at the top of the map, beside the search box. See the three dots? That is the menu, and it is the doorway to everything else on the site. Tap them.", "#morebtn", { after: 900 }),
    target("Tap Weekly lights email", "In the menu, tap Weekly lights email.", '[data-m="alerts"]', { after: 1400 }),
  ]),
  { cap: "Type your email", say: "Type your email address, then your city. We use the city to choose which lights and events to send you. You can also choose how far from the city to look: five, ten, or twenty five miles. Then tick the box to agree to get the email. It is a free email, once a week, and nothing else.", do: async (p, h) => { await h.type("#alEmail", "neighbor@example.com"); await h.type("#alCity", "Irvine"); }, target: "#alOk", after: 1000, poster: true },
  target("Tap Sign up", "Tap Sign up.", ".alsend", { after: 2200 }),
  { ...emailScene({ subject: "Confirm your SoCal Lights alerts", html: undefined }, "We send you an email to confirm. Nothing is sent until you do, and that protects you from anyone signing you up by mistake. Open it, and tap the link.", "neighbor@example.com"), mail: { subject: "Confirm your SoCal Lights alerts", text: confirmText, to: "neighbor@example.com", note: "Example email" }, target: '#__mail a[href*="alerts/confirm"]', after: 2400 },
  { cap: "You are signed up", say: "That is it. You will get one email a week with the lights and events near you. And every email ends with a link to stop. One tap, and you are off the list, no questions asked.", do: async (p, h) => { await sleep(1500); }, pad: 0.8 },
  nextUp(EF, "Install the app and use it offline", "Add SoCal Lights to your phone and use it without a connection"),
]};
S.app = { id: "app", file: "find-app", phone: true, warm: true, cookie: null, start: "/", steps: [
  hook(EF, "Put SoCal Lights on your phone", "Install it, and use it offline", "In this video, you will put SoCal Lights on your phone like an app, and see what still works when you have no signal, which happens a lot when you are driving around looking at lights."),
  { card: { ey: "Start here", title: "On your phone, open your web browser and go to", urlbar: "socallights.app" }, say: "On your phone, open your web browser, and go to SoCal Lights dot app. This works on any phone.", pad: 0.8 },
  { cap: "This is the home page", say: "This is the home page. There is nothing to download from an app store. You add the site to your Home Screen, and it opens like any other app, full screen, with its own icon.", do: async (p, h) => { await h.hover("#q", 900); } },
  { card: { ey: "On an iPhone", title: "Share, then Add to Home Screen", sub: "In Safari, tap the Share button, scroll down, and tap Add to Home Screen" }, say: "On an iPhone, use Safari. Tap the Share button, the square with an arrow. Scroll down, and tap Add to Home Screen. Then tap Add.", pad: 1.0 },
  { card: { ey: "On an Android phone", title: "Menu, then Install app", sub: "In Chrome, tap the three dots, then Install app or Add to Home screen" }, say: "On an Android phone, use Chrome. Tap the three dots, then tap Install app, or Add to Home screen.", pad: 1.0 },
  { cap: "No signal", say: "Now the useful part. With no signal, the app still opens, because the site saves your last list of places on your phone. So when you are out looking at lights, in a part of town with weak coverage, you can still see what you were looking at.", do: async (p, h) => { await sleep(1500); await h.ctx.setOffline(true); await p.reload({ waitUntil: "domcontentloaded" }); await sleep(3000); }, poster: true },
  { cap: "Back online", say: "When your signal comes back, the app updates by itself, with the latest events. You do not have to do anything.", do: async (p, h) => { await h.ctx.setOffline(false); await sleep(1200); }, pad: 0.6 },
  nextUp(EF, "Find contests", "Live now, Mine and Past results, and the Enter or vote button on a map card"),
]};
S.contests = { id: "contests", file: "find-contests", cookie: ck.u_org, ...MAPSPEC, steps: [
  hook(EF, "Find the contests", "Live now, Mine, and Past results", "In this video, you will find the neighborhood contests, where you can vote for your favorite homes, enter your own, or see who won. We start on the map."),
  ...openShort(),
  ...fromMap("contests"),
  { cap: "Live now", say: "Live now lists the contests that are open today. On each one, you can vote for your favorite homes, or enter your own home. Voting and entering each have their own dates, shown on the card, so a contest shows what you can do right now.", do: async (p, h) => { await h.hover('a:has-text("Enter my home")', 1000); } },
  target("Tap Mine", "Tap Mine. This is your personal page. It lists the contests you run, if you run any, with buttons to manage them or view them, and the homes you entered, with their status.", "[data-tab=mine]", { after: 1400, poster: true }),
  target("Tap Past results", "Tap Past results, for contests that are finished. You can see the winners in every category, and look back at earlier years.", "[data-tab=past]", { after: 1800 }),
  recap(EF, "Contests, found", ["Account circle, then Your contests", "Live now, Mine, and Past results", "Contests are on the map too"], "That is the Contests page: Live now, Mine, and Past results. Contests also show up on the map as cards, with a link to enter your home or vote, so you may find one without ever opening this page. If you are not signed in, the same page is under the three dots, then Contests."),
  nextUp(EF, "Find professionally installed homes", "Use the Professionally installed filter, then open an installer's profile"),
]};
S["pro-filter"] = { id: "pro-filter", file: "find-pro", cookie: null, ...MAPSPEC, steps: [
  hook(EF, "Find professionally installed homes", "Filter, then open the installer's profile", "In this video, you will find homes that a professional lighting company installed, and look at the company behind them. We start on the map."),
  ...openShort(),
  target("Tap the season button", "Tap the season button.", "#seasonbtn", { after: 800 }),
  target("Tap Thanksgiving and Christmas Lights", "Pick the one you want. Christmas lights are the biggest, so tap Thanksgiving and Christmas Lights. Halloween, New Year, and other seasons are in the same list.", '[data-sp]:has-text("Christmas")', { after: 1500 }),
  target("Tap Filters", "Tap Filters.", "text=Filters >> visible=true", { after: 1500 }),
  target("Tap Professionally installed", "Under Type, tap Professionally installed. This shows only homes that a lighting company put up, which is great if you are thinking of hiring one for your own home.", '[data-ftype="pro"] >> visible=true', { after: 900 }),
  target("Show the places", "Tap the button at the bottom, Show places, with the number of places it found.", "text=/^Show \\d+ places?$/ >> visible=true", { after: 2200, poster: true }),
  target("Open a home", "Open one of the places. It says Installed by, with the company's name. A check mark means the company has confirmed it.", "#pbody .item >> nth=0", { after: 2000 }),
  { cap: "Tap the company name", say: "Tap the company's name to open its profile.", do: async (p, h) => { await p.locator("a.instlink").first().evaluate((el) => el.scrollIntoView({ block: "center" })); await sleep(500); }, target: "a.instlink >> nth=0", after: 2400 },
  { cap: "The installer's profile", say: "This is the company's profile. It lists where they work, their phone number, and their website, along with every home they have installed, so you can see their work before you call.", do: async (p, h) => { await p.waitForURL(/\/installer\//, { timeout: 8000 }); await sleep(1200); }, pad: 0.8, poster: true },
  nextUp(EF, "Enter your home in a contest", "Sign in, add photos, your address and agree to the rules"),
]};

// ---------------- Enter a home ----------------
const EE = "Enter a home";
const PH = ["public/img/stock/tree-3.jpg", "public/img/stock/show-2.jpg"];
const chooser = (p) => p.once("filechooser", (fc) => fc.setFiles(PH));
S.enter = { id: "enter", file: "enter", cookie: ck.u_enter, ...MAPSPEC, steps: [
  hook(EE, "Enter your home in a contest", "Photos, address, and the rules", "In this video, you will enter your home in a neighborhood contest. It is a short step by step form: photos, your address, and a name, and then you agree to the rules. It takes just a few minutes. We start on the map."),
  ...openShort(),
  ...fromMap("contests", [target("Tap Enter my home", "Under Live now, find the contest, and tap Enter my home. If you are not signed in yet, the form starts with a sign in step, with Google, or with your email. That keeps people from entering on someone else's behalf. This video picks up after you sign in.", `a[href="/c/${SLUG}/enter"]`, { after: 2000 })]),
  { cap: "Step 1: Add photos", say: "The form takes you one screen at a time. First, photos. Show the lights at their best, so take them at night with everything on. Tap Choose photos. You can pick up to eight, and the first one becomes the cover photo that people see first.", pre: async (p) => chooser(p), target: "label[for=f-photos]", after: 2200 },
  target("Tap Next", "Tap Next.", NEXT, { after: 1400 }),
  { cap: "Step 2: Your address", say: "Next, your address. The city is already set to the contest's city. If your home is somewhere else, there is a link to change it. Type your street address and ZIP code. This is where the pin goes on the map, and visitors will see it so they can drive by, so only enter an address you are happy to share.", do: async (p, h) => { await h.type("#f-street", "460 Maple Street"); await h.type("#f-zip", "92602"); }, target: NEXT, after: 1400 },
  { cap: "Step 3: Name your entry", say: "Now the name to show. This is how your entry appears to voters, for example, The Kim family. You can add a line about your home, like, the roof is synchronized to music. It is optional, but it helps neighbors choose.", do: async (p, h) => { await h.type("#f-name", "The Kim family"); await h.type("#f-desc", "Colorful lights on the roof and a lit walkway."); }, target: NEXT, after: 1400 },
  { cap: "Step 4: Agree and submit", say: "The last screen lists what you entered. Each line has an Edit link, if you spot a mistake. Tick the box to agree to the official rules, which you can read first. Then tap Submit my entry.", target: '[data-k="rules"]', after: 800, post: async (p, h) => { await h.click(NEXT, { after: 2400 }); }, poster: true },
  { cap: "You are entered", say: "You are entered! Organizers choose whether entries go on the map right away, or whether they review each one first. In this contest, the organizer reviews each entry, so it may take a little while to appear, and you will get an email when it is approved. You can enter more than one home, up to five in each contest, with Enter another home. And you can come back to edit your entry, which we cover next.", do: async (p, h) => { await sleep(1200); }, pad: 0.6 },
  nextUp(EE, "Edit or withdraw your entry", "Change your entry's name and description, or take it out"),
]};
S["edit-entry"] = { id: "edit-entry", file: "edit-entry", cookie: ck.u_mine, ...MAPSPEC, steps: [
  hook(EE, "Edit or withdraw your entry", "Change the name, or take it out", "In this video, you will change the name and description of your entry, and then see how to take your home out of a contest, if you ever need to. We start on the map."),
  ...openShort(),
  ...fromMap("contests", [target("Tap Mine", "Tap Mine. Under Homes you entered, you will find your entry, and the contest it is in. Tap Open contest.", "[data-tab=mine]", { after: 1200 }), target("Tap Open contest", "Tap Open contest.", `a[href="/c/${SLUG}"]:has-text("Open contest")`, { after: 2200 })]),
  target("Tap Edit", "Find the card called Your home. This is where you manage your entry. Tap Edit name and description.", "[data-edit]", { after: 1000 }),
  { cap: "Change the name", say: "Change the name, or add a better description, then tap Save. You can do this any time while the contest is open.", do: async (p, h) => { await h.type('[data-editform] [name="name"]', "Cole Family Christmas Village"); }, target: '[data-editform] button[type="submit"]', after: 2000, poster: true },
  target("Tap Withdraw", "If you ever need to take your home out of the contest, tap Withdraw.", "[data-withdraw]", { after: 1000 }),
  target("Tap again to confirm", "It asks you to tap again, so you cannot do it by accident. Once you do, your home leaves the contest and the map.", "[data-withdraw]", { after: 2000 }),
  nextUp(EE, "Your profile", "Badges, saved drafts and deleting your account"),
]};
S.profile = { id: "profile", file: "profile", cookie: ck.u_mine, ...MAPSPEC, steps: [
  hook(EE, "Your profile", "Drafts, contests, badges, and your account", "In this video, you will tour your profile: your saved drafts, your contests, the badges your home has won, and your account settings. We start on the map."),
  ...openShort(),
  ...navSteps([
    target("Tap your account circle", "Your profile is two taps from the map. Look at the top of the map, and tap your picture, or your initial, in the circle.", "#acctbtn", { after: 1200 }),
    target("Tap Your profile", "In the menu, tap Your profile.", '.acctmenu a[href="/profile"]', { after: 2000 }),
  ]),
  target("Drafts", "This is your profile. At the top is your picture, or your initial, with a button to add or change your photo. Below it, Drafts lists anything you started and saved, like an event or a contest you did not finish. Because it is saved to your account, you can finish it later, on any device.", "text=Our new light show", { after: 600, poster: true }),
  target("Tap Contests", "Tap Contests. This lists the contests you run, with buttons to manage each one or view its page, and below that, the homes you entered in other people's contests, with where each one stands. Displays and Events, the next two tabs, list the homes and events you posted.", nav("contests"), { after: 1800 }),
  target("Tap Badges", "Tap Badges. When your home wins a contest, it earns a badge, and a crown on the map. All the awards your home has won are listed here, from every year.", nav("badges"), { after: 1800 }),
  target("Tap Account", "Tap Account. This is where you change your name, city, and address. They are optional, they fill in forms for you, and they are never shown publicly. You can also choose the monthly update email, sign out, and, at the bottom, delete your account, along with everything tied to it, if you ever want to.", nav("account"), { after: 1400 }),
  recap(EE, "That is your profile", ["Drafts you saved", "Contests you run and entered", "Badges you won", "Account, and Delete my account"], "That is your profile: your drafts, your contests, your badges, and your account. If you ever need help, there is a Help Center in the menu, with written steps for everything in these videos."),
  nextUp(EE, "Vote in a contest", "Pick one favorite in each category and share the contest"),
]};

// ---------------- Vote and judge ----------------
const EV = "Vote and judge";
S.vote = { id: "vote", file: "vote", cookie: ck.u_voter, ...MAPSPEC, steps: [
  hook(EV, "Vote for your favorite homes", "One favorite in each category", "In this video, you will vote for your favorite homes in a neighborhood contest, and see how voting works, so you know your vote counts. We start on the map."),
  ...openShort(),
  ...fromMap("contests", [target("Tap Vote", "Under Live now, find the contest, and tap Vote. The first time, the site asks you to sign in. That keeps it fair, with one vote per person in each category.", `a[href="/c/${SLUG}"]:has-text("Vote")`, { after: 2200 })]),
  { cap: "Visit the homes", say: "Want to see the homes in person before you decide? Tap Visit the homes. It splits the homes into routes of nine stops or fewer, and sends each one to your maps app. Each route starts where the last one ended, and you can tick off each home as you go.", do: async (p, h) => { await h.scrollTo("[data-tour]", 90); await h.hover("[data-tour] .leg", 900); } },
  target("Best Traditional", "Now the ballot. Every home is in every category, and you pick one favorite in each. Start with the first category, Best Traditional. Look through the homes, and tap Vote on your favorite.", `[data-vote="p_garcia"]`, { after: 2000, poster: true, pre: async (p, h) => { await h.scrollTo(".vrow", 120); } }),
  target("Most Creative", "The next category opens by itself. In Most Creative, tap Vote on the home you think is the most inventive.", `[data-vote="p_patel"]`, { after: 2000, pre: async (p, h) => { await h.scrollTo(".vrow", 120); } }),
  target("Best Animated", "And last, Best Animated. Tap your favorite.", `[data-vote="p_nguyen"]`, { after: 2000, pre: async (p, h) => { await h.scrollTo(".vrow", 120); } }),
  target("Share this contest", "Thanks for voting! Your votes are saved, and you can change any of them until voting closes. You cannot vote for your own home. And tap Share this contest, to send it to a neighbor, because more votes make the contest more fun.", "#sharec", { after: 1200, pre: async (p, h) => { await h.scrollTo("#sharec", 300); } }),
  nextUp(EV, "Judge a contest", "Open your judge link, score each home, and recuse yourself when you know the household"),
]};
S.judge = { id: "judge", file: "judge", cookie: ck.u_judge, start: "/offline.html", steps: [
  hook(EV, "Judge a contest", "From your invitation email", "In this video, you will judge a contest. You will open your invitation email, see how your ballot works, and pick or score the homes, including what to do when you know the household."),
  emailScene(mails.judge, "This is your invitation email. It says which contest it is, who invited you, and how judging works. The organizer chooses one of two methods. Either you pick a favorite home in each category, or you score every home from one to ten. This contest uses scores. Everything you need is behind one button. Tap Open my judges' ballot.", "dana@demo.example"),
  { cap: "Tap Open my judges' ballot", say: "", mail: "keep", target: '#__mail a[href*="/judge"] >> nth=0', after: 2600, pad: 0.1 },
  { cap: "Your ballot", say: "This is your ballot. It says when voting closes, and how many are done, so you always know how far along you are. Your picks or scores stay private, and you can change them until voting closes.", do: async (p, h) => { await h.hover(".status", 900); } },
  target("Visit the homes", "Before you score, you may want to see the homes in person. Tap Visit the homes. A long list is split into routes of nine stops or fewer, and each one opens in your maps app. Each route starts where the last one ended, and you tick off each home as you go.", nav("tour"), { after: 1600 }),
  target("Tap a category", "Now tap a category. Every home is in every category. If the organizer chose to pick a favorite, each home has a Pick button, and after you pick, the others say Move my pick. In this contest, you score each home once for each award.", nav("c0"), { after: 1600 }),
  target("I know this household", "Do you know the household, perhaps a friend or a relative? Tap I know this household. That home is skipped for you, so your score cannot be questioned later.", `[data-conf="p_okafor"]`, { after: 1600, poster: true }),
  { cap: "Score each home", say: "Score each of the other homes from one to ten. If your contest uses picks, you would tap Pick on your favorite instead. Judge on first impression, creativity, theme, craftsmanship, and variety of lights.", do: async (p, h) => { for (const [id, n] of [["p_garcia", "9"], ["p_patel", "8"], ["p_nguyen", "7"]]) { const sel = `[data-score="${id}|Best Traditional"]`; await h.move(sel); await p.selectOption(sel, n); await h.unring(); await sleep(800); } } },
  target("Tap Ballot", "Tap Ballot to see your progress. When you have scored every home, you are done. Your scores stay private until the winners are announced.", nav("ballot"), { after: 1400 }),
  nextUp(EV, "Create a contest with Quick start", "The short setup: seven screens"),
]};
export { S, ck, SLUG, BASE, hook, recap, nextUp, target, fromMap, toDash, panel, next, nav, PH, mails, MAPSPEC, EF, EE, EV, org, emailScene };
