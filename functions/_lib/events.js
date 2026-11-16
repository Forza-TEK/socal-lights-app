// Shared helpers for creating events from submissions.
import { clean, safeUrl, COUNTIES } from "./util.js";
import { SEASONS } from "../../public/seasons.js";
import { CITY } from "../../public/cities.js";
import { normalizeHours, freeFlagProblem } from "../../scripts/event-rules.mjs";

export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
export const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const kmApart = (a, b) => { const R = 6371, r = Math.PI / 180, x = (b[0] - a[0]) * r, y = (b[1] - a[1]) * r, h = Math.sin(x / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

// The data rules the Grok intake, the public form and the migration check enforce, applied to a save from the Admin event form (audit 2026-11-16, H2).
// `e` is the cleaned event as the form sends it (start/end, free 0|1, price, hours, url, county, city, lat, lng); `prev` is the stored row when it is an edit (columns as in the table),
// `cityCounties` the counties already used for e.city. A rule is only applied to what the editor CHANGED, so older rows that break a rule can still be moved to another season or confirmed in bulk.
// Returns { hours, problems }: hours is the normalized text (silently tidied, never rejected); problems are plain sentences for the form.
export function adminEventRules(e, prev = null, cityCounties = []) {
  const problems = [], changed = (...f) => !prev || f.some((k) => String(prev[k] ?? "") !== String(e[k] ?? ""));
  const hours = normalizeHours(e.hours);
  if (changed("free", "price")) { const fp = freeFlagProblem(e.free, e.price); if (fp) problems.push(fp + "."); }
  if (e.url && changed("url") && !/^https:\/\/[^\s]+$/i.test(e.url)) problems.push("The link must be a full web address starting with https://.");
  if (changed("city", "lat", "lng")) {
    const pt = CITY[e.city];
    if (pt) { const lim = ["Los Angeles", "San Diego"].includes(e.city) ? 45 : 30, d = kmApart([e.lat, e.lng], pt); if (d > lim) problems.push(`The pin is ${Math.round(d)} km from the center of ${e.city}. Check the city and the pin.`); }
  }
  if (changed("county", "city") && cityCounties.length && !cityCounties.includes(e.county)) problems.push(`${e.city} events are in ${cityCounties.join(" or ")} County in our data, not ${e.county}. Check the county and the city.`);
  return { hours, problems };
}

// Inserts or updates one event (same columns as the admin editor). The scheduled upkeep never touches featured/featured_until.
export async function upsertEvent(env, e) {
  await env.DB.prepare(
    `INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city, type=excluded.type,
       start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status, free=excluded.free,
       price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng, blurb=excluded.blurb,
       url=excluded.url, season=excluded.season, venue=excluded.venue, address=excluded.address, updated_at=datetime('now')`
  ).bind(e.id, e.name, e.county, e.city, e.type, e.start_date, e.end_date, e.status, e.free ? 1 : 0, e.price || "", e.hours || "", e.lat, e.lng, e.blurb || "", e.url || "", e.season, e.venue || "", e.address || "").run();
}

// Words in a name that are distinctive enough to look for on the event page.
const STOP = new Set(["the", "and", "annual", "event", "festival", "with", "from", "your", "california", "county", "city", "park", "night", "2026", "2027", "free"]);
export const nameTokens = (name) => [...new Set(String(name).toLowerCase().split(/[^a-z0-9']+/).filter((w) => w.length >= 4 && !STOP.has(w)))];

// Some sites sit behind a bot-protection challenge (Cloudflare "Just a moment...", Sucuri, Akamai) that answers every automated visitor with a 403 or 503 and a challenge page, however polite.
// That says nothing about the page itself, so it is reported as "blocked" (not as a failed page) and is not tried again soon. We do not disguise the check or try to solve the challenge.
export const ROBOTS_NOTE = "the site's robots.txt asks automated visitors not to read this page, so we did not (open the link yourself to confirm the dates)";
export const BLOCKED_NOTE = "the site's bot protection blocked our automatic check (the page itself is probably fine: open the link yourself, then confirm the dates)";
const blockedByProtection = (r) => [403, 429, 503].includes(r.status) && (/challenge/i.test(r.headers.get("cf-mitigated") || "") || /sucuri|akamaighost/i.test(r.headers.get("server") || "") || r.headers.has("x-sucuri-id"));
// Loads the submitted event page and checks that it mentions the event and its year. Returns { ok, note }.
// Some hosts (GoDaddy sites, for one) answer slowly or drop automated requests now and then, so a failed load is tried once more with a longer wait,
// always under our own bot name. If both tries fail the note says the site was unreachable (not that the page is wrong), so the owner knows to open the link.
export async function verifyEventPage(url, name, startDate, doFetch = fetch) {
  let u;
  try { u = new URL(url); } catch { return { ok: false, note: "link is not a valid web address" }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, note: "link is not http(s)" };
  let r = null, reason = "";
  for (const ms of [6000, 9000]) {
    try {
      r = await doFetch(u.href, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; SoCalLightsBot/1.0; +https://socallights.app)", accept: "text/html,*/*" }, signal: AbortSignal.timeout(ms) });
      if (r.headers.get("x-robots-blocked")) return { ok: false, blocked: true, note: ROBOTS_NOTE }; // the site's robots.txt asks bots not to read this page: we do not
      if (blockedByProtection(r)) return { ok: false, blocked: true, note: BLOCKED_NOTE }; // a bot challenge page: no retry, and never any attempt to get past it
      if (r.status < 500 && r.status !== 429) break; // an answer we can use (a 5xx or "slow down" is worth one more try)
      reason = `HTTP ${r.status}`;
    } catch { r = null; reason = "no answer"; }
  }
  if (!r) return { ok: false, note: "event page was slow or would not answer our check (open the link yourself to confirm the dates)" };
  if (!r.ok) return { ok: false, note: `event page returned HTTP ${r.status}` };
  let text;
  try { text = (await r.text()).slice(0, 400_000).toLowerCase(); } catch { return { ok: false, note: "event page was slow or would not answer our check (open the link yourself to confirm the dates)" }; }
  const toks = nameTokens(name);
  const hit = toks.filter((t) => text.includes(t));
  const year = startDate.slice(0, 4);
  if (!toks.length || hit.length < Math.min(2, toks.length)) return { ok: false, note: "event page does not mention the event name" };
  if (!text.includes(year)) return { ok: false, note: `event page does not mention ${year}` };
  return { ok: true, note: "event page mentions the name and year" };
}

export { clean, safeUrl, COUNTIES, SEASONS };
