// POST /api/admin/installers/<id> { action: "edit" | "merge" | "hide" | "show" }
//   edit  : name, web, phone, area, blurb, email (a new name must not belong to another profile: merge them instead)
//   merge : into = the profile to keep. Homes, contests and the profile's page move to it, and this profile is removed.
import { json, err, clean, webUrl } from "../../../_lib/util.js";
import { phoneField, line, normText, normName } from "../../../_lib/fields.js";

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
    if (owner && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner)) return err(400, "That owner email doesn't look right.");
    await env.DB.batch([
      env.DB.prepare("UPDATE installers SET name=?, web=?, phone=?, area=?, blurb=?, email=?, owner_email=? WHERE id=?").bind(name, web || "", ph.value, line(b.area, 120), normText(clean(b.blurb, 600)), email, owner, inst.id),
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
      env.DB.prepare("UPDATE contests SET installer_name = ? WHERE lower(installer_name) = lower(?)").bind(into.name, inst.name),
      ...fill.map((c) => env.DB.prepare(`UPDATE installers SET ${c} = ? WHERE id = ?`).bind(inst[c], into.id)),
      env.DB.prepare("DELETE FROM installers WHERE id = ?").bind(inst.id),
    ];
    await env.DB.batch(stmts);
    return json({ ok: true, into: into.id });
  }
  return err(400, "Unknown action.");
}
