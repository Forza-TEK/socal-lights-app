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
};

// "/api/admin/posts/abc" -> { area: "posts", id: "abc" }; null for anything that isn't a logged area
export function parseTarget(pathname) {
  const m = pathname.match(/^\/api\/admin\/([a-z]+)(?:\/([^/]+))?\/?$/);
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
export async function record(env, { admin, area, action, id, label }) {
  if (area === "users" && action === "delete") label = ""; // the person's email is gone with the account (privacy audit PL-04); the log keeps who, when and the id
  try { await env.DB.prepare("INSERT INTO admin_log (admin,area,action,target_id,label) VALUES (?,?,?,?,?)").bind(String(admin || "").slice(0, 120), area, action, id || "", label || "").run(); } catch {}
}
