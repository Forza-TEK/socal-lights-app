// POST /api/banner/hit { id, k: "imp" | "click" | "call" (banner pill) | "limp" | "lclick" | "lcall" (list card) } — counts one banner event for an installer, or for an event ("ev:<event id>"), on today's row.
// Totals only: nothing about the person is stored. An event only has the pill (imp = shown, click = tapped).
import { json } from "../../_lib/util.js";
import { ptToday } from "../../_lib/featured.js";

const COL = { imp: "imp", click: "click", call: "call", limp: "lst_imp", lclick: "lst_click", lcall: "lst_call" };

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const col = COL[b.k], id = String(b.id || "").slice(0, 60);
  if (!col || !id) return json({ ok: false }, { status: 400 });
  const day = ptToday();
  // only count what is on the banner today, so the table cannot be filled with made-up ids
  let on = null;
  if (id.startsWith("ev:")) {
    if (col === "imp" || col === "click") on = await env.DB.prepare("SELECT 1 AS x FROM events WHERE id = ? AND banner_until IS NOT NULL AND banner_until >= ?2 AND end_date >= ?2 AND COALESCE(notice, '') NOT IN ('cancelled', 'postponed')").bind(id.slice(3), day).first().catch(() => null);
  } else if (col === "imp" || col === "click" || col === "call") on = await env.DB.prepare("SELECT 1 AS x FROM installers WHERE id = ? AND banner_until != '' AND banner_until >= ?2").bind(id, day).first().catch(() => null); // the strip: the banner must be running
  else on = await env.DB.prepare("SELECT 1 AS x FROM installers WHERE id = ? AND top_until != '' AND top_until >= ?2").bind(id, day).first().catch(() => null); // the top card: the top placement must be running
  if (on) await env.DB.prepare(`INSERT INTO banner_stats (installer_id, day, ${col}) VALUES (?, ?, 1) ON CONFLICT(installer_id, day) DO UPDATE SET ${col} = ${col} + 1`).bind(id, day).run().catch(() => {});
  return json({ ok: true });
}
