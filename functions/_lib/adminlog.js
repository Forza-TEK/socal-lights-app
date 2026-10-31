// The admin activity log: every change made through /api/admin/* is written to admin_log by the middleware.
const AREAS = {
  users: ["users", "email"],
  posts: ["posts", "title"],
  events: ["events", "name"],
  contests: ["contests", "name"],
  submissions: ["event_submissions", "name"],
  overlaps: ["events", "name"],
};

// "/api/admin/posts/abc" -> { area: "posts", id: "abc" }; null for anything that isn't a logged area
export function parseTarget(pathname) {
  const m = pathname.match(/^\/api\/admin\/([a-z]+)(?:\/([^/]+))?\/?$/);
  return m && AREAS[m[1]] ? { area: m[1], id: m[2] ? decodeURIComponent(m[2]) : "" } : null;
}
// What the item is called right now (read before the change, so a delete still has a name)
export async function labelFor(env, area, id) {
  if (!id) return "";
  const [table, col] = AREAS[area];
  try { const r = await env.DB.prepare(`SELECT ${col} AS l FROM ${table} WHERE id = ?`).bind(id).first(); return String((r && r.l) || "").slice(0, 120); } catch { return ""; }
}
export const actionName = (method, body, id) => {
  if (body && typeof body.action === "string" && /^[a-z_]{2,20}$/.test(body.action)) return body.action;
  return method === "DELETE" ? "delete" : method === "PUT" || method === "PATCH" ? "edit" : id ? "edit" : "add";
};
export async function record(env, { admin, area, action, id, label }) {
  try { await env.DB.prepare("INSERT INTO admin_log (admin,area,action,target_id,label) VALUES (?,?,?,?,?)").bind(String(admin || "").slice(0, 120), area, action, id || "", label || "").run(); } catch {}
}
