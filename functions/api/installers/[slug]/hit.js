// POST /api/installers/<slug>/hit — counts one visit to the profile page (totals only, nothing personal).
import { json } from "../../../_lib/util.js";

export async function onRequestPost({ params, env }) {
  const inst = await env.DB.prepare("SELECT id FROM installers WHERE slug = ?").bind(params.slug).first();
  if (inst) await env.DB.prepare("INSERT INTO installer_hits (installer_id, day, n) VALUES (?, ?, 1) ON CONFLICT(installer_id, day) DO UPDATE SET n = n + 1").bind(inst.id, new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })).run();
  return json({ ok: true });
}
