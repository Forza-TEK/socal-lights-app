// DELETE /api/admin/events/<id>
import { json } from "../../../_lib/util.js";

export async function onRequestDelete({ params, env }) {
  await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
