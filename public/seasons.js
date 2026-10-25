// Seasons the site covers, in calendar order. Each event and showcased house belongs to one season.
// The site opens on the season whose window contains today, and teases the one after it.
// To add a season, add an entry here (in calendar order), give it a color in styles.css, and tag events with its key.
export const SEASONS = {
  newyear: {
    label: "New Year's & Lunar New Year",
    short: "New Year",
    // month-day window when this season is the default view (inclusive; may wrap the year end)
    window: ["12-27", "02-19"],
    types: {
      nye: "New Year's Eve & fireworks",
      family: "Noon Year's & family events",
      parade: "Rose Parade & parades",
      lunar: "Lunar New Year festivals",
      show: "Shows & festivals",
    },
    quickDates: [
      ["2026-12-31", "New Year's Eve"],
      ["2027-01-01", "Rose Parade (Jan 1)"],
      ["2027-02-06", "Lunar New Year (Sat, Feb 6)"],
      ["2027-02-13", "Golden Dragon Parade (Feb 13)"],
    ],
    dateRange: ["2026-12-20", "2027-02-28"],
    showcase: {
      title: "Showcase a House",
      pitch: "Lights still glowing for New Year's, or lanterns and red-and-gold for Lunar New Year? Put your house on the map so neighbors can stop by.",
    },
  },
  spring: {
    label: "Spring Blooms, Easter & Cinco de Mayo",
    short: "Spring",
    window: ["02-20", "05-15"],
    types: {
      bloom: "Flower fields & wildflowers",
      nature: "Whale watching & nature",
      stpat: "St. Patrick's Day",
      easter: "Easter & egg hunts",
      cinco: "Cinco de Mayo",
      festival: "Spring festivals & fairs",
    },
    quickDates: [
      ["2027-03-13", "St. Patrick's parades (Sat, Mar 13)"],
      ["2027-03-27", "Easter weekend (Sat, Mar 27)"],
      ["2027-05-01", "Cinco de Mayo weekend (May 1)"],
    ],
    dateRange: ["2027-02-01", "2027-05-31"],
    showcase: {
      title: "Showcase a House",
      pitch: "Giant egg displays, a front yard in full bloom, or a garden worth a detour? Share it on the map for spring wanderers.",
    },
  },
  summer: {
    label: "Summer & Fourth of July",
    short: "Summer",
    window: ["05-16", "08-31"],
    types: {
      fireworks: "Fourth of July fireworks & parades",
      fair: "County fairs",
      concert: "Outdoor concerts & movies",
      festival: "Summer festivals & art shows",
      park: "Theme parks & zoos",
    },
    quickDates: [
      ["2027-07-03", "Sat, Jul 3"],
      ["2027-07-04", "Fourth of July (Sun)"],
    ],
    dateRange: ["2027-05-01", "2027-09-06"],
    showcase: {
      title: "Showcase a House",
      pitch: "Red, white and blue from the roofline to the curb? Put your Fourth of July house on the map so parade-goers can swing by.",
    },
  },
  halloween: {
    label: "Halloween & Día de los Muertos",
    short: "Halloween",
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
    window: ["11-03", "12-26"],
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
  nye: "New Year's Eve", lunar: "Lunar New Year", bloom: "Blooms", nature: "Nature", stpat: "St. Patrick's",
  easter: "Easter", cinco: "Cinco de Mayo", festival: "Festival", fireworks: "Fireworks", fair: "Fair", concert: "Concert / movie",
};

const inWin = (w, md) => (w[0] <= w[1] ? md >= w[0] && md <= w[1] : md >= w[0] || md <= w[1]);

// The season to open by default on a given date (YYYY-MM-DD): the one whose window contains it,
// otherwise the next one to start.
export function defaultSeason(isoDate) {
  const md = isoDate.slice(5);
  for (const k of SEASON_KEYS) if (inWin(SEASONS[k].window, md)) return k;
  let best = SEASON_KEYS[0], bestGap = 400;
  for (const k of SEASON_KEYS) {
    const [m, d] = SEASONS[k].window[0].split("-").map(Number), [cm, cd] = md.split("-").map(Number);
    const gap = ((m * 31 + d) - (cm * 31 + cd) + 372) % 372;
    if (gap < bestGap) { bestGap = gap; best = k; }
  }
  return best;
}

// Seasons in the order they come up, starting with the given one (the current season first).
export function seasonsFrom(k) {
  const i = Math.max(0, SEASON_KEYS.indexOf(k));
  return [...SEASON_KEYS.slice(i), ...SEASON_KEYS.slice(0, i)];
}

// The date (YYYY-MM-DD) a season next becomes the default view, on or after isoDate.
export function seasonStarts(k, isoDate) {
  const y = Number(isoDate.slice(0, 4)), start = SEASONS[k].window[0];
  const d = `${y}-${start}`;
  return d >= isoDate ? d : `${y + 1}-${start}`;
}
