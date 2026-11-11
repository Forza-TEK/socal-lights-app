// GET /sitemap.xml — the home page, the policy page, the city index and one page per city worth indexing (3+ upcoming events or one confirmed), and the past contest results pages.
// <lastmod> only where there is a real date: an event's (or help article's) own updated_at, never today's date for everything (that teaches search engines to ignore it).
// Event pages: every page that is indexable by the rule in eventld.js eventIndexable (confirmed upcoming events, and expected ones with a source link that start within 180 days).
// /past is listed only once a contest has been announced.
import { loadCities } from "./_lib/cityindex.js";
import { ARCHIVE_WHERE } from "./_lib/archive.js";
import { eventIndexable } from "./_lib/eventld.js";

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin, today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const cities = (await loadCities(env, today)).filter((c) => c.indexable); // thin city pages (under 3 events, none confirmed) are noindex, so they stay out
  let inst = []; try { inst = (await env.DB.prepare("SELECT slug FROM installers WHERE status = 'active' AND id IN (SELECT installer_id FROM posts WHERE status = 'approved' AND installer_id IS NOT NULL)").all()).results; } catch {}
  let help = []; try { help = (await env.DB.prepare("SELECT slug, updated_at FROM help_articles WHERE status = 'published'").all()).results; } catch {}
  let past = []; try { past = (await env.DB.prepare(`SELECT slug FROM contests WHERE ${ARCHIVE_WHERE} ORDER BY entries_close DESC LIMIT 300`).all()).results; } catch {}
  let evs = []; try { evs = (await env.DB.prepare("SELECT id, status, url, start_date, end_date, notice, updated_at FROM events WHERE end_date >= ? ORDER BY id").bind(today).all()).results.filter((r) => eventIndexable({ st: r.status === "confirmed" ? "c" : "e", u: r.url || "", s: r.start_date, e: r.end_date, nt: r.notice || "" }, today)); } catch {}
  const urls = ["/", "/pricing", "/privacy", "/terms", "/tutorials", "/help", ...(past.length ? ["/past"] : []), ...past.map((r) => "/past/" + r.slug), ...help.map((r) => ["/help/" + r.slug, r.updated_at]), ...inst.map((r) => "/installer/" + r.slug), ...(cities.length ? ["/in"] : []), ...cities.map((c) => "/in/" + c.slug).sort(), ...evs.map((r) => ["/e/" + encodeURIComponent(r.id), r.updated_at])];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((x) => { const [u, upd] = Array.isArray(x) ? x : [x, ""], d = /^\d{4}-\d{2}-\d{2}/.test(upd || "") ? upd.slice(0, 10) : ""; return `<url><loc>${origin}${u.replace(/&/g, "&amp;")}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`; }).join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
