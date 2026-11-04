// POST /api/visit { p: "/tutorials" } — counts one page view for the day, by page group. No IP address, cookie or account is stored.
import { json } from "../_lib/util.js";

const group = (p) => {
  p = String(p || "/").split(/[?#]/)[0].toLowerCase().replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/index.html") return "map";
  if (p.startsWith("/admin") || p.startsWith("/api")) return "";
  if (p === "/help" || p.startsWith("/help/")) return "help";
  const m = p.match(/^\/(c|installer|in)\//);
  if (m) return ({ c: "contest", installer: "installer", in: "city" })[m[1]] + (/\/(manage|enter|judge)$/.test(p) ? "-" + p.split("/").pop() : "");
  return p.replace(/^\//, "").replace(/[^a-z0-9/_-]/g, "").slice(0, 40) || "other";
};

// POST /api/visit { k: "click:ticket" } — counts one tap on a link or button, by a fixed list of keys (anything else is ignored). Same table, same privacy.
export const CLICK_KEYS = ["click:ticket", "click:event-link", "click:feature-checkout-start", "click:installer", "click:shop", "click:promote", "click:route", "ref:inst", "ref:cont", "ref:pub", "ref:soc"];
const DAILY_CAP = 20000; // per key per day, so a script cannot run a counter up without limit

export async function onRequestPost({ request, env }) {
  const raw = await request.text().catch(() => "");
  if (raw.length > 300) return json({ ok: true }, { headers: { "cache-control": "no-store" } });
  let b = {}; try { b = JSON.parse(raw) || {}; } catch {}
  if (b.k !== undefined) {
    const day = new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10);
    if (CLICK_KEYS.includes(b.k)) try { await env.DB.prepare("INSERT INTO site_hits (day, page, n) VALUES (?, ?, 1) ON CONFLICT(day, page) DO UPDATE SET n = n + 1 WHERE n < ?").bind(day, b.k, DAILY_CAP).run(); } catch {}
    return json({ ok: true }, { headers: { "cache-control": "no-store" } });
  }
  const page = group(b.p);
  if (page) {
    const day = new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10); // roughly Pacific time
    try { await env.DB.prepare("INSERT INTO site_hits (day, page, n) VALUES (?, ?, 1) ON CONFLICT(day, page) DO UPDATE SET n = n + 1").bind(day, page).run(); } catch {}
  }
  return json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
