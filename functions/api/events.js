// GET /api/events — all events, for the public map.
import { json, rowToEvent } from "../_lib/util.js";
import { pairs, approvedPosts } from "../_lib/addrkey.js";

export async function onRequestGet({ request, env }) {
  const { results } = await env.DB.prepare("SELECT * FROM events ORDER BY start_date, name").all();
  // A sweep-made event at the same address as an approved house or installer post is replaced by that post (unless the admin chose to keep it)
  let hide = new Set();
  if (new URL(request.url).searchParams.get("all") !== "1") try { hide = new Set(pairs(await approvedPosts(env), results).exact.filter((x) => !x.event.keep_listed).map((x) => x.event.id)); } catch {}
  return json(results.filter((r) => !hide.has(r.id)).map(rowToEvent), { headers: { "cache-control": "public, max-age=60" } });
}
