// Records the three "Enter a home" tutorials. Usage: VOICE=... COOKIES=... PLAYWRIGHT_PATH=... node scripts/tutorials/enter-home.mjs [enter|edit-entry|profile]
import { readFileSync } from "node:fs";
import { record, sleep } from "./record.mjs";
import { end as endCard, fromMap, fromMapProfile } from "./steps.mjs";
const ck = JSON.parse(readFileSync(process.env.COOKIES, "utf8")), SLUG = "maple-street-holiday-lights-2026", EY = "Enter a home";
const end = (t, s) => endCard(EY, t, s);
const PH = ["public/img/stock/tree-3.jpg", "public/img/stock/show-2.jpg"];
const enter = {
  id: "enter", file: "enter", phone: true, capTop: true, cookie: ck.u_enter, start: "/",
  steps: [
    { card: { ey: EY, title: "Enter your home in a contest", sub: "Sign in, add photos, your address and agree to the rules" }, say: "Enter your home in a contest. In this video, you add your house to a neighborhood contest. It takes a few minutes.", pad: 1.2 },
    ...fromMap("contests"),
    { cap: "Contests > Enter my home", say: "Under Live now, find the contest and tap Enter my home. You can also scan the contest's QR code. If you are not signed in yet, the site asks you to sign in with Google or your email first. This video starts after sign in.", do: async (p, h) => { await h.click(`a[href="/c/${SLUG}/enter"]`, { after: 2200 }); } },
    { cap: "Add photos", say: "First, add photos of your home. Take one now, or pick from your gallery. The first photo is the cover.", do: async (p, h) => { const [fc] = await Promise.all([p.waitForEvent("filechooser"), h.click("label[for=f-photos]", { after: 300 })]); await fc.setFiles(PH); await sleep(2500); } },
    { cap: "Your address", say: "Tap Next. Now type your street address and ZIP code. The contest is for homes in Irvine, so the city is already filled in.", do: async (p, h) => { await h.click("#nextbtn", { after: 1800 }); await h.type("#f-street", "460 Maple Street"); await h.type("#f-zip", "92602"); } },
    { cap: "Name on the entry", say: "Tap Next again. Choose the name to show, for example, The Kim family. You can add one line about your display.", do: async (p, h) => { await h.click("#nextbtn", { after: 1800 }); await h.type("#f-name", "The Kim family"); await h.type("#f-desc", "Colorful lights on the roof and a lit walkway."); } },
    { cap: "Agree to the rules", say: "On the last screen, check your entry. Tick the box to agree to the official rules.", do: async (p, h) => { await h.click("#nextbtn", { after: 1800 }); await h.click('[data-k="rules"]', { after: 1500 }); }, poster: true },
    { cap: "Submit my entry", say: "Then tap Submit my entry.", do: async (p, h) => { await h.click("#nextbtn", { after: 2500 }); } },
    { cap: "You're entered", say: "That is it. The organizer reviews each entry before it goes on the map, and you can sign in any time to check on it." },
    end("Edit or withdraw your entry", "Change your entry's name and description, or take it out"),
  ],
};
const edit = {
  id: "edit-entry", file: "edit-entry", phone: true, capTop: true, cookie: ck.u_mine, start: "/",
  steps: [
    { card: { ey: EY, title: "Edit or withdraw your entry", sub: "Change your entry's name and description, or take it out" }, say: "Edit or withdraw your entry. In this video, you change your entry, and then take it out of the contest.", pad: 1.2 },
    ...fromMap("contests"),
    { cap: "Contests > Mine", say: "Tap the Mine tab. Under Homes you entered, tap Open contest.", do: async (p, h) => { await h.click("[data-tab=mine]", { after: 1800 }); await h.click(`a[href="/c/${SLUG}"]:has-text("Open contest")`, { after: 2400 }); } },
    { cap: "Your home", say: "Your entry has its own section on the contest page, called Your home.", do: async (p, h) => { await h.scrollTo("text=Your home", 60); } },
    { cap: "Edit name and description", say: "Tap Edit name and description. Change the name, or add a line about your display, then tap Save.", do: async (p, h) => { await h.click("[data-edit]", { after: 1200 }); await h.type('[data-editform] [name="name"]', "Cole Family Christmas Village"); await h.click('[data-editform] button[type="submit"]', { after: 2200 }); }, poster: true },
    { cap: "Photos and address", say: "To change the photos or the address, withdraw this entry and enter again." },
    { cap: "Withdraw", say: "To take your home out of the contest, tap Withdraw. The button asks you to tap again, so you cannot do it by accident.", do: async (p, h) => { await h.click("[data-withdraw]", { after: 2500 }); } },
    { cap: "Tap again to withdraw", say: "Tap it a second time, and your entry is withdrawn.", do: async (p, h) => { await h.click("[data-withdraw]", { after: 2500 }); } },
    end("Your profile", "Badges, saved drafts and deleting your account"),
  ],
};
const profile = {
  id: "profile", file: "profile", cookie: ck.u_mine, start: "/",
  steps: [
    { card: { ey: EY, title: "Your profile", sub: "Badges, saved drafts and deleting your account" }, say: "Your profile. In this video, you see your saved drafts and badges, and where to delete your account.", pad: 1.2 },
    ...fromMapProfile(),
    { cap: "Your profile > Drafts", say: "The Drafts tab lists anything you started and saved, so you can pick it up on any device.", do: async (p, h) => { await h.hover('[data-k="drafts"] >> visible=true', 800); await h.hover("text=Our new light show", 900); }, poster: true },
    { cap: "Your profile > Badges", say: "Winners keep a crown. The Badges tab lists the awards your home has won.", do: async (p, h) => { await h.click('[data-k="badges"] >> visible=true', { after: 2500 }); } },
    { cap: "Where badges show", say: "Choose where your badges show, or switch them all off.", do: async (p, h) => { await h.hover("[data-bpm]", 1500); } },
    { cap: "Your profile > Account", say: "The Account tab has your name and photo. At the bottom is Delete my account.", do: async (p, h) => { await h.click('[data-k="account"] >> visible=true', { after: 2000 }); await h.scrollTo("#delacct", 300); } },
    { cap: "Delete my account", say: "Deleting removes your account, drafts, entries and votes, and it cannot be undone. The button asks you to tap again to confirm. We will stop here.", do: async (p, h) => { await h.click("#delacct", { after: 2500 }); } },
    end("Vote in a contest", "Use the category tabs, pick one favorite in each, and share the contest"),
  ],
};
const all = { enter, "edit-entry": edit, profile };
for (const v of process.argv[2] ? [all[process.argv[2]]] : Object.values(all)) await record(v);
