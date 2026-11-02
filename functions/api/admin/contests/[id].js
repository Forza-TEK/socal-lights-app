// POST   /api/admin/contests/<id> { action: "approve" | "decline" | "edit", ...fields for edit } — approve = live and on the map (and clears the review note), decline = take it off the map.
// DELETE /api/admin/contests/<id> — removes the contest and everything in it.
import { json, err } from "../../../_lib/util.js";
import { listOnMap, unlistFromMap, deleteContest } from "../../../_lib/contests.js";
import { tell } from "../../../_lib/notify.js";

export async function onRequestPost({ params, request, env, waitUntil }) {
  const c = await env.DB.prepare("SELECT * FROM contests WHERE id = ?").bind(params.id).first();
  if (!c) return err(404, "That contest no longer exists.");
  const b = await request.json().catch(() => ({}));
  if (b.action === "edit") {
    const t = (v, n) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, n), d = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
    const f = { name: t(b.name, 90), org: t(b.org, 90), city: t(b.city, 60), descr: String(b.descr ?? "").trim().slice(0, 1000), site: t(b.site, 200), contact_email: t(b.contact_email, 120).toLowerCase(), entries_close: d(b.entries_close), vote_start: d(b.vote_start), vote_end: d(b.vote_end) };
    if (!f.name || !f.org || !f.city) return err(400, "A contest needs a name, an organizer and a city.");
    if (!f.entries_close || !f.vote_start || !f.vote_end) return err(400, "Enter all three dates as YYYY-MM-DD.");
    if (f.vote_end < f.vote_start) return err(400, "Voting ends before it starts.");
    if (f.site && !/^https?:\/\//i.test(f.site)) return err(400, "The website must start with http:// or https://.");
    await env.DB.prepare("UPDATE contests SET name=?, org=?, city=?, descr=?, site=?, contact_email=?, entries_close=?, vote_start=?, vote_end=?, updated_at=datetime('now') WHERE id=?")
      .bind(f.name, f.org, f.city, f.descr, f.site, f.contact_email, f.entries_close, f.vote_start, f.vote_end, c.id).run();
    if (c.status === "live") await listOnMap(env, { ...c, name: f.name, org: f.org, city: f.city, descr: f.descr, vote_end: f.vote_end });
    return json({ ok: true });
  }
  if (b.action === "approve") {
    await env.DB.prepare("UPDATE contests SET status='live', note='', updated_at=datetime('now') WHERE id=?").bind(c.id).run();
    await listOnMap(env, { ...c, status: "live" });
    if (c.status === "declined" && b.notify !== false) { tell(env, waitUntil, c.contact_email, "contest_live", { name: c.name, link: `https://socallights.app/c/${c.slug}` }); }
    return json({ ok: true });
  }
  if (b.action === "decline") {
    await env.DB.prepare("UPDATE contests SET status='declined', updated_at=datetime('now') WHERE id=?").bind(c.id).run();
    await unlistFromMap(env, c);
    tell(env, waitUntil, c.contact_email, "contest_unpublished", { name: c.name, reason: String(b.reason || "").trim().slice(0, 400) });
    return json({ ok: true });
  }
  return err(400, "Unknown action.");
}

export async function onRequestDelete({ params, env }) {
  const c = await env.DB.prepare("SELECT * FROM contests WHERE id = ?").bind(params.id).first();
  if (!c) return json({ ok: true });
  await deleteContest(env, c);
  return json({ ok: true });
}
