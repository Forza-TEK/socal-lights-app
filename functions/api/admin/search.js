// GET /api/admin/search?q=irvine — finds houses, events, submitted events, installers, people and contests in one request, for the Admin search box.
import { json } from "../../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const q = (new URL(request.url).searchParams.get("q") || "").trim().replace(/\s+/g, " ").slice(0, 60);
  if (q.length < 2) return json({ q, groups: [] });
  const like = "%" + q.replace(/[%_\\]/g, (c) => "\\" + c) + "%";
  const run = async (sql, ...b) => { try { return (await env.DB.prepare(sql).bind(...b).all()).results; } catch { return []; } };
  const [houses, events, subs, installers, users, contests] = await Promise.all([
    run("SELECT id, title, biz, city, status FROM posts WHERE contest_id IS NULL AND (title LIKE ?1 ESCAPE '\\' OR biz LIKE ?1 ESCAPE '\\' OR city LIKE ?1 ESCAPE '\\' OR address LIKE ?1 ESCAPE '\\' OR contact_email LIKE ?1 ESCAPE '\\') ORDER BY created_at DESC LIMIT 5", like),
    run("SELECT id, name, city, season FROM events WHERE name LIKE ?1 ESCAPE '\\' OR city LIKE ?1 ESCAPE '\\' OR venue LIKE ?1 ESCAPE '\\' ORDER BY start_date DESC LIMIT 5", like),
    run("SELECT id, name, city, status, event_id FROM event_submissions WHERE name LIKE ?1 ESCAPE '\\' OR contact_email LIKE ?1 ESCAPE '\\' ORDER BY created_at DESC LIMIT 4", like),
    run("SELECT id, name, area FROM installers WHERE name LIKE ?1 ESCAPE '\\' OR email LIKE ?1 ESCAPE '\\' OR owner_email LIKE ?1 ESCAPE '\\' ORDER BY name LIMIT 4", like),
    run("SELECT id, name, email FROM users WHERE email LIKE ?1 ESCAPE '\\' OR name LIKE ?1 ESCAPE '\\' ORDER BY created_at DESC LIMIT 5", like),
    run("SELECT id, slug, name, org, city, status, announced, note FROM contests WHERE name LIKE ?1 ESCAPE '\\' OR org LIKE ?1 ESCAPE '\\' OR contact_email LIKE ?1 ESCAPE '\\' ORDER BY created_at DESC LIMIT 4", like),
  ]);
  const groups = [
    ["houses", "Houses", houses.map((h) => ({ id: h.id, title: h.title || h.biz, sub: `${h.city || ""} · ${h.status}`, status: h.status }))],
    ["events", "Events", events.map((e) => ({ id: e.id, title: e.name, sub: e.city, season: e.season }))],
    ["subs", "Submitted events", subs.map((s) => ({ id: s.id, title: s.name, sub: `${s.city} · ${s.status}`, status: s.status, eid: s.event_id || "" }))],
    ["installers", "Installers", installers.map((i) => ({ id: i.id, title: i.name, sub: i.area || "" }))],
    ["users", "People", users.map((u) => ({ id: u.id, title: u.name || u.email, sub: u.name ? u.email : "" }))],
    ["contests", "Contests", contests.map((c) => ({ id: c.id, title: c.name, sub: `${c.org} · ${c.city}`, status: c.status, announced: c.announced, flagged: !!c.note })) ],
  ].filter((g) => g[2].length).map(([k, label, items]) => ({ k, label, items }));
  return json({ q, groups }, { headers: { "cache-control": "no-store" } });
}
