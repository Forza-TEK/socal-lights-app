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

// Title of at most 60 characters: the long form first, shorter ones when the name is long
export function eventTitle(e) {
  const n = clip(e.n, 40);
  return [`${n} in ${e.city}, CA | SoCal Lights`, `${n} in ${e.city} | SoCal Lights`, `${clip(e.n, 44)} | SoCal Lights`].find((t) => t.length <= 60) || `${clip(e.n, 44)} | SoCal Lights`;
}

// Description of at most 155 characters (what search results show): name, dates, place, then the start of the blurb if there is room
export function eventDesc(e) {
  const head = `${e.n}: ${whenText(e)}`, hrs = usefulHours(e), where = whereText(e);
  let d = head + (hrs ? ", " + hrs : "") + (where ? ". " + where : "") + ".";
  if (e.b && d.length < 110) d += " " + e.b;
  return clip(d, 155);
}
