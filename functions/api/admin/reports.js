// GET /api/admin/reports — the "Something wrong? Tell us" reports, newest first. POST { id, action: "dismiss" } removes one once handled.
import { json, err } from "../../_lib/util.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT id, ref, name, message, contact, created_at FROM reports ORDER BY created_at DESC LIMIT 200").all().catch(() => ({ results: [] }));
  return json(results, { headers: { "cache-control": "no-store" } });
}
export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  if (b.action !== "dismiss" || !b.id) return err(400, "Unknown action.");
  await env.DB.prepare("DELETE FROM reports WHERE id = ?").bind(String(b.id)).run();
  return json({ ok: true });
}
