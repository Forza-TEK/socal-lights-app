// GET  /api/admin/installers/<id> — the profile: details, every home linked to it, quote requests, views, owner account, admin history.
// POST /api/admin/installers/<id> { action: "edit" | "merge" | "hide" | "show" }
//   edit  : name, web, phone, area, blurb, email (a new name must not belong to another profile: merge them instead)
//   merge : into = the profile to keep. Homes, contests and the profile's page move to it, and this profile is removed.
import { json, err, clean, webUrl } from "../../../_lib/util.js";
import { phoneField, line, normText, normName } from "../../../_lib/fields.js";
import { ptToday } from "../../../_lib/featured.js";
import { installerFloor } from "../../../_lib/sponsor.js";

export async function onRequestGet({ params, env }) {
  const installer = await env.DB.prepare("SELECT * FROM installers WHERE id = ?").bind(params.id).first();
  if (!installer) return err(404, "That installer no longer exists.");
  const all = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results).catch(() => []);
  const [homes, leads, hits, owner, history, bstats] = await Promise.all([
    all("SELECT id, title, city, status, installer_confirmed, poster_type, created_at FROM posts WHERE installer_id = ? ORDER BY created_at DESC LIMIT 100", installer.id),
    all("SELECT name, email, phone, note, created_at FROM installer_leads WHERE installer_id = ? ORDER BY created_at DESC LIMIT 20", installer.id),
    env.DB.prepare("SELECT COALESCE(SUM(n),0) AS n FROM installer_hits WHERE installer_id = ? AND day >= date('now','-6 days')").bind(installer.id).first().catch(() => ({ n: 0 })),
    installer.owner_email ? env.DB.prepare("SELECT id, name, email FROM users WHERE lower(email) = lower(?)").bind(installer.owner_email).first().catch(() => null) : null,
    all("SELECT at, admin, action FROM admin_log WHERE area = 'installers' AND target_id = ? ORDER BY id DESC LIMIT 10", installer.id),
    env.DB.prepare("SELECT COALESCE(SUM(imp),0) AS imp, COALESCE(SUM(click),0) AS click, COALESCE(SUM(call),0) AS call FROM banner_stats WHERE installer_id = ? AND day >= date('now','-29 days')").bind(installer.id).first().catch(() => ({ imp: 0, click: 0, call: 0 })),
  ]);
  return json({ installer, homes, leads, views7: (hits && hits.n) || 0, owner, history, banner: bstats || { imp: 0, click: 0, call: 0, lst_imp: 0, lst_click: 0, lst_call: 0 } }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ params, request, env }) {
  const inst = await env.DB.prepare("SELECT * FROM installers WHERE id = ?").bind(params.id).first();
  if (!inst) return err(404, "That installer no longer exists.");
  const b = await request.json().catch(() => ({}));

  if (b.action === "hide" || b.action === "show") {
    await env.DB.prepare("UPDATE installers SET status = ? WHERE id = ?").bind(b.action === "hide" ? "hidden" : "active", inst.id).run();
    return json({ ok: true });
  }

  if (b.action === "edit") {
    const name = normName(clean(b.name, 80));
    if (name.length < 2) return err(400, "The company needs a name.");
    const clash = await env.DB.prepare("SELECT id, name FROM installers WHERE lower(name) = lower(?) AND id != ?").bind(name, inst.id).first();
    if (clash) return err(400, `"${clash.name}" is already a profile. Use Merge to combine them.`);
    const webRaw = clean(b.web, 200), web = webRaw ? webUrl(webRaw) : "";
    if (webRaw && !web) return err(400, "That website address doesn't look right.");
    const email = clean(b.email, 120).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(400, "That email address doesn't look right.");
    const ph = phoneField(b.phone); if (ph.error) return err(400, ph.error);
    const owner = clean(b.owner, 120).toLowerCase();
    const bu = clean(b.banner_until, 10), tu = clean(b.top_until, 10); if ((bu && !/^\d{4}-\d{2}-\d{2}$/.test(bu)) || (tu && !/^\d{4}-\d{2}-\d{2}$/.test(tu))) return err(400, "An end date doesn't look right.");
    if (owner && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner)) return err(400, "That owner email doesn't look right.");
    // A date set by hand never cuts off a paid order: the banner and top card cannot end before the latest paid order that is still running.
    const floor = await installerFloor(env.DB, inst.id, ptToday());
    if (bu < floor.banner) return err(400, `A paid banner order runs until ${floor.banner}, so the banner date cannot be earlier. To end it sooner, refund the order in Stripe and mark it refunded under Orders.`);
    if (tu < floor.top) return err(400, `A paid top-of-the-list order runs until ${floor.top}, so that date cannot be earlier. To end it sooner, refund the order in Stripe and mark it refunded under Orders.`);
    await env.DB.batch([
      env.DB.prepare("UPDATE installers SET name=?, web=?, phone=?, area=?, blurb=?, email=?, owner_email=?, banner_until=?, top_until=? WHERE id=?").bind(name, web || "", ph.value, line(b.area, 240), normText(clean(b.blurb, 600)), email, owner, bu, tu, inst.id),
      // keep the presenting-installer name on contests in step with the profile
      env.DB.prepare("UPDATE contests SET installer_name = ? WHERE lower(installer_name) = lower(?)").bind(name, inst.name),
    ]);
    return json({ ok: true });
  }

  if (b.action === "merge") {
    const into = await env.DB.prepare("SELECT * FROM installers WHERE id = ?").bind(String(b.into || "")).first();
    if (!into || into.id === inst.id) return err(400, "Choose a different profile to merge into.");
    // Fill any blanks on the kept profile from this one, then move everything over
    const fill = ["web", "phone", "area", "blurb", "email"].filter((c) => !into[c] && inst[c]);
    const stmts = [
      env.DB.prepare("UPDATE posts SET installer_id = ? WHERE installer_id = ?").bind(into.id, inst.id),
      // paid Sponsor orders follow the profile (and the placement they paid for), so a refund later still finds it
      env.DB.prepare("UPDATE feature_orders SET event_id = ? WHERE target = 'installer' AND event_id = ?").bind(into.id, inst.id),
      env.DB.prepare("UPDATE installers SET banner_until = MAX(banner_until, ?), top_until = MAX(top_until, ?) WHERE id = ?").bind(inst.banner_until || "", inst.top_until || "", into.id),
      env.DB.prepare("UPDATE contests SET installer_name = ? WHERE lower(installer_name) = lower(?)").bind(into.name, inst.name),
      ...fill.map((c) => env.DB.prepare(`UPDATE installers SET ${c} = ? WHERE id = ?`).bind(inst[c], into.id)),
      env.DB.prepare("DELETE FROM installers WHERE id = ?").bind(inst.id),
    ];
    await env.DB.batch(stmts);
    return json({ ok: true, into: into.id });
  }
  return err(400, "Unknown action.");
}
