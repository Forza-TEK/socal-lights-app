// GET /sitemap.xml — the home page, the policy page, one page per city that has upcoming events, and the past contest results pages.
import { slugOf } from "./in/[city].js";
import { ARCHIVE_WHERE } from "./_lib/archive.js";

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin, today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const { results } = await env.DB.prepare("SELECT DISTINCT city FROM events WHERE end_date >= ?").bind(today).all();
  let inst = []; try { inst = (await env.DB.prepare("SELECT slug FROM installers WHERE status = 'active' AND id IN (SELECT installer_id FROM posts WHERE status = 'approved' AND installer_id IS NOT NULL)").all()).results; } catch {}
  let help = []; try { help = (await env.DB.prepare("SELECT slug FROM help_articles WHERE status = 'published'").all()).results; } catch {}
  let past = []; try { past = (await env.DB.prepare(`SELECT slug FROM contests WHERE ${ARCHIVE_WHERE} ORDER BY entries_close DESC LIMIT 300`).all()).results; } catch {}
  const urls = ["/", "/pricing", "/privacy", "/terms", "/tutorials", "/help", "/past", ...past.map((r) => "/past/" + r.slug), ...help.map((r) => "/help/" + r.slug), ...inst.map((r) => "/installer/" + r.slug), ...results.map((r) => "/in/" + slugOf(r.city)).filter((u) => u !== "/in/").sort()];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${origin}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
