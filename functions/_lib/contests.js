// Shared helpers for home decorating contests.
import { err, clean, nearestCounty } from "./util.js";
import { upsertEvent } from "./events.js";
import { CITY } from "../../public/cities.js";
import { SEASONS, defaultSeason } from "../../public/seasons.js";

const FREE_DOMAINS = new Set(["gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "live.com", "msn.com", "yahoo.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com"]);
export const todayPT = () => new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10); // roughly Pacific time
export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
export const addDays = (s, n) => new Date(new Date(s + "T12:00:00Z").getTime() + n * 86400_000).toISOString().slice(0, 10);

// Can this organizer's email be tied to the website they gave? match = goes live straight away; anything else waits for review.
export function trustOf(email, site) {
  const dom = String(email).split("@")[1] || "";
  if (!dom || FREE_DOMAINS.has(dom)) return "free";
  if (!site) return "none";
  let host = "";
  try { host = new URL(/^https?:/i.test(site) ? site : "https://" + site).hostname.replace(/^www\./, "").toLowerCase(); } catch { return "other"; }
  return host === dom || host.endsWith("." + dom) || dom.endsWith("." + host) ? "match" : "other";
}

export const getContest = (env, slug) => env.DB.prepare("SELECT * FROM contests WHERE slug = ?").bind(String(slug || "").toLowerCase()).first();

// What is open right now. The dates decide; the organizer can also pause entries or voting by hand.
export function windows(c, today = todayPT()) {
  const live = c.status === "live" && !c.announced;
  return {
    entriesOpen: live && !!c.entries_open && today <= c.entries_close,
    votingOpen: live && !!c.voting_open && today >= c.vote_start && today <= c.vote_end,
  };
}

const TYPE_BY_SEASON = { christmas: "drive", halloween: "family", newyear: "family", spring: "festival", summer: "festival" };
export const seasonFor = (closeDate) => defaultSeason(closeDate);

// Lists the contest on the map as an event ("Home contest"), like any other event.
export async function listOnMap(env, c) {
  const types = SEASONS[c.season].types, type = types[TYPE_BY_SEASON[c.season]] ? TYPE_BY_SEASON[c.season] : Object.keys(types)[0];
  const [lat, lng] = CITY[c.city] || CITY["Irvine"];
  const id = `c-${c.slug}`.slice(0, 40);
  await upsertEvent(env, { id, name: c.name, county: c.county, city: c.city, type, start_date: todayPT(), end_date: c.vote_end, status: "confirmed", free: 1, price: "Free", hours: "", lat, lng, blurb: `${c.org} home decorating contest. ${c.descr}`.slice(0, 200), url: `https://socallights.app/c/${c.slug}`, season: c.season, venue: c.org, address: `${c.city}, CA` });
  await env.DB.prepare("UPDATE contests SET event_id = ? WHERE id = ?").bind(id, c.id).run();
}
export const unlistFromMap = (env, c) => c.event_id ? env.DB.prepare("DELETE FROM events WHERE id = ?").bind(c.event_id).run() : null;

export async function countyFor(env, city) {
  const [lat, lng] = CITY[city];
  const { results } = await env.DB.prepare("SELECT lat, lng, county FROM events").all();
  return nearestCounty(lat, lng, results);
}

// Moves an entry's photos from pending/ to p/ so the public photo route can serve them, then approves it.
export async function approveEntry(env, row) {
  const keys = JSON.parse(row.photos || "[]"), moved = [];
  for (const k of keys) {
    if (k.startsWith("p/")) { moved.push(k); continue; }
    const obj = await env.PHOTOS.get(k);
    if (!obj) continue;
    const nk = k.replace(/^pending\//, "p/");
    await env.PHOTOS.put(nk, obj.body, { httpMetadata: obj.httpMetadata });
    moved.push(nk);
  }
  await env.DB.prepare("UPDATE posts SET status='approved', photos=?, approved_at=datetime('now') WHERE id=?").bind(JSON.stringify(moved), row.id).run();
  await Promise.all(keys.filter((k) => k.startsWith("pending/")).map((k) => env.PHOTOS.delete(k)));
}

// Gate for owner-only routes. Returns { c } or { res }.
export async function ownerOf(request, env, slug, getUser) {
  const user = await getUser(request, env);
  if (!user) return { res: err(401, "Please sign in first.") };
  const c = await getContest(env, slug);
  if (!c || c.owner_id !== user.id) return { res: err(404, "That contest isn't yours or doesn't exist.") };
  return { c, user };
}
export const cats = (c) => { try { return JSON.parse(c.categories || "[]"); } catch { return []; } };
export { clean };
