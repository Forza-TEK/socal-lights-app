// GET /api/admin/dashboard — everything the Admin home page shows: what needs attention, today's numbers, what is live,
// the newest submissions, and the latest admin activity. One request, a handful of small queries.
import { json } from "../../_lib/util.js";

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
    n("SELECT COUNT(*) AS n FROM contests WHERE status = 'pending'"),
    n("SELECT COUNT(*) AS n FROM reports WHERE created_at > ?", week),
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
    rows("SELECT id, name, city, status, created_at FROM event_submissions ORDER BY created_at DESC LIMIT 8"),
    rows("SELECT slug, name, city, entries_close, vote_start, vote_end, (SELECT COUNT(*) FROM posts p WHERE p.contest_id = contests.id AND p.status = 'approved') AS entries, (SELECT COUNT(*) FROM votes v WHERE v.contest_id = contests.id) AS votes FROM contests WHERE status = 'live' AND announced = 0 ORDER BY vote_end LIMIT 6"),
    rows("SELECT at, admin, area, action, label FROM admin_log ORDER BY id DESC LIMIT 8"),
  ]);
  const recent = [...recentHomes.map((r) => ({ kind: "home", id: r.id, name: r.name, city: r.city, status: r.status, at: r.created_at, pro: r.poster_type === "installer" })), ...recentEvents.map((r) => ({ kind: "event", id: r.id, name: r.name, city: r.city, status: r.status, at: r.created_at }))].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 10);
  return json({
    attention: { waitHomes, waitEvents, waitContests, reports, claims },
    today: { homes: homesToday, events: subsToday, entries: entriesToday },
    live: { homes: homesLive, events: eventsLive, contests: contestsLive, installers },
    people: { users, newUsers, votesWeek, hits, litToday },
    recent, contests, activity,
  }, { headers: { "cache-control": "no-store" } });
}
