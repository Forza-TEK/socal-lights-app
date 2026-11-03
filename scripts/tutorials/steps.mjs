// Steps shared by every tutorial: they all start on the map and teach the way to the feature, one numbered step at a time
// (a caption, the mouse moving to the button, an orange ring around it, then the click).
export const end = (ey, t, s) => ({ card: { ey, title: "Next: " + t, sub: s }, say: "", pad: 3.2 });
const LABEL = { add: "Add", contests: "Contests", tutorials: "Tutorials" };
// "Step 1: ...", "Step 2: ..." captions for a list of { cap, say, do }
export const navSteps = (items) => items.map((it, i) => ({ ...it, cap: `Step ${i + 1}: ${it.cap}`, pad: it.pad ?? 0.7 }));
// map -> three dots -> menu item (which: "add" | "contests" | "tutorials"), then any `more` steps for the same trail
export const fromMap = (which, extra = "", more = []) => navSteps([
  { cap: "Tap the three dots", say: "We start on the map. Look at the top right corner of the screen. You will see three dots. Tap the three dots." + extra, target: "#morebtn", after: 1200 },
  { cap: `Tap ${LABEL[which]}`, say: which === "add" ? "A menu opens. At the top of the menu you will see Add. Tap Add." : `A menu opens. Find ${LABEL[which]} in the list, and tap ${LABEL[which]}.`, target: `#moremenu a[href="/${which}"]`, after: 1500 },
  ...more,
]);
// map -> person icon -> profile
export const fromMapProfile = () => navSteps([
  { cap: "Tap the person icon", say: "You start on the map. Tap the person icon at the top, next to the three dots.", do: async (p, h) => { await h.click("#acctbtn", { after: 2400 }); } },
]);
export const toContest = (btn) => ({ cap: "Tap " + btn, say: `Find the contest, and tap ${btn}.`, do: async (p, h) => { await h.click(`text=${btn}`, { after: 2200 }); } });
