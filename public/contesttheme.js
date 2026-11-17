// A festive backdrop for each contest page, chosen from the contest's title (and its season when the title says nothing): Christmas lights, winter, Halloween,
// harvest, New Year, Valentine's, spring and patriotic. Pure drawing (inline SVG and gradients, no pictures to download), so every contest looks festive and the same contest always looks the same.
// The page sets body[data-fest] and the CSS variables below; contest.css paints a band across the top and a faint pattern behind everything. Cards stay solid so text is always readable.
const RULES = [
  ["halloween", /halloween|spooky|haunt|pumpkin|scary|trick|monster|costume|ghost|witch/],
  ["harvest", /thanksgiving|harvest|autumn|\bfall\b|turkey|gratitude/],
  ["newyear", /new year|nye|countdown|midnight/],
  ["valentines", /valentine|sweetheart|love|heart/],
  ["spring", /easter|spring|blossom|garden|bloom|egg hunt|flower/],
  ["patriotic", /patriot|independence|fourth of july|4th of july|july 4|red, white|stars and stripes|flag/],
  ["winter", /snow|winter|frost|frozen|\bice\b|wonderland|north pole|polar|igloo/],
  ["lights", /christmas|xmas|holiday|lights|lighting|santa|merry|festive|decorat|noel|yule|jingle|reindeer|gingerbread|candy cane|nativity|menorah|hanukkah/],
];
const BY_SEASON = { christmas: "lights", halloween: "halloween", thanksgiving: "harvest", newyear: "newyear", valentines: "valentines", spring: "spring" };
export function themeFor(name, season) {
  const t = String(name || "").toLowerCase();
  for (const [k, re] of RULES) if (re.test(t)) return k;
  return BY_SEASON[season] || "lights";
}

const uri = (svg) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const svg = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;

// A wire that sags between hooks, with a bulb hanging at three points of each swag.
const bulbs = (colors, wire) => {
  let o = `<path d="M0 8 ${Array.from({ length: 4 }, (_, i) => `Q${45 + i * 90} 50 ${90 + i * 90} 8`).join(" ")}" fill="none" stroke="${wire}" stroke-width="2"/>`, n = 0;
  for (let i = 0; i < 4; i++) for (const t of [0.22, 0.5, 0.78]) {
    const x = 90 * i + 90 * t, y = 8 + 84 * t * (1 - t) * 0.98, c = colors[n++ % colors.length];
    o += `<circle cx="${x.toFixed(1)}" cy="${(y + 11).toFixed(1)}" r="13" fill="${c}" opacity=".22"/><rect x="${(x - 2.5).toFixed(1)}" y="${(y - 1).toFixed(1)}" width="5" height="5" fill="${wire}"/><ellipse cx="${x.toFixed(1)}" cy="${(y + 9).toFixed(1)}" rx="5.5" ry="8" fill="${c}"/><ellipse cx="${(x - 1.8).toFixed(1)}" cy="${(y + 6).toFixed(1)}" rx="1.4" ry="2.6" fill="#fff" opacity=".6"/>`;
  }
  return svg(360, 90, o);
};
// Shapes scattered over a tile, each given its position, size, angle and color.
const scatter = (w, h, count, seed, colors, shape) => {
  const r = rng(seed); let o = "";
  for (let i = 0; i < count; i++) o += `<g transform="translate(${(r() * w).toFixed(1)} ${(r() * h).toFixed(1)}) rotate(${Math.round(r() * 360)}) scale(${(0.6 + r() * 0.9).toFixed(2)})" fill="${colors[i % colors.length]}" stroke="${colors[i % colors.length]}">${shape(r)}</g>`;
  return svg(w, h, o);
};
const dot = () => `<circle r="3" stroke="none"/>`;
const flake = () => `<g stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M0-8V8M-7-4L7 4M-7 4L7-4"/><path d="M-2-8L0-6L2-8M-2 8L0 6L2 8" stroke-width="1.2"/></g>`;
const leaf = () => `<path d="M0-9C7-6 8 3 0 9C-8 3-7-6 0-9Z" stroke="none"/><path d="M0-9V10" stroke="#00000033" fill="none"/>`;
const heart = () => `<path d="M0 6C-9-1-7-9 0-4C7-9 9-1 0 6Z" stroke="none"/>`;
const bloom = () => `<g stroke="none"><circle cx="0" cy="-5" r="3.4"/><circle cx="5" cy="-1.5" r="3.4"/><circle cx="3" cy="4.5" r="3.4"/><circle cx="-3" cy="4.5" r="3.4"/><circle cx="-5" cy="-1.5" r="3.4"/></g><circle r="2.2" fill="#ffd54a" stroke="none"/>`;
const star = () => `<path d="M0-8L2.4-2.6L8-2.4L3.6 1.4L5 7L0 4L-5 7L-3.6 1.4L-8-2.4L-2.4-2.6Z" stroke="none"/>`;
const sparkle = () => `<path d="M0-8C1 -2 2 -1 8 0C2 1 1 2 0 8C-1 2 -2 1 -8 0C-2 -1 -1 -2 0-8Z" stroke="none"/>`;
const confetti = () => `<rect x="-3" y="-1.6" width="6" height="3.2" rx=".8" stroke="none"/>`;
const bat = () => `<path d="M0 -3C3-8 9-8 14-4C11-4 10-2 9 0C7-2 5-2 4 1C2-1 1-1 0 3C-1-1-2-1-4 1C-5-2-7-2-9 0C-10-2-11-4-14-4C-9-8-3-8 0-3Z" stroke="none"/>`;
const pumpkin = () => `<ellipse cx="0" cy="1" rx="9" ry="7.5" stroke="none"/><path d="M0-6.5C-1-9 1-10 3-10" stroke="#3b7a2a" stroke-width="2" fill="none"/>`;

// Per theme: band = the gradient across the top of the page; art = the drawing repeated along its top edge (or one big drawing); tile = the faint pattern behind everything.
const THEMES = {
  lights: { band: "linear-gradient(180deg,#0a2540 0%,#12466b 58%,rgba(18,70,107,0) 100%)", art: bulbs(["#ff4d5e", "#ffd24d", "#4dd2ff", "#5be37d", "#ff8ad8"], "#14301f"), artSize: "360px 90px", tile: scatter(220, 220, 18, 11, ["#ffffff", "#ffd24d", "#ff6b78"], dot), tileOpacity: 0.12 },
  winter: { band: "linear-gradient(180deg,#0d3b66 0%,#5aa9d6 62%,rgba(150,205,235,0) 100%)", art: scatter(300, 100, 14, 5, ["#ffffff"], flake), artSize: "300px 100px", tile: scatter(200, 200, 14, 21, ["#7fb6dd", "#ffffff"], flake), tileOpacity: 0.16 },
  halloween: { band: "linear-gradient(180deg,#1b1033 0%,#5b2a86 52%,rgba(255,122,24,0) 100%)", art: scatter(320, 90, 8, 31, ["#0d0716", "#ff7a18"], (r) => (r() > 0.5 ? bat() : pumpkin())), artSize: "320px 90px", tile: scatter(220, 220, 10, 7, ["#ff7a18", "#8a4fd0"], (r) => (r() > 0.5 ? bat() : pumpkin())), tileOpacity: 0.1 },
  harvest: { band: "linear-gradient(180deg,#6b2d0f 0%,#c4691d 55%,rgba(232,170,60,0) 100%)", art: scatter(320, 100, 12, 17, ["#b3361b", "#e07a1f", "#e8b03a", "#7a4a1e"], leaf), artSize: "320px 100px", tile: scatter(220, 220, 14, 41, ["#c4691d", "#b3361b", "#e8b03a"], leaf), tileOpacity: 0.12 },
  newyear: { band: "linear-gradient(180deg,#0a0f2c 0%,#1d2a6b 60%,rgba(29,42,107,0) 100%)", art: scatter(320, 100, 22, 3, ["#ffd24d", "#ffffff", "#c9d3ff", "#ff9fc4"], (r) => (r() > 0.45 ? sparkle() : confetti())), artSize: "320px 100px", tile: scatter(220, 220, 22, 9, ["#ffd24d", "#c9d3ff", "#ffffff"], (r) => (r() > 0.45 ? sparkle() : confetti())), tileOpacity: 0.12 },
  valentines: { band: "linear-gradient(180deg,#8f1d44 0%,#e0527a 60%,rgba(240,140,170,0) 100%)", art: scatter(300, 100, 14, 8, ["#ffd0dc", "#ffffff", "#ff9fb7"], heart), artSize: "300px 100px", tile: scatter(220, 220, 14, 13, ["#e0527a", "#ff9fb7"], heart), tileOpacity: 0.12 },
  spring: { band: "linear-gradient(180deg,#2f8f6b 0%,#8fd4a8 60%,rgba(190,235,205,0) 100%)", art: scatter(300, 100, 14, 19, ["#ffffff", "#ffc2d6", "#ffe58a", "#cdb8ff"], bloom), artSize: "300px 100px", tile: scatter(220, 220, 14, 23, ["#ff9fb7", "#ffe58a", "#cdb8ff"], bloom), tileOpacity: 0.14 },
  patriotic: { band: "linear-gradient(180deg,#0d2250 0%,#1f4aa3 58%,rgba(31,74,163,0) 100%)", art: scatter(300, 100, 16, 27, ["#ffffff", "#e5384a"], star), artSize: "300px 100px", tile: scatter(220, 220, 12, 29, ["#1f4aa3", "#e5384a"], star), tileOpacity: 0.1 },
};

// Paints the theme on an element (the page body): the variables contest.css reads.
export function applyTheme(el, key) {
  const t = THEMES[key]; if (!t) { delete el.dataset.fest; return; }
  el.dataset.fest = key;
  const hdr = document.querySelector(".hdr"); el.style.setProperty("--fest-top", (hdr ? hdr.offsetHeight : 0) + "px"); // the band starts under the page header
  el.style.setProperty("--fest-band", t.band); el.style.setProperty("--fest-art", uri(t.art)); el.style.setProperty("--fest-art-size", t.artSize);
  el.style.setProperty("--fest-tile", uri(t.tile)); el.style.setProperty("--fest-tile-opacity", String(t.tileOpacity));
}
export const THEME_KEYS = Object.keys(THEMES);
