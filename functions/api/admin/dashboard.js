// GET /api/admin/dashboard — everything the Admin home page shows: what needs attention, today's numbers, what is live,
// the newest submissions, and the latest admin activity. One request, a handful of small queries.
import { json } from "../../_lib/util.js";
import { funnelCounts, STEPS } from "../../_lib/funnel.js";
import { limitHits } from "../../_lib/cfusage.js";

export async function onRequestGet({ env }) {
  const n = async (sql, ...a) => { try { return (await env.DB.prepare(sql).bind(...a).first()).n || 0; } catch { return 0; } };
  const rows = async (sql, ...a) => { try { return (await env.DB.prepare(sql).bind(...a).all()).results; } catch { return []; } };
  // midnight Pacific today as a UTC timestamp
  const ptDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const dst = /PDT/.test(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" }));
  const day = new Date(`${ptDate}T00:00:00${dst ? "-07:00" : "-08:00"}`).toISOString().slice(0, 19).replace("T", " ");
  const week = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 19).replace("T", " ");
  const [waitHomes, waitEvents, waitContests, reports, claims, homesLive, eventsLive, contestsLive, installers, users, newUsers, subsToday, homesToday, entriesToday, votesWeek, litToday, hits, recentHomes, recentEvents, contests, activity] = await Promise.all([
    n("SELECT COUNT(*) AS n FROM posts WHERE status = 'pending' AND contest_id IS NULL"),
    n("SELECT COUNT(*) AS n FROM event_submissions WHERE status = 'pending'"),
    n("SELECT COUNT(*) AS n FROM contests WHERE status = 'pending' OR (status = 'live' AND note != '')"),
    n("SELECT (SELECT COUNT(*) FROM reports WHERE created_at > ?) + (SELECT COUNT(*) FROM removal_requests WHERE status = 'open') AS n", week),
    n("SELECT COUNT(*) AS n FROM posts WHERE installer_id IS NOT NULL AND installer_confirmed = 0 AND poster_type != 'installer' AND status = 'approved'"),
    n("SELECT COUNT(*) AS n FROM posts WHERE status = 'approved' AND contest_id IS NULL"),
    n("SELECT COUNT(*) AS n FROM events"),
    n("SELECT COUNT(*) AS n FROM contests WHERE status = 'live' AND announced = 0"),
    n("SELECT COUNT(*) AS n FROM installers WHERE status = 'active'"),
    n("SELECT COUNT(*) AS n FROM users"),
    n("SELECT COUNT(*) AS n FROM users WHERE created_at > ?", week),
    n("SELECT COUNT(*) AS n FROM event_submissions WHERE created_at >= ?", day),
    n("SELECT COUNT(*) AS n FROM posts WHERE contest_id IS NULL AND created_at >= ?", day),
    n("SELECT COUNT(*) AS n FROM posts WHERE contest_id IS NOT NULL AND created_at >= ?", day),
    n("SELECT COUNT(*) AS n FROM votes WHERE created_at > ?", week),
    n("SELECT COUNT(DISTINCT post_id) AS n FROM lights_on WHERE day = ?", ptDate),
    n("SELECT COALESCE(SUM(n),0) AS n FROM installer_hits WHERE day >= date(?, '-6 days')", ptDate),
    rows("SELECT id, title AS name, city, status, created_at, poster_type FROM posts WHERE contest_id IS NULL ORDER BY created_at DESC LIMIT 8"),
    rows("SELECT id, name, city, status, created_at, event_id FROM event_submissions ORDER BY created_at DESC LIMIT 8"),
    rows("SELECT slug, name, city, entries_close, vote_start, vote_end, (SELECT COUNT(*) FROM posts p WHERE p.contest_id = contests.id AND p.status = 'approved') AS entries, (SELECT COUNT(*) FROM votes v WHERE v.contest_id = contests.id) AS votes FROM contests WHERE status = 'live' AND announced = 0 ORDER BY vote_end LIMIT 6"),
    rows("SELECT at, admin, area, action, label FROM admin_log ORDER BY id DESC LIMIT 40"),
  ]);
  const recent = [...recentHomes.map((r) => ({ kind: "home", id: r.id, name: r.name, city: r.city, status: r.status, at: r.created_at, pro: r.poster_type === "installer" })), ...recentEvents.map((r) => ({ kind: "event", id: r.id, eid: r.event_id || "", name: r.name, city: r.city, status: r.status, at: r.created_at }))].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 10);
  // The last 14 days (Pacific dates, oldest first): new houses, votes, new accounts and page views per day
  const days = Array.from({ length: 14 }, (_, k) => new Date(Date.now() - 8 * 3600_000 - (13 - k) * 86400000).toISOString().slice(0, 10));
  const series = async (sql, ...b) => { const m = Object.fromEntries((await rows(sql, ...b)).map((r) => [r.d, r.n])); return days.map((d) => m[d] || 0); };
  const since = days[0] + " 08:00:00";
  const [tHouses, tVotes, tAccounts, tViews] = await Promise.all([
    series("SELECT date(datetime(created_at, '-8 hours')) AS d, COUNT(*) AS n FROM posts WHERE contest_id IS NULL AND created_at >= ? GROUP BY d", since),
    series("SELECT date(datetime(created_at, '-8 hours')) AS d, COUNT(*) AS n FROM votes WHERE created_at >= ? GROUP BY d", since),
    series("SELECT date(datetime(created_at, '-8 hours')) AS d, COUNT(*) AS n FROM users WHERE created_at >= ? GROUP BY d", since),
    series("SELECT day AS d, SUM(n) AS n FROM site_hits WHERE day >= ? AND page NOT LIKE 'click:%' AND page NOT LIKE 'fn:%' AND page NOT LIKE 'ref:%' GROUP BY day", days[0]),
  ]);
  const topPages = await rows("SELECT page, SUM(n) AS n FROM site_hits WHERE day >= ? AND page NOT LIKE 'click:%' AND page NOT LIKE 'fn:%' AND page NOT LIKE 'ref:%' GROUP BY page ORDER BY n DESC LIMIT 6", days[0]);
  // Taps on tracked links and buttons (and /feature views): today and the last 7 days, per key
  const clickRows = await rows("SELECT page, SUM(CASE WHEN day = ? THEN n ELSE 0 END) AS today, SUM(n) AS week FROM site_hits WHERE day >= ? AND (page LIKE 'click:%' OR page = 'feature') GROUP BY page", days[13], days[7]);
  const clicks = Object.fromEntries(clickRows.map((r) => [r.page, { today: r.today || 0, week: r.week || 0 }]));
  return json({
    limits: (await limitHits(env)).slice(0, 3), // quota errors logged in the last 24 hours (banner on Admin home)
    funnel: { steps: STEPS, counts: await funnelCounts(env) },
    trends: { days, houses: tHouses, votes: tVotes, accounts: tAccounts, views: tViews, topPages, clicks },
    attention: { waitHomes, waitEvents, waitContests, reports, claims },
    today: { homes: homesToday, events: subsToday, entries: entriesToday },
    live: { homes: homesLive, events: eventsLive, contests: contestsLive, installers },
    people: { users, newUsers, votesWeek, hits, litToday },
    recent, contests, activity,
  }, { headers: { "cache-control": "no-store" } });
}
