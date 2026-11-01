// Installer profiles: find or create one by company name, and describe it for pages.
import { clean, newId } from "./util.js";

export const instSlug = (s) => String(s || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "installer";

// `trusted` is true when the installer posted it themselves: only then may we fill in blank contact details on an existing profile.
export async function findOrCreateInstaller(env, { name, web = "", phone = "", area = "", email = "", trusted = false }) {
  const nm = clean(name, 80);
  if (!nm) return null;
  const row = await env.DB.prepare("SELECT * FROM installers WHERE lower(name) = lower(?)").bind(nm).first();
  if (row) {
    if (trusted) {
      const sets = [], vals = [];
      for (const [c, v] of [["web", web], ["phone", phone], ["area", area], ["email", email]]) if (v && !row[c]) { sets.push(`${c} = ?`); vals.push(v); row[c] = v; }
      if (sets.length) await env.DB.prepare(`UPDATE installers SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, row.id).run();
    }
    return row;
  }
  let slug = instSlug(nm);
  if (await env.DB.prepare("SELECT 1 AS x FROM installers WHERE slug = ?").bind(slug).first()) slug = `${slug.slice(0, 52)}-${newId().slice(0, 5)}`;
  const id = newId();
  const rec = { id, slug, name: nm, web: web || "", phone: trusted ? phone : "", area: trusted ? area : "", email: trusted ? email : "", blurb: "", status: "active" };
  await env.DB.prepare("INSERT INTO installers (id,slug,name,web,phone,area,email) VALUES (?,?,?,?,?,?,?)").bind(id, slug, nm, rec.web, rec.phone, rec.area, rec.email).run();
  return rec;
}
