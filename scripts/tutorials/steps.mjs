// Steps shared by every tutorial: they all start on the map and teach the way to the feature, one numbered step at a time
// (a caption, the mouse moving to the button, an orange ring around it, then the click).
export const end = (ey, t, s) => ({ card: { ey, title: "Next: " + t, sub: s }, say: `Next up: ${t}.`, pad: 1.6 });
const LABEL = { add: "Add", contests: "Contests", tutorials: "Tutorials" };
// What the menu row is for, said as the pointer reaches it
const WHY = { add: " That is where you add anything new: an event, a contest, or your own house.", contests: " That is where every neighborhood contest lives: the ones you can vote in, enter, or run.", tutorials: "" };
// "Step 1: ...", "Step 2: ..." captions for a list of { cap, say, do }
export const navSteps = (items) => items.map((it, i) => ({ ...it, cap: `Step ${i + 1}: ${it.cap}`, pad: it.pad ?? 0.3 }));
// map -> three dots -> menu item (which: "add" | "contests" | "tutorials"), then any `more` steps for the same trail
export const fromMap = (which, extra = "", more = [], why = true) => navSteps([
  { cap: "Tap the three dots", say: "Now look at the top right corner of the map. See the three dots? That is the menu. Tap them." + extra, target: "#morebtn", after: 1000 },
  { cap: `Tap ${LABEL[which]}`, say: `In the menu, tap ${LABEL[which]}.` + (why ? WHY[which] || "" : ""), target: `#moremenu a[href="/${which}"]`, after: 1200 },
  ...more,
]);
// map -> person icon -> profile
export const fromMapProfile = () => navSteps([
  { cap: "Tap the person icon", say: "You start on the map. Tap the person icon at the top, next to the three dots.", do: async (p, h) => { await h.click("#acctbtn", { after: 2400 }); } },
]);
export const toContest = (btn) => ({ cap: "Tap " + btn, say: `Find the contest, and tap ${btn}.`, do: async (p, h) => { await h.click(`text=${btn}`, { after: 2200 }); } });

// The starting point every map video shows first: the address to open, then what the home page looks like on a first visit
// (including the "use my location" message), so a new visitor knows exactly where they are before the first tap.
const sleep2 = (ms) => new Promise((r) => setTimeout(r, ms));
export const openSite = (ey) => [
  { card: { ey: "Start here", title: "Open your web browser and go to", urlbar: "socallights.app" }, say: "To begin, open your web browser, and go to SoCal Lights dot app. That is the only address you need.", pad: 0.8,
    post: async (p, h) => { await p.evaluate(() => { try { localStorage.removeItem("socal-welcomed"); } catch {} }); await p.goto((process.env.BASE || "http://localhost:8788") + "/", { waitUntil: "domcontentloaded" }); await p.waitForSelector("#pbody .item", { timeout: 15000 }).catch(() => {}); await p.waitForSelector("[data-welcome=\"go\"]", { timeout: 12000 }).catch(() => {}); } }, // the page loads as the card goes away, so the first-visit message is still showing
  { cap: "Tap Use my location", say: "This is the SoCal Lights home page. The first time you visit, it asks to use your location. Tap Use my location. That is how the map shows how far things are, and gives you directions.", target: '[data-welcome="go"]', after: 1200, beforeClick: async (p, h) => { await h.ctx.grantPermissions(["geolocation"], { origin: process.env.BASE || "http://localhost:8788" }); }, post: async (p, h) => { await h.showPerm(true); } }, // permission is given at the tap, like a real first visit
  { cap: "Tap Allow", say: "Your browser asks permission as well. Tap Allow. Your location is used only on your device, and you can say no at any time.", target: "#__perm .allow", after: 400, post: async (p, h) => { await h.showPerm(false); }, pad: 0.3 },
  { cap: "The map zooms to you", say: "The map zooms to where you are. There are no events on your street, so tap Show all of Southern California.", target: "text=Show all of Southern California", after: 900, pad: 0.3, pre: async (p) => { await p.waitForSelector("text=Show all of Southern California", { timeout: 15000 }).catch(() => {}); } },
  { cap: "Distances show", say: "Now every place shows how far away it is, nearest first, so you can plan your drive.", do: async (p, h) => { await sleep2(1500); await h.hover("#pbody .item >> nth=0", 1200); }, pad: 0.5 },
];

// ---- Shared pieces for the full set of videos ----
export const MAPSPEC = { start: "/", welcome: true, lateGeo: true, geo: { latitude: 33.6580, longitude: -117.8560 } };
// The short version of the opening, used by every map video after the first: address, home page, Use my location, Allow, then the list quietly shows all places
export const openShort = () => [
  ...openSite().slice(0, 3),
  { cap: "", say: "", target: "text=Show all of Southern California", optional: true, after: 700, pad: 0.1, pre: async (p) => { await p.waitForSelector("text=Show all of Southern California", { timeout: 5000 }).catch(() => {}); } },
];
export const hook = (ey, title, sub, say) => ({ card: { ey, title, sub }, say, pad: 0.5 });
export const recap = (ey, title, list, say) => ({ card: { ey, title, list }, say, pad: 1.0 });
// An example email scene: shows the app's real email in a mock inbox
export const emailScene = (m, say, to) => ({ cap: "Your email", say, mail: { subject: m.subject, html: m.html, to, note: "Example email" }, pad: 0.6 });
