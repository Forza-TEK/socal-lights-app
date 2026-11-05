// GET /api/admin/counts — the numbers shown on the admin tabs.
import { json } from "../../_lib/util.js";
import { pairs, approvedPosts } from "../../_lib/addrkey.js";
import { NEEDS_ATTENTION, ORDER_FROM } from "../../_lib/orders.js";
import { ptToday } from "../../_lib/featured.js";

export async function onRequestGet({ env }) {
  const n = async (sql) => (await env.DB.prepare(sql).first()).n;
  const safe = (p) => p.catch(() => 0);
  const [pending, approved, subs, contests, events, users, installers, reports, claims, orders, evs] = await Promise.all([
    safe(n("SELECT COUNT(*) AS n FROM posts WHERE status = 'pending' AND contest_id IS NULL")),
    safe(n("SELECT COUNT(*) AS n FROM posts WHERE status = 'approved' AND contest_id IS NULL")),
    safe(n("SELECT COUNT(*) AS n FROM event_submissions WHERE status = 'pending'")),
    safe(n("SELECT COUNT(*) AS n FROM contests WHERE status = 'pending' OR (status = 'live' AND note != '')")),
    safe(n("SELECT COUNT(*) AS n FROM events")),
    safe(n("SELECT COUNT(*) AS n FROM users")),
    safe(n("SELECT COUNT(*) AS n FROM installers")),
    safe(n("SELECT COUNT(*) AS n FROM reports")),
    safe(n("SELECT COUNT(*) AS n FROM event_claims WHERE status = 'pending'")),
    safe(env.DB.prepare(`SELECT COUNT(*) AS n FROM ${ORDER_FROM} WHERE ${NEEDS_ATTENTION}`).bind(ptToday()).first().then((r) => r.n)), // Featured orders that need the owner
    env.DB.prepare("SELECT id, city, address, keep_listed FROM events WHERE address != ''").all().then((r) => r.results).catch(() => []),
  ]);
  const overlaps = pairs(await approvedPosts(env), evs).exact.length;
  return json({ pending, approved, subs, contests, events, users, installers, reports, overlaps, claims, orders });
}
