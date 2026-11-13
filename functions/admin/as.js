// /admin/as?to=/profile&as=<user id or email>[&hash=events] — opens the page a person uses (their profile, a contest's organizer dashboard, an installer's manage page) as an Admin,
// so every button works for them (docs/admin-parity.md). The page is the real one; a small script (/admin/as-shim.js) sends its /api/... calls to /api/admin/as/... instead, which run
// the same code as that person with a signed header (functions/api/admin/as/[[path]].js). Behind the Cloudflare Access login like all of /admin; checked again here.
import { requireAdmin } from "../_lib/util.js";
import { actAsSecret } from "../_lib/actas.js";

export const TO_OK = /^\/(profile|contests|add-event|add-house|add-contest|c\/[A-Za-z0-9_-]{1,64}\/manage|installer\/[A-Za-z0-9_-]{1,64}\/manage)$/;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const injectShim = (html, as, label, hash, to = "") => html.replace(/<head([^>]*)>/i, (m) => `${m}<script src="/admin/as-shim.js?as=${encodeURIComponent(as)}&label=${encodeURIComponent(label)}&hash=${encodeURIComponent(hash)}&to=${encodeURIComponent(to)}"></script>`);
// The page itself says whose it is: a contest's organizer dashboard is its owner's, an installer's manage page is its owner's. The page's own "who is signed in" call has no contest or installer
// in its path, so it needs the person named up front (the ?as= the shim adds to every call). Returns { as, label } or null when nobody owns it (or the page is not one with an owner).
export async function ownerForPage(env, to) {
  const c = /^\/c\/([A-Za-z0-9_-]{1,64})\/manage$/.exec(to), i = /^\/installer\/([A-Za-z0-9_-]{1,64})\/manage$/.exec(to);
  if (c) { const r = await env.DB.prepare("SELECT c.owner_id AS id, u.email AS email FROM contests c LEFT JOIN users u ON u.id = c.owner_id WHERE c.slug = ?").bind(c[1]).first(); return r && r.id ? { as: r.id, label: r.email || r.id } : null; }
  if (i) { const r = await env.DB.prepare("SELECT owner_email AS email FROM installers WHERE slug = ?").bind(i[1]).first(); return r && r.email ? { as: String(r.email).toLowerCase(), label: String(r.email).toLowerCase() } : null; }
  return null;
}
export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return new Response("Sign in through Cloudflare Access to use the admin tools.", { status: 401 });
  const url = new URL(request.url), to = url.searchParams.get("to") || "", asIn = (url.searchParams.get("as") || "").trim().slice(0, 120), hash = (url.searchParams.get("hash") || "").replace(/[^a-z]/g, "").slice(0, 20);
  if (!TO_OK.test(to)) return new Response("That page cannot be opened this way.", { status: 400 });
  if (!actAsSecret(env)) return new Response("Acting for someone is off: set ADMIN_AS_SECRET in the Cloudflare Pages settings.", { status: 503 });
  let as = asIn, label = asIn;
  if (!as) { const o = await ownerForPage(env, to); if (o) ({ as, label } = o); else if (/^\/(c\/[^/]+|installer\/[^/]+)\/manage$/.test(to)) return new Response("That page has no owner account to act as. Add ?as=<user id or email> if you know who it is.", { status: 404 }); }
  const page = await fetch(new Request(url.origin + to, { headers: { accept: "text/html" } }));
  if (!page.ok) return new Response("That page was not found.", { status: 404 });
  const html = injectShim(await page.text(), as, label || to, hash, to);
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}
