// POST   /api/admin/contests/<id> { action: "approve" | "decline" | "edit", ...fields for edit } — approve = live and on the map (and clears the review note), decline = take it off the map.
// DELETE /api/admin/contests/<id> — removes the contest and everything in it.
import { json, err } from "../../../_lib/util.js";
import { listOnMap, unlistFromMap, deleteContest, todayPT } from "../../../_lib/contests.js";
import { orgKeyFor } from "../../../_lib/passkey.js";
import { orgState, orgLabel } from "../../../_lib/passes.js";
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
    // Contest passes: approving makes the contest count (live_at is set once, the first time it is live). Admin's decision always goes through; when it takes the organization over its
    // allowance, the answer says so (overCap) and Admin > Contests > Contest passes shows it. A contest that was already live once keeps its first date.
    let overCap = null;
    if (!c.live_at) {
      const owner = c.owner_id ? await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(c.owner_id).first() : null;
      const key = c.org_key || (await orgKeyFor(env, (owner && owner.email) || c.contact_email, c.site)), ent = await orgState(env, key);
      if (!ent.canCreate) overCap = { org: orgLabel(key), used: ent.used + 1, cap: ent.cap };
      await env.DB.prepare("UPDATE contests SET live_at = ?, org_key = ? WHERE id = ? AND live_at = ''").bind(todayPT(), key, c.id).run();
    }
    await env.DB.prepare("UPDATE contests SET status='live', note='', unpublished_by='', updated_at=datetime('now') WHERE id=?").bind(c.id).run();
    await listOnMap(env, { ...c, status: "live" });
    if ((c.status === "declined" || c.status === "pending") && b.notify !== false) { tell(env, waitUntil, c.contact_email, "contest_live", { name: c.name, link: `https://socallights.app/c/${c.slug}` }); }
    return json({ ok: true, ...(overCap ? { overCap } : {}) });
  }
  if (b.action === "decline") {
    await env.DB.prepare("UPDATE contests SET status='declined', unpublished_by='', updated_at=datetime('now') WHERE id=?").bind(c.id).run();
    await unlistFromMap(env, c, "declined by Admin");
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
