// GET /api/installers/<slug>/manage — the owner's dashboard data: details, homes that name them (to confirm or remove), page views, quote requests.
// POST { action: "edit" | "confirm" | "remove" } — edit details (web, phone, area, blurb), confirm a homeowner's claim, or take it off.
import { json, err, clean, webUrl } from "../../../_lib/util.js";
import { getUser, sameOrigin, sendMail } from "../../../_lib/auth.js";

async function owner(request, env, slug) {
  const user = await getUser(request, env);
  if (!user) return { res: err(401, "Please sign in first.") };
  const inst = await env.DB.prepare("SELECT * FROM installers WHERE slug = ?").bind(slug).first();
  if (!inst || inst.owner_email !== user.email) return { res: err(404, "That profile isn't yours.") };
  return { inst };
}
export async function onRequestGet({ params, request, env }) {
  const { inst, res } = await owner(request, env, params.slug);
  if (res) return res;
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results);
  const [claims, homes, views, leads, shared] = await Promise.all([
    q("SELECT id, title, biz, city FROM posts WHERE installer_id = ? AND status = 'approved' AND installer_confirmed = 0 AND poster_type != 'installer' ORDER BY created_at DESC LIMIT 100", inst.id),
    q("SELECT COUNT(*) AS n FROM posts WHERE installer_id = ? AND status = 'approved'", inst.id),
    q("SELECT day, n FROM installer_hits WHERE installer_id = ? ORDER BY day DESC LIMIT 30", inst.id),
    q("SELECT name, email, phone, note, created_at FROM installer_leads WHERE installer_id = ? ORDER BY created_at DESC LIMIT 100", inst.id),
    q("SELECT id, title, biz, city, status, poster_type, descr, where_txt, season, lights_on, visit, parking, accessible, radio, web, phone, service_area FROM posts WHERE installer_id = ? AND status IN ('approved','paused') AND (installer_confirmed = 1 OR poster_type = 'installer') ORDER BY created_at DESC LIMIT 100", inst.id),
  ]);
  const ids = shared.map((h) => h.id);
  const ch = ids.length ? (await env.DB.prepare(`SELECT post_id, by_name, by_role, field, old, new, at FROM listing_changes WHERE post_id IN (${ids.map(() => "?").join(",")}) ORDER BY at DESC, rowid DESC LIMIT 300`).bind(...ids).all()).results : [];
  for (const h of shared) h.changes = ch.filter((c) => c.post_id === h.id).slice(0, 8);
  return json({ installer: { slug: inst.slug, name: inst.name, web: inst.web, phone: inst.phone, area: inst.area, blurb: inst.blurb, hasLogo: !!inst.logo }, claims, shared, homes: homes[0].n, views: views.reverse(), viewsTotal: views.reduce((s, v) => s + v.n, 0), leads }, { headers: { "cache-control": "no-store" } });
}
export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { inst, res } = await owner(request, env, params.slug);
  if (res) return res;
  const b = await request.json().catch(() => ({}));
  if (b.action === "edit") {
    const webRaw = clean(b.web, 200), web = webRaw ? webUrl(webRaw) : "";
    if (webRaw && !web) return err(400, "That website address doesn't look right.");
    await env.DB.prepare("UPDATE installers SET web=?, phone=?, area=?, blurb=? WHERE id=?").bind(web || "", clean(b.phone, 80), clean(b.area, 120), clean(b.blurb, 600), inst.id).run();
    return json({ ok: true });
  }
  if (b.action === "confirm" || b.action === "remove") {
    const post = await env.DB.prepare("SELECT id, title, contact_email FROM posts WHERE id = ? AND installer_id = ?").bind(String(b.post || ""), inst.id).first();
    if (!post) return err(404, "That home doesn't name your company.");
    if (b.action === "confirm") await env.DB.prepare("UPDATE posts SET installer_confirmed = 1, installer_token = '' WHERE id = ?").bind(post.id).run();
    else await env.DB.prepare("UPDATE posts SET installer_id = NULL, installer_confirmed = 0, installer_token = '' WHERE id = ?").bind(post.id).run();
    if (post.contact_email) await sendMail(env, { to: post.contact_email, subject: `${inst.name} ${b.action === "confirm" ? "confirmed" : "removed"} the installer note on "${post.title}"`, text: b.action === "confirm" ? `${inst.name} confirmed they installed "${post.title}". It now shows a check mark, and you can both edit the listing from your profiles. Every change is listed with who made it, and you are emailed when the other changes something.\n\nhttps://socallights.app/profile#displays` : `${inst.name} says they did not install "${post.title}", so the "Installed by" line was removed. Reply to this email if that's a mistake.\n\nhttps://socallights.app/profile#displays` }).catch(() => {});
    return json({ ok: true });
  }
  return err(400, "Unknown action.");
}
