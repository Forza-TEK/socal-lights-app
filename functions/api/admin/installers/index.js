// GET /api/admin/installers — every installer profile with how many homes link to it, for the admin Installers tab.
import { json } from "../../../_lib/util.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT i.*, (SELECT COUNT(*) FROM posts p WHERE p.installer_id = i.id AND p.status = 'approved') AS homes,
            (SELECT COUNT(*) FROM posts p WHERE p.installer_id = i.id AND p.status = 'approved' AND p.installer_confirmed = 0 AND p.poster_type != 'installer') AS unconfirmed
     FROM installers i ORDER BY lower(i.name) LIMIT 500`
  ).all();
  return json(results, { headers: { "cache-control": "no-store" } });
}
