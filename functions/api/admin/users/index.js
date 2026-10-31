// GET /api/admin/users?q=&status=active|suspended&offset=  — everyone with a profile, newest first, with what they've done.
// GET /api/admin/users?format=csv                          — the same list as a spreadsheet (all people, no paging).
import { json } from "../../../_lib/util.js";

const COLS = `u.id, u.email, u.name, u.created_at, u.last_login, u.status, u.suspended_at, u.admin_note,
  (u.google_sub IS NOT NULL) AS google, u.city,
  (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id AND p.contest_id IS NULL) AS homes,
  (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id AND p.contest_id IS NOT NULL) AS entries,
  (SELECT COUNT(*) FROM contests c WHERE c.owner_id = u.id) AS contests,
  (SELECT COUNT(*) FROM votes v WHERE v.user_id = u.id) AS votes`;
const csvCell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }; // leading = + - @ would run as a formula in a spreadsheet

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), q = (u.searchParams.get("q") || "").trim().toLowerCase().slice(0, 80);
  const st = ["active", "suspended"].includes(u.searchParams.get("status")) ? u.searchParams.get("status") : "";
  const where = [], bind = [];
  if (q) { where.push("(lower(u.email) LIKE ? OR lower(u.name) LIKE ?)"); bind.push(`%${q}%`, `%${q}%`); }
  if (st) { where.push("u.status = ?"); bind.push(st); }
  const W = where.length ? " WHERE " + where.join(" AND ") : "";
  if (u.searchParams.get("format") === "csv") {
    const { results } = await env.DB.prepare(`SELECT ${COLS} FROM users u${W} ORDER BY u.created_at DESC`).bind(...bind).all();
    const head = ["email", "name", "city", "joined", "last_sign_in", "status", "google", "houses_and_events", "contest_entries", "contests_run", "votes", "admin_note"];
    const rows = results.map((r) => [r.email, r.name, r.city, r.created_at, r.last_login, r.status, r.google ? "yes" : "", r.homes, r.entries, r.contests, r.votes, r.admin_note].map(csvCell).join(","));
    return new Response([head.join(","), ...rows].join("\r\n") + "\r\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="socal-lights-users.csv"', "cache-control": "no-store" } });
  }
  const offset = Math.max(0, parseInt(u.searchParams.get("offset") || "0", 10) || 0), PAGE = 50;
  const { n: total } = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users u${W}`).bind(...bind).first();
  const { n: all } = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
  const { n: suspended } = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'suspended'").first();
  const { results } = await env.DB.prepare(`SELECT ${COLS} FROM users u${W} ORDER BY u.created_at DESC LIMIT ${PAGE} OFFSET ${offset}`).bind(...bind).all();
  return json({ users: results, total, all, suspended, offset, page: PAGE });
}
