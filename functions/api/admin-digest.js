// POST /api/admin-digest — called three times a day by a GitHub workflow with the shared key (the same ALERT_CRON_KEY as the weekly email).
// Emails the site owner how many homes, events and contest entries came in since the last email, today's totals, and what is waiting for review.
// It always sends (a "nothing new" note when quiet) and includes the day's totals. Set ADMIN_NOTIFY_EMAIL to change where it goes (default rey@forza-tek.com).
import { json, err } from "../_lib/util.js";
import { sendTemplate } from "../_lib/mailtpl.js";
import { pruneIps } from "../_lib/retention.js";
import { NEEDS_ATTENTION, ORDER_FROM, orderFlags } from "../_lib/orders.js";
import { ptToday } from "../_lib/featured.js";

export async function onRequestPost({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || key !== env.ALERT_CRON_KEY) return err(401, "Not allowed.");
  await pruneIps(env); // scheduled backstop for the 48-hour IP retention promise
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results);
  const st = await env.DB.prepare("SELECT last_at FROM admin_digest WHERE id = 1").first().catch(() => null);
  const since = st ? st.last_at : new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 19).replace("T", " ");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  // Midnight Pacific today, as a UTC timestamp, for the day's totals
  const ptDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const dst = /PDT/.test(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" }));
  const dayStart = new Date(`${ptDate}T00:00:00${dst ? "-07:00" : "-08:00"}`).toISOString().slice(0, 19).replace("T", " ");
  const [homes, events, entries, held, dayHomes, dayEvents, dayEntries, live, reports, orders] = await Promise.all([
    q("SELECT id, title, city, status, poster_type FROM posts WHERE contest_id IS NULL AND created_at > ? ORDER BY created_at DESC LIMIT 50", since),
    q("SELECT id, name, city, status FROM event_submissions WHERE created_at > ? ORDER BY created_at DESC LIMIT 50", since),
    q("SELECT COUNT(*) AS n FROM posts WHERE contest_id IS NOT NULL AND created_at > ?", since),
    q("SELECT (SELECT COUNT(*) FROM posts WHERE status = 'pending' AND contest_id IS NULL) + (SELECT COUNT(*) FROM event_submissions WHERE status = 'pending') + (SELECT COUNT(*) FROM contests WHERE status = 'pending') AS n"),
    q("SELECT COUNT(*) AS n FROM posts WHERE contest_id IS NULL AND created_at >= ?", dayStart),
    q("SELECT COUNT(*) AS n FROM event_submissions WHERE created_at >= ?", dayStart),
    q("SELECT COUNT(*) AS n FROM posts WHERE contest_id IS NOT NULL AND created_at >= ?", dayStart),
    q("SELECT (SELECT COUNT(*) FROM posts WHERE status = 'approved' AND contest_id IS NULL) AS homes, (SELECT COUNT(*) FROM event_submissions WHERE status = 'published') AS events"),
    q("SELECT name, message, ref FROM reports WHERE created_at > ? ORDER BY created_at DESC LIMIT 20", since).catch(() => []),
    // Featured payments that need the owner (same rule as the Orders tab): refunds to make, disputes, unapplied or mismatched payments, placements on cancelled events
    env.DB.prepare(`SELECT o.session_id, o.event_id, o.plan, o.amount, o.status, o.applied, o.applied_until, o.created_at, o.note, e.notice, COALESCE(e.name, s.name, o.event_id) AS name
      FROM ${ORDER_FROM} LEFT JOIN event_submissions s ON o.event_id = 'sub:' || s.id WHERE ${NEEDS_ATTENTION} ORDER BY o.created_at DESC LIMIT 50`).bind(ptToday()).all().then((r) => r.results).catch(() => []),
  ]);
  const REASON = { refund_due: "refund it in Stripe", disputed: "disputed", held: "partial refund, decide", unapplied: "paid but not applied", differs: "placement differs", mismatch: "amount differs from the plan price", note: "see the order note", cancelled: "placement still running on a cancelled or postponed event" };
  const payLines = orders.map((o) => ({ ...o, why: orderFlags(o, ptToday()).map((f) => REASON[f] || f).join("; ") })).filter((o) => o.why);
  const usd = (c) => "USD " + ((c || 0) / 100).toFixed(2);
  const payments = payLines.length ? `## Payments that need you (${payLines.length})\n${payLines.slice(0, 10).map((o) => `- ${o.name} · ${o.plan} ${usd(o.amount)} · ${o.why}`).join("\n")}${payLines.length > 10 ? `\n...and ${payLines.length - 10} more` : ""}\nOpen Admin > Orders.\n\n` : "";
  const total = homes.length + events.length + entries[0].n + reports.length, dayTotal = dayHomes[0].n + dayEvents[0].n + dayEntries[0].n;
  const line = (label, rows, name) => rows.length ? `## ${label} (${rows.length})\n${rows.slice(0, 10).map((r) => `- ${r[name]} · ${r.city}${r.status === "pending" ? " · WAITING" : r.poster_type === "installer" ? " · installer" : ""}`).join("\n")}${rows.length > 10 ? `\n...and ${rows.length - 10} more` : ""}\n\n` : "";
  const head = total ? `${total} new submission${total === 1 ? "" : "s"} since the last update.\n\n${line("Homes and installer displays", homes, "title")}${line("Events", events, "name")}${entries[0].n ? `Contest entries: ${entries[0].n} (organizers review these)\n\n` : ""}${reports.length ? `## "Something wrong?" reports (${reports.length})\n${reports.slice(0, 8).map((r) => `- ${r.name || r.ref}: ${r.message}`).join("\n")}${reports.length > 8 ? `\n...and ${reports.length - 8} more` : ""}\n\n` : ""}` : "Nothing new since the last update.\n\n";
  const todayLine = `${dayTotal} submission${dayTotal === 1 ? "" : "s"} (${dayHomes[0].n} home${dayHomes[0].n === 1 ? "" : "s"}, ${dayEvents[0].n} event${dayEvents[0].n === 1 ? "" : "s"}, ${dayEntries[0].n} contest entr${dayEntries[0].n === 1 ? "y" : "ies"}).`;
  const ok = await sendTemplate(env, "admin_digest", env.ADMIN_NOTIFY_EMAIL || "rey@forza-tek.com", { headline: total ? `${total} new submission${total === 1 ? "" : "s"}` : "no new submissions", day_total: dayTotal, summary: head + payments, today_line: todayLine, live_line: `${live[0].homes} homes, ${live[0].events} events.`, held: held[0].n });
  if (ok) await env.DB.prepare("INSERT INTO admin_digest (id, last_at) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET last_at = excluded.last_at").bind(now).run();
  return json({ sent: ok, new: total, today: dayTotal });
}
