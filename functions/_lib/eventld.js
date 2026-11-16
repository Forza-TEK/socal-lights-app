// Pieces of an event's page and structured data that the event page (/e/<id>) and the city page (/in/<city>) share, so both say the same thing about an event.
import { TYPE_SHORT } from "../../public/seasons.js";

export const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…"; };
export const http = (u) => { try { return /^https?:$/.test(new URL(u).protocol) ? u : ""; } catch { return ""; } };
// Photos stored as http:// are asked for over https (a page served over https must not pull in insecure images)
export const secureUrl = (u) => { const x = http(u); return x ? x.replace(/^http:\/\//i, "https://") : ""; };
export const fmtDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const whenText = (e) => (e.s === e.e ? fmtDate(e.s) : `${fmtDate(e.s)} to ${fmtDate(e.e)}`);
export const typeLabel = (e) => TYPE_SHORT[e.t] || "";

// "555 The Shops at Mission Viejo, Mission Viejo, CA 92691" -> { street: "555 The Shops at Mission Viejo", zip: "92691" } (the city and state are separate fields in the markup)
export function addrParts(a, city) {
  let s = String(a || "").trim(), zip = "";
  const m = s.match(/[,\s]+(?:CA|California)?[,\s]*(\d{5})(?:-\d{4})?\s*$/i);
  if (m) { zip = m[1]; s = s.slice(0, m.index).trim(); }
  s = s.replace(/[,\s]+(?:CA|California)\s*$/i, "").trim();
  if (city) s = s.replace(new RegExp(",?\\s*" + String(city).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$", "i"), "").trim();
  return { street: s.replace(/,\s*$/, ""), zip };
}

// An hours text worth showing: not "check site" and not a repeat of the date
export const usefulHours = (e) => { const h = String(e.h || "").trim(); if (!h || /^check/i.test(h) || /check (the )?site/i.test(h) && h.length < 40) return ""; const md = new Date(e.s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); return h.toLowerCase().includes(md.toLowerCase()) ? "" : h; };

// The place as one line: venue, then the address (with the city added only when the address does not already end with it)
export function whereText(e) {
  const a = String(e.a || ""), v = String(e.v || "");
  const parts = [v && !a.toLowerCase().includes(v.toLowerCase()) ? v : "", a].filter(Boolean);
  const line = parts.join(", ") || v;
  return e.city && !line.toLowerCase().includes(String(e.city).toLowerCase()) ? (line ? line + ", " : "") + e.city : line;
}

// schema.org Event for a confirmed, upcoming event. `url` is the event's own page (/e/<id>), whichever page the markup sits on.
export function eventLd(e, url) {
  const img = secureUrl(e.img), status = e.nt === "cancelled" ? "EventCancelled" : e.nt ? "EventPostponed" : "EventScheduled";
  const price = e.free ? 0 : (String(e.p).match(/\$\s*(\d+(?:\.\d+)?)/) || [])[1];
  const { street, zip } = addrParts(e.a, e.city);
  return {
    "@context": "https://schema.org", "@type": "Event", name: e.n, startDate: e.s, endDate: e.e, eventStatus: "https://schema.org/" + status,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", description: e.b || undefined, url, image: img ? [img] : undefined, isAccessibleForFree: !!e.free,
    offers: price !== undefined && http(e.u) ? { "@type": "Offer", price: String(price), priceCurrency: "USD", url: e.u } : undefined,
    location: { "@type": "Place", name: e.v || e.city, address: { "@type": "PostalAddress", streetAddress: street || undefined, addressLocality: e.city, addressRegion: "CA", postalCode: zip || undefined, addressCountry: "US" }, geo: e.lat && e.lng ? { "@type": "GeoCoordinates", latitude: e.lat, longitude: e.lng } : undefined },
  };
}

// Words a title must not end on ("Parade of Lights Premier Viewing at the" reads as cut off)
const DANGLING = /\s+(?:at|the|of|in|on|for|and|or|to|with|by|a|an|&|-|–|—|\|)$/i;
// Cut a name at a word boundary (at most n characters), drop dangling little words and punctuation, and add an ellipsis only when something was cut
export function cutName(name, n) {
  const s = String(name || "").replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  let t = s.slice(0, n - 1).replace(/\s+\S*$/, "");
  for (let i = 0; i < 4 && DANGLING.test(t); i++) t = t.replace(DANGLING, "");
  return t.replace(/[\s,;:\-–—(]+$/, "") + "…";
}
// Title of at most 60 characters. The full name comes first: with the city when it fits, then without; when the name alone is long the
// "| SoCal Lights" suffix is dropped before the name is cut, and a cut is made at a word boundary (never ending on "at the").
export function eventTitle(e) {
  const SUF = " | SoCal Lights", n = String(e.n || "").replace(/\s+/g, " ").trim();
  const whole = [`${n} in ${e.city}, CA${SUF}`, `${n} in ${e.city}${SUF}`, `${n}${SUF}`, n].find((t) => t.length <= 60);
  return whole || cutName(n, 60);
}

// Description of at most 155 characters (what search results show): name, dates, place, then the start of the blurb if there is room
export function eventDesc(e) {
  const head = `${e.n}: ${e.st === "c" ? whenText(e) : `${whenText(e)} (dates estimated)`}`, hrs = usefulHours(e), where = whereText(e);
  let d = head + (hrs ? ", " + hrs : "") + (where ? ". " + where : "") + ".";
  if (e.b && d.length < 110) d += " " + e.b;
  return clip(d, 155);
}

// Which event pages search engines may index (SEO-06). The rule, in one place for the page, the sitemap and the tests:
//  - never an ended event, and never a cancelled or postponed one;
//  - a confirmed event: yes;
//  - an expected event (dates estimated from past years): yes only when it has a public source link a visitor can check the dates on,
//    and it starts within EXPECTED_DAYS days (a guess a year away helps nobody). Its page already says "date estimated" and its meta description says "(dates estimated)".
// Event structured data (schema.org Event, which states a firm date) is still written ONLY for confirmed events that have not ended (eventLd above).
export const EXPECTED_DAYS = 180;
export const dayDiff = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
export function eventIndexable(e, today) {
  if (!e || e.e < today || e.nt) return false;
  if (e.st === "c") return true;
  return !!http(e.u) && dayDiff(today, e.s) <= EXPECTED_DAYS;
}

// The share picture of an event page: its own photo served from our domain through the Cloudflare resizer (1200x630, JPEG, about 100 KB), never the
// third-party file itself. Returns { url, w, h } or null (no usable photo: the page falls back to the site card).
export function shareImage(e, origin) {
  const u = secureUrl(e.img);
  return u ? { url: `${origin}/cdn-cgi/image/width=1200,height=630,fit=cover,quality=70,format=jpeg/${u}`, w: 1200, h: 630 } : null;
}

// "6-9 pm" style hours of a one-day event as [start, end] clock strings "HHMMSS", else null (all-day)
export function timeRange(e) {
  if (e.s !== e.e) return null;
  const m = String(e.h || "").match(/^\D{0,12}?(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?m?\.?\s*(?:–|-|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?/i);
  if (!m) return null;
  const to24 = (h, mi, ap) => { h = +h % 12; if (/p/i.test(ap)) h += 12; return h * 60 + (+mi || 0); };
  const endAp = m[6], startAp = m[3] || endAp;
  let s = to24(m[1], m[2], startAp); const en = to24(m[4], m[5], endAp);
  if (!m[3] && s >= en) s -= 12 * 60;
  if (s < 0 || en <= s) return null;
  const f = (x) => String(Math.floor(x / 60)).padStart(2, "0") + String(x % 60).padStart(2, "0") + "00";
  return [f(s), f(en)];
}
// A calendar file (.ics) for one event, same fields as the map's "Add to calendar" button. Times are local to the event (floating), all-day when no hours are known.
export function eventIcs(e, origin) {
  const ymd = (d) => d.replace(/-/g, ""), next = (d) => new Date(Date.parse(d + "T12:00:00Z") + 86400000).toISOString().slice(0, 10), tr = timeRange(e);
  const esc2 = (x) => String(x).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const when = tr ? `DTSTART:${ymd(e.s)}T${tr[0]}\r\nDTEND:${ymd(e.e)}T${tr[1]}` : `DTSTART;VALUE=DATE:${ymd(e.s)}\r\nDTEND;VALUE=DATE:${ymd(next(e.e))}`;
  const desc = [e.h || "", e.st === "c" ? "" : "Dates are estimated: check the event's site before you go.", http(e.u), `Found on SoCal Lights: ${origin}/e/${encodeURIComponent(e.id)}`].filter(Boolean).join("\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SoCal Lights//EN", "BEGIN:VEVENT", `UID:${e.id}@socallights.app`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`, when, `SUMMARY:${esc2(e.n)}`, `LOCATION:${esc2([e.v, e.a].filter(Boolean).join(", "))}`, `DESCRIPTION:${esc2(desc)}`, "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
}
