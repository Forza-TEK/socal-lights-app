// Records the two "Vote and judge" tutorials. Vote starts on the map; Judge starts from the judge's invitation email.
// Usage: VOICE=<hfc_female.onnx> COOKIES=<cookies.json> PLAYWRIGHT_PATH=... node scripts/tutorials/vote-judge.mjs [vote|judge]
import { readFileSync } from "node:fs";
import { record, sleep } from "./record.mjs";
import { end as endCard, fromMap } from "./steps.mjs";
import { renderTemplate } from "../../functions/_lib/mailtpl.js";
const ck = JSON.parse(readFileSync(process.env.COOKIES, "utf8")), SLUG = "maple-street-holiday-lights-2026", EY = "Vote and judge";
const end = (t, s) => endCard(EY, t, s);
const vis = (k) => `[data-k="${k}"] >> visible=true`;
const tourSteps = (say) => ({ cap: "Visit the homes", say, do: async (p, h) => { await h.scrollTo("[data-tour]", 90); await h.hover("[data-tour] .leg", 1600); await h.click("[data-tmaps=apple]", { after: 1400 }); await h.click("[data-tmaps=google]", { after: 1400 }); await h.click("[data-tvis] >> nth=0", { after: 1600 }); } });
const vote = {
  id: "vote", file: "vote", phone: true, cookie: ck.u_voter, start: "/",
  steps: [
    { card: { ey: EY, title: "Vote in a contest", sub: "Pick one favorite in each category" }, say: "Vote in a contest. In this video, you pick your favorite homes in a neighborhood contest. It takes about a minute.", pad: 1.2 },
    ...fromMap("contests", "", [
      { cap: "Tap Vote", say: "Under Live now, find the contest and tap Vote. You can also open the link a neighbor sent you, or scan the contest's QR code.", do: async (p, h) => { await h.click(`a[href="/c/${SLUG}"]:has-text("Vote")`, { after: 2600 }); } },
    ]),
    { cap: "Sign in once to vote", say: "The first time you vote, the site asks you to sign in with Google or your email. That keeps it to one vote per person in each category. This video starts after sign in.", do: async (p, h) => { await h.scroll(160); } },
    tourSteps("Before you vote, you can drive past the homes. Visit the homes lists every home in a few driving routes. Choose your maps app, tap a route to open it, and tick each home as you visit it."),
    { cap: "Category tabs", say: "Every home is in every category. Use the category tabs to move between them. You get one vote in each.", do: async (p, h) => { await h.scrollTo(".tabs", 40); await h.hover(`[data-tab="Most Creative"]`, 800); await h.hover(`[data-tab="Best Traditional"]`, 700); } },
    { cap: "Best Traditional", say: "In Best Traditional, scroll through the homes. Tap a photo to see it larger, or tap Vote on your favorite.", do: async (p, h) => { await h.scrollTo(".vrow", 120); await h.click(`[data-vote="p_garcia"]`, { after: 2400 }); }, poster: true },
    { cap: "Most Creative", say: "Your vote is saved, and the next category opens by itself. Tap Vote on your favorite creative display.", do: async (p, h) => { await h.scrollTo(".vrow", 120); await h.click(`[data-vote="p_patel"]`, { after: 2400 }); } },
    { cap: "Best Animated", say: "Do the same in Best Animated.", do: async (p, h) => { await h.scrollTo(".vrow", 120); await h.click(`[data-vote="p_nguyen"]`, { after: 2400 }); } },
    { cap: "Thanks for voting", say: "When you have voted in every category, you see a thank you.", do: async (p, h) => { await h.scrollTo("#sharec", 300); } },
    { cap: "Change your vote", say: "You can change your mind until voting closes. Open a category, then tap Move my vote here.", do: async (p, h) => { await h.scrollTo(".tabs", 40); await h.click(`[data-tab="Best Traditional"]`); await h.scrollTo(".vrow", 120); await h.click(`[data-vote="p_patel"]`, { after: 2400 }); } },
    { cap: "Share this contest", say: "Last, tap Share this contest to send the link to a neighbor.", do: async (p, h) => { await h.scrollTo("#sharec", 300); await h.click("#sharec", { after: 2000 }); } },
    end("Judge a contest", "Open your judge link, score each home, and recuse yourself when you know the household"),
  ],
};
const inv = await renderTemplate({}, "judge_invite", { contest: "Maple Street Holiday Lights 2026", org: "Maple Street Neighbors", how: "Score every home from 1 to 10 in each category.", link: `https://socallights.app/c/${SLUG}/judge` });
const judge = {
  id: "judge", file: "judge", cookie: ck.u_judge, start: "/offline.html",
  steps: [
    { card: { ey: EY, title: "Judge a contest", sub: "Score each home, and recuse yourself when you know the household" }, say: "Judge a contest. In this video, you score the homes as a judge, and skip a home you know.", pad: 1.2 },
    { cap: "Your invitation email", say: "A contest organizer invites you by email. The email says which contest it is, how judging works, and has one button. This is an example.", mail: { subject: inv.subject, html: inv.html, to: "dana@demo.example", note: "Example email" }, pad: 1.4 },
    { cap: "Step 1: Tap Open my judges' ballot", say: "Tap Open my judges' ballot. You sign in with the email address the invitation was sent to. This video starts after sign in.", mail: "keep", do: async (p, h) => { await h.click('#__mail a[href*="/judge"] >> nth=0', { after: 3000 }); } },
    { cap: "Judges' ballot", say: "This is your ballot. It says what to look for, and when voting closes. The counter shows how many scores you have given.", do: async (p, h) => { await h.hover(".status", 1600); } },
    { cap: "Visit the homes", say: "Visit the homes puts every home in a few driving routes, so you can see them in person before you score. Tick each home as you visit it.", do: async (p, h) => { await h.click(vis("tour"), { after: 2200 }); await h.hover("[data-tour] .leg", 1600); await h.click("[data-tvis] >> nth=0", { after: 1600 }); } },
    { cap: "Choose a category", say: "Choose a category from the list on the left. Every home is listed in every category.", do: async (p, h) => { await h.click(vis("c0"), { after: 2200 }); } },
    { cap: "I know this household", say: "If you know a household, tap I know this household. That home is skipped, and your score for it does not count.", do: async (p, h) => { await h.click(`[data-conf="p_okafor"]`, { after: 2400 }); }, poster: true },
    { cap: "Score each home", say: "Now score each of the other homes from one to ten. Open the score box and choose a number.", do: async (p, h) => {
        for (const [id, n] of [["p_garcia", "9"], ["p_patel", "8"], ["p_nguyen", "7"]]) { const sel = `[data-score="${id}|Best Traditional"]`; await h.move(sel); await p.selectOption(sel, n); await h.unring(); await sleep(1700); } } },
    { cap: "Most Creative", say: "Then do the same in each of the other categories.", do: async (p, h) => { await h.click(vis("c1"), { after: 2000 }); const sel = `[data-score="p_johnson|Most Creative"]`; await h.move(sel); await p.selectOption(sel, "8"); await h.unring(); await sleep(1700); } },
    { cap: "Your progress", say: "Go back to the Ballot to see your progress. Your scores stay private until winners are announced, and you can change them until voting closes.", do: async (p, h) => { await h.click(vis("ballot"), { after: 2000 }); await h.hover(".status", 1600); } },
    end("Create a contest with Quick start", "The short setup: seven screens"),
  ],
};
for (const v of process.argv[2] ? [process.argv[2] === "vote" ? vote : judge] : [vote, judge]) await record(v);
