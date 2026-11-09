// The four ad screen recordings. Usage: WORK=<dir> node scenarios.mjs a06|a07|a08|a09
// a07, a08, a09 run on the LIVE site (read-only: nothing is saved or posted). a06 runs on the LOCAL demo server (BASE=http://localhost:8788).
import { record, sleep } from "./adrec.mjs";
const CLOCK = "2026-11-27T17:00:00-08:00"; // Friday of Thanksgiving week, 5 pm PT: the same real events, with "Tonight" showing tree lightings
const H = { // ad headlines, word for word from docs/marketing/ads-content.json
  a06: "Put your home's lights on the map", a07: "Be on someone's lights route", a08: "Find holiday lights near you tonight", a09: "Plan a family lights drive" };
const near = async (p) => { await p.click(".maplibregl-ctrl-geolocate"); await sleep(3000); for (let i = 0; i < 3; i++) { await p.click(".maplibregl-ctrl-zoom-out"); await sleep(500); } await sleep(2500); };
const compact = `.tile{background-image:none!important;height:40px!important;min-height:0!important}.tile .when{top:8px!important}`;
const css = async (p) => { await p.addStyleTag({ content: compact }); };
const star = (h, i) => h.page.locator("article.item:visible .star").nth(i);
const raise = async (p) => { await p.click("#grab"); await sleep(1200); };
const S = {
  async a08() {
    await record("a08", { clock: CLOCK, headline: H.a08, prep: css }, async (h) => {
      h.cap("Tap Find my location");
      await h.tap(".maplibregl-ctrl-geolocate", { after: 2600 });
      h.cap("The list shows events near you");
      await h.tap("#grab", { after: 1200 });
      await h.wait(2600);
    });
  },
  async a09() {
    await record("a09", { clock: CLOCK, headline: H.a09, prep: async (p) => { await css(p); await near(p); await raise(p); } }, async (h) => {
      h.cap("Tap the heart on public events");
      const pick = () => h.page.evaluate(() => { const L = [...document.querySelectorAll("article.item")].filter((a) => a.offsetParent !== null).map((a) => a.querySelector(".star")); return L.findIndex((s) => { const r = s.getBoundingClientRect(); return s.getAttribute("aria-pressed") !== "true" && r.top > 300 && r.bottom < 515; }); });
      for (let k = 0; k < 3; k++) {
        let idx = await pick();
        for (let t = 0; idx < 0 && t < 4; t++) { await h.page.evaluate(() => document.querySelector("#pbody").scrollBy({ top: 140, behavior: "smooth" })); await h.wait(500); idx = await pick(); }
        await h.tap(star(h, idx), { ms: k ? 300 : 450, after: 150 });
      }
      h.cap("Open your favorites");
      await h.tap('#bnav [data-tab="plan"]', { ms: 450, after: 600 });
      h.cap("Tap Route these");
      await h.tap(h.page.locator("#phead, #pbody").getByText("Route these").first(), { ms: 450, after: 900 });
      h.cap("Stops go to your maps app");
      await h.wait(1700);
    });
  },
  async a07() {
    await record("a07", { clock: CLOCK, headline: H.a07, prep: async (p) => { await css(p); await near(p); await raise(p); for (let i = 0; i < 3; i++) { await p.locator("article.item:visible .star").nth(i).click(); await sleep(300); if (i === 1) { await p.evaluate(() => document.querySelector("#pbody").scrollBy({ top: 190 })); await sleep(500); } } await p.evaluate(() => document.querySelector("#pbody").scrollTo({ top: 0 })); await sleep(600); } }, async (h) => {
      h.cap("Visitors save places to see");
      await h.wait(1300);
      await h.tap('#bnav [data-tab="plan"]', { after: 1000 });
      h.cap("Tap Route these");
      await h.tap(h.page.locator("#phead, #pbody").getByText("Route these").first(), { after: 1400 });
      h.cap("Stops go to a maps app");
      await h.wait(2200);
    });
  },
};
await S[process.argv[2]]();
