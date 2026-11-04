// Festive printables for a contest: the entry poster and the "VOTE!" yard sign, themed by the contest's season.
// Everything is HTML plus inline SVG sized in container units (cqw), so the on-screen preview and the printed sheet look the same at any size.
//   printable({ kind: "poster" | "sign", season, name, org, city, qr (an <svg> string), url, entriesClose, voteStart, voteEnd })
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// bg: sheet gradient; ink: text on the sheet; hi / hi2: accent colors; bulbs: string-light colors; card: QR frame color
export const THEMES = {
  halloween: { bg: ["#1a0b2e", "#34145c"], ink: "#ffffff", hi: "#ff8a3d", hi2: "#a6ec5b", bulbs: ["#ff8a3d", "#b266ff", "#a6ec5b", "#ffd34d"], dim: "#d9c7f5",
    kicker: "Spooky season is here", poster: "Show off your haunt!", sign: "your favorite haunted home", motifs: ["bat", "pumpkin", "ghost", "pumpkin", "bat"] },
  christmas: { bg: ["#0d3b2a", "#14532d"], ink: "#ffffff", hi: "#ffd34d", hi2: "#ff5a5f", bulbs: ["#ff5a5f", "#ffd34d", "#3ddc84", "#ffffff", "#5cc8ff"], dim: "#cfe8d9",
    kicker: "Deck the halls", poster: "Show off your lights!", sign: "your favorite lights", motifs: ["tree", "snow", "holly", "snow", "tree"] },
  newyear: { bg: ["#0b1030", "#232a7c"], ink: "#ffffff", hi: "#ffd34d", hi2: "#7bdcff", bulbs: ["#ffd34d", "#c8d0ff", "#ff7bd0", "#7bdcff"], dim: "#c8d0ff",
    kicker: "Ring in the glow", poster: "Light up the new year!", sign: "your favorite home", motifs: ["burst", "star", "burst", "star", "burst"] },
  spring: { bg: ["#fff3f8", "#ffd9ea"], ink: "#4a0f2b", hi: "#d81b74", hi2: "#2f9e62", bulbs: ["#ff6fa8", "#ffc933", "#58c985", "#7db8ff"], dim: "#7a3b57",
    kicker: "Spring is blooming", poster: "Show off your blooms!", sign: "your favorite garden", motifs: ["flower", "butterfly", "flower", "butterfly", "flower"] },
  summer: { bg: ["#fff1c2", "#ffd27a"], ink: "#08306b", hi: "#e8431f", hi2: "#1565c0", bulbs: ["#ff5a36", "#ffc933", "#1e90ff", "#22c997"], dim: "#2a4f86",
    kicker: "Sunny days ahead", poster: "Show off your style!", sign: "your favorite home", motifs: ["sun", "burst", "sun", "burst", "sun"] },
};
const themeFor = (s) => THEMES[s] || THEMES.christmas;

// ---- decorations (SVG, drawn in a 100-wide box) ----
function lights(th, { y = 0, count = 6, dip = 12, flip = false } = {}) {
  const w = 100 / count, cols = th.bulbs; let d = `M-1,3`, bulbs = "", k = 0;
  for (let i = 0; i < count; i++) {
    const x0 = i * w, x1 = x0 + w, cx = x0 + w / 2, y0 = 3, cy = 3 + dip * 2;
    d += ` Q${cx},${cy} ${x1 + (i === count - 1 ? 1 : 0)},${y0}`;
    for (const t of [0.17, 0.5, 0.83]) {
      const bx = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, by = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y0, c = cols[k++ % cols.length];
      bulbs += `<g transform="translate(${bx.toFixed(2)} ${by.toFixed(2)})"><circle cy="3.6" r="3.2" fill="${c}" opacity=".28"/><rect x="-.7" y="-.2" width="1.4" height="1.6" rx=".3" fill="#2b2b2b"/><path d="M0 1.2c-1.6 0-2 1.6-1.6 2.9.3 1 1 1.6 1.6 1.6s1.3-.6 1.6-1.6C2 2.8 1.6 1.2 0 1.2z" fill="${c}"/><ellipse cx="-.5" cy="3" rx=".35" ry=".7" fill="#fff" opacity=".6"/></g>`;
    }
  }
  const h = dip * 2 * 0.5 + 12 + dip * 0.5;
  return `<svg class="pz-lights" viewBox="0 0 100 ${h}" width="100%" preserveAspectRatio="none" aria-hidden="true" style="${flip ? "transform:scaleY(-1);" : ""}top:${y}"><path d="${d}" fill="none" stroke="#1d1d1d" stroke-width=".5" opacity=".7"/>${bulbs}</svg>`;
}
const M = {
  pumpkin: (c) => `<ellipse cx="0" cy="0" rx="9" ry="7.4" fill="${c.hi}"/><ellipse cx="-4.6" cy="0" rx="4.1" ry="7.2" fill="#ff9d57"/><ellipse cx="4.6" cy="0" rx="4.1" ry="7.2" fill="#ff9d57"/><ellipse cx="0" cy="0" rx="3.2" ry="7.4" fill="${c.hi}"/><path d="M-.9-7.6c0-2.2.7-3.4 2.4-3.9l.5 1.1c-1 .4-1.2 1.3-1.2 2.8z" fill="#3d8b2f"/><path d="M-4 -1.5l2 2.2 2-2.2 2 2.2 2-2.2v2.2c-1 2.6-6 2.6-8 0z" fill="#2a0f3f" transform="translate(0 1)"/>`,
  bat: () => `<path d="M0 -2.2c.9 0 1.2.9 1.5 1.5 1.8-1.4 4-2.3 7-1.6-1.2.8-1.5 1.9-1.2 3 1.7-.3 2.9-1 4.2-2.3.3 2.9-1.2 5-4.2 5.4-1.7.2-2.7.4-3.7 2-.4-.8-.8-1.4-1.6-1.5-.8.1-1.2.7-1.6 1.5-1-1.6-2-1.8-3.7-2-3-.4-4.5-2.5-4.2-5.4 1.3 1.3 2.5 2 4.2 2.3.3-1.1 0-2.2-1.2-3 3-.7 5.2.2 7 1.6.3-.6.6-1.5 1.5-1.5z" fill="#0f0620" stroke="#b266ff" stroke-width=".4" transform="translate(0 -1) scale(1.05)"/><circle cx="-.8" cy="-.6" r=".35" fill="#a6ec5b"/><circle cx=".8" cy="-.6" r=".35" fill="#a6ec5b"/>`,
  ghost: () => `<path d="M-6 6V-1a6 6 0 0 1 12 0V6l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5z" fill="#ffffff"/><circle cx="-2.2" cy="-1.4" r="1" fill="#1a0b2e"/><circle cx="2.2" cy="-1.4" r="1" fill="#1a0b2e"/><ellipse cx="0" cy="2" rx="1.2" ry="1.5" fill="#1a0b2e"/>`,
  tree: () => `<path d="M0-11l5.5 7h-3l4 5.5h-3.2L9 8.5H-9l4.7-7h-3.2l4-5.5h-3z" fill="#1f9d55" stroke="#0d3b2a" stroke-width=".4"/><rect x="-1.5" y="8.5" width="3" height="3" fill="#7b4a2b"/><path d="M0-14l1.2 2.5 2.7.4-2 1.9.5 2.7L0-8l-2.4 1.5.5-2.7-2-1.9 2.7-.4z" fill="#ffd34d"/><circle cx="-3" cy="2" r=".9" fill="#ff5a5f"/><circle cx="3.2" cy="-1" r=".9" fill="#ffd34d"/><circle cx="1" cy="5.4" r=".9" fill="#5cc8ff"/>`,
  snow: () => `<g stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" fill="none">${[0, 60, 120].map((a) => `<g transform="rotate(${a})"><path d="M0-9V9"/><path d="M0-5.5l-2.3-2.2M0-5.5l2.3-2.2M0 5.5l-2.3 2.2M0 5.5l2.3 2.2"/></g>`).join("")}</g>`,
  holly: () => `<path d="M0 0C-4-8-12-6-12 0c0 5 7 6 12 0z" fill="#1f9d55" stroke="#0d3b2a" stroke-width=".4"/><path d="M0 0C4-8 12-6 12 0c0 5-7 6-12 0z" fill="#27b865" stroke="#0d3b2a" stroke-width=".4"/><circle cx="-1.6" cy="1.2" r="2.2" fill="#e5383b"/><circle cx="2" cy="1.8" r="2.2" fill="#e5383b"/><circle cx=".2" cy="-1" r="2.2" fill="#ff5a5f"/>`,
  burst: (c) => `<g stroke="${c.hi}" stroke-width="1.2" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => `<path d="M0 -3.2V${i % 2 ? -7 : -10}" transform="rotate(${i * 30})"/>`).join("")}</g><circle r="1.6" fill="${c.hi2}"/>`,
  star: (c) => `<path d="M0-9l2.6 6 6.4.6-4.8 4.3 1.4 6.3L0 4.8-5.6 8.2l1.4-6.3L-9-2.4l6.4-.6z" fill="${c.hi}" stroke="#fff" stroke-width=".5" stroke-linejoin="round"/>`,
  flower: (c) => `${Array.from({ length: 6 }, (_, i) => `<ellipse cx="0" cy="-5" rx="2.8" ry="4.2" fill="${i % 2 ? "#ff8fbd" : "#ff6fa8"}" transform="rotate(${i * 60})"/>`).join("")}<circle r="2.3" fill="#ffd34d"/>`,
  butterfly: () => `<path d="M0 0C-3-9-11-8-10-2c1 3 6 3 10 2z" fill="#7db8ff"/><path d="M0 0C3-9 11-8 10-2c-1 3-6 3-10 2z" fill="#9bc9ff"/><path d="M0 0C-5 4-9 9-5 10c3 .5 4-5 5-10z" fill="#58c985"/><path d="M0 0C5 4 9 9 5 10c-3 .5-4-5-5-10z" fill="#7bdca0"/><rect x="-.5" y="-4" width="1" height="11" rx=".5" fill="#4a0f2b"/>`,
  sun: (c) => `<g stroke="${c.hi}" stroke-width="1.4" stroke-linecap="round">${Array.from({ length: 12 }, (_, i) => `<path d="M0 -6.6V-9.6" transform="rotate(${i * 30})"/>`).join("")}</g><circle r="5" fill="#ffc933"/><circle cx="-1.6" cy="-1.4" r="1.5" fill="#fff" opacity=".5"/>`,
};
// A row of motifs along the bottom (or anywhere): n items evenly spaced in a 100-wide strip
function motifRow(th, size = 1) {
  const items = th.motifs, step = 100 / items.length;
  return `<svg class="pz-motifs" viewBox="0 0 100 12.5" width="100%" aria-hidden="true">${items.map((m, i) => `<g transform="translate(${(step * (i + 0.5)).toFixed(1)} ${i % 2 ? 7.2 : 6.6}) scale(${(size * (i % 2 ? 0.7 : 0.86)).toFixed(2)})">${M[m](th)}</g>`).join("")}</svg>`;
}
// Scattered sparkles / snow: fixed positions so the sheet looks the same every time
const SPARK = [[8, 20], [22, 33], [90, 24], [76, 37], [12, 52], [94, 58], [6, 74], [88, 80], [30, 12], [66, 15], [50, 25], [82, 12], [40, 66], [60, 90], [16, 91], [44, 8]];
const sparkles = (th) => `<svg class="pz-sparks" viewBox="0 0 100 130" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">${SPARK.map(([x, y], i) => `<circle cx="${x}" cy="${y * 1.3}" r="${(0.35 + (i % 3) * 0.25).toFixed(2)}" fill="${th.hi}" opacity="${0.35 + (i % 4) * 0.12}"/>`).join("")}</svg>`;

const fmt = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : ""; };

export function printable(o) {
  const th = themeFor(o.season), sign = o.kind === "sign", name = esc(o.name), host = [o.org, o.city].filter(Boolean).map(esc).join(" · ");
  const when = [o.entriesClose ? `Enter by ${fmt(o.entriesClose)}` : "", o.voteStart && o.voteEnd ? `Voting ${fmt(o.voteStart)} to ${fmt(o.voteEnd)}` : ""].filter(Boolean);
  const nl = String(o.name || "").length, ns = sign ? (nl > 60 ? 3.6 : nl > 38 ? 4.2 : 5) : (nl > 60 ? 4 : nl > 38 ? 4.6 : 5);
  const qs = sign ? (nl > 38 ? 33 : 39) : 31;
  const style = `--ns:${ns}cqw;--qs:${qs}cqw;--bg1:${th.bg[0]};--bg2:${th.bg[1]};--ink:${th.ink};--hi:${th.hi};--hi2:${th.hi2};--dim:${th.dim}`;
  const frame = `<div class="pz-qr"><div class="pz-qrin">${o.qr || ""}</div></div>`;
  const body = sign
    ? `<div class="pz-vote">VOTE!</div><div class="pz-for">for ${esc(th.sign)}</div><div class="pz-name">${name}</div>${frame}<div class="pz-cap"><b>Scan to vote.</b> It's free!</div>`
    : `<div class="pz-kick">${esc(th.kicker)}</div><div class="pz-head">${esc(th.poster)}</div><div class="pz-name">${name}</div>${host ? `<div class="pz-host">${host}</div>` : ""}${frame}<div class="pz-cap"><b>Scan to enter your home.</b> It's free!</div>${when.length ? `<div class="pz-when">${when.map((w) => `<span>${esc(w)}</span>`).join("")}</div>` : ""}`;
  return `<div class="pz pz-${sign ? "sign" : "poster"}" style="${style}">${sparkles(th)}${lights(th, { count: 6, dip: sign ? 4.5 : 5.5 })}<div class="pz-in">${body}</div><div class="pz-bot">${motifRow(th, 1)}<div class="pz-url"><img src="/img/badge-160.webp" alt="" width="28" height="28"><span>${esc(o.url || "socallights.app")}</span></div></div></div>`;
}
