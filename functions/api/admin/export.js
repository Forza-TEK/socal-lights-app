// GET /api/admin/export?type=houses|events|installers|contests[&status=...] — a spreadsheet (CSV) of a list, for Admin's Download buttons.
import { json, err } from "../../_lib/util.js";

const cell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }; // a leading = + - @ would run as a formula in a spreadsheet
const csv = (name, head, rows) => new Response([head.join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n") + "\r\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" } });

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), type = u.searchParams.get("type") || "", status = u.searchParams.get("status") || "";
  const all = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).all()).results;
  const day = new Date().toISOString().slice(0, 10);
  if (type === "houses") {
    const st = ["pending", "approved", "declined"].includes(status) ? status : "";
    const rows = await all(`SELECT p.id, p.status, p.title, p.biz, p.poster_type, p.street, p.city, p.zip, p.county, p.season, p.phone, p.web, p.service_area, p.contact_email, p.created_at, p.approved_at, i.name AS installer FROM posts p LEFT JOIN installers i ON i.id = p.installer_id WHERE p.contest_id IS NULL ${st ? "AND p.status = ?" : ""} ORDER BY p.created_at DESC`, ...(st ? [st] : []));
    return csv(`socal-lights-houses${st ? "-" + st : ""}-${day}.csv`, ["id", "status", "title", "name", "posted by", "street", "city", "zip", "county", "season", "phone", "website", "areas served", "contact email", "added", "published", "installer"],
      rows.map((r) => [r.id, r.status, r.title, r.biz, r.poster_type, r.street, r.city, r.zip, r.county, r.season, r.phone, r.web, r.service_area, r.contact_email, r.created_at, r.approved_at, r.installer]));
  }
  if (type === "events") {
    const season = u.searchParams.get("season") || "";
    const rows = await all(`SELECT id, name, status, season, type, city, county, venue, address, start_date, end_date, free, price, hours, url, featured FROM events ${season ? "WHERE season = ?" : ""} ORDER BY start_date, name`, ...(season ? [season] : []));
    return csv(`socal-lights-events${season ? "-" + season : ""}-${day}.csv`, ["id", "name", "status", "season", "type", "city", "county", "venue", "address", "starts", "ends", "free", "price", "hours", "website", "featured"],
      rows.map((r) => [r.id, r.name, r.status, r.season, r.type, r.city, r.county, r.venue, r.address, r.start_date, r.end_date, r.free ? "yes" : "", r.price, r.hours, r.url, r.featured ? "yes" : ""]));
  }
  if (type === "installers") {
    const rows = await all("SELECT i.name, i.slug, i.status, i.web, i.phone, i.area, i.email, i.owner_email, i.created_at, (SELECT COUNT(*) FROM posts p WHERE p.installer_id = i.id AND p.status = 'approved') AS homes FROM installers i ORDER BY lower(i.name)");
    return csv(`socal-lights-installers-${day}.csv`, ["name", "page", "status", "website", "phone", "areas served", "confirmation email", "owner email", "homes", "added"], rows.map((r) => [r.name, "https://socallights.app/installer/" + r.slug, r.status, r.web, r.phone, r.area, r.email, r.owner_email, r.homes, r.created_at]));
  }
  if (type === "contests") {
    const rows = await all("SELECT c.name, c.slug, c.status, c.org, c.city, c.entries_close, c.vote_start, c.vote_end, c.announced, c.note, u.email AS owner_email, (SELECT COUNT(*) FROM posts p WHERE p.contest_id = c.id) AS entries, (SELECT COUNT(*) FROM votes v WHERE v.contest_id = c.id) AS votes FROM contests c LEFT JOIN users u ON u.id = c.owner_id ORDER BY c.created_at DESC");
    return csv(`socal-lights-contests-${day}.csv`, ["name", "page", "status", "run by", "city", "organizer", "entries close", "voting starts", "voting ends", "winners announced", "entries", "votes", "review note"], rows.map((r) => [r.name, "https://socallights.app/c/" + r.slug, r.status, r.org, r.city, r.owner_email, r.entries_close, r.vote_start, r.vote_end, r.announced ? "yes" : "", r.entries, r.votes, r.note]));
  }
  return err(400, "Choose what to export: houses, events, installers or contests.");
}
