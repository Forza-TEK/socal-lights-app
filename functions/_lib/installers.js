// Installer profiles: find or create one by company name, and describe it for pages.
import { clean, newId } from "./util.js";

export const instSlug = (s) => String(s || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "installer";

// Websites that many companies share (a social page, a link page, a review site): a match on these never means "same company".
const SHARED_HOSTS = new Set(["facebook.com", "instagram.com", "linktr.ee", "linkin.bio", "yelp.com", "google.com", "youtube.com", "tiktok.com", "x.com", "twitter.com", "nextdoor.com", "thumbtack.com", "angi.com", "houzz.com", "wixsite.com", "squarespace.com", "weebly.com", "godaddysites.com", "business.site", "carrd.co", "linkedin.com", "pinterest.com"]);
export function webHost(web) {
  try { return new URL(/^https?:/i.test(web) ? web : "https://" + web).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}
const sharedHost = (h) => !h || [...SHARED_HOSTS].some((s) => h === s || h.endsWith("." + s));

// Does this account own the profile (an owner set by a claim or by Admin) or did it create the profile itself?
export const ownsProfile = (inst, email) => !!inst && !!email && (String(inst.owner_email || "").toLowerCase() === String(email).toLowerCase() || (!inst.owner_email && String(inst.created_by || "").toLowerCase() === String(email).toLowerCase()));

// Finds the profile a company name, its slug or its website already belongs to.
export async function findInstaller(env, name, web = "") {
  const nm = clean(name, 80);
  if (!nm) return null;
  let row = await env.DB.prepare("SELECT * FROM installers WHERE lower(name) = lower(?)").bind(nm).first();
  if (!row) row = await env.DB.prepare("SELECT * FROM installers WHERE slug = ?").bind(instSlug(nm)).first();
  const host = webHost(web);
  if (!row && !sharedHost(host)) {
    const { results } = await env.DB.prepare("SELECT * FROM installers WHERE lower(web) LIKE ? LIMIT 20").bind(`%${host}%`).all();
    row = results.find((r) => webHost(r.web) === host) || null;
  }
  return row;
}

// Used when someone names an installer on a post. Returns { inst, owned }.
//  - A company that already has a profile (same name, slug or website) is never duplicated and is never changed from a post, unless the poster owns that profile
//    (S-04): then `owned` is true, blank contact details may be filled in, and the post can be confirmed at once. Everyone else gets the profile back with owned = false,
//    and the caller attaches the post as "unverified" until the profile's owner confirms.
//  - A company nobody has listed gets a new profile. `trusted` means the installer posted it themselves: then the new profile carries their phone, area and email,
//    is marked as created by them, and their typed website is tagged web_src = 'user' (an email at that domain cannot claim the profile at once; only an Admin-set website can).
export async function findOrCreateInstaller(env, { name, web = "", phone = "", area = "", email = "", trusted = false }) {
  const nm = clean(name, 80);
  if (!nm) return null;
  const row = await findInstaller(env, nm, web);
  if (row) {
    const owned = trusted && ownsProfile(row, email);
    if (owned) {
      const sets = [], vals = [];
      for (const [c, v] of [["web", web], ["phone", phone], ["area", area], ["email", email]]) if (v && !row[c]) { sets.push(`${c} = ?`); vals.push(v); row[c] = v; if (c === "web") sets.push("web_src = 'user'"); }
      if (sets.length) await env.DB.prepare(`UPDATE installers SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, row.id).run();
    }
    return { inst: row, owned, created: false };
  }
  let slug = instSlug(nm);
  if (await env.DB.prepare("SELECT 1 AS x FROM installers WHERE slug = ?").bind(slug).first()) slug = `${slug.slice(0, 52)}-${newId().slice(0, 5)}`;
  const id = newId(), by = trusted ? String(email || "").toLowerCase() : "";
  const rec = { id, slug, name: nm, web: web || "", phone: trusted ? phone : "", area: trusted ? area : "", email: trusted ? email : "", blurb: "", status: "active", owner_email: "", created_by: by, web_src: web ? "user" : "" };
  await env.DB.prepare("INSERT INTO installers (id,slug,name,web,phone,area,email,created_by,web_src) VALUES (?,?,?,?,?,?,?,?,?)").bind(id, slug, nm, rec.web, rec.phone, rec.area, rec.email, rec.created_by, rec.web_src).run();
  return { inst: rec, owned: trusted, created: true };
}
