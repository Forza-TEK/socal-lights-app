// Steps shared by every tutorial: they all start on the map and teach the way to the feature, one numbered step at a time
// (a caption, the mouse moving to the button, an orange ring around it, then the click).
export const end = (ey, t, s) => ({ card: { ey, title: "Next: " + t, sub: s }, say: "", pad: 3.2 });
const LABEL = { add: "Add", contests: "Contests", tutorials: "Tutorials" };
// "Step 1: ...", "Step 2: ..." captions for a list of { cap, say, do }
export const navSteps = (items) => items.map((it, i) => ({ ...it, cap: `Step ${i + 1}: ${it.cap}`, pad: it.pad ?? 0.7 }));
// map -> three dots -> menu item (which: "add" | "contests" | "tutorials"), then any `more` steps for the same trail
export const fromMap = (which, extra = "", more = []) => navSteps([
  { cap: "Tap the three dots", say: "You start on the map. Tap the three dots at the top." + extra, do: async (p, h) => { await h.click("#morebtn", { after: 1800 }); } },
  { cap: `Tap ${LABEL[which]}`, say: `Then tap ${LABEL[which]}.`, do: async (p, h) => { await h.click(`#moremenu a[href="/${which}"]`, { after: 2200 }); } },
  ...more,
]);
// map -> person icon -> profile
export const fromMapProfile = () => navSteps([
  { cap: "Tap the person icon", say: "You start on the map. Tap the person icon at the top, next to the three dots.", do: async (p, h) => { await h.click("#acctbtn", { after: 2400 }); } },
]);
export const toContest = (btn) => ({ cap: "Tap " + btn, say: `Find the contest, and tap ${btn}.`, do: async (p, h) => { await h.click(`text=${btn}`, { after: 2200 }); } });
