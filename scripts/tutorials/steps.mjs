// Steps shared by every tutorial: they all start on the map and teach the way to the feature, one numbered step at a time
// (a caption, the mouse moving to the button, an orange ring around it, then the click).
export const end = (ey, t, s) => ({ card: { ey, title: "Next: " + t, sub: s }, say: `Next up: ${t}.`, pad: 1.6 });
const LABEL = { add: "Add", contests: "Contests", tutorials: "Tutorials" };
// "Step 1: ...", "Step 2: ..." captions for a list of { cap, say, do }
export const navSteps = (items) => items.map((it, i) => ({ ...it, cap: `Step ${i + 1}: ${it.cap}`, pad: it.pad ?? 0.3 }));
// map -> three dots -> menu item (which: "add" | "contests" | "tutorials"), then any `more` steps for the same trail
export const fromMap = (which, extra = "", more = []) => navSteps([
  { cap: "Tap the three dots", say: "Look at the top right corner of the map. See the three dots? Tap them." + extra, target: "#morebtn", after: 1000 },
  { cap: `Tap ${LABEL[which]}`, say: `In the menu, tap ${LABEL[which]}.`, target: `#moremenu a[href="/${which}"]`, after: 1200 },
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
  { card: { ey: "Start here", title: "Open your web browser and go to", urlbar: "socallights.app" }, say: "Open your web browser, and go to SoCal Lights dot app.", pad: 0.8,
    post: async (p, h) => { await p.evaluate(() => { try { localStorage.removeItem("socal-welcomed"); } catch {} }); await p.goto((process.env.BASE || "http://localhost:8788") + "/", { waitUntil: "domcontentloaded" }); } }, // the page loads as the card goes away, so the first-visit message is still showing
  { cap: "Tap Use my location", say: "This is the SoCal Lights home page. A message asks to use your location. Tap Use my location.", target: '[data-welcome="go"]', after: 1200, do: async (p, h) => { await h.ctx.grantPermissions(["geolocation"], { origin: process.env.BASE || "http://localhost:8788" }); } }, // permission is given at the tap, like a real first visit
  { cap: "Tap Allow", say: "Your browser asks for permission. Tap Allow. The map now zooms to where you are.", do: async (p, h) => { await sleep2(2500); }, pad: 0.4 },
  { cap: "Tap the minus button", say: "To see more places, tap the minus button to zoom out. Now every place shows how far away it is, so you can plan your drive.", do: async (p, h) => { for (let i = 0; i < 4; i++) { await h.click(".maplibregl-ctrl-zoom-out", { after: 700 }); } await sleep2(1200); await h.hover("#pbody .item >> nth=0", 1400); }, pad: 0.6 },
];
