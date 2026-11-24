// The admin activity log: every change made through /api/admin/* is written to admin_log by the middleware.
const AREAS = {
  users: ["users", "email"],
  posts: ["posts", "title"],
  events: ["events", "name"],
  contests: ["contests", "name"],
  passes: ["contest_comps", "org_key", "id"],
  sponsors: ["contest_sponsors", "name"],
  submissions: ["event_submissions", "name"],
  claims: ["event_claims", "event_id"],
  orders: ["feature_orders", "event_id", "session_id"],
  overlaps: ["events", "name"],
  installers: ["installers", "name"],
  reports: ["reports", "name"],
  removals: ["removal_requests", "address"],
  normalize: ["users", "email"],
  emails: ["email_templates", "id"],
  help: ["help_articles", "title", "slug"],
  chat: ["chat_settings", "key"],
  grok: ["intake_events", "name"],
};

// "/api/admin/posts/abc" -> { area: "posts", id: "abc" }; null for anything that isn't a logged area
export function parseTarget(pathname) {
  const m = pathname.match(/^\/api\/admin\/([a-z]+)(?:\/([^/]+))?\/?$/);
  if (m && m[1] === "events" && (m[2] === "revert" || m[2] === "merge" || m[2] === "recheck")) return { area: "events", id: "" }; // POST /api/admin/events/revert | merge | recheck { id, action }: the event is named in the body, so the log shows its name and changed fields
  return m && AREAS[m[1]] ? { area: m[1], id: m[2] ? decodeURIComponent(m[2]) : "" } : null;
}
// What the item is called right now (read before the change, so a delete still has a name)
export async function labelFor(env, area, id) {
  if (!id) return "";
  const [table, col, key = "id"] = AREAS[area];
  try { const r = await env.DB.prepare(`SELECT ${col} AS l FROM ${table} WHERE ${key} = ?`).bind(id).first(); return String((r && r.l) || "").slice(0, 120); } catch { return ""; }
}
export const actionName = (method, body, id) => {
  if (body && typeof body.action === "string" && /^[a-z_]{2,20}$/.test(body.action)) return body.action;
  return method === "DELETE" ? "delete" : method === "PUT" || method === "PATCH" ? "edit" : id ? "edit" : "add";
};
// What an event looked like (every column but the bookkeeping ones), for the before and after values in the log. Only the events area is snapshotted.
export async function snapshot(env, area, id) {
  if (area !== "events" || !id) return null;
  try { const r = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(id).first(); if (r) { delete r.updated_at; } return r || null; } catch { return null; }
}
// {"field":[before,after]} for the fields that changed (an add or a delete has no pair); "" when nothing changed. Kept short.
export function diffDetail(before, after) {
  if (!before || !after) return "";
  const d = {};
  for (const k of Object.keys(after)) if (String(before[k] ?? "") !== String(after[k] ?? "")) d[k] = [String(before[k] ?? "").slice(0, 120), String(after[k] ?? "").slice(0, 120)];
  return Object.keys(d).length ? JSON.stringify(d).slice(0, 1500) : "";
}
export async function record(env, { admin, area, action, id, label, detail = "" }) {
  if (area === "users" && action === "delete") label = ""; // the person's email is gone with the account (privacy audit PL-04); the log keeps who, when and the id
  const who = String(admin || "").slice(0, 120);
  try { await env.DB.prepare("INSERT INTO admin_log (admin,area,action,target_id,label,detail) VALUES (?,?,?,?,?,?)").bind(who, area, action, id || "", label || "", detail || "").run(); }
  catch { try { await env.DB.prepare("INSERT INTO admin_log (admin,area,action,target_id,label) VALUES (?,?,?,?,?)").bind(who, area, action, id || "", label || "").run(); } catch {} } // before migration 0267 there is no detail column
}
