// POST /api/admin/contests/<id> { action: "approve" | "decline" | "edit", ...fields for edit } — the site owner reviews a contest.
import { json, err } from "../../../_lib/util.js";
import { listOnMap, unlistFromMap } from "../../../_lib/contests.js";

export async function onRequestPost({ params, request, env }) {
  const c = await env.DB.prepare("SELECT * FROM contests WHERE id = ?").bind(params.id).first();
  if (!c) return err(404, "That contest no longer exists.");
  const b = await request.json().catch(() => ({}));
  if (b.action === "edit") {
    if (c.status !== "pending") return err(400, "Only contests waiting for approval can be edited here. The organizer edits a live one.");
    const t = (v, n) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, n), d = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
    const f = { name: t(b.name, 90), org: t(b.org, 90), city: t(b.city, 60), descr: String(b.descr ?? "").trim().slice(0, 1000), site: t(b.site, 200), contact_email: t(b.contact_email, 120).toLowerCase(), entries_close: d(b.entries_close), vote_start: d(b.vote_start), vote_end: d(b.vote_end) };
    if (!f.name || !f.org || !f.city) return err(400, "A contest needs a name, an organizer and a city.");
    if (!f.entries_close || !f.vote_start || !f.vote_end) return err(400, "Enter all three dates as YYYY-MM-DD.");
    if (f.vote_end < f.vote_start) return err(400, "Voting ends before it starts.");
    if (f.site && !/^https?:\/\//i.test(f.site)) return err(400, "The website must start with http:// or https://.");
    await env.DB.prepare("UPDATE contests SET name=?, org=?, city=?, descr=?, site=?, contact_email=?, entries_close=?, vote_start=?, vote_end=?, updated_at=datetime('now') WHERE id=?")
      .bind(f.name, f.org, f.city, f.descr, f.site, f.contact_email, f.entries_close, f.vote_start, f.vote_end, c.id).run();
    return json({ ok: true });
  }
  if (b.action === "approve") {
    await env.DB.prepare("UPDATE contests SET status='live', note='', updated_at=datetime('now') WHERE id=?").bind(c.id).run();
    await listOnMap(env, { ...c, status: "live" });
    return json({ ok: true });
  }
  if (b.action === "decline") {
    await env.DB.prepare("UPDATE contests SET status='declined', updated_at=datetime('now') WHERE id=?").bind(c.id).run();
    await unlistFromMap(env, c);
    return json({ ok: true });
  }
  return err(400, "Unknown action.");
}
