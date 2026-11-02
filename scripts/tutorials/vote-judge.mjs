// Records the two "Vote and judge" tutorials. Needs the local dev server and the demo seed (see seed-demo.mjs).
// Usage: VOICE=<hfc_female.onnx> COOKIES=<cookies.json> node scripts/tutorials/vote-judge.mjs [vote|judge]
import { readFileSync } from "node:fs";
import { record, sleep } from "./record.mjs";
const ck = JSON.parse(readFileSync(process.env.COOKIES, "utf8")), SLUG = "maple-street-holiday-lights-2026", EY = "Vote and judge";
const end = (t, s) => ({ card: { ey: EY, title: "Next: " + t, sub: s }, say: "", pad: 3.2 });
const vis = (k) => `[data-k="${k}"] >> visible=true`;
const vote = {
  id: "vote", file: "vote", phone: true, cookie: ck.u_voter, start: "/c/" + SLUG,
  steps: [
    { card: { ey: EY, title: "Vote in a contest", sub: "Pick one favorite in each category" }, say: "Vote in a contest. In this video, you pick your favorite homes in a neighborhood contest. It takes about a minute.", pad: 1.2 },
    { cap: "Open the contest link", say: "Open the contest link that a neighbor or the city sent you. You see the contest name, and a note that voting is open.", poster: false },
    { cap: "Sign in once to vote", say: "The first time you tap Vote, the site asks you to sign in with Google or your email. That keeps it to one vote per person in each category. This video starts after sign in.", do: async (p, h) => { await h.scroll(160); } },
    { cap: "Category tabs", say: "Every home is in every category. Use the category tabs to move between them. You get one vote in each.", do: async (p, h) => { await h.scrollTo(".tabs", 40); await h.hover(`[data-tab="Most Creative"]`, 700); await h.hover(`[data-tab="Best Traditional"]`, 600); } },
    { cap: "Best Traditional > Vote", say: "In Best Traditional, scroll through the homes. Tap a photo to see it larger, or tap Vote on your favorite.", do: async (p, h) => { await h.scrollTo(".vrow", 120); await h.click(`[data-vote="p_garcia"]`, { after: 2200 }); }, poster: true },
    { cap: "Most Creative > Vote", say: "Your vote is saved, and the next category opens by itself. Tap Vote on your favorite creative display.", do: async (p, h) => { await h.scrollTo(".vrow", 120); await h.click(`[data-vote="p_patel"]`, { after: 2200 }); } },
    { cap: "Best Animated > Vote", say: "Do the same in Best Animated.", do: async (p, h) => { await h.scrollTo(".vrow", 120); await h.click(`[data-vote="p_nguyen"]`, { after: 2200 }); } },
    { cap: "Thanks for voting", say: "When you have voted in every category, you see a thank you.", do: async (p, h) => { await h.scrollTo("#sharec", 300); } },
    { cap: "Change your vote", say: "You can change your mind until voting closes. Open a category, then tap Move my vote here.", do: async (p, h) => { await h.scrollTo(".tabs", 40); await h.click(`[data-tab="Best Traditional"]`); await h.scrollTo(".vrow", 120); await h.click(`[data-vote="p_patel"]`, { after: 2200 }); } },
    { cap: "Share this contest", say: "Last, tap Share this contest to send the link to a neighbor.", do: async (p, h) => { await h.scrollTo("#sharec", 300); await h.click("#sharec", { after: 2000 }); } },
    end("Judge a contest", "Open your judge link, score each home, and recuse yourself when you know the household"),
  ],
};
const judge = {
  id: "judge", file: "judge", cookie: ck.u_judge, start: `/c/${SLUG}/judge`,
  steps: [
    { card: { ey: EY, title: "Judge a contest", sub: "Score each home, and recuse yourself when you know the household" }, say: "Judge a contest. In this video, you score the homes as a judge, and skip a home you know.", pad: 1.2 },
    { cap: "Your judge link", say: "Judges get an email invitation with a personal link. Open it and sign in with the invited email address. This is your ballot.", poster: false },
    { cap: "Judges' ballot", say: "The ballot says what to look for, and when voting closes. The counter shows how many scores you have given.", do: async (p, h) => { await h.hover(".status", 1400); } },
    { cap: "Best Traditional", say: "Choose a category from the list on the left. Every home is listed in every category.", do: async (p, h) => { await h.click(vis("c0")); } },
    { cap: "I know this household", say: "If you know a household, tap I know this household. That home is skipped, and your score for it does not count.", do: async (p, h) => { await h.click(`[data-conf="p_okafor"]`, { after: 2200 }); }, poster: true },
    { cap: "Score each home", say: "Now score each of the other homes from one to ten. Open the score box and choose a number.", do: async (p, h) => {
        for (const [id, n] of [["p_garcia", "9"], ["p_patel", "8"], ["p_nguyen", "7"]]) { const sel = `[data-score="${id}|Best Traditional"]`; await h.move(sel); await p.selectOption(sel, n); await sleep(1700); } } },
    { cap: "Most Creative", say: "Then do the same in each of the other categories.", do: async (p, h) => { await h.click(vis("c1")); const sel = `[data-score="p_johnson|Most Creative"]`; await h.move(sel); await p.selectOption(sel, "8"); await sleep(1700); } },
    { cap: "Your progress", say: "Go back to the Ballot to see your progress. Your scores stay private until winners are announced, and you can change them until voting closes.", do: async (p, h) => { await h.click(vis("ballot")); await h.hover(".status", 1400); } },
    end("Create a contest with Quick start", "The short setup: seven screens"),
  ],
};
for (const v of process.argv[2] ? [process.argv[2] === "vote" ? vote : judge] : [vote, judge]) await record(v);
