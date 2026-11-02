// Steps shared by every tutorial: they all start on the map and show the way to the feature.
export const EYES = {};
export const end = (ey, t, s) => ({ card: { ey, title: "Next: " + t, sub: s }, say: "", pad: 3.2 });
// map -> three dots -> menu item. which: "add" | "contests" | "tutorials"
const LABEL = { add: "Add", contests: "Contests", tutorials: "Tutorials" };
export const fromMap = (which, extra = "") => [
  { cap: "Start on the map", say: "Start on the map. Tap the three dots at the top." + extra, do: async (p, h) => { await h.hover("#morebtn", 900); await h.click("#morebtn", { after: 1800 }); } },
  { cap: "Three dots > " + LABEL[which], say: `Choose ${LABEL[which]}.`, do: async (p, h) => { await h.click(`#moremenu a[href="/${which}"]`, { after: 2200 }); } },
];
// map -> person icon -> profile
export const fromMapProfile = () => [
  { cap: "Start on the map", say: "Start on the map. Tap the person icon at the top, next to the three dots.", do: async (p, h) => { await h.hover("#acctbtn", 900); await h.click("#acctbtn", { after: 2400 }); } },
];
// contests page -> a contest (Vote or Enter)
export const toContest = (btn) => ({ cap: "Contests > " + btn, say: `Find the contest, and tap ${btn}.`, do: async (p, h) => { await h.click(`text=${btn}`, { after: 2200 }); } });
