// Records the two "Post events and homes" tutorials. Every video starts on the map.
// Usage: VOICE=... COOKIES=... PLAYWRIGHT_PATH=... node scripts/tutorials/post-events-homes.mjs [add-event|showcase]
import { readFileSync } from "node:fs";
import { record, sleep } from "./record.mjs";
import { end as endCard, fromMap } from "./steps.mjs";
const ck = JSON.parse(readFileSync(process.env.COOKIES, "utf8")), EY = "Post events and homes";
const end = (t, s) => endCard(EY, t, s), card = (t, s) => ({ card: { ey: EY, title: t, sub: s } });
const NEXT = "#nextbtn";
const next = (p, h) => h.click(NEXT, { after: 1800 });
const NOCFG = [{ url: "**/api/config", json: {} }]; // hides the spam-check widget on the local copy
const addEvent = {
  id: "add-event", file: "post-event", cookie: ck.u_enter, start: "/", routes: NOCFG,
  steps: [
    { ...card("Add an event to the map", "Share a tree lighting, market, parade or haunted house"), say: "Add an event to the map. In this video, you add a neighborhood tree lighting, as an example.", pad: 1.2 },
    ...fromMap("add", "", [{ cap: "Tap An event", say: "Last, tap An event.", do: async (p, h) => { await h.click('a[href="/add-event"]', { after: 2200 }); } }]),
    { cap: "Event web page", say: "If your event has a web page, paste its address. It lets us mark the event Confirmed. If not, tap No, Next.", do: async (p, h) => { await h.hover("#f-url", 1600); }, post: (p, h) => h.click('[data-a="skipurl"]', { after: 1800 }) },
    { cap: "Name, season and type", say: "Type the event's name. Then choose its season, and its type, so people can find it.", do: async (p, h) => { await h.type("#f-name", "Oak Hill Neighborhood Tree Lighting"); await h.move("#f-season"); await p.selectOption("#f-season", "christmas"); await h.unring(); await sleep(1400); await h.move("#f-type"); const opts = await p.$$eval("#f-type option", (os) => os.map((o) => [o.value, o.textContent])); const pick = opts.find(([v, t]) => v && /tree/i.test(t)) || opts.find(([v, t]) => v && /festival|market|parade|drive/i.test(t)) || opts.find(([v]) => v); await p.selectOption("#f-type", pick[0]); await h.unring(); await sleep(1400); }, post: (p, h) => next(p, h) },
    { cap: "When is it?", say: "Pick the first and last day. For a one-day event, use the same day twice. Add the hours if you like.", do: async (p, h) => { await h.click("#f-start", { after: 600 }); await p.fill("#f-start", "2026-12-05"); await sleep(900); await h.click("#f-end", { after: 600 }); await p.fill("#f-end", "2026-12-05"); await sleep(900); await h.type("#f-hours", "5 to 9 pm"); }, post: (p, h) => next(p, h) },
    { cap: "Free or paid", say: "Choose Free or Paid. For a paid event, add the price.", do: async (p, h) => { await h.hover('[data-tile="free|yes"]', 1800); }, post: (p, h) => next(p, h) },
    { cap: "Where is it?", say: "Add the place name, the city, and the street address. The pin goes on this address. For a parade, use the cross streets.", do: async (p, h) => { await h.type("#f-venue", "Oak Hill Community Park"); await h.move("#f-city"); await p.selectOption("#f-city", "Irvine"); await h.unring(); await sleep(1000); await h.type("#f-street", "100 Oak Hill Way"); }, post: (p, h) => next(p, h) },
    { cap: "Describe it", say: "Describe it in a sentence or two, in your own words. This shows on the map card.", do: async (p, h) => { await h.type("#f-blurb", "Join the neighborhood for cocoa, carols and the lighting of the tree. Free and open to everyone."); }, post: (p, h) => next(p, h) },
    { cap: "Check and add", say: "Check everything, then tap Add my event. It goes on the map right away, marked Expected until the dates are checked.", do: async (p, h) => { await h.hover(".sum", 2200); }, poster: true, post: (p, h) => h.click(NEXT, { after: 3200 }) },
    { cap: "Your event is on the map", say: "That is it. Your event is added. You can find it, and edit it, from your profile.", do: async (p, h) => { await sleep(1500); } },
    end("Show off your house", "Put your lights on the map with Showcase a House"),
  ],
};
const showcase = {
  id: "showcase", file: "post-house", cookie: ck.u_enter, start: "/", routes: NOCFG,
  steps: [
    { ...card("Show off your house", "Put your lights on the map with Showcase a House"), say: "Show off your house. In this video, you put your own lights on the map.", pad: 1.2 },
    ...fromMap("add", "", [{ cap: "Tap A lighting display", say: "Last, tap A lighting display.", do: async (p, h) => { await h.click('a[href="/add-house"]', { after: 2200 }); } }]),
    { cap: "Who is posting?", say: "Choose who is posting. We will choose A homeowner. Professional installers can show their work here too.", do: async (p, h) => { await h.click('[data-tile="kind|homeowner"]', { after: 1600 }); }, post: (p, h) => next(p, h) },
    { cap: "Name to show", say: "Type the name to show, for example, The Kim family. It appears as Posted by.", do: async (p, h) => { await h.type("#f-biz", "The Kim family"); }, post: (p, h) => next(p, h) },
    { cap: "Did a company install it?", say: "If a company installed your lights, you can name it, and its name links to its profile. We did it ourselves, so we choose No.", do: async (p, h) => { await h.click('[data-tile="hadPro|no"]', { after: 1600 }); }, post: (p, h) => next(p, h) },
    { cap: "Season", say: "Choose the season for this display. It shows up under that season on the map.", do: async (p, h) => { await h.click('[data-tile="season|christmas"]', { after: 1600 }); }, post: (p, h) => next(p, h) },
    { cap: "About the display", say: "Give the display a name, and tell us what makes it special.", do: async (p, h) => { await h.type("#f-title", "Kim Family Christmas Lights"); await h.type("#f-desc", "Twelve thousand lights on the roof and trees, with a walkway of candy canes. Lights go on at dusk."); }, post: (p, h) => next(p, h) },
    { cap: "Address", say: "Add the address. The pin goes here, so visitors can drive by.", do: async (p, h) => { await h.move("#f-city"); await p.selectOption("#f-city", "Irvine"); await h.unring(); await sleep(1000); await h.type("#f-street", "460 Maple Street"); await h.type("#f-zip", "92602"); }, post: (p, h) => next(p, h) },
    { cap: "Help families plan", say: "Tell families when the lights are on, and how they can see them. All of this is optional.", do: async (p, h) => { await h.type("#f-lightsOn", "5 to 10 pm nightly"); await h.click('[data-tile="visit|both"]', { after: 1600 }); }, post: (p, h) => next(p, h) },
    { cap: "Add photos", say: "Add photos of the display. Photos help families find the right house. You can skip this and add them later.", do: async (p, h) => { const [fc] = await Promise.all([p.waitForEvent("filechooser"), h.click("label[for=f-photos]", { after: 300 })]); await fc.setFiles(["public/img/stock/tree-3.jpg", "public/img/stock/walk-2.jpg"]); await sleep(2600); }, post: (p, h) => next(p, h) },
    { cap: "Check and send", say: "Check everything, then send it. A person looks at each new display before it goes on the map.", do: async (p, h) => { await h.hover(".sum", 2200); }, poster: true, post: (p, h) => h.click(NEXT, { after: 3200 }) },
    { cap: "Sent", say: "That is it. Your display is sent, and you will hear from us if anything needs fixing.", do: async (p, h) => { await sleep(1500); } },
    end("Find lights near me", "Use the map, filters, seasons and All seasons to find what is on near you"),
  ],
};
const all = { "add-event": addEvent, showcase };
for (const v of process.argv[2] ? [all[process.argv[2]]] : Object.values(all)) await record(v);
