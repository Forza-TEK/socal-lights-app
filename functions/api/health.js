// GET /api/health — public, tiny, no secrets. For an external monitor (UptimeRobot / Better Stack / healthchecks.io: docs/runbooks/monitoring.md).
//   200 {"ok":true,"db":true,"stale":false,"staleJobs":[]}   the site and the database answer, every scheduled job has reported in recently
//   200 {"ok":true,"db":true,"stale":true,"staleJobs":["backup"]}   a scheduled job has gone quiet (keyword monitor on "stale":true)
//   503 {"ok":false,"db":false,...}   the database does not answer
// GET /api/health?strict=1 — the same answer, but 503 when a scheduled job is stale too. For a free-plan monitor that can only watch the status code
//   ("URL becomes unavailable"): it alerts when the site, the database or a scheduled job goes quiet. The body says which (staleJobs).
// One small SELECT (9 rows), kept in the edge cache for 30 seconds so monitors and crawlers cannot add load. Job names only: no times, no details.
import { evaluate } from "../_lib/heartbeat.js";
import { isQuotaError } from "../_lib/cflimits.js";

const HEAD = { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=30, s-maxage=30", "x-robots-tag": "noindex" };

// ?strict=1: the same body and the same cached copy, with 503 when a scheduled job is stale (a status-code monitor then alerts on it)
async function strictly(res, strict, head) {
  if (!strict || res.status !== 200) return res;
  let b; try { b = await res.clone().json(); } catch { return res; }
  return b && b.stale ? new Response(head ? null : JSON.stringify(b), { status: 503, headers: res.headers }) : res;
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Use GET.", { status: 405, headers: { allow: "GET, HEAD" } });
  const strict = new URL(request.url).searchParams.get("strict") === "1", isHead = request.method === "HEAD";
  const cache = typeof caches !== "undefined" ? caches.default : null, ck = new Request(new URL("/api/health", request.url).href);
  try { const hit = cache && (await cache.match(ck)); if (hit) { const r = await strictly(hit, strict, isHead); return isHead ? new Response(null, r) : r; } } catch {}
  let body, status = 200;
  try {
    const rows = (await env.DB.prepare("SELECT job, last_at, last_ok_at, last_status, detail FROM job_heartbeats").all()).results;
    const bad = evaluate(rows).filter((j) => j.problem).map((j) => j.job);
    body = { ok: true, db: true, stale: bad.length > 0, staleJobs: bad };
  } catch (e) {
    // Over the free-plan quota is reported distinctly from "down" (and without a second query: nothing more can be read until the reset at 00:00 UTC).
    if (isQuotaError(e && e.message)) { body = { ok: false, db: false, quota: true, stale: false, staleJobs: [] }; status = 503; }
    else {
      // A missing table (before the migration) still proves the database answers; any other failure is a real outage.
      let dbOk = false; try { await env.DB.prepare("SELECT 1").first(); dbOk = true; } catch {}
      body = { ok: dbOk, db: dbOk, quota: false, stale: false, staleJobs: [] }; if (!dbOk) status = 503;
    }
  }
  const res = new Response(JSON.stringify(body), { status, headers: HEAD }); // errors are cached 30 s too, so a monitor and crawlers cannot hammer a failing database
  try { if (cache) await cache.put(ck, res.clone()); } catch {}
  const out = await strictly(res, strict, isHead);
  return isHead ? new Response(null, out) : out;
}
