// Homes an organizer adds to a contest herself: reading a pasted line, spotting duplicates, and looking the address up.
import { CITY } from "../../public/cities.js";
import { streetParts } from "./addrkey.js";
import { normStreet, normName, normZip, tidy } from "./fields.js";
import { geocodeAddress, clean } from "./util.js";

// One request may make at most 50 outgoing calls on the Cloudflare free plan (every fetch and every D1 query counts, docs/runbooks/cloudflare-limits.md).
// A home costs up to 2 geocoder fetches (Census, then OpenStreetMap), so 10 homes cost at most 20, plus about 15 database and mail calls: safely under 50.
// The organizer page sends longer lists in chunks of 10 and shows progress. Checking addresses is limited by homes and calls per hour (the geocoders are free public services).
export const MAX_HOMES_PER_CALL = 10;
export const MAX_ADDED_PER_CONTEST = 500;
export const CALLS_PER_HOUR = 120;
export const HOMES_PER_HOUR = 1000;

const ZIP = /^(?:CA|California)?\s*(\d{5})(?:-\d{4})?$/i;
const UNIT = /^(apt|apartment|unit|ste|suite|bldg|building|#)/i;
const cityKey = (s) => String(s || "").toLowerCase().replace(/\bsaint\b/g, "st").replace(/\bmt\b/g, "mount").replace(/[^a-z]/g, "");
const CITY_BY_KEY = new Map(Object.keys(CITY).map((k) => [cityKey(k), k]));

// "123 Main St, Covina, CA 91722" | "123 Main St, Covina" | "123 Main St" | "123 Main St Apt 4, 91722" | "123 Main St Covina CA 91722"
// -> { street, city, zip } using the contest's city when the line has none; { error } when it can't be a home address.
export function parseHome(raw, contestCity) {
  let s = String(raw ?? "").replace(/\t/g, ", ").replace(/^\s*(?:\d{1,3}[.)]|[-*•])\s+/, "");
  s = tidy(clean(s, 200));
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return { error: "Empty line." };
  let street = parts[0], city = "", zip = "";
  for (const t of parts.slice(1)) {
    const z = t.match(ZIP);
    if (z) zip = z[1];
    else if (/^(CA|California)$/i.test(t)) continue;
    else if (UNIT.test(t)) street += " " + t;
    else if (!city) city = t.replace(/\s+(?:CA|California)$/i, "").trim();
  }
  if (parts.length === 1) { // everything on one line without commas: peel off a trailing ZIP, "CA" and the contest's city
    const m = street.match(/^(.*?)\s+(?:(?:CA|California)\s+)?(\d{5})(?:-\d{4})?$/i);
    if (m && /\d/.test(m[1])) { street = m[1]; zip = m[2]; }
    street = street.replace(/\s+(?:CA|California)$/i, "");
    const end = new RegExp("\\s+" + String(contestCity || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i");
    if (contestCity && end.test(street)) street = street.replace(end, "");
  }
  street = normStreet(street);
  if (!/^\d+[A-Za-z]?\b/.test(street) || street.length < 5) return { error: "Start with the house number and street, like 123 Main St." };
  if (street.length > 120) return { error: "That street address is too long." };
  let known = contestCity;
  if (city) {
    // A city we have a center for gets its usual spelling; any other town (the contest's city list is short) is kept as typed. The 30 km rule in locate() guards against a wrong one.
    known = CITY_BY_KEY.get(cityKey(city)) || normName(city).slice(0, 60);
    if (!/[A-Za-z]{3}/.test(known)) return { error: "Check the city name." };
  }
  return { street, city: known, zip: normZip(zip) || "" };
}

// One key per house: number, street name and suffix (units are ignored), so "5 Oak Street" and "5 oak st." match.
export function homeKey(address) {
  const p = streetParts(address);
  return p ? `${p.num}|${p.name}|${p.suf}` : "x|" + String(address || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export const homeTitle = (name, street) => normName(clean(name, 90)) || `Home at ${street}`;

// Looks one parsed home up. Returns { pt, matched } or { reason }. A home that can't be placed is never made up from the city center.
export async function locate(home, contest) {
  const center = CITY[contest.city] || CITY["Irvine"], info = {};
  const address = home.zip ? `${home.street}, ${home.city}, CA ${home.zip}` : home.street;
  const pt = await geocodeAddress(address, home.city, center, 30, undefined, info);
  if (pt) return { pt, matched: info.matched || "" };
  if (info.down) return { reason: "The address lookup isn't answering right now. Try again in a few minutes." };
  if (info.far) return { reason: `Found, but too far from ${contest.city}. Check the city.` };
  return { reason: "Not found. Check the number, street and city." };
}

// Runs fn over the items with at most `n` running at once, keeping the order of the results.
export async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}
