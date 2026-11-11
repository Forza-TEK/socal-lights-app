// Is a picture a real photo of the event, or a logo, badge or chart that only looks bad as a card photo?
// Shared by the map (app.js, which also looks at the loaded picture's size) and the server-written pages (events and city pages, which can only judge by address).
// Rule from the owner (2026-11-11): a CITY or government event may keep its city logo or seal as the photo; every other event whose picture looks like a logo, badge or banner
// shows the stock picture instead. A blurry or tiny picture falls back to the stock picture in every case, city or not.

const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } }; // relative addresses (our own /img, /api/photo) have no host

// How a city or government event is recognised, using only what is already stored for an event:
//  - its name, venue or organizer text says so: "City of ...", "Town of ...", "County of ...", "Parks and Recreation", "Parks & Rec", "Recreation Department/District", "City Hall"
//  - its link or its picture is on a government address: *.gov, *.ca.us (the old city style, ci.<city>.ca.us), or a host that starts with "cityof", "townof" or "ci."
const GOV_TEXT = /\b(?:city|town|county|village) of\b|\bparks?\s*(?:and|&)\s*rec(?:reation)?\b|\brecreation (?:department|district|dept)\b|\bcity hall\b|\bcivic center\b|\bcity council\b|\bpublic works\b/i;
const GOV_HOST = /(?:^|\.)gov$|\.gov\.|\.ca\.us$|^(?:cityof|townof|countyof|ci\.|co\.)/i;
export function isCityEvent(ev) {
  if (!ev) return false;
  if (GOV_TEXT.test([ev.n, ev.name, ev.v, ev.venue, ev.o, ev.org, ev.organizer].filter(Boolean).join(" | "))) return true;
  return [ev.u, ev.url, ev.img, ev.image].some((u) => u && GOV_HOST.test(hostOf(u)));
}

// A picture whose file name says what it is. Matched on the path, not the host, and only as whole words (so "dialogo" or "logos-lights-show" is not caught by accident:
// "logo" must stand alone between separators).
const LOGO_NAME = /(?:^|[/_\-.\s])(?:logos?|seal|crest|emblem|badge|wordmark|favicon|sprite|icon|brandmark|site-?logo|header-?logo)(?:[/_\-.\s\d]|$)/i;
export function looksLikeLogoUrl(u) {
  if (!u) return false;
  let p = String(u).split(/[?#]/)[0].replace(/^[a-z]+:\/\/[^/]*/i, ""); try { p = decodeURIComponent(p); } catch {}
  return LOGO_NAME.test(p);
}

// What a loaded picture tells us. w, h: its natural size; asked: the width that was requested from the resizer (0 for an unresized picture); the resizer never enlarges,
// so a picture that came back narrower than asked is exactly as big as the original.
//  "lowres": too small to be sharp on a card (blurry charts, thumbnails)
//  "logo":   a banner or skyscraper shape (a wide strip or tall strip is a masthead, not a photo), or a small square (a badge or seal)
//  "ok":     use it
export function judgePicture(w, h, asked = 0) {
  if (!w || !h) return "ok";
  const r = w / h, original = asked === 0 || w < asked;
  if (original && (w < 300 || h < 160)) return "lowres";
  if (r >= 3.2 || r <= 0.45) return "logo";
  if (original && r > 0.85 && r < 1.18 && Math.max(w, h) <= 420) return "logo";
  return "ok";
}

// For a page that can only look at the address: the picture to use, or "" when it is a logo-like one on a non-city event.
export const usablePhoto = (ev, url = ev && (ev.img || ev.image)) => (url && looksLikeLogoUrl(url) && !isCityEvent(ev) ? "" : url || "");
