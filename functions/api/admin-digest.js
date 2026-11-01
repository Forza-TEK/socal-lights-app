// POST /api/admin-digest — called three times a day by a GitHub workflow with the shared key (the same ALERT_CRON_KEY as the weekly email).
// Emails the site owner how many homes, events and contest entries came in since the last email, and what is waiting for review.
// Nothing is sent when nothing new arrived. Set ADMIN_NOTIFY_EMAIL to change where it goes (default rey@forza-tek.com).
import { json, err } from "../_lib/util.js";
import { sendMail } from "../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || key !== env.ALERT_CRON_KEY) return err(401, "Not allowed.");
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results);
  const st = await env.DB.prepare("SELECT last_at FROM admin_digest WHERE id = 1").first().catch(() => null);
  const since = st ? st.last_at : new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 19).replace("T", " ");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const [homes, events, entries, held] = await Promise.all([
    q("SELECT id, title, city, status, poster_type FROM posts WHERE contest_id IS NULL AND created_at > ? ORDER BY created_at DESC LIMIT 50", since),
    q("SELECT id, name, city, status FROM event_submissions WHERE created_at > ? ORDER BY created_at DESC LIMIT 50", since),
    q("SELECT COUNT(*) AS n FROM posts WHERE contest_id IS NOT NULL AND created_at > ?", since),
    q("SELECT (SELECT COUNT(*) FROM posts WHERE status = 'pending' AND contest_id IS NULL) + (SELECT COUNT(*) FROM event_submissions WHERE status = 'pending') + (SELECT COUNT(*) FROM contests WHERE status = 'pending') AS n"),
  ]);
  const total = homes.length + events.length + entries[0].n;
  if (!total) { await env.DB.prepare("INSERT INTO admin_digest (id, last_at) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET last_at = excluded.last_at").bind(now).run(); return json({ sent: false, new: 0 }); }
  const line = (label, rows, name) => rows.length ? `${label} (${rows.length}):\n${rows.slice(0, 10).map((r) => `- ${r[name]} · ${r.city}${r.status === "pending" ? " · WAITING" : r.poster_type === "installer" ? " · installer" : ""}`).join("\n")}${rows.length > 10 ? `\n...and ${rows.length - 10} more` : ""}\n\n` : "";
  const text = `${total} new submission${total === 1 ? "" : "s"} since the last update.\n\n${line("Homes and installer displays", homes, "title")}${line("Events", events, "name")}${entries[0].n ? `Contest entries: ${entries[0].n} (organizers review these)\n\n` : ""}Waiting for your review: ${held[0].n}\n\nEverything new is already live. To take something down, open the admin and use Unpublish: https://socallights.app/admin/`;
  const ok = await sendMail(env, { to: env.ADMIN_NOTIFY_EMAIL || "rey@forza-tek.com", subject: `SoCal Lights: ${total} new submission${total === 1 ? "" : "s"}`, text });
  if (ok) await env.DB.prepare("INSERT INTO admin_digest (id, last_at) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET last_at = excluded.last_at").bind(now).run();
  return json({ sent: ok, new: total });
}
