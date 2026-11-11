// What the public map shows, and how healthy the event data is, from ONE read of the events table (Admin dashboard and the tab badges).
//  - map: the events the public map lists. Same rule as GET /api/events: an event stays until ENDED_GRACE_DAYS after it ends, and a sweep-made event at the same
//    street address as an approved house or installer post is hidden (unless the admin chose to keep it). Before this, the dashboard counted every row ever stored.
//  - health: counts for the checks in public/admin/health.js (the same predicates the Events filter uses).
import { pairs, approvedPosts } from "./addrkey.js";
import { ptDate } from "./time.js";
import { HEALTH } from "../../public/admin/health.js";

import { ENDED_GRACE_DAYS } from "../api/events.js"; // the public map's own grace period: one number, so the dashboard cannot drift from the map
export const EVENT_COLS = "id, status, start_date, end_date, image, images, url, updated_at, city, address, keep_listed";

const imgs = (v) => { try { const a = JSON.parse(v || "[]"); return Array.isArray(a) ? a.filter((x) => typeof x === "string") : []; } catch { return []; } };
// The same small shape the admin list gets from rowToEvent, with only the fields the checks read
export const healthShape = (r) => ({ id: r.id, st: r.status === "confirmed" ? "c" : "e", s: r.start_date, e: r.end_date, img: r.image || "", imgs: imgs(r.images), u: r.url || "", lc: String(r.updated_at || "").slice(0, 10) });

// rows: events columns (EVENT_COLS); posts: approvedPosts(env). Pure.
export function eventStats(rows, posts, today = ptDate()) {
  const cutoff = ptDate(Date.parse(today + "T12:00:00Z") - ENDED_GRACE_DAYS * 86400000);
  const live = rows.filter((r) => r.end_date >= cutoff);
  let hide = new Set();
  try { hide = new Set(pairs(posts, live).exact.filter((x) => !x.event.keep_listed).map((x) => x.event.id)); } catch {}
  const shown = live.filter((r) => !hide.has(r.id)), confirmed = shown.filter((r) => r.status === "confirmed").length;
  const health = {};
  const shapes = rows.map(healthShape);
  for (const [k, , , test] of HEALTH) health[k] = shapes.filter((e) => test(e, today)).length;
  const upcoming = shapes.filter((e) => e.e >= today);
  return { map: { total: shown.length, confirmed, expected: shown.length - confirmed }, stored: rows.length, upcoming: upcoming.length, upcomingConfirmed: upcoming.filter((e) => e.st === "c").length, health };
}

export async function loadEventStats(env, today = ptDate()) {
  let rows = [];
  try { rows = (await env.DB.prepare(`SELECT ${EVENT_COLS} FROM events`).all()).results; } catch {}
  return eventStats(rows, await approvedPosts(env), today);
}
