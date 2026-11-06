// POST /api/alerts/send — sends the weekly email, called by the scheduled GitHub workflow with the shared key.
// Works through the list in small batches (a request can only make so many outgoing calls); call it again while `remaining` > 0.
import { json, err, rowToEvent } from "../../_lib/util.js";
import { sendTemplate } from "../../_lib/mailtpl.js";
import { slugOf } from "../../in/[city].js";

const BATCH = 20, DAYS = 14, MAX_ITEMS = 8;
const miles = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 3958.8 * 2 * Math.asin(Math.sqrt(x)); };
const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

export async function onRequestPost({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || key !== env.ALERT_CRON_KEY) return err(401, "Not allowed.");
  const origin = "https://socallights.app", today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const until = new Date(Date.now() + DAYS * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const subs = (await env.DB.prepare("SELECT * FROM alert_subs WHERE confirmed = 1 AND (last_sent IS NULL OR last_sent < date('now','-6 days')) ORDER BY created_at LIMIT ?").bind(BATCH).all()).results;
  if (!subs.length) return json({ sent: 0, skipped: 0, remaining: 0 });
  const evs = (await env.DB.prepare("SELECT * FROM events WHERE end_date >= ? AND start_date <= ? ORDER BY start_date, name").bind(today, until).all()).results.map(rowToEvent).filter((e) => e.nt !== "cancelled");
  let sent = 0, skipped = 0, failed = 0; const done = [];
  for (const s of subs) {
    const near = evs.filter((e) => miles(s.lat, s.lng, e.lat, e.lng) <= s.radius).sort((a, b) => a.s.localeCompare(b.s));
    if (!near.length) { done.push(s.id); skipped++; continue; }
    const list = near.slice(0, MAX_ITEMS).map((e) => `- ${e.n}: ${e.s === e.e ? fmt(e.s) : fmt(e.s) + " to " + fmt(e.e)}${e.h ? ", " + e.h : ""} · ${e.v || e.city} ([details](${origin}/#e-${e.id}))`).join("\n");
    if (await sendTemplate(env, "alerts_weekly", s.email, { radius: s.radius, city: s.city, days: DAYS, list, more: near.length > MAX_ITEMS ? near.length - MAX_ITEMS : "", see_url: `${origin}/in/${slugOf(s.city)}`, unsub_url: `${origin}/api/alerts/unsubscribe?t=${s.token}`, footer: env.ALERT_FOOTER || "" })) { sent++; done.push(s.id); } else failed++; // a failed send is NOT marked as sent: the next run tries again
  }
  if (done.length) await env.DB.batch(done.map((id) => env.DB.prepare("UPDATE alert_subs SET last_sent = date('now') WHERE id = ?").bind(id)));
  const rest = await env.DB.prepare("SELECT COUNT(*) AS n FROM alert_subs WHERE confirmed = 1 AND (last_sent IS NULL OR last_sent < date('now','-6 days'))").first();
  return json({ sent, skipped, failed, remaining: rest.n });
}
