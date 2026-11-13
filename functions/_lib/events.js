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

// Some sites sit behind a bot-protection challenge (Cloudflare "Just a moment...", Sucuri, Akamai) that answers every automated visitor with a 403 or 503 and a challenge page, however polite.
// That says nothing about the page itself, so it is reported as "blocked" (not as a failed page) and is not tried again soon. We do not disguise the check or try to solve the challenge.
export const BLOCKED_NOTE = "the site's bot protection blocked our automatic check (the page itself is probably fine: open the link yourself, then confirm the dates)";
const blockedByProtection = (r) => [403, 429, 503].includes(r.status) && (/challenge/i.test(r.headers.get("cf-mitigated") || "") || /sucuri|akamaighost/i.test(r.headers.get("server") || "") || r.headers.has("x-sucuri-id"));
// Another proof that does not need to read the page: an event is added only from a signed-in account, and the account's email is verified (an emailed code or Google). When that email is
// at the event page's own website (a @visitcrestline.org address adding a visitcrestline.org page), the organization itself is submitting, which is better evidence than the page mentioning the name.
// Shared platforms and free-mail domains never count (anyone can have an address or a page there).
const SHARED = new Set(["facebook.com", "instagram.com", "google.com", "gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "eventbrite.com", "meetup.com", "ticketmaster.com", "wix.com", "wixsite.com", "squarespace.com", "weebly.com", "godaddysites.com", "wordpress.com", "blogspot.com", "github.io", "linktr.ee", "tiktok.com", "youtube.com", "patch.com"]);
export function emailOwnsSite(email, url) {
  try {
    const d = String(email || "").toLowerCase().split("@")[1] || "", h = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (!d.includes(".") || !h.includes(".") || SHARED.has(d) || [...SHARED].some((x) => d.endsWith("." + x))) return false;
    return h === d || h.endsWith("." + d) || d.endsWith("." + h);
  } catch { return false; }
}
// Loads the submitted event page and checks that it mentions the event and its year. Returns { ok, note }.
// Some hosts (GoDaddy sites, for one) answer slowly or drop automated requests now and then, so a failed load is tried once more with a longer wait,
// always under our own bot name. If both tries fail the note says the site was unreachable (not that the page is wrong), so the owner knows to open the link.
export async function verifyEventPage(url, name, startDate, doFetch = fetch, email = "") {
  let u;
  try { u = new URL(url); } catch { return { ok: false, note: "link is not a valid web address" }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, note: "link is not http(s)" };
  let r = null, reason = "";
  for (const ms of [6000, 9000]) {
    try {
      r = await doFetch(u.href, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; SoCalLightsBot/1.0; +https://socallights.app)", accept: "text/html,*/*" }, signal: AbortSignal.timeout(ms) });
      if (blockedByProtection(r)) return emailOwnsSite(email, u.href) ? { ok: true, blocked: true, note: "the site blocks automatic checks, but the account's verified email is at the event page's own website" } : { ok: false, blocked: true, note: BLOCKED_NOTE }; // a bot challenge page: no retry, and never any attempt to get past it
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
