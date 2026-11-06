// POST /api/banner/hit { id, k: "imp" | "click" | "call" (banner) | "limp" | "lclick" | "lcall" (list card) } — counts one banner event for an installer on today's row.
import { json } from "../../_lib/util.js";

const COL = { imp: "imp", click: "click", call: "call", limp: "lst_imp", lclick: "lst_click", lcall: "lst_call" };

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const col = COL[b.k], id = String(b.id || "").slice(0, 40);
  if (!col || !id) return json({ ok: false }, { status: 400 });
  const day = new Date().toISOString().slice(0, 10);
  // only count installers that are on the banner, so the table cannot be filled with made-up ids
  const on = await env.DB.prepare("SELECT 1 AS x FROM installers WHERE id = ? AND ((banner_until != '' AND banner_until >= ?2) OR (top_until != '' AND top_until >= ?2))").bind(id, day).first().catch(() => null);
  if (on) await env.DB.prepare(`INSERT INTO banner_stats (installer_id, day, ${col}) VALUES (?, ?, 1) ON CONFLICT(installer_id, day) DO UPDATE SET ${col} = ${col} + 1`).bind(id, day).run().catch(() => {});
  return json({ ok: true });
}
