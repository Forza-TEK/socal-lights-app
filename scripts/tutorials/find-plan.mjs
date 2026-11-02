// Records the six "Find and plan" tutorials. Every video starts on the map.
// Usage: VOICE=... COOKIES=... PLAYWRIGHT_PATH=... node scripts/tutorials/find-plan.mjs [map|night|email|app|contests|pro-filter]
import { readFileSync } from "node:fs";
import { record, sleep } from "./record.mjs";
import { end as endCard, fromMap, navSteps } from "./steps.mjs";
const ck = JSON.parse(readFileSync(process.env.COOKIES, "utf8")), EY = "Find and plan";
const end = (t, s) => endCard(EY, t, s), card = (t, s) => ({ card: { ey: EY, title: t, sub: s } });
const IRVINE = { latitude: 33.6846, longitude: -117.8265 };
const season = (name) => async (p, h) => { await h.click("#seasonbtn", { after: 1400 }); await h.click(`[data-sp]:has-text("${name}")`, { after: 2600 }); };
const map = {
  id: "map", file: "find-map", start: "/", geo: IRVINE,
  steps: [
    { ...card("Find lights near me", "Use the map, filters, seasons and All seasons to find what is on near you"), say: "Find lights near me. In this video, you use the map, the filters, and the seasons to find what is on near you.", pad: 1.2 },
    { cap: "The map", say: "This is the map. Numbered circles show how many places are in an area. Scroll or pinch to zoom in until you see single pins.", do: async (p, h) => { await h.move("#live", { fx: 0.3, fy: 0.55 }); await h.scroll(-700, 2200); } },
    { cap: "Use my location", say: "Tap the target button to use your location. The list then shows how far each place is, nearest first.", do: async (p, h) => { await h.click(".maplibregl-ctrl-geolocate", { after: 3200 }); } },
    { cap: "Seasons", say: "The season button picks what you are looking for. Open it, and choose Thanksgiving and Christmas Lights.", do: season("Christmas") },
    { cap: "Search a city", say: "Next, search for a city. Type its name, and tap the city in the list.", do: async (p, h) => { await h.type("#q", "Irvine"); await h.click('button:has-text("Show this city on the map")', { after: 3000 }); }, poster: true },
    { cap: "All seasons", say: "Choose All seasons to see every upcoming event for this city, not just the season in view.", do: async (p, h) => { await h.click("#seasonbtn", { after: 1400 }); await h.click('[data-sp="all"]', { after: 2800 }); } },
    { cap: "Filters", say: "Tap Filters to narrow the list by date, distance, county, type, and more. Then tap the button at the bottom to show the places.", do: async (p, h) => { await h.click("text=Filters >> visible=true", { after: 2400 }); await h.hover('[data-ftype="house"]', 1400); await h.click("text=Clear all", { after: 1000 }); await h.click(".fclose, [aria-label='Close filters'] >> visible=true", { after: 1500 }).catch(() => {}); } },
    end("Plan a night", "Save favorites, build a route, share it and add it to your calendar"),
  ],
};
const night = {
  id: "night", file: "find-night", start: "/", geo: IRVINE,
  steps: [
    { ...card("Plan a night", "Save favorites, build a route, share it and add it to your calendar"), say: "Plan a night. In this video, you pick the places you want to visit, and get a driving route.", pad: 1.2 },
    { cap: "Pick a season", say: "Start on the map. Choose the season you want from the season button.", do: season("Christmas") },
    { cap: "Tap the heart", say: "On any place you want to visit, tap the heart. Add a few.", do: async (p, h) => { for (const i of [0, 1, 2]) await h.click(`#pbody .item .star >> nth=${i}`, { after: 1600 }); }, poster: true },
    { cap: "My night", say: "Open My night. Your stops are here, in a sensible driving order, with the miles and the time.", do: async (p, h) => { await h.click("#t-plan", { after: 2600 }); await h.hover(".hrow", 1400); } },
    { cap: "Open route", say: "Choose your maps app, and tap Open route. Your maps app takes you there.", do: async (p, h) => { await h.hover("#mapsSel", 1400); await h.hover(".qgo", 1800); } },
    { cap: "Share your night", say: "Tap Share to send your night to a friend as a link.", do: async (p, h) => { await h.hover("[data-nshare]", 1800); } },
    { cap: "Add to calendar", say: "On a place's page, tap Add to calendar to save it in your calendar.", do: async (p, h) => { await h.click("#t-events", { after: 1800 }); await h.click("#pbody .item .ttl, #pbody .item h3 >> nth=0", { after: 2400 }); await h.hover("[data-cal]", 1800); } },
    end("Weekly lights email", "Sign up for the weekly email and unsubscribe any time"),
  ],
};
const BASE = process.env.BASE || "http://localhost:8788";
// The weekly email as the app writes it (see functions/api/alerts/send.js), filled with real events near Irvine from the local copy of the data
async function weeklyText() {
  const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }), mi = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 3958.8 * 2 * Math.asin(Math.sqrt(x)); };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }), until = new Date(Date.now() + 14 * 864e5).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const all = await fetch(BASE + "/api/events").then((r) => r.json()), L = (Array.isArray(all) ? all : all.events).filter((e) => e.e >= today && e.s <= until && mi(33.6846, -117.8265, e.lat, e.lng) <= 10 && !String(e.id).startsWith("c-")).sort((a, b) => a.s.localeCompare(b.s)).slice(0, 4);
  const list = L.map((e) => `- ${e.n}\n  ${e.s === e.e ? fmt(e.s) : fmt(e.s) + " to " + fmt(e.e)}${e.h ? ", " + e.h : ""} \u00b7 ${e.v || e.city}\n  https://socallights.app/#e-${e.id}`).join("\n\n");
  return `Lights and events within 10 miles of Irvine in the next 14 days:\n\n${list}\n\nSee everything: https://socallights.app/in/irvine\n\nYou asked for this weekly email on socallights.app. Stop it any time: https://socallights.app/api/alerts/unsubscribe?t=demo-unsub-token`;
}
const confirmText = "Confirm that you want a weekly email of lights and events within 10 miles of Irvine:\n\nhttps://socallights.app/api/alerts/confirm?t=demo-confirm-token\n\nIf you did not ask for this, ignore this email and nothing will be sent.\n\nSoCal Lights \u00b7 socallights.app";
const weekly = await weeklyText();
const email = {
  id: "email", file: "find-email", start: "/", routes: [{ url: "**/api/config", json: {} }, { url: "**/api/alerts", json: { ok: true } }],
  steps: [
    { ...card("Weekly lights email", "Sign up for the weekly email and unsubscribe any time"), say: "Weekly lights email. In this video, you sign up for one email a week with the lights near you.", pad: 1.2 },
    ...navSteps([
      { cap: "Tap the three dots", say: "You start on the map. Tap the three dots at the top.", do: async (p, h) => { await h.click("#morebtn", { after: 1800 }); } },
      { cap: "Tap Weekly lights email", say: "Then tap Weekly lights email.", do: async (p, h) => { await h.click('[data-m="alerts"]', { after: 2200 }); } },
    ]),
    { cap: "Your email and city", say: "Type your email address, and choose your city and how far to look.", do: async (p, h) => { await h.type("#alEmail", "neighbor@example.com"); await h.type("#alCity", "Irvine"); await h.move("#alRad"); await p.selectOption("#alRad", "10"); await h.unring(); await sleep(1200); }, poster: true },
    { cap: "Agree and sign up", say: "Tick the box to agree, and tap Sign up.", do: async (p, h) => { await h.click("#alOk", { after: 1400 }); await h.click(".alsend", { after: 2800 }); } },
    { cap: "Check your email", say: "We send you an email to confirm. Nothing else is sent until you do. This is an example of that email.", mail: { subject: "Confirm your SoCal Lights alerts", text: confirmText, to: "neighbor@example.com", note: "Example email" }, pad: 1.4 },
    { cap: "Tap the link", say: "Tap the link in the email.", mail: "keep", do: async (p, h) => { await h.click('#__mail a[href*="alerts/confirm"]', { after: 3000 }); } },
    { cap: "You are signed up", say: "That confirms it. Each week you get the lights and events within your distance, when there are any.", do: async (p, h) => { await sleep(2000); } },
    { cap: "The weekly email", say: "Here is what the weekly email looks like. It lists what is on near you, with a link for each.", mail: { subject: "Lights near Irvine this week", text: weekly, to: "neighbor@example.com", note: "Example email" }, pad: 1.2 },
    { cap: "Stop it any time", say: "Every email ends with a link to stop. Tap it, and your address is deleted.", mail: "keep", do: async (p, h) => { await h.scroll(400, 1400); await h.click('#__mail a[href*="alerts/unsubscribe"]', { after: 3000 }); } },
    end("Install the app and use it offline", "Add SoCal Lights to your phone and use it without a connection"),
  ],
};
const app = {
  id: "app", file: "find-app", phone: true, start: "/", warm: true,
  steps: [
    { ...card("Install the app and use it offline", "Add SoCal Lights to your phone and use it without a connection"), say: "Install the app and use it offline. In this video, you add SoCal Lights to your phone, and see what still works with no signal.", pad: 1.2 },
    { cap: "Open SoCalLights.app", say: "Open socallights dot app in your phone's browser. There is nothing to download from an app store.", do: async (p, h) => { await h.hover("#q", 1200); } },
    { card: { ey: "On an iPhone", title: "Share, then Add to Home Screen", sub: "In Safari, tap the Share button, scroll down, and tap Add to Home Screen" }, say: "On an iPhone, open the site in Safari. Tap the Share button, scroll down, and tap Add to Home Screen.", pad: 1.4 },
    { card: { ey: "On an Android phone", title: "Menu, then Install app", sub: "In Chrome, tap the three dots, then Install app or Add to Home screen" }, say: "On an Android phone, open the site in Chrome. Tap the three dots, then tap Install app, or Add to Home screen.", pad: 1.4 },
    { cap: "The app icon", say: "SoCal Lights now has its own icon on your home screen. It opens full screen, like any other app.", do: async (p, h) => { await h.hover("a.brand, #live", 1400); } },
    { cap: "No signal", say: "With no signal, the app still opens. Your last list of events and home displays is saved on your phone.", do: async (p, h) => { await sleep(2500); await h.ctx.setOffline(true); await p.reload({ waitUntil: "domcontentloaded" }); await sleep(3500); }, poster: true },
    { cap: "Maps need a connection", say: "Map pictures need a connection, so the map itself may be blank. The list still works. Open a place to see its details, dates, and address.", do: async (p, h) => { await h.click("#pbody .item >> nth=0", { after: 2400 }).catch(() => {}); } },
    { cap: "Back online", say: "When your signal comes back, the app updates by itself.", do: async (p, h) => { await h.ctx.setOffline(false); await sleep(1500); } },
    end("Find contests: the Contests page", "Live now, Mine and Past results, and the Enter or vote button on a map card"),
  ],
};
const contests = {
  id: "contests", file: "find-contests", cookie: ck.u_org, start: "/",
  steps: [
    { ...card("Find contests: the Contests page", "Live now, Mine and Past results, and the Enter or vote button on a map card"), say: "Find contests. In this video, you find neighborhood contests, and the places to enter or vote.", pad: 1.2 },
    ...fromMap("contests"),
    { cap: "Live now", say: "Live now lists the contests open today. Tap Vote to pick your favorites, or Enter my home to enter yours.", do: async (p, h) => { await h.hover('a:has-text("Enter my home")', 1800); } },
    { cap: "Mine", say: "Mine lists the contests you run or help run, and the homes you entered.", do: async (p, h) => { await h.click("[data-tab=mine]", { after: 2600 }); }, poster: true },
    { cap: "Past results", say: "Past results lists finished contests by season and year, with the winners.", do: async (p, h) => { await h.click("[data-tab=past]", { after: 2800 }); } },
    { cap: "Back to the map", say: "Contests are on the map too. Go back to the map.", do: async (p, h) => { await h.click("a.brand", { after: 4000 }); } },
    { cap: "Contest on the map", say: "Search for the contest by name, and tap it.", do: async (p, h) => { await h.type("#q", "Maple Street Holiday"); await h.click('#live ~ * button:has-text("Maple Street"), button:has-text("Maple Street Holiday Lights")', { after: 2600 }); } },
    { cap: "Enter your home or vote", say: "On the contest's card, tap Enter your home or vote. It opens the contest page.", do: async (p, h) => { await h.hover("a.contestgo", 2000); } },
    end("Find professionally installed displays", "Use the Professionally installed filter, then open an installer's profile"),
  ],
};
const proFilter = {
  id: "pro-filter", file: "find-pro", start: "/",
  steps: [
    { ...card("Find professionally installed displays", "Use the Professionally installed filter, then open an installer's profile"), say: "Find professionally installed displays. In this video, you find displays that a lighting company installed.", pad: 1.2 },
    { cap: "Choose Christmas", say: "Start on the map. Choose Thanksgiving and Christmas Lights from the season button.", do: season("Christmas") },
    { cap: "Filters", say: "Tap Filters.", do: async (p, h) => { await h.click("text=Filters >> visible=true", { after: 2000 }); } },
    { cap: "Professionally installed", say: "Under Type, choose Professionally installed. Then tap the button at the bottom to show the places.", do: async (p, h) => { await h.scrollTo('[data-ftype="pro"]', 300).catch(() => {}); await h.click('[data-ftype="pro"]', { after: 1800 }); await h.click("button:has-text('Show')", { after: 2600 }); }, poster: true },
    { cap: "Installed by", say: "Each display shows the company that installed it. Open one.", do: async (p, h) => { await h.click("#pbody .item.home >> nth=0", { after: 2600 }); } },
    { cap: "Installer profile", say: "Tap the company's name to open its profile, with its area, phone, website and the displays it has installed.", do: async (p, h) => { await h.click("a.instlink >> nth=0", { after: 3200 }); } },
    end("Enter your home in a contest", "Sign in, add photos, your address and agree to the rules"),
  ],
};
const all = { map, night, email, app, contests, "pro-filter": proFilter };
for (const v of process.argv[2] ? [all[process.argv[2]]] : Object.values(all)) await record(v);
