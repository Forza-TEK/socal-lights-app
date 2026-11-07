// GET /api/outreach/summary?since=YYYY-MM-DD   Authorization: Bearer <OUTREACH_TOKEN>
// New accounts, installer profiles, contests, event submissions, homes and notification opt-outs per day (counts only, no people). Default: the last 30 days.
import { json, err } from "../../_lib/util.js";
import { outreachDenied } from "../../_lib/outreach.js";
import { bump } from "../../_lib/funnel.js";

const TABLES = [["accounts", "users", "created_at"], ["installers", "installers", "created_at"], ["contests", "contests", "created_at"], ["event_submissions", "event_submissions", "created_at"], ["homes", "posts", "created_at"], ["optouts", "email_prefs", "updated_at"]];

export async function onRequestGet({ request, env }) {
  const denied = await outreachDenied(request, env); if (denied) { await bump(env, "outreach:denied"); return denied; }
  const q = new URL(request.url).searchParams.get("since") || "";
  const since = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  try {
    const res = await env.DB.batch(TABLES.map(([, t, c]) => env.DB.prepare(`SELECT substr(${c}, 1, 10) AS day, COUNT(*) AS n FROM ${t} WHERE substr(${c}, 1, 10) >= ?${t === "email_prefs" ? " AND optout = 1" : ""} GROUP BY day ORDER BY day`).bind(since)));
    const out = { since, days: {} };
    TABLES.forEach(([k], i) => (res[i].results || []).forEach((r) => { (out.days[r.day] ||= {})[k] = r.n; }));
    await bump(env, "outreach:summary");
    return json(out, { headers: { "cache-control": "no-store" } });
  } catch { return err(503, "The summary failed."); }
}
