// POST /api/visit { p: "/tutorials" } — counts one page view for the day, by page group. No IP address, cookie or account is stored.
import { json } from "../_lib/util.js";
import { CLIENT_KEYS as FUNNEL_KEYS, DAILY_CAP as FUNNEL_CAP } from "../_lib/funnel.js";
import { ptToday } from "../_lib/time.js";

export const group = (p) => {
  p = String(p || "/").split(/[?#]/)[0].toLowerCase().replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/index.html") return "map";
  if (p.startsWith("/admin") || p.startsWith("/api")) return "";
  if (p === "/help" || p.startsWith("/help/")) return "help";
  if (p.startsWith("/e/")) return "event"; // every event page is one number, not one row per event id
  if (p.startsWith("/past/")) return "past";
  const m = p.match(/^\/(c|installer|in)\//);
  if (m) return ({ c: "contest", installer: "installer", in: "city" })[m[1]] + (/\/(manage|enter|judge)$/.test(p) ? "-" + p.split("/").pop() : "");
  return p.replace(/^\//, "").replace(/[^a-z0-9/_-]/g, "").slice(0, 40) || "other";
};

// POST /api/visit { k: "click:ticket" } — counts one tap on a link or button, by a fixed list of keys (anything else is ignored). Same table, same privacy.
export const CLICK_KEYS = ["click:ticket", "click:event-link", "click:feature-checkout-start", "click:installer", "click:shop", "click:promote", "click:route", "ref:inst", "ref:cont", "ref:pub", "ref:soc"];
const DAILY_CAP = FUNNEL_CAP;
const MAX_PAGES_PER_DAY = 80; // page names are free text from the browser: once a day has this many different page names, new names are ignored (the fn:, click: and ref: counters are fixed lists and do not count toward it)

export async function onRequestPost({ request, env }) {
  const raw = await request.text().catch(() => "");
  if (raw.length > 300) return json({ ok: true }, { headers: { "cache-control": "no-store" } });
  let b = {}; try { b = JSON.parse(raw) || {}; } catch {}
  if (b.k !== undefined) {
    const day = ptToday();
    if (CLICK_KEYS.includes(b.k) || FUNNEL_KEYS.includes(b.k)) try { await env.DB.prepare("INSERT INTO site_hits (day, page, n) VALUES (?, ?, 1) ON CONFLICT(day, page) DO UPDATE SET n = n + 1 WHERE n < ?").bind(day, b.k, DAILY_CAP).run(); } catch {}
    return json({ ok: true }, { headers: { "cache-control": "no-store" } });
  }
  const page = group(b.p);
  if (page) {
    const day = ptToday(); // roughly Pacific time
    try {
      const seen = await env.DB.prepare("SELECT COUNT(*) AS n, SUM(page = ?) AS mine FROM site_hits WHERE day = ? AND page NOT LIKE 'fn:%' AND page NOT LIKE 'click:%' AND page NOT LIKE 'ref:%'").bind(page, day).first();
      if (seen && (seen.mine || seen.n < MAX_PAGES_PER_DAY)) await env.DB.prepare("INSERT INTO site_hits (day, page, n) VALUES (?, ?, 1) ON CONFLICT(day, page) DO UPDATE SET n = n + 1 WHERE n < ?").bind(day, page, DAILY_CAP).run();
    } catch {}
  }
  return json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
