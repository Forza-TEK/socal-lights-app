// /admin/as?to=/profile&as=<user id or email>[&hash=events] — opens the page a person uses (their profile, a contest's organizer dashboard, an installer's manage page) as an Admin,
// so every button works for them (docs/admin-parity.md). The page is the real one; a small script (/admin/as-shim.js) sends its /api/... calls to /api/admin/as/... instead, which run
// the same code as that person with a signed header (functions/api/admin/as/[[path]].js). Behind the Cloudflare Access login like all of /admin; checked again here.
import { requireAdmin } from "../_lib/util.js";
import { actAsSecret } from "../_lib/actas.js";

export const TO_OK = /^\/(profile|contests|add-event|add-house|add-contest|c\/[A-Za-z0-9_-]{1,64}\/manage|installer\/[A-Za-z0-9_-]{1,64}\/manage)$/;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const injectShim = (html, as, label, hash) => html.replace(/<head([^>]*)>/i, (m) => `${m}<script src="/admin/as-shim.js?as=${encodeURIComponent(as)}&label=${encodeURIComponent(label)}&hash=${encodeURIComponent(hash)}"></script>`);
export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return new Response("Sign in through Cloudflare Access to use the admin tools.", { status: 401 });
  const url = new URL(request.url), to = url.searchParams.get("to") || "", as = (url.searchParams.get("as") || "").trim().slice(0, 120), hash = (url.searchParams.get("hash") || "").replace(/[^a-z]/g, "").slice(0, 20);
  if (!TO_OK.test(to)) return new Response("That page cannot be opened this way.", { status: 400 });
  if (!actAsSecret(env)) return new Response("Acting for someone is off: set ADMIN_AS_SECRET in the Cloudflare Pages settings.", { status: 503 });
  const page = await fetch(new Request(url.origin + to, { headers: { accept: "text/html" } }));
  if (!page.ok) return new Response("That page was not found.", { status: 404 });
  const html = injectShim(await page.text(), as, as || to, hash);
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}
