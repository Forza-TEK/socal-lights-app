// Records the three "Sponsors and installers" tutorials. Every video starts on the map.
// Usage: VOICE=... COOKIES=... LOGO=<png> PLAYWRIGHT_PATH=... node scripts/tutorials/sponsors-installers.mjs [sponsors|installer|installer-profile]
import { readFileSync } from "node:fs";
import { record, sleep } from "./record.mjs";
import { end as endCard, fromMap } from "./steps.mjs";
const ck = JSON.parse(readFileSync(process.env.COOKIES, "utf8")), SLUG = "maple-street-holiday-lights-2026", EY = "Sponsors and installers";
const end = (t, s) => endCard(EY, t, s), card = (t, s) => ({ card: { ey: EY, title: t, sub: s } });
const nav = (k) => `[data-k="${k}"] >> visible=true`;
const toDash = () => [
  ...fromMap("contests"),
  { cap: "Contests > Mine > Manage", say: "Tap the Mine tab, then tap Manage next to your contest.", do: async (p, h) => { await h.click("[data-tab=mine]", { after: 1600 }); await h.click(`a[href="/c/${SLUG}/manage"]`, { after: 2600 }); } },
];
const panel = (k, label, say) => ({ cap: "Dashboard > " + label, say, do: async (p, h) => { await h.click(nav(k), { after: 2200 }); } });
const sponsors = {
  id: "sponsors", file: "sponsors-add", cookie: ck.u_org, start: "/",
  steps: [
    { ...card("Add sponsors and logos", "Show sponsors by tier on the contest page"), say: "Add sponsors and logos. In this video, you thank the businesses that support your contest.", pad: 1.2 },
    ...toDash(),
    panel("sponsors", "Sponsors", "Open the Sponsors tab. Logos and names appear on your contest page, with the largest tier first."),
    { cap: "Sponsor name and tier", say: "Type the sponsor's name, and choose a tier. We will add Oak Hill Hardware, an example sponsor, as a Gold sponsor.", do: async (p, h) => { await h.type("#sp-name", "Oak Hill Hardware"); await h.move("#sp-tier"); await p.selectOption("#sp-tier", "gold"); await sleep(1200); } },
    { cap: "Website and logo", say: "Add the sponsor's website, and choose their logo. A logo is optional.", do: async (p, h) => { await h.type("#sp-url", "https://oakhillhardware.example.com"); const [fc] = await Promise.all([p.waitForEvent("filechooser"), h.click("#sp-logo", { after: 300 })]); await fc.setFiles(process.env.LOGO); await sleep(1800); } },
    { cap: "Add sponsor", say: "Tap Add sponsor. Sponsors can pay you directly, and payment never affects who wins.", do: async (p, h) => { await h.click('#spform button[type="submit"]', { after: 2800 }); }, poster: true },
    { cap: "See it as voters do", say: "To check how it looks, tap See it as voters do. The sponsor appears on the contest page, under its tier.", do: async (p, h) => { await h.click('a:has-text("See it as voters do")', { after: 2600 }); await h.scrollTo("text=Gold sponsors", 200); await h.hover("text=Gold sponsors", 1600); } },
    end("Presenting installer and quote requests", "How the Get a quote button works"),
  ],
};
const installer = {
  id: "installer", file: "sponsors-installer", cookie: ck.u_org, start: "/",
  steps: [
    { ...card("Presenting installer and quote requests", "How the Get a quote button works"), say: "Presenting installer and quote requests. In this video, you add a lighting company to your contest, and see how families ask for a quote.", pad: 1.2 },
    ...toDash(),
    panel("details", "Details", "Open the Details tab. Scroll to Presenting installer."),
    { cap: "Presenting installer", say: "Type the company's name, the email where quote requests should go, and their website.", do: async (p, h) => { await h.scrollTo("#e-iname", 220); await h.type("#e-iname", "Bright Nights Lighting"); await h.type("#e-iemail", "quotes@brightnights.example.com"); await h.type("#e-iurl", "brightnights.example.com"); } },
    { cap: "Save changes", say: "Tap Save changes. This adds a Get a quote button to your contest page.", do: async (p, h) => { await h.click('#editform button[type="submit"]', { after: 2800 }); }, poster: true },
    { cap: "Get a quote", say: "A neighbor who visits the contest page sees a card called Want lights like these? They tap Get a quote.", do: async (p, h) => { await h.ctx.clearCookies(); await h.ctx.addCookies([{ name: "scl_session", value: ck.u_voter, url: process.env.BASE || "http://localhost:8788" }]); await p.goto((process.env.BASE || "http://localhost:8788") + "/c/" + SLUG, { waitUntil: "networkidle" }); await h.scrollTo("#quotebtn", 300); await h.click("#quotebtn", { after: 1800 }); } },
    { cap: "Share my details", say: "They add their name, and what they would like done. They must tick the box to share their details, and only then does the company get them.", do: async (p, h) => { await h.type("#q-name", "Sam Rivera"); await h.type("#q-note", "Roofline lights and a lit walkway, please."); await h.click("#q-ok", { after: 1200 }); await h.click('#quoteform button[type="submit"]', { after: 2600 }); } },
    { cap: "Quote requests", say: "The request is emailed to the company and to you. You also see it on your dashboard, on the Promote tab, under Quote requests.", do: async (p, h) => { await h.ctx.clearCookies(); await h.ctx.addCookies([{ name: "scl_session", value: ck.u_org, url: process.env.BASE || "http://localhost:8788" }]); await p.goto((process.env.BASE || "http://localhost:8788") + "/c/" + SLUG + "/manage#promote", { waitUntil: "networkidle" }); await sleep(1500); await h.scrollTo("text=Quote requests", 200); await h.hover("text=Quote requests", 1800); } },
    end("Installer profiles and “Installed by”", "How a company gets a profile, how a home links to it, and how to confirm or claim yours"),
  ],
};
const installerProfile = {
  id: "installer-profile", file: "sponsors-profile", cookie: ck.u_inst, start: "/",
  steps: [
    { ...card("Installer profiles and “Installed by”", "How a company gets a profile, how a home links to it, and how to confirm or claim yours"), say: "Installer profiles. In this video, you see how a lighting company gets a profile, and how homes link to it.", pad: 1.2 },
    { cap: "Choose Christmas", say: "Start on the map. Choose Thanksgiving and Christmas Lights from the season button, then open a home display.", do: async (p, h) => { await h.click("#seasonbtn", { after: 1400 }); await h.click('[data-sp]:has-text("Christmas")', { after: 2600 }); await h.type("#q", "Garcia Family"); await h.click('button:has-text("Garcia Family Lights")', { after: 2800 }); } },
    { cap: "Installed by", say: "A home that a company installed says Installed by, with the company's name. A check mark means the company confirmed it.", do: async (p, h) => { await h.hover(".instby", 2200); } },
    { cap: "The profile", say: "Tap the company's name to open its profile. It shows the company's area, phone, website, and the homes it has installed.", do: async (p, h) => { await h.click("a.instlink >> nth=0", { after: 3000 }); }, poster: true },
    { cap: "Claim this profile", say: "Profiles are made when a company posts a display, or when a homeowner names it. If this is your company, tap Claim this profile, and sign in with your company email.", do: async (p, h) => { await h.hover("text=Claim", 2000).catch(() => sleep(1500)); } },
    { cap: "Manage your profile", say: "Once you have claimed it, you manage the profile. The Homes tab lists homes that name your company. Confirm the ones you did, or remove the ones you did not.", do: async (p, h) => { await p.goto((process.env.BASE || "http://localhost:8788") + "/installer/bright-nights-lighting/manage#homes", { waitUntil: "networkidle" }); await sleep(1800); await h.hover("[data-claim^='confirm']", 2200); } },
    { cap: "Confirm", say: "Tap Confirm. The home now shows a check mark, and you and the homeowner can both edit its listing.", do: async (p, h) => { await h.click("[data-claim^='confirm']", { after: 2600 }); } },
    end("Add an event to the map", "Share a tree lighting, market, parade or haunted house"),
  ],
};
const all = { sponsors, installer, "installer-profile": installerProfile };
for (const v of process.argv[2] ? [all[process.argv[2]]] : Object.values(all)) await record(v);
