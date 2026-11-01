// GET /sitemap.xml — the home page, the policy page and one page per city that has upcoming events.
import { slugOf } from "./in/[city].js";

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin, today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const { results } = await env.DB.prepare("SELECT DISTINCT city FROM events WHERE end_date >= ?").bind(today).all();
  const urls = ["/", "/privacy", "/terms", ...results.map((r) => "/in/" + slugOf(r.city)).filter((u) => u !== "/in/").sort()];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${origin}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
