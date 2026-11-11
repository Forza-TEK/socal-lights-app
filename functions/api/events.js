// GET /api/events — the events for the public map.
// By default events that ended more than ENDED_GRACE_DAYS (3) days ago are left out (the app never shows them; they were 38% of a 1.4 MB download).
// The list leaves out the blurb and link of each event (rowToListEvent; ct marks a contest): only the detail view reads them, and GET /api/events/<id> has the whole object. Full objects here on request: ?full=1 (scripts), ?ended=1 and ?all=1 (admin editor).
// Reachable on request: /api/events?ended=1 (everything, with the same house de-duplication, public) and /api/events?all=1 (admin editor: everything, nothing hidden; admin only, never cached; the editor itself reads GET /api/admin/events, the same data behind the Access login).
// ?head=1 is the first screen's share of the default list (see headOf): the map page asks for it first so the list can appear before the whole list has downloaded, then asks for the whole list. Its edge copy is separate.
// Only ended, full, head and all are read from the query string. The edge copy is keyed by the two public flags alone, so ?x=<random> or ?ref=... shares the plain copy and cannot force a rebuild.
// The edge copy is served stale-while-revalidate (fresh 2 min, kept 15). The response carries an ETag, so a returning visitor (or the service worker) revalidates with If-None-Match and gets a body-less 304 when nothing changed.
import { rowToEvent, rowToListEvent, etagOf, etagMatches as matches, requireAdmin, err } from "../_lib/util.js";
import { pairs, approvedPosts } from "../_lib/addrkey.js";
import { ptDate, shiftDay } from "../_lib/time.js";
import { defaultSeason } from "../../public/seasons.js";

export const ENDED_GRACE_DAYS = 3; // covers a device clock a day off and a share link to an event that just finished (the app hides ended events anyway)
const CACHE_CONTROL = "public, max-age=60, s-maxage=120";

const notModified = (tag) => new Response(null, { status: 304, headers: { etag: tag, "cache-control": CACHE_CONTROL } });

// Edge copy: fresh for FRESH_MS, then served stale while one request rebuilds it in the background (up to KEEP_S in all), so visitors rarely wait for the database.
const FRESH_MS = 120_000, KEEP_S = 900;

// The places that fill the first screen of the list, so the page can draw it before the whole list (about 110 KB compressed) has arrived. The list is shown for this season, ordered by start date with anything already running counted as starting today, and the page shows the first 60 of them (LIST_PAGE in app.js), and 80 are sent so there is a "show more" after them.
// So the head holds every event that starts no later than the 80th such event (all of a tie), and at least up to tomorrow in case a phone's date is a day off, plus the paid top-of-list events. Whatever the page then filters or sorts by name inside that group comes out the same as from the whole list.
export const HEAD_COUNT = 80;
export function headOf(list, today) {
  const season = defaultSeason(today), eff = list.filter((e) => (e.sn || "christmas") === season && e.e >= today).map((e) => (e.s > today ? e.s : today)).sort();
  const edge = eff.length ? eff[Math.min(HEAD_COUNT, eff.length) - 1] : today, tomorrow = shiftDay(today, 1), cut = edge > tomorrow ? edge : tomorrow;
  return list.filter((e) => e.f === 2 || e.s <= cut);
}

export async function build(env, all, ended, full, head) {
  const cutoff = ptDate(Date.now() - ENDED_GRACE_DAYS * 86400000);
  const q = all || ended ? env.DB.prepare("SELECT * FROM events ORDER BY start_date, name") : env.DB.prepare("SELECT * FROM events WHERE end_date >= ? ORDER BY start_date, name").bind(cutoff);
  const { results } = await q.all();
  // A sweep-made event at the same address as an approved house or installer post is replaced by that post (unless the admin chose to keep it)
  let hide = new Set();
  if (!all) try { hide = new Set(pairs(await approvedPosts(env), results).exact.filter((x) => !x.event.keep_listed).map((x) => x.event.id)); } catch {}
  const list = results.filter((r) => !hide.has(r.id)).map(all || ended || full ? rowToEvent : rowToListEvent);
  const body = JSON.stringify(head && !all && !ended && !full ? headOf(list, ptDate()) : list);
  return { body, tag: await etagOf(body) };
}
const headersFor = (tag, extra = {}) => ({ "content-type": "application/json; charset=utf-8", "cache-control": CACHE_CONTROL, etag: tag, ...extra });
const storedCopy = ({ body, tag }) => new Response(body, { status: 200, headers: headersFor(tag, { "cache-control": `public, s-maxage=${KEEP_S}`, "x-built": String(Date.now()) }) });

const LEASE_MS = 20_000; // once a copy is stale, the first request pushes its age back so only one rebuild runs per window (best effort across the edge)
const inflight = new Map(); // same-isolate single flight

export async function onRequestGet(context) {
  const { request, env } = context, url = new URL(request.url), all = url.searchParams.get("all") === "1", ended = url.searchParams.get("ended") === "1", full = url.searchParams.get("full") === "1", head = url.searchParams.get("head") === "1" && !ended && !full;
  if (all) { // the admin editor's view: nothing hidden, never cached, admin only
    if (!(await requireAdmin(request, env))) return err(401, "Sign in through Cloudflare Access to use the admin tools.");
    const b = await build(env, true, true, true);
    return new Response(b.body, { status: 200, headers: headersFor(b.tag, { "cache-control": "no-store" }) });
  }
  const inm = request.headers.get("if-none-match");
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const key = new Request(`${url.origin}/api/events${ended || full || head ? "?" : ""}${[ended && "ended=1", full && "full=1", head && "head=1"].filter(Boolean).join("&")}`, { method: "GET" });
  if (cache) {
    const hit = await cache.match(key);
    if (hit) {
      const built = Number(hit.headers.get("x-built") || 0), t = hit.headers.get("etag");
      if (Date.now() - built > FRESH_MS && !inflight.has(key.url)) {
        const job = (async () => {
          const lease = new Response(await hit.clone().text(), { status: 200, headers: headersFor(t, { "cache-control": `public, s-maxage=${KEEP_S}`, "x-built": String(Date.now() - FRESH_MS + LEASE_MS) }) });
          await cache.put(key, lease); const b = await build(env, false, ended, full, head); await cache.put(key, storedCopy(b));
        })().catch(() => {}).finally(() => inflight.delete(key.url));
        inflight.set(key.url, job); context.waitUntil(job); // set before any await, so a second request in the same isolate sees it
      }
      return t && matches(inm, t) ? notModified(t) : new Response(hit.body, { status: 200, headers: headersFor(t) });
    }
  }
  const b = await build(env, false, ended, full, head);
  if (matches(inm, b.tag)) return notModified(b.tag);
  if (cache) context.waitUntil(cache.put(key, storedCopy(b)));
  return new Response(b.body, { status: 200, headers: headersFor(b.tag) });
}
