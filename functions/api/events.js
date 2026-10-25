// GET /api/events — all events, for the public map.
import { json, rowToEvent } from "../_lib/util.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM events ORDER BY start_date, name").all();
  return json(results.map(rowToEvent), { headers: { "cache-control": "public, max-age=60" } });
}
