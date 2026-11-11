// The icon a contest shows when its organizer has not uploaded a logo: a round badge with the first letters of the contest's name on a color picked from the name,
// so every contest looks different and the same contest always looks the same. Used by the contest pages, the map card and the /e page (browser and server).
const STOP = new Set(["the", "a", "an", "of", "and", "for", "to", "in", "on", "at", "with"]);
export function contestMark(name) {
  const words = String(name || "").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w && !STOP.has(w.toLowerCase()) && !/^\d+$/.test(w));
  const text = (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "?").slice(0, 2)).toUpperCase();
  let h = 7; for (const ch of String(name || "")) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return { text, hue: h % 360 };
}
const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function contestIconSvg(name) {
  const { text, hue } = contestMark(name), h2 = (hue + 35) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},62%,34%)"/><stop offset="1" stop-color="hsl(${h2},68%,48%)"/></linearGradient></defs><circle cx="48" cy="48" r="48" fill="url(#g)"/><circle cx="48" cy="48" r="42" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/><path d="M48 12l3.2 6.6 7.2 1-5.2 5.1 1.2 7.2L48 28.4l-6.4 3.5 1.2-7.2-5.2-5.1 7.2-1z" fill="#fff" fill-opacity=".85" transform="translate(0 -2) scale(1)"/><text x="48" y="68" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Arial,sans-serif" font-weight="700" font-size="${text.length > 1 ? 34 : 40}" fill="#fff">${xml(text)}</text></svg>`;
}
export const contestIconUri = (name) => "data:image/svg+xml;utf8," + encodeURIComponent(contestIconSvg(name));
// The image to show for a contest: its uploaded logo, or the drawn icon
export const contestImage = (name, logo) => logo || contestIconUri(name);
