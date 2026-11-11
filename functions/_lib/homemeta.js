// The home page's title, description and share text, written for what people search for in the season they are in
// ("Christmas lights near me" in November, "Halloween events" in October). Same season windows as the map (public/seasons.js).
// public/index.html carries the Christmas wording as its default; GET / (functions/index.js) swaps in the right season's text.
// Limits: title at most 60 characters, description at most 155 (search results cut longer ones). No keyword lists: one plain sentence each.
import { defaultSeason, phaseFor } from "../../public/seasons.js";

export const HOME_META = {
  christmas: {
    title: "Christmas Lights & Holiday Events Near You | SoCal Lights",
    desc: "Find Christmas lights, tree lightings, parades and holiday events across Southern California on one street-level map, with dates and directions.",
  },
  halloween: {
    title: "Halloween Events & Haunted Houses Near You | SoCal Lights",
    desc: "Find Halloween events, haunted houses, pumpkin patches and Day of the Dead festivals across Southern California on one map, with dates and directions.",
  },
  newyear: {
    title: "New Year's Eve & Lunar New Year Near You | SoCal Lights",
    desc: "Find New Year's Eve parties, fireworks, the Rose Parade and Lunar New Year festivals across Southern California on one map, with dates and directions.",
  },
  valentines: {
    title: "Valentine's Day Events & Date Ideas Near You | SoCal Lights",
    desc: "Find Valentine's Day dinners, dances, wine tastings and light shows across Southern California on one street-level map, with dates and directions.",
  },
  spring: {
    title: "Spring Flowers & Easter Events Near You | SoCal Lights",
    desc: "Find wildflower blooms, Easter egg hunts, St. Patrick's and Cinco de Mayo events across Southern California on one map, with dates and directions.",
  },
  summer: {
    title: "Fourth of July & Summer Events Near You | SoCal Lights",
    desc: "Find Fourth of July fireworks, fairs, concerts and summer festivals across Southern California on one street-level map, with dates and directions.",
  },
};

export const homeMeta = (isoDate) => HOME_META[defaultSeason(isoDate)] || HOME_META.christmas;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
// Swap the title, description and Open Graph text in the static page, and write the current season into the first HTML (the colour, the season button's
// icon and name) so a slow connection never flashes another season before app.js runs. A tag that is not found is left alone.
export function applyHomeMeta(html, isoDate) {
  const m = homeMeta(isoDate), k = defaultSeason(isoDate), ph = phaseFor(k, isoDate);
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(m.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(m.desc)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(m.title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(m.desc)}">`)
    .replace(/<html lang="en" data-theme="light"(?: data-season="[a-z]*")?>/, `<html lang="en" data-theme="light" data-season="${k}">`)
    .replace(/(id="seasonico" aria-hidden="true">)[^<]*(<\/span><span id="seasonlbl">)[^<]*(<\/span>)/, (_, a, b, c) => `${a}${ph.icon}${b}${esc(ph.name)}${c}`)
    .replace(/(id="seasonbtn"[^>]*aria-label=")Season[^"]*(")/, (_, a, b) => `${a}Season: ${esc(ph.name)}${b}`);
}
