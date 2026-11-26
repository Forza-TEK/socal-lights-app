// GET /api/admin/events/deleted — events an Admin deleted (or a merge removed), newest first, so they can be brought back with POST /api/admin/events/restore.
import { json } from "../../../_lib/util.js";

export async function onRequestGet({ env }) {
  const rows = (await env.DB.prepare("SELECT id, name, deleted_at, deleted_by, json_extract(row, '$.city') AS city, json_extract(row, '$.start_date') AS start FROM deleted_events ORDER BY deleted_at DESC LIMIT 100").all().catch(() => ({ results: [] }))).results;
  return json(rows, { headers: { "cache-control": "no-store" } });
}
