// Every /api/admin/* request must carry a valid Cloudflare Access login. Changes (anything but a read) are logged.
import { requireAdmin, err } from "../../_lib/util.js";
import { parseTarget, labelFor, actionName, record } from "../../_lib/adminlog.js";

export async function onRequest(context) {
  const { request, env } = context;
  const who = await requireAdmin(request, env);
  if (!who) return err(401, "Sign in through Cloudflare Access to use the admin tools.");
  context.data.admin = who;
  if (request.method === "GET" || request.method === "HEAD") return context.next();

  const t = parseTarget(new URL(request.url).pathname);
  if (!t) return context.next();
  const body = (request.headers.get("content-type") || "").includes("json") ? await request.clone().json().catch(() => null) : null;
  // POST to a collection (an event form) names the item in its body; an existing id means it's an edit
  const bid = !t.id && body && typeof body.id === "string" ? body.id.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40) : "";
  const label = t.id ? await labelFor(env, t.area, t.id) : (bid && (await labelFor(env, t.area, bid))) || String((body && body.name) || "").slice(0, 120);
  const existed = !t.id && !!bid && !!(await labelFor(env, t.area, bid));
  const res = await context.next();
  if (res.status < 400) await record(env, { admin: who.email, area: t.area, action: existed ? "edit" : actionName(request.method, body, t.id), id: t.id || bid, label });
  return res;
}
