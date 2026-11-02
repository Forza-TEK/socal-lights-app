// GET /api/admin/contests — every contest created through "Add a contest", newest first, with who runs it and how many entries and votes it has.
// ?status=pending|live|closed|declined narrows the list; no status (or all) returns everything.
import { json } from "../../../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const s = new URL(request.url).searchParams.get("status");
  const where = ["pending", "live", "closed", "declined"].includes(s) ? "WHERE c.status = ?" : "";
  const sql = `SELECT c.*, u.email AS owner_email, (SELECT COUNT(*) FROM posts p WHERE p.contest_id = c.id) AS entries, (SELECT COUNT(*) FROM votes v WHERE v.contest_id = c.id) AS votes
    FROM contests c LEFT JOIN users u ON u.id = c.owner_id ${where} ORDER BY c.created_at DESC LIMIT 300`;
  const q = env.DB.prepare(sql);
  const { results } = await (where ? q.bind(s) : q).all();
  return json(results, { headers: { "cache-control": "no-store" } });
}
