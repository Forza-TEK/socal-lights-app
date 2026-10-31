// GET /api/admin/counts — the numbers shown on the admin tabs.
import { json } from "../../_lib/util.js";
import { pairs, approvedPosts } from "../../_lib/addrkey.js";

export async function onRequestGet({ env }) {
  const n = async (sql) => (await env.DB.prepare(sql).first()).n;
  const safe = (p) => p.catch(() => 0);
  const [pending, approved, subs, contests, events, users, evs] = await Promise.all([
    safe(n("SELECT COUNT(*) AS n FROM posts WHERE status = 'pending'")),
    safe(n("SELECT COUNT(*) AS n FROM posts WHERE status = 'approved'")),
    safe(n("SELECT COUNT(*) AS n FROM event_submissions WHERE status = 'pending'")),
    safe(n("SELECT COUNT(*) AS n FROM contests WHERE status = 'pending'")),
    safe(n("SELECT COUNT(*) AS n FROM events")),
    safe(n("SELECT COUNT(*) AS n FROM users")),
    env.DB.prepare("SELECT id, city, address, keep_listed FROM events WHERE address != ''").all().then((r) => r.results).catch(() => []),
  ]);
  const overlaps = pairs(await approvedPosts(env), evs).exact.length;
  return json({ pending, approved, subs, contests, events, users, overlaps });
}
