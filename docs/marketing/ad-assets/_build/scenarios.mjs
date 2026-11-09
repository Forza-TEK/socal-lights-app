// The ad screen recordings, in the TRUE PHONE VIEW only: a 390 css px wide page (real mobile layout) captured at 2.77x (1080 px wide, filling the frame).
// Usage: FMT=916|45 WORK=<dir> node scenarios.mjs a06|a07|a08|a09
//   FMT=916 records a 390 x 693 page (= the 1080x1920 frame), FMT=45 a 390 x 487 page (= the 1080x1350 frame).
// a07, a08, a09 run on the LIVE site (read-only: nothing is saved or posted). a06 runs on the LOCAL demo server (BASE=http://localhost:8788).
import { record, sleep } from "./adrec.mjs";
const FMT = process.env.FMT || "916", VH = FMT === "916" ? 693 : 487;
const T = FMT === "45" ? 0.65 : 0.75; // the 4:5 feed cut must stay within 12 s, so its taps and pauses are quicker
const CLOCK = "2026-11-27T17:00:00-08:00"; // Friday of Thanksgiving week, 5 pm PT: the same real events, with "Tonight" showing tree lightings
const H = { // ad headlines, word for word from docs/marketing/ads-content.json
  a06: "Put your home's lights on the map", a07: "Be on someone's lights route", a08: "Find holiday lights near you tonight", a09: "Plan a family lights drive" };
const near = async (p) => { await p.click(".maplibregl-ctrl-geolocate"); await sleep(3000); for (let i = 0; i < 3; i++) { await p.click(".maplibregl-ctrl-zoom-out"); await sleep(500); } await sleep(2500); };
const compact = `.tile{background-image:none!important;height:36px!important;min-height:0!important}.tile .when{top:6px!important}` + (FMT === "45" ? ".rtpill{display:none!important}" : ""); // in the short 4:5 page the map's Route these pill floats over the list, so it is hidden there
const css = async (p) => { await p.addStyleTag({ content: compact }); };
const star = (h, i) => h.page.locator("article.item:visible .star").nth(i);
const raise = async (p) => { await p.click("#grab"); await sleep(1200); };
// index of the first not-yet-saved heart that sits in the open middle of the list (clear of the Route these pill and the bottom bar)
// first not-yet-saved heart, and how far to scroll the list so that heart sits in the open middle of it (clear of the bottom bar)
const pick = (h) => h.page.evaluate(() => { const L = [...document.querySelectorAll("article.item")].filter((a) => a.offsetParent !== null).map((a) => a.querySelector(".star")); const idx = L.findIndex((s) => s.getAttribute("aria-pressed") !== "true"); if (idx < 0) return { idx, delta: 0 }; const pb = document.querySelector("#pbody").getBoundingClientRect(), r = L[idx].getBoundingClientRect(), want = pb.top + Math.min(60, (Math.min(pb.bottom, innerHeight - 75) - pb.top) / 2) - r.height / 2; return { idx, delta: Math.abs(r.top - want) > 8 ? r.top - want : 0 }; });
const scrollList = (p, top) => p.evaluate((top) => document.querySelector("#pbody").scrollBy({ top, behavior: "smooth" }), top);
const O = (id, extra) => [`${id}-${FMT}`, { vh: VH, settle: 9000, clock: CLOCK, headline: H[id], ...extra }];
const S = {
  async a08() {
    await record(...O("a08", { prep: css }), async (h) => {
      h.cap("Tap Find my location");
      await h.tap(".maplibregl-ctrl-geolocate", { after: 2200 });
      h.cap("The list shows events near you");
      await h.tap("#grab", { after: 900 });
      await h.wait(2200);
    });
  },
  async a06() { // LOCAL demo server only (signed in as the demo user "u_enter"): nothing is submitted; the flow stops on the review screen
    const ART = new URL("./demo-art/home-1.jpg", import.meta.url).pathname;
    await record(...O("a06", { clock: undefined, settle: 2500, cookie: process.env.COOKIE_ENTER || "AjmUsqDKzYVPNwj0uA9p-_hofhGpm9AV", start: "/add-house", geo: undefined, prep: async (p) => { await p.addStyleTag({ content: "main,#app,.flow,.wrap{padding-top:118px!important}" }); await p.evaluate(() => { const fix = () => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const v = n.nodeValue.replace(/\bhouse\b/g, "home").replace(/\bDisplay name\b/g, "Home name").replace(/\bdisplay\b/g, "home").replace(/\bTaylor Kim\b/g, "Your name"); if (v !== n.nodeValue) n.nodeValue = v; } document.querySelectorAll("input").forEach((i) => { if (i.value === "Taylor Kim") i.value = ""; }); }; fix(); setInterval(fix, 200); }); }, routes: [{ url: "**/api/config", json: {} }] }), async (h) => {
      const nx = (after = 450) => h.tap("#nextbtn", { ms: 350, after });
      const clearType = async (sel, text) => { await h.tap(sel, { ms: 350, after: 100 }); await h.page.fill(sel, ""); await h.page.locator(sel).first().pressSequentially(text, { delay: 35 }); await h.wait(250); };
      h.cap("Tap A homeowner");
      await h.tap('[data-tile="kind|homeowner"]', { ms: 450, after: 350 }); await nx();
      h.cap("Add a name");
      await clearType("#f-biz", "The Example family"); await nx();
      h.cap("Choose the season");
      await h.tap('[data-tile="hadPro|no"]', { ms: 300, after: 250 }); await nx(350);
      await h.tap('[data-tile="season|christmas"]', { ms: 300, after: 250 }); await nx(350);
      h.cap("Name your home");
      await clearType("#f-title", "Example Family Lights"); await clearType("#f-desc", "Lights on the roof and the trees."); await nx();
      h.cap("Add the street");
      await h.page.selectOption("#f-city", "Irvine"); await clearType("#f-street", "Example Street"); await clearType("#f-zip", "92602"); await nx();
      await nx(350);
      h.cap("Add photos");
      const [fc] = await Promise.all([h.page.waitForEvent("filechooser"), h.tap("label[for=f-photos]", { ms: 350, after: 200 })]); await fc.setFiles([ART]); await h.wait(1500); await nx(600);
      h.cap("Then put it on the map");
      await h.wait(1800);
    });
  },
  async a09() {
    await record(...O("a09", { prep: async (p) => { await css(p); await near(p); await raise(p); } }), async (h) => {
      h.cap("Tap the heart on public events");
      for (let k = 0; k < 3; k++) {
        const { idx, delta } = await pick(h);
        if (delta) { await scrollList(h.page, delta); await h.wait(550 * T); }
        await h.tap(star(h, idx), { ms: (k ? 300 : 450) * T, after: 450 });
      }
      h.cap("Open your favorites");
      await h.tap('#bnav [data-tab="plan"]', { ms: 450 * T, after: 600 * T });
      h.cap("Tap Route these");
      await h.tap(h.page.locator("#phead, #pbody").getByText("Route these").first(), { ms: 450 * T, after: 900 * T });
      h.cap("Stops go to your maps app");
      await h.wait(3200);
    });
  },
  async a07() {
    await record(...O("a07", { prep: async (p) => {
      await css(p); await near(p); await raise(p);
      for (let i = 0; i < 3; i++) { // save three public events (not recorded)
        const idx = await p.evaluate(() => { const L = [...document.querySelectorAll("article.item")].filter((a) => a.offsetParent !== null).map((a) => a.querySelector(".star")); return L.findIndex((s) => s.getAttribute("aria-pressed") !== "true"); });
        await p.evaluate((idx) => [...document.querySelectorAll("article.item")].filter((a) => a.offsetParent !== null)[idx].querySelector(".star").click(), idx); await sleep(300);
      }
      await p.evaluate(() => document.querySelector("#pbody").scrollTo({ top: 0 })); await sleep(600); } }), async (h) => {
      h.cap("Visitors save places to see");
      await h.wait(900 * T);
      await h.tap('#bnav [data-tab="plan"]', { ms: 450 * T, after: 500 * T });
      h.cap("Tap Route these");
      await h.tap(h.page.locator("#phead, #pbody").getByText("Route these").first(), { ms: 450 * T, after: 800 * T });
      h.cap("Stops go to a maps app");
      await h.wait(3200);
    });
  },
};
await S[process.argv[2]]();
