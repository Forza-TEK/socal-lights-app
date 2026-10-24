// Seasons the site covers. Each event and showcased house belongs to one season.
// To add a season later (Fourth of July, spring blooms...), add an entry here and tag events with its key.
export const SEASONS = {
  halloween: {
    label: "Halloween & Día de los Muertos",
    short: "Halloween",
    // month-day window when this season is the default view (inclusive)
    window: ["09-01", "11-02"],
    types: {
      park: "Theme parks & zoos",
      haunt: "Haunted attractions",
      pumpkin: "Pumpkin trails & patches",
      family: "Trick-or-treat & festivals",
      dia: "Día de los Muertos",
      show: "Shows & immersive theater",
    },
    quickDates: [
      ["2026-10-30", "Fri, Oct 30"],
      ["2026-10-31", "Halloween (Sat, Oct 31)"],
      ["2026-11-01", "Sun, Nov 1"],
      ["2026-11-02", "Día de los Muertos (Mon, Nov 2)"],
    ],
    dateRange: ["2026-08-15", "2026-11-15"],
    showcase: {
      title: "Showcase a House",
      pitch: "Built a full graveyard, a 12-foot skeleton crew or a music-synced haunt in the driveway? Put it on the map so trick-or-treaters can find it.",
    },
  },
  christmas: {
    label: "Christmas & Holiday Lights",
    short: "Christmas",
    window: ["11-03", "01-15"],
    types: {
      walk: "Walk-through lights",
      drive: "Drive-by / neighborhood",
      parade: "Boat & street parades",
      park: "Theme parks & zoos",
      tree: "Tree lightings & villages",
      tour: "Tours & rides",
    },
    quickDates: [
      ["2026-11-27", "Day after Thanksgiving (Nov 27)"],
      ["2026-12-12", "Sat, Dec 12"],
      ["2026-12-19", "Sat, Dec 19"],
      ["2026-12-23", "Wed, Dec 23"],
      ["2026-12-31", "New Year's Eve"],
    ],
    dateRange: ["2026-11-01", "2027-01-15"],
    showcase: {
      title: "Showcase a House",
      pitch: "Spent your weekends on a ladder getting it just right? Put your lights on the map. Families use this map to plan their nights out, and your house can sit right alongside the season's big shows.",
    },
  },
};

export const SEASON_KEYS = Object.keys(SEASONS);

// Short labels for every type, used on cards and tags
export const TYPE_SHORT = {
  walk: "Walk-through", drive: "Drive-by", parade: "Parade", park: "Park / zoo", tree: "Tree lighting", tour: "Tour / ride",
  haunt: "Haunt", pumpkin: "Pumpkins", family: "Family event", dia: "Día de los Muertos", show: "Show",
};

// The season to open by default on a given date (YYYY-MM-DD): the one whose window contains it,
// otherwise the next one to start.
export function defaultSeason(isoDate) {
  const md = isoDate.slice(5);
  const inWin = (w) => (w[0] <= w[1] ? md >= w[0] && md <= w[1] : md >= w[0] || md <= w[1]);
  for (const k of SEASON_KEYS) if (inWin(SEASONS[k].window)) return k;
  let best = SEASON_KEYS[0], bestGap = 400;
  for (const k of SEASON_KEYS) {
    const [m, d] = SEASONS[k].window[0].split("-").map(Number), [cm, cd] = md.split("-").map(Number);
    const gap = ((m * 31 + d) - (cm * 31 + cd) + 372) % 372;
    if (gap < bestGap) { bestGap = gap; best = k; }
  }
  return best;
}
