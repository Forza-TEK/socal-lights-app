// GET /api/health — public, tiny, no secrets. For an external monitor (UptimeRobot / Better Stack / healthchecks.io: docs/runbooks/monitoring.md).
//   200 {"ok":true,"db":true,"stale":false,"staleJobs":[]}   the site and the database answer, every scheduled job has reported in recently
//   200 {"ok":true,"db":true,"stale":true,"staleJobs":["backup"]}   a scheduled job has gone quiet (keyword monitor on "stale":true)
//   503 {"ok":false,"db":false,...}   the database does not answer
// One small SELECT (9 rows), kept in the edge cache for 30 seconds so monitors and crawlers cannot add load. Job names only: no times, no details.
import { evaluate } from "../_lib/heartbeat.js";

const HEAD = { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=30, s-maxage=30", "x-robots-tag": "noindex" };

export async function onRequest({ request, env }) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Use GET.", { status: 405, headers: { allow: "GET, HEAD" } });
  const cache = typeof caches !== "undefined" ? caches.default : null, ck = new Request(new URL("/api/health", request.url).href);
  try { const hit = cache && (await cache.match(ck)); if (hit) return request.method === "HEAD" ? new Response(null, hit) : hit; } catch {}
  let body, status = 200;
  try {
    const rows = (await env.DB.prepare("SELECT job, last_at, last_ok_at, last_status, detail FROM job_heartbeats").all()).results;
    const bad = evaluate(rows).filter((j) => j.problem).map((j) => j.job);
    body = { ok: true, db: true, stale: bad.length > 0, staleJobs: bad };
  } catch {
    // A missing table (before the migration) still proves the database answers; any other failure is a real outage.
    let dbOk = false; try { await env.DB.prepare("SELECT 1").first(); dbOk = true; } catch {}
    body = { ok: dbOk, db: dbOk, stale: false, staleJobs: [] }; if (!dbOk) status = 503;
  }
  const res = new Response(JSON.stringify(body), { status, headers: HEAD });
  try { if (cache && status === 200) await cache.put(ck, res.clone()); } catch {}
  return request.method === "HEAD" ? new Response(null, res) : res;
}
