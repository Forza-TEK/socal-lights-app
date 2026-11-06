// GET /sitemap.xml — the home page, the policy page, the city index and one page per city worth indexing (3+ upcoming events or one confirmed), and the past contest results pages.
// No <lastmod>: stamping every URL with today's date teaches search engines to ignore it. /past is listed only once a contest has been announced.
import { loadCities } from "./_lib/cityindex.js";
import { ARCHIVE_WHERE } from "./_lib/archive.js";

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin, today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const cities = (await loadCities(env, today)).filter((c) => c.indexable); // thin city pages (under 3 events, none confirmed) are noindex, so they stay out
  let inst = []; try { inst = (await env.DB.prepare("SELECT slug FROM installers WHERE status = 'active' AND id IN (SELECT installer_id FROM posts WHERE status = 'approved' AND installer_id IS NOT NULL)").all()).results; } catch {}
  let help = []; try { help = (await env.DB.prepare("SELECT slug FROM help_articles WHERE status = 'published'").all()).results; } catch {}
  let past = []; try { past = (await env.DB.prepare(`SELECT slug FROM contests WHERE ${ARCHIVE_WHERE} ORDER BY entries_close DESC LIMIT 300`).all()).results; } catch {}
  const urls = ["/", "/pricing", "/privacy", "/terms", "/tutorials", "/help", ...(past.length ? ["/past"] : []), ...past.map((r) => "/past/" + r.slug), ...help.map((r) => "/help/" + r.slug), ...inst.map((r) => "/installer/" + r.slug), ...(cities.length ? ["/in"] : []), ...cities.map((c) => "/in/" + c.slug).sort()];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${origin}${u}</loc></url>`).join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
