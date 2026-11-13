// Records the "Manage your events" tutorial: the account circle, Your events, Edit, adding up to 4 photos, the cover photo, and a Cancelled notice.
// Usage: VOICE=... COOKIES=... PLAYWRIGHT_PATH=... node scripts/tutorials/manage-events.mjs
// NOT RECORDED YET (written 2026-11-13 with the Your events menu item and owner event photos). Needs the demo database seeded with scripts/tutorials/seed-feature.sql
// (event "Oak Hill Neighborhood Tree Lighting", owned by jamie@demo.example = cookie u_mine). The selectors are from public/chrome.js (#acctbtn, the menu items) and
// public/forms.js (the Photos box: label.btn "Add photos", [data-ph-cover], [data-ph-rm]); run it once with TIMING=1 and fix any that moved. Add the tutorials.json entry
// (id manage-events, group "Post events and homes", file post-manage-events) only after the files exist; see docs/tutorial-updates.md.
import { readFileSync } from "node:fs";
import { record, sleep } from "./record.mjs";
import { end as endCard } from "./steps.mjs";
const ck = JSON.parse(readFileSync(process.env.COOKIES, "utf8")), EY = "Post events and homes";
const end = (t, s) => endCard(EY, t, s), card = (t, s) => ({ card: { ey: EY, title: t, sub: s } });
const NOCFG = [{ url: "**/api/config", json: {} }];
const EVENT = '[data-ev="sub_oak_hill"]';
const spec = {
  id: "manage-events", file: "post-manage-events", cookie: ck.u_mine, start: "/", routes: NOCFG,
  steps: [
    { ...card("Manage your events", "Edit an event, add photos, and mark it cancelled"), say: "Manage your events. In this video, you add photos to an event you posted, and learn where to find your events.", pad: 1.2 },
    { cap: "Tap your account circle", say: "You start on the map. Look at the top of the map, beside the search box. See your picture, or your initial, in a circle? Tap it.", do: async (p, h) => { await h.click("#acctbtn", { after: 1600 }); } },
    { cap: "Tap Your events", say: "In the menu, tap Your events. It opens the events you added.", do: async (p, h) => { await h.click('a[role="menuitem"][href="/profile#events"]', { after: 2600 }); } },
    { cap: "Your event", say: "Here is your event. It says whether it is on the map, and it shows the buttons for it.", do: async (p, h) => { await h.hover(EVENT, 2200); } },
    { cap: "Tap Edit", say: "Tap Edit.", do: async (p, h) => { await h.click(`${EVENT} [data-medit]`, { after: 2200 }); } },
    { cap: "The Photos box", say: "Find the Photos box. You can add up to four photos. Photos are saved right away, so you do not need to tap Save.", do: async (p, h) => { await h.hover("[data-pbox]", 2400); } },
    { cap: "Tap Add photos", say: "Tap Add photos, and choose pictures from your phone or computer.", do: async (p, h) => { const [fc] = await Promise.all([p.waitForEvent("filechooser"), h.click("[data-pbox] label.btn", { after: 300 })]); await fc.setFiles(["public/img/stock/tree-3.jpg", "public/img/stock/walk-2.jpg", "public/img/stock/tree-1.jpg"]); await sleep(3200); } },
    { cap: "The cover photo", say: "The first photo is the cover. It is the picture on the map list and at the top of your event page. To use a different one, tap Cover on it.", do: async (p, h) => { await h.hover("[data-pbox] .t >> nth=0", 1800); await h.click("[data-pbox] [data-ph-cover] >> nth=0", { after: 1800 }); } },
    { cap: "Remove a photo", say: "To take a photo off, tap the x on it.", do: async (p, h) => { await h.hover("[data-pbox] [data-ph-rm] >> nth=2", 1800); } },
    { cap: "Photos show first", say: "Your photos show first on the map and on the event page, credited to the organizer. If you remove them all, the picture from your event's web page comes back.", do: async (p, h) => { await sleep(2600); } },
    { cap: "Cancel or postpone", say: "If your event is cancelled or postponed, choose that on the event, so visitors do not drive out for nothing. You can clear it later.", do: async (p, h) => { const f = await p.$(`${EVENT} [data-mcancel]`); if (f) await f.click(); await sleep(900); await h.hover(`${EVENT} [data-notice]`, 2200); } },
    end("Show off your home", "Put your lights on the map with Showcase a House"),
  ],
};
await record(spec);
