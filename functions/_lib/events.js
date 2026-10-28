// Shared helpers for creating events from submissions.
import { clean, safeUrl, COUNTIES } from "./util.js";
import { SEASONS } from "../../public/seasons.js";

export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
export const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

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

// Loads the submitted event page and checks that it mentions the event and its year. Returns { ok, note }.
export async function verifyEventPage(url, name, startDate, doFetch = fetch) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return { ok: false, note: "link is not http(s)" };
    const r = await doFetch(u.href, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; SoCalLightsBot/1.0; +https://socallights.app)", accept: "text/html,*/*" }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return { ok: false, note: `event page returned HTTP ${r.status}` };
    const text = (await r.text()).slice(0, 400_000).toLowerCase();
    const toks = nameTokens(name);
    const hit = toks.filter((t) => text.includes(t));
    const year = startDate.slice(0, 4);
    if (!toks.length || hit.length < Math.min(2, toks.length)) return { ok: false, note: "event page does not mention the event name" };
    if (!text.includes(year)) return { ok: false, note: `event page does not mention ${year}` };
    return { ok: true, note: "event page mentions the name and year" };
  } catch (x) {
    return { ok: false, note: "event page could not be loaded" };
  }
}

export { clean, safeUrl, COUNTIES, SEASONS };
