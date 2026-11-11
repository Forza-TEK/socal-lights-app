// Shared data-quality rules for event rows (audit 2026-11-11, DAT-01, DAT-06, DAT-07, DAT-09).
// Used by scripts/validate-migrations.mjs (checks rows a migration adds or changes) and by the sweep tools
// scripts/audit-event-photos.mjs and scripts/coverage-report.mjs. No dependencies, runs in Node 22.

// ---------- DAT-06: hours text ----------
// One style for every hours text: times as "7pm" / "7:30pm" (lowercase, no space, no ":00"), ranges with one en dash and
// no spaces ("5pm–9pm", "10am–3pm", "Fri–Sun"), and "; check site" as the only way to say the times are estimated.
// normalizeHours() is deterministic and idempotent: normalizeHours(normalizeHours(x)) === normalizeHours(x).
export function normalizeHours(input) {
  let h = String(input ?? "").replace(/\s+/g, " ").trim();
  if (!h) return h;
  // a.m. / p.m. / AM / "10 am" -> 10am
  h = h.replace(/(\d)\s*([ap])\.?\s?m\b\.?/gi, (_, d, ap) => `${d}${ap.toLowerCase()}m`);
  // 7:00pm -> 7pm (keeps 7:30pm)
  h = h.replace(/(\d{1,2}):00(?!\d)/g, "$1");
  // one dash between times, dates and day names: 5pm - 9pm, 5-9pm, 5pm—9pm -> 5pm–9pm
  h = h.replace(/(\d(?:am|pm)?|noon|midnight)\s*[-–—]\s*(?=\d|noon|midnight)/gi, "$1–");
  const DAY = "(?:Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat|Sun)[a-z]*";
  h = h.replace(new RegExp(`\\b(${DAY})\\s*[-–—]\\s*(?=${DAY}\\b)`, "g"), "$1–");
  // "(check site), check site" says the same thing twice
  if (/check site\s*$/i.test(h)) h = h.replace(/\s*\(check site\),?/gi, "");
  // one separator before "check site"
  h = h.replace(/(\S)\s*(?:—|–|-|,|;)\s*(check site)\b/gi, "$1; $2");
  h = h.replace(/([^\s;,—–-])\s+(check site)\s*$/i, "$1; $2");
  // "see site" as a trailing phrase means the same as "check site"
  h = h.replace(/;\s*see site\s*$/i, "; check site").replace(/^see site\s*$/i, "Check site");
  // a spaced em dash left over is a separator, not a range
  h = h.replace(/\s+—\s+/g, "; ");
  return h.replace(/\s+/g, " ").trim();
}

// ---------- DAT-07: free flag against the price text ----------
// free=1 means general admission is free. The price text must then START with "Free" ("Free; parking $15" is fine). Anything else
// (a price, "Check listing", "Kids $5; free for adults") is free=0. Returns "" when they agree, otherwise a message.
export function freeFlagProblem(free, price) {
  const p = String(price ?? "").trim();
  const startsFree = /^free\b/i.test(p);
  if (Number(free) === 1 && !startsFree) return `free=1 but the price says "${p}": the price must start with "Free", or set free=0`;
  if (Number(free) === 0 && startsFree) return `free=0 but the price says "${p}": set free=1, or reword the price so it does not start with "Free" (for example "Kids $5; adults free")`;
  return "";
}

// ---------- DAT-01: event photos ----------
// A CITY or GOVERNMENT event (organizer, source or venue like "City of", "Parks and Recreation", a .gov domain) may keep its city
// logo or seal as the card photo. For every other event a logo, badge, banner, newsletter cover, website screenshot or unrelated
// picture is rejected and the card shows the stock photo for the event's type (public/stock.js).
const CITY_TEXT = [
  /\bcity of\b/i, /\bcounty of\b/i, /\bparks?\s*(?:and|&)\s*(?:rec(?:reation)?|community services)\b/i,
  /\brecreation\s*(?:and|&)\s*park\b/i, /\bparks?\s*,?\s*recreation\b/i, /\bcommunity services\b/i, /\bpublic library\b/i, /\bcounty library\b/i,
];
const CITY_HOST = [/\.gov(?:\/|$|:)/i, /\.ca\.us(?:\/|$|:)/i, /\.gov\.[a-z]{2}(?:\/|$)/i, /(?:^|\.)cityof[a-z-]+\./i, /(?:^|\.)ci\.[a-z-]+\.ca\.us/i];
function hostOf(u) { try { return new URL(u).host.toLowerCase(); } catch { return ""; } }
export function isCityEvent(r) {
  const text = [r.name, r.venue, r.blurb].join(" | ");
  if (CITY_TEXT.some((re) => re.test(text))) return true;
  const hosts = [r.url, r.image].map(hostOf).filter(Boolean).join(" ");
  return CITY_HOST.some((re) => re.test(hosts + "/"));
}
// Words in the picture's file name that mean it is not a photo of the event. "logoish" ones a city event may keep (its own logo or seal);
// the rest are never a photo of the event, whoever runs it.
const LOGOISH = /(?:^|[^a-z])(?:logo|logotype|wordmark|brand|favicon|icon)(?:[^a-z]|$)/i;
const NOT_A_PHOTO = /(?:^|[^a-z])(?:badge|newsletter|placeholder|default-og|generic-default|default-image|mk-fb-default|wordmark|sprite)(?:[^a-z]|$)/i;
const BANNERISH = /(?:^|[^a-z])(?:banner|header[-_ ]?image|web-?header|screenshot|og-image|opengraph-image)(?:[^a-z]|$)/i; // often a page graphic, sometimes a real photo: a warning, not an error
export function imagePathOf(u) { try { const x = new URL(u); return decodeURIComponent(x.pathname + " " + (x.searchParams.get("url") || "")).replace(/\+/g, " "); } catch { return String(u || ""); } }
// -> { level: "error" | "warn", why } or null
export function imageProblem(r) {
  const u = String(r.image || "").trim();
  if (!u) return null;
  const path = imagePathOf(u);
  const city = isCityEvent(r);
  if (/endurancegrid\.com\/.*opengraph-image/i.test(u)) return { level: "error", why: "photo is Endurance Grid's text card (race name on a dark background), not a picture of the event; leave image empty so the card uses the stock photo" };
  if (NOT_A_PHOTO.test(path)) return { level: "error", why: `photo file name looks like a badge, newsletter cover, placeholder or site-wide default picture (${path.split("/").pop().slice(0, 60)}); leave image empty so the card uses the stock photo` };
  if (LOGOISH.test(path) && !city) return { level: "error", why: `photo file name looks like a logo (${path.split("/").pop().slice(0, 60)}); only a city or government event may keep its logo or seal. Leave image empty so the card uses the stock photo` };
  if (BANNERISH.test(path)) return { level: "warn", why: `photo file name says banner, header, screenshot or og-image (${path.split("/").pop().slice(0, 60)}); keep it only if it is a real photo of the event, not a page graphic` };
  const w = path.match(/(?:[?&_-]w(?:idth)?[=_-]?|-)(\d{2,4})x\d{2,4}\b/) || u.match(/[?&](?:w|width)=(\d{2,4})\b/);
  if (w && Number(w[1]) < 500) return { level: "warn", why: `photo looks small (${w[1]} px wide); use an original of at least 500 px or leave image empty` };
  return null;
}

// ---------- DAT-09: source url shared by many events ----------
// A page that lists many events is a poor "official" link. sharedUrlKey() is the key used to count how many rows share one source page
// (the fragment is ignored, the trailing slash and case of the host are not significant).
export function sharedUrlKey(u) { try { const x = new URL(u); return (x.host.toLowerCase() + x.pathname.replace(/\/+$/, "") + x.search).toLowerCase(); } catch { return ""; } }

// Image size from the first bytes of a file (PNG, JPEG, GIF, WebP). -> { w, h } or null. Used by scripts/audit-event-photos.mjs.
export function imageSize(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const u16 = (i) => (b[i] << 8) | b[i + 1], u32 = (i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) return { w: u32(16), h: u32(20) };
  if (b.length > 10 && b[0] === 0x47 && b[1] === 0x49) return { w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) };
  if (b.length > 30 && b[0] === 0x52 && b[8] === 0x57 && b[9] === 0x45) { // RIFF....WEBP
    const t = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (t === "VP8X") return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    if (t === "VP8 ") return { w: (b[26] | (b[27] << 8)) & 0x3fff, h: (b[28] | (b[29] << 8)) & 0x3fff };
    if (t === "VP8L") { const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: u16(i + 5), w: u16(i + 7) };
      i += 2 + u16(i + 2);
    }
  }
  return null;
}
