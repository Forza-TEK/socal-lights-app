// Admin > Contests > Sponsors (support and abuse review). Behind Cloudflare Access like every /api/admin route.
//   GET  ?contest=<contest id>     every sponsor record of the contest: contact details, amount, basis, whether it is shown, and whether there is a receipt.
//   GET  ?receipt=<sponsor id>     the private receipt file (Admin only besides the contest team).
//   POST { action: "hide" | "show", id }   hide a sponsor from the contest page (it stays on record) or put it back.
import { json, err, clean } from "../../_lib/util.js";
import { staffView } from "../../_lib/sponsors.js";

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), rid = u.searchParams.get("receipt");
  if (rid) {
    const row = await env.DB.prepare("SELECT receipt FROM contest_sponsors WHERE id = ?").bind(clean(rid, 40)).first(), obj = row && row.receipt && (await env.PHOTOS.get(row.receipt));
    if (!obj) return new Response("Not found", { status: 404 });
    const h = new Headers(); obj.writeHttpMetadata(h); h.set("cache-control", "private, no-store"); h.set("x-content-type-options", "nosniff");
    return new Response(obj.body, { headers: h });
  }
  const cid = clean(u.searchParams.get("contest"), 40);
  const c = await env.DB.prepare("SELECT id, name, slug, note, status, sponsor_pay_url, sponsor_pay_text, sponsor_levels, sponsor_link_on, sponsor_admin_off, sponsor_pay_hidden FROM contests WHERE id = ?").bind(cid).first();
  if (!c) return err(404, "That contest no longer exists.");
  const rows = (await env.DB.prepare("SELECT * FROM contest_sponsors WHERE contest_id = ? ORDER BY created_at").bind(cid).all()).results;
  const { id, name, slug, note, status, ...s } = c;
  return json({ contest: { id, name, slug, status, review_note: note }, invite: { link_on: !!s.sponsor_link_on, switched_off_by_admin: !!s.sponsor_admin_off, pay_hidden: !!s.sponsor_pay_hidden, pay_url: s.sponsor_pay_url, pay_text: s.sponsor_pay_text, levels: s.sponsor_levels }, sponsors: rows.map(staffView) }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  // Contest-level switches: Admin can turn a contest's sponsor invite link off (and back on) and hide (or show) its payment link and text.
  const cflag = { invite_off: ["sponsor_admin_off", 1], invite_on: ["sponsor_admin_off", 0], hide_pay: ["sponsor_pay_hidden", 1], show_pay: ["sponsor_pay_hidden", 0] }[b.action];
  if (cflag) {
    const r = await env.DB.prepare(`UPDATE contests SET ${cflag[0]} = ?, updated_at = datetime('now') WHERE id = ?`).bind(cflag[1], clean(b.contest, 40)).run();
    return r.meta && r.meta.changes ? json({ ok: true }) : err(404, "That contest no longer exists.");
  }
  if (!["hide", "show"].includes(b.action)) return err(400, "Unknown action.");
  const r = await env.DB.prepare("UPDATE contest_sponsors SET hidden_by_admin = ?, updated_at = datetime('now') WHERE id = ?").bind(b.action === "hide" ? 1 : 0, clean(b.id, 40)).run();
  return r.meta && r.meta.changes ? json({ ok: true }) : err(404, "That sponsor no longer exists.");
}
