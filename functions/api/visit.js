// POST /api/visit { p: "/tutorials" } — counts one page view for the day, by page group. No IP address, cookie or account is stored.
import { json } from "../_lib/util.js";

const group = (p) => {
  p = String(p || "/").split(/[?#]/)[0].toLowerCase().replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/index.html") return "map";
  if (p.startsWith("/admin") || p.startsWith("/api")) return "";
  const m = p.match(/^\/(c|installer|in)\//);
  if (m) return ({ c: "contest", installer: "installer", in: "city" })[m[1]] + (/\/(manage|enter|judge)$/.test(p) ? "-" + p.split("/").pop() : "");
  return p.replace(/^\//, "").replace(/[^a-z0-9/_-]/g, "").slice(0, 40) || "other";
};

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({})), page = group(b.p);
  if (page) {
    const day = new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10); // roughly Pacific time
    try { await env.DB.prepare("INSERT INTO site_hits (day, page, n) VALUES (?, ?, 1) ON CONFLICT(day, page) DO UPDATE SET n = n + 1").bind(day, page).run(); } catch {}
  }
  return json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
